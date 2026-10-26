export type VehicleType = 'TWO_WHEELER' | 'FOUR_WHEELER';

export type OwnerCategory = 'STAFF' | 'STUDENT' | 'VISITOR';

export type SlotStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'SECURITY_LOCKED';

export type SessionStatus = 'ACTIVE' | 'COMPLETED';

export type GateType = 'ENTRY' | 'EXIT';

export type DetectionMode = 'LIVE' | 'DEMO';

export type CollegeRole =
  | 'Student'
  | 'Faculty'
  | 'Staff'
  | 'Administration'
  | 'Authorized Personnel';

export interface RegisteredVehicle {
  vehicleNumber: string;
  vehicleType: VehicleType;
  primary?: boolean;
}

export interface CollegeMember {
  id: string; // e.g. "STU-2024-089", "FAC-CS-102"
  name: string;
  role: CollegeRole;
  department: string;
  registeredVehicles: RegisteredVehicle[];
  status: 'ACTIVE' | 'SUSPENDED';
  passId?: string;
  createdAt: string;
}

export type GateAction =
  | 'APPROVED'
  | 'CHECKED_OUT'
  | 'DUPLICATE_REJECTED'
  | 'NOT_FOUND'
  | 'LOW_CONFIDENCE'
  | 'REJECTED_FULL'
  | 'UNREGISTERED_VEHICLE'
  | 'MANUAL_REQUIRED';

