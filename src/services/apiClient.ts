import {
  ParkingSlot,
  Vehicle,
  ParkingSession,
  Receipt,
  CollegeMember,
  GateDetectionEvent,
  Alert,
  VehicleEntryInput,
  OperationResult,
  FeeCalculationResult,
  DailyStatistics,
  WrongParkingIncident,
  WrongParkingDetectionResult,
  WrongParkingStatus,
  ParkingReservation,
  SlotSecurityLock,
  ReservationAuditLog,
  CreateReservationInput,
  SlotLockInput,
  SlotUnlockInput,
  FastTrackArrivalInput,
  FastTrackArrivalResult,
} from '../types';

const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || `HTTP ${response.status}: Request failed`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export class ApiClient {
  public static async checkHealth(): Promise<{ status: string; database: string; slotsCount: number }> {
    return request<{ status: string; database: string; slotsCount: number }>('/api/health');
  }

  public static async getDashboard(): Promise<DailyStatistics> {
    const res = await request<{ success: boolean; data: DailyStatistics }>('/api/dashboard');
    return res.data;
  }

  public static async getSlots(): Promise<ParkingSlot[]> {
    const res = await request<{ success: boolean; data: ParkingSlot[] }>('/api/slots');
    return res.data;
  }

  public static async getVehicles(status?: 'PARKED' | 'EXITED'): Promise<Vehicle[]> {
    const query = status ? `?status=${status}` : '';
    const res = await request<{ success: boolean; data: Vehicle[] }>(`/api/vehicles${query}`);
    return res.data;
  }

  public static async getVehicleByNumber(vehicleNumber: string): Promise<Vehicle | null> {
    try {
      const res = await request<{ success: boolean; data: Vehicle }>(`/api/vehicles/${encodeURIComponent(vehicleNumber)}`);
      return res.data;
    } catch {
      return null;
    }
  }

  public static async getActiveSessions(): Promise<ParkingSession[]> {
    const res = await request<{ success: boolean; data: ParkingSession[] }>('/api/sessions/active');
    return res.data;
  }

  public static async getParkingHistory(limit = 100): Promise<ParkingSession[]> {
    const res = await request<{ success: boolean; data: ParkingSession[] }>(`/api/parking/history?limit=${limit}`);
    return res.data;
  }

  public static async getReceipts(limit = 100): Promise<Receipt[]> {
    const res = await request<{ success: boolean; data: Receipt[] }>(`/api/receipts?limit=${limit}`);
    return res.data;
  }

  public static async getReceiptById(id: string): Promise<Receipt | null> {
    try {
      const res = await request<{ success: boolean; data: Receipt }>(`/api/receipts/${encodeURIComponent(id)}`);
      return res.data;
    } catch {
      return null;
    }
  }

  public static async getMembers(): Promise<CollegeMember[]> {
    const res = await request<{ success: boolean; data: CollegeMember[] }>('/api/members');
    return res.data;
  }

  public static async addMember(member: CollegeMember): Promise<void> {
    await request<{ success: boolean }>('/api/members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  }

  public static async getCameraEvents(limit = 50): Promise<GateDetectionEvent[]> {
    const res = await request<{ success: boolean; data: GateDetectionEvent[] }>(`/api/camera-events?limit=${limit}`);
    return res.data;
  }

  public static async addCameraEvent(event: GateDetectionEvent): Promise<GateDetectionEvent> {
    const res = await request<{ success: boolean; data: GateDetectionEvent }>('/api/camera-events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
    return res.data;
  }

  public static async getAlerts(limit = 50): Promise<Alert[]> {
    const res = await request<{ success: boolean; data: Alert[] }>(`/api/alerts?limit=${limit}`);
    return res.data;
  }

  public static async resolveAlert(id: string): Promise<void> {
    await request<{ success: boolean }>(`/api/alerts/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
    });
  }

  public static async verifyCollegeId(params: {
    idCardNumber?: string;
    plateNumber?: string;
    confidence?: number;
    isManualOverride?: boolean;
    overrideReason?: string;
  }): Promise<{
    success: boolean;
    verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'FAILED' | 'VISITOR_BYPASS';
    member: {
      id: string;
      maskedId: string;
      name: string;
      role: any;
      department: string;
      status: string;
      registeredVehicles: Array<{ vehicleNumber: string; vehicleType: any }>;
    } | null;
    plateMatched: boolean;
    canAutoApprove: boolean;
    confidence: number;
    message: string;
    reasons: string[];
  }> {
    const res = await request<{
      success: boolean;
      data: any;
    }>('/api/verify-id', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.data;
  }

  public static async parkVehicle(
    input: VehicleEntryInput & { origin?: 'MANUAL' | 'AI' | 'DEMO' }
  ): Promise<OperationResult<{ vehicle: Vehicle; slot: ParkingSlot; session: ParkingSession }>> {
    try {
      const res = await request<{
        success: boolean;
        message: string;
        data: { vehicle: Vehicle; slot: ParkingSlot; session: ParkingSession };
      }>('/api/parking/entry', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return {
        success: true,
        message: res.message,
        data: res.data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: msg,
        error: msg,
      };
    }
  }

  public static async checkoutVehicle(
    searchKey: string,
    exitHour: number
  ): Promise<
    OperationResult<{
      session: ParkingSession;
      receipt: Receipt;
      feeResult: FeeCalculationResult;
    }>
  > {
    try {
      const res = await request<{
        success: boolean;
        message: string;
        data: {
          session: ParkingSession;
          receipt: Receipt;
          feeResult: FeeCalculationResult;
        };
      }>('/api/parking/exit', {
        method: 'POST',
        body: JSON.stringify({ searchKey, exitHour }),
      });
      return {
        success: true,
        message: res.message,
        data: res.data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: msg,
        error: msg,
      };
    }
  }

  public static async seedDemoData(): Promise<void> {
    await request<{ success: boolean }>('/api/system/seed', {
      method: 'POST',
    });
  }

  public static async resetSystem(): Promise<void> {
    await request<{ success: boolean }>('/api/system/reset', {
      method: 'POST',
    });
  }

  // ---- WRONG PARKING DETECTION & INCIDENTS ----

  public static async detectWrongParking(payload: {
    vehicleNumber: string;
    detectedSlotId: string;
    confidence?: number;
    cameraId?: string;
    cameraZone?: string;
    confidenceThreshold?: number;
    isDemo?: boolean;
  }): Promise<{ success: boolean; data: WrongParkingDetectionResult }> {
    return request<{ success: boolean; data: WrongParkingDetectionResult }>('/api/wrong-parking/detect', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async getWrongParkingIncidents(
    limit = 50,
    status?: WrongParkingStatus
  ): Promise<WrongParkingIncident[]> {
    const q = status ? `?limit=${limit}&status=${status}` : `?limit=${limit}`;
    const res = await request<{ success: boolean; data: WrongParkingIncident[] }>(`/api/wrong-parking/incidents${q}`);
    return res.data;
  }

  public static async acknowledgeWrongParkingIncident(
    id: string,
    payload: { operatorRole?: string; operatorId?: string; notes?: string }
  ): Promise<{ success: boolean; message: string; incident?: WrongParkingIncident }> {
    return request<{ success: boolean; message: string; incident?: WrongParkingIncident }>(
      `/api/wrong-parking/incidents/${id}/acknowledge`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  public static async resolveWrongParkingIncident(
    id: string,
    payload: { operatorRole?: string; operatorId?: string; notes?: string; isFalsePositive?: boolean }
  ): Promise<{ success: boolean; message: string; incident?: WrongParkingIncident }> {
    return request<{ success: boolean; message: string; incident?: WrongParkingIncident }>(
      `/api/wrong-parking/incidents/${id}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  public static async muteWrongParkingIncident(
    id: string,
    payload?: { operatorRole?: string; operatorId?: string; reason?: string }
  ): Promise<{ success: boolean; message: string; incident?: WrongParkingIncident }> {
    return request<{ success: boolean; message: string; incident?: WrongParkingIncident }>(
      `/api/wrong-parking/incidents/${id}/mute`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }
    );
  }

  public static async testWrongParkingAlarm(): Promise<{ success: boolean; message: string; notice: string }> {
    return request<{ success: boolean; message: string; notice: string }>('/api/wrong-parking/alarm/test', {
      method: 'POST',
    });
  }

  // ---- VIP & EMERGENCY PRIORITY RESERVATIONS ----

  public static async getReservations(filter?: {
    status?: string;
    reservationType?: string;
    slotId?: string;
    searchQuery?: string;
    limit?: number;
  }): Promise<ParkingReservation[]> {
    const params = new URLSearchParams();
    if (filter?.status) params.append('status', filter.status);
    if (filter?.reservationType) params.append('reservationType', filter.reservationType);
    if (filter?.slotId) params.append('slotId', filter.slotId);
    if (filter?.searchQuery) params.append('searchQuery', filter.searchQuery);
    if (filter?.limit) params.append('limit', String(filter.limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await request<{ success: boolean; data: any[] }>(`/api/reservations${qs}`);
    return res.data.map((r) => ({
      id: r.id,
      reservationType: r.reservation_type,
      slotId: r.slot_id,
      vehicleNumber: r.vehicle_number || undefined,
      guestName: r.guest_name,
      startTime: r.start_time,
      endTime: r.end_time,
      reason: r.reason,
      contactDepartment: r.contact_department || undefined,
      notes: r.notes || undefined,
      status: r.status,
      createdBy: r.created_by,
      createdByRole: r.created_by_role,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      checkedInAt: r.checked_in_at || undefined,
      cancelledAt: r.cancelled_at || undefined,
      cancelledBy: r.cancelled_by || undefined,
      cancellationReason: r.cancellation_reason || undefined,
    }));
  }

  public static async getReservationById(id: string): Promise<ParkingReservation | null> {
    try {
      const res = await request<{ success: boolean; data: any }>(`/api/reservations/${id}`);
      const r = res.data;
      return {
        id: r.id,
        reservationType: r.reservation_type,
        slotId: r.slot_id,
        vehicleNumber: r.vehicle_number || undefined,
        guestName: r.guest_name,
        startTime: r.start_time,
        endTime: r.end_time,
        reason: r.reason,
        contactDepartment: r.contact_department || undefined,
        notes: r.notes || undefined,
        status: r.status,
        createdBy: r.created_by,
        createdByRole: r.created_by_role,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        checkedInAt: r.checked_in_at || undefined,
        cancelledAt: r.cancelled_at || undefined,
        cancelledBy: r.cancelled_by || undefined,
        cancellationReason: r.cancellation_reason || undefined,
      };
    } catch {
      return null;
    }
  }

  public static async createReservation(
    payload: CreateReservationInput
  ): Promise<OperationResult<ParkingReservation>> {
    try {
      const res = await request<{
        success: boolean;
        message: string;
        reservation?: any;
        unauthorized?: boolean;
        conflict?: boolean;
      }>('/api/reservations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        return {
          success: false,
          message: res.message,
          error: res.message,
          unauthorized: res.unauthorized,
        };
      }

      const r = res.reservation;
      return {
        success: true,
        message: res.message,
        data: {
          id: r.id,
          reservationType: r.reservation_type,
          slotId: r.slot_id,
          vehicleNumber: r.vehicle_number || undefined,
          guestName: r.guest_name,
          startTime: r.start_time,
          endTime: r.end_time,
          reason: r.reason,
          contactDepartment: r.contact_department || undefined,
          notes: r.notes || undefined,
          status: r.status,
          createdBy: r.created_by,
          createdByRole: r.created_by_role,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: msg,
        error: msg,
      };
    }
  }

  public static async cancelReservation(
    id: string,
    payload: { reason: string; operatorRole?: string; operatorId?: string; securityPin?: string }
  ): Promise<OperationResult<ParkingReservation>> {
    try {
      const res = await request<{
        success: boolean;
        message: string;
        reservation?: any;
        unauthorized?: boolean;
      }>(`/api/reservations/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return {
        success: res.success,
        message: res.message,
        unauthorized: res.unauthorized,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg, error: msg };
    }
  }

  public static async getSecurityLocks(): Promise<SlotSecurityLock[]> {
    try {
      const res = await request<{ success: boolean; data: any[] }>('/api/slots/locks');
      return res.data.map((l) => ({
        id: l.id,
        slotId: l.slot_id,
        lockType: l.lock_type,
        reservationId: l.reservation_id || undefined,
        lockedBy: l.locked_by,
        lockedByRole: l.locked_by_role,
        reason: l.reason,
        lockedAt: l.locked_at,
        isActive: Boolean(l.is_active),
      }));
    } catch {
      return [];
    }
  }

  public static async lockSlot(
    slotId: string,
    payload: SlotLockInput
  ): Promise<OperationResult<{ slot: ParkingSlot; lock: SlotSecurityLock }>> {
    try {
      const res = await request<{
        success: boolean;
        message: string;
        slot?: any;
        lock?: any;
        unauthorized?: boolean;
      }>(`/api/slots/${slotId}/lock`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return {
        success: res.success,
        message: res.message,
        unauthorized: res.unauthorized,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg, error: msg };
    }
  }

  public static async unlockSlot(
    slotId: string,
    payload: SlotUnlockInput
  ): Promise<OperationResult<ParkingSlot>> {
    try {
      const res = await request<{
        success: boolean;
        message: string;
        slot?: any;
        unauthorized?: boolean;
      }>(`/api/slots/${slotId}/unlock`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return {
        success: res.success,
        message: res.message,
        unauthorized: res.unauthorized,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg, error: msg };
    }
  }

  public static async processFastTrackArrival(
    payload: FastTrackArrivalInput
  ): Promise<FastTrackArrivalResult> {
    return request<FastTrackArrivalResult>('/api/reservations/fast-track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async getReservationAuditLogs(limit: number = 100): Promise<ReservationAuditLog[]> {
    try {
      const res = await request<{ success: boolean; data: any[] }>(`/api/reservations/audit-logs?limit=${limit}`);
      return res.data.map((a) => ({
        id: a.id,
        reservationId: a.reservation_id || undefined,
        slotId: a.slot_id,
        action: a.action,
        actor: a.actor,
        actorRole: a.actor_role,
        reason: a.reason || undefined,
        details: a.details_json ? JSON.parse(a.details_json) : undefined,
        createdAt: a.created_at,
      }));
    } catch {
      return [];
    }
  }
}

