/**
 * Refresh Persistence Test
 * 
 * This test simulates a page refresh scenario by:
 * 1. Creating a parking session
 * 2. Verifying it exists in the database
 * 3. Simulating a "refresh" by querying the database again
 * 4. Verifying the data still exists
 * 
 * CRITICAL: This test uses a separate test database to avoid affecting production data.
 */

import Database from 'better-sqlite3';
import { existsSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DB_PATH = join(__dirname, '..', 'data', 'test_refresh_scpm.db');

function cleanupTestDb() {
  if (existsSync(TEST_DB_PATH)) {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

function initializeTestDb(): Database.Database {
  cleanupTestDb();
  const db = new Database(TEST_DB_PATH);
  
  // Enable features
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  
  // Create schema (simplified version for testing)
  db.exec(`
    CREATE TABLE parking_slots (
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
    
    CREATE TABLE parking_sessions (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      slot_id TEXT NOT NULL,
      vehicle_number TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      owner_category TEXT NOT NULL,
      entry_hour INTEGER NOT NULL,
      exit_hour INTEGER,
      duration INTEGER,
      fee REAL,
      status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'COMPLETED')),
      entry_origin TEXT NOT NULL,
      receipt_id TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
    );
    
    CREATE TABLE receipts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      vehicle_number TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      owner_category TEXT NOT NULL,
      slot_id TEXT NOT NULL,
      entry_hour INTEGER NOT NULL,
      exit_hour INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      fee REAL NOT NULL,
      breakdown_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES parking_sessions(id)
    );
    
    CREATE TABLE parking_reservations (
      id TEXT PRIMARY KEY,
      reservation_type TEXT NOT NULL,
      slot_id TEXT NOT NULL,
      vehicle_number TEXT,
      guest_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      reason TEXT NOT NULL,
      contact_department TEXT,
      notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
      created_by TEXT NOT NULL,
      created_by_role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      checked_in_at TEXT,
      cancelled_at TEXT,
      cancelled_by TEXT,
      cancellation_reason TEXT,
      FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
    );
    
    CREATE TABLE slot_security_locks (
      id TEXT PRIMARY KEY,
      slot_id TEXT NOT NULL,
      lock_type TEXT NOT NULL CHECK(lock_type IN ('RESERVED', 'SECURITY_LOCKED')),
      reservation_id TEXT,
      locked_by TEXT NOT NULL,
      locked_by_role TEXT NOT NULL,
      reason TEXT NOT NULL,
      locked_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
    );
  `);
  
  // Seed 15 slots
  const now = new Date().toISOString();
  const slotTypes = [
    ...Array(10).fill('TWO_WHEELER'),
    ...Array(5).fill('FOUR_WHEELER')
  ];
  
  const insertSlot = db.prepare(`
    INSERT INTO parking_slots (id, slot_number, type, status, updated_at)
    VALUES (?, ?, ?, 'AVAILABLE', ?)
  `);
  
  for (let i = 0; i < 15; i++) {
    const id = i < 10 ? `T-0${i + 1}` : `F-0${i - 9}`;
    insertSlot.run(id, i + 1, slotTypes[i], now);
  }
  
  return db;
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function recordResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}: ${message}`);
}

export function runRefreshPersistenceTest(): { passed: number; total: number; results: TestResult[] } {
  console.log('\n=== REFRESH PERSISTENCE TEST ===\n');
  
  let db: Database.Database | null = null;
  
  try {
    // Step 1: Initialize test database
    db = initializeTestDb();
    recordResult('Test database initialized', true, 'Created test database with 15 slots');
    
    // Step 2: Create a parking session
    const now = new Date().toISOString();
    const sessionId = `SESS-TEST-${Date.now()}`;
    const vehicleId = `VEH-TEST-${Date.now()}`;
    const vehicleNumber = 'KA-01-TEST-1234';
    
    const createSession = db.prepare(`
      INSERT INTO parking_sessions (
        id, vehicle_id, slot_id, vehicle_number, vehicle_type, owner_category,
        entry_hour, status, entry_origin, created_at
      ) VALUES (?, ?, ?, ?, 'TWO_WHEELER', 'STUDENT', 9, 'ACTIVE', 'MANUAL', ?)
    `);
    
    createSession.run(sessionId, vehicleId, 'T-01', vehicleNumber, now);
    recordResult('Created parking session', true, `Session ${sessionId} created`);
    
    // Step 3: Update slot to OCCUPIED
    const updateSlot = db.prepare(`
      UPDATE parking_slots SET
        status = 'OCCUPIED',
        current_vehicle_id = ?,
        current_vehicle_number = ?,
        current_owner_category = 'STUDENT',
        current_entry_hour = 9,
        updated_at = ?
      WHERE id = 'T-01'
    `);
    
    updateSlot.run(vehicleId, vehicleNumber, now);
    recordResult('Updated slot to OCCUPIED', true, 'Slot T-01 marked as occupied');
    
    // Step 4: Simulate "refresh" - close and reopen database
    db.close();
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
    recordResult('Simulated database refresh', true, 'Closed and reopened database');
    
    // Step 5: Verify session still exists
    const sessionCheck = db.prepare('SELECT * FROM parking_sessions WHERE id = ?').get(sessionId);
    if (sessionCheck) {
      recordResult('Session persists after refresh', true, 'Session found in database after refresh');
    } else {
      recordResult('Session persists after refresh', false, 'Session lost after refresh');
    }
    
    // Step 6: Verify slot still OCCUPIED
    const slotCheck = db.prepare('SELECT * FROM parking_slots WHERE id = ?').get('T-01') as any;
    if (slotCheck && slotCheck.status === 'OCCUPIED') {
      recordResult('Slot status persists after refresh', true, 'Slot T-01 still OCCUPIED');
    } else {
      recordResult('Slot status persists after refresh', false, `Slot status changed to ${slotCheck?.status}`);
    }
    
    // Step 7: Create a reservation
    const reservationId = `RES-TEST-${Date.now()}`;
    const createReservation = db.prepare(`
      INSERT INTO parking_reservations (
        id, reservation_type, slot_id, guest_name, start_time, end_time,
        reason, status, created_by, created_by_role, created_at, updated_at
      ) VALUES (?, 'VIP_GUEST', 'F-01', 'Test Guest', ?, ?, 'Test reason', 'ACTIVE', 'SEC-OFF-01', 'SECURITY_OFFICER', ?, ?)
    `);
    
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    createReservation.run(reservationId, startTime, endTime, now, now);
    recordResult('Created VIP reservation', true, `Reservation ${reservationId} created`);
    
    // Step 8: Update slot to RESERVED
    const updateSlotReserved = db.prepare(`
      UPDATE parking_slots SET status = 'RESERVED', updated_at = ? WHERE id = 'F-01'
    `);
    updateSlotReserved.run(now);
    recordResult('Updated slot to RESERVED', true, 'Slot F-01 marked as reserved');
    
    // Step 9: Simulate another refresh
    db.close();
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
    recordResult('Simulated second refresh', true, 'Closed and reopened database again');
    
    // Step 10: Verify reservation persists
    const reservationCheck = db.prepare('SELECT * FROM parking_reservations WHERE id = ?').get(reservationId);
    if (reservationCheck) {
      recordResult('Reservation persists after refresh', true, 'Reservation found after refresh');
    } else {
      recordResult('Reservation persists after refresh', false, 'Reservation lost after refresh');
    }
    
    // Step 11: Verify slot still RESERVED
    const slotReservedCheck = db.prepare('SELECT * FROM parking_slots WHERE id = ?').get('F-01') as any;
    if (slotReservedCheck && slotReservedCheck.status === 'RESERVED') {
      recordResult('Reserved slot status persists', true, 'Slot F-01 still RESERVED');
    } else {
      recordResult('Reserved slot status persists', false, `Slot status changed to ${slotReservedCheck?.status}`);
    }
    
    // Step 12: Create a security lock
    const lockId = `LOCK-TEST-${Date.now()}`;
    const createLock = db.prepare(`
      INSERT INTO slot_security_locks (
        id, slot_id, lock_type, locked_by, locked_by_role, reason, locked_at, is_active
      ) VALUES (?, 'F-02', 'SECURITY_LOCKED', 'SEC-OFF-01', 'SECURITY_OFFICER', 'Security test', ?, 1)
    `);
    createLock.run(lockId, now);
    recordResult('Created security lock', true, `Lock ${lockId} created`);
    
    // Step 13: Update slot to SECURITY_LOCKED
    const updateSlotLocked = db.prepare(`
      UPDATE parking_slots SET status = 'SECURITY_LOCKED', updated_at = ? WHERE id = 'F-02'
    `);
    updateSlotLocked.run(now);
    recordResult('Updated slot to SECURITY_LOCKED', true, 'Slot F-02 marked as locked');
    
    // Step 14: Simulate third refresh
    db.close();
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
    recordResult('Simulated third refresh', true, 'Closed and reopened database third time');
    
    // Step 15: Verify lock persists
    const lockCheck = db.prepare('SELECT * FROM slot_security_locks WHERE id = ?').get(lockId);
    if (lockCheck) {
      recordResult('Security lock persists after refresh', true, 'Lock found after refresh');
    } else {
      recordResult('Security lock persists after refresh', false, 'Lock lost after refresh');
    }
    
    // Step 16: Verify slot still SECURITY_LOCKED
    const slotLockedCheck = db.prepare('SELECT * FROM parking_slots WHERE id = ?').get('F-02') as any;
    if (slotLockedCheck && slotLockedCheck.status === 'SECURITY_LOCKED') {
      recordResult('Security-locked slot status persists', true, 'Slot F-02 still SECURITY_LOCKED');
    } else {
      recordResult('Security-locked slot status persists', false, `Slot status changed to ${slotLockedCheck?.status}`);
    }
    
  } catch (err: any) {
    recordResult('Test execution', false, `Unexpected error: ${err.message}`);
    console.error(err);
  } finally {
    if (db) {
      try {
        db.close();
      } catch {
        // Ignore close errors
      }
    }
    cleanupTestDb();
  }
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`\n=== REFRESH PERSISTENCE TEST RESULTS: ${passed}/${total} passed ===\n`);
  
  return { passed, total, results };
}
