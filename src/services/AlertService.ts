import { Alert, AlertSeverity, AlertType, ParkingSlot } from '../types';
import { StorageService } from './StorageService';
import { ApiClient } from './apiClient';

export class AlertService {
  /**
   * Retrieves all alerts sorted with newest first.
   */
  public static getAllAlerts(): Alert[] {
    return StorageService.getAlerts();
  }

  /**
   * Returns count of unread/active alerts.
   */
  public static getUnreadCount(): number {
    return this.getAllAlerts().filter((a) => a.status === 'UNREAD').length;
  }

  /**
   * Dispatches a new system or anomaly alert.
   */
  public static triggerAlert(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    details?: string,
    vehicleNumber?: string,
    slotId?: string
  ): Alert {
    const alert: Alert = {
      id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      severity,
      message,
      details,
      timestamp: new Date().toISOString(),
      status: 'UNREAD',
      vehicleNumber,
      slotId,
    };

    StorageService.addAlert(alert);
    return alert;
  }

  /**
   * Evaluates zone occupancy and emits warning if congestion exceeds 80%.
   */
  public static checkZoneCapacityAnomaly(slots: ParkingSlot[]): void {
    const occupied = slots.filter((s) => s.status === 'OCCUPIED').length;
    const total = slots.length;
    const occupancyPercent = total > 0 ? (occupied / total) * 100 : 0;

    if (occupancyPercent >= 100) {
      this.triggerAlert(
        'PARKING_FULL',
        'CRITICAL',
        'All campus parking bays are currently occupied (15/15 bays).',
        'Redirect incoming vehicles to overflow lot.'
      );
    } else if (occupancyPercent >= 80) {
      // Check if recent alert already exists to prevent duplicate spamming
      const existing = this.getAllAlerts().find(
        (a) =>
          a.type === 'PARKING_ALMOST_FULL' &&
          a.status === 'UNREAD' &&
          Date.now() - new Date(a.timestamp).getTime() < 300000 // 5 mins
      );

      if (!existing) {
        this.triggerAlert(
          'PARKING_ALMOST_FULL',
          'WARNING',
          `High campus parking occupancy (${occupied}/${total} bays occupied - ${Math.round(occupancyPercent)}%).`,
          `${total - occupied} slots remaining available.`
        );
      }
    }
  }

  /**
   * Marks an alert as resolved.
   */
  public static resolve(alertId: string): void {
    StorageService.resolveAlert(alertId);
    ApiClient.resolveAlert(alertId).catch(() => {});
  }

  /**
   * Clears all alerts from storage.
   */
  public static clearAll(): void {
    StorageService.clearAlerts();
  }
}
