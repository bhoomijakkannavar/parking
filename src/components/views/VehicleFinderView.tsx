import React, { useState } from 'react';
import { Vehicle, ParkingSession } from '../../types';
import { ValidationService } from '../../services/ValidationService';
import { VEHICLE_TYPE_LABELS, OWNER_CATEGORY_LABELS, APP_CONFIG } from '../../constants';
import { LicensePlate } from '../common/LicensePlate';
import { ReceiptService } from '../../services/ReceiptService';
import {
  Search,
  Car,
  Bike,
  AlertCircle,
  History,
  ArrowRight,
} from 'lucide-react';

interface VehicleFinderViewProps {
  activeVehicles: Vehicle[];
  sessions: ParkingSession[];
  onNavigateToExit: (vehicleNumber: string) => void;
}

export const VehicleFinderView: React.FC<VehicleFinderViewProps> = ({
  activeVehicles,
  sessions,
  onNavigateToExit,
}) => {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const cleanQuery = ValidationService.normalizeVehicleNumber(query);

  const activeMatch = cleanQuery
    ? activeVehicles.find(
        (v) =>
          v.vehicleNumber.includes(cleanQuery) ||
          v.slotId.toUpperCase() === cleanQuery ||
          ValidationService.stripNonAlphanumeric(v.vehicleNumber) === ValidationService.stripNonAlphanumeric(cleanQuery)
      )
    : undefined;

  const historyMatches = cleanQuery
    ? sessions.filter(
        (s) =>
          s.status === 'COMPLETED' &&
          (s.vehicleNumber.includes(cleanQuery) ||
            ValidationService.stripNonAlphanumeric(s.vehicleNumber) === ValidationService.stripNonAlphanumeric(cleanQuery))
      )
    : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setHasSearched(true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 1. SEARCH HEADER */}
      <div className="card-classic p-6 sm:p-7 border-[#D5EBDD] bg-white">
        <div className="bg-[#EAF8EE] border border-[#D5EBDD] rounded-2xl p-4.5 mb-5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D9FBE5] border border-[#A8DDB8] text-[#185C36] text-[10px] font-bold uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3F8F5B]"></span>
            Active Registry Lookup
          </div>
          <h2 className="text-xl font-bold text-[#183025] tracking-tight">
            Vehicle Finder
          </h2>
          <p className="text-xs text-[#5E7165] mt-0.5">
            Locate actively parked vehicles or inspect previous completed parking sessions.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5E7165] absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value.toUpperCase());
                setHasSearched(false);
              }}
              placeholder="Enter Plate or Bay ID..."
              className="input-clean w-full pl-10 pr-3 py-2.5 font-mono text-sm uppercase font-semibold text-[#183025] placeholder:text-[#9CA3AF] placeholder:font-normal border-[#D5EBDD] focus:border-[#3F8F5B]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-[#3F8F5B] to-[#2F7748] hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* 2. RESULTS */}
      {hasSearched && (
        <div className="space-y-6">
          {activeMatch ? (
            <div className="card-classic p-6 space-y-4 border-[#A8DDB8] bg-gradient-to-br from-white to-[#EAF8EE] shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#D5EBDD]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D9FBE5] border border-[#A8DDB8] text-[#185C36] flex items-center justify-center shrink-0">
                    {activeMatch.vehicleType === 'TWO_WHEELER' ? (
                      <Bike className="w-5 h-5 text-[#3F8F5B]" />
                    ) : (
                      <Car className="w-5 h-5 text-[#3F8F5B]" />
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-semibold tracking-wider text-[#185C36]">
                      Vehicle Currently Parked
                    </span>
                    <h3 className="text-xl font-bold text-[#183025] tracking-tight">
                      Allocated at Bay {activeMatch.slotId}
                    </h3>
                  </div>
                </div>

                <LicensePlate plateNumber={activeMatch.vehicleNumber} size="md" />
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs">
                <div className="p-3 rounded-xl bg-white border border-[#D5EBDD] shadow-2xs">
                  <span className="text-[10px] uppercase font-medium text-[#5E7165] block mb-1">
                    Vehicle Type
                  </span>
                  <span className="font-semibold text-[#183025]">
                    {VEHICLE_TYPE_LABELS[activeMatch.vehicleType]}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#D5EBDD] shadow-2xs">
                  <span className="text-[10px] uppercase font-medium text-[#5E7165] block mb-1">
                    Category
                  </span>
                  <span className="font-semibold text-[#183025] capitalize">
                    {OWNER_CATEGORY_LABELS[activeMatch.ownerCategory]}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#D5EBDD] shadow-2xs">
                  <span className="text-[10px] uppercase font-medium text-[#5E7165] block mb-1">
                    Entry Time
                  </span>
                  <span className="font-semibold text-[#183025] font-mono">
                    {ReceiptService.formatHour(activeMatch.entryHour)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#D5EBDD] shadow-2xs">
                  <span className="text-[10px] uppercase font-medium text-[#5E7165] block mb-1">
                    Status
                  </span>
                  <span className="font-semibold text-[#185C36] bg-[#D9FBE5] border border-[#A8DDB8] px-2 py-0.5 rounded text-[11px] inline-block">
                    Parked
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#D5EBDD]">
                <button
                  onClick={() => onNavigateToExit(activeMatch.vehicleNumber)}
                  className="px-4 py-2 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-[#3F8F5B] to-[#2F7748] hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Proceed to Check-Out</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="card-classic p-8 text-center border-[#D5EBDD] bg-white">
              <div className="w-10 h-10 rounded-full bg-[#EAF8EE] border border-[#D5EBDD] text-[#3F8F5B] mx-auto mb-2 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#183025]">
                Vehicle not currently parked.
              </h3>
              <p className="text-xs text-[#5E7165] mt-1">
                No active parking session found for plate <strong className="font-mono text-[#185C36]">{cleanQuery}</strong>.
              </p>
            </div>
          )}

          {/* Past sessions */}
          {historyMatches.length > 0 && (
            <div className="card-classic p-6 border-[#D5EBDD] bg-white">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#D5EBDD]">
                <History className="w-4 h-4 text-[#3F8F5B]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#183025]">
                  Past Completed Sessions ({historyMatches.length})
                </h4>
              </div>

              <div className="space-y-2 text-xs">
                {historyMatches.map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#D5EBDD] hover:bg-[#F1FBF4] transition-colors shadow-2xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#185C36]">
                        Bay {sess.slotId}
                      </span>
                      <span className="text-[#5E7165] text-[11px] block">
                        In: {ReceiptService.formatHour(sess.entryHour)} • Out: {ReceiptService.formatHour(sess.exitHour ?? 0)} ({sess.duration} hrs)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#183025] block">
                        {APP_CONFIG.currencySymbol}{sess.fee}
                      </span>
                      <span className="text-[10px] text-[#185C36] font-semibold">
                        Receipt: {sess.receiptId}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
