import React, { useState, useEffect } from 'react';
import {
  VehicleType,
  OwnerCategory,
  ParkingSlot,
} from '../../types';
import { PRICING_RULES, APP_CONFIG } from '../../constants';
import { ParkingService } from '../../services/ParkingService';
import { ApiClient } from '../../services/apiClient';
import { ValidationService } from '../../services/ValidationService';
import { ReceiptService } from '../../services/ReceiptService';
import { LicensePlate } from '../common/LicensePlate';
import confetti from 'canvas-confetti';
import {
  Car,
  Bike,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Info,
} from 'lucide-react';

interface VehicleEntryViewProps {
  slots: ParkingSlot[];
  initialVehicleType?: VehicleType;
  onEntrySuccess: () => void;
  onNavigateToExit: (vehicleNumber: string) => void;
}

export const VehicleEntryView: React.FC<VehicleEntryViewProps> = ({
  slots,
  initialVehicleType = 'TWO_WHEELER',
  onEntrySuccess,
  onNavigateToExit,
}) => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>(initialVehicleType);
  const [ownerCategory, setOwnerCategory] = useState<OwnerCategory>('STUDENT');
  const [entryHour, setEntryHour] = useState<number>(new Date().getHours());

  useEffect(() => {
    if (initialVehicleType) {
      setVehicleType(initialVehicleType);
    }
  }, [initialVehicleType]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    slotId: string;
    vehicleNumber: string;
    vehicleType: VehicleType;
    ownerCategory: OwnerCategory;
    entryHour: number;
  } | null>(null);

  const availableSlotsForType = slots.filter(
    (s) => s.type === vehicleType && s.status === 'AVAILABLE'
  );

  const twoWheelerFree = slots.filter(
    (s) => s.type === 'TWO_WHEELER' && s.status === 'AVAILABLE'
  ).length;
  const fourWheelerFree = slots.filter(
    (s) => s.type === 'FOUR_WHEELER' && s.status === 'AVAILABLE'
  ).length;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // First attempt backend SQLite API
      const result = await ApiClient.parkVehicle({
        vehicleNumber,
        vehicleType,
        ownerCategory,
        entryHour: Number(entryHour),
        origin: 'MANUAL',
      });

      if (!result.success) {
        setErrorMessage(result.message);
        setIsSubmitting(false);
        return;
      }

      if (result.data) {
        setSuccessData({
          slotId: result.data.slot.id,
          vehicleNumber: result.data.vehicle.vehicleNumber,
          vehicleType: result.data.vehicle.vehicleType,
          ownerCategory: result.data.vehicle.ownerCategory,
          entryHour: result.data.vehicle.entryHour,
        });

        try {
          confetti({
            particleCount: 50,
            spread: 50,
            origin: { y: 0.6 },
          });
        } catch {
          // Fallback
        }

        onEntrySuccess();
      }
    } catch {
      // Fallback to local ParkingService if server is offline
      const localResult = ParkingService.parkVehicle({
        vehicleNumber,
        vehicleType,
        ownerCategory,
        entryHour: Number(entryHour),
      });

      if (!localResult.success) {
        setErrorMessage(localResult.message);
      } else if (localResult.data) {
        setSuccessData({
          slotId: localResult.data.slot.id,
          vehicleNumber: localResult.data.vehicle.vehicleNumber,
          vehicleType: localResult.data.vehicle.vehicleType,
          ownerCategory: localResult.data.vehicle.ownerCategory,
          entryHour: localResult.data.vehicle.entryHour,
        });
        onEntrySuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setVehicleNumber('');
    setSuccessData(null);
    setErrorMessage(null);
  };

  const pricingInfo = PRICING_RULES[ownerCategory][vehicleType];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* SUCCESS CONFIRMATION CARD */}
      {successData && (
        <div className="card-classic p-6 bg-gradient-to-br from-white to-[#EAF8EE] border-[#A8DDB8] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#D5EBDD]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D9FBE5] text-[#185C36] border border-[#A8DDB8] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#3F8F5B]" />
              </div>
              <div>
                <span className="text-[11px] uppercase font-semibold tracking-wider text-[#185C36]">
                  Entry Confirmed
                </span>
                <h3 className="text-xl font-bold text-[#183025] tracking-tight">
                  Vehicle allocated to Bay {successData.slotId}
                </h3>
              </div>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-white border border-[#D5EBDD] text-center shrink-0 shadow-2xs">
              <span className="text-[10px] text-[#5E7165] uppercase font-semibold tracking-wider block">
                Assigned Bay
              </span>
              <span className="text-lg font-bold text-[#185C36] font-mono">
                {successData.slotId}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs">
            <div className="p-3 rounded-xl bg-white border border-[#D5EBDD]">
              <span className="text-[10px] uppercase font-medium text-[#5E7165] block mb-1">
                Plate Number
              </span>
              <LicensePlate plateNumber={successData.vehicleNumber} size="sm" />
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#D5EBDD]">
              <span className="text-[10px] uppercase font-medium text-[#5E7165] block mb-1">
                Category
              </span>
              <span className="font-semibold text-[#183025] capitalize">
                {successData.ownerCategory.toLowerCase()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#D5EBDD]">
              <span className="text-[10px] uppercase font-medium text-[#5E7165] block mb-1">
                Vehicle Type
              </span>
              <span className="font-semibold text-[#183025]">
                {successData.vehicleType === 'TWO_WHEELER' ? 'Two-Wheeler (2W)' : 'Four-Wheeler (4W)'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#D5EBDD]">
              <span className="text-[10px] uppercase font-medium text-[#5E7165] block mb-1">
                Entry Hour
              </span>
              <span className="font-semibold text-[#183025] font-mono">
                {ReceiptService.formatHour(successData.entryHour)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D5EBDD]">
            <button
              onClick={handleResetForm}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#D5EBDD] text-[#185C36] hover:bg-[#F1FBF4] transition-all cursor-pointer"
            >
              + Park Another Vehicle
            </button>
            <button
              onClick={() => onNavigateToExit(successData.vehicleNumber)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#3F8F5B] to-[#2F7748] hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Go to Check-Out</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ENTRY FORM CONTAINER */}
      <div className="card-classic p-6 sm:p-7 border-[#D5EBDD] bg-white">
        {/* Section Header with light green background */}
        <div className="bg-[#EAF8EE] border border-[#D5EBDD] rounded-2xl p-4.5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D9FBE5] border border-[#A8DDB8] text-[#185C36] text-[10px] font-bold uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3F8F5B] animate-pulse"></span>
                Instant Check-In
              </div>
              <h2 className="text-xl font-bold text-[#183025] tracking-tight">
                Vehicle Entry
              </h2>
              <p className="text-xs text-[#5E7165] mt-0.5">
                Register arriving vehicle and assign the first available compatible bay.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-white border border-[#D5EBDD] text-[#185C36] shadow-2xs">
                2W: {twoWheelerFree}/10 Free
              </span>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-white border border-[#D5EBDD] text-[#185C36] shadow-2xs">
                4W: {fourWheelerFree}/5 Free
              </span>
            </div>
          </div>
        </div>

        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-[#B45353] text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Entry Prevented</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Vehicle Number */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
              1. License Plate Number *
            </label>
            <div className="relative">
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => {
                  setVehicleNumber(e.target.value.toUpperCase());
                  setErrorMessage(null);
                }}
                placeholder="e.g. KA-22-XY-9876"
                required
                className="input-clean w-full px-4 py-2.5 font-mono text-base font-semibold uppercase text-[#1F2937] placeholder:text-[#9CA3AF] placeholder:font-normal"
              />
              {vehicleNumber && (
                <div className="absolute right-2.5 top-2">
                  <LicensePlate plateNumber={ValidationService.normalizeVehicleNumber(vehicleNumber)} size="sm" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">
              Active duplicate vehicles are automatically blocked.
            </p>
          </div>

          {/* 2. Vehicle Type Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
              2. Vehicle Classification *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVehicleType('TWO_WHEELER')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  vehicleType === 'TWO_WHEELER'
                    ? 'border-[#3F8F5B] bg-[#EAF8EE] text-[#183025] shadow-xs'
                    : 'border-[#D5EBDD] hover:border-[#A8DDB8] bg-white text-[#5E7165]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      vehicleType === 'TWO_WHEELER'
                        ? 'bg-[#3F8F5B] text-white shadow-2xs'
                        : 'bg-[#F1FBF4] text-[#5E7165] border border-[#D5EBDD]'
                    }`}
                  >
                    <Bike className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs block text-[#183025]">Two-Wheeler</span>
                    <span className="text-[11px] text-[#5E7165]">
                      Zone T (10 Bays)
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-medium text-[#185C36]">
                  {twoWheelerFree} Free
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVehicleType('FOUR_WHEELER')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  vehicleType === 'FOUR_WHEELER'
                    ? 'border-[#3F8F5B] bg-[#EAF8EE] text-[#183025] shadow-xs'
                    : 'border-[#D5EBDD] hover:border-[#A8DDB8] bg-white text-[#5E7165]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      vehicleType === 'FOUR_WHEELER'
                        ? 'bg-[#3F8F5B] text-white shadow-2xs'
                        : 'bg-[#F1FBF4] text-[#5E7165] border border-[#D5EBDD]'
                    }`}
                  >
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs block text-[#183025]">Four-Wheeler</span>
                    <span className="text-[11px] text-[#5E7165]">
                      Zone F (5 Bays)
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-medium text-[#185C36]">
                  {fourWheelerFree} Free
                </span>
              </button>
            </div>
          </div>

          {/* 3. Owner Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5E7165] mb-1.5">
              3. User Category *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['STUDENT', 'STAFF', 'VISITOR'] as OwnerCategory[]).map((cat) => {
                const isSelected = ownerCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setOwnerCategory(cat)}
                    className={`p-2.5 rounded-xl border text-center transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#3F8F5B] bg-[#EAF8EE] text-[#185C36] font-semibold shadow-xs'
                        : 'border-[#D5EBDD] hover:border-[#A8DDB8] bg-white text-[#5E7165]'
                    }`}
                  >
                    <div className="text-xs capitalize font-medium">{cat.toLowerCase()}</div>
                    <div className="text-[10px] text-[#5E7165] mt-0.5">
                      {cat === 'STAFF' && 'Free (₹0)'}
                      {cat === 'STUDENT' && '2h Free'}
                      {cat === 'VISITOR' && 'Hourly'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Entry Hour */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5E7165]">
                4. Entry Hour (0–23) *
              </label>
              <button
                type="button"
                onClick={() => setEntryHour(new Date().getHours())}
                className="text-[11px] text-[#3F8F5B] hover:text-[#185C36] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Clock className="w-3 h-3" />
                <span>Clock Hour ({ReceiptService.formatHour(new Date().getHours())})</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={23}
                value={entryHour}
                onChange={(e) => setEntryHour(Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                required
                className="input-clean w-24 px-3 py-2 font-mono text-sm font-semibold text-[#183025] border-[#D5EBDD] focus:border-[#3F8F5B]"
              />
              <span className="text-xs text-[#5E7165] font-mono">
                = {ReceiptService.formatHour(entryHour)}
              </span>
            </div>
          </div>

          {/* Policy Preview Banner */}
          <div className="p-3.5 rounded-xl bg-[#EAF8EE] border border-[#D5EBDD] text-xs text-[#183025] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#3F8F5B] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#185C36] block mb-0.5">
                Policy: {ownerCategory} • {vehicleType === 'TWO_WHEELER' ? 'Two-Wheeler' : 'Four-Wheeler'}
              </span>
              <p className="text-[11px] leading-relaxed text-[#5E7165]">
                {ownerCategory === 'STAFF' && 'Staff parking is complimentary (₹0 for all durations).'}
                {ownerCategory === 'STUDENT' &&
                  `First 2 hours are free. Subsequent hours billed at ${APP_CONFIG.currencySymbol}${pricingInfo.hourlyRate}/hr.`}
                {ownerCategory === 'VISITOR' &&
                  `Standard visitor tariff applies: ${APP_CONFIG.currencySymbol}${pricingInfo.hourlyRate}/hr from hour one.`}
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={availableSlotsForType.length === 0}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-[#3F8F5B] to-[#2F7748] hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF] disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {availableSlotsForType.length === 0
                  ? `No Available ${vehicleType === 'TWO_WHEELER' ? 'Two-Wheeler' : 'Four-Wheeler'} Bays`
                  : 'Confirm Check-In & Auto-Allocate Bay'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
