export type VehicleType = 'TWO_WHEELER' | 'FOUR_WHEELER';
export type OwnerCategory = 'STAFF' | 'STUDENT' | 'VISITOR';

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

export class BackendFeeCalculator {
  public static calculateDuration(entryHour: number, exitHour: number): number {
    return Math.max(0, exitHour - entryHour);
  }

  public static calculateFee(
    vehicleType: VehicleType,
    ownerCategory: OwnerCategory,
    entryHour: number,
    exitHour: number
  ): FeeCalculationResult {
    const duration = this.calculateDuration(entryHour, exitHour);
    const breakdown: FeeBreakdownItem[] = [];
    let totalFee = 0;
    let ruleSummary = '';
    const currency = '₹';

    switch (ownerCategory) {
      case 'STAFF': {
        totalFee = 0;
        ruleSummary = 'Staff Member: Complimentary campus parking (100% discount applied)';
        breakdown.push({
          description: 'Staff Campus Privilege',
          rateInfo: `${duration} Hour(s) @ ${currency}0/hr`,
          amount: 0,
        });
        break;
      }

      case 'STUDENT': {
        const rateConfig = PRICING_RULES.STUDENT[vehicleType];
        const freeLimit = rateConfig.freeHours;
        const rate = rateConfig.hourlyRate;
        const typeLabel = vehicleType === 'TWO_WHEELER' ? 'Two-Wheeler' : 'Four-Wheeler';

        ruleSummary = `Student (${typeLabel}): First ${freeLimit} hours free, then ${currency}${rate}/hour`;

        if (duration <= freeLimit) {
          totalFee = 0;
          breakdown.push({
            description: `Initial Free Allowance (${duration} hr${duration === 1 ? '' : 's'})`,
            rateInfo: `Within ${freeLimit}-hour grace period`,
            amount: 0,
          });
        } else {
          const chargeableHours = duration - freeLimit;
          const chargedAmount = chargeableHours * rate;
          totalFee = chargedAmount;

          breakdown.push({
            description: `First ${freeLimit} Hours`,
            rateInfo: 'Free Allowance',
            amount: 0,
          });

          breakdown.push({
            description: `Next ${chargeableHours} Hour(s)`,
            rateInfo: `${chargeableHours} × ${currency}${rate}/hr`,
            amount: chargedAmount,
          });
        }
        break;
      }

      case 'VISITOR': {
        const rateConfig = PRICING_RULES.VISITOR[vehicleType];
        const rate = rateConfig.hourlyRate;
        const typeLabel = vehicleType === 'TWO_WHEELER' ? 'Two-Wheeler' : 'Four-Wheeler';
        totalFee = duration * rate;
        ruleSummary = `Visitor (${typeLabel}): Flat rate ${currency}${rate}/hour`;

        breakdown.push({
          description: `Visitor Parking (${duration} hr${duration === 1 ? '' : 's'})`,
          rateInfo: `${duration} × ${currency}${rate}/hr`,
          amount: totalFee,
        });
        break;
      }

      default: {
        totalFee = 0;
        ruleSummary = 'Standard Tariff';
      }
    }

    return {
      entryHour,
      exitHour,
      duration,
      totalFee,
      breakdown,
      ruleSummary,
    };
  }
}
