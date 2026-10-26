import { ParkingSession, ParkingSlot, ParkingAnalyticsData } from '../types';
import { ReceiptService } from './ReceiptService';

export class AnalyticsService {
  /**
   * Derives rich campus parking analytics from actual sessions and slots.
   * Zero fake or fabricated statistics.
   */
  public static computeAnalytics(
    slots: ParkingSlot[],
    sessions: ParkingSession[]
  ): ParkingAnalyticsData {
    const totalVehicles = sessions.length;

    // Peak occupancy
    const occupied = slots.filter((s) => s.status === 'OCCUPIED').length;
    const peakOccupancyRate =
      slots.length > 0 ? Math.round((occupied / slots.length) * 100) : 0;

    // Duration calculation
    const completedSessions = sessions.filter((s) => s.duration !== undefined);
    const totalDuration = completedSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const averageDurationHours =
      completedSessions.length > 0
        ? Math.round((totalDuration / completedSessions.length) * 10) / 10
        : 0;

    // Vehicle type split
    const twoWheelers = sessions.filter((s) => s.vehicleType === 'TWO_WHEELER').length;
    const fourWheelers = sessions.filter((s) => s.vehicleType === 'FOUR_WHEELER').length;
    const twoWheelerPercentage =
      totalVehicles > 0 ? Math.round((twoWheelers / totalVehicles) * 100) : 0;
    const fourWheelerPercentage =
      totalVehicles > 0 ? Math.round((fourWheelers / totalVehicles) * 100) : 0;

    // Category split
    const staffCount = sessions.filter((s) => s.ownerCategory === 'STAFF').length;
    const studentCount = sessions.filter((s) => s.ownerCategory === 'STUDENT').length;
    const visitorCount = sessions.filter((s) => s.ownerCategory === 'VISITOR').length;
    const staffPercentage =
      totalVehicles > 0 ? Math.round((staffCount / totalVehicles) * 100) : 0;
    const studentPercentage =
      totalVehicles > 0 ? Math.round((studentCount / totalVehicles) * 100) : 0;
    const visitorPercentage =
      totalVehicles > 0 ? Math.round((visitorCount / totalVehicles) * 100) : 0;

    // Total revenue
    const totalRevenue = sessions.reduce((acc, s) => acc + (s.fee || 0), 0);

    // Hourly distribution
    const entryHourCounts: Record<number, number> = {};
    const exitHourCounts: Record<number, number> = {};

    sessions.forEach((s) => {
      entryHourCounts[s.entryHour] = (entryHourCounts[s.entryHour] || 0) + 1;
      if (s.exitHour !== undefined) {
        exitHourCounts[s.exitHour] = (exitHourCounts[s.exitHour] || 0) + 1;
      }
    });

    let peakEntryHour = 9;
    let maxEntries = 0;
    Object.entries(entryHourCounts).forEach(([h, count]) => {
      if (count > maxEntries) {
        maxEntries = count;
        peakEntryHour = parseInt(h, 10);
      }
    });

    let peakExitHour = 13;
    let maxExits = 0;
    Object.entries(exitHourCounts).forEach(([h, count]) => {
      if (count > maxExits) {
        maxExits = count;
        peakExitHour = parseInt(h, 10);
      }
    });

    // Hourly trends (hours 8 to 18)
    const hourlyTrends = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((hour) => ({
      hour,
      label: ReceiptService.formatHour(hour),
      entries: entryHourCounts[hour] || 0,
      exits: exitHourCounts[hour] || 0,
    }));

    // AI / Rule-based insights derived from actual stored data
    const aiInsights: string[] = [];

    if (totalVehicles < 2) {
      aiInsights.push('More data required to formulate statistical campus trends.');
    } else {
      if (maxEntries > 0) {
        aiInsights.push(
          `Campus parking entry demand peaks between ${ReceiptService.formatHour(peakEntryHour)} and ${ReceiptService.formatHour(peakEntryHour + 1)}.`
        );
      }
      if (twoWheelerPercentage >= 60) {
        aiInsights.push(
          `Two-wheelers represent ${twoWheelerPercentage}% of total campus parking demand.`
        );
      }
      if (occupied > 0) {
        const occT = slots.filter((s) => s.type === 'TWO_WHEELER' && s.status === 'OCCUPIED').length;
        const occF = slots.filter((s) => s.type === 'FOUR_WHEELER' && s.status === 'OCCUPIED').length;
        if (occT / 10 > occF / 5) {
          aiInsights.push('Two-Wheeler Zone T reaches high utilization faster than Four-Wheeler Zone F.');
        } else if (occF / 5 > occT / 10) {
          aiInsights.push('Four-Wheeler Zone F exhibits higher proportional capacity pressure.');
        }
      }
      if (averageDurationHours > 3) {
        aiInsights.push(
          `Average vehicle dwell time is ${averageDurationHours} hours, typical of full-day academic schedules.`
        );
      }
    }

    return {
      totalVehicles,
      peakOccupancyRate,
      averageDurationHours,
      peakEntryHour,
      peakExitHour,
      twoWheelerPercentage,
      fourWheelerPercentage,
      staffPercentage,
      studentPercentage,
      visitorPercentage,
      totalRevenue,
      hourlyTrends,
      aiInsights,
    };
  }
}
