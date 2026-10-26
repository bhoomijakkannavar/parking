import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ParkingSlot, ParkingSession, DailyStatistics } from '../../types';
import { APP_CONFIG } from '../../constants';
import { AnalyticsService } from '../../services/AnalyticsService';
import { PredictionService } from '../../services/PredictionService';
import { ReceiptService } from '../../services/ReceiptService';
import {
  TrendingUp,
  Clock,
  Car,
  Bike,
  Sparkles,
  Download,
  AlertTriangle,
  Users,
  CheckCircle2,
} from 'lucide-react';

interface AnalyticsViewProps {
  stats: DailyStatistics;
  slots: ParkingSlot[];
  sessions: ParkingSession[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  slots,
  sessions,
}) => {
  const analytics = useMemo(
    () => AnalyticsService.computeAnalytics(slots, sessions),
    [slots, sessions]
  );

  const predictionsData = useMemo(
    () => PredictionService.generateHourlyPredictions(slots, sessions),
    [slots, sessions]
  );

  const handleExportCSV = () => {
    if (sessions.length === 0) {
      alert('No parking session records available to export.');
      return;
    }

    const headers = [
      'Session ID',
      'Vehicle Number',
      'Vehicle Type',
      'Owner Category',
      'Slot ID',
      'Entry Hour',
      'Exit Hour',
      'Duration (Hours)',
      'Fee (INR)',
      'Status',
      'Created At',
    ];

    const rows = sessions.map((s) => [
      s.id,
      s.vehicleNumber,
      s.vehicleType,
      s.ownerCategory,
      s.slotId,
      s.entryHour,
      s.exitHour !== undefined ? s.exitHour : '',
      s.duration !== undefined ? s.duration : '',
      s.fee !== undefined ? s.fee : 0,
      s.status,
      s.createdAt,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `scpm_campus_parking_report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & CSV Export */}
      <div className="card-classic p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#3F7D58] animate-camera-pulse"></span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#66736B]">
              Campus Intelligence Engine
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#18231D] tracking-tight">
            Analytics & Forecasting
          </h2>
          <p className="text-xs text-[#66736B] mt-0.5">
            Dwell times, hourly demand forecasting, and fleet distribution.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="btn-secondary-white px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-[#66736B]" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-classic card-interactive p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#66736B] block mb-1">
            Peak Capacity Rate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#3F7D58]">
              {analytics.peakOccupancyRate}%
            </span>
            <span className="text-xs text-[#66736B]">live peak</span>
          </div>
        </div>

        <div className="card-classic card-interactive p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#66736B] block mb-1">
            Average Dwell Time
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#18231D]">
              {analytics.averageDurationHours}
            </span>
            <span className="text-xs text-[#66736B]">hours</span>
          </div>
        </div>

        <div className="card-classic card-interactive p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#66736B] block mb-1">
            Peak Ingress Window
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#18231D]">
              {ReceiptService.formatHour(analytics.peakEntryHour)}
            </span>
            <span className="text-xs text-[#66736B]">rush hour</span>
          </div>
        </div>

        <div className="card-classic card-interactive p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#66736B] block mb-1">
            Audited Revenue
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#18231D]">
              {APP_CONFIG.currencySymbol}{analytics.totalRevenue}
            </span>
            <span className="text-xs text-[#285C3F] font-medium">settled</span>
          </div>
        </div>
      </div>

      {/* 3. Predictive Hourly Occupancy Curve: Animated Bars with Framer Motion */}
      <div className="card-classic p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E4EAE6]">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#3F7D58]" />
              <h3 className="font-bold text-sm text-[#18231D]">
                Hourly Occupancy Projection Curve
              </h3>
            </div>
            <p className="text-xs text-[#66736B] mt-0.5">
              Forecasted demand curve across operating hours (08:00 AM to 06:00 PM).
            </p>
          </div>

          {predictionsData.peakWarning && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FEF9E7] text-[#B7791F] border border-[#FCE8B2] text-xs font-medium self-start sm:self-auto">
              <AlertTriangle className="w-3.5 h-3.5 text-[#B7791F]" />
              <span>{predictionsData.peakWarning}</span>
            </div>
          )}
        </div>

        {predictionsData.hasSufficientData ? (
          <div className="pt-2">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 items-end h-40 pt-4">
              {predictionsData.predictions.map((p, idx) => {
                const heightPercent = p.projectedOccupancyPercent;
                return (
                  <div key={p.hour} className="flex flex-col items-center h-full justify-end group">
                    <span className="text-[10px] font-mono font-medium text-[#66736B] mb-1">
                      {p.projectedOccupancyPercent}%
                    </span>
                    <div className="w-full bg-[#F7F9F8] border border-[#E4EAE6] rounded-t-xl h-28 relative overflow-hidden flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.04, ease: 'easeOut' }}
                        className={`w-full rounded-t-lg transition-colors ${
                          p.status === 'CRITICAL'
                            ? 'bg-[#B45353]'
                            : p.status === 'HIGH'
                            ? 'bg-[#B7791F]'
                            : 'bg-[#3F7D58]'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#66736B] mt-2">
                      {p.hourStr}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#66736B] pt-3 mt-3 border-t border-[#E4EAE6]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3F7D58]"></span>
                <span>Normal (&lt; 75%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#B7791F]"></span>
                <span>Moderate (75%–89%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#B45353]"></span>
                <span>Peak (&ge; 90%)</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-[#AAB7AF] text-xs">
            Collecting parking telemetry for predictive projections...
          </div>
        )}
      </div>

      {/* 4. Split Demographics & Rules Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category & Fleet Breakdown */}
        <div className="card-classic p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E4EAE6]">
            <Users className="w-4 h-4 text-[#3F7D58]" />
            <h3 className="font-bold text-sm text-[#18231D]">
              Fleet Demographics
            </h3>
          </div>

          {/* 2W vs 4W Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-[#18231D] flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-[#3F7D58]" />
                Two-Wheelers ({analytics.twoWheelerPercentage}%)
              </span>
              <span className="font-medium text-[#18231D] flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-[#3F7D58]" />
                Four-Wheelers ({analytics.fourWheelerPercentage}%)
              </span>
            </div>
            <div className="w-full bg-[#F1F3F2] h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-[#3F7D58] h-full transition-all duration-500"
                style={{ width: `${analytics.twoWheelerPercentage}%` }}
              />
              <div
                className="bg-[#4F6B8A] h-full transition-all duration-500"
                style={{ width: `${analytics.fourWheelerPercentage}%` }}
              />
            </div>
          </div>

          {/* Owner Categories */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-[#F7F9F8] border border-[#E4EAE6]">
              <span className="text-[10px] font-semibold uppercase text-[#66736B] block mb-0.5">
                Staff
              </span>
              <span className="font-mono font-bold text-base text-[#18231D]">
                {analytics.staffPercentage}%
              </span>
              <span className="text-[10px] text-[#285C3F] font-medium block mt-0.5">
                Free Tier
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F9F8] border border-[#E4EAE6]">
              <span className="text-[10px] font-semibold uppercase text-[#66736B] block mb-0.5">
                Students
              </span>
              <span className="font-mono font-bold text-base text-[#18231D]">
                {analytics.studentPercentage}%
              </span>
              <span className="text-[10px] text-[#66736B] block mt-0.5">
                2h Grace Tier
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F9F8] border border-[#E4EAE6]">
              <span className="text-[10px] font-semibold uppercase text-[#66736B] block mb-0.5">
                Visitors
              </span>
              <span className="font-mono font-bold text-base text-[#18231D]">
                {analytics.visitorPercentage}%
              </span>
              <span className="text-[10px] text-[#66736B] block mt-0.5">
                Hourly Tariff
              </span>
            </div>
          </div>
        </div>

        {/* Operational Insights */}
        <div className="card-classic p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E4EAE6]">
            <Sparkles className="w-4 h-4 text-[#3F7D58]" />
            <h3 className="font-bold text-sm text-[#18231D]">
              Operational Intelligence
            </h3>
          </div>

          <div className="space-y-2.5">
            {analytics.aiInsights.map((insight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F7F9F8] border border-[#E4EAE6] text-xs text-[#18231D]"
              >
                <CheckCircle2 className="w-4 h-4 text-[#3F7D58] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{insight}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[11px] text-[#AAB7AF]">
            * Derived deterministically from verified local audit sessions.
          </div>
        </div>
      </div>
    </div>
  );
};
