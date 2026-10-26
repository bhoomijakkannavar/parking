import React from 'react';
import { CollegeMember } from '../../types';
import { APP_CONFIG } from '../../constants';
import { LicensePlate } from '../common/LicensePlate';
import { X, Printer, ShieldCheck, Car, Bike, QrCode } from 'lucide-react';

interface SmartParkingPassModalProps {
  member: CollegeMember | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SmartParkingPassModal: React.FC<SmartParkingPassModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !member) return null;

  const handlePrint = () => {
    window.print();
  };

  const primaryVehicle =
    member.registeredVehicles.find((v) => v.primary) || member.registeredVehicles[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl border border-[#E5E7EB] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Pass Top Header */}
        <div className="bg-white border-b border-[#E5E7EB] p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#1F2937] hover:bg-[#F3F4F6] cursor-pointer print:hidden"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3F7D58]"></span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
              Campus Parking Authorization
            </span>
          </div>

          <h3 className="font-bold text-base text-[#1F2937] tracking-tight">
            Digital Campus Parking Pass
          </h3>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            {APP_CONFIG.collegeName}
          </p>
        </div>

        {/* Pass Body */}
        <div className="p-5 space-y-4 text-xs text-[#1F2937]">
          {/* Member Card Banner */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E7EB]">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                Authorized Member
              </span>
              <span className="font-bold text-sm text-[#1F2937] block mt-0.5">
                {member.name}
              </span>
              <span className="text-[11px] text-[#6B7280]">
                {member.department} • <strong className="text-[#2F6043]">{member.role}</strong>
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                Pass ID
              </span>
              <span className="font-mono font-medium text-xs text-[#2F6043] bg-[#E8F1EB] px-2 py-0.5 rounded inline-block mt-0.5">
                {member.passId || member.id}
              </span>
            </div>
          </div>

          {/* Vehicle Info Box */}
          <div className="bg-[#F7F8FA] rounded-xl p-3.5 border border-[#E5E7EB] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#6B7280]">Registered Vehicle:</span>
              <span className="font-medium text-[#1F2937] flex items-center gap-1">
                {primaryVehicle?.vehicleType === 'TWO_WHEELER' ? (
                  <Bike className="w-3.5 h-3.5 text-[#6B7280]" />
                ) : (
                  <Car className="w-3.5 h-3.5 text-[#6B7280]" />
                )}
                {primaryVehicle?.vehicleType === 'TWO_WHEELER' ? 'Two-Wheeler (2W)' : 'Four-Wheeler (4W)'}
              </span>
            </div>

            <div className="flex justify-center py-1">
              {primaryVehicle && (
                <LicensePlate plateNumber={primaryVehicle.vehicleNumber} size="md" />
              )}
            </div>
          </div>

          {/* QR Code for Gate Verification */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB] text-center">
            <div className="w-20 h-20 bg-white rounded-lg p-2 border border-[#E5E7EB] flex items-center justify-center shadow-xs">
              <QrCode className="w-16 h-16 text-[#1F2937]" />
            </div>
            <span className="text-[10px] font-mono font-semibold text-[#1F2937] mt-2">
              TOKEN: {member.id}-VERIFIED
            </span>
            <span className="text-[9px] text-[#9CA3AF] mt-0.5">
              Scan at Gate camera terminal
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#6B7280] pt-2 border-t border-[#E5E7EB]">
            <span className="flex items-center gap-1 text-[#2F6043] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#3F7D58]" />
              Academic Year 2026-27
            </span>
            <span>SCPM Pass</span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-3.5 bg-[#F7F8FA] border-t border-[#E5E7EB] flex items-center justify-between print:hidden">
          <button
            onClick={onClose}
            className="btn-secondary-white px-3.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="btn-primary-muted flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Pass</span>
          </button>
        </div>
      </div>
    </div>
  );
};
