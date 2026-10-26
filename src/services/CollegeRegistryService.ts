import { CollegeMember, CollegeRole, VehicleType } from '../types';
import { StorageService } from './StorageService';
import { ApiClient } from './apiClient';
import { ValidationService } from './ValidationService';

export interface VerificationResult {
  isRegistered: boolean;
  member?: CollegeMember;
  matchedVehicleNumber?: string;
  vehicleType?: VehicleType;
  role?: CollegeRole;
  department?: string;
}

export class CollegeRegistryService {
  /**
   * Retrieves all registered college members from storage.
   */
  public static getAllMembers(): CollegeMember[] {
    return StorageService.getCollegeMembers();
  }

  /**
   * Searches for a college member by member ID, name, or department.
   */
  public static searchMembers(query: string): CollegeMember[] {
    if (!query || !query.trim()) return this.getAllMembers();
    const q = query.toLowerCase().trim();

    return this.getAllMembers().filter((m) => {
      const matchId = m.id.toLowerCase().includes(q);
      const matchName = m.name.toLowerCase().includes(q);
      const matchDept = m.department.toLowerCase().includes(q);
      const matchRole = m.role.toLowerCase().includes(q);
      const matchVehicle = m.registeredVehicles.some((v) =>
        ValidationService.stripNonAlphanumeric(v.vehicleNumber).includes(
          ValidationService.stripNonAlphanumeric(q)
        )
      );
      return matchId || matchName || matchDept || matchRole || matchVehicle;
    });
  }

  /**
   * Verifies if a given license plate belongs to an active registered college member.
   * Compares both normalized and stripped alphanumeric versions.
   */
  public static verifyVehicle(rawPlateNumber: string): VerificationResult {
    if (!rawPlateNumber || !rawPlateNumber.trim()) {
      return { isRegistered: false };
    }

    const normalizedTarget = ValidationService.normalizeVehicleNumber(rawPlateNumber);
    const cleanTarget = ValidationService.stripNonAlphanumeric(rawPlateNumber);
    const members = this.getAllMembers();

    for (const member of members) {
      if (member.status !== 'ACTIVE') continue;

      for (const v of member.registeredVehicles) {
        const normalizedVeh = ValidationService.normalizeVehicleNumber(v.vehicleNumber);
        const cleanVeh = ValidationService.stripNonAlphanumeric(v.vehicleNumber);

        if (
          normalizedVeh === normalizedTarget ||
          (cleanTarget.length >= 4 && cleanVeh === cleanTarget)
        ) {
          return {
            isRegistered: true,
            member,
            matchedVehicleNumber: v.vehicleNumber,
            vehicleType: v.vehicleType,
            role: member.role,
            department: member.department,
          };
        }
      }
    }

    return { isRegistered: false };
  }

  /**
   * Finds a member by their exact Member ID.
   */
  public static getMemberById(memberId: string): CollegeMember | undefined {
    return this.getAllMembers().find((m) => m.id === memberId);
  }

  /**
   * Registers a new member or updates an existing member.
   */
  public static saveMember(member: CollegeMember): void {
    StorageService.addCollegeMember(member);
    ApiClient.addMember(member).catch(() => {});
  }

  /**
   * Quick helper to register a new vehicle for an existing member.
   */
  public static registerVehicleToMember(
    memberId: string,
    vehicleNumber: string,
    vehicleType: VehicleType
  ): boolean {
    const member = this.getMemberById(memberId);
    if (!member) return false;

    const normalized = ValidationService.normalizeVehicleNumber(vehicleNumber);
    const exists = member.registeredVehicles.some(
      (v) => ValidationService.normalizeVehicleNumber(v.vehicleNumber) === normalized
    );

    if (!exists) {
      member.registeredVehicles.push({
        vehicleNumber: normalized,
        vehicleType,
        primary: member.registeredVehicles.length === 0,
      });
      StorageService.addCollegeMember(member);
      return true;
    }

    return false;
  }
}
