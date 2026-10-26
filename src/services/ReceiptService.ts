import { Receipt, ParkingSession, FeeCalculationResult } from '../types';

export class ReceiptService {
  /**
   * Generates a unique, standardized receipt ID for audit tracking.
   */
  public static generateReceiptId(): string {
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const timePart = Date.now().toString().slice(-4);
    return `CPVTS-REC-${timePart}-${randomPart}`;
  }

  /**
   * Constructs a complete Receipt entity from session and calculated fee details.
   */
  public static createReceipt(
    session: ParkingSession,
    feeResult: FeeCalculationResult
  ): Receipt {
    return {
      id: this.generateReceiptId(),
      sessionId: session.id,
      vehicleNumber: session.vehicleNumber,
      vehicleType: session.vehicleType,
      ownerCategory: session.ownerCategory,
      slotId: session.slotId,
      entryHour: session.entryHour,
      exitHour: feeResult.exitHour,
      duration: feeResult.duration,
      fee: feeResult.totalFee,
      breakdown: feeResult.breakdown,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Formats numeric 24-hr hour into a clean 12-hr AM/PM string like "09:00 AM".
   */
  public static formatHour(hour: number): string {
    const normalizedHour = ((Math.floor(hour) % 24) + 24) % 24;
    const period = normalizedHour >= 12 ? 'PM' : 'AM';
    const hour12 = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
    const padded = hour12.toString().padStart(2, '0');
    return `${padded}:00 ${period}`;
  }
}
