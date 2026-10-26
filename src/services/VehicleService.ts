import { Vehicle, ParkingSession, VehicleType, OwnerCategory } from '../types';
import { ValidationService } from './ValidationService';

export class VehicleService {
  /**
   * Generates a new Vehicle domain object.
   */
  public static createVehicle(
    rawVehicleNumber: string,
    vehicleType: VehicleType,
    ownerCategory: OwnerCategory,
    slotId: string,
    entryHour: number
  ): Vehicle {
    const normalized = ValidationService.normalizeVehicleNumber(rawVehicleNumber);
    return {
      id: `VEH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      vehicleNumber: normalized,
      vehicleType,
      ownerCategory,
      slotId,
      entryHour,
      status: 'PARKED',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Searches for currently active parked vehicle by vehicle plate number or slot ID.
   * Handles variations like KA-22-XY-9876, KA22XY9876, T-01, T01, etc.
   */
  public static findActiveVehicle(
    query: string,
    activeVehicles: Vehicle[]
  ): Vehicle | undefined {
    if (!query || !query.trim()) return undefined;
    const normalized = ValidationService.normalizeVehicleNumber(query);
    const cleanQuery = ValidationService.stripNonAlphanumeric(query);

    return activeVehicles.find((v) => {
      if (v.status !== 'PARKED') return false;

      const plateMatchesExact = v.vehicleNumber === normalized;
      const slotMatchesExact = v.slotId.toUpperCase() === normalized;

      if (plateMatchesExact || slotMatchesExact) return true;

      const cleanPlate = ValidationService.stripNonAlphanumeric(v.vehicleNumber);
      const cleanSlot = ValidationService.stripNonAlphanumeric(v.slotId);

      return (
        (cleanQuery.length >= 2 && cleanSlot === cleanQuery) ||
        (cleanQuery.length >= 4 && cleanPlate === cleanQuery)
      );
    });
  }

  /**
   * Searches for historical records matching a vehicle plate number across sessions.
   */
  public static findVehicleHistory(
    vehicleNumber: string,
    sessions: ParkingSession[]
  ): ParkingSession[] {
    if (!vehicleNumber || !vehicleNumber.trim()) return [];
    const normalized = ValidationService.normalizeVehicleNumber(vehicleNumber);
    const cleanTarget = ValidationService.stripNonAlphanumeric(vehicleNumber);

    return sessions.filter((s) => {
      if (s.vehicleNumber === normalized) return true;
      const cleanPlate = ValidationService.stripNonAlphanumeric(s.vehicleNumber);
      return cleanTarget.length >= 4 && cleanPlate === cleanTarget;
    });
  }
}
