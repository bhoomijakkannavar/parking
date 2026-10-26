import Database from 'better-sqlite3';
import { getDb } from '../db/database';
import {
  BackendFeeCalculator,
  VehicleType,
  OwnerCategory,
  FeeCalculationResult,
} from './FeeCalculator';
import { BackendValidationService } from './ValidationService';

export interface ParkingSlotRow {
  id: string;
  slot_number: number;
  type: VehicleType;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'SECURITY_LOCKED';
  current_vehicle_id: string | null;
  current_vehicle_number: string | null;
  current_owner_category: OwnerCategory | null;
  current_entry_hour: number | null;
  updated_at: string;
}

export interface ParkingReservationRow {
  id: string;
  reservation_type: 'VIP_GUEST' | 'EMERGENCY' | 'EVENT_GUEST';
  slot_id: string;
  vehicle_number: string | null;
  guest_name: string;
  start_time: string;
  end_time: string;
  reason: string;
  contact_department: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  created_by: string;
  created_by_role: string;
  created_at: string;
  updated_at: string;
  checked_in_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
}

export interface SlotSecurityLockRow {
  id: string;
  slot_id: string;
  lock_type: 'RESERVED' | 'SECURITY_LOCKED';
  reservation_id: string | null;
  locked_by: string;
  locked_by_role: string;
  reason: string;
  locked_at: string;
  is_active: number;
}

export interface ReservationAuditLogRow {
  id: string;
  reservation_id: string | null;
  slot_id: string;
  action: string;
  actor: string;
  actor_role: string;
  reason: string | null;
  details_json: string | null;
  created_at: string;
}

export interface ParkingSessionRow {
  id: string;
  vehicle_id: string;
  slot_id: string;
  vehicle_number: string;
  vehicle_type: VehicleType;
  owner_category: OwnerCategory;
  entry_hour: number;
  exit_hour: number | null;
  duration: number | null;
  fee: number | null;
  status: 'ACTIVE' | 'COMPLETED';
  entry_origin: 'MANUAL' | 'AI' | 'DEMO';
  receipt_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ReceiptRow {
  id: string;
  session_id: string;
  vehicle_number: string;
  vehicle_type: VehicleType;
  owner_category: OwnerCategory;
  slot_id: string;
  entry_hour: number;
  exit_hour: number;
  duration: number;
  fee: number;
  breakdown_json: string;
  created_at: string;
}

export interface VehicleRow {
  id: string;
  vehicle_number: string;
  vehicle_type: VehicleType;
  owner_category: OwnerCategory;
  status: 'PARKED' | 'EXITED';
  current_slot_id: string | null;
  current_entry_hour: number | null;
  created_at: string;
  updated_at: string;
}

export interface CameraEventRow {
  id: string;
  timestamp: string;
  plate_number: string;
  vehicle_type: VehicleType;
  owner_category: OwnerCategory | null;
  gate_type: 'ENTRY' | 'EXIT';
  confidence: number;
  mode: 'LIVE' | 'DEMO';
  action: string;
  action_summary: string;
  slot_id: string | null;
  fee: number | null;
  face_detected: number;
  member_id: string | null;
  member_name: string | null;
  role: string | null;
  id_card_number_masked?: string | null;
  id_verification_status?: string | null;
  id_verification_reason?: string | null;
  override_reason?: string | null;
  created_at: string;
}

export interface AlertRow {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  details: string | null;
  timestamp: string;
  status: 'UNREAD' | 'RESOLVED';
  vehicle_number: string | null;
  slot_id: string | null;
  created_at: string;
}

export type WrongParkingStatus =
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'FALSE_POSITIVE'
  | 'NEEDS_REVIEW';

export interface WrongParkingIncidentRow {
  id: string;
  vehicle_number: string;
  vehicle_number_masked: string;
  allocated_slot_id: string;
  detected_slot_id: string;
  camera_id: string;
  camera_zone: string;
  confidence: number;
  status: WrongParkingStatus;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  siren_triggered: number;
  siren_muted: number;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface WrongParkingDetectionInput {
  vehicleNumber: string;
  detectedSlotId: string;
  confidence?: number;
  cameraId?: string;
  cameraZone?: string;
  confidenceThreshold?: number;
  isDemo?: boolean;
}

export interface WrongParkingDetectionResult {
  status: 'CORRECTLY_PARKED' | 'VIOLATION_DETECTED' | 'NEEDS_REVIEW' | 'NO_ACTIVE_SESSION' | 'DUPLICATE_DEBOUNCED';
  isViolation: boolean;
  requiresReview: boolean;
  sirenTriggered: boolean;
  isDebounced: boolean;
  vehicleNumber: string;
  vehicleNumberMasked: string;
  allocatedSlotId?: string;
  detectedSlotId: string;
  confidence: number;
  confidenceThreshold: number;
  incident: WrongParkingIncidentRow | null;
  message: string;
}

export function maskVehiclePlate(plate: string): string {
  const clean = plate.trim().toUpperCase();
  const parts = clean.split('-');
  if (parts.length >= 4) {
    return `${parts[0]}-${parts[1]}-**-${parts[3]}`;
  }
  if (clean.length > 5) {
    return `${clean.slice(0, 3)}***${clean.slice(-3)}`;
  }
  return clean;
}

export function isAuthorizedStaff(role?: string): boolean {
  if (!role) return false;
  const clean = role.trim().toUpperCase();
  const authorized = [
    'STAFF',
    'FACULTY',
    'ADMINISTRATION',
    'AUTHORIZED PERSONNEL',
    'SECURITY',
    'GUARD',
    'SECURITY GUARD',
    'OFFICER',
    'CAMPUS SECURITY',
    'PARKSPHERE_ADMIN',
  ];
  return authorized.includes(clean) || clean.includes('GUARD') || clean.includes('SECURITY');
}

export function isSecurityOfficer(role?: string, pin?: string): boolean {
  if (pin && (pin === '1234' || pin === 'SEC-PASS-99' || pin === 'ADMIN-1234')) {
    return true;
  }
  if (!role) return false;
  const clean = role.trim().toUpperCase();
  const securityRoles = [
    'SECURITY',
    'SECURITY_OFFICER',
    'SECURITY OFFICER',
    'GUARD',
    'SECURITY GUARD',
    'OFFICER',
    'CAMPUS SECURITY',
    'ADMIN',
    'ADMINISTRATOR',
    'PARKSPHERE_ADMIN',
  ];
  return securityRoles.includes(clean) || clean.includes('GUARD') || clean.includes('SECURITY') || clean.includes('OFFICER');
}

export function isCampusOfficial(role?: string, pin?: string): boolean {
  if (isSecurityOfficer(role, pin)) return true;
  if (!role) return false;
  const clean = role.trim().toUpperCase();
  const officialRoles = [
    'CAMPUS_OFFICIAL',
    'CAMPUS OFFICIAL',
    'STAFF',
    'FACULTY',
    'ADMINISTRATION',
    'AUTHORIZED PERSONNEL',
    'AUTHORIZED_PERSONNEL',
  ];
  return officialRoles.includes(clean) || clean.includes('STAFF') || clean.includes('FACULTY') || clean.includes('OFFICIAL') || clean.includes('ADMIN');
}


export class ParkingDbService {
  private static get db(): Database.Database {
    return getDb();
  }

  // ---- SLOTS ----

  public static getSlots(): ParkingSlotRow[] {
    return this.db
      .prepare('SELECT * FROM parking_slots ORDER BY type DESC, slot_number ASC')
      .all() as ParkingSlotRow[];
  }

  public static getSlotById(id: string): ParkingSlotRow | undefined {
    return this.db
      .prepare('SELECT * FROM parking_slots WHERE id = ?')
      .get(id) as ParkingSlotRow | undefined;
  }

  // ---- VEHICLES ----

  public static getVehicles(status?: 'PARKED' | 'EXITED'): VehicleRow[] {
    if (status) {
      return this.db
        .prepare('SELECT * FROM vehicles WHERE status = ? ORDER BY updated_at DESC')
        .all(status) as VehicleRow[];
    }
    return this.db
      .prepare('SELECT * FROM vehicles ORDER BY updated_at DESC')
      .all() as VehicleRow[];
  }

  public static findVehicle(searchKey: string): VehicleRow | undefined {
    const norm = BackendValidationService.normalizeVehicleNumber(searchKey);
    const canon = BackendValidationService.canonicalAlphanumeric(searchKey);

    // Exact match or canonical match or current_slot_id match
    const exact = this.db
      .prepare('SELECT * FROM vehicles WHERE vehicle_number = ?')
      .get(norm) as VehicleRow | undefined;
    if (exact) return exact;

    const bySlot = this.db
      .prepare("SELECT * FROM vehicles WHERE current_slot_id = ? AND status = 'PARKED'")
      .get(norm) as VehicleRow | undefined;
    if (bySlot) return bySlot;

    // Check all vehicles canonical match
    const all = this.getVehicles();
    return all.find(
      (v) =>
        BackendValidationService.canonicalAlphanumeric(v.vehicle_number) === canon ||
        v.current_slot_id === norm
    );
  }

  // ---- SESSIONS ----

  public static getActiveSessions(): ParkingSessionRow[] {
    return this.db
      .prepare("SELECT * FROM parking_sessions WHERE status = 'ACTIVE' ORDER BY created_at DESC")
      .all() as ParkingSessionRow[];
  }

  public static getHistory(limit: number = 100): ParkingSessionRow[] {
    return this.db
      .prepare('SELECT * FROM parking_sessions ORDER BY created_at DESC LIMIT ?')
      .all(limit) as ParkingSessionRow[];
  }

