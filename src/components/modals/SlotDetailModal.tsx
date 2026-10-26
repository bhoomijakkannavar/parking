import React from 'react';
import { ParkingSlot } from '../../types';
import { VEHICLE_TYPE_LABELS, OWNER_CATEGORY_LABELS } from '../../constants';
import { LicensePlate } from '../common/LicensePlate';
import { ReceiptService } from '../../services/ReceiptService';
import { X, CheckCircle, Car, Bike, Clock, ArrowRight } from 'lucide-react';

interface SlotDetailModalProps {
  slot: ParkingSlot | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToExit: (searchKey: string) => void;
  onNavigateToEntry: (preferredType: string) => void;
}

export const SlotDetailModal: React.FC<SlotDetailModalProps> = ({
  slot,
  isOpen,
  onClose,
  onNavigateToExit,
  onNavigateToEntry,
}) => {
  if (!isOpen || !slot) return null;

  const isOccupied = slot.status === 'OCCUPIED';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-[#E5E7EB] z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between text-[#1F2937]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg text-[#6B7280]">
              {slot.type === 'TWO_WHEELER' ? (
                <Bike className="w-4 h-4" />
              ) : (
                <Car className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#6B7280] block leading-tight">
                {VEHICLE_TYPE_LABELS[slot.type]} Zone
              </span>
              <h3 className="text-base font-bold font-mono tracking-tight text-[#1F2937] leading-none mt-0.5">
                Bay {slot.id}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
              Current Status
            </span>
            {isOccupied ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#1F2937] bg-[#F3F4F6] px-2.5 py-0.5 rounded-md border border-[#E5E7EB]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]"></span>
                Occupied
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2F6043] bg-[#E8F1EB] px-2.5 py-0.5 rounded-md">
                <CheckCircle className="w-3.5 h-3.5 text-[#3F7D58]" />
                Available
              </span>
            )}
          </div>

          {isOccupied ? (
            <div className="space-y-3 pt-1">
              <div>
                <span className="text-[11px] text-[#6B7280] block mb-1 font-medium">
                  Parked Plate
                </span>
                {slot.vehicleNumber && (
                  <LicensePlate plateNumber={slot.vehicleNumber} size="md" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#6B7280] uppercase font-semibold block mb-0.5">
                    Category
                  </span>
                  <span className="font-semibold text-[#1F2937]">
                    {slot.ownerCategory ? OWNER_CATEGORY_LABELS[slot.ownerCategory] : '—'}
                  </span>
                </div>

                <div className="p-2.5 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#6B7280] uppercase font-semibold block mb-0.5">
                    Entry Time
                  </span>
                  <span className="font-semibold text-[#1F2937] flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-[#9CA3AF]" />
                    {slot.entryHour !== undefined ? ReceiptService.formatHour(slot.entryHour) : '—'}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToExit(slot.vehicleNumber || slot.id);
                  }}
                  className="btn-primary-muted w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-xs shadow-xs cursor-pointer"
                >
                  <span>Proceed to Check-Out</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2 text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-[#E8F1EB] text-[#2F6043] flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#3F7D58]" />
              </div>
              <div>
                <h4 className="font-semibold text-[#1F2937] text-sm">Bay Available</h4>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Reserved for {slot.type === 'TWO_WHEELER' ? 'two-wheelers' : 'four-wheelers'}.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToEntry(slot.type);
                }}
                className="btn-primary-muted w-full py-2.5 rounded-xl font-medium text-xs cursor-pointer shadow-xs"
              >
                Park Vehicle in this Bay
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
