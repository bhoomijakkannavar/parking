import {
  WrongParkingIncident,
  WrongParkingDetectionResult,
  WrongParkingZoneConfig,
  WrongParkingStatus,
  ParkingSlot,
  Vehicle,
} from '../types';
import { ApiClient } from './apiClient';
import { StorageService } from './StorageService';
import { SirenAudioService } from './SirenAudioService';

export const CONFIGURED_SURVEILLANCE_ZONES: WrongParkingZoneConfig[] = [
  {
    cameraId: 'CAM-SURV-NORTH-T',
    cameraName: 'North Bay AI Surveillance Camera',
    zoneName: 'Zone T (Two-Wheeler Bays)',
    supportedSlots: ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08', 'T-09', 'T-10'],
    confidenceThreshold: 80,
    opticalFovDescription: 'Overhead 120° FOV covering bays T-01 through T-10 with marked bay boundary coordinates',
  },
  {
    cameraId: 'CAM-SURV-SOUTH-F',
    cameraName: 'South Bay AI Surveillance Camera',
    zoneName: 'Zone F (Four-Wheeler Bays)',
    supportedSlots: ['F-01', 'F-02', 'F-03', 'F-04', 'F-05'],
    confidenceThreshold: 80,
    opticalFovDescription: 'Overhead 90° FOV covering bays F-01 through F-05 with ground sensor correlation',
  },
];

export interface DemoWrongParkingScenario {
  id: string;
  name: string;
  description: string;
  plate: string;
  detectedSlot: string;
  confidence: number;
  expectedOutcome: string;
}

export const DEMO_WRONG_PARKING_SCENARIOS: DemoWrongParkingScenario[] = [
  {
    id: 'CORRECT_PARKING',
    name: 'Scenario A: Correctly Parked Vehicle',
    description: 'Vehicle parked in its designated assigned bay. No alert generated.',
    plate: 'KA-01-FA-1001',
    detectedSlot: 'F-01',
    confidence: 96,
    expectedOutcome: 'CORRECTLY_PARKED: System validates bay match. Zero sirens or alerts.',
  },
  {
    id: 'HIGH_CONFIDENCE_VIOLATION',
    name: 'Scenario B: High-Confidence Wrong Bay Violation',
    description: 'Vehicle allocated F-03 detected physically parked in F-05 (94% confidence).',
    plate: 'KA22XY9876',
    detectedSlot: 'F-05',
    confidence: 94,
    expectedOutcome: 'VIOLATION_DETECTED: Creates incident, alerts ParkSphere, activates facility siren.',
  },
  {
    id: 'LOW_CONFIDENCE_REVIEW',
    name: 'Scenario C: Low-Confidence Optical Detection',
    description: 'Glare or partial occlusion causes 68% confidence (< 80% threshold).',
    plate: 'KA-05-ST-2020',
    detectedSlot: 'T-04',
    confidence: 68,
    expectedOutcome: 'NEEDS_REVIEW: Flagged for guard manual inspection. Siren remains silent.',
  },
  {
    id: 'REPEATED_FRAME_DEBOUNCE',
    name: 'Scenario D: Repeated Camera Frames (Debounce Check)',
    description: 'Continuous surveillance stream detecting the same ongoing vehicle in wrong bay.',
    plate: 'KA22XY9876',
    detectedSlot: 'F-05',
    confidence: 95,
    expectedOutcome: 'DUPLICATE_DEBOUNCED: Debounced to prevent repeated sirens and spam alerts.',
  },
  {
    id: 'UNKNOWN_VEHICLE',
    name: 'Scenario E: Vehicle with No Active Session',
    description: 'Unchecked vehicle detected in parking lot with no entry gate session.',
    plate: 'DL-01-UN-9999',
    detectedSlot: 'F-02',
    confidence: 90,
    expectedOutcome: 'NO_ACTIVE_SESSION: Handled safely without false violation declaration.',
  },
];

export class WrongParkingService {
  /**
   * Helper to verify if an operator is authorized campus staff or guard.
   */
  public static isAuthorized(role?: string, guardPin?: string): boolean {
    if (guardPin === '1234' || guardPin === '0000') {
      return true;
    }
    if (!role) return false;
    const authorized = [
      'STAFF',
      'FACULTY',
      'ADMINISTRATION',
      'AUTHORIZED PERSONNEL',
      'SECURITY',
      'GUARD',
      'OFFICER',
      'CAMPUS SECURITY',
      'PARKSPHERE_ADMIN',
    ];
    return authorized.includes(role.trim().toUpperCase());
  }