export interface BoundingBox {
  x: number; // percentage or px
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface FaceDetectionResult {
  faceDetected: boolean;
  confidence: number;
  boundingBox?: BoundingBox;
}

export interface PlateDetectionResult {
  plateNumber: string;
  confidence: number; // 0 to 100
  boundingBox?: BoundingBox;
}

export interface VehicleDetectionResult {
  vehicleDetected: boolean;
  vehicleType: VehicleType;
  confidence: number; // 0 to 100
  boundingBox?: BoundingBox;
}

export interface CameraDetection {
  id: string;
  timestamp: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  vehicleConfidence: number;
  plateConfidence: number;
  faceDetected: boolean;
  faceConfidence?: number;
  gate: 'ENTRY' | 'EXIT' | 'AUTO';
  mode: DetectionMode;
  action: GateAction;
  memberId?: string;
  memberName?: string;
  role?: CollegeRole;
  department?: string;
  isRegistered: boolean;
  slotId?: string;
  fee?: number;
  duration?: number;
  message?: string;
}

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AlertType =
  | 'DUPLICATE_ENTRY'
  | 'UNKNOWN_VEHICLE'
  | 'LOW_CONFIDENCE'
  | 'PARKING_FULL'
  | 'PARKING_ALMOST_FULL'
  | 'CAMERA_OFFLINE'
  | 'SHORT_DURATION'
  | 'WRONG_PARKING'
  | 'RESERVATION_CONFLICT'
  | 'RESERVED_SLOT_BLOCKED'
  | 'EMERGENCY_OVERRIDE';

export type WrongParkingStatus =
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'FALSE_POSITIVE'
  | 'NEEDS_REVIEW';

export interface WrongParkingIncident {
  id: string;
  vehicleNumber: string;
  vehicleNumberMasked: string;
  allocatedSlotId: string;
  detectedSlotId: string;
  cameraId: string;
  cameraZone: string;
  confidence: number;
  status: WrongParkingStatus;
  severity: AlertSeverity;
  sirenTriggered: boolean;
  sirenMuted: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
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
  incident: WrongParkingIncident | null;
  message: string;
}

export interface WrongParkingZoneConfig {
  cameraId: string;
  cameraName: string;
  zoneName: string;
  supportedSlots: string[];
  confidenceThreshold: number;
  opticalFovDescription: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details?: string;
  timestamp: string;
  status: 'UNREAD' | 'RESOLVED';
  vehicleNumber?: string;
  slotId?: string;
}

export interface SlotRecommendation {
  recommendedSlotId: string;
  vehicleType: VehicleType;
  reasons: string[];
  zoneCongestionPercent: number;
}

export interface HourlyOccupancyPrediction {
  hourStr: string; // e.g. "09:00"
  hour: number;
  projectedOccupancyPercent: number;
  status: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface ParkingAnalyticsData {
  totalVehicles: number;
  peakOccupancyRate: number;
  averageDurationHours: number;
  peakEntryHour: number;
  peakExitHour: number;
  twoWheelerPercentage: number;
  fourWheelerPercentage: number;
  staffPercentage: number;
  studentPercentage: number;
  visitorPercentage: number;
  totalRevenue: number;
  hourlyTrends: { hour: number; label: string; entries: number; exits: number }[];
  aiInsights: string[];
}

export type IdVerificationStatus =
  | 'VERIFIED'
  | 'NEEDS_REVIEW'
  | 'FAILED'
  | 'VISITOR_BYPASS'
  | 'OVERRIDDEN';

export interface IdCardDetectionResult {
  cardDetected: boolean;
  idNumber: string;
  maskedIdNumber: string;
  confidence: number;
  rawText?: string;
  boundingBox?: BoundingBox;
}

export interface IdVerificationResult {
  verified?: boolean;
  status: IdVerificationStatus;
  memberId?: string;
  maskedId?: string;
  maskedIdCardNumber?: string;
  memberName?: string;
  role?: CollegeRole;
  department?: string;
  ownerCategory: OwnerCategory;
  member?: CollegeMember | null;
  isRegistered: boolean;
  plateMatched: boolean;
  canAutoApprove: boolean;
  confidence: number;
  message: string;
  reasons: string[];
  requiresManualReview: boolean;
  isOverrideApplied?: boolean;
  overrideReason?: string;
}

export interface GateDetectionEvent {
  id: string;
  timestamp: string;
  plateNumber: string;
  vehicleType: VehicleType;
  ownerCategory?: OwnerCategory;
  gateType: GateType;
  confidence: number;
  mode: DetectionMode;
  action: GateAction;
  actionSummary: string;
  slotId?: string;
  fee?: number;
  faceDetected?: boolean;
  memberId?: string;
  memberName?: string;
  role?: CollegeRole;
  idCardNumberMasked?: string;
  idVerificationStatus?: IdVerificationStatus;
  idVerificationReason?: string;
  overrideReason?: string;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  ownerCategory: OwnerCategory;
  slotId: string;
  entryHour: number;
  status: 'PARKED' | 'EXITED';
  createdAt: string;
}

export interface ParkingSlot {
  id: string; // e.g. T-01 to T-10, F-01 to F-05
  type: VehicleType;
  status: SlotStatus;
  vehicleId?: string;
  vehicleNumber?: string;
  ownerCategory?: OwnerCategory;
  entryHour?: number;
}

export interface ParkingSession {
  id: string;
  vehicleId: string;
  slotId: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  ownerCategory: OwnerCategory;
  entryHour: number;
  exitHour?: number;
  duration?: number;
  fee?: number;
  status: SessionStatus;
  createdAt: string;
  completedAt?: string;
  receiptId?: string;
}

export interface FeeBreakdownItem {
  description: string;
  rateInfo: string;
  amount: number;
}

export interface FeeCalculationResult {
  entryHour: number;
  exitHour: number;
  duration: number;
  totalFee: number;
  breakdown: FeeBreakdownItem[];
  ruleSummary: string;
}

export interface Receipt {
  id: string;
  sessionId: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  ownerCategory: OwnerCategory;
  slotId: string;
  entryHour: number;
  exitHour: number;
  duration: number;
  fee: number;
  breakdown: FeeBreakdownItem[];
  createdAt: string;
}

export interface DailyStatistics {
  totalVehiclesParkedToday: number;
  totalCompletedCheckouts: number;
  totalFeesCollected: number;
  currentlyParked: number;
  availableSlots: number;
  occupiedSlots: number;
  totalSlots: number;
  reservedSlots?: number;
  securityLockedSlots?: number;
  activeReservationsCount?: number;
  upcomingReservationsCount?: number;
  cameraDetectionsToday?: number;
  registeredVehiclesCount?: number;
  activeAlertsCount?: number;
  activeWrongParkingCount?: number;
  lastCameraDetection?: GateDetectionEvent;
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
}

export interface VehicleEntryInput {
  vehicleNumber: string;
  vehicleType: VehicleType;
  ownerCategory: OwnerCategory;
  entryHour: number;
}

export interface CheckoutInput {
  searchKey: string; // vehicleNumber or slotId
  exitHour: number;
}

export interface OperationResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  unauthorized?: boolean;
}

export type ReservationType = 'VIP_GUEST' | 'EMERGENCY' | 'EVENT_GUEST';

export type ReservationStatus =
  | 'ACTIVE'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type SecurityRole =
  | 'SECURITY_OFFICER'
  | 'CAMPUS_OFFICIAL'
  | 'ADMIN'
  | 'REGULAR_USER';

export interface ParkingReservation {
  id: string;
  reservationType: ReservationType;
  slotId: string;
  vehicleNumber?: string;
  guestName: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  reason: string;
  contactDepartment?: string;
  notes?: string;
  status: ReservationStatus;
  createdBy: string;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
  checkedInAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
}

export interface SlotSecurityLock {
  id: string;
  slotId: string;
  lockType: 'RESERVED' | 'SECURITY_LOCKED';
  reservationId?: string;
  lockedBy: string;
  lockedByRole: string;
  reason: string;
  lockedAt: string;
  isActive: boolean;
}

export interface ReservationAuditLog {
  id: string;
  reservationId?: string;
  slotId: string;
  action: string;
  actor: string;
  actorRole: string;
  reason?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateReservationInput {
  reservationType: ReservationType;
  slotId: string;
  vehicleNumber?: string;
  guestName: string;
  startTime: string;
  endTime: string;
  reason: string;
  contactDepartment?: string;
  notes?: string;
  operatorId?: string;
  operatorRole?: string;
  securityPin?: string;
}

export interface SlotLockInput {
  slotId: string;
  lockType: 'RESERVED' | 'SECURITY_LOCKED';
  reason: string;
  reservationId?: string;
  operatorId?: string;
  operatorRole?: string;
  securityPin?: string;
}

export interface SlotUnlockInput {
  slotId: string;
  releaseReason: string;
  operatorId?: string;
  operatorRole?: string;
  securityPin?: string;
}

export interface FastTrackArrivalInput {
  vehicleNumber?: string;
  reservationId?: string;
  operatorId?: string;
  operatorRole?: string;
  securityPin?: string;
}

export interface FastTrackArrivalResult {
  status: 'FAST_TRACK_APPROVED' | 'NEEDS_REVIEW' | 'SLOT_OCCUPIED_CONFLICT' | 'EXPIRED' | 'NOT_FOUND';
  approved: boolean;
  requiresReview: boolean;
  message: string;
  reservation?: ParkingReservation;
  allocatedSlotId?: string;
  vehicleNumber?: string;
  alternativeSlots?: string[];
  session?: ParkingSession;
}


