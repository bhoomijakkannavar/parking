import React, { useState, useEffect } from 'react';
import {
  Vehicle,
  ParkingSlot,
  ParkingSession,
  Receipt,
} from '../../types';
import { APP_CONFIG, OWNER_CATEGORY_LABELS, VEHICLE_TYPE_LABELS } from '../../constants';
import { ParkingService } from '../../services/ParkingService';
import { ApiClient } from '../../services/apiClient';
import { FeeCalculator } from '../../services/FeeCalculator';
import { ReceiptService } from '../../services/ReceiptService';
import { LicensePlate } from '../common/LicensePlate';
import {
  Search,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface VehicleExitViewProps {
  initialSearchKey?: string;
  activeVehicles: Vehicle[];
  onCheckoutSuccess: (receipt: Receipt) => void;
}

export const VehicleExitView: React.FC<VehicleExitViewProps> = ({
  initialSearchKey = '',
  activeVehicles,
  onCheckoutSuccess,
}) => {
  const [searchKey, setSearchKey] = useState<string>(initialSearchKey);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [selectedSession, setSelectedSession] = useState<ParkingSession | null>(null);

  const [exitHour, setExitHour] = useState<number>(new Date().getHours());
  const [searchError, setSearchError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSearchKey) {
      setSearchKey(initialSearchKey);
      handleLookup(initialSearchKey);
    }
  }, [initialSearchKey]);

  const handleLookup = (keyToSearch: string) => {
    setSearchError(null);
    setCheckoutError(null);

    const result = ParkingService.prepareCheckout(keyToSearch);
    if (!result.success || !result.data) {
      setSelectedVehicle(null);
      setSelectedSlot(null);
      setSelectedSession(null);
      setSearchError(result.message || 'Vehicle not currently parked.');
      return;
    }

    const { vehicle, slot, session } = result.data;
    setSelectedVehicle(vehicle);
    setSelectedSlot(slot);
    setSelectedSession(session);

    const currHour = new Date().getHours();
    setExitHour(currHour >= vehicle.entryHour ? currHour : vehicle.entryHour);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePerformCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (!selectedVehicle) {
      setCheckoutError('Please find an active parked vehicle first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await ApiClient.checkoutVehicle(
        selectedVehicle.vehicleNumber,
        Number(exitHour)
      );

      if (!result.success || !result.data) {
        setCheckoutError(result.message);
        setIsSubmitting(false);
        return;
      }

      const { receipt } = result.data;
      setSelectedVehicle(null);
      setSelectedSlot(null);
      setSelectedSession(null);
      setSearchKey('');
      onCheckoutSuccess(receipt);
    } catch {
      // Fallback to local ParkingService if server is offline
      const localResult = ParkingService.checkoutVehicle(
        selectedVehicle.vehicleNumber,
        Number(exitHour)
      );

      if (!localResult.success || !localResult.data) {
        setCheckoutError(localResult.message);
      } else {
        const { receipt } = localResult.data;
        setSelectedVehicle(null);
        setSelectedSlot(null);
        setSelectedSession(null);
        setSearchKey('');
        onCheckoutSuccess(receipt);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const livePreview =
    selectedVehicle && selectedSession
      ? FeeCalculator.calculateFee(
          selectedVehicle.vehicleType,
          selectedVehicle.ownerCategory,
          selectedVehicle.entryHour,
          exitHour
        )
      : null;

  const isExitHourValid =
    selectedVehicle !== null && Number(exitHour) >= selectedVehicle.entryHour && Number(exitHour) <= 23;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 1. LOOKUP BAR */}
      <div className="card-classic p-6 sm:p-7 border-[#D5EBDD] bg-white">
        <div className="bg-[#EAF8EE] border border-[#D5EBDD] rounded-2xl p-4.5 mb-5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D9FBE5] border border-[#A8DDB8] text-[#185C36] text-[10px] font-bold uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3F8F5B] animate-pulse"></span>
            Automated Checkout
          </div>
          <h2 className="text-xl font-bold text-[#183025] tracking-tight">
            Vehicle Exit & Billing
          </h2>
          <p className="text-xs text-[#5E7165] mt-0.5">
            Locate vehicle by license plate (e.g. KA-22-XY-9876) or bay ID (e.g. T-01, F-02).
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup(searchKey);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5E7165] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchKey}
              onChange={(e) => {
                setSearchKey(e.target.value.toUpperCase());
                setSearchError(null);
              }}
              placeholder="Search Plate or Bay ID..."
              className="input-clean w-full pl-10 pr-3 py-2.5 font-mono text-sm uppercase font-semibold text-[#183025] placeholder:text-[#9CA3AF] placeholder:font-normal border-[#D5EBDD] focus:border-[#3F8F5B]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-[#3F8F5B] to-[#2F7748] hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find Vehicle</span>
          </button>
        </form>

        {/* Quick Suggest Chips for Currently Parked Vehicles */}
        {activeVehicles.length > 0 && !selectedVehicle && (
          <div className="mt-4 pt-4 border-t border-[#D5EBDD]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#185C36] block mb-2">
              Currently Parked Vehicles ({activeVehicles.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {activeVehicles.slice(0, 8).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSearchKey(v.vehicleNumber);
                    handleLookup(v.vehicleNumber);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#EAF8EE] hover:bg-[#D9FBE5] text-[#185C36] border border-[#D5EBDD] text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3F8F5B]"></span>
                  <span className="font-semibold">{v.vehicleNumber}</span>
                  <span className="text-[#5E7165] font-sans text-[10px]">({v.slotId})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lookup Error Banner */}
        {searchError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#B45353] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* 2. ACTIVE VEHICLE DETAILS & CHECKOUT FORM */}
      {selectedVehicle && selectedSlot && selectedSession && (
        <div className="card-classic p-6 sm:p-7 space-y-5 border-[#D5EBDD] bg-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#EAF8EE] border border-[#D5EBDD] rounded-2xl">
            <div>
              <span className="text-[11px] uppercase font-semibold tracking-wider text-[#185C36]">
                Active Session Located
              </span>
              <h3 className="text-lg font-bold text-[#183025] tracking-tight">
                Tariff Calculation & Checkout
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#185C36] bg-[#D9FBE5] border border-[#A8DDB8] px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3F8F5B]"></span>
              Status: Parked
            </span>
          </div>

          {/* Vehicle summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-[#D5EBDD] shadow-2xs">
              <span className="text-[10px] text-[#5E7165] uppercase font-semibold block mb-1">
                Plate Number
              </span>
              <LicensePlate plateNumber={selectedVehicle.vehicleNumber} size="sm" />
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#D5EBDD] shadow-2xs">
              <span className="text-[10px] text-[#5E7165] uppercase font-semibold block mb-1">
                Parking Bay
              </span>
              <span className="font-mono font-bold text-sm text-[#185C36]">
                {selectedSlot.id}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#D5EBDD] shadow-2xs">
              <span className="text-[10px] text-[#5E7165] uppercase font-semibold block mb-1">
                Type & Category
              </span>
              <span className="font-semibold text-[#183025] block">
                {VEHICLE_TYPE_LABELS[selectedVehicle.vehicleType]}
              </span>
              <span className="text-[#5E7165] text-[11px] capitalize">
                {OWNER_CATEGORY_LABELS[selectedVehicle.ownerCategory]}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#D5EBDD] shadow-2xs">
              <span className="text-[10px] text-[#5E7165] uppercase font-semibold block mb-1">
                Entry Hour
              </span>
              <span className="font-semibold text-[#183025] font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#3F8F5B]" />
                {ReceiptService.formatHour(selectedVehicle.entryHour)}
              </span>
            </div>
          </div>

          {/* Exit Hour Input & Live Fee Preview */}
          <form onSubmit={handlePerformCheckout} className="space-y-5 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5E7165]">
                  Exit Hour (0–23) *
                </label>
                <span className="text-[11px] text-[#5E7165] font-mono">
                  Entry: {ReceiptService.formatHour(selectedVehicle.entryHour)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={exitHour}
                  onChange={(e) => {
                    setExitHour(parseInt(e.target.value, 10) || 0);
                    setCheckoutError(null);
                  }}
                  required
                  className="input-clean w-24 px-3 py-2 font-mono text-sm font-semibold text-[#183025] border-[#D5EBDD] focus:border-[#3F8F5B]"
                />
                <span className="text-xs text-[#5E7165] font-mono">
                  = {ReceiptService.formatHour(exitHour)}
                </span>
              </div>

              {exitHour < selectedVehicle.entryHour && (
                <p className="text-xs text-[#B45353] font-medium mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Exit time cannot be earlier than entry time.
                </p>
              )}
            </div>

            {/* LIVE TARIFF BREAKDOWN BOX */}
            {livePreview && isExitHourValid && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#D5EBDD]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#3F8F5B]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#185C36]">
                      Itemized Breakdown
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#185C36]">
                    Duration: {livePreview.duration} hr{livePreview.duration === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#5E7165]">
                  {livePreview.breakdown.map((b, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <span className="text-[#183025] font-medium">{b.description}</span>
                        <span className="text-[#5E7165] ml-2 font-mono text-[11px]">
                          ({b.rateInfo})
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-[#183025]">
                        {APP_CONFIG.currencySymbol}{b.amount}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2.5 border-t border-[#D5EBDD] flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-[#5E7165] uppercase font-semibold block">
                      Total Payable
                    </span>
                    <span className="text-xs text-[#5E7165]">
                      {livePreview.ruleSummary}
                    </span>
                  </div>
                  <span className="text-2xl font-bold font-mono text-[#185C36] tracking-tight">
                    {APP_CONFIG.currencySymbol}{livePreview.totalFee}
                  </span>
                </div>
              </div>
            )}

            {checkoutError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#B45353] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedVehicle(null);
                  setSelectedSlot(null);
                  setSelectedSession(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-[#D5EBDD] text-[#185C36] hover:bg-[#F1FBF4] transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!isExitHourValid}
                className="w-full flex-1 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-[#3F8F5B] to-[#2F7748] hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF] disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Complete Check-Out & Issue Receipt (
                  {APP_CONFIG.currencySymbol}{livePreview?.totalFee ?? 0})
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
