import { ParkingSlot, ParkingSession, Receipt, DailyStatistics, GateDetectionEvent } from '../types';
import { TOTAL_SLOTS_COUNT, TOTAL_TWO_WHEELER_SLOTS, TOTAL_FOUR_WHEELER_SLOTS } from '../constants';

export class StatisticsService {
  /**
   * Computes live daily statistics directly from real dataset state.
   */
  public static computeDailyStatistics(
    slots: ParkingSlot[],
    sessions: ParkingSession[],
    receipts: Receipt[],
    cameraEvents: GateDetectionEvent[] = [],
    registeredVehiclesCount: number = 0,
    activeAlertsCount: number = 0
  ): DailyStatistics {
    const occupiedSlots = slots.filter((s) => s.status === 'OCCUPIED').length;
    const reservedSlots = slots.filter((s) => s.status === 'RESERVED').length;
    const securityLockedSlots = slots.filter((s) => s.status === 'SECURITY_LOCKED').length;
    const availableSlots = slots.filter((s) => s.status === 'AVAILABLE').length;

    const twoWheelerOccupied = slots.filter(
      (s) => s.type === 'TWO_WHEELER' && s.status === 'OCCUPIED'
    ).length;
    const twoWheelerAvailable = slots.filter(
      (s) => s.type === 'TWO_WHEELER' && s.status === 'AVAILABLE'
    ).length;

    const fourWheelerOccupied = slots.filter(
      (s) => s.type === 'FOUR_WHEELER' && s.status === 'OCCUPIED'
    ).length;
    const fourWheelerAvailable = slots.filter(
      (s) => s.type === 'FOUR_WHEELER' && s.status === 'AVAILABLE'
    ).length;

    const totalFeesCollected = receipts.reduce((sum, r) => sum + (r.fee || 0), 0);
    const totalCompletedCheckouts = receipts.length;
    const totalVehiclesParkedToday = sessions.length; // all registered today
    const currentlyParked = occupiedSlots;

    // Count owner categories across all sessions registered today
    const categoryCounts = sessions.reduce(
      (acc, sess) => {
        if (sess.ownerCategory === 'STAFF') acc.staff += 1;
        else if (sess.ownerCategory === 'STUDENT') acc.student += 1;
        else if (sess.ownerCategory === 'VISITOR') acc.visitor += 1;
        return acc;
      },
      { staff: 0, student: 0, visitor: 0 }
    );

    const cameraDetectionsToday = cameraEvents.length;
    const lastCameraDetection = cameraEvents.length > 0 ? cameraEvents[0] : undefined;

    return {
      totalSlots: TOTAL_SLOTS_COUNT,
      occupiedSlots,
      availableSlots,
      reservedSlots,
      securityLockedSlots,
      totalVehiclesParkedToday,
      totalCompletedCheckouts,
      totalFeesCollected,
      currentlyParked,
      cameraDetectionsToday,
      registeredVehiclesCount,
      activeAlertsCount,
      lastCameraDetection,
      twoWheelerStats: {
        total: TOTAL_TWO_WHEELER_SLOTS,
        occupied: twoWheelerOccupied,
        available: twoWheelerAvailable,
        occupancyRate: Math.round((twoWheelerOccupied / TOTAL_TWO_WHEELER_SLOTS) * 100),
      },
      fourWheelerStats: {
        total: TOTAL_FOUR_WHEELER_SLOTS,
        occupied: fourWheelerOccupied,
        available: fourWheelerAvailable,
        occupancyRate: Math.round((fourWheelerOccupied / TOTAL_FOUR_WHEELER_SLOTS) * 100),
      },
      categoryCounts,
    };
  }
}
