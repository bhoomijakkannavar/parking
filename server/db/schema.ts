export const SCHEMA_SQL = `
-- Enforce foreign keys and modern WAL mode
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 1. College Members Registry
CREATE TABLE IF NOT EXISTS college_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Student', 'Faculty', 'Staff', 'Administration', 'Authorized Personnel')),
  department TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SUSPENDED')),
  pass_id TEXT,
  registered_vehicles_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

-- 2. Parking Slots (10 Two-Wheelers T-01..T-10, 5 Four-Wheelers F-01..F-05)
CREATE TABLE IF NOT EXISTS parking_slots (
  id TEXT PRIMARY KEY,
  slot_number INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('TWO_WHEELER', 'FOUR_WHEELER')),
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'SECURITY_LOCKED')),
  current_vehicle_id TEXT,
  current_vehicle_number TEXT,
  current_owner_category TEXT CHECK(current_owner_category IN ('STAFF', 'STUDENT', 'VISITOR', NULL)),
  current_entry_hour INTEGER,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_slots_type_status ON parking_slots(type, status);

-- 3. Vehicles Directory
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  vehicle_number TEXT NOT NULL UNIQUE,
  vehicle_type TEXT NOT NULL CHECK(vehicle_type IN ('TWO_WHEELER', 'FOUR_WHEELER')),
  owner_category TEXT NOT NULL CHECK(owner_category IN ('STAFF', 'STUDENT', 'VISITOR')),
  status TEXT NOT NULL DEFAULT 'PARKED' CHECK(status IN ('PARKED', 'EXITED')),
  current_slot_id TEXT REFERENCES parking_slots(id) ON DELETE SET NULL,
  current_entry_hour INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- 4. Parking Sessions
CREATE TABLE IF NOT EXISTS parking_sessions (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  slot_id TEXT NOT NULL REFERENCES parking_slots(id),
  vehicle_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK(vehicle_type IN ('TWO_WHEELER', 'FOUR_WHEELER')),
  owner_category TEXT NOT NULL CHECK(owner_category IN ('STAFF', 'STUDENT', 'VISITOR')),
  entry_hour INTEGER NOT NULL,
  exit_hour INTEGER,
  duration INTEGER,
  fee REAL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED')),
  entry_origin TEXT NOT NULL DEFAULT 'MANUAL' CHECK(entry_origin IN ('MANUAL', 'AI', 'DEMO')),
  receipt_id TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

-- Prevent duplicate active parking sessions for the same vehicle at the database engine level
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_session_vehicle ON parking_sessions(vehicle_number) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_sessions_status ON parking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON parking_sessions(created_at DESC);

-- 5. Audit Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES parking_sessions(id),
  vehicle_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  owner_category TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  entry_hour INTEGER NOT NULL,
  exit_hour INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  fee REAL NOT NULL,
  breakdown_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_receipts_created ON receipts(created_at DESC);

-- 6. Camera Events / ANPR Telemetry
CREATE TABLE IF NOT EXISTS camera_events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  owner_category TEXT,
  gate_type TEXT NOT NULL CHECK(gate_type IN ('ENTRY', 'EXIT')),
  confidence REAL NOT NULL,
  mode TEXT NOT NULL DEFAULT 'DEMO' CHECK(mode IN ('LIVE', 'DEMO')),
  action TEXT NOT NULL,
  action_summary TEXT NOT NULL,
  slot_id TEXT,
  fee REAL,
  face_detected INTEGER NOT NULL DEFAULT 1,
  member_id TEXT,
  member_name TEXT,
  role TEXT,
  id_card_number_masked TEXT,
  id_verification_status TEXT,
  id_verification_reason TEXT,
  override_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_camera_events_time ON camera_events(timestamp DESC);

-- 7. System & Security Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL')),
  message TEXT NOT NULL,
  details TEXT,
  timestamp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNREAD' CHECK(status IN ('UNREAD', 'RESOLVED')),
  vehicle_number TEXT,
  slot_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status, created_at DESC);

-- 8. AI Wrong Parking Surveillance Incidents
CREATE TABLE IF NOT EXISTS wrong_parking_incidents (
  id TEXT PRIMARY KEY,
  vehicle_number TEXT NOT NULL,
  vehicle_number_masked TEXT NOT NULL,
  allocated_slot_id TEXT NOT NULL,
  detected_slot_id TEXT NOT NULL,
  camera_id TEXT NOT NULL,
  camera_zone TEXT NOT NULL,
  confidence REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE', 'NEEDS_REVIEW')),
  severity TEXT NOT NULL DEFAULT 'WARNING' CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL')),
  siren_triggered INTEGER NOT NULL DEFAULT 0,
  siren_muted INTEGER NOT NULL DEFAULT 0,
  acknowledged_by TEXT,
  acknowledged_at TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  resolution_notes TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wrong_parking_status ON wrong_parking_incidents(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wrong_parking_vehicle ON wrong_parking_incidents(vehicle_number);

-- 9. VIP & Emergency Priority Reservations
CREATE TABLE IF NOT EXISTS parking_reservations (
  id TEXT PRIMARY KEY,
  reservation_type TEXT NOT NULL CHECK(reservation_type IN ('VIP_GUEST', 'EMERGENCY', 'EVENT_GUEST')),
  slot_id TEXT NOT NULL REFERENCES parking_slots(id),
  vehicle_number TEXT,
  guest_name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  reason TEXT NOT NULL,
  contact_department TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
  created_by TEXT NOT NULL,
  created_by_role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  checked_in_at TEXT,
  cancelled_at TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_res_slot_status ON parking_reservations(slot_id, status);
CREATE INDEX IF NOT EXISTS idx_res_vehicle ON parking_reservations(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_res_time ON parking_reservations(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_res_status_time ON parking_reservations(status, start_time DESC);

-- 10. Security-Controlled Slot Locks
CREATE TABLE IF NOT EXISTS slot_security_locks (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL UNIQUE REFERENCES parking_slots(id),
  lock_type TEXT NOT NULL CHECK(lock_type IN ('RESERVED', 'SECURITY_LOCKED')),
  reservation_id TEXT REFERENCES parking_reservations(id) ON DELETE SET NULL,
  locked_by TEXT NOT NULL,
  locked_by_role TEXT NOT NULL,
  reason TEXT NOT NULL,
  locked_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_locks_slot ON slot_security_locks(slot_id, is_active);

-- 11. Reservation & Security Lock Audit Trail
CREATE TABLE IF NOT EXISTS reservation_audit_logs (
  id TEXT PRIMARY KEY,
  reservation_id TEXT,
  slot_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  reason TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_res_audit_created ON reservation_audit_logs(created_at DESC);
`;

