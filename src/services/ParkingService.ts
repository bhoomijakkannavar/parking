import {
  ParkingSlot,
  Vehicle,
  ParkingSession,
  Receipt,
  VehicleType,
  VehicleEntryInput,
  OperationResult,
  FeeCalculationResult,
} from '../types';
import { StorageService } from './StorageService';
import { ValidationService } from './ValidationService';
import { VehicleService } from './VehicleService';
import { FeeCalculator } from './FeeCalculator';
import { ReceiptService } from './ReceiptService';

export class ParkingService {
  /**
   * Finds the first available slot that strictly matches the required vehicle type.
   * Two-Wheelers -> T-01 to T-10
   * Four-Wheelers -> F-01 to F-05
   * Incompatible slots are NEVER assigned.
   */
  public static findFirstAvailableSlot(
    type: VehicleType,
    slots: ParkingSlot[]
  ): ParkingSlot | undefined {
    return slots.find((slot) => slot.type === type && slot.status === 'AVAILABLE');
  }

  /**
   * Registers vehicle entry, allocates compatible slot, and creates an active session.
   */
  public static parkVehicle(input: VehicleEntryInput): OperationResult<{
    vehicle: Vehicle;
    slot: ParkingSlot;
    session: ParkingSession;
  }> {
    const slots = StorageService.getSlots();
    const activeVehicles = StorageService.getActiveVehicles();
    const sessions = StorageService.getSessions();

    // 1. Validate Form Input & Duplicate Active Vehicle
    const validation = ValidationService.validateEntryForm(input, activeVehicles);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.error || 'Invalid vehicle details provided.',
        error: validation.error,
      };
    }

    const { normalizedNumber, parsedHour } = validation;

    // 2. Find compatible parking slot
    const assignedSlot = this.findFirstAvailableSlot(input.vehicleType, slots);
    if (!assignedSlot) {
      const typeLabel = input.vehicleType === 'TWO_WHEELER' ? 'Two-Wheeler' : 'Four-Wheeler';
      const errorMsg = `No available ${typeLabel} parking slots.`;
      return {
        success: false,
        message: errorMsg,
        error: errorMsg,
      };
    }

    // 3. Create Vehicle Entity
    const newVehicle = VehicleService.createVehicle(
      normalizedNumber,
      input.vehicleType,
      input.ownerCategory,
      assignedSlot.id,
      parsedHour
    );

    // 4. Create Active Parking Session
    const newSession: ParkingSession = {
      id: `SESS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      vehicleId: newVehicle.id,
      slotId: assignedSlot.id,
      vehicleNumber: normalizedNumber,
      vehicleType: input.vehicleType,
      ownerCategory: input.ownerCategory,
      entryHour: parsedHour,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    // 5. Update Slot status
    const updatedSlots = slots.map((s) => {
      if (s.id === assignedSlot.id) {
        return {
          ...s,
          status: 'OCCUPIED' as const,
          vehicleId: newVehicle.id,
          vehicleNumber: normalizedNumber,
          ownerCategory: input.ownerCategory,
          entryHour: parsedHour,
        };
      }
      return s;
    });

    // 6. Persist changes to Storage
    const updatedActiveVehicles = [...activeVehicles, newVehicle];
    const updatedSessions = [...sessions, newSession];

    StorageService.saveSlots(updatedSlots);
    StorageService.saveActiveVehicles(updatedActiveVehicles);
    StorageService.saveSessions(updatedSessions);

    const successMsg = `Vehicle successfully parked at ${assignedSlot.id}`;

    return {
      success: true,
      message: successMsg,
      data: {
        vehicle: newVehicle,
        slot: { ...assignedSlot, status: 'OCCUPIED', vehicleNumber: normalizedNumber },
        session: newSession,
      },
    };
  }

  /**
   * Prepares vehicle checkout by searching by Vehicle Number or Slot ID.
   */
  public static prepareCheckout(searchKey: string): OperationResult<{
    vehicle: Vehicle;
    slot: ParkingSlot;
    session: ParkingSession;
  }> {
    if (!searchKey || searchKey.trim().length === 0) {
      return {
        success: false,
        message: 'Please enter a vehicle number or slot ID.',
      };
    }

    const activeVehicles = StorageService.getActiveVehicles();
    const slots = StorageService.getSlots();
    const sessions = StorageService.getSessions();

    const activeVehicle = VehicleService.findActiveVehicle(searchKey, activeVehicles);
    if (!activeVehicle) {
      return {
        success: false,
        message: 'Vehicle not currently parked.',
        error: 'Vehicle not currently parked.',
      };
    }

    const slot = slots.find((s) => s.id === activeVehicle.slotId);
    if (!slot) {
      return {
        success: false,
        message: `Slot ${activeVehicle.slotId} could not be resolved.`,
      };
    }

    const session = sessions.find(
      (s) => s.vehicleId === activeVehicle.id && s.status === 'ACTIVE'
    );
    if (!session) {
      return {
        success: false,
        message: 'Active parking session could not be found.',
      };
    }

    return {
      success: true,
      message: 'Active vehicle found.',
      data: {
        vehicle: activeVehicle,
        slot,
        session,
      },
    };
  }

  /**
   * Completes vehicle checkout:
   * Validates exit hour, calculates fee, issues receipt, frees slot, and archives session.
   */
  public static checkoutVehicle(
    searchKey: string,
    exitHour: number
  ): OperationResult<{
    session: ParkingSession;
    receipt: Receipt;
    feeResult: FeeCalculationResult;
  }> {
    const prepResult = this.prepareCheckout(searchKey);
    if (!prepResult.success || !prepResult.data) {
      return {
        success: false,
        message: prepResult.message,
        error: prepResult.error,
      };
    }

    const { vehicle, slot, session } = prepResult.data;

    // 1. Validate Exit Hour
    const hourValidation = ValidationService.validateExitHour(exitHour, session.entryHour);
    if (!hourValidation.isValid) {
      return {
        success: false,
        message: hourValidation.error || 'Invalid exit hour.',
        error: hourValidation.error,
      };
    }

    const parsedExitHour = hourValidation.value;

    // 2. Calculate Parking Fee & Duration
    const feeResult = FeeCalculator.calculateFee(
      session.vehicleType,
      session.ownerCategory,
      session.entryHour,
      parsedExitHour
    );

    // 3. Generate Receipt
    const receipt = ReceiptService.createReceipt(session, feeResult);

    // 4. Update session to completed
    const updatedSessions = StorageService.getSessions().map((s) => {
      if (s.id === session.id) {
        return {
          ...s,
          exitHour: parsedExitHour,
          duration: feeResult.duration,
          fee: feeResult.totalFee,
          status: 'COMPLETED' as const,
          completedAt: new Date().toISOString(),
          receiptId: receipt.id,
        };
      }
      return s;
    });

    // 5. Free the assigned slot (mark AVAILABLE and wipe vehicle metadata)
    const updatedSlots = StorageService.getSlots().map((s) => {
      if (s.id === slot.id) {
        return {
          id: s.id,
          type: s.type,
          status: 'AVAILABLE' as const,
        };
      }
      return s;
    });

    // 6. Update active vehicles (remove checked out vehicle from active list)
    const updatedActiveVehicles = StorageService.getActiveVehicles().filter(
      (v) => v.id !== vehicle.id
    );

    // 7. Save Receipt to records
    const receipts = StorageService.getReceipts();
    const updatedReceipts = [receipt, ...receipts];

    // 8. Commit all updates to Storage
    StorageService.saveSessions(updatedSessions);
    StorageService.saveSlots(updatedSlots);
    StorageService.saveActiveVehicles(updatedActiveVehicles);
    StorageService.saveReceipts(updatedReceipts);

    const completedSession = updatedSessions.find((s) => s.id === session.id) || session;

    return {
      success: true,
      message: `Checkout complete for ${vehicle.vehicleNumber}. Slot ${slot.id} is now AVAILABLE.`,
      data: {
        session: completedSession,
        receipt,
        feeResult,
      },
    };
  }

  /**
   * Seeds realistic demo vehicles on-demand for presentation.
   */
  public static seedRealisticDemoData(): void {
    // Reset to clean state first
    StorageService.resetToDefaults();

    const sampleVehicles: VehicleEntryInput[] = [
      { vehicleNumber: 'KA22AB1234', vehicleType: 'TWO_WHEELER', ownerCategory: 'STUDENT', entryHour: 9 },
      { vehicleNumber: 'KA22CD5678', vehicleType: 'FOUR_WHEELER', ownerCategory: 'STAFF', entryHour: 8 },
      { vehicleNumber: 'KA22EF9876', vehicleType: 'TWO_WHEELER', ownerCategory: 'STAFF', entryHour: 10 },
      { vehicleNumber: 'KA22GH4321', vehicleType: 'FOUR_WHEELER', ownerCategory: 'VISITOR', entryHour: 11 },
      { vehicleNumber: 'MH12PQ3456', vehicleType: 'TWO_WHEELER', ownerCategory: 'VISITOR', entryHour: 10 },
    ];

    sampleVehicles.forEach((item) => {
      this.parkVehicle(item);
    });

    // Also simulate one completed checkout in history so reports & receipt history have demo data
    const tempPrep = this.prepareCheckout('KA22AB1234');
    if (tempPrep.success) {
      this.checkoutVehicle('KA22AB1234', 13); // 4 hrs = ₹20
    }
  }
}
