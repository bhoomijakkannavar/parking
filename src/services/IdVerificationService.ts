import {
  IdVerificationResult,
  IdVerificationStatus,
  OwnerCategory,
  CollegeRole,
  VehicleType,
} from '../types';
import { ApiClient } from './apiClient';
import { CollegeRegistryService } from './CollegeRegistryService';
import { ValidationService } from './ValidationService';

export class IdVerificationService {
  /**
   * Verifies an extracted College ID Card against the institutional directory.
   * Cross-references the detected license plate and OCR confidence.
   */
  public static async verifyMemberIdCard(params: {
    idCardNumber?: string;
    plateNumber?: string;
    confidence?: number;
    isManualOverride?: boolean;
    overrideReason?: string;
  }): Promise<IdVerificationResult> {
    const rawId = (params.idCardNumber || '').trim().toUpperCase();
    const conf = params.confidence !== undefined ? params.confidence : 95;

    // Check visitor bypass (no institutional ID card presented)
    if (!rawId || rawId === 'VISITOR' || rawId === 'NONE') {
      return {
        status: 'VISITOR_BYPASS',
        ownerCategory: 'VISITOR',
        isRegistered: false,
        plateMatched: false,
        canAutoApprove: false,
        confidence: conf,
        message: 'No College ID detected. Proceed under visitor check-in.',
        reasons: ['Visitor bypass workflow active (standard tariffs apply)'],
        requiresManualReview: false,
      };
    }

    const maskedId = ValidationService.maskMemberId(rawId);

    // Try backend verification first
    try {
      const backendRes = await ApiClient.verifyCollegeId({
        idCardNumber: rawId,
        plateNumber: params.plateNumber,
        confidence: conf,
        isManualOverride: params.isManualOverride,
        overrideReason: params.overrideReason,
      });

      if (backendRes && backendRes.member) {
        const role = backendRes.member.role as CollegeRole;
        const ownerCategory: OwnerCategory =
          role === 'Faculty' || role === 'Staff' || role === 'Administration'
            ? 'STAFF'
            : 'STUDENT';

        return {
          status: backendRes.verificationStatus,
          memberId: backendRes.member.id,
          maskedId: backendRes.member.maskedId || maskedId,
          memberName: backendRes.member.name,
          role,
          department: backendRes.member.department,
          ownerCategory,
          isRegistered: true,
          plateMatched: backendRes.plateMatched,
          canAutoApprove: backendRes.canAutoApprove,
          confidence: backendRes.confidence,
          message: backendRes.message,
          reasons: backendRes.reasons,
          requiresManualReview: backendRes.verificationStatus === 'NEEDS_REVIEW',
          isOverrideApplied: params.isManualOverride,
          overrideReason: params.overrideReason,
        };
      } else if (backendRes) {
        return {
          status: backendRes.verificationStatus,
          maskedId,
          ownerCategory: 'VISITOR',
          isRegistered: false,
          plateMatched: false,
          canAutoApprove: false,
          confidence: conf,
          message: backendRes.message,
          reasons: backendRes.reasons,
          requiresManualReview: backendRes.verificationStatus === 'NEEDS_REVIEW',
        };
      }
    } catch {
      // Fallback to local CollegeRegistryService if backend is offline
    }

    // Local registry evaluation fallback
    const members = CollegeRegistryService.getAllMembers();
    const foundMember = members.find(
      (m) => m.id.trim().toUpperCase() === rawId
    );

    if (!foundMember) {
      return {
        status: 'FAILED',
        maskedId,
        ownerCategory: 'VISITOR',
        isRegistered: false,
        plateMatched: false,
        canAutoApprove: false,
        confidence: conf,
        message: `College ID ${maskedId} not found in institutional directory.`,
        reasons: [`ID "${maskedId}" is unregistered or invalid`],
        requiresManualReview: true,
      };
    }

    const role = foundMember.role;
    const ownerCategory: OwnerCategory =
      role === 'Faculty' || role === 'Staff' || role === 'Administration'
        ? 'STAFF'
        : 'STUDENT';

    // Check account status
    if (foundMember.status !== 'ACTIVE') {
      return {
        status: 'FAILED',
        memberId: foundMember.id,
        maskedId,
        memberName: foundMember.name,
        role,
        department: foundMember.department,
        ownerCategory,
        isRegistered: true,
        plateMatched: false,
        canAutoApprove: false,
        confidence: conf,
        message: `Member account for ${maskedId} is ${foundMember.status}. Access privilege revoked.`,
        reasons: [`Member account status is ${foundMember.status}`],
        requiresManualReview: true,
      };
    }

    const reasons: string[] = [];
    let lowConfidence = false;
    if (conf < 80) {
      lowConfidence = true;
      reasons.push(`Low ID card OCR confidence (${conf}% < 80%). Guard review mandatory.`);
    }

    let plateMatched = false;
    if (params.plateNumber) {
      const targetNorm = ValidationService.normalizeVehicleNumber(params.plateNumber);
      const targetClean = ValidationService.stripNonAlphanumeric(params.plateNumber);

      plateMatched = foundMember.registeredVehicles.some((rv) => {
        const rvNorm = ValidationService.normalizeVehicleNumber(rv.vehicleNumber);
        const rvClean = ValidationService.stripNonAlphanumeric(rv.vehicleNumber);
        return rvNorm === targetNorm || (targetClean.length >= 4 && rvClean === targetClean);
      });

      if (!plateMatched) {
        reasons.push(
          `Detected plate ${targetNorm} is not registered to member ${maskedId}.`
        );
      }
    } else {
      reasons.push('No vehicle plate scanned for correlation.');
    }

    // Check manual override
    if (params.isManualOverride && params.overrideReason && params.overrideReason.trim().length >= 3) {
      return {
        status: 'VERIFIED',
        memberId: foundMember.id,
        maskedId,
        memberName: foundMember.name,
        role,
        department: foundMember.department,
        ownerCategory,
        isRegistered: true,
        plateMatched,
        canAutoApprove: true,
        confidence: conf,
        message: `Manual verification authorized: "${params.overrideReason.trim()}". Access granted.`,
        reasons: [...reasons, `Manual override authorized: ${params.overrideReason.trim()}`],
        requiresManualReview: false,
        isOverrideApplied: true,
        overrideReason: params.overrideReason.trim(),
      };
    }

    if (!lowConfidence && plateMatched) {
      return {
        status: 'VERIFIED',
        memberId: foundMember.id,
        maskedId,
        memberName: foundMember.name,
        role,
        department: foundMember.department,
        ownerCategory,
        isRegistered: true,
        plateMatched: true,
        canAutoApprove: true,
        confidence: conf,
        message: `ID Card ${maskedId} (${foundMember.name}) verified with matching plate.`,
        reasons: ['ID active in directory', 'Plate matches registered vehicle', `OCR confidence ${conf}%`],
        requiresManualReview: false,
      };
    }

    return {
      status: 'NEEDS_REVIEW',
      memberId: foundMember.id,
      maskedId,
      maskedIdCardNumber: maskedId,
      memberName: foundMember.name,
      role,
      department: foundMember.department,
      ownerCategory,
      member: foundMember,
      isRegistered: true,
      plateMatched,
      canAutoApprove: false,
      confidence: conf,
      message: 'ID Card requires physical guard inspection before granting member privileges.',
      reasons,
      requiresManualReview: true,
    };
  }

  /**
   * Helper alias for verifyMemberIdCard
   */
  public static async verifyId(
    idCardNumber?: string,
    plateNumber?: string,
    confidence?: number,
    isManualOverride?: boolean,
    overrideReason?: string
  ): Promise<IdVerificationResult> {
    return this.verifyMemberIdCard({
      idCardNumber,
      plateNumber,
      confidence,
      isManualOverride,
      overrideReason,
    });
  }
}

