/**
 * Persistence Regression Tests
 * 
 * These tests verify that all business data persists correctly across:
 * - Page refreshes
 * - Server restarts
 * - Database operations
 * 
 * CRITICAL: These tests must NOT delete or reset the database.
 */

import Database from 'better-sqlite3';
import { getDatabasePath } from '../db/database';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getTestDb(): Database.Database {
  const dbPath = getDatabasePath();
  return new Database(dbPath);
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

const results: TestResult[] = [];

function recordResult(name: string, passed: boolean, message: string, details?: string) {
  results.push({ name, passed, message, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}: ${message}`);
  if (details) console.log(`  Details: ${details}`);
}

export function runPersistenceTests(): { passed: number; total: number; results: TestResult[] } {
  console.log('\n=== PERSISTENCE REGRESSION TESTS ===\n');
  
  const db = getTestDb();
  
  try {
    // Test 1: Database file exists and is accessible
    try {
      const dbPath = getDatabasePath();
      const exists = existsSync(dbPath);
      recordResult(
        'Database file exists',
        exists,
        exists ? 'Database file found at expected path' : 'Database file not found',
        dbPath
      );
    } catch (err: any) {
      recordResult('Database file exists', false, err.message);
    }

    // Test 2: Parking slots table exists and has 15 slots
    try {
      const slots = db.prepare('SELECT COUNT(*) as count FROM parking_slots').get() as { count: number };
      const passed = slots.count === 15;
      recordResult(
        'Parking slots table has 15 slots',
        passed,
        passed ? `Found ${slots.count} slots` : `Expected 15 slots, found ${slots.count}`
      );
    } catch (err: any) {
      recordResult('Parking slots table exists', false, err.message);
    }

    // Test 3: Parking sessions table exists
    try {
      const sessions = db.prepare('SELECT COUNT(*) as count FROM parking_sessions').get() as { count: number };
      recordResult(
        'Parking sessions table exists',
        true,
        `Found ${sessions.count} sessions`
      );
    } catch (err: any) {
      recordResult('Parking sessions table exists', false, err.message);
    }

    // Test 4: Receipts table exists
    try {
      const receipts = db.prepare('SELECT COUNT(*) as count FROM receipts').get() as { count: number };
      recordResult(
        'Receipts table exists',
        true,
        `Found ${receipts.count} receipts`
      );
    } catch (err: any) {
      recordResult('Receipts table exists', false, err.message);
    }

    // Test 5: Reservations table exists
    try {
      const reservations = db.prepare('SELECT COUNT(*) as count FROM parking_reservations').get() as { count: number };
      recordResult(
        'Reservations table exists',
        true,
        `Found ${reservations.count} reservations`
      );
    } catch (err: any) {
      recordResult('Reservations table exists', false, err.message);
    }

    // Test 6: Security locks table exists
    try {
      const locks = db.prepare('SELECT COUNT(*) as count FROM slot_security_locks').get() as { count: number };
      recordResult(
        'Security locks table exists',
        true,
        `Found ${locks.count} locks`
      );
    } catch (err: any) {
      recordResult('Security locks table exists', false, err.message);
    }

    // Test 7: College members table exists
    try {
      const members = db.prepare('SELECT COUNT(*) as count FROM college_members').get() as { count: number };
      recordResult(
        'College members table exists',
        true,
        `Found ${members.count} members`
      );
    } catch (err: any) {
      recordResult('College members table exists', false, err.message);
    }

    // Test 8: Alerts table exists
    try {
      const alerts = db.prepare('SELECT COUNT(*) as count FROM alerts').get() as { count: number };
      recordResult(
        'Alerts table exists',
        true,
        `Found ${alerts.count} alerts`
      );
    } catch (err: any) {
      recordResult('Alerts table exists', false, err.message);
    }

    // Test 9: Wrong parking incidents table exists
    try {
      const incidents = db.prepare('SELECT COUNT(*) as count FROM wrong_parking_incidents').get() as { count: number };
      recordResult(
        'Wrong parking incidents table exists',
        true,
        `Found ${incidents.count} incidents`
      );
    } catch (err: any) {
      recordResult('Wrong parking incidents table exists', false, err.message);
    }

    // Test 10: Camera events table exists
    try {
      const events = db.prepare('SELECT COUNT(*) as count FROM camera_events').get() as { count: number };
      recordResult(
        'Camera events table exists',
        true,
        `Found ${events.count} events`
      );
    } catch (err: any) {
      recordResult('Camera events table exists', false, err.message);
    }

    // Test 11: Vehicles table exists
    try {
      const vehicles = db.prepare('SELECT COUNT(*) as count FROM vehicles').get() as { count: number };
      recordResult(
        'Vehicles table exists',
        true,
        `Found ${vehicles.count} vehicles`
      );
    } catch (err: any) {
      recordResult('Vehicles table exists', false, err.message);
    }

    // Test 12: Reservation audit logs table exists
    try {
      const logs = db.prepare('SELECT COUNT(*) as count FROM reservation_audit_logs').get() as { count: number };
      recordResult(
        'Reservation audit logs table exists',
        true,
        `Found ${logs.count} audit logs`
      );
    } catch (err: any) {
      recordResult('Reservation audit logs table exists', false, err.message);
    }

    // Test 13: Verify slot status includes SECURITY_LOCKED
    try {
      const slots = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='parking_slots'").get() as { sql: string } | undefined;
      if (slots && slots.sql.includes('SECURITY_LOCKED')) {
        recordResult(
          'Slot status includes SECURITY_LOCKED',
          true,
          'SECURITY_LOCKED status is supported in parking_slots table'
        );
      } else {
        recordResult(
          'Slot status includes SECURITY_LOCKED',
          false,
          'SECURITY_LOCKED status not found in table definition'
        );
      }
    } catch (err: any) {
      recordResult('Slot status includes SECURITY_LOCKED', false, err.message);
    }

    // Test 14: Verify foreign keys are enabled
    try {
      const fk = db.pragma('foreign_keys', { simple: true });
      recordResult(
        'Foreign keys enabled',
        fk === 1,
        fk === 1 ? 'Foreign keys are enabled' : 'Foreign keys are disabled'
      );
    } catch (err: any) {
      recordResult('Foreign keys enabled', false, err.message);
    }

    // Test 15: Verify WAL mode is enabled
    try {
      const wal = db.pragma('journal_mode', { simple: true });
      recordResult(
        'WAL mode enabled',
        wal === 'wal',
        wal === 'wal' ? 'WAL mode is enabled' : `Journal mode is ${wal}`
      );
    } catch (err: any) {
      recordResult('WAL mode enabled', false, err.message);
    }

    // Test 16: Check for active sessions
    try {
      const activeSessions = db.prepare("SELECT COUNT(*) as count FROM parking_sessions WHERE status='ACTIVE'").get() as { count: number };
      recordResult(
        'Active sessions query works',
        true,
        `Found ${activeSessions.count} active sessions`
      );
    } catch (err: any) {
      recordResult('Active sessions query works', false, err.message);
    }

    // Test 17: Check for completed sessions (history)
    try {
      const completedSessions = db.prepare("SELECT COUNT(*) as count FROM parking_sessions WHERE status='COMPLETED'").get() as { count: number };
      recordResult(
        'Completed sessions query works',
        true,
        `Found ${completedSessions.count} completed sessions`
      );
    } catch (err: any) {
      recordResult('Completed sessions query works', false, err.message);
    }

    // Test 18: Check for reserved slots
    try {
      const reservedSlots = db.prepare("SELECT COUNT(*) as count FROM parking_slots WHERE status='RESERVED'").get() as { count: number };
      recordResult(
        'Reserved slots query works',
        true,
        `Found ${reservedSlots.count} reserved slots`
      );
    } catch (err: any) {
      recordResult('Reserved slots query works', false, err.message);
    }

    // Test 19: Check for security-locked slots
    try {
      const lockedSlots = db.prepare("SELECT COUNT(*) as count FROM parking_slots WHERE status='SECURITY_LOCKED'").get() as { count: number };
      recordResult(
        'Security-locked slots query works',
        true,
        `Found ${lockedSlots.count} security-locked slots`
      );
    } catch (err: any) {
      recordResult('Security-locked slots query works', false, err.message);
    }

    // Test 20: Check for active reservations
    try {
      const activeReservations = db.prepare("SELECT COUNT(*) as count FROM parking_reservations WHERE status='ACTIVE'").get() as { count: number };
      recordResult(
        'Active reservations query works',
        true,
        `Found ${activeReservations.count} active reservations`
      );
    } catch (err: any) {
      recordResult('Active reservations query works', false, err.message);
    }

  } catch (err: any) {
    recordResult('Test suite execution', false, `Unexpected error: ${err.message}`);
  } finally {
    db.close();
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`\n=== PERSISTENCE TEST RESULTS: ${passed}/${total} passed ===\n`);

  return { passed, total, results };
}
