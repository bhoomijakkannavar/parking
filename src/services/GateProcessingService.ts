import {
  VehicleType,
  OwnerCategory,
  DetectionMode,
  GateDetectionEvent,
  ParkingSession,
  Receipt,
  OperationResult,
  CollegeMember,
  CollegeRole,
  SlotRecommendation,
} from '../types';
import { ParkingService } from './ParkingService';
import { VehicleService } from './VehicleService';
import { FeeCalculator } from './FeeCalculator';
import { StorageService } from './StorageService';
import { ValidationService } from './ValidationService';
import { CollegeRegistryService } from './CollegeRegistryService';
import { SlotAllocationService } from './SlotAllocationService';
import { AlertService } from './AlertService';

export interface EntryScanResult {
  status: 'NEW_VEHICLE' | 'ALREADY_INSIDE' | 'FULL' | 'LOW_CONFIDENCE' | 'UNREGISTERED';
  plate: string;
  vehicleType: VehicleType;
  confidence: number;
  existingSlot?: string;
  assignedPreviewSlot?: string;
  recommendation?: SlotRecommendation;
  isRegistered: boolean;
  member?: CollegeMember;
  message: string;
  warning?: string;
}

export interface ExitScanResult {
  status: 'ACTIVE_FOUND' | 'NOT_FOUND' | 'LOW_CONFIDENCE';
  plate: string;
  vehicleType?: VehicleType;
  ownerCategory?: OwnerCategory;
  confidence: number;
  slotId?: string;
  entryHour?: number;
  exitHour?: number;
  duration?: number;
  fee?: number;
  session?: ParkingSession;
  isRegistered: boolean;
  member?: CollegeMember;
  message: string;
}

export class GateProcessingService {
  /**
   * Intelligently infers whether a detected vehicle is arriving (ENTRY) or departing (EXIT)
   * based on live campus parking state.
   */
  public static inferGateDirection(rawPlate: string): 'ENTRY' | 'EXIT' {
    const activeVehicles = StorageService.getActiveVehicles();
    const existing = VehicleService.findActiveVehicle(rawPlate, activeVehicles);
    return existing ? 'EXIT' : 'ENTRY';
  }

  /**
   * Evaluates incoming vehicle detection at Entry Gate.
   */
  public static processEntryScan(
    rawPlate: string,
    vehicleType: VehicleType,
    confidence: number,
    mode: DetectionMode = 'DEMO'
  ): EntryScanResult {
    const plate = ValidationService.normalizeVehicleNumber(rawPlate);
    const activeVehicles = StorageService.getActiveVehicles();
    const slots = StorageService.getSlots();

    // Check College Registry
    const regCheck = CollegeRegistryService.verifyVehicle(plate);
    const resolvedType = regCheck.vehicleType || vehicleType;

    // 1. Low confidence check (< 80%)
    if (confidence < 80) {
      AlertService.triggerAlert(
        'LOW_CONFIDENCE',
        'WARNING',
        `Low OCR confidence detection at gate: ${plate} (${confidence}%).`,
        'Manual visual review required before granting access.',
        plate
      );
      return {
        status: 'LOW_CONFIDENCE',
        plate,
        vehicleType: resolvedType,
        confidence,
        isRegistered: regCheck.isRegistered,
        member: regCheck.member,
        message: 'Low confidence detection. Please verify plate manually.',
        warning: `Detected confidence is ${confidence}% (< 80%). Guard review mandatory.`,
      };
    }

    // 2. Check if already inside (Duplicate Prevention)
    const existingActive = VehicleService.findActiveVehicle(plate, activeVehicles);
    if (existingActive) {
      AlertService.triggerAlert(
        'DUPLICATE_ENTRY',
        'WARNING',
        `Duplicate entry attempt: Vehicle ${plate} is already parked.`,
        `Currently occupies bay ${existingActive.slotId}. Entry denied.`,
        plate,
        existingActive.slotId
      );
      return {
        status: 'ALREADY_INSIDE',
        plate,
        vehicleType: existingActive.vehicleType,
        confidence,
        existingSlot: existingActive.slotId,
        isRegistered: regCheck.isRegistered,
        member: regCheck.member,
        message: `Vehicle is already parked in slot ${existingActive.slotId}.`,
      };
    }

    // 3. Check slot availability & Intelligent Recommendation
    const availableSlot = ParkingService.findFirstAvailableSlot(resolvedType, slots);
    const recommendation = SlotAllocationService.recommendSlot(resolvedType, slots);

    if (!availableSlot) {
      const typeLabel = resolvedType === 'TWO_WHEELER' ? 'Two-Wheeler' : 'Four-Wheeler';
      AlertService.triggerAlert(
        'PARKING_FULL',
        'CRITICAL',
        `Zone overflow: No available ${typeLabel} parking bays.`,
        `Incoming vehicle ${plate} cannot be accommodated.`,
        plate
      );
      return {
        status: 'FULL',
        plate,
        vehicleType: resolvedType,
        confidence,
        isRegistered: regCheck.isRegistered,
        member: regCheck.member,
        message: `No available ${typeLabel} parking slots.`,
      };
    }

    // Check if unregistered
    if (!regCheck.isRegistered) {
      AlertService.triggerAlert(
        'UNKNOWN_VEHICLE',
        'INFO',
        `Unregistered vehicle detected at gate: ${plate}`,
        'Proceed as campus visitor or register in College Registry.',
        plate
      );
    }

    return {
      status: 'NEW_VEHICLE',
      plate,
      vehicleType: resolvedType,
      confidence,
      assignedPreviewSlot: availableSlot.id,
      recommendation: recommendation || undefined,
      isRegistered: regCheck.isRegistered,
      member: regCheck.member,
      message: `Compatible bay ${availableSlot.id} available. Ready for entry confirmation.`,
    };
  }

