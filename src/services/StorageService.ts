import {
  ParkingSlot,
  Vehicle,
  ParkingSession,
  Receipt,
  GateDetectionEvent,
  CollegeMember,
  Alert,
} from '../types';
import { STORAGE_KEYS, INITIAL_SLOT_DEFINITIONS } from '../constants';

export const DEFAULT_COLLEGE_MEMBERS: CollegeMember[] = [
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

export class StorageService {
  /**
   * Initializes storage structure ONLY if completely empty.
   * Never resets data on page load - the API is the source of truth.
   */
  public static initializeStorage(): void {
    try {
      // Only set initialized flag if it doesn't exist
      // Do NOT call resetToDefaults() - that would wipe cached data
      const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!isInitialized) {
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      }
    } catch (err) {
      console.warn('StorageService: localStorage not accessible, falling back to memory state', err);
    }
  }

  /**
   * Returns fresh initial 15 parking slots all AVAILABLE.
   */
  public static getInitialSlots(): ParkingSlot[] {
    return INITIAL_SLOT_DEFINITIONS.map((def) => ({
      id: def.id,
      type: def.type,
      status: 'AVAILABLE',
    }));
  }

  /**
   * Resets all data to clean default state (15 available slots, default members, no active vehicles).
   */
  public static resetToDefaults(): void {
    try {
      const initialSlots = this.getInitialSlots();
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(initialSlots));
      localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CAMERA_EVENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.COLLEGE_MEMBERS, JSON.stringify(DEFAULT_COLLEGE_MEMBERS));
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    } catch (err) {
      console.error('StorageService.resetToDefaults failed:', err);
    }
  }

  // ---- SLOTS ----

  public static getSlots(): ParkingSlot[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SLOTS);
      if (!raw) {
        const initial = this.getInitialSlots();
        this.saveSlots(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === INITIAL_SLOT_DEFINITIONS.length) {
        return parsed;
      }
      // If corrupted, reinitialize
      const initial = this.getInitialSlots();
      this.saveSlots(initial);
      return initial;
    } catch (err) {
      console.error('Failed to parse slots from localStorage:', err);
      return this.getInitialSlots();
    }
  }

  public static saveSlots(slots: ParkingSlot[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
    } catch (err) {
      console.error('Failed to save slots:', err);
    }
  }

  // ---- ACTIVE VEHICLES ----

  public static getActiveVehicles(): Vehicle[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.VEHICLES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to parse active vehicles:', err);
      return [];
    }
  }

  public static saveActiveVehicles(vehicles: Vehicle[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
    } catch (err) {
      console.error('Failed to save active vehicles:', err);
    }
  }

  // ---- PARKING SESSIONS ----

  public static getSessions(): ParkingSession[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to parse sessions:', err);
      return [];
    }
  }

  public static saveSessions(sessions: ParkingSession[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (err) {
      console.error('Failed to save sessions:', err);
    }
  }

  // ---- RECEIPTS ----

  public static getReceipts(): Receipt[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to parse receipts:', err);
      return [];
    }
  }

  public static saveReceipts(receipts: Receipt[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
    } catch (err) {
      console.error('Failed to save receipts:', err);
    }
  }

  // ---- CAMERA EVENTS ----

  public static getCameraEvents(): GateDetectionEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CAMERA_EVENTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to parse camera events:', err);
      return [];
    }
  }

  public static saveCameraEvents(events: GateDetectionEvent[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CAMERA_EVENTS, JSON.stringify(events));
    } catch (err) {
      console.error('Failed to save camera events:', err);
    }
  }

  public static addCameraEvent(event: GateDetectionEvent): void {
    try {
      const existing = this.getCameraEvents();
      // Keep up to 50 most recent events
      const updated = [event, ...existing.slice(0, 49)];
      this.saveCameraEvents(updated);
    } catch (err) {
      console.error('Failed to add camera event:', err);
    }
  }

  // ---- COLLEGE MEMBERS REGISTRY ----

  public static getCollegeMembers(): CollegeMember[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COLLEGE_MEMBERS);
      if (!raw) {
        this.saveCollegeMembers(DEFAULT_COLLEGE_MEMBERS);
        return DEFAULT_COLLEGE_MEMBERS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_COLLEGE_MEMBERS;
    } catch (err) {
      console.error('Failed to parse college members:', err);
      return DEFAULT_COLLEGE_MEMBERS;
    }
  }

  public static saveCollegeMembers(members: CollegeMember[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.COLLEGE_MEMBERS, JSON.stringify(members));
    } catch (err) {
      console.error('Failed to save college members:', err);
    }
  }

  public static addCollegeMember(member: CollegeMember): void {
    try {
      const existing = this.getCollegeMembers();
      const updated = [member, ...existing.filter((m) => m.id !== member.id)];
      this.saveCollegeMembers(updated);
    } catch (err) {
      console.error('Failed to add college member:', err);
    }
  }

  // ---- ALERTS ----

  public static getAlerts(): Alert[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ALERTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to parse alerts:', err);
      return [];
    }
  }

  public static saveAlerts(alerts: Alert[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
    } catch (err) {
      console.error('Failed to save alerts:', err);
    }
  }

  public static addAlert(alert: Alert): void {
    try {
      const existing = this.getAlerts();
      // Keep up to 50 alerts
      const updated = [alert, ...existing.slice(0, 49)];
      this.saveAlerts(updated);
    } catch (err) {
      console.error('Failed to add alert:', err);
    }
  }

  public static resolveAlert(alertId: string): void {
    try {
      const existing = this.getAlerts();
      const updated = existing.map((a) =>
        a.id === alertId ? { ...a, status: 'RESOLVED' as const } : a
      );
      this.saveAlerts(updated);
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  }

  public static clearAlerts(): void {
    try {
      this.saveAlerts([]);
    } catch (err) {
      console.error('Failed to clear alerts:', err);
    }
  }

  // ---- WRONG PARKING INCIDENTS CACHE ----

  public static getWrongParkingIncidents(): any[] {
    try {
      const data = localStorage.getItem('scpm_wrong_parking_incidents');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static saveWrongParkingIncidents(incidents: any[]): void {
    try {
      localStorage.setItem('scpm_wrong_parking_incidents', JSON.stringify(incidents));
    } catch (err) {
      console.error('Failed to save wrong parking incidents:', err);
    }
  }

  // ---- RESERVATIONS CACHE ----

  public static getReservations(): any[] {
    try {
      const data = localStorage.getItem('scpm_reservations');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static saveReservations(reservations: any[]): void {
    try {
      localStorage.setItem('scpm_reservations', JSON.stringify(reservations));
    } catch (err) {
      console.error('Failed to save reservations:', err);
    }
  }
}

