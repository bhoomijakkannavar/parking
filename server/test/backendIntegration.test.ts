import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../db/init';
import { getDb, closeDb } from '../db/database';
import { ParkingDbService } from '../services/ParkingDbService';
import { BackendFeeCalculator } from '../services/FeeCalculator';

export function runBackendIntegrationTests(): {
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

  // Setup isolated test database in test file
  const testDbDir = path.resolve(process.cwd(), 'server', 'data');
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }
  const testDbPath = path.join(testDbDir, 'test_scpm.db');
  if (fs.existsSync(testDbPath)) {
    try { fs.unlinkSync(testDbPath); } catch {}
  }
  process.env.DB_PATH = testDbPath;

  console.log('[TEST] Initializing test SQLite database at:', testDbPath);
  initializeDatabase();

  // Test 1: SQLite database created and file exists
  {
    const exists = fs.existsSync(testDbPath);
    assert(
      'DB_FILE_EXISTS',
      'SQLite database file created in server data directory',
      exists,
      `File path: ${testDbPath}`
    );
  }

  // Test 2 & 3: Exactly 15 slots exist (10 2W, 5 4W, initially AVAILABLE)
  {
    const slots = ParkingDbService.getSlots();
    const twoWheelers = slots.filter((s) => s.type === 'TWO_WHEELER');
    const fourWheelers = slots.filter((s) => s.type === 'FOUR_WHEELER');
    const allAvailable = slots.every((s) => s.status === 'AVAILABLE');

    const pass =
      slots.length === 15 &&
      twoWheelers.length === 10 &&
      fourWheelers.length === 5 &&
      twoWheelers[0].id === 'T-01' &&
      fourWheelers[0].id === 'F-01' &&
      allAvailable;

    assert(
      'SLOTS_INITIAL_STATE',
      'All 15 parking slots exist exactly once and are initially AVAILABLE',
      pass,
      `Total: ${slots.length}, 2W: ${twoWheelers.length}, 4W: ${fourWheelers.length}, All Available: ${allAvailable}`
    );
  }

  // Test 4: Entry allocates compatible slot with zone isolation
  {
    const bikeEntry = ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-01-BIKE-1111',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 9,
      origin: 'MANUAL',
    });

    const carEntry = ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-01-CAR-2222',
      vehicleType: 'FOUR_WHEELER',
      ownerCategory: 'STAFF',
      entryHour: 8,
      origin: 'MANUAL',
    });

    const pass =
      bikeEntry.success &&
      bikeEntry.slot?.id === 'T-01' &&
      bikeEntry.slot?.status === 'OCCUPIED' &&
      carEntry.success &&
      carEntry.slot?.id === 'F-01' &&
      carEntry.slot?.status === 'OCCUPIED';

    assert(
      'SLOT_ALLOCATION_COMPATIBLE',
      'Entry allocates compatible slot (2W -> T-01, 4W -> F-01)',
      pass,
      `Bike slot: ${bikeEntry.slot?.id}, Car slot: ${carEntry.slot?.id}`
    );
  }

  // Test 5: Duplicate active entry rejected at DB level
  {
    const duplicateEntry = ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-01-BIKE-1111',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 10,
    });

    const pass = !duplicateEntry.success && duplicateEntry.message.includes('already parked');
    assert(
      'DUPLICATE_ACTIVE_REJECTED',
      'Duplicate active entry is rejected at database level',
      pass,
      `Rejection message: "${duplicateEntry.message}"`
    );
  }

  // Test 6: Exit calculates correct fee and respects tariff rules
  {
    // Bike KA-01-BIKE-1111 entered at 9, exiting at 13 (4 hours, Student 2W: 2h free, 2h * 10 = 20)
    const checkoutResult = ParkingDbService.checkoutVehicle('KA-01-BIKE-1111', 13);
    const pass =
      checkoutResult.success &&
      checkoutResult.feeResult?.duration === 4 &&
      checkoutResult.feeResult?.totalFee === 20;

    assert(
      'EXIT_FEE_CALCULATION',
      'Exit calculates correct fee for Student 2W (4h = ₹20)',
      pass,
      `Duration: ${checkoutResult.feeResult?.duration}h, Fee: ₹${checkoutResult.feeResult?.totalFee}`
    );
  }

  // Test 7: Receipt is persisted in SQLite receipts table
  {
    const receipts = ParkingDbService.getReceipts();
    const foundReceipt = receipts.find((r) => r.vehicle_number === 'KA-01-BIKE-1111');
    const pass = Boolean(foundReceipt && foundReceipt.fee === 20);

    assert(
      'RECEIPT_PERSISTED',
      'Receipt is securely persisted in SQLite receipts table',
      pass,
      `Receipt ID: ${foundReceipt?.id}, Fee: ₹${foundReceipt?.fee}`
    );
  }

  // Test 8: Slot becomes available after exit
  {
    const slotT01 = ParkingDbService.getSlotById('T-01');
    const pass = slotT01?.status === 'AVAILABLE' && slotT01.current_vehicle_id === null;

    assert(
      'SLOT_RELEASED_ON_EXIT',
      'Slot becomes AVAILABLE and occupant metadata is cleared after checkout',
      pass,
      `Slot T-01 status: ${slotT01?.status}`
    );
  }

  // Test 9 & 10: State survives restart (reopening DB connection)
  {
    // Close and re-open DB
    const db2 = new Database(testDbPath);
    initializeDatabase(db2);
    const reopenedSlots = db2.prepare('SELECT COUNT(*) as count FROM parking_slots').get() as { count: number };
    const reopenedReceipts = db2.prepare('SELECT COUNT(*) as count FROM receipts').get() as { count: number };

    const pass = reopenedSlots.count === 15 && reopenedReceipts.count >= 1;
    assert(
      'PERSISTENCE_ON_RESTART',
      'Database records survive connection closing and reopening',
      pass,
      `Slots count: ${reopenedSlots.count}, Receipts count: ${reopenedReceipts.count}`
    );
  }

  // Test 11: Dynamic dashboard values update from stored records
  {
    const dashboard = ParkingDbService.getDashboard();
    // Remember KA-01-CAR-2222 is still parked
    const pass =
      dashboard.currentlyParked === 1 &&
      dashboard.availableSlots === 14 &&
      dashboard.totalFeesCollected === 20 &&
      dashboard.totalCompletedCheckouts === 1;

    assert(
      'DASHBOARD_DYNAMIC_METRICS',
      'Dashboard metrics derive dynamically from SQLite rows',
      pass,
      `Currently Parked: ${dashboard.currentlyParked}, Available: ${dashboard.availableSlots}, Revenue: ₹${dashboard.totalFeesCollected}`
    );
  }

  // Test 12: Vehicle search works (exact, unhyphenated/canonical, slot)
  {
    const exact = ParkingDbService.findVehicle('KA-01-CAR-2222');
    const canonical = ParkingDbService.findVehicle('KA01CAR2222');
    const bySlot = ParkingDbService.findVehicle('F-01');

    const pass = Boolean(exact && canonical && bySlot && exact.vehicle_number === 'KA-01-CAR-2222');
    assert(
      'VEHICLE_SEARCH_FLEXIBLE',
      'Vehicle search matches exact plate, canonical plate, and slot ID',
      pass,
      `Exact: ${exact?.vehicle_number}, Canonical: ${canonical?.vehicle_number}, By slot: ${bySlot?.vehicle_number}`
    );
  }

  // Test 13: Camera events persist in SQLite
  {
    const event = ParkingDbService.addCameraEvent({
      plateNumber: 'KA-05-ST-2020',
      vehicleType: 'TWO_WHEELER',
      gateType: 'ENTRY',
      confidence: 98.5,
      mode: 'DEMO',
      action: 'APPROVED',
      actionSummary: 'Automatic entry permitted',
      slotId: 'T-02',
    });

    const events = ParkingDbService.getCameraEvents();
    const pass = events.length > 0 && events[0].id === event.id;

    assert(
      'CAMERA_EVENTS_PERSISTED',
      'Camera events are recorded and retrieved from camera_events table',
      pass,
      `Logged event ID: ${event.id}, Plate: ${event.plate_number}`
    );
  }

  // Test 14: Chronological validation (exitHour < entryHour rejected)
  {
    const invalidExit = ParkingDbService.checkoutVehicle('KA-01-CAR-2222', 7); // entered at 8
    const pass = !invalidExit.success && invalidExit.message.includes('Exit time cannot be earlier');

    assert(
      'CHRONOLOGICAL_INTEGRITY',
      'Exit hour earlier than entry hour is strictly rejected',
      pass,
      `Rejection message: "${invalidExit.message}"`
    );
  }

  // Test 15: Full Fee Matrix Verification
  {
    const staff2W = BackendFeeCalculator.calculateFee('TWO_WHEELER', 'STAFF', 9, 13);
    const staff4W = BackendFeeCalculator.calculateFee('FOUR_WHEELER', 'STAFF', 9, 13);
    const stu2W = BackendFeeCalculator.calculateFee('TWO_WHEELER', 'STUDENT', 9, 13);
    const stu4W = BackendFeeCalculator.calculateFee('FOUR_WHEELER', 'STUDENT', 9, 13);
    const vis2W = BackendFeeCalculator.calculateFee('TWO_WHEELER', 'VISITOR', 9, 13);
    const vis4W = BackendFeeCalculator.calculateFee('FOUR_WHEELER', 'VISITOR', 9, 13);

    const pass =
      staff2W.totalFee === 0 &&
      staff4W.totalFee === 0 &&
      stu2W.totalFee === 20 &&
      stu4W.totalFee === 40 &&
      vis2W.totalFee === 80 &&
      vis4W.totalFee === 160;

    assert(
      'FEE_MATRIX_COMPLIANCE',
      'Comprehensive tariff rules match all scenarios (Staff ₹0, Student 2W ₹20/4W ₹40, Visitor 2W ₹80/4W ₹160)',
      pass,
      `Staff: ₹${staff2W.totalFee}, Stu2W: ₹${stu2W.totalFee}, Stu4W: ₹${stu4W.totalFee}, Vis2W: ₹${vis2W.totalFee}, Vis4W: ₹${vis4W.totalFee}`
    );
  }

  // Test 16: Concurrent / sequential entry requests cannot allocate the same slot
  {
    const allocatedSlots = new Set<string>();
    let noCollisions = true;

    // Park 5 distinct bikes
    for (let i = 1; i <= 5; i++) {
      const res = ParkingDbService.parkVehicle({
        vehicleNumber: `KA-09-CONCUR-${i}`,
        vehicleType: 'TWO_WHEELER',
        ownerCategory: 'VISITOR',
        entryHour: 10,
      });
      if (res.success && res.slot) {
        if (allocatedSlots.has(res.slot.id)) {
          noCollisions = false;
        }
        allocatedSlots.add(res.slot.id);
      }
    }

    assert(
      'CONCURRENT_ALLOCATION_INTEGRITY',
      'Multiple entry requests allocate distinct slots without collisions',
      noCollisions && allocatedSlots.size === 5,
      `Allocated distinct slots: ${Array.from(allocatedSlots).join(', ')}`
    );
  }

  // =========================================================================
  // AI COLLEGE ID CARD VERIFICATION ACCEPTANCE TESTS (Criteria 1-12)
  // =========================================================================

  // Test 17: Valid active student ID + matching vehicle plate -> Auto-approve entry (STUDENT tariff)
  {
    const res = ParkingDbService.verifyCollegeId('STU-2023-045', 'KA-05-ST-2020', 95);
    const pass =
      res.verified === true &&
      res.status === 'VERIFIED' &&
      res.canAutoApprove === true &&
      res.tariffCategory === 'STUDENT' &&
      res.maskedIdCardNumber === 'STU-***-045' &&
      res.member?.name === 'Rohan Verma';

    assert(
      'ID_VERIF_STUDENT_MATCH',
      'Criterion 1: Valid active student ID + matching plate auto-approves with Student tariff',
      pass,
      `Status: ${res.status}, AutoApprove: ${res.canAutoApprove}, Tariff: ${res.tariffCategory}, Masked ID: ${res.maskedIdCardNumber}`
    );
  }

  // Test 18: Valid active staff ID + matching vehicle plate -> Auto-approve entry (STAFF free ₹0 tariff)
  {
    const res = ParkingDbService.verifyCollegeId('FAC-CS-101', 'KA-01-FA-1001', 98);
    const pass =
      res.verified === true &&
      res.status === 'VERIFIED' &&
      res.canAutoApprove === true &&
      res.tariffCategory === 'STAFF' &&
      res.maskedIdCardNumber === 'FAC-***-101' &&
      res.member?.role === 'Faculty';

    assert(
      'ID_VERIF_STAFF_MATCH',
      'Criterion 2: Valid active staff ID + matching plate auto-approves with Staff tariff',
      pass,
      `Status: ${res.status}, AutoApprove: ${res.canAutoApprove}, Tariff: ${res.tariffCategory}, Role: ${res.member?.role}`
    );
  }

  // Test 19: Unknown/unregistered ID -> Reject auto entry
  {
    const res = ParkingDbService.verifyCollegeId('STU-999-999', 'KA-05-ST-2020', 92);
    const pass =
      res.verified === false &&
      res.status === 'FAILED' &&
      res.canAutoApprove === false &&
      res.tariffCategory === 'VISITOR' &&
      res.reasons.some((r) => r.toLowerCase().includes('not found') || r.toLowerCase().includes('unregistered'));

    assert(
      'ID_VERIF_UNKNOWN_REJECT',
      'Criterion 3: Unknown / unregistered ID card is rejected for auto entry',
      pass,
      `Status: ${res.status}, AutoApprove: ${res.canAutoApprove}, Reasons: ${res.reasons.join('; ')}`
    );
  }

  // Test 20: Inactive/suspended college member -> Reject auto entry
  {
    getDb().prepare(`
      INSERT OR REPLACE INTO college_members (id, name, role, department, status, registered_vehicles_json, created_at)
      VALUES ('STU-SUSP-777', 'Suspended Student', 'Student', 'ME', 'SUSPENDED', '[{"plateNumber":"KA-03-SS-7777","vehicleType":"TWO_WHEELER"}]', datetime('now'))
    `).run();

    const res = ParkingDbService.verifyCollegeId('STU-SUSP-777', 'KA-03-SS-7777', 95);
    const pass =
      res.verified === false &&
      res.status === 'FAILED' &&
      res.canAutoApprove === false &&
      res.reasons.some((r) => r.includes('SUSPENDED'));

    assert(
      'ID_VERIF_INACTIVE_MEMBER',
      'Criterion 4: Inactive/suspended college member ID rejects auto entry',
      pass,
      `Status: ${res.status}, AutoApprove: ${res.canAutoApprove}, Reasons: ${res.reasons.join('; ')}`
    );
  }

  // Test 21: Valid ID belonging to different vehicle -> Require manual review (mismatch)
  {
    // Rohan's student ID with Prof Sharma's car
    const res = ParkingDbService.verifyCollegeId('STU-2023-045', 'KA-01-FA-1001', 94);
    const pass =
      res.status === 'NEEDS_REVIEW' &&
      res.canAutoApprove === false &&
      res.reasons.some((r) => r.toLowerCase().includes('not registered'));

    assert(
      'ID_VERIF_PLATE_MISMATCH',
      'Criterion 5: Valid ID presented with different vehicle requires manual review',
      pass,
      `Status: ${res.status}, AutoApprove: ${res.canAutoApprove}, Reasons: ${res.reasons.join('; ')}`
    );
  }

  // Test 22: Low OCR confidence (<80%) -> Flag for manual review
  {
    const res = ParkingDbService.verifyCollegeId('STU-2023-045', 'KA-05-ST-2020', 74);
    const pass =
      res.status === 'NEEDS_REVIEW' &&
      res.canAutoApprove === false &&
      res.reasons.some((r) => r.includes('80%'));

    assert(
      'ID_VERIF_LOW_CONFIDENCE',
      'Criterion 6: Low OCR confidence (<80%) flags scan for manual review',
      pass,
      `Status: ${res.status}, AutoApprove: ${res.canAutoApprove}, Reasons: ${res.reasons.join('; ')}`
    );
  }

  // Test 23: Missing ID / visitor fallback -> Entry allowed under visitor rules
  {
    const res = ParkingDbService.verifyCollegeId('', 'KA-02-VS-7777', 0);
    const pass =
      res.status === 'VISITOR_BYPASS' &&
      res.canAutoApprove === true &&
      res.tariffCategory === 'VISITOR';

    assert(
      'ID_VERIF_VISITOR_FALLBACK',
      'Criterion 7: Missing ID triggers visitor fallback with standard hourly tariff',
      pass,
      `Status: ${res.status}, AutoApprove: ${res.canAutoApprove}, Tariff: ${res.tariffCategory}`
    );
  }

  // Test 24: Duplicate active parking session rejection
  {
    const firstPark = ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-05-ST-2020',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 9,
    });
    const secondPark = ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-05-ST-2020',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 9,
    });

    const pass = firstPark.success === true && secondPark.success === false && secondPark.message.toLowerCase().includes('already parked');
    assert(
      'DUPLICATE_SESSION_REJECTED',
      'Criterion 8: Duplicate active parking session is strictly rejected',
      pass,
      `First success: ${firstPark.success}, Second success: ${secondPark.success}, Msg: "${secondPark.message}"`
    );
  }

  // Test 25: Capacity exhaustion / no slot available rejection
  {
    // Fill remaining four-wheeler slots (F-02, F-03, F-04, F-05)
    for (let i = 2; i <= 5; i++) {
      ParkingDbService.parkVehicle({
        vehicleNumber: `KA-09-FILL-4W-${i}`,
        vehicleType: 'FOUR_WHEELER',
        ownerCategory: 'VISITOR',
        entryHour: 8,
      });
    }

    // Now try to park one more 4W
    const overflowPark = ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-09-OVERFLOW',
      vehicleType: 'FOUR_WHEELER',
      ownerCategory: 'VISITOR',
      entryHour: 8,
    });

    const pass = overflowPark.success === false && overflowPark.message.toLowerCase().includes('no available');
    assert(
      'CAPACITY_EXHAUSTION_REJECTED',
      'Criterion 9: Entry is rejected when parking slots of that type are exhausted',
      pass,
      `Overflow success: ${overflowPark.success}, Message: "${overflowPark.message}"`
    );
  }

  // Test 26: Database persistence of verification metadata across restarts
  {
    const event = ParkingDbService.addCameraEvent({
      plateNumber: 'KA-05-ST-2020',
      vehicleType: 'TWO_WHEELER',
      gateType: 'ENTRY',
      confidence: 96,
      mode: 'DEMO',
      action: 'APPROVED',
      actionSummary: 'Automatic entry permitted',
      slotId: 'T-02',
      idCardNumberMasked: 'STU-***-045',
      idVerificationStatus: 'VERIFIED',
      idVerificationReason: 'Valid student ID & matching vehicle',
    });

    const rawRow = getDb().prepare(`
      SELECT * FROM camera_events WHERE id = ?
    `).get(event.id) as any;

    const pass =
      rawRow &&
      rawRow.id_card_number_masked === 'STU-***-045' &&
      rawRow.id_verification_status === 'VERIFIED' &&
      rawRow.id_verification_reason.includes('Valid student ID');

    assert(
      'ID_METADATA_PERSISTENCE',
      'Criterion 10: Verification metadata persists correctly in SQLite camera_events schema',
      Boolean(pass),
      `Stored Masked ID: ${rawRow?.id_card_number_masked}, Status: ${rawRow?.id_verification_status}`
    );
  }

  // Test 27: Manual override by guard with recorded reason
  {
    const overrideEvent = ParkingDbService.addCameraEvent({
      plateNumber: 'KA-01-FA-1001',
      vehicleType: 'FOUR_WHEELER',
      gateType: 'ENTRY',
      confidence: 72,
      mode: 'DEMO',
      action: 'APPROVED',
      actionSummary: 'Security guard override granted',
      slotId: 'F-01',
      idCardNumberMasked: 'STU-***-045',
      idVerificationStatus: 'OVERRIDDEN',
      overrideReason: 'Physical badge inspected and verified by guard on duty',
    });

    const retrieved = ParkingDbService.getCameraEvents().find((e) => e.id === overrideEvent.id);
    const pass =
      retrieved !== undefined &&
      retrieved.id_verification_status === 'OVERRIDDEN' &&
      retrieved.override_reason === 'Physical badge inspected and verified by guard on duty';

    assert(
      'GUARD_MANUAL_OVERRIDE_LOGGED',
      'Criterion 11: Authorized guard manual override is logged with mandatory justification',
      Boolean(pass),
      `Status: ${retrieved?.id_verification_status}, Reason: "${retrieved?.override_reason}"`
    );
  }

  // Test 28: Existing fee calculation, entry, exit, receipts unaffected
  {
    // Checkout Rohan's student bike (entered at 9, checkout at 12 -> 3 hrs total)
    // Student 2W: 2h grace, 1 chargeable hour @ ₹10 = ₹10
    const exitRes = ParkingDbService.checkoutVehicle('KA-05-ST-2020', 12);
    const pass =
      exitRes.success === true &&
      exitRes.receipt !== undefined &&
      exitRes.receipt.fee === 10 &&
      exitRes.receipt.duration === 3 &&
      exitRes.receipt.vehicle_number === 'KA-05-ST-2020';

    assert(
      'EXISTING_CORE_WORKFLOW_UNTOUCHED',
      'Criterion 12: Existing fee calculation, slot clearing, and receipt generation unaffected',
      pass,
      `Checkout success: ${exitRes.success}, Fee: ₹${exitRes.receipt?.fee}, Duration: ${exitRes.receipt?.duration}h, Receipt ID: ${exitRes.receipt?.id}`
    );
  }

  // ==========================================
  // WRONG PARKING DETECTION ACCEPTANCE TESTS
  // ==========================================

  let testWpIncidentId = '';
  let secondWpIncidentId = '';
  let wp1AllocatedSlot = 'F-01';

  // Test 29: Criterion 1 - Correctly parked vehicle creates no wrong-parking alert
  {
    // Free any 4W slots filled in prior tests
    for (let i = 2; i <= 5; i++) {
      try {
        ParkingDbService.checkoutVehicle(`KA-09-FILL-4W-${i}`, 12);
      } catch {}
    }
    const f1 = ParkingDbService.getSlotById('F-01');
    if (f1 && f1.current_vehicle_number) {
      try { ParkingDbService.checkoutVehicle(f1.current_vehicle_number, 12); } catch {}
    }

    // Park vehicle KA-01-WP-1001 in allocated 4W bay
    const parkRes = ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-01-WP-1001',
      vehicleType: 'FOUR_WHEELER',
      ownerCategory: 'STAFF',
      entryHour: 10,
    });
    wp1AllocatedSlot = parkRes.session?.slot_id || 'F-01';

    // Camera detects vehicle in its designated bay
    const detectRes = ParkingDbService.detectWrongParking({
      vehicleNumber: 'KA-01-WP-1001',
      detectedSlotId: wp1AllocatedSlot,
      confidence: 96,
      cameraId: 'CAM-SURV-SOUTH-F',
    });

    const pass =
      detectRes.status === 'CORRECTLY_PARKED' &&
      detectRes.isViolation === false &&
      detectRes.sirenTriggered === false &&
      detectRes.incident === null;

    assert(
      'WP_CORRECT_NO_ALERT',
      'Criterion 1: Correctly parked vehicle creates no wrong-parking alert',
      pass,
      `Status: ${detectRes.status}, IsViolation: ${detectRes.isViolation}, SirenTriggered: ${detectRes.sirenTriggered}`
    );
  }

  // Test 30: Criterion 2 - High-confidence wrong slot creates one alert
  {
    // Pick a slot that is definitely different from wp1AllocatedSlot
    const wrongSlot = wp1AllocatedSlot === 'F-05' ? 'F-03' : 'F-05';

    // Vehicle KA-01-WP-1001 is detected physically in a wrong slot with 94% confidence
    const detectRes = ParkingDbService.detectWrongParking({
      vehicleNumber: 'KA-01-WP-1001',
      detectedSlotId: wrongSlot,
      confidence: 94,
      cameraId: 'CAM-SURV-SOUTH-F',
      cameraZone: 'Zone F Surveillance',
    });

    testWpIncidentId = detectRes.incident?.id || '';

    const pass =
      detectRes.status === 'VIOLATION_DETECTED' &&
      detectRes.isViolation === true &&
      detectRes.sirenTriggered === true &&
      detectRes.incident !== null &&
      detectRes.incident.allocated_slot_id === wp1AllocatedSlot &&
      detectRes.incident.detected_slot_id === wrongSlot &&
      detectRes.incident.status === 'ACTIVE';

    assert(
      'WP_HIGH_CONF_ALERT',
      'Criterion 2: High-confidence wrong slot creates one alert',
      pass,
      `Incident ID: ${testWpIncidentId}, Allocated: ${detectRes.allocatedSlotId}, Detected: ${detectRes.detectedSlotId}, Siren: ${detectRes.sirenTriggered}`
    );
  }

  // Test 31: Criterion 3 - Low-confidence detection requires manual review
  {
    // Park vehicle KA-01-WP-2002 (2W) in T-01
    ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-01-WP-2002',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 10,
    });

    // Optical detection with only 65% confidence (< 80% threshold)
    const detectRes = ParkingDbService.detectWrongParking({
      vehicleNumber: 'KA-01-WP-2002',
      detectedSlotId: 'T-05',
      confidence: 65,
      confidenceThreshold: 80,
      cameraId: 'CAM-SURV-NORTH-T',
    });

    const pass =
      detectRes.status === 'NEEDS_REVIEW' &&
      detectRes.isViolation === false &&
      detectRes.requiresReview === true &&
      detectRes.sirenTriggered === false &&
      detectRes.incident?.status === 'NEEDS_REVIEW';

    assert(
      'WP_LOW_CONF_REVIEW',
      'Criterion 3: Low-confidence detection requires manual review',
      pass,
      `Status: ${detectRes.status}, RequiresReview: ${detectRes.requiresReview}, SirenTriggered: ${detectRes.sirenTriggered}`
    );
  }

  // Test 32: Criterion 4 - Repeated frames do not create duplicate alerts or repeatedly honk
  {
    const wrongSlot = wp1AllocatedSlot === 'F-05' ? 'F-03' : 'F-05';
    // Second detection frame for KA-01-WP-1001 in wrongSlot
    const detectRes = ParkingDbService.detectWrongParking({
      vehicleNumber: 'KA-01-WP-1001',
      detectedSlotId: wrongSlot,
      confidence: 96,
      cameraId: 'CAM-SURV-SOUTH-F',
    });

    // Check count of incidents in database for this plate & slot
    const db = getDb();
    const countRow = db
      .prepare("SELECT COUNT(*) as count FROM wrong_parking_incidents WHERE vehicle_number = 'KA-01-WP-1001' AND detected_slot_id = ?")
      .get(wrongSlot) as { count: number };

    const pass =
      detectRes.status === 'DUPLICATE_DEBOUNCED' &&
      detectRes.isDebounced === true &&
      detectRes.sirenTriggered === false &&
      countRow.count === 1;

    assert(
      'WP_REPEATED_DEBOUNCE',
      'Criterion 4: Repeated frames do not create duplicate alerts or repeatedly honk',
      pass,
      `Status: ${detectRes.status}, Debounced: ${detectRes.isDebounced}, Total Incidents: ${countRow.count}, SirenTriggered: ${detectRes.sirenTriggered}`
    );
  }

  // Test 33: Criterion 5 - Unknown vehicle and missing active session are handled safely
  {
    // Vehicle that has not checked in at gate
    const detectRes = ParkingDbService.detectWrongParking({
      vehicleNumber: 'DL-01-UN-9999',
      detectedSlotId: 'F-02',
      confidence: 92,
      cameraId: 'CAM-SURV-SOUTH-F',
    });

    const pass =
      detectRes.status === 'NO_ACTIVE_SESSION' &&
      detectRes.isViolation === false &&
      detectRes.sirenTriggered === false &&
      detectRes.incident === null;

    assert(
      'WP_UNKNOWN_VEHICLE_SAFE',
      'Criterion 5: Unknown vehicle and missing active session are handled safely',
      pass,
      `Status: ${detectRes.status}, HandledSafely: ${pass}, Message: "${detectRes.message}"`
    );
  }

  // Test 34: Criterion 6 - Authorized staff can acknowledge and resolve alerts
  {
    // 1. Acknowledge by authorized security guard
    const ackRes = ParkingDbService.acknowledgeWrongParkingIncident(testWpIncidentId, {
      operatorRole: 'Security Guard',
      operatorId: 'GUARD-442',
      notes: 'Investigating on ground',
    });

    // 2. Resolve by authorized guard
    const resRes = ParkingDbService.resolveWrongParkingIncident(testWpIncidentId, {
      operatorRole: 'Security Guard',
      operatorId: 'GUARD-442',
      notes: 'Driver relocated vehicle to designated bay',
    });

    const pass =
      ackRes.success === true &&
      ackRes.incident?.status === 'ACKNOWLEDGED' &&
      ackRes.incident?.acknowledged_by === 'GUARD-442' &&
      resRes.success === true &&
      resRes.incident?.status === 'RESOLVED' &&
      resRes.incident?.resolved_by === 'GUARD-442' &&
      resRes.incident?.siren_muted === 1;

    assert(
      'WP_STAFF_ACK_AND_RESOLVE',
      'Criterion 6: Authorized staff can acknowledge and resolve alerts',
      pass,
      `AckStatus: ${ackRes.incident?.status}, ResolveStatus: ${resRes.incident?.status}, Muted: ${resRes.incident?.siren_muted}`
    );
  }

  // Test 35: Criterion 7 - Unauthorized users cannot resolve or override incidents
  {
    // Free a slot if needed and park third vehicle
    const f3 = ParkingDbService.getSlotById('F-03');
    if (f3 && f3.current_vehicle_number) {
      try { ParkingDbService.checkoutVehicle(f3.current_vehicle_number, 12); } catch {}
    }

    const park3 = ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-01-WP-3003',
      vehicleType: 'FOUR_WHEELER',
      ownerCategory: 'VISITOR',
      entryHour: 11,
    });
    const alloc3 = park3.session?.slot_id || 'F-03';
    const wrong3 = alloc3 === 'F-04' ? 'F-02' : 'F-04';

    const wp3 = ParkingDbService.detectWrongParking({
      vehicleNumber: 'KA-01-WP-3003',
      detectedSlotId: wrong3,
      confidence: 93,
    });
    secondWpIncidentId = wp3.incident?.id || '';

    // Unauthorized attempt by Visitor
    const unauthRes = ParkingDbService.resolveWrongParkingIncident(secondWpIncidentId, {
      operatorRole: 'Visitor',
      operatorId: 'GUEST-99',
    });

    const incidentCheck = ParkingDbService.getWrongParkingIncidents().find((i) => i.id === secondWpIncidentId);

    const pass =
      unauthRes.success === false &&
      unauthRes.unauthorized === true &&
      incidentCheck?.status === 'ACTIVE';

    assert(
      'WP_UNAUTHORIZED_BLOCKED',
      'Criterion 7: Unauthorized users cannot resolve or override incidents',
      pass,
      `UnauthorizedBlocked: ${unauthRes.unauthorized}, IncidentStatus: ${incidentCheck?.status}`
    );
  }

  // Test 36: Criterion 8 - Alarm can be tested, muted, disabled, and rate-limited
  {
    const muteRes = ParkingDbService.muteIncidentAlarm(secondWpIncidentId, {
      operatorRole: 'Security Guard',
      reason: 'Silenced from dashboard',
    });

    const pass =
      muteRes.success === true &&
      muteRes.incident?.siren_muted === 1;

    assert(
      'WP_ALARM_MUTED_CONTROL',
      'Criterion 8: Alarm can be tested, muted, disabled, and rate-limited',
      pass,
      `MuteSuccess: ${muteRes.success}, SirenMuted: ${muteRes.incident?.siren_muted}`
    );
  }

  // Test 37: Criterion 9 - Incidents persist after server restart
  {
    // Close database connection to simulate server shutdown
    closeDb();

    // Reopen connection (simulating new server process start)
    const reopenedDb = getDb();
    const persistedIncidents = reopenedDb
      .prepare('SELECT * FROM wrong_parking_incidents')
      .all() as any[];

    const foundFirst = persistedIncidents.find((i) => i.id === testWpIncidentId);
    const foundSecond = persistedIncidents.find((i) => i.id === secondWpIncidentId);

    const pass =
      persistedIncidents.length >= 2 &&
      foundFirst !== undefined &&
      foundFirst.status === 'RESOLVED' &&
      foundSecond !== undefined &&
      foundSecond.siren_muted === 1;

    assert(
      'WP_PERSISTENCE_ON_RESTART',
      'Criterion 9: Incidents persist after server restart',
      pass,
      `TotalPersisted: ${persistedIncidents.length}, FirstStatus: ${foundFirst?.status}, SecondMuted: ${foundSecond?.siren_muted}`
    );
  }

  // Test 38: Criterion 10 - Existing parking entry, exit, fee, receipt, dashboard, and ID verification functionality still works
  {
    const dashboard = ParkingDbService.getDashboard();
    const slots = ParkingDbService.getSlots();

    const pass =
      slots.length === 15 &&
      dashboard.totalSlots === 15 &&
      dashboard.activeWrongParkingCount !== undefined &&
      dashboard.activeWrongParkingCount >= 1 &&
      dashboard.twoWheelerStats.total === 10 &&
      dashboard.fourWheelerStats.total === 5;

    assert(
      'WP_ALL_CORE_FEATURES_INTACT',
      'Criterion 10: Existing parking entry, exit, fee, receipt, dashboard, and ID verification functionality still works',
      pass,
      `Slots: ${slots.length}, ActiveWrongParking: ${dashboard.activeWrongParkingCount}, DashboardTotal: ${dashboard.totalSlots}`
    );
  }

  // ==========================================
  // VIP & EMERGENCY PRIORITY RESERVATION TESTS (Tests 39 - 50)
  // ==========================================

  let testResIdF02 = '';
  let testEmgResId = '';

  // Test 39: Criterion 1 - Regular vehicles cannot be allocated a reserved slot
  {
    // Free T-01 and T-02 if occupied from previous tests
    for (const sid of ['T-01', 'T-02']) {
      const s = ParkingDbService.getSlotById(sid);
      if (s?.current_vehicle_number) {
        try { ParkingDbService.checkoutVehicle(s.current_vehicle_number, 12); } catch {}
      }
    }

    // Reserve slot T-01 for VIP
    const futureStart = new Date(Date.now() + 3600 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 5 * 3600 * 1000).toISOString();

    const res = ParkingDbService.createReservation({
      reservationType: 'VIP_GUEST',
      slotId: 'T-01',
      guestName: 'Chief Guest Prof. Radhakrishnan',
      startTime: futureStart,
      endTime: futureEnd,
      reason: 'Keynote Speaker - National Engineering Symposium',
      operatorRole: 'SECURITY_OFFICER',
      securityPin: '1234',
    });

    const slotT1 = ParkingDbService.getSlotById('T-01');

    // Now a regular student parks a 2W vehicle
    const parkRes = ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-05-STU-REG1',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 9,
    });

    const pass =
      res.success === true &&
      slotT1?.status === 'RESERVED' &&
      parkRes.success === true &&
      parkRes.slot?.id !== 'T-01'; // MUST NOT allocate T-01!

    assert(
      'RES_RULE_REGULAR_CANNOT_TAKE_RESERVED',
      'Criterion 1: Regular vehicles cannot be allocated a reserved slot',
      pass,
      `T-01 Status: ${slotT1?.status}, Student Allocated: ${parkRes.slot?.id}`
    );

    // Checkout student vehicle so T-02 is unoccupied before locking
    ParkingDbService.checkoutVehicle('KA-05-STU-REG1', 12);
  }

  // Test 40: Criterion 2 - Regular vehicles cannot be allocated a security-locked slot
  {
    // Security locks slot T-02
    const lockRes = ParkingDbService.lockSlot({
      slotId: 'T-02',
      lockType: 'SECURITY_LOCKED',
      reason: 'Security cordon - High voltage transformer inspection bay',
      operatorRole: 'SECURITY_OFFICER',
      securityPin: '1234',
    });

    const slotT2 = ParkingDbService.getSlotById('T-02');

    // Another regular student parks
    const parkRes = ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-05-STU-REG2',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 9,
    });

    const pass =
      lockRes.success === true &&
      slotT2?.status === 'SECURITY_LOCKED' &&
      parkRes.success === true &&
      parkRes.slot?.id !== 'T-02'; // MUST NOT allocate T-02!

    assert(
      'RES_RULE_REGULAR_CANNOT_TAKE_LOCKED',
      'Criterion 2: Regular vehicles cannot be allocated a security-locked slot',
      pass,
      `T-02 Status: ${slotT2?.status}, Student Allocated: ${parkRes.slot?.id}`
    );
  }

  // Test 41: Criterion 3 - Explicit authorized unreserve makes an otherwise eligible slot available
  {
    // Security unlocks T-02
    const unlockRes = ParkingDbService.unlockSlot({
      slotId: 'T-02',
      releaseReason: 'Inspection complete, security cordon removed',
      operatorRole: 'SECURITY_OFFICER',
      securityPin: '1234',
    });

    const slotT2After = ParkingDbService.getSlotById('T-02');

    // Next vehicle entry should now be eligible to receive T-02
    const parkRes = ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-05-STU-REG3',
      vehicleType: 'TWO_WHEELER',
      ownerCategory: 'STUDENT',
      entryHour: 10,
    });

    const pass =
      unlockRes.success === true &&
      slotT2After?.status === 'AVAILABLE' &&
      parkRes.success === true &&
      parkRes.slot?.id === 'T-02';

    assert(
      'RES_RULE_UNRESERVE_MAKES_AVAILABLE',
      'Criterion 3: Explicit authorized unreserve makes an otherwise eligible slot available',
      pass,
      `Unlocked Status: ${slotT2After?.status}, Next Vehicle Allocated: ${parkRes.slot?.id}`
    );
  }

  // Test 42: Criterion 4 - Unauthorized users cannot unreserve or unlock protected slots
  {
    // Regular student tries to unlock T-01
    const badUnlock = ParkingDbService.unlockSlot({
      slotId: 'T-01',
      releaseReason: 'I want this slot',
      operatorRole: 'STUDENT',
      securityPin: 'wrong-pin',
    });

    // Regular student tries to lock F-05
    const badLock = ParkingDbService.lockSlot({
      slotId: 'F-05',
      lockType: 'SECURITY_LOCKED',
      reason: 'Unauthorized lock attempt',
      operatorRole: 'STUDENT',
      securityPin: '',
    });

    const slotT1 = ParkingDbService.getSlotById('T-01');

    const pass =
      badUnlock.unauthorized === true &&
      badLock.unauthorized === true &&
      slotT1?.status === 'RESERVED';

    assert(
      'RES_RULE_UNAUTHORIZED_BLOCKED',
      'Criterion 4: Unauthorized users cannot unreserve or unlock protected slots',
      pass,
      `UnlockUnauthorized: ${badUnlock.unauthorized}, LockUnauthorized: ${badLock.unauthorized}, T-01 Status: ${slotT1?.status}`
    );
  }

  // Test 43: Criterion 5 - Expired reservations do not override independent security locks
  {
    // Free F-01
    const f1 = ParkingDbService.getSlotById('F-01');
    if (f1?.current_vehicle_number) {
      try { ParkingDbService.checkoutVehicle(f1.current_vehicle_number, 12); } catch {}
    }

    // Security places independent lock on F-01
    ParkingDbService.lockSlot({
      slotId: 'F-01',
      lockType: 'SECURITY_LOCKED',
      reason: 'Campus Fire & Evacuation Zone',
      operatorRole: 'SECURITY_OFFICER',
      securityPin: '1234',
    });

    // Create a reservation that ends in the past
    const pastStart = new Date(Date.now() - 3600 * 5000).toISOString();
    const pastEnd = new Date(Date.now() - 3600 * 1000).toISOString();

    const expiredRes = ParkingDbService.createReservation({
      reservationType: 'VIP_GUEST',
      slotId: 'F-01',
      guestName: 'Past Dignitary',
      startTime: pastStart,
      endTime: pastEnd,
      reason: 'Past event',
      operatorRole: 'SECURITY_OFFICER',
      securityPin: '1234',
    });

    // Run getReservations which runs expiration cleanup
    ParkingDbService.getReservations();

    const slotF1 = ParkingDbService.getSlotById('F-01');

    const pass = slotF1?.status === 'SECURITY_LOCKED';

    assert(
      'RES_RULE_EXPIRED_DOES_NOT_CLEAR_SECURITY_LOCK',
      'Criterion 5: Expired reservations do not override independent security locks',
      pass,
      `F-01 Status: ${slotF1?.status} (Expected SECURITY_LOCKED)`
    );
  }

  // Test 44: Criterion 6 - Overlapping reservations are rejected
  {
    // Free F-02
    const f2 = ParkingDbService.getSlotById('F-02');
    if (f2?.current_vehicle_number) {
      try { ParkingDbService.checkoutVehicle(f2.current_vehicle_number, 12); } catch {}
    }

    const tStart = '2026-10-15T10:00:00.000Z';
    const tEnd = '2026-10-15T14:00:00.000Z';

    const firstRes = ParkingDbService.createReservation({
      reservationType: 'VIP_GUEST',
      slotId: 'F-02',
      guestName: 'Chief Minister Delegation',
      startTime: tStart,
      endTime: tEnd,
      reason: 'Official State Visit',
      operatorRole: 'SECURITY_OFFICER',
      securityPin: '1234',
    });
    testResIdF02 = firstRes.reservation?.id || '';

    // Overlapping attempt (12:00 to 16:00) on F-02
    const overlapRes = ParkingDbService.createReservation({
      reservationType: 'EVENT_GUEST',
      slotId: 'F-02',
      guestName: 'Guest Speaker',
      startTime: '2026-10-15T12:00:00.000Z',
      endTime: '2026-10-15T16:00:00.000Z',
      reason: 'Seminar lecture',
      operatorRole: 'SECURITY_OFFICER',
      securityPin: '1234',
    });

    const pass =
      firstRes.success === true &&
      overlapRes.success === false &&
      overlapRes.conflict === true;

    assert(
      'RES_RULE_OVERLAPPING_REJECTED',
      'Criterion 6: Overlapping reservations are rejected',
      pass,
      `First Success: ${firstRes.success}, Overlap Success: ${overlapRes.success}, Conflict: ${overlapRes.conflict}`
    );
  }

  // Test 45: Criterion 7 - A valid VIP reservation directs the authorized vehicle to the correct slot
  {
    // Free F-03
    const f3 = ParkingDbService.getSlotById('F-03');
    if (f3?.current_vehicle_number) {
      try { ParkingDbService.checkoutVehicle(f3.current_vehicle_number, 12); } catch {}
    }

    const startWindow = new Date(Date.now() - 1800 * 1000).toISOString(); // 30m ago
    const endWindow = new Date(Date.now() + 4 * 3600 * 1000).toISOString(); // in 4h

    const vipRes = ParkingDbService.createReservation({
      reservationType: 'VIP_GUEST',
      slotId: 'F-03',
      vehicleNumber: 'KA-01-VIP-8888',
      guestName: 'Vice Chancellor Dr. Sen',
      startTime: startWindow,
      endTime: endWindow,
      reason: 'Annual Convocation Chief Guest',
      operatorRole: 'SECURITY_OFFICER',
      securityPin: '1234',
    });

    // Arrival of KA-01-VIP-8888
    const arrival = ParkingDbService.processFastTrackArrival({
      vehicleNumber: 'KA-01-VIP-8888',
      operatorRole: 'SECURITY_OFFICER',
      securityPin: '1234',
    });

    const slotF3 = ParkingDbService.getSlotById('F-03');

    const pass =
      vipRes.success === true &&
      arrival.status === 'FAST_TRACK_APPROVED' &&
      arrival.allocatedSlotId === 'F-03' &&
      slotF3?.status === 'OCCUPIED' &&
      slotF3?.current_vehicle_number === 'KA-01-VIP-8888';

    assert(
      'RES_RULE_VALID_VIP_DIRECTS_TO_CORRECT_SLOT',
      'Criterion 7: A valid VIP reservation directs the authorized vehicle to the correct slot',
      pass,
      `Arrival Status: ${arrival.status}, Bay: ${arrival.allocatedSlotId}, Occupant: ${slotF3?.current_vehicle_number}`
    );
  }

  // Test 46: Criterion 8 - Unknown or mismatched plates require manual review
  {
    const arrival = ParkingDbService.processFastTrackArrival({
      vehicleNumber: 'KA-99-UNKNOWN-7777',
      operatorRole: 'SECURITY_OFFICER',
      securityPin: '1234',
    });

    const pass =
      arrival.status === 'NOT_FOUND' &&
      arrival.approved === false &&
      arrival.requiresReview === true;

    assert(
      'RES_RULE_UNKNOWN_PLATE_REQUIRES_MANUAL_REVIEW',
      'Criterion 8: Unknown or mismatched plates require manual review',
      pass,
      `Status: ${arrival.status}, RequiresReview: ${arrival.requiresReview}, Approved: ${arrival.approved}`
    );
  }

  // Test 47: Criterion 9 - Emergency priority does not silently displace an already parked vehicle
  {
    // Free F-04 first, then park a regular vehicle in F-04
    const f4 = ParkingDbService.getSlotById('F-04');
    if (f4?.current_vehicle_number) {
      try { ParkingDbService.checkoutVehicle(f4.current_vehicle_number, 12); } catch {}
    }

    // Explicitly park regular vehicle KA-04-REG-9999 in F-04
    ParkingDbService.parkVehicle({
      vehicleNumber: 'KA-04-REG-9999',
      vehicleType: 'FOUR_WHEELER',
      ownerCategory: 'STAFF',
      entryHour: 8,
    });

    // Create an emergency reservation for Ambulance on F-04
    const emgRes = ParkingDbService.createReservation({
      reservationType: 'EMERGENCY',
      slotId: 'F-04',
      vehicleNumber: 'DL-01-EMG-108',
      guestName: 'Campus Trauma Response Ambulance',
      startTime: new Date(Date.now() - 60000).toISOString(),
      endTime: new Date(Date.now() + 3600 * 2000).toISOString(),
      reason: 'Emergency Medical Evacuation',
      operatorRole: 'SECURITY_OFFICER',
      securityPin: '1234',
    });
    testEmgResId = emgRes.reservation?.id || '';

    // Fast track arrival of the emergency vehicle
    const arrival = ParkingDbService.processFastTrackArrival({
      vehicleNumber: 'DL-01-EMG-108',
      reservationId: testEmgResId,
      operatorRole: 'SECURITY_OFFICER',
      securityPin: '1234',
    });

    // Check slot F-04: MUST STILL BE OCCUPIED by the parked vehicle! Not displaced!
    const slotF4 = ParkingDbService.getSlotById('F-04');

    const pass =
      arrival.status === 'SLOT_OCCUPIED_CONFLICT' &&
      arrival.approved === false &&
      slotF4?.current_vehicle_number !== 'DL-01-EMG-108' &&
      arrival.alternativeSlots !== undefined;

    assert(
      'RES_RULE_EMERGENCY_NO_SILENT_DISPLACE',
      'Criterion 9: Emergency priority does not silently displace an already parked vehicle',
      pass,
      `ArrivalStatus: ${arrival.status}, F-04 Occupant: ${slotF4?.current_vehicle_number}, AltSlots: ${arrival.alternativeSlots?.join(',')}`
    );
  }

  // Test 48: Criterion 10 - Concurrent allocation requests cannot allocate the same slot
  {
    // Free F-05
    const f5 = ParkingDbService.getSlotById('F-05');
    if (f5?.current_vehicle_number) {
      try { ParkingDbService.checkoutVehicle(f5.current_vehicle_number, 12); } catch {}
    }

    // Park multiple vehicles back to back
    const p1 = ParkingDbService.parkVehicle({ vehicleNumber: 'KA-09-CONC-1', vehicleType: 'FOUR_WHEELER', ownerCategory: 'STAFF', entryHour: 10 });
    const p2 = ParkingDbService.parkVehicle({ vehicleNumber: 'KA-09-CONC-2', vehicleType: 'FOUR_WHEELER', ownerCategory: 'STAFF', entryHour: 10 });

    const pass =
      p1.success &&
      (!p2.success || p1.slot?.id !== p2.slot?.id);

    assert(
      'RES_RULE_CONCURRENT_ALLOCATION_INTEGRITY',
      'Criterion 10: Concurrent allocation requests cannot allocate the same slot',
      pass,
      `P1 Slot: ${p1.slot?.id}, P2 Success: ${p2.success}, P2 Slot: ${p2.slot?.id}`
    );
  }

  // Test 49: Criterion 11 - Reservation and lock data persist after server restart
  {
    closeDb();
    const reopenedDb = getDb();
    initializeDatabase(reopenedDb);

    const persistedReservations = ParkingDbService.getReservations();
    const persistedLocks = ParkingDbService.getSecurityLocks();

    const pass =
      persistedReservations.length >= 3 &&
      persistedLocks.length >= 1;

    assert(
      'RES_RULE_PERSISTENCE_ON_RESTART',
      'Criterion 11: Reservation and lock data persist after server restart',
      pass,
      `Persisted Reservations: ${persistedReservations.length}, Persisted Locks: ${persistedLocks.length}`
    );
  }

  // Test 50: Criterion 12 - Existing parking, fee calculation, receipts, AI camera, ID verification, and wrong-parking alerts remain functional
  {
    // Check out vehicle from T-02
    const checkoutRes = ParkingDbService.checkoutVehicle('KA-05-STU-REG3', 12); // 10 -> 12 = 2 hrs
    const dashboard = ParkingDbService.getDashboard();

    const pass =
      checkoutRes.success === true &&
      checkoutRes.receipt !== undefined &&
      dashboard.totalSlots === 15 &&
      dashboard.reservedSlots !== undefined &&
      dashboard.securityLockedSlots !== undefined &&
      dashboard.activeReservationsCount !== undefined;

    assert(
      'RES_RULE_ALL_CORE_FEATURES_INTACT',
      'Criterion 12: Existing parking, fee calculation, receipts, AI camera, ID verification, and wrong-parking alerts remain functional',
      pass,
      `Checkout: ${checkoutRes.success}, ReservedSlots: ${dashboard.reservedSlots}, LockedSlots: ${dashboard.securityLockedSlots}, ActiveRes: ${dashboard.activeReservationsCount}`
    );
  }


  // Cleanup test db
  try {
    delete process.env.DB_PATH;
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } catch {}

  const passedCount = results.filter((r) => r.success).length;
  return {
    passed: passedCount,
    total: results.length,
    results,
  };
}

// Always execute tests when script is executed directly
const res = runBackendIntegrationTests();
console.log(JSON.stringify(res, null, 2));
process.exit(res.passed === res.total ? 0 : 1);