  /**
   * Confirms Entry through AI Gate and invokes ParkingService.
   */
  public static confirmEntry(
    rawPlate: string,
    vehicleType: VehicleType,
    ownerCategory: OwnerCategory,
    confidence: number,
    mode: DetectionMode = 'DEMO',
    entryHour?: number,
    faceDetected: boolean = true
  ): OperationResult<{
    event: GateDetectionEvent;
    slotId: string;
    session: ParkingSession;
  }> {
    const hour = entryHour !== undefined ? entryHour : new Date().getHours();

    const parkResult = ParkingService.parkVehicle({
      vehicleNumber: rawPlate,
      vehicleType,
      ownerCategory,
      entryHour: hour,
    });

    // Check college member match
    const regCheck = CollegeRegistryService.verifyVehicle(rawPlate);

    if (!parkResult.success || !parkResult.data) {
      // Record failed gate event
      const failEvent: GateDetectionEvent = {
        id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        plateNumber: rawPlate,
        vehicleType,
        ownerCategory,
        gateType: 'ENTRY',
        confidence,
        mode,
        action: parkResult.message.includes('already parked')
          ? 'DUPLICATE_REJECTED'
          : 'REJECTED_FULL',
        actionSummary: parkResult.message,
        faceDetected,
        memberId: regCheck.member?.id,
        memberName: regCheck.member?.name,
        role: regCheck.member?.role,
      };
      StorageService.addCameraEvent(failEvent);

      return {
        success: false,
        message: parkResult.message,
        error: parkResult.error,
      };
    }

    const { slot, session } = parkResult.data;

    // Record success gate event
    const successEvent: GateDetectionEvent = {
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      plateNumber: session.vehicleNumber,
      vehicleType: session.vehicleType,
      ownerCategory: session.ownerCategory,
      gateType: 'ENTRY',
      confidence,
      mode,
      action: 'APPROVED',
      actionSummary: `Entry Approved • Allocated ${slot.id}`,
      slotId: slot.id,
      faceDetected,
      memberId: regCheck.member?.id,
      memberName: regCheck.member?.name,
      role: regCheck.member?.role,
    };
    StorageService.addCameraEvent(successEvent);

    return {
      success: true,
      message: `Vehicle successfully parked at ${slot.id}`,
      data: {
        event: successEvent,
        slotId: slot.id,
        session,
      },
    };
  }

