import { VehicleType, OwnerCategory, FeeCalculationResult, FeeBreakdownItem } from '../types';
import { PRICING_RULES, APP_CONFIG } from '../constants';

export class FeeCalculator {
  /**
   * Calculates parking duration in hours.
   */
  public static calculateDuration(entryHour: number, exitHour: number): number {
    return Math.max(0, exitHour - entryHour);
  }

  /**
   * Calculates fee and generates an itemized breakdown according to official CPVTS tariff rules.
   */
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

    const currency = APP_CONFIG.currencySymbol;

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

        ruleSummary = `Student (${vehicleType === 'TWO_WHEELER' ? 'Two-Wheeler' : 'Four-Wheeler'}): First ${freeLimit} hours free, then ${currency}${rate}/hour`;

        if (duration <= freeLimit) {
          totalFee = 0;
          breakdown.push({
            description: `Initial Free Allowance (${duration} hr${duration === 1 ? '' : 's'})`,
            rateInfo: `Within ${freeLimit}-hour grace period`,
            amount: 0,
          });
        } else {
          const freeHours = freeLimit;
          const chargeableHours = duration - freeLimit;
          const chargedAmount = chargeableHours * rate;
          totalFee = chargedAmount;

          breakdown.push({
            description: `First ${freeHours} Hours`,
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
        totalFee = duration * rate;
        ruleSummary = `Visitor (${vehicleType === 'TWO_WHEELER' ? 'Two-Wheeler' : 'Four-Wheeler'}): Flat rate ${currency}${rate}/hour`;

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
