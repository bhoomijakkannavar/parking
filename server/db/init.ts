import Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema';
import { getDb } from './database';

export const INITIAL_SLOT_SEEDS = [
  // 10 Two-Wheeler Slots (T-01 to T-10)
  { id: 'T-01', slotNumber: 1, type: 'TWO_WHEELER' },
  { id: 'T-02', slotNumber: 2, type: 'TWO_WHEELER' },
  { id: 'T-03', slotNumber: 3, type: 'TWO_WHEELER' },
  { id: 'T-04', slotNumber: 4, type: 'TWO_WHEELER' },
  { id: 'T-05', slotNumber: 5, type: 'TWO_WHEELER' },
  { id: 'T-06', slotNumber: 6, type: 'TWO_WHEELER' },
  { id: 'T-07', slotNumber: 7, type: 'TWO_WHEELER' },
  { id: 'T-08', slotNumber: 8, type: 'TWO_WHEELER' },
  { id: 'T-09', slotNumber: 9, type: 'TWO_WHEELER' },
  { id: 'T-10', slotNumber: 10, type: 'TWO_WHEELER' },

  // 5 Four-Wheeler Slots (F-01 to F-05)
  { id: 'F-01', slotNumber: 1, type: 'FOUR_WHEELER' },
  { id: 'F-02', slotNumber: 2, type: 'FOUR_WHEELER' },
  { id: 'F-03', slotNumber: 3, type: 'FOUR_WHEELER' },
  { id: 'F-04', slotNumber: 4, type: 'FOUR_WHEELER' },
  { id: 'F-05', slotNumber: 5, type: 'FOUR_WHEELER' },
];

export const INITIAL_COLLEGE_MEMBERS = [
  {
    id: 'STU-2023-045',
    name: 'Rohan Verma',
    role: 'Student',
    department: 'Mechanical Engineering',
    status: 'ACTIVE',
    passId: 'PASS-2023-045',
    createdAt: '2024-01-15T08:00:00.000Z',
    registeredVehicles: [
      { vehicleNumber: 'KA-05-ST-2020', vehicleType: 'TWO_WHEELER', primary: true },
    ],
  },
  {
    id: 'FAC-CS-101',
    name: 'Prof. Arvind Sharma',
    role: 'Faculty',
    department: 'Computer Science & Engineering',
    status: 'ACTIVE',
    passId: 'PASS-FAC-101',
    createdAt: '2023-08-10T09:30:00.000Z',
    registeredVehicles: [
      { vehicleNumber: 'KA-01-FA-1001', vehicleType: 'FOUR_WHEELER', primary: true },
      { vehicleNumber: 'KA-01-FA-2002', vehicleType: 'TWO_WHEELER', primary: false },
    ],
  },
  {
    id: 'STU-2022-811',
    name: 'Ananya Roy',
    role: 'Student',
    department: 'Civil Engineering',
    status: 'ACTIVE',
    passId: 'PASS-2022-811',
    createdAt: '2023-11-20T11:00:00.000Z',
    registeredVehicles: [
      { vehicleNumber: 'KA-02-AR-8899', vehicleType: 'FOUR_WHEELER', primary: true },
    ],
  },
  {
    id: 'STF-ADM-012',
    name: 'Suresh Kumar',
    role: 'Staff',
    department: 'Campus Security & Facilities',
    status: 'ACTIVE',
    passId: 'PASS-STF-012',
    createdAt: '2023-07-01T07:45:00.000Z',
    registeredVehicles: [
      { vehicleNumber: 'KA-04-SK-5555', vehicleType: 'TWO_WHEELER', primary: true },
    ],
  },
  {
    id: 'FAC-EC-204',
    name: 'Dr. Meera Nambiar',
    role: 'Faculty',
    department: 'Electronics & Communication',
    status: 'ACTIVE',
    passId: 'PASS-FAC-204',
    createdAt: '2023-09-05T10:15:00.000Z',
    registeredVehicles: [
      { vehicleNumber: 'KA-03-ME-4040', vehicleType: 'TWO_WHEELER', primary: true },
    ],
  },
  {
    id: 'ADM-OFF-001',
    name: 'Dean Dr. K. R. Raman',
    role: 'Administration',
    department: 'Dean of Student Affairs',
    status: 'ACTIVE',
    passId: 'PASS-ADM-001',
    createdAt: '2023-06-12T08:30:00.000Z',
    registeredVehicles: [
      { vehicleNumber: 'KA-01-KR-9999', vehicleType: 'FOUR_WHEELER', primary: true },
    ],
  },
];

