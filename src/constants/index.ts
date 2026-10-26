import { VehicleType, OwnerCategory, CollegeRole } from '../types';

export const APP_CONFIG = {
  appName: 'Smart Campus Parking Management',
  shortName: 'SCPM',
  systemTitle: 'Smart Campus Parking Management',
  systemAcronym: 'SCPM',
  tagline: 'Intelligent Campus Parking & Vehicle Tracking',
  collegeName: 'National Institute of Technology Campus',
  version: '3.0.0',
  currencySymbol: '₹',
};

export const INITIAL_SLOT_DEFINITIONS: { id: string; type: VehicleType }[] = [
  // Two-Wheeler Zone (T-01 to T-10)
  { id: 'T-01', type: 'TWO_WHEELER' },
  { id: 'T-02', type: 'TWO_WHEELER' },
  { id: 'T-03', type: 'TWO_WHEELER' },
  { id: 'T-04', type: 'TWO_WHEELER' },
  { id: 'T-05', type: 'TWO_WHEELER' },
  { id: 'T-06', type: 'TWO_WHEELER' },
  { id: 'T-07', type: 'TWO_WHEELER' },
  { id: 'T-08', type: 'TWO_WHEELER' },
  { id: 'T-09', type: 'TWO_WHEELER' },
  { id: 'T-10', type: 'TWO_WHEELER' },

  // Four-Wheeler Zone (F-01 to F-05)
  { id: 'F-01', type: 'FOUR_WHEELER' },
  { id: 'F-02', type: 'FOUR_WHEELER' },
  { id: 'F-03', type: 'FOUR_WHEELER' },
  { id: 'F-04', type: 'FOUR_WHEELER' },
  { id: 'F-05', type: 'FOUR_WHEELER' },
];

export const TOTAL_SLOTS_COUNT = INITIAL_SLOT_DEFINITIONS.length; // 15
export const TOTAL_TWO_WHEELER_SLOTS = 10;
export const TOTAL_FOUR_WHEELER_SLOTS = 5;

export const PRICING_RULES = {
  STAFF: {
    TWO_WHEELER: { freeHours: Infinity, hourlyRate: 0 },
    FOUR_WHEELER: { freeHours: Infinity, hourlyRate: 0 },
    description: 'Staff complimentary campus parking',
  },
  STUDENT: {
    TWO_WHEELER: { freeHours: 2, hourlyRate: 10 },
    FOUR_WHEELER: { freeHours: 2, hourlyRate: 20 },
    description: 'First 2 hours free, standard student rate thereafter',
  },
  VISITOR: {
    TWO_WHEELER: { freeHours: 0, hourlyRate: 20 },
    FOUR_WHEELER: { freeHours: 0, hourlyRate: 40 },
    description: 'Standard visitor hourly tariff',
  },
} as const;

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  TWO_WHEELER: 'Two-Wheeler',
  FOUR_WHEELER: 'Four-Wheeler',
};

export const OWNER_CATEGORY_LABELS: Record<OwnerCategory, string> = {
  STAFF: 'Staff',
  STUDENT: 'Student',
  VISITOR: 'Visitor',
};

export const COLLEGE_ROLES: CollegeRole[] = [
  'Student',
  'Faculty',
  'Staff',
  'Administration',
  'Authorized Personnel',
];

export const STORAGE_KEYS = {
  SLOTS: 'scpm_parking_slots_v1',
  VEHICLES: 'scpm_active_vehicles_v1',
  SESSIONS: 'scpm_parking_sessions_v1',
  RECEIPTS: 'scpm_receipts_v1',
  CAMERA_EVENTS: 'scpm_camera_events_v1',
  COLLEGE_MEMBERS: 'scpm_college_members_v1',
  ALERTS: 'scpm_alerts_v1',
  INITIALIZED: 'scpm_initialized_v2',
};

// UI Theme tokens: Bright Green + White Premium Identity
export const THEME_COLORS = {
  white: '#FFFFFF',
  brightMint: '#D9FBE5',
  lightGreen: '#C8F1D5',
  softSage: '#A8DDB8',
  primaryGreen: '#3F8F5B',
  darkGreenText: '#185C36',
  veryLightGreenBackground: '#F1FBF4',
  secondaryGreen: '#68B77D',
  primaryText: '#183025',
  mutedText: '#5E7165',
  borders: '#D5EBDD',
  warning: '#B7791F',
  danger: '#B45353',
  info: '#3F8F5B',
};