  /**
   * Evaluates outgoing vehicle detection at Exit Gate.
   */
  public static processExitScan(
    rawPlate: string,
    confidence: number,
    mode: DetectionMode = 'DEMO',
    exitHour?: number
  ): ExitScanResult {
    const plate = ValidationService.normalizeVehicleNumber(rawPlate);
    const regCheck = CollegeRegistryService.verifyVehicle(plate);

    // 1. Low confidence check (< 80%)
    if (confidence < 80) {
      AlertService.triggerAlert(
        'LOW_CONFIDENCE',
        'WARNING',
        `Low OCR confidence detection at exit: ${plate} (${confidence}%).`,
        'Manual license plate confirmation required for accurate billing.',
        plate
      );
      return {
        status: 'LOW_CONFIDENCE',
        plate,
        confidence,
        isRegistered: regCheck.isRegistered,
        member: regCheck.member,
        message: 'Low confidence detection at exit. Please verify plate manually.',
      };
    }

    // 2. Prepare checkout via existing ParkingService
    const prepResult = ParkingService.prepareCheckout(plate);
    if (!prepResult.success || !prepResult.data) {
      return {
        status: 'NOT_FOUND',
        plate,
        confidence,
        isRegistered: regCheck.isRegistered,
        member: regCheck.member,
        message: 'Vehicle not currently parked.',
      };
    }

    const { vehicle, slot, session } = prepResult.data;
    const currentHour = exitHour !== undefined ? exitHour : new Date().getHours();
    const effectiveExitHour = Math.max(currentHour, session.entryHour);

    const feeResult = FeeCalculator.calculateFee(
      session.vehicleType,
      session.ownerCategory,
      session.entryHour,
      effectiveExitHour
    );

    return {
      status: 'ACTIVE_FOUND',
      plate: vehicle.vehicleNumber,
      vehicleType: session.vehicleType,
      ownerCategory: session.ownerCategory,
      confidence,
      slotId: slot.id,
      entryHour: session.entryHour,
      exitHour: effectiveExitHour,
      duration: feeResult.duration,
      fee: feeResult.totalFee,
      session,
      isRegistered: regCheck.isRegistered,
      member: regCheck.member,
      message: `Active session located in bay ${slot.id}. Duration: ${feeResult.duration}h, Fee: ₹${feeResult.totalFee}`,
    };
  }

  /**
   * Confirms Exit through AI Gate and invokes ParkingService.checkoutVehicle.
   */
  public static confirmExit(
    rawPlate: string,
    exitHour: number,
    confidence: number,
    mode: DetectionMode = 'DEMO',
    faceDetected: boolean = true
  ): OperationResult<{
    event: GateDetectionEvent;
    receipt: Receipt;
    session: ParkingSession;
  }> {
    const checkoutResult = ParkingService.checkoutVehicle(rawPlate, exitHour);
    const regCheck = CollegeRegistryService.verifyVehicle(rawPlate);

    if (!checkoutResult.success || !checkoutResult.data) {
      const failEvent: GateDetectionEvent = {
        id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        plateNumber: rawPlate,
        vehicleType: 'TWO_WHEELER',
        gateType: 'EXIT',
        confidence,
        mode,
        action: 'NOT_FOUND',
        actionSummary: checkoutResult.message,
        faceDetected,
        memberId: regCheck.member?.id,
        memberName: regCheck.member?.name,
        role: regCheck.member?.role,
      };
      StorageService.addCameraEvent(failEvent);

      return {
        success: false,
        message: checkoutResult.message,
        error: checkoutResult.error,
      };
    }

    const { receipt, session } = checkoutResult.data;

    const successEvent: GateDetectionEvent = {
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      plateNumber: receipt.vehicleNumber,
      vehicleType: receipt.vehicleType,
      ownerCategory: receipt.ownerCategory,
      gateType: 'EXIT',
      confidence,
      mode,
      action: 'CHECKED_OUT',
      actionSummary: `Check-Out Settled • Fee ₹${receipt.fee} • Bay ${receipt.slotId} Freed`,
      slotId: receipt.slotId,
      fee: receipt.fee,
      faceDetected,
      memberId: regCheck.member?.id,
      memberName: regCheck.member?.name,
      role: regCheck.member?.role,
    };
    StorageService.addCameraEvent(successEvent);

    return {
      success: true,
      message: checkoutResult.message,
      data: {
        event: successEvent,
        receipt,
        session,
      },
    };
  }
}