export function initializeDatabase(db?: Database.Database): Database.Database {
  const activeDb = db || getDb();

  // 1. Run schema DDL
  activeDb.exec(SCHEMA_SQL);

  // 2. Check and seed parking slots only if they don't already exist
  const slotCountRow = activeDb
    .prepare('SELECT COUNT(*) as count FROM parking_slots')
    .get() as { count: number };

  if (slotCountRow.count === 0) {
    const insertSlot = activeDb.prepare(`
      INSERT INTO parking_slots (
        id, slot_number, type, status, updated_at
      ) VALUES (?, ?, ?, 'AVAILABLE', ?)
    `);

    const now = new Date().toISOString();
    const seedSlotsTx = activeDb.transaction(() => {
      for (const slot of INITIAL_SLOT_SEEDS) {
        insertSlot.run(slot.id, slot.slotNumber, slot.type, now);
      }
    });

    seedSlotsTx();
    console.log(`[SCPM DB] Successfully seeded ${INITIAL_SLOT_SEEDS.length} parking slots (10 2W, 5 4W).`);
  }

  // 3. Check and seed college members registry only if empty
  const memberCountRow = activeDb
    .prepare('SELECT COUNT(*) as count FROM college_members')
    .get() as { count: number };

  if (memberCountRow.count === 0) {
    const insertMember = activeDb.prepare(`
      INSERT INTO college_members (
        id, name, role, department, status, pass_id, registered_vehicles_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedMembersTx = activeDb.transaction(() => {
      for (const m of INITIAL_COLLEGE_MEMBERS) {
        insertMember.run(
          m.id,
          m.name,
          m.role,
          m.department,
          m.status,
          m.passId,
          JSON.stringify(m.registeredVehicles),
          m.createdAt
        );
      }
    });

    seedMembersTx();
    console.log(`[SCPM DB] Successfully seeded ${INITIAL_COLLEGE_MEMBERS.length} default college members.`);
  }

  // 4. Non-destructive column migrations for camera_events
  const migrations = [
    'ALTER TABLE camera_events ADD COLUMN id_card_number_masked TEXT',
    'ALTER TABLE camera_events ADD COLUMN id_verification_status TEXT',
    'ALTER TABLE camera_events ADD COLUMN id_verification_reason TEXT',
    'ALTER TABLE camera_events ADD COLUMN override_reason TEXT',
  ];
  for (const sql of migrations) {
    try {
      activeDb.exec(sql);
    } catch {
      // Column already exists, safe to ignore
    }
  }

  // 5. Ensure parking_slots supports SECURITY_LOCKED in existing databases
  try {
    const slotSql = activeDb.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'parking_slots'").get() as { sql: string } | undefined;
    if (slotSql && !slotSql.sql.includes('SECURITY_LOCKED')) {
      activeDb.pragma('foreign_keys = OFF');
      activeDb.exec(`
        CREATE TABLE parking_slots_new (
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
        INSERT INTO parking_slots_new SELECT id, slot_number, type, status, current_vehicle_id, current_vehicle_number, current_owner_category, current_entry_hour, updated_at FROM parking_slots;
        DROP TABLE parking_slots;
        ALTER TABLE parking_slots_new RENAME TO parking_slots;
        CREATE INDEX IF NOT EXISTS idx_slots_type_status ON parking_slots(type, status);
      `);
      activeDb.pragma('foreign_keys = ON');
    }
  } catch (err) {
    console.warn('[SCPM DB] Notice during parking_slots status migration:', err);
  }

  return activeDb;
}