  public static findActiveSession(searchKey: string): ParkingSessionRow | undefined {
    const norm = BackendValidationService.normalizeVehicleNumber(searchKey);
    const canon = BackendValidationService.canonicalAlphanumeric(searchKey);

    const direct = this.db
      .prepare(
        "SELECT * FROM parking_sessions WHERE (vehicle_number = ? OR slot_id = ?) AND status = 'ACTIVE'"
      )
      .get(norm, norm) as ParkingSessionRow | undefined;
    if (direct) return direct;

    const activeList = this.getActiveSessions();
    return activeList.find(
      (s) =>
        BackendValidationService.canonicalAlphanumeric(s.vehicle_number) === canon ||
        s.slot_id.toUpperCase() === norm
    );
  }

  // ---- ENTRY (TRANSACTIONAL) ----

  public static parkVehicle(input: {
    vehicleNumber: string;
    vehicleType: VehicleType;
    ownerCategory: OwnerCategory;
    entryHour: number;
    origin?: 'MANUAL' | 'AI' | 'DEMO';
  }): {
    success: boolean;
    message: string;
    slot?: ParkingSlotRow;
    session?: ParkingSessionRow;
    vehicle?: VehicleRow;
    error?: string;
  } {
    const normPlate = BackendValidationService.normalizeVehicleNumber(input.vehicleNumber);
    if (!normPlate) {
      return { success: false, message: 'Invalid vehicle number.', error: 'Invalid vehicle number.' };
    }

    if (!BackendValidationService.isValidHour(input.entryHour)) {
      return { success: false, message: 'Invalid entry hour.', error: 'Invalid entry hour.' };
    }

    // 1. Check duplicate active session
    const existingSession = this.db
      .prepare("SELECT * FROM parking_sessions WHERE vehicle_number = ? AND status = 'ACTIVE'")
      .get(normPlate) as ParkingSessionRow | undefined;

    if (existingSession) {
      const err = `Vehicle is already parked in slot ${existingSession.slot_id}.`;
      this.addAlert({
        type: 'DUPLICATE_ENTRY',
        severity: 'WARNING',
        message: `Duplicate entry attempt: Vehicle ${normPlate} is already parked.`,
        details: `Occupies bay ${existingSession.slot_id}. Entry rejected.`,
        vehicleNumber: normPlate,
        slotId: existingSession.slot_id,
      });
      return { success: false, message: err, error: err };
    }

    // 2. Find compatible slot
    const availableSlot = this.db
      .prepare(
        "SELECT * FROM parking_slots WHERE type = ? AND status = 'AVAILABLE' ORDER BY slot_number ASC LIMIT 1"
      )
      .get(input.vehicleType) as ParkingSlotRow | undefined;

    if (!availableSlot) {
      const typeLabel = input.vehicleType === 'TWO_WHEELER' ? 'Two-Wheeler' : 'Four-Wheeler';
      const err = `No available ${typeLabel} parking slots.`;
      this.addAlert({
        type: 'PARKING_FULL',
        severity: 'CRITICAL',
        message: `Zone capacity full: No ${typeLabel} slots available.`,
        details: `Rejected vehicle ${normPlate}.`,
        vehicleNumber: normPlate,
      });
      return { success: false, message: err, error: err };
    }

    // 3. Atomically allocate slot, record vehicle, create session in a transaction
    const now = new Date().toISOString();
    const vehicleId = `VEH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const sessionId = `SESS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const origin = input.origin || 'MANUAL';

    const executeParkTx = this.db.transaction(() => {
      // Upsert vehicle
      const existingVehicle = this.db
        .prepare('SELECT id FROM vehicles WHERE vehicle_number = ?')
        .get(normPlate) as { id: string } | undefined;

      const activeVehId = existingVehicle ? existingVehicle.id : vehicleId;

      this.db
        .prepare(`
          INSERT INTO vehicles (
            id, vehicle_number, vehicle_type, owner_category, status, current_slot_id, current_entry_hour, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'PARKED', ?, ?, ?, ?)
          ON CONFLICT(vehicle_number) DO UPDATE SET
            vehicle_type = excluded.vehicle_type,
            owner_category = excluded.owner_category,
            status = 'PARKED',
            current_slot_id = excluded.current_slot_id,
            current_entry_hour = excluded.current_entry_hour,
            updated_at = excluded.updated_at
        `)
        .run(
          activeVehId,
          normPlate,
          input.vehicleType,
          input.ownerCategory,
          availableSlot.id,
          input.entryHour,
          now,
          now
        );

      // Create session
      this.db
        .prepare(`
          INSERT INTO parking_sessions (
            id, vehicle_id, slot_id, vehicle_number, vehicle_type, owner_category, entry_hour, status, entry_origin, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
        `)
        .run(
          sessionId,
          activeVehId,
          availableSlot.id,
          normPlate,
          input.vehicleType,
          input.ownerCategory,
          input.entryHour,
          origin,
          now
        );

      // Update slot
      this.db
        .prepare(`
          UPDATE parking_slots SET
            status = 'OCCUPIED',
            current_vehicle_id = ?,
            current_vehicle_number = ?,
            current_owner_category = ?,
            current_entry_hour = ?,
            updated_at = ?
          WHERE id = ?
        `)
        .run(
          activeVehId,
          normPlate,
          input.ownerCategory,
          input.entryHour,
          now,
          availableSlot.id
        );

      return { activeVehId, sessionId };
    });

    try {
      const { activeVehId } = executeParkTx();

      const updatedSlot = this.getSlotById(availableSlot.id)!;
      const createdSession = this.db
        .prepare('SELECT * FROM parking_sessions WHERE id = ?')
        .get(sessionId) as ParkingSessionRow;
      const updatedVehicle = this.db
        .prepare('SELECT * FROM vehicles WHERE id = ?')
        .get(activeVehId) as VehicleRow;

      return {
        success: true,
        message: `Vehicle successfully parked at ${availableSlot.id}`,
        slot: updatedSlot,
        session: createdSession,
        vehicle: updatedVehicle,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('UNIQUE constraint failed') || errorMsg.includes('idx_active_session_vehicle')) {
        return {
          success: false,
          message: `Vehicle is already parked in slot ${availableSlot.id}.`,
          error: 'Duplicate active vehicle session detected.',
        };
      }
      return { success: false, message: errorMsg, error: errorMsg };
    }
  }

  // ---- EXIT (TRANSACTIONAL) ----

  public static checkoutVehicle(
    searchKey: string,
    exitHour: number
  ): {
    success: boolean;
    message: string;
    session?: ParkingSessionRow;
    receipt?: ReceiptRow;
    feeResult?: FeeCalculationResult;
    error?: string;
  } {
    const activeSession = this.findActiveSession(searchKey);
    if (!activeSession) {
      return {
        success: false,
        message: 'Vehicle not currently parked.',
        error: 'Vehicle not currently parked.',
      };
    }

    const validation = BackendValidationService.validateExitHour(exitHour, activeSession.entry_hour);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.error || 'Invalid exit hour.',
        error: validation.error,
      };
    }

    const feeResult = BackendFeeCalculator.calculateFee(
      activeSession.vehicle_type,
      activeSession.owner_category,
      activeSession.entry_hour,
      exitHour
    );

    const now = new Date().toISOString();
    const receiptId = `CPVTS-REC-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const executeCheckoutTx = this.db.transaction(() => {
      // 1. Update session to COMPLETED
      this.db
        .prepare(`
          UPDATE parking_sessions SET
            exit_hour = ?,
            duration = ?,
            fee = ?,
            status = 'COMPLETED',
            receipt_id = ?,
            completed_at = ?
          WHERE id = ?
        `)
        .run(
          exitHour,
          feeResult.duration,
          feeResult.totalFee,
          receiptId,
          now,
          activeSession.id
        );

      // 2. Insert receipt
      this.db
        .prepare(`
          INSERT INTO receipts (
            id, session_id, vehicle_number, vehicle_type, owner_category, slot_id,
            entry_hour, exit_hour, duration, fee, breakdown_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          receiptId,
          activeSession.id,
          activeSession.vehicle_number,
          activeSession.vehicle_type,
          activeSession.owner_category,
          activeSession.slot_id,
          activeSession.entry_hour,
          exitHour,
          feeResult.duration,
          feeResult.totalFee,
          JSON.stringify(feeResult.breakdown),
          now
        );

      // 3. Free the assigned slot (wipe occupant data, preserving active lock if present)
      const activeLock = this.db
        .prepare("SELECT * FROM slot_security_locks WHERE slot_id = ? AND is_active = 1")
        .get(activeSession.slot_id) as SlotSecurityLockRow | undefined;
      const targetSlotStatus = activeLock ? activeLock.lock_type : 'AVAILABLE';

      this.db
        .prepare(`
          UPDATE parking_slots SET
            status = ?,
            current_vehicle_id = NULL,
            current_vehicle_number = NULL,
            current_owner_category = NULL,
            current_entry_hour = NULL,
            updated_at = ?
          WHERE id = ?
        `)
        .run(targetSlotStatus, now, activeSession.slot_id);

      // 4. Update vehicle status to EXITED
      this.db
        .prepare(`
          UPDATE vehicles SET
            status = 'EXITED',
            current_slot_id = NULL,
            current_entry_hour = NULL,
            updated_at = ?
          WHERE vehicle_number = ?
        `)
        .run(now, activeSession.vehicle_number);

