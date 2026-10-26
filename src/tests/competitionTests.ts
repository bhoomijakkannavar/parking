/**
 * Official CPVTS Comprehensive QA & Competition Test Suite
 * Strictly validates all 20+ functional requirements, fee formulas,
 * slot constraints, edge cases, and persistence invariants.
 */
import { FeeCalculator } from '../services/FeeCalculator';
import { ParkingService } from '../services/ParkingService';
import { StorageService } from '../services/StorageService';
import { VehicleService } from '../services/VehicleService';
import { ValidationService } from '../services/ValidationService';
import { StatisticsService } from '../services/StatisticsService';
import { GateProcessingService } from '../services/GateProcessingService';
import { CollegeRegistryService } from '../services/CollegeRegistryService';
import { SlotAllocationService } from '../services/SlotAllocationService';
import { AlertService } from '../services/AlertService';
import { TOTAL_SLOTS_COUNT, TOTAL_TWO_WHEELER_SLOTS, TOTAL_FOUR_WHEELER_SLOTS } from '../constants';

// Polyfill localStorage for node runner if needed
if (typeof window === 'undefined' || !globalThis.localStorage) {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    key: (i: number) => Object.keys(store)[i] || null,
    length: Object.keys(store).length,
  };
}

export function runAllCompetitionTests(): {
  passed: number;
  total: number;
  results: { id: string; name: string; success: boolean; details: string }[];
} {
  const results: { id: string; name: string; success: boolean; details: string }[] = [];

  function assert(testId: string, testName: string, condition: boolean, details: string) {
    results.push({
      id: testId,
      name: testName,
      success: condition,
      details,
    });
  }

  // Clear environment for test run
  StorageService.resetToDefaults();

  // =======================================================
  // CHECK 1 & 2 & 3: 10 2W slots, 5 4W slots, All initially AVAILABLE
  // =======================================================
  {
    const slots = StorageService.getSlots();
    const twoWheelers = slots.filter((s) => s.type === 'TWO_WHEELER');
    const fourWheelers = slots.filter((s) => s.type === 'FOUR_WHEELER');
    const allAvailable = slots.every((s) => s.status === 'AVAILABLE');

    const pass =
      slots.length === TOTAL_SLOTS_COUNT &&
      twoWheelers.length === TOTAL_TWO_WHEELER_SLOTS &&
      fourWheelers.length === TOTAL_FOUR_WHEELER_SLOTS &&
      twoWheelers[0].id === 'T-01' &&
      twoWheelers[9].id === 'T-10' &&
      fourWheelers[0].id === 'F-01' &&
      fourWheelers[4].id === 'F-05' &&
      allAvailable;

    assert(
      'SLOT CONFIG',
      '10 Two-Wheeler (T-01..T-10) & 5 Four-Wheeler (F-01..F-05) initially AVAILABLE',
      pass,
      `Total: ${slots.length}, 2W: ${twoWheelers.length}, 4W: ${fourWheelers.length}, All Available: ${allAvailable}`
    );
  }

  // =======================================================
  // SCENARIO 1: Student + Two-Wheeler (09 -> 13) = ₹20
  // =======================================================
  {
    const feeResult = FeeCalculator.calculateFee('TWO_WHEELER', 'STUDENT', 9, 13);
    const pass = feeResult.duration === 4 && feeResult.totalFee === 20;
    assert(
      'SCENARIO 1',
      'Student 2-Wheeler (09 -> 13 = ₹20)',
      pass,
      `Duration: ${feeResult.duration}h, Fee: ₹${feeResult.totalFee} (Expected: ₹20)`
    );
  }

  // =======================================================
  // SCENARIO 2: Student + Four-Wheeler (09 -> 13) = ₹40
  // =======================================================
  {
    const feeResult = FeeCalculator.calculateFee('FOUR_WHEELER', 'STUDENT', 9, 13);
    const pass = feeResult.duration === 4 && feeResult.totalFee === 40;
    assert(
      'SCENARIO 2',
      'Student 4-Wheeler (09 -> 13 = ₹40)',
      pass,
      `Duration: ${feeResult.duration}h, Fee: ₹${feeResult.totalFee} (Expected: ₹40)`
    );
  }

  // =======================================================
  // SCENARIO 3: Staff (09 -> 13) = ₹0
  // =======================================================
  {
    const fee2W = FeeCalculator.calculateFee('TWO_WHEELER', 'STAFF', 9, 13);
    const fee4W = FeeCalculator.calculateFee('FOUR_WHEELER', 'STAFF', 9, 13);
    const pass = fee2W.totalFee === 0 && fee4W.totalFee === 0;
    assert(
      'SCENARIO 3',
      'Staff (09 -> 13 = ₹0 for both 2W & 4W)',
      pass,
      `2W Fee: ₹${fee2W.totalFee}, 4W Fee: ₹${fee4W.totalFee} (Expected: ₹0)`
    );
  }

  // =======================================================
  // SCENARIO 4: Visitor + Two-Wheeler (09 -> 13) = ₹80
  // =======================================================
  {
    const feeResult = FeeCalculator.calculateFee('TWO_WHEELER', 'VISITOR', 9, 13);
    const pass = feeResult.duration === 4 && feeResult.totalFee === 80;
    assert(
      'SCENARIO 4',
      'Visitor 2-Wheeler (09 -> 13 = ₹80)',
      pass,
      `Duration: ${feeResult.duration}h, Fee: ₹${feeResult.totalFee} (Expected: ₹80)`
    );
  }

  // =======================================================
  // SCENARIO 5: Visitor + Four-Wheeler (09 -> 13) = ₹160
  // =======================================================
  {
    const feeResult = FeeCalculator.calculateFee('FOUR_WHEELER', 'VISITOR', 9, 13);
    const pass = feeResult.duration === 4 && feeResult.totalFee === 160;
    assert(
      'SCENARIO 5',
      'Visitor 4-Wheeler (09 -> 13 = ₹160)',
      pass,
      `Duration: ${feeResult.duration}h, Fee: ₹${feeResult.totalFee} (Expected: ₹160)`
    );
  }

  // =======================================================
  // SCENARIO 6: Student Free Hours (1h = ₹0, 2h = ₹0, 3h = ₹10/₹20)
  // =======================================================
  {
    const s2w_1 = FeeCalculator.calculateFee('TWO_WHEELER', 'STUDENT', 9, 10);
    const s2w_2 = FeeCalculator.calculateFee('TWO_WHEELER', 'STUDENT', 9, 11);
    const s2w_3 = FeeCalculator.calculateFee('TWO_WHEELER', 'STUDENT', 9, 12);

    const s4w_1 = FeeCalculator.calculateFee('FOUR_WHEELER', 'STUDENT', 9, 10);
    const s4w_2 = FeeCalculator.calculateFee('FOUR_WHEELER', 'STUDENT', 9, 11);
    const s4w_3 = FeeCalculator.calculateFee('FOUR_WHEELER', 'STUDENT', 9, 12);

    const pass =
      s2w_1.totalFee === 0 &&
      s2w_2.totalFee === 0 &&
      s2w_3.totalFee === 10 &&
      s4w_1.totalFee === 0 &&
      s4w_2.totalFee === 0 &&
      s4w_3.totalFee === 20;

    assert(
      'STUDENT GRACE',
      'Student 1h/2h Free, 3rd hour onwards billed',
      pass,
      `2W: [1h=₹${s2w_1.totalFee}, 2h=₹${s2w_2.totalFee}, 3h=₹${s2w_3.totalFee}] | 4W: [1h=₹${s4w_1.totalFee}, 2h=₹${s4w_2.totalFee}, 3h=₹${s4w_3.totalFee}]`
    );
  }

  // =======================================================
  // SCENARIO 7: Duplicate Vehicle Rejection
  // =======================================================
  {
    StorageService.resetToDefaults();
    const entry1 = ParkingService.parkVehicle({
      vehicleNumber: 'KA-22-XY-9876',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 9,
    });

    const entry2 = ParkingService.parkVehicle({
      vehicleNumber: 'KA-22-XY-9876',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 10,
    });

    const pass = entry1.success && !entry2.success && entry2.message.includes('already parked');
    assert(
      'DUPLICATE REJECT',
      'Duplicate active vehicle prevented from entering again',
      pass,
      `Entry 1: ${entry1.message} | Duplicate: ${entry2.message}`
    );
  }

  // =======================================================
  // SCENARIO 8: Exit Time Earlier Than Entry Time Rejection
  // =======================================================
  {
    const valid = ValidationService.validateExitHour(8, 10);
    const pass = !valid.isValid && valid.error === 'Exit time cannot be earlier than entry time.';
    assert(
      'EXIT TIME CHECK',
      'Exit time earlier than entry time is strictly rejected',
      pass,
      `Validation error: "${valid.error}"`
    );
  }

  // =======================================================
  // SCENARIO 9: Full Two-Wheeler Zone Overflow Rejection
  // =======================================================
  {
    StorageService.resetToDefaults();
    for (let i = 1; i <= 10; i++) {
      ParkingService.parkVehicle({
        vehicleNumber: `KA-01-TW-${1000 + i}`,
        vehicleType: 'TWO_WHEELER',
        ownerCategory: 'STUDENT',
        entryHour: 9,
      });
    }

    const overflow = ParkingService.parkVehicle({
      vehicleNumber: 'KA-01-TW-9999',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 9,
    });

    const pass = !overflow.success && overflow.message === 'No available Two-Wheeler parking slots.';
    assert(
      '2W ZONE CAPACITY',
      'Full Two-Wheeler zone overflow rejected (10 max)',
      pass,
      `Rejection message: "${overflow.message}"`
    );
  }

  // =======================================================
  // SCENARIO 10: Full Four-Wheeler Zone Overflow Rejection
  // =======================================================
  {
    StorageService.resetToDefaults();
    for (let i = 1; i <= 5; i++) {
      ParkingService.parkVehicle({
        vehicleNumber: `KA-01-FW-${2000 + i}`,
        vehicleType: 'FOUR_WHEELER',
        ownerCategory: 'STAFF',
        entryHour: 9,
      });
    }

    const overflow = ParkingService.parkVehicle({
      vehicleNumber: 'KA-01-FW-9999',
      vehicleType: 'FOUR_WHEELER',
      ownerCategory: 'VISITOR',
      entryHour: 9,
    });

    const pass = !overflow.success && overflow.message === 'No available Four-Wheeler parking slots.';
    assert(
      '4W ZONE CAPACITY',
      'Full Four-Wheeler zone overflow rejected (5 max)',
      pass,
      `Rejection message: "${overflow.message}"`
    );
  }

  // =======================================================
  // SCENARIO 11: Compatible Slot Isolation
  // =======================================================
  {
    StorageService.resetToDefaults();
    const entry4W = ParkingService.parkVehicle({
      vehicleNumber: 'KA-01-CAR-01',
      vehicleType: 'FOUR_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 9,
    });

    const entry2W = ParkingService.parkVehicle({
      vehicleNumber: 'KA-01-BIKE-01',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 9,
    });

    const pass =
      entry4W.data?.slot.id.startsWith('F-') &&
      entry2W.data?.slot.id.startsWith('T-');

    assert(
      'ZONE ISOLATION',
      'Four-wheelers get F-slots and Two-wheelers get T-slots',
      !!pass,
      `Car slot: ${entry4W.data?.slot.id}, Bike slot: ${entry2W.data?.slot.id}`
    );
  }

  // =======================================================
  // SCENARIO 12: Checkout Slot Becomes AVAILABLE & Receipt Issued
  // =======================================================
  {
    StorageService.resetToDefaults();
    const entry = ParkingService.parkVehicle({
      vehicleNumber: 'KA-05-AB-7777',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 9,
    });

    const assignedSlotId = entry.data?.slot.id;
    const checkoutResult = ParkingService.checkoutVehicle('KA-05-AB-7777', 13);

    const currentSlots = StorageService.getSlots();
    const checkedSlot = currentSlots.find((s) => s.id === assignedSlotId);
    const receipt = checkoutResult.data?.receipt;

    const pass =
      checkoutResult.success &&
      checkedSlot !== undefined &&
      checkedSlot.status === 'AVAILABLE' &&
      !checkedSlot.vehicleNumber &&
      receipt !== undefined &&
      receipt.fee === 20 &&
      receipt.duration === 4 &&
      receipt.breakdown.length > 0;

    assert(
      'CHECKOUT & RECEIPT',
      'Checkout frees slot to AVAILABLE and generates complete receipt',
      pass,
      `Slot ${assignedSlotId} status: ${checkedSlot?.status}, Receipt: ${receipt?.id}, Fee: ₹${receipt?.fee}`
    );
  }

  // =======================================================
  // SCENARIO 13: Vehicle Search by Plate and Slot
  // =======================================================
  {
    StorageService.resetToDefaults();
    ParkingService.parkVehicle({
      vehicleNumber: 'KA-99-XY-3333',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'VISITOR',
      entryHour: 11,
    });

    const activeVehicles = StorageService.getActiveVehicles();
    const foundByExact = VehicleService.findActiveVehicle('KA-99-XY-3333', activeVehicles);
    const foundByUnhyphenated = VehicleService.findActiveVehicle('KA99XY3333', activeVehicles);
    const foundBySlot = VehicleService.findActiveVehicle('T-01', activeVehicles);
    const foundByUnhyphenatedSlot = VehicleService.findActiveVehicle('T01', activeVehicles);

    const pass =
      foundByExact !== undefined &&
      foundByUnhyphenated !== undefined &&
      foundBySlot !== undefined &&
      foundByUnhyphenatedSlot !== undefined &&
      foundByExact.vehicleNumber === 'KA-99-XY-3333';

    assert(
      'VEHICLE SEARCH',
      'Vehicle search works by exact plate, unhyphenated plate, and slot ID',
      pass,
      `Found exact: ${foundByExact?.vehicleNumber}, unhyphenated: ${foundByUnhyphenated?.vehicleNumber}, by slot: ${foundBySlot?.slotId}`
    );
  }

  // =======================================================
  // SCENARIO 14: Dynamic Statistics Verification (Zero Hardcoding)
  // =======================================================
  {
    StorageService.resetToDefaults();
    // Initially empty
    const stats0 = StatisticsService.computeDailyStatistics([], [], []);
    const initialPass = stats0.occupiedSlots === 0 && stats0.availableSlots === 15 && stats0.totalFeesCollected === 0;

    // Park 2 vehicles
    ParkingService.parkVehicle({ vehicleNumber: 'KA-01-A1', vehicleType: 'TWO_WHEELER', ownerCategory: 'STUDENT', entryHour: 9 });
    ParkingService.parkVehicle({ vehicleNumber: 'KA-01-B1', vehicleType: 'FOUR_WHEELER', ownerCategory: 'VISITOR', entryHour: 9 });

    // Checkout 1 vehicle
    ParkingService.checkoutVehicle('KA-01-B1', 13); // 4h Visitor 4W = ₹160

    const slots = StorageService.getSlots();
    const sessions = StorageService.getSessions();
    const receipts = StorageService.getReceipts();
    const stats = StatisticsService.computeDailyStatistics(slots, sessions, receipts);

    const pass =
      initialPass &&
      stats.occupiedSlots === 1 &&
      stats.availableSlots === 14 &&
      stats.totalFeesCollected === 160 &&
      stats.totalCompletedCheckouts === 1 &&
      stats.totalVehiclesParkedToday === 2;

    assert(
      'DYNAMIC STATS',
      'Statistics dynamically derived from real slots, sessions, and receipts',
      pass,
      `Occupied: ${stats.occupiedSlots}, Avail: ${stats.availableSlots}, Revenue: ₹${stats.totalFeesCollected}, Checkouts: ${stats.totalCompletedCheckouts}`
    );
  }

  // =======================================================
  // SCENARIO 15: Persistence Across Simulated Reload
  // =======================================================
  {
    StorageService.resetToDefaults();
    ParkingService.parkVehicle({
      vehicleNumber: 'KA-77-PERSIST',
      vehicleType: 'FOUR_WHEELER',
      ownerCategory: 'STAFF',
      entryHour: 10,
    });

    // Read directly from storage simulates fresh browser reload
    const storedSlots = StorageService.getSlots();
    const storedVehicles = StorageService.getActiveVehicles();
    const storedSessions = StorageService.getSessions();

    const pass =
      storedVehicles.some((v) => v.vehicleNumber === 'KA-77-PERSIST') &&
      storedSlots.some((s) => s.vehicleNumber === 'KA-77-PERSIST' && s.status === 'OCCUPIED') &&
      storedSessions.some((s) => s.vehicleNumber === 'KA-77-PERSIST' && s.status === 'ACTIVE');

    assert(
      'PERSISTENCE',
      'localStorage persistence survives simulated browser reload',
      pass,
      `Stored active vehicles: ${storedVehicles.length}, Slot persisted: ${storedSlots.find((s) => s.vehicleNumber === 'KA-77-PERSIST')?.id}`
    );
  }

  // =======================================================
  // SCENARIO 16: AI Gate Camera Entry & Automatic Slot Allocation
  // =======================================================
  {
    StorageService.resetToDefaults();
    const entryScan = GateProcessingService.processEntryScan('KA-05-AI-11', 'TWO_WHEELER', 95);
    const canEnterInitial = entryScan.status === 'NEW_VEHICLE' && entryScan.assignedPreviewSlot === 'T-01';

    const entryConfirmation = GateProcessingService.confirmEntry(
      'KA-05-AI-11',
      'TWO_WHEELER',
      'STUDENT',
      95,
      'DEMO',
      9
    );

    const slotAssigned = entryConfirmation.data?.slotId === 'T-01';
    const isNowParked = StorageService.getActiveVehicles().some(
      (v) => v.vehicleNumber === 'KA-05-AI-11' && v.status === 'PARKED'
    );
    const events = StorageService.getCameraEvents();
    const eventLogged = events.some(
      (e) => e.plateNumber === 'KA-05-AI-11' && e.action === 'APPROVED'
    );

    const pass = canEnterInitial && entryConfirmation.success && slotAssigned && isNowParked && eventLogged;

    assert(
      'AI GATE ENTRY',
      'AI Gate ANPR entry scan, slot allocation, and camera event audit logging',
      pass,
      `CanEnter: ${canEnterInitial}, Allocated: ${entryConfirmation.data?.slotId}, Parked: ${isNowParked}, EventLogged: ${eventLogged}`
    );
  }

  // =======================================================
  // SCENARIO 17: AI Gate Duplicate Prevention & Low Confidence Flag
  // =======================================================
  {
    // Try to scan duplicate vehicle currently parked at gate
    const duplicateScan = GateProcessingService.processEntryScan('KA-05-AI-11', 'TWO_WHEELER', 92);
    const duplicateBlocked = duplicateScan.status === 'ALREADY_INSIDE' && duplicateScan.existingSlot === 'T-01';

    // Test low confidence scan (<80%)
    const lowConfScan = GateProcessingService.processEntryScan('MH-12-LOWCONF', 'FOUR_WHEELER', 72);
    const warningTriggered = lowConfScan.status === 'LOW_CONFIDENCE';

    const pass = duplicateBlocked && warningTriggered;

    assert(
      'AI GATE SAFETY',
      'AI Gate duplicate vehicle detection & low OCR confidence warning (<80%)',
      pass,
      `DuplicateBlocked: ${duplicateBlocked}, WarningTriggered: ${warningTriggered}`
    );
  }

  // =======================================================
  // SCENARIO 18: AI Gate Camera Exit Scan, Billing & Slot Release
  // =======================================================
  {
    // KA-05-AI-11 entered at 9 as STUDENT Two-Wheeler in slot T-01
    // Exit at 13 -> Duration = 4 hours. Fee for Student 2W (first 2h free, then ₹10/hr) = 2 * ₹10 = ₹20.
    const exitScan = GateProcessingService.processExitScan('KA-05-AI-11', 94, 'DEMO', 13);
    const exitFound = exitScan.status === 'ACTIVE_FOUND' && exitScan.fee === 20 && exitScan.duration === 4;

    const exitConfirmation = GateProcessingService.confirmExit('KA-05-AI-11', 13, 94);
    const receiptGenerated = exitConfirmation.success && !!exitConfirmation.data?.receipt && exitConfirmation.data.receipt.fee === 20;

    const slotReleased = StorageService.getSlots().find((s) => s.id === 'T-01')?.status === 'AVAILABLE';
    const vehicleCleared = !StorageService.getActiveVehicles().some(
      (v) => v.vehicleNumber === 'KA-05-AI-11' && v.status === 'PARKED'
    );
    const exitEvents = StorageService.getCameraEvents();
    const exitEventLogged = exitEvents.some(
      (e) => e.plateNumber === 'KA-05-AI-11' && e.action === 'CHECKED_OUT'
    );

    const pass = exitFound && receiptGenerated && slotReleased && vehicleCleared && exitEventLogged;

    assert(
      'AI GATE EXIT',
      'AI Gate exit detection, billing calculation, receipt generation, and slot release',
      pass,
      `ExitFound: ${exitFound}, ReceiptFee: ₹${exitConfirmation.data?.receipt.fee}, SlotReleased: ${slotReleased}, Cleared: ${vehicleCleared}`
    );
  }

  // =======================================================
  // SCENARIO 19: College Vehicle Registry Verification
  // =======================================================
  {
    StorageService.resetToDefaults();
    const studentCheck = CollegeRegistryService.verifyVehicle('KA-05-ST-2020');
    const facultyCheck = CollegeRegistryService.verifyVehicle('KA-01-FA-1001');
    const unknownCheck = CollegeRegistryService.verifyVehicle('KA-99-ZZ-0000');

    const pass =
      studentCheck.isRegistered &&
      studentCheck.member?.name === 'Rohan Verma' &&
      studentCheck.role === 'Student' &&
      facultyCheck.isRegistered &&
      facultyCheck.member?.name === 'Prof. Arvind Sharma' &&
      facultyCheck.role === 'Faculty' &&
      !unknownCheck.isRegistered;

    assert(
      'COLLEGE REGISTRY',
      'College Registry verifies institutional members by license plate with zero biometric storage',
      pass,
      `StudentMatched: ${studentCheck.isRegistered}, FacultyMatched: ${facultyCheck.isRegistered}, UnknownRejected: ${!unknownCheck.isRegistered}`
    );
  }

  // =======================================================
  // SCENARIO 20: Intelligent Deterministic Slot Allocation
  // =======================================================
  {
    StorageService.resetToDefaults();
    const initialSlots = StorageService.getSlots();
    const rec1 = SlotAllocationService.recommendSlot('TWO_WHEELER', initialSlots);

    // Park T-01
    ParkingService.parkVehicle({
      vehicleNumber: 'KA-05-T1-TEST',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 9,
    });

    const updatedSlots = StorageService.getSlots();
    const rec2 = SlotAllocationService.recommendSlot('TWO_WHEELER', updatedSlots);

    const pass =
      rec1?.recommendedSlotId === 'T-01' &&
      rec1.reasons.length > 0 &&
      rec2?.recommendedSlotId === 'T-02';

    assert(
      'SLOT ALLOCATION',
      'Intelligent SlotAllocationService selects optimal compatible bays with explainable tokens',
      pass,
      `FirstChoice: ${rec1?.recommendedSlotId}, NextChoice: ${rec2?.recommendedSlotId}`
    );
  }

  // =======================================================
  // SCENARIO 21: Automatic Gate Direction Inference
  // =======================================================
  {
    StorageService.resetToDefaults();
    // Before entering, should infer ENTRY
    const dirBefore = GateProcessingService.inferGateDirection('KA-77-AUTO-01');

    // Park vehicle
    ParkingService.parkVehicle({
      vehicleNumber: 'KA-77-AUTO-01',
      vehicleType: 'FOUR_WHEELER',
      ownerCategory: 'STAFF',
      entryHour: 10,
    });

    // While parked, should infer EXIT
    const dirAfter = GateProcessingService.inferGateDirection('KA-77-AUTO-01');

    const pass = dirBefore === 'ENTRY' && dirAfter === 'EXIT';

    assert(
      'AUTO DIRECTION',
      'AI Gate infers Entry or Exit automatically based on live campus parking status',
      pass,
      `BeforeParking: ${dirBefore}, WhileParked: ${dirAfter}`
    );
  }

  // =======================================================
  // SCENARIO 22: Security & Anomaly Alert Center Lifecycle
  // =======================================================
  {
    StorageService.resetToDefaults();
    const alert = AlertService.triggerAlert(
      'DUPLICATE_ENTRY',
      'WARNING',
      'Duplicate vehicle entry detected',
      'Test details'
    );

    const activeCountInitial = AlertService.getUnreadCount();
    AlertService.resolve(alert.id);
    const resolvedAlert = StorageService.getAlerts().find((a) => a.id === alert.id);

    const pass = activeCountInitial >= 1 && resolvedAlert?.status === 'RESOLVED';

    assert(
      'ALERT CENTER',
      'Rule-based anomaly radar logs alerts and allows manual resolution lifecycle',
      pass,
      `InitialUnread: ${activeCountInitial}, FinalStatus: ${resolvedAlert?.status}`
    );
  }

  const passedCount = results.filter((r) => r.success).length;
  return {
    passed: passedCount,
    total: results.length,
    results,
  };
}
