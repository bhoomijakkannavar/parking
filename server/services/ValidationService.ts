export class BackendValidationService {
  /**
   * Normalizes vehicle license plate number:
   * Trims whitespace, converts to uppercase.
   */
  public static normalizeVehicleNumber(raw: string): string {
    if (!raw) return '';
    return raw.trim().toUpperCase().replace(/\s+/g, '');
  }

  /**
   * Canonical alphanumeric format (removes all dashes, spaces) for flexible lookup.
   */
  public static canonicalAlphanumeric(raw: string): string {
    if (!raw) return '';
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  public static maskMemberId(id: string): string {
    if (!id) return '';
    const parts = id.trim().toUpperCase().split('-');
    if (parts.length >= 3) {
      return `${parts[0]}-***-${parts[parts.length - 1]}`;
    } else if (parts.length === 2) {
      return `${parts[0]}-***`;
    }
    if (id.length <= 4) return '***';
    return `${id.slice(0, 2)}***${id.slice(-2)}`;
  }

  public static isValidHour(hour: number): boolean {
    return Number.isInteger(hour) && hour >= 0 && hour <= 23;
  }

  public static validateExitHour(
    exitHour: number,
    entryHour: number
  ): { isValid: boolean; error?: string } {
    if (!this.isValidHour(exitHour)) {
      return { isValid: false, error: 'Exit hour must be an integer between 0 and 23.' };
    }
    if (exitHour < entryHour) {
      return { isValid: false, error: 'Exit time cannot be earlier than entry time.' };
    }
    return { isValid: true };
  }
}