      return receiptId;
    });

    try {
      const generatedReceiptId = executeCheckoutTx();

      const completedSession = this.db
        .prepare('SELECT * FROM parking_sessions WHERE id = ?')
        .get(activeSession.id) as ParkingSessionRow;

      const receipt = this.db
        .prepare('SELECT * FROM receipts WHERE id = ?')
        .get(generatedReceiptId) as ReceiptRow;

      return {
        success: true,
        message: `Checkout complete for ${activeSession.vehicle_number}. Slot ${activeSession.slot_id} is now AVAILABLE.`,
        session: completedSession,
        receipt,
        feeResult,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg, error: msg };
    }
  }

  // ---- RECEIPTS ----

  public static getReceipts(limit: number = 100): ReceiptRow[] {
    return this.db
      .prepare('SELECT * FROM receipts ORDER BY created_at DESC LIMIT ?')
      .all(limit) as ReceiptRow[];
  }

  public static getReceiptById(id: string): ReceiptRow | undefined {
    return this.db
      .prepare('SELECT * FROM receipts WHERE id = ?')
      .get(id) as ReceiptRow | undefined;
  }

  // ---- MEMBERS ----

  public static getMembers(): Array<{
    id: string;
    name: string;
    role: string;
    department: string;
    status: string;
    passId?: string;
    registeredVehicles: Array<{ vehicleNumber: string; vehicleType: VehicleType; primary?: boolean }>;
    createdAt: string;
  }> {
    const rows = this.db
      .prepare('SELECT * FROM college_members ORDER BY created_at DESC')
      .all() as Array<{
      id: string;
      name: string;
      role: string;
      department: string;
      status: string;
      pass_id: string | null;
      registered_vehicles_json: string;
      created_at: string;
    }>;

    return rows.map((r) => {
      let registeredVehicles = [];
      try {
        registeredVehicles = JSON.parse(r.registered_vehicles_json);
      } catch {
        registeredVehicles = [];
      }
      return {
        id: r.id,
        name: r.name,
        role: r.role,
        department: r.department,
        status: r.status,
        passId: r.pass_id || undefined,
        registeredVehicles,
        createdAt: r.created_at,
      };
    });
  }

  public static addMember(member: {
    id: string;
    name: string;
    role: string;
    department: string;
    status?: string;
    passId?: string;
    registeredVehicles: Array<{ vehicleNumber: string; vehicleType: VehicleType; primary?: boolean }>;
    createdAt?: string;
  }): void {
    const now = member.createdAt || new Date().toISOString();
    this.db
      .prepare(`
        INSERT INTO college_members (
          id, name, role, department, status, pass_id, registered_vehicles_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          role = excluded.role,
          department = excluded.department,
          status = excluded.status,
          pass_id = excluded.pass_id,
          registered_vehicles_json = excluded.registered_vehicles_json
      `)
      .run(
        member.id,
        member.name,
        member.role,
        member.department,
        member.status || 'ACTIVE',
        member.passId || null,
        JSON.stringify(member.registeredVehicles || []),
        now
      );
  }

  // ---- CAMERA EVENTS ----

  public static getCameraEvents(limit: number = 50): CameraEventRow[] {
    return this.db
      .prepare('SELECT * FROM camera_events ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as CameraEventRow[];
  }

  public static addCameraEvent(event: {
    id?: string;
    timestamp?: string;
    plateNumber: string;
    vehicleType: VehicleType;
    ownerCategory?: OwnerCategory;
    gateType: 'ENTRY' | 'EXIT';
    confidence: number;
    mode?: 'LIVE' | 'DEMO';
    action: string;
    actionSummary: string;
    slotId?: string;
    fee?: number;
    faceDetected?: boolean;
    memberId?: string;
    memberName?: string;
    role?: string;
    idCardNumberMasked?: string;
    idVerificationStatus?: string;
    idVerificationReason?: string;
    overrideReason?: string;
  }): CameraEventRow {
    const id = event.id || `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = event.timestamp || new Date().toISOString();
    const mode = event.mode || 'DEMO';
    const face = event.faceDetected !== false ? 1 : 0;

    this.db
      .prepare(`
        INSERT INTO camera_events (
          id, timestamp, plate_number, vehicle_type, owner_category, gate_type,
          confidence, mode, action, action_summary, slot_id, fee, face_detected,
          member_id, member_name, role, id_card_number_masked, id_verification_status,
          id_verification_reason, override_reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        now,
        event.plateNumber,
        event.vehicleType,
        event.ownerCategory || null,
        event.gateType,
        event.confidence,
        mode,
        event.action,
        event.actionSummary,
        event.slotId || null,
        event.fee !== undefined ? event.fee : null,
        face,
        event.memberId || null,
        event.memberName || null,
        event.role || null,
        event.idCardNumberMasked || null,
        event.idVerificationStatus || null,
        event.idVerificationReason || null,
        event.overrideReason || null,
        now
      );

    return this.db
      .prepare('SELECT * FROM camera_events WHERE id = ?')
      .get(id) as CameraEventRow;
  }

  // ---- COLLEGE ID CARD VERIFICATION ----

  public static verifyCollegeId(
    inputOrId?:
      | {
          idCardNumber?: string;
          plateNumber?: string;
          confidence?: number;
          isManualOverride?: boolean;
          overrideReason?: string;
        }
      | string,
    plateParam?: string,
    confParam?: number
  ): {
    success: boolean;
    verified: boolean;
    status: 'VERIFIED' | 'NEEDS_REVIEW' | 'FAILED' | 'VISITOR_BYPASS' | 'OVERRIDDEN';
    verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'FAILED' | 'VISITOR_BYPASS' | 'OVERRIDDEN';
    member: {
      id: string;
      maskedId: string;
      name: string;
      role: string;
      department: string;
      status: string;
      registeredVehicles: Array<{ vehicleNumber: string; vehicleType: VehicleType }>;
    } | null;
    plateMatched: boolean;
    canAutoApprove: boolean;
    tariffCategory: 'STAFF' | 'STUDENT' | 'VISITOR';
    maskedIdCardNumber?: string;
    confidence: number;
    message: string;
    reasons: string[];
  } {
    let idCardNumber = '';
    let plateNumber = '';
    let confidence = 95;
    let isManualOverride = false;
    let overrideReason = '';

    if (typeof inputOrId === 'string' || inputOrId === undefined) {
      idCardNumber = inputOrId || '';
      plateNumber = plateParam || '';
      confidence = confParam !== undefined ? confParam : 95;
    } else if (inputOrId && typeof inputOrId === 'object') {
      idCardNumber = inputOrId.idCardNumber || '';
      plateNumber = inputOrId.plateNumber || '';
      confidence = inputOrId.confidence !== undefined ? inputOrId.confidence : 95;
      isManualOverride = Boolean(inputOrId.isManualOverride);
      overrideReason = inputOrId.overrideReason || '';
    }

    const rawId = (idCardNumber || '').trim().toUpperCase();
    const conf = confidence !== undefined ? confidence : 95;
    const reasons: string[] = [];

    // Check Visitor bypass (no college ID card presented)
    if (!rawId || rawId === 'VISITOR' || rawId === 'NONE') {
      return {
        success: true,
        verified: false,
        status: 'VISITOR_BYPASS',
        verificationStatus: 'VISITOR_BYPASS',
        member: null,
        plateMatched: false,
        canAutoApprove: true,
        tariffCategory: 'VISITOR',
        confidence: conf,
        message: 'No institutional ID card detected. Proceeding under Visitor workflow.',
        reasons: ['Visitor workflow active (standard visitor tariffs apply)'],
      };
    }

    const maskedId = BackendValidationService.maskMemberId(rawId);

    // Look up member in institutional database
    const memberRow = this.db
      .prepare('SELECT * FROM college_members WHERE UPPER(id) = ?')
      .get(rawId) as
      | {
          id: string;
          name: string;
          role: string;
          department: string;
          status: string;
          pass_id: string | null;
          registered_vehicles_json: string;
          created_at: string;
        }
      | undefined;

    if (!memberRow) {
      return {
        success: false,
        verified: false,
        status: 'FAILED',
        verificationStatus: 'FAILED',
        member: null,
        plateMatched: false,
        canAutoApprove: false,
        tariffCategory: 'VISITOR',
        confidence: conf,
        maskedIdCardNumber: maskedId,
        message: `College ID ${maskedId} not found in institutional directory.`,
        reasons: [`ID "${maskedId}" is unregistered or invalid (not found in college directory)`],
      };
    }

    // Parse registered vehicles
    let registeredVehicles: Array<{ vehicleNumber: string; vehicleType: VehicleType }> = [];
    try {
      registeredVehicles = JSON.parse(memberRow.registered_vehicles_json || '[]');
    } catch {
      registeredVehicles = [];
    }

    const memberData = {
      id: memberRow.id,
      maskedId,
      name: memberRow.name,
      role: memberRow.role,
      department: memberRow.department,
      status: memberRow.status,
      registeredVehicles,
    };

    const isStaff = memberRow.role === 'Faculty' || memberRow.role === 'Staff' || memberRow.role === 'Administration';
    const tariffCategory: 'STAFF' | 'STUDENT' | 'VISITOR' = isStaff ? 'STAFF' : 'STUDENT';

    // 1. Account status verification
    if (memberRow.status !== 'ACTIVE') {
      return {
        success: false,
        verified: false,
        status: 'FAILED',
        verificationStatus: 'FAILED',
        member: memberData,
        plateMatched: false,
        canAutoApprove: false,
        tariffCategory,
        confidence: conf,
        maskedIdCardNumber: maskedId,
        message: `Member account for ${maskedId} is ${memberRow.status}. Campus entry privilege revoked.`,
        reasons: [`Member account status is ${memberRow.status} (entry revoked)`],
      };
    }

    // 2. OCR confidence verification (< 80% requires manual guard review)
    let lowConfidence = false;
    if (conf < 80) {
      lowConfidence = true;
      reasons.push(`Low ID card OCR confidence (${conf}% is below 80% threshold). Guard review mandatory.`);
    }

    // 3. Plate matching verification
    let plateMatched = false;
    if (plateNumber) {
      const normPlate = BackendValidationService.normalizeVehicleNumber(plateNumber);
      const canonPlate = BackendValidationService.canonicalAlphanumeric(plateNumber);

      plateMatched = registeredVehicles.some((rv) => {
        const rvNorm = BackendValidationService.normalizeVehicleNumber(rv.vehicleNumber);
        const rvCanon = BackendValidationService.canonicalAlphanumeric(rv.vehicleNumber);
        return rvNorm === normPlate || (rvCanon.length >= 4 && rvCanon === canonPlate);
      });

      if (!plateMatched) {
        reasons.push(
          `Detected plate ${normPlate} is not registered for member ${maskedId}.`
        );
      }
    } else {
      reasons.push('No vehicle plate scanned for correlation.');
    }

    // 4. Decision determination
    // If active override authorized by guard with reason
    if (isManualOverride && overrideReason && overrideReason.trim().length >= 3) {
      return {
        success: true,
        verified: true,
        status: 'OVERRIDDEN',
        verificationStatus: 'OVERRIDDEN',
        member: memberData,
        plateMatched,
        canAutoApprove: true,
        tariffCategory,
        confidence: conf,
        maskedIdCardNumber: maskedId,
        message: `Manual verification authorized: "${overrideReason.trim()}". Access granted.`,
        reasons: [...reasons, `Manual override authorized: ${overrideReason.trim()}`],
      };
    }

    // Fully verified
    if (!lowConfidence && plateMatched) {
      return {
        success: true,
        verified: true,
        status: 'VERIFIED',
        verificationStatus: 'VERIFIED',
        member: memberData,
        plateMatched: true,
        canAutoApprove: true,
        tariffCategory,
        confidence: conf,
        maskedIdCardNumber: maskedId,
        message: `ID Card ${maskedId} (${memberRow.name}) verified with matching plate.`,
        reasons: ['ID active in directory', 'Plate matches registered vehicle', `OCR confidence ${conf}%`],
      };
    }

    // Requires review
    return {
      success: true,
      verified: false,
      status: 'NEEDS_REVIEW',
      verificationStatus: 'NEEDS_REVIEW',
      member: memberData,
      plateMatched,
      canAutoApprove: false,
      tariffCategory,
      confidence: conf,
      maskedIdCardNumber: maskedId,
      message: 'ID Card requires physical guard inspection before granting member privileges.',
      reasons,
    };
  }

  // ---- ALERTS ----

  public static getAlerts(limit: number = 50): AlertRow[] {
    return this.db
      .prepare('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as AlertRow[];
  }

  public static addAlert(alert: {
    id?: string;
    type: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    details?: string;
    timestamp?: string;
    vehicleNumber?: string;
    slotId?: string;
  }): AlertRow {
    const id = alert.id || `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = alert.timestamp || new Date().toISOString();

    this.db
      .prepare(`
        INSERT INTO alerts (
          id, type, severity, message, details, timestamp, status, vehicle_number, slot_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'UNREAD', ?, ?, ?)
      `)
      .run(
        id,
        alert.type,
        alert.severity,
        alert.message,
        alert.details || null,
        now,
        alert.vehicleNumber || null,
        alert.slotId || null,
        now
      );

    return this.db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as AlertRow;
  }

  public static resolveAlert(id: string): boolean {
    const res = this.db
      .prepare("UPDATE alerts SET status = 'RESOLVED' WHERE id = ?")
      .run(id);
    return res.changes > 0;
  }

  // ---- DASHBOARD AGGREGATED METRICS ----

  public static getDashboard(): {
    totalVehiclesParkedToday: number;
    totalCompletedCheckouts: number;
    totalFeesCollected: number;
    currentlyParked: number;
    availableSlots: number;
    occupiedSlots: number;
    reservedSlots: number;
    securityLockedSlots: number;
    activeReservationsCount: number;
    upcomingReservationsCount: number;
    totalSlots: number;
    registeredVehiclesCount: number;
    activeAlertsCount: number;
    activeWrongParkingCount: number;
    lastCameraDetection: CameraEventRow | null;
    twoWheelerStats: {
      total: number;
      occupied: number;
      available: number;
      occupancyRate: number;
    };
    fourWheelerStats: {
      total: number;
      occupied: number;
      available: number;
      occupancyRate: number;
    };
    categoryCounts: {
      staff: number;
      student: number;
      visitor: number;
    };
  } {
    const slots = this.getSlots();
    const totalSlots = slots.length;
    const occupiedSlots = slots.filter((s) => s.status === 'OCCUPIED').length;
    const availableSlots = slots.filter((s) => s.status === 'AVAILABLE').length;

    const twoWheelers = slots.filter((s) => s.type === 'TWO_WHEELER');
    const twoWheelersOcc = twoWheelers.filter((s) => s.status === 'OCCUPIED').length;
    const twoWheelersAvail = twoWheelers.filter((s) => s.status === 'AVAILABLE').length;
    const twoWheelersRate = twoWheelers.length ? Math.round((twoWheelersOcc / twoWheelers.length) * 100) : 0;

    const fourWheelers = slots.filter((s) => s.type === 'FOUR_WHEELER');
    const fourWheelersOcc = fourWheelers.filter((s) => s.status === 'OCCUPIED').length;
    const fourWheelersAvail = fourWheelers.filter((s) => s.status === 'AVAILABLE').length;
    const fourWheelersRate = fourWheelers.length ? Math.round((fourWheelersOcc / fourWheelers.length) * 100) : 0;

    const activeSessions = this.getActiveSessions();
    const staffCount = activeSessions.filter((s) => s.owner_category === 'STAFF').length;
    const studentCount = activeSessions.filter((s) => s.owner_category === 'STUDENT').length;
    const visitorCount = activeSessions.filter((s) => s.owner_category === 'VISITOR').length;

    const revenueRow = this.db
      .prepare('SELECT COALESCE(SUM(fee), 0) as totalRevenue, COUNT(*) as checkouts FROM receipts')
      .get() as { totalRevenue: number; checkouts: number };

    const totalParkedRow = this.db
      .prepare('SELECT COUNT(*) as totalParked FROM parking_sessions')
      .get() as { totalParked: number };

    const alertsRow = this.db
      .prepare("SELECT COUNT(*) as unreadCount FROM alerts WHERE status = 'UNREAD'")
      .get() as { unreadCount: number };

    let activeWrongParkingCount = 0;
    try {
      const wpRow = this.db
        .prepare("SELECT COUNT(*) as wpCount FROM wrong_parking_incidents WHERE status IN ('ACTIVE', 'NEEDS_REVIEW')")
        .get() as { wpCount: number } | undefined;
      activeWrongParkingCount = wpRow ? wpRow.wpCount : 0;
    } catch {
      activeWrongParkingCount = 0;
    }

    let activeReservationsCount = 0;
    let upcomingReservationsCount = 0;
    try {
      const resRow = this.db
        .prepare("SELECT COUNT(*) as count FROM parking_reservations WHERE status IN ('ACTIVE', 'CHECKED_IN')")
        .get() as { count: number } | undefined;
      activeReservationsCount = resRow ? resRow.count : 0;

      const upRow = this.db
        .prepare("SELECT COUNT(*) as count FROM parking_reservations WHERE status = 'ACTIVE' AND datetime(start_time) > datetime('now')")
        .get() as { count: number } | undefined;
      upcomingReservationsCount = upRow ? upRow.count : 0;
    } catch {
      activeReservationsCount = 0;
      upcomingReservationsCount = 0;
    }

    const reservedSlots = slots.filter((s) => s.status === 'RESERVED').length;
    const securityLockedSlots = slots.filter((s) => s.status === 'SECURITY_LOCKED').length;

    const membersCount = this.getMembers().length;

    const lastEvent = this.db
      .prepare('SELECT * FROM camera_events ORDER BY timestamp DESC LIMIT 1')
      .get() as CameraEventRow | undefined;

    return {
      totalVehiclesParkedToday: totalParkedRow.totalParked,
      totalCompletedCheckouts: revenueRow.checkouts,
      totalFeesCollected: revenueRow.totalRevenue,
      currentlyParked: occupiedSlots,
      availableSlots,
      occupiedSlots,
      reservedSlots,
      securityLockedSlots,
      activeReservationsCount,
      upcomingReservationsCount,
      totalSlots,
      registeredVehiclesCount: membersCount,
      activeAlertsCount: alertsRow.unreadCount,
      activeWrongParkingCount,
      lastCameraDetection: lastEvent || null,
      twoWheelerStats: {
        total: twoWheelers.length,
        occupied: twoWheelersOcc,
        available: twoWheelersAvail,
        occupancyRate: twoWheelersRate,
      },
      fourWheelerStats: {
        total: fourWheelers.length,
        occupied: fourWheelersOcc,
        available: fourWheelersAvail,
        occupancyRate: fourWheelersRate,
      },
      categoryCounts: {
        staff: staffCount,
        student: studentCount,
        visitor: visitorCount,
      },
    };
  }

  // ---- WRONG PARKING DETECTION & SURVEILLANCE INCIDENTS ----

  public static detectWrongParking(input: WrongParkingDetectionInput): WrongParkingDetectionResult {
    const rawPlate = input.vehicleNumber || '';
    const norm = BackendValidationService.normalizeVehicleNumber(rawPlate);
    const masked = maskVehiclePlate(norm);
    const detectedSlotId = (input.detectedSlotId || '').trim().toUpperCase();
    const conf = input.confidence !== undefined ? Number(input.confidence) : 95;
    const threshold = input.confidenceThreshold !== undefined ? Number(input.confidenceThreshold) : 80;
    const cameraId = input.cameraId || 'CAM-SURV-01';
    const cameraZone = input.cameraZone || (detectedSlotId.startsWith('T') ? 'Zone T Surveillance' : 'Zone F Surveillance');
    const isDemo = input.isDemo !== undefined ? (input.isDemo ? 1 : 0) : 0;
    const now = new Date().toISOString();

    // 1. Check active session
    const activeSession = this.findActiveSession(norm);
    if (!activeSession) {
      return {
        status: 'NO_ACTIVE_SESSION',
        isViolation: false,
        requiresReview: false,
        sirenTriggered: false,
        isDebounced: false,
        vehicleNumber: norm,
        vehicleNumberMasked: masked,
        detectedSlotId,
        confidence: conf,
        confidenceThreshold: threshold,
        incident: null,
        message: `No active parking session found for vehicle ${norm}. Vehicle might not be checked in at campus entry gate.`,
      };
    }

    const allocatedSlotId = activeSession.slot_id.trim().toUpperCase();

    // 2. Check if correctly parked (detected == allocated)
    if (detectedSlotId === allocatedSlotId) {
      return {
        status: 'CORRECTLY_PARKED',
        isViolation: false,
        requiresReview: false,
        sirenTriggered: false,
        isDebounced: false,
        vehicleNumber: norm,
        vehicleNumberMasked: masked,
        allocatedSlotId,
        detectedSlotId,
        confidence: conf,
        confidenceThreshold: threshold,
        incident: null,
        message: `Vehicle ${norm} is correctly parked in allocated bay ${allocatedSlotId}.`,
      };
    }

    // 3. Different slot detected! Check confidence threshold
    if (conf < threshold) {
      // Mark as NEEDS_REVIEW instead of declaring a violation or sounding siren
      const reviewIncidentId = `WPI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      this.db
        .prepare(`
          INSERT INTO wrong_parking_incidents (
            id, vehicle_number, vehicle_number_masked, allocated_slot_id, detected_slot_id,
            camera_id, camera_zone, confidence, status, severity, siren_triggered, siren_muted,
            is_demo, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NEEDS_REVIEW', 'INFO', 0, 0, ?, ?, ?)
        `)
        .run(
          reviewIncidentId,
          norm,
          masked,
          allocatedSlotId,
          detectedSlotId,
          cameraId,
          cameraZone,
          conf,
          isDemo,
          now,
          now
        );

      const reviewIncident = this.db
        .prepare('SELECT * FROM wrong_parking_incidents WHERE id = ?')
        .get(reviewIncidentId) as WrongParkingIncidentRow;

      return {
        status: 'NEEDS_REVIEW',
        isViolation: false,
        requiresReview: true,
        sirenTriggered: false,
        isDebounced: false,
        vehicleNumber: norm,
        vehicleNumberMasked: masked,
        allocatedSlotId,
        detectedSlotId,
        confidence: conf,
        confidenceThreshold: threshold,
        incident: reviewIncident,
        message: `Low optical confidence (${conf}% is below ${threshold}% threshold). Flagged as NEEDS REVIEW for guard visual check. No violation declared.`,
      };
    }

    // 4. High confidence wrong slot: Check for existing active/acknowledged incident (Debounce repeated frames)
    const existing = this.db
      .prepare(`
        SELECT * FROM wrong_parking_incidents
        WHERE vehicle_number = ? AND detected_slot_id = ? AND status IN ('ACTIVE', 'ACKNOWLEDGED')
        ORDER BY created_at DESC LIMIT 1
      `)
      .get(norm, detectedSlotId) as WrongParkingIncidentRow | undefined;

    if (existing) {
      // Existing ongoing incident: Debounce repeated detection frames, do not sound siren again
      return {
        status: 'DUPLICATE_DEBOUNCED',
        isViolation: true,
        requiresReview: false,
        sirenTriggered: false,
        isDebounced: true,
        vehicleNumber: norm,
        vehicleNumberMasked: masked,
        allocatedSlotId,
        detectedSlotId,
        confidence: conf,
        confidenceThreshold: threshold,
        incident: existing,
        message: `Ongoing wrong parking incident already active for ${norm} in ${detectedSlotId}. Repeated frame debounced.`,
      };
    }

    // 5. Create new high-confidence wrong parking incident
    const incidentId = `WPI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.db
      .prepare(`
        INSERT INTO wrong_parking_incidents (
          id, vehicle_number, vehicle_number_masked, allocated_slot_id, detected_slot_id,
          camera_id, camera_zone, confidence, status, severity, siren_triggered, siren_muted,
          is_demo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'WARNING', 1, 0, ?, ?, ?)
      `)
      .run(
        incidentId,
        norm,
        masked,
        allocatedSlotId,
        detectedSlotId,
        cameraId,
        cameraZone,
        conf,
        isDemo,
        now,
        now
      );

    // Also record into alerts table
    this.addAlert({
      type: 'WRONG_PARKING',
      severity: 'WARNING',
      message: `Wrong Parking Detected: Vehicle ${masked} detected in ${detectedSlotId} instead of allocated bay ${allocatedSlotId}.`,
      details: `Surveillance Camera: ${cameraId} (${cameraZone}, ${conf}% confidence). Incident ID: ${incidentId}.`,
      vehicleNumber: norm,
      slotId: detectedSlotId,
      timestamp: now,
    });

    const newIncident = this.db
      .prepare('SELECT * FROM wrong_parking_incidents WHERE id = ?')
      .get(incidentId) as WrongParkingIncidentRow;

    return {
      status: 'VIOLATION_DETECTED',
      isViolation: true,
      requiresReview: false,
      sirenTriggered: true,
      isDebounced: false,
      vehicleNumber: norm,
      vehicleNumberMasked: masked,
      allocatedSlotId,
      detectedSlotId,
      confidence: conf,
      confidenceThreshold: threshold,
      incident: newIncident,
      message: `Confirmed wrong parking violation: Vehicle ${masked} parked in ${detectedSlotId} (allocated: ${allocatedSlotId}). Facility siren alert triggered.`,
    };
  }

  public static acknowledgeWrongParkingIncident(
    id: string,
    operator: { operatorRole?: string; operatorId?: string; notes?: string }
  ): { success: boolean; unauthorized?: boolean; message: string; incident?: WrongParkingIncidentRow } {
    if (!isAuthorizedStaff(operator.operatorRole)) {
      return {
        success: false,
        unauthorized: true,
        message: 'Unauthorized: Only authorized campus staff or security personnel can acknowledge wrong parking incidents.',
      };
    }

    const incident = this.db
      .prepare('SELECT * FROM wrong_parking_incidents WHERE id = ?')
      .get(id) as WrongParkingIncidentRow | undefined;

    if (!incident) {
      return { success: false, message: 'Incident not found.' };
    }

    const now = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE wrong_parking_incidents
        SET status = 'ACKNOWLEDGED',
            acknowledged_by = ?,
            acknowledged_at = ?,
            resolution_notes = COALESCE(?, resolution_notes),
            updated_at = ?
        WHERE id = ?
      `)
      .run(operator.operatorId || operator.operatorRole, now, operator.notes || null, now, id);

    const updated = this.db
      .prepare('SELECT * FROM wrong_parking_incidents WHERE id = ?')
      .get(id) as WrongParkingIncidentRow;

    return {
      success: true,
      message: `Incident ${id} acknowledged by ${operator.operatorId || operator.operatorRole}.`,
      incident: updated,
    };
  }

  public static resolveWrongParkingIncident(
    id: string,
    operator: { operatorRole?: string; operatorId?: string; notes?: string; isFalsePositive?: boolean }
  ): { success: boolean; unauthorized?: boolean; message: string; incident?: WrongParkingIncidentRow } {
    if (!isAuthorizedStaff(operator.operatorRole)) {
      return {
        success: false,
        unauthorized: true,
        message: 'Unauthorized: Only authorized campus staff or security personnel can resolve wrong parking incidents.',
      };
    }

    const incident = this.db
      .prepare('SELECT * FROM wrong_parking_incidents WHERE id = ?')
      .get(id) as WrongParkingIncidentRow | undefined;

    if (!incident) {
      return { success: false, message: 'Incident not found.' };
    }

    const targetStatus = operator.isFalsePositive ? 'FALSE_POSITIVE' : 'RESOLVED';
    const now = new Date().toISOString();

    this.db
      .prepare(`
        UPDATE wrong_parking_incidents
        SET status = ?,
            resolved_by = ?,
            resolved_at = ?,
            resolution_notes = ?,
            siren_muted = 1,
            updated_at = ?
        WHERE id = ?
      `)
      .run(
        targetStatus,
        operator.operatorId || operator.operatorRole,
        now,
        operator.notes || (operator.isFalsePositive ? 'Marked as false positive by staff' : 'Resolved by staff'),
        now,
        id
      );

    // Also resolve matching alert in alerts table
    this.db
      .prepare(`
        UPDATE alerts
        SET status = 'RESOLVED'
        WHERE vehicle_number = ? AND slot_id = ? AND status = 'UNREAD'
      `)
      .run(incident.vehicle_number, incident.detected_slot_id);

    const updated = this.db
      .prepare('SELECT * FROM wrong_parking_incidents WHERE id = ?')
      .get(id) as WrongParkingIncidentRow;

    return {
      success: true,
      message: `Incident ${id} marked as ${targetStatus} by ${operator.operatorId || operator.operatorRole}.`,
      incident: updated,
    };
  }

  public static muteIncidentAlarm(
    id: string,
    operator?: { operatorRole?: string; operatorId?: string; reason?: string }
  ): { success: boolean; message: string; incident?: WrongParkingIncidentRow } {
    const incident = this.db
      .prepare('SELECT * FROM wrong_parking_incidents WHERE id = ?')
      .get(id) as WrongParkingIncidentRow | undefined;

    if (!incident) {
      return { success: false, message: 'Incident not found.' };
    }

    const now = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE wrong_parking_incidents
        SET siren_muted = 1,
            updated_at = ?
        WHERE id = ?
      `)
      .run(now, id);

    const updated = this.db
      .prepare('SELECT * FROM wrong_parking_incidents WHERE id = ?')
      .get(id) as WrongParkingIncidentRow;

    return {
      success: true,
      message: `Alarm for incident ${id} muted.`,
      incident: updated,
    };
  }

  public static getWrongParkingIncidents(limit: number = 50, status?: WrongParkingStatus): WrongParkingIncidentRow[] {
    if (status) {
      return this.db
        .prepare('SELECT * FROM wrong_parking_incidents WHERE status = ? ORDER BY created_at DESC LIMIT ?')
        .all(status, limit) as WrongParkingIncidentRow[];
    }
    return this.db
      .prepare('SELECT * FROM wrong_parking_incidents ORDER BY created_at DESC LIMIT ?')
      .all(limit) as WrongParkingIncidentRow[];
  }

  // ---- VIP & EMERGENCY PRIORITY RESERVATIONS ----

  public static createReservation(input: {
    reservationType: 'VIP_GUEST' | 'EMERGENCY' | 'EVENT_GUEST';
    slotId: string;
    vehicleNumber?: string;
    guestName: string;
    startTime: string;
    endTime: string;
    reason: string;
    contactDepartment?: string;
    notes?: string;
    operatorRole?: string;
    operatorId?: string;
    securityPin?: string;
  }): {
    success: boolean;
    unauthorized?: boolean;
    conflict?: boolean;
    message: string;
    reservation?: ParkingReservationRow;
    slot?: ParkingSlotRow;
  } {
    const isSecurity = isSecurityOfficer(input.operatorRole, input.securityPin);
    const isOfficial = isCampusOfficial(input.operatorRole, input.securityPin);

    // 1. Role-based authorization
    if (input.reservationType === 'EMERGENCY') {
      if (!isSecurity) {
        return {
          success: false,
          unauthorized: true,
          message: 'Forbidden: Emergency reservations require Security Officer authorization or PIN.',
        };
      }
    } else {
      if (!isOfficial) {
        return {
          success: false,
          unauthorized: true,
          message: 'Forbidden: Creating VIP or Official reservations requires Campus Official or Security credentials.',
        };
      }
    }

    // 2. Validate Slot
    const slot = this.getSlotById(input.slotId);
    if (!slot) {
      return { success: false, message: `Invalid parking bay "${input.slotId}". Bay not found.` };
    }

    // 3. Validate Dates
    const startDate = new Date(input.startTime);
    const endDate = new Date(input.endTime);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, message: 'Invalid start time or end time provided.' };
    }
    if (startDate.getTime() >= endDate.getTime()) {
      return { success: false, message: 'Reservation start time must be strictly before end time.' };
    }

    // 4. Overlapping reservations conflict check for that slot
    const conflict = this.db
      .prepare(`
        SELECT * FROM parking_reservations
        WHERE slot_id = ?
          AND status IN ('ACTIVE', 'CHECKED_IN')
          AND datetime(?) < datetime(end_time)
          AND datetime(?) > datetime(start_time)
        LIMIT 1
      `)
      .get(input.slotId, input.startTime, input.endTime) as ParkingReservationRow | undefined;

    if (conflict) {
      const err = `Conflict: Slot ${input.slotId} is already reserved for "${conflict.guest_name}" from ${conflict.start_time} to ${conflict.end_time}.`;
      this.addAlert({
        type: 'RESERVATION_CONFLICT',
        severity: 'WARNING',
        message: `Reservation Conflict on Bay ${input.slotId}`,
        details: err,
        slotId: input.slotId,
      });
      return { success: false, conflict: true, message: err };
    }

    const now = new Date().toISOString();
    const id = `RES-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const normPlate = input.vehicleNumber ? BackendValidationService.normalizeVehicleNumber(input.vehicleNumber) : null;
    const actor = input.operatorId || 'Security-Terminal';
    const actorRole = input.operatorRole || (isSecurity ? 'SECURITY_OFFICER' : 'CAMPUS_OFFICIAL');

    const executeCreateTx = this.db.transaction(() => {
      // Insert reservation
      this.db
        .prepare(`
          INSERT INTO parking_reservations (
            id, reservation_type, slot_id, vehicle_number, guest_name, start_time, end_time,
            reason, contact_department, notes, status, created_by, created_by_role, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)
        `)
        .run(
          id,
          input.reservationType,
          input.slotId,
          normPlate,
          input.guestName.trim(),
          input.startTime,
          input.endTime,
          input.reason.trim(),
          input.contactDepartment || null,
          input.notes || null,
          actor,
          actorRole,
          now,
          now
        );

      // If slot is currently AVAILABLE, mark it RESERVED
      if (slot.status === 'AVAILABLE') {
        this.db
          .prepare("UPDATE parking_slots SET status = 'RESERVED', updated_at = ? WHERE id = ?")
          .run(now, input.slotId);
      }

      // Record in audit log
      this.db
        .prepare(`
          INSERT INTO reservation_audit_logs (
            id, reservation_id, slot_id, action, actor, actor_role, reason, details_json, created_at
          ) VALUES (?, ?, ?, 'CREATED', ?, ?, ?, ?, ?)
        `)
        .run(
          `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          id,
          input.slotId,
          actor,
          actorRole,
          input.reason,
          JSON.stringify({ reservationType: input.reservationType, guestName: input.guestName, plate: normPlate }),
          now
        );

      if (input.reservationType === 'EMERGENCY') {
        this.addAlert({
          type: 'EMERGENCY_OVERRIDE',
          severity: 'CRITICAL',
          message: `PRIORITY EMERGENCY RESERVATION: Bay ${input.slotId} reserved for ${input.guestName}.`,
          details: `Reason: ${input.reason}. Authorized by ${actor}.`,
          slotId: input.slotId,
        });
      }
    });

    executeCreateTx();

    const createdRes = this.getReservationById(id)!;
    const updatedSlot = this.getSlotById(input.slotId)!;

    return {
      success: true,
      message: `Reservation ${id} successfully confirmed for bay ${input.slotId}.`,
      reservation: createdRes,
      slot: updatedSlot,
    };
  }

  public static getReservations(filter?: {
    status?: string;
    reservationType?: string;
    slotId?: string;
    searchQuery?: string;
    limit?: number;
  }): ParkingReservationRow[] {
    // 1. Auto-update expired reservations whose end_time has passed
    const nowIso = new Date().toISOString();
    try {
      const expiredRows = this.db
        .prepare("SELECT * FROM parking_reservations WHERE status = 'ACTIVE' AND datetime(end_time) < datetime(?)")
        .all(nowIso) as ParkingReservationRow[];

      if (expiredRows.length > 0) {
        const expireTx = this.db.transaction(() => {
          for (const exp of expiredRows) {
            this.db
              .prepare("UPDATE parking_reservations SET status = 'EXPIRED', updated_at = ? WHERE id = ?")
              .run(nowIso, exp.id);

            // A reservation's end time must NOT automatically unlock a slot that security has manually locked!
            const lockRow = this.db
              .prepare("SELECT * FROM slot_security_locks WHERE slot_id = ? AND is_active = 1")
              .get(exp.slot_id) as SlotSecurityLockRow | undefined;

            if (!lockRow) {
              const currentSlot = this.getSlotById(exp.slot_id);
              if (currentSlot && currentSlot.status === 'RESERVED' && !currentSlot.current_vehicle_id) {
                this.db
                  .prepare("UPDATE parking_slots SET status = 'AVAILABLE', updated_at = ? WHERE id = ?")
                  .run(nowIso, exp.slot_id);
              }
            }
          }
        });
        expireTx();
      }
    } catch {
      // Safe fallback
    }

    let query = 'SELECT * FROM parking_reservations WHERE 1=1';
    const params: unknown[] = [];

    if (filter?.status && filter.status !== 'ALL') {
      query += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.reservationType && filter.reservationType !== 'ALL') {
      query += ' AND reservation_type = ?';
      params.push(filter.reservationType);
    }
    if (filter?.slotId) {
      query += ' AND slot_id = ?';
      params.push(filter.slotId.toUpperCase());
    }
    if (filter?.searchQuery?.trim()) {
      const q = `%${filter.searchQuery.trim().toUpperCase()}%`;
      query += ' AND (UPPER(vehicle_number) LIKE ? OR UPPER(id) LIKE ? OR UPPER(slot_id) LIKE ? OR UPPER(guest_name) LIKE ?)';
      params.push(q, q, q, q);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(filter?.limit || 100);

    return this.db.prepare(query).all(...params) as ParkingReservationRow[];
  }

  public static getReservationById(id: string): ParkingReservationRow | undefined {
    return this.db
      .prepare('SELECT * FROM parking_reservations WHERE id = ?')
      .get(id) as ParkingReservationRow | undefined;
  }

  public static lockSlot(input: {
    slotId: string;
    lockType: 'RESERVED' | 'SECURITY_LOCKED';
    reason: string;
    reservationId?: string;
    operatorRole?: string;
    operatorId?: string;
    securityPin?: string;
  }): {
    success: boolean;
    unauthorized?: boolean;
    message: string;
    slot?: ParkingSlotRow;
    lock?: SlotSecurityLockRow;
  } {
    if (!isSecurityOfficer(input.operatorRole, input.securityPin)) {
      return {
        success: false,
        unauthorized: true,
        message: 'Forbidden: Only authorized Security Officers or Administrators can lock parking slots.',
      };
    }

    if (!input.reason?.trim()) {
      return { success: false, message: 'A mandatory reason is required to lock a parking bay.' };
    }

    const slot = this.getSlotById(input.slotId);
    if (!slot) {
      return { success: false, message: `Parking slot "${input.slotId}" not found.` };
    }

    const now = new Date().toISOString();
    const lockId = `LOCK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const actor = input.operatorId || 'Security-Officer';
    const actorRole = input.operatorRole || 'SECURITY_OFFICER';

    const executeLockTx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO slot_security_locks (
            id, slot_id, lock_type, reservation_id, locked_by, locked_by_role, reason, locked_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(slot_id) DO UPDATE SET
            lock_type = excluded.lock_type,
            reservation_id = excluded.reservation_id,
            locked_by = excluded.locked_by,
            locked_by_role = excluded.locked_by_role,
            reason = excluded.reason,
            locked_at = excluded.locked_at,
            is_active = 1
        `)
        .run(
          lockId,
          input.slotId,
          input.lockType,
          input.reservationId || null,
          actor,
          actorRole,
          input.reason.trim(),
          now
        );

      this.db
        .prepare('UPDATE parking_slots SET status = ?, updated_at = ? WHERE id = ?')
        .run(input.lockType, now, input.slotId);

      this.db
        .prepare(`
          INSERT INTO reservation_audit_logs (
            id, reservation_id, slot_id, action, actor, actor_role, reason, details_json, created_at
          ) VALUES (?, ?, ?, 'SLOT_LOCKED', ?, ?, ?, ?, ?)
        `)
        .run(
          `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          input.reservationId || null,
          input.slotId,
          actor,
          actorRole,
          input.reason.trim(),
          JSON.stringify({ lockType: input.lockType }),
          now
        );
    });

    executeLockTx();

    const updatedSlot = this.getSlotById(input.slotId)!;
    const lock = this.db
      .prepare('SELECT * FROM slot_security_locks WHERE slot_id = ? AND is_active = 1')
      .get(input.slotId) as SlotSecurityLockRow;

    return {
      success: true,
      message: `Bay ${input.slotId} locked successfully as ${input.lockType}.`,
      slot: updatedSlot,
      lock,
    };
  }

  public static unlockSlot(input: {
    slotId: string;
    releaseReason: string;
    operatorRole?: string;
    operatorId?: string;
    securityPin?: string;
  }): {
    success: boolean;
    unauthorized?: boolean;
    message: string;
    slot?: ParkingSlotRow;
  } {
    if (!isSecurityOfficer(input.operatorRole, input.securityPin)) {
      return {
        success: false,
        unauthorized: true,
        message: 'Forbidden: Only authorized Security Officers or Administrators can unlock protected slots.',
      };
    }

    if (!input.releaseReason?.trim()) {
      return { success: false, message: 'A mandatory reason is required to release or unlock a protected slot.' };
    }

    const slot = this.getSlotById(input.slotId);
    if (!slot) {
      return { success: false, message: `Parking slot "${input.slotId}" not found.` };
    }

    const now = new Date().toISOString();
    const actor = input.operatorId || 'Security-Officer';
    const actorRole = input.operatorRole || 'SECURITY_OFFICER';

    const executeUnlockTx = this.db.transaction(() => {
      // 1. Deactivate security lock
      this.db
        .prepare('UPDATE slot_security_locks SET is_active = 0 WHERE slot_id = ?')
        .run(input.slotId);

      // 2. Determine slot next status: if vehicle parked -> OCCUPIED, else -> AVAILABLE
      const nextStatus = slot.current_vehicle_id ? 'OCCUPIED' : 'AVAILABLE';
      this.db
        .prepare('UPDATE parking_slots SET status = ?, updated_at = ? WHERE id = ?')
        .run(nextStatus, now, input.slotId);

      // 3. Audit log
      this.db
        .prepare(`
          INSERT INTO reservation_audit_logs (
            id, reservation_id, slot_id, action, actor, actor_role, reason, details_json, created_at
          ) VALUES (?, NULL, ?, 'SLOT_UNLOCKED', ?, ?, ?, ?, ?)
        `)
        .run(
          `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          input.slotId,
          actor,
          actorRole,
          input.releaseReason.trim(),
          JSON.stringify({ previousStatus: slot.status, nextStatus }),
          now
        );
    });

    executeUnlockTx();

    const updatedSlot = this.getSlotById(input.slotId)!;
    return {
      success: true,
      message: `Bay ${input.slotId} unlocked and released. Slot is now ${updatedSlot.status}.`,
      slot: updatedSlot,
    };
  }

  public static cancelReservation(
    id: string,
    input: {
      reason: string;
      operatorRole?: string;
      operatorId?: string;
      securityPin?: string;
    }
  ): {
    success: boolean;
    unauthorized?: boolean;
    message: string;
    reservation?: ParkingReservationRow;
    slot?: ParkingSlotRow;
  } {
    if (!isCampusOfficial(input.operatorRole, input.securityPin)) {
      return {
        success: false,
        unauthorized: true,
        message: 'Forbidden: Regular users cannot cancel reservations.',
      };
    }

    const reservation = this.getReservationById(id);
    if (!reservation) {
      return { success: false, message: `Reservation "${id}" not found.` };
    }

    if (reservation.status === 'CANCELLED') {
      return { success: false, message: 'Reservation is already cancelled.' };
    }

    const reason = (input.reason || '').trim() || 'Cancelled by authorized personnel';
    const now = new Date().toISOString();
    const actor = input.operatorId || 'Campus-Official';
    const actorRole = input.operatorRole || 'CAMPUS_OFFICIAL';

    const executeCancelTx = this.db.transaction(() => {
      // 1. Mark reservation CANCELLED
      this.db
        .prepare(`
          UPDATE parking_reservations SET
            status = 'CANCELLED',
            cancelled_at = ?,
            cancelled_by = ?,
            cancellation_reason = ?,
            updated_at = ?
          WHERE id = ?
        `)
        .run(now, actor, reason, now, id);

      // 2. CRITICAL BUSINESS RULE:
      // "If a reservation is cancelled, release its reservation status only if no independent security lock remains and the releasing user has permission.
      // A reservation's end time must not automatically unlock a slot that security has manually locked. Only the explicitly authorized release/unlock action may clear that security lock."
      const independentLock = this.db
        .prepare("SELECT * FROM slot_security_locks WHERE slot_id = ? AND is_active = 1 AND lock_type = 'SECURITY_LOCKED'")
        .get(reservation.slot_id) as SlotSecurityLockRow | undefined;

      const slot = this.getSlotById(reservation.slot_id);
      if (slot) {
        if (independentLock) {
          // Independent security lock holds: keep SECURITY_LOCKED
          this.db
            .prepare("UPDATE parking_slots SET status = 'SECURITY_LOCKED', updated_at = ? WHERE id = ?")
            .run(now, reservation.slot_id);
        } else {
          // Deactivate any lock attached directly to this reservation
          this.db
            .prepare('UPDATE slot_security_locks SET is_active = 0 WHERE reservation_id = ?')
            .run(id);

          const nextStatus = slot.current_vehicle_id ? 'OCCUPIED' : 'AVAILABLE';
          this.db
            .prepare('UPDATE parking_slots SET status = ?, updated_at = ? WHERE id = ?')
            .run(nextStatus, now, reservation.slot_id);
        }
      }

      // 3. Audit log
      this.db
        .prepare(`
          INSERT INTO reservation_audit_logs (
            id, reservation_id, slot_id, action, actor, actor_role, reason, details_json, created_at
          ) VALUES (?, ?, ?, 'CANCELLED', ?, ?, ?, ?, ?)
        `)
        .run(
          `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          id,
          reservation.slot_id,
          actor,
          actorRole,
          reason,
          JSON.stringify({ slotId: reservation.slot_id }),
          now
        );
    });

    executeCancelTx();

    const updatedRes = this.getReservationById(id)!;
    const updatedSlot = this.getSlotById(reservation.slot_id)!;

    return {
      success: true,
      message: `Reservation ${id} cancelled successfully.`,
      reservation: updatedRes,
      slot: updatedSlot,
    };
  }

  public static processFastTrackArrival(input: {
    vehicleNumber?: string;
    reservationId?: string;
    operatorRole?: string;
    operatorId?: string;
    securityPin?: string;
  }): {
    status: 'FAST_TRACK_APPROVED' | 'NEEDS_REVIEW' | 'SLOT_OCCUPIED_CONFLICT' | 'EXPIRED' | 'NOT_FOUND';
    approved: boolean;
    requiresReview: boolean;
    message: string;
    reservation?: ParkingReservationRow;
    allocatedSlotId?: string;
    vehicleNumber?: string;
    alternativeSlots?: string[];
    session?: ParkingSessionRow;
  } {
    let reservation: ParkingReservationRow | undefined;

    if (input.reservationId?.trim()) {
      reservation = this.getReservationById(input.reservationId.trim());
    } else if (input.vehicleNumber?.trim()) {
      const norm = BackendValidationService.normalizeVehicleNumber(input.vehicleNumber);
      reservation = this.db
        .prepare(`
          SELECT * FROM parking_reservations
          WHERE UPPER(vehicle_number) = ?
            AND status IN ('ACTIVE', 'CHECKED_IN')
          ORDER BY created_at DESC LIMIT 1
        `)
        .get(norm) as ParkingReservationRow | undefined;

      if (!reservation) {
        // Try canonical search
        const canon = BackendValidationService.canonicalAlphanumeric(input.vehicleNumber);
        const allActive = this.db
          .prepare("SELECT * FROM parking_reservations WHERE status IN ('ACTIVE', 'CHECKED_IN')")
          .all() as ParkingReservationRow[];
        reservation = allActive.find(
          (r) => r.vehicle_number && BackendValidationService.canonicalAlphanumeric(r.vehicle_number) === canon
        );
      }
    }

    if (!reservation) {
      const err = `No active reservation found for vehicle ${input.vehicleNumber || 'UNKNOWN'}. Guard review mandatory.`;
      this.addAlert({
        type: 'UNKNOWN_VEHICLE',
        severity: 'INFO',
        message: 'VIP Arrival: No matching reservation found',
        details: err,
        vehicleNumber: input.vehicleNumber,
      });
      return {
        status: 'NOT_FOUND',
        approved: false,
        requiresReview: true,
        message: err,
      };
    }

    // Check expiration
    const nowTime = new Date().getTime();
    const endTime = new Date(reservation.end_time).getTime();
    if (reservation.status === 'EXPIRED' || nowTime > endTime) {
      const err = `Reservation for ${reservation.guest_name} expired at ${reservation.end_time}.`;
      this.addAlert({
        type: 'RESERVATION_CONFLICT',
        severity: 'WARNING',
        message: 'VIP Arrival with Expired Reservation',
        details: err,
        slotId: reservation.slot_id,
        vehicleNumber: reservation.vehicle_number || input.vehicleNumber,
      });
      return {
        status: 'EXPIRED',
        approved: false,
        requiresReview: true,
        message: err,
        reservation,
      };
    }

    if (reservation.status !== 'ACTIVE') {
      return {
        status: 'NEEDS_REVIEW',
        approved: false,
        requiresReview: true,
        message: `Reservation status is ${reservation.status}. Fast-track entry not allowed.`,
        reservation,
      };
    }

    const slot = this.getSlotById(reservation.slot_id);
    if (!slot) {
      return {
        status: 'NEEDS_REVIEW',
        approved: false,
        requiresReview: true,
        message: `Reserved slot ${reservation.slot_id} does not exist in bay registry.`,
        reservation,
      };
    }

    const targetPlate = reservation.vehicle_number || (input.vehicleNumber ? BackendValidationService.normalizeVehicleNumber(input.vehicleNumber) : 'VIP-GUEST');

    // Check if slot is OCCUPIED by ANOTHER vehicle
    if (slot.status === 'OCCUPIED' && slot.current_vehicle_number !== targetPlate) {
      const err = `CRITICAL: Reserved slot ${reservation.slot_id} is currently occupied by vehicle ${slot.current_vehicle_number}.`;
      this.addAlert({
        type: 'RESERVED_SLOT_BLOCKED',
        severity: 'CRITICAL',
        message: `Reserved Bay ${reservation.slot_id} is Occupied!`,
        details: `${reservation.guest_name} arrived, but slot ${reservation.slot_id} is blocked by ${slot.current_vehicle_number}.`,
        slotId: reservation.slot_id,
      });

      // Find alternative available slots of the same vehicle type
      const altSlots = this.db
        .prepare("SELECT id FROM parking_slots WHERE type = ? AND status = 'AVAILABLE' ORDER BY slot_number ASC")
        .all(slot.type) as Array<{ id: string }>;

      return {
        status: 'SLOT_OCCUPIED_CONFLICT',
        approved: false,
        requiresReview: true,
        message: err,
        reservation,
        allocatedSlotId: reservation.slot_id,
        alternativeSlots: altSlots.map((s) => s.id),
      };
    }

    // Approve fast-track entry into the designated slot
    const now = new Date().toISOString();
    const entryHour = new Date().getHours();
    const sessionId = `SESS-VIP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const vehicleId = `VEH-VIP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const actor = input.operatorId || 'FastTrack-Gate';
    const actorRole = input.operatorRole || 'SECURITY_OFFICER';

    const executeArrivalTx = this.db.transaction(() => {
      // Upsert vehicle
      const existingVehicle = this.db
        .prepare('SELECT id FROM vehicles WHERE vehicle_number = ?')
        .get(targetPlate) as { id: string } | undefined;
      const activeVehId = existingVehicle ? existingVehicle.id : vehicleId;

      this.db
        .prepare(`
          INSERT INTO vehicles (
            id, vehicle_number, vehicle_type, owner_category, status, current_slot_id, current_entry_hour, created_at, updated_at
          ) VALUES (?, ?, ?, 'STAFF', 'PARKED', ?, ?, ?, ?)
          ON CONFLICT(vehicle_number) DO UPDATE SET
            status = 'PARKED',
            current_slot_id = excluded.current_slot_id,
            current_entry_hour = excluded.current_entry_hour,
            updated_at = excluded.updated_at
        `)
        .run(activeVehId, targetPlate, slot.type, slot.id, entryHour, now, now);

      // Create active session
      this.db
        .prepare(`
          INSERT INTO parking_sessions (
            id, vehicle_id, slot_id, vehicle_number, vehicle_type, owner_category, entry_hour, status, entry_origin, created_at
          ) VALUES (?, ?, ?, ?, ?, 'STAFF', ?, 'ACTIVE', 'AI', ?)
        `)
        .run(sessionId, activeVehId, slot.id, targetPlate, slot.type, entryHour, now);

      // Update slot
      this.db
        .prepare(`
          UPDATE parking_slots SET
            status = 'OCCUPIED',
            current_vehicle_id = ?,
            current_vehicle_number = ?,
            current_owner_category = 'STAFF',
            current_entry_hour = ?,
            updated_at = ?
          WHERE id = ?
        `)
        .run(activeVehId, targetPlate, entryHour, now, slot.id);

      // Mark reservation checked in
      this.db
        .prepare(`
          UPDATE parking_reservations SET
            status = 'CHECKED_IN',
            checked_in_at = ?,
            updated_at = ?
          WHERE id = ?
        `)
        .run(now, now, reservation!.id);

      // Audit log
      this.db
        .prepare(`
          INSERT INTO reservation_audit_logs (
            id, reservation_id, slot_id, action, actor, actor_role, reason, details_json, created_at
          ) VALUES (?, ?, ?, 'FAST_TRACK_ENTRY', ?, ?, 'VIP Priority Arrival Check-in', ?, ?)
        `)
        .run(
          `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          reservation!.id,
          slot.id,
          actor,
          actorRole,
          JSON.stringify({ sessionId, targetPlate, slotId: slot.id }),
          now
        );
    });

    executeArrivalTx();

    const createdSession = this.db
      .prepare('SELECT * FROM parking_sessions WHERE id = ?')
      .get(sessionId) as ParkingSessionRow;
    const updatedRes = this.getReservationById(reservation.id)!;

    return {
      status: 'FAST_TRACK_APPROVED',
      approved: true,
      requiresReview: false,
      message: `VIP Fast-Track approved! Vehicle ${targetPlate} (${reservation.guest_name}) assigned to dedicated bay ${slot.id}.`,
      reservation: updatedRes,
      allocatedSlotId: slot.id,
      vehicleNumber: targetPlate,
      session: createdSession,
    };
  }

  public static getSecurityLocks(): SlotSecurityLockRow[] {
    return this.db
      .prepare("SELECT * FROM slot_security_locks WHERE is_active = 1 ORDER BY locked_at DESC")
      .all() as SlotSecurityLockRow[];
  }

  public static getReservationAuditLogs(limit: number = 100): ReservationAuditLogRow[] {
    return this.db
      .prepare('SELECT * FROM reservation_audit_logs ORDER BY created_at DESC LIMIT ?')
      .all(limit) as ReservationAuditLogRow[];
  }

  // ---- DEMO SEED & SYSTEM RESET ----

  public static seedRealisticDemoData(): void {
    // Reset all slots to available first
    this.resetSystem();

    const sampleVehicles = [
      { vehicleNumber: 'KA22AB1234', vehicleType: 'TWO_WHEELER' as const, ownerCategory: 'STUDENT' as const, entryHour: 9 },
      { vehicleNumber: 'KA22CD5678', vehicleType: 'FOUR_WHEELER' as const, ownerCategory: 'STAFF' as const, entryHour: 8 },
      { vehicleNumber: 'KA22EF9876', vehicleType: 'TWO_WHEELER' as const, ownerCategory: 'STAFF' as const, entryHour: 10 },
      { vehicleNumber: 'KA22GH4321', vehicleType: 'FOUR_WHEELER' as const, ownerCategory: 'VISITOR' as const, entryHour: 11 },
      { vehicleNumber: 'MH12PQ3456', vehicleType: 'TWO_WHEELER' as const, ownerCategory: 'VISITOR' as const, entryHour: 10 },
    ];

    for (const v of sampleVehicles) {
      this.parkVehicle({ ...v, origin: 'DEMO' });
    }

    // Also simulate one completed checkout in history
    this.checkoutVehicle('KA22AB1234', 13); // 4 hrs = ₹20
  }

  public static resetSystem(): void {
    const now = new Date().toISOString();
    const resetTx = this.db.transaction(() => {
      this.db.prepare("UPDATE parking_slots SET status = 'AVAILABLE', current_vehicle_id = NULL, current_vehicle_number = NULL, current_owner_category = NULL, current_entry_hour = NULL, updated_at = ?").run(now);
      this.db.prepare("UPDATE vehicles SET status = 'EXITED', current_slot_id = NULL, current_entry_hour = NULL, updated_at = ?").run(now);
      this.db.prepare("DELETE FROM receipts").run();
      this.db.prepare("DELETE FROM parking_sessions").run();
      this.db.prepare("DELETE FROM camera_events").run();
      this.db.prepare("DELETE FROM alerts").run();
      this.db.prepare("DELETE FROM wrong_parking_incidents").run();
      this.db.prepare("DELETE FROM parking_reservations").run();
      this.db.prepare("DELETE FROM slot_security_locks").run();
      this.db.prepare("DELETE FROM reservation_audit_logs").run();
    });
    resetTx();
  }
}