  /**
   * Evaluates camera plate & detected physical slot.
   */
  public static async processDetection(params: {
    vehicleNumber: string;
    detectedSlotId: string;
    confidence?: number;
    cameraId?: string;
    cameraZone?: string;
    confidenceThreshold?: number;
    isDemo?: boolean;
  }): Promise<WrongParkingDetectionResult> {
    const conf = params.confidence !== undefined ? params.confidence : 92;
    const threshold = params.confidenceThreshold !== undefined ? params.confidenceThreshold : 80;

    try {
      // 1. Try SQLite backend API
      const response = await ApiClient.detectWrongParking({
        vehicleNumber: params.vehicleNumber,
        detectedSlotId: params.detectedSlotId,
        confidence: conf,
        cameraId: params.cameraId || 'CAM-SURV-SOUTH-F',
        cameraZone: params.cameraZone || 'South Bay Surveillance',
        confidenceThreshold: threshold,
        isDemo: params.isDemo !== undefined ? params.isDemo : true,
      });

      if (response && response.success && response.data) {
        const result = response.data;
        // If high-confidence violation detected, trigger local software siren
        if (result.status === 'VIOLATION_DETECTED' && result.sirenTriggered) {
          SirenAudioService.triggerWarningSiren(result.incident?.id);
        }
        return result;
      }
    } catch {
      // Fallback to local processing if server is offline
    }

    return this.processDetectionLocally(params);
  }

  /**
   * Offline/Local fallback implementation.
   */
  private static processDetectionLocally(params: {
    vehicleNumber: string;
    detectedSlotId: string;
    confidence?: number;
    cameraId?: string;
    cameraZone?: string;
    confidenceThreshold?: number;
    isDemo?: boolean;
  }): WrongParkingDetectionResult {
    const rawPlate = params.vehicleNumber.trim().toUpperCase();
    const detectedSlotId = params.detectedSlotId.trim().toUpperCase();
    const conf = params.confidence !== undefined ? params.confidence : 92;
    const threshold = params.confidenceThreshold !== undefined ? params.confidenceThreshold : 80;
    const masked = rawPlate.replace(/(\w{2})-?(\w{2})-?(\w{2})-?(\w{4})/, '$1-$2-**-$4');

    const activeSessions = StorageService.getSessions().filter((s) => s.status === 'ACTIVE');
    const matchedSession = activeSessions.find(
      (s) => s.vehicleNumber.replace(/[^A-Z0-9]/g, '') === rawPlate.replace(/[^A-Z0-9]/g, '')
    );

    if (!matchedSession) {
      return {
        status: 'NO_ACTIVE_SESSION',
        isViolation: false,
        requiresReview: false,
        sirenTriggered: false,
        isDebounced: false,
        vehicleNumber: rawPlate,
        vehicleNumberMasked: masked,
        detectedSlotId,
        confidence: conf,
        confidenceThreshold: threshold,
        incident: null,
        message: `No active parking session found for vehicle ${rawPlate}.`,
      };
    }

    const allocatedSlotId = matchedSession.slotId.toUpperCase();

    // Correctly parked
    if (detectedSlotId === allocatedSlotId) {
      return {
        status: 'CORRECTLY_PARKED',
        isViolation: false,
        requiresReview: false,
        sirenTriggered: false,
        isDebounced: false,
        vehicleNumber: rawPlate,
        vehicleNumberMasked: masked,
        allocatedSlotId,
        detectedSlotId,
        confidence: conf,
        confidenceThreshold: threshold,
        incident: null,
        message: `Vehicle ${rawPlate} is correctly parked in allocated bay ${allocatedSlotId}.`,
      };
    }

    // Low confidence check
    if (conf < threshold) {
      const localIncident: WrongParkingIncident = {
        id: `WPI-LOCAL-${Date.now()}`,
        vehicleNumber: rawPlate,
        vehicleNumberMasked: masked,
        allocatedSlotId,
        detectedSlotId,
        cameraId: params.cameraId || 'CAM-SURV-LOCAL',
        cameraZone: params.cameraZone || 'Surveillance Zone',
        confidence: conf,
        status: 'NEEDS_REVIEW',
        severity: 'INFO',
        sirenTriggered: false,
        sirenMuted: false,
        isDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        status: 'NEEDS_REVIEW',
        isViolation: false,
        requiresReview: true,
        sirenTriggered: false,
        isDebounced: false,
        vehicleNumber: rawPlate,
        vehicleNumberMasked: masked,
        allocatedSlotId,
        detectedSlotId,
        confidence: conf,
        confidenceThreshold: threshold,
        incident: localIncident,
        message: `Low optical confidence (${conf}% < ${threshold}% threshold). Flagged as NEEDS REVIEW for guard check.`,
      };
    }

    // High confidence violation
    const localIncident: WrongParkingIncident = {
      id: `WPI-LOCAL-${Date.now()}`,
      vehicleNumber: rawPlate,
      vehicleNumberMasked: masked,
      allocatedSlotId,
      detectedSlotId,
      cameraId: params.cameraId || 'CAM-SURV-LOCAL',
      cameraZone: params.cameraZone || 'Surveillance Zone',
      confidence: conf,
      status: 'ACTIVE',
      severity: 'WARNING',
      sirenTriggered: true,
      sirenMuted: false,
      isDemo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    SirenAudioService.triggerWarningSiren(localIncident.id);

    return {
      status: 'VIOLATION_DETECTED',
      isViolation: true,
      requiresReview: false,
      sirenTriggered: true,
      isDebounced: false,
      vehicleNumber: rawPlate,
      vehicleNumberMasked: masked,
      allocatedSlotId,
      detectedSlotId,
      confidence: conf,
      confidenceThreshold: threshold,
      incident: localIncident,
      message: `Confirmed wrong parking: Vehicle ${masked} parked in ${detectedSlotId} (allocated: ${allocatedSlotId}). Facility siren alert triggered.`,
    };
  }
}
