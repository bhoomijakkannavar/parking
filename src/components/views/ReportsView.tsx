import React from 'react';
import { DailyStatistics, ParkingSession } from '../../types';
import { APP_CONFIG } from '../../constants';
import {
  Car,
  Bike,
  Users,
  ShieldCheck,
  Printer,
} from 'lucide-react';

interface ReportsViewProps {
  stats: DailyStatistics;
  sessions: ParkingSession[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ stats, sessions }) => {
  const currency = APP_CONFIG.currencySymbol;

  const totalRegistered = stats.totalVehiclesParkedToday;
  const staffPct = totalRegistered > 0 ? Math.round((stats.categoryCounts.staff / totalRegistered) * 100) : 0;
  const studentPct = totalRegistered > 0 ? Math.round((stats.categoryCounts.student / totalRegistered) * 100) : 0;
  const visitorPct = totalRegistered > 0 ? Math.round((stats.categoryCounts.visitor / totalRegistered) * 100) : 0;

  const twoWheelerCount = sessions.filter((s) => s.vehicleType === 'TWO_WHEELER').length;
  const fourWheelerCount = sessions.filter((s) => s.vehicleType === 'FOUR_WHEELER').length;

  const twoWheelerPct = totalRegistered > 0 ? Math.round((twoWheelerCount / totalRegistered) * 100) : 0;
  const fourWheelerPct = totalRegistered > 0 ? Math.round((fourWheelerCount / totalRegistered) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 1. REPORT HEADER */}
      <div className="card-classic p-6 border-[#D5EBDD] bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D5EBDD]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D9FBE5] border border-[#A8DDB8] text-[#185C36] text-[11px] font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#3F8F5B]" />
              <span>Campus Security Audit</span>
            </div>
            <h2 className="text-xl font-bold text-[#183025] tracking-tight">
              Daily Operational Report
            </h2>
            <p className="text-xs text-[#5E7165] mt-0.5">
              Derived strictly from stored check-in sessions and settled transaction receipts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="bg-white border border-[#D5EBDD] text-[#185C36] hover:bg-[#F1FBF4] px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            >
              <Printer className="w-4 h-4 text-[#3F8F5B]" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* 2. CORE FINANCIAL & OPERATIONAL STATS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 text-xs">
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] shadow-2xs">
            <span className="text-[10px] text-[#5E7165] uppercase font-semibold block mb-1">
              Revenue
            </span>
            <span className="text-xl font-bold font-mono text-[#185C36] block">
              {currency}{stats.totalFeesCollected}
            </span>
            <span className="text-[10px] text-[#5E7165]">Settled audit</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] shadow-2xs">
            <span className="text-[10px] text-[#5E7165] uppercase font-semibold block mb-1">
              Vehicles Today
            </span>
            <span className="text-xl font-bold font-mono text-[#183025] block">
              {stats.totalVehiclesParkedToday}
            </span>
            <span className="text-[10px] text-[#5E7165]">Total processed</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] shadow-2xs">
            <span className="text-[10px] text-[#5E7165] uppercase font-semibold block mb-1">
              Checkouts
            </span>
            <span className="text-xl font-bold font-mono text-[#183025] block">
              {stats.totalCompletedCheckouts}
            </span>
            <span className="text-[10px] text-[#5E7165]">Receipts</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] shadow-2xs">
            <span className="text-[10px] text-[#5E7165] uppercase font-semibold block mb-1">
              Currently Parked
            </span>
            <span className="text-xl font-bold font-mono text-[#183025] block">
              {stats.currentlyParked}
            </span>
            <span className="text-[10px] text-[#5E7165]">Active bays</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-br from-white to-[#D9FBE5] border border-[#A8DDB8] shadow-2xs">
            <span className="text-[10px] text-[#185C36] uppercase font-semibold block mb-1">
              Available Bays
            </span>
            <span className="text-xl font-bold font-mono text-[#185C36] block">
              {stats.availableSlots}
            </span>
            <span className="text-[10px] text-[#5E7165]">Out of {stats.totalSlots}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] shadow-2xs">
            <span className="text-[10px] text-[#5E7165] uppercase font-semibold block mb-1">
              Capacity
            </span>
            <span className="text-xl font-bold font-mono text-[#183025] block">
              {Math.round((stats.occupiedSlots / stats.totalSlots) * 100)}%
            </span>
            <span className="text-[10px] text-[#5E7165]">{stats.occupiedSlots} full</span>
          </div>
        </div>
      </div>

      {/* 3. DISTRIBUTION CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Owner Category Distribution */}
        <div className="card-classic p-6 space-y-4 border-[#D5EBDD] bg-white">
          <div className="flex items-center gap-2 pb-2 border-b border-[#D5EBDD]">
            <Users className="w-4 h-4 text-[#3F8F5B]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#183025]">
              User Category Breakdown
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {/* Student */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-[#183025]">Students</span>
                <span className="font-mono text-[#185C36] font-semibold">
                  {stats.categoryCounts.student} ({studentPct}%)
                </span>
              </div>
              <div className="w-full bg-[#EAF8EE] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#3F8F5B] h-full rounded-full transition-all duration-300"
                  style={{ width: `${studentPct}%` }}
                />
              </div>
            </div>

            {/* Staff */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-[#183025]">Staff</span>
                <span className="font-mono text-[#185C36] font-semibold">
                  {stats.categoryCounts.staff} ({staffPct}%)
                </span>
              </div>
              <div className="w-full bg-[#EAF8EE] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#185C36] h-full rounded-full transition-all duration-300"
                  style={{ width: `${staffPct}%` }}
                />
              </div>
            </div>

            {/* Visitor */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-[#183025]">Visitors</span>
                <span className="font-mono text-[#185C36] font-semibold">
                  {stats.categoryCounts.visitor} ({visitorPct}%)
                </span>
              </div>
              <div className="w-full bg-[#EAF8EE] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#68B77D] h-full rounded-full transition-all duration-300"
                  style={{ width: `${visitorPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Type Distribution */}
        <div className="card-classic p-6 space-y-4 border-[#D5EBDD] bg-white">
          <div className="flex items-center gap-2 pb-2 border-b border-[#D5EBDD]">
            <Car className="w-4 h-4 text-[#3F8F5B]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#183025]">
              Vehicle Classification Breakdown
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {/* Two-Wheelers */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-[#183025] flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-[#3F8F5B]" />
                  Two-Wheelers (Zone T)
                </span>
                <span className="font-mono text-[#185C36] font-semibold">
                  {twoWheelerCount} ({twoWheelerPct}%)
                </span>
              </div>
              <div className="w-full bg-[#EAF8EE] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#3F8F5B] h-full rounded-full transition-all duration-300"
                  style={{ width: `${twoWheelerPct}%` }}
                />
              </div>
            </div>

            {/* Four-Wheelers */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-[#183025] flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-[#3F8F5B]" />
                  Four-Wheelers (Zone F)
                </span>
                <span className="font-mono text-[#185C36] font-semibold">
                  {fourWheelerCount} ({fourWheelerPct}%)
                </span>
              </div>
              <div className="w-full bg-[#EAF8EE] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#68B77D] h-full rounded-full transition-all duration-300"
                  style={{ width: `${fourWheelerPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
