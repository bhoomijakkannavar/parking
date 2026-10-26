import { Vehicle, VehicleEntryInput } from '../types';

export class ValidationService {
  /**
   * Normalizes license plate number to uppercase and trims unnecessary spaces.
   */
  public static normalizeVehicleNumber(rawNumber: string): string {
    if (!rawNumber) return '';
    return rawNumber
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Returns clean alphanumeric plate without any symbols or dashes.
   */
  public static stripNonAlphanumeric(raw: string): string {
    if (!raw) return '';
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Masks sensitive college member ID for secure display (e.g. STU-2023-045 -> STU-***-045)
   */
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

  /**
   * Validates vehicle registration number.
   * Allows formats like KA-22-XY-9876, KA22AB1234, DL01AB1234, etc.
   */
  public static validateVehicleNumber(rawNumber: string): { isValid: boolean; error?: string } {
    if (!rawNumber || rawNumber.trim().length === 0) {
      return { isValid: false, error: 'Vehicle number is required.' };
    }

    const normalized = this.normalizeVehicleNumber(rawNumber);
    const cleanPlate = this.stripNonAlphanumeric(normalized);

    if (cleanPlate.length < 4 || cleanPlate.length > 12) {
      return {
        isValid: false,
        error: 'Vehicle number must contain between 4 and 12 alphanumeric characters.',
      };
    }

    const plateRegex = /^[A-Z0-9-]+$/;
    if (!plateRegex.test(normalized)) {
      return {
        isValid: false,
        error: 'Vehicle number may only contain uppercase letters, digits, and hyphens.',
      };
    }

    return { isValid: true };
  }

  /**
   * Validates entry hour (must be an integer from 0 to 23).
   */
  public static validateEntryHour(entryHour: number | string): { isValid: boolean; error?: string; value: number } {
    const parsed = typeof entryHour === 'string' ? parseInt(entryHour, 10) : entryHour;

    if (isNaN(parsed) || !Number.isInteger(parsed)) {
      return { isValid: false, error: 'Entry hour must be a valid integer.', value: 0 };
    }

    if (parsed < 0 || parsed > 23) {
      return { isValid: false, error: 'Entry hour must be between 0 and 23 (24-hour format).', value: parsed };
    }

    return { isValid: true, value: parsed };
  }

  /**
   * Validates exit hour (must be an integer from 0 to 23 and >= entryHour).
   */
  public static validateExitHour(
    exitHour: number | string,
    entryHour: number
  ): { isValid: boolean; error?: string; value: number } {
    const parsed = typeof exitHour === 'string' ? parseInt(exitHour, 10) : exitHour;

    if (isNaN(parsed) || !Number.isInteger(parsed)) {
      return { isValid: false, error: 'Exit hour must be a valid integer.', value: 0 };
    }

    if (parsed < 0 || parsed > 23) {
      return { isValid: false, error: 'Exit hour must be between 0 and 23 (24-hour format).', value: parsed };
    }

    if (parsed < entryHour) {
      return { isValid: false, error: 'Exit time cannot be earlier than entry time.', value: parsed };
    }

    return { isValid: true, value: parsed };
  }

  /**
   * Checks if a vehicle with the same normalized number is already actively parked.
   * Compares both direct string and clean alphanumeric equivalent.
   */
  public static checkDuplicateVehicle(
    normalizedNumber: string,
    activeVehicles: Vehicle[]
  ): { isDuplicate: boolean; parkedSlotId?: string } {
    const targetClean = this.stripNonAlphanumeric(normalizedNumber);

    const existing = activeVehicles.find((v) => {
      if (v.status !== 'PARKED') return false;
      const vehicleClean = this.stripNonAlphanumeric(v.vehicleNumber);
      return v.vehicleNumber === normalizedNumber || (targetClean.length > 0 && vehicleClean === targetClean);
    });

    if (existing) {
      return { isDuplicate: true, parkedSlotId: existing.slotId };
    }

    return { isDuplicate: false };
  }

  /**
   * Comprehensive validation for entry submission.
   */
  public static validateEntryForm(
    input: VehicleEntryInput,
    activeVehicles: Vehicle[]
  ): { isValid: boolean; error?: string; normalizedNumber: string; parsedHour: number } {
    // 1. Vehicle number check
    const numberValidation = this.validateVehicleNumber(input.vehicleNumber);
    if (!numberValidation.isValid) {
      return { isValid: false, error: numberValidation.error, normalizedNumber: '', parsedHour: 0 };
    }

    const normalizedNumber = this.normalizeVehicleNumber(input.vehicleNumber);

    // 2. Duplicate active vehicle check
    const duplicateCheck = this.checkDuplicateVehicle(normalizedNumber, activeVehicles);
    if (duplicateCheck.isDuplicate) {
      return {
        isValid: false,
        error: `Vehicle is already parked in slot ${duplicateCheck.parkedSlotId}.`,
        normalizedNumber,
        parsedHour: 0,
      };
    }

    // 3. Vehicle type check
    if (!input.vehicleType || !['TWO_WHEELER', 'FOUR_WHEELER'].includes(input.vehicleType)) {
      return { isValid: false, error: 'Please select a valid vehicle type.', normalizedNumber, parsedHour: 0 };
    }

    // 4. Owner category check
    if (!input.ownerCategory || !['STAFF', 'STUDENT', 'VISITOR'].includes(input.ownerCategory)) {
      return { isValid: false, error: 'Please select a valid owner category.', normalizedNumber, parsedHour: 0 };
    }

    // 5. Entry hour check
    const hourValidation = this.validateEntryHour(input.entryHour);
    if (!hourValidation.isValid) {
      return { isValid: false, error: hourValidation.error, normalizedNumber, parsedHour: 0 };
    }

    return { isValid: true, normalizedNumber, parsedHour: hourValidation.value };
  }
}
