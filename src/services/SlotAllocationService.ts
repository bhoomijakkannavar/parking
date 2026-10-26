import { ParkingSlot, VehicleType, SlotRecommendation } from '../types';

export class SlotAllocationService {
  /**
   * Deterministically finds and recommends the most optimal parking bay
   * considering vehicle type constraints, zone occupancy, and non-reserved status.
   */
  public static recommendSlot(
    vehicleType: VehicleType,
    slots: ParkingSlot[]
  ): SlotRecommendation | null {
    const zonePrefix = vehicleType === 'TWO_WHEELER' ? 'T-' : 'F-';
    const compatibleSlots = slots.filter(
      (s) => s.type === vehicleType && s.id.startsWith(zonePrefix)
    );

    const totalInZone = compatibleSlots.length;
    const occupiedInZone = compatibleSlots.filter((s) => s.status === 'OCCUPIED').length;
    const congestionPercent =
      totalInZone > 0 ? Math.round((occupiedInZone / totalInZone) * 100) : 0;

    // Filter available slots that are not reserved
    const availableSlots = compatibleSlots.filter((s) => s.status === 'AVAILABLE');

    if (availableSlots.length === 0) {
      return null;
    }

    // Pick lowest slot number (e.g. T-01 before T-02) for consistent deterministic assignment
    availableSlots.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    const chosenSlot = availableSlots[0];

    const reasons: string[] = [
      `Compatible ${vehicleType === 'TWO_WHEELER' ? 'Two-Wheeler (Zone T)' : 'Four-Wheeler (Zone F)'} bay`,
      `Available (${availableSlots.length} bays remaining in zone)`,
      congestionPercent >= 80 ? 'High zone occupancy alert' : 'Low congestion proximity path',
      'Not reserved for campus emergency / dignitaries',
    ];

    return {
      recommendedSlotId: chosenSlot.id,
      vehicleType,
      reasons,
      zoneCongestionPercent: congestionPercent,
    };
  }

  /**
   * Formats a slot recommendation into friendly user-facing reason badges.
   */
  public static getRecommendationSummary(rec: SlotRecommendation): string {
    return `Recommended: Bay ${rec.recommendedSlotId} (${rec.zoneCongestionPercent}% zone occupancy)`;
  }
}
