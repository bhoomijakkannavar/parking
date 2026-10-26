import React from 'react';
import { Receipt } from '../../types';
import { APP_CONFIG, OWNER_CATEGORY_LABELS, VEHICLE_TYPE_LABELS } from '../../constants';
import { ReceiptService } from '../../services/ReceiptService';
import { LicensePlate } from '../common/LicensePlate';
import { Printer, X, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';

interface ReceiptModalProps {
  receipt: Receipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const currency = APP_CONFIG.currencySymbol;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Background overlay */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#D5EBDD] z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Action Header - Hidden when printing */}
        <div className="no-print bg-[#EAF8EE] border-b border-[#D5EBDD] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#3F8F5B]" />
            <span className="font-bold text-xs text-[#185C36]">SCPM Official Parking Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary-muted inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              title="Print Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#5E7165] hover:text-[#183025] hover:bg-[#DDF5E4] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE RECEIPT CONTENT */}
        <div className="printable-receipt-card p-6 bg-white text-[#183025]">
          {/* Green Brand Banner */}
          <div className="bg-gradient-to-r from-[#3F8F5B] to-[#2F7748] rounded-2xl p-4 text-white text-center mb-4 shadow-sm">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-[#185C36] font-extrabold text-base mb-1 shadow-xs">
              P
            </div>
            <h2 className="text-base font-extrabold tracking-tight leading-none text-white">
              {APP_CONFIG.systemTitle}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D9FBE5] mt-1">
              ✓ PARKING COMPLETED • GATE CHECKOUT
            </p>
            <p className="text-[10px] text-white/80 mt-0.5">{APP_CONFIG.collegeName}</p>
          </div>

          {/* Receipt ID Pill */}
          <div className="flex justify-center mb-3">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#185C36] bg-[#D9FBE5] border border-[#A8DDB8] px-3 py-1 rounded-full font-bold">
              <span>Receipt ID:</span>
              <strong>{receipt.id}</strong>
            </div>
          </div>

          {/* Core Details with Light Mint Containers */}
          <div className="py-3 space-y-2 text-xs border-y border-[#D5EBDD]">
            <div className="flex items-center justify-between">
              <span className="text-[#5E7165] font-medium">Vehicle Number:</span>
              <LicensePlate plateNumber={receipt.vehicleNumber} size="sm" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#5E7165] font-medium">Classification:</span>
              <span className="font-bold text-[#183025]">
                {VEHICLE_TYPE_LABELS[receipt.vehicleType]}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#5E7165] font-medium">User Category:</span>
              <span className="font-bold text-[#185C36] bg-[#D9FBE5] px-2 py-0.5 rounded-md capitalize">
                {OWNER_CATEGORY_LABELS[receipt.ownerCategory]}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#5E7165] font-medium">Assigned Bay:</span>
              <span className="font-mono font-extrabold text-[#185C36] bg-[#EAF8EE] px-2.5 py-0.5 rounded-lg border border-[#A8DDB8]">
                {receipt.slotId}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 bg-[#F1FBF4] p-2.5 rounded-2xl border border-[#D5EBDD] text-[11px]">
              <div>
                <span className="text-[#5E7165] block text-[9px] uppercase font-bold tracking-wider">
                  Entry Time
                </span>
                <span className="font-bold text-[#183025]">
                  {ReceiptService.formatHour(receipt.entryHour)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[#5E7165] block text-[9px] uppercase font-bold tracking-wider">
                  Exit Time
                </span>
                <span className="font-bold text-[#183025]">
                  {ReceiptService.formatHour(receipt.exitHour)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[#5E7165] font-medium">Duration:</span>
              <span className="font-bold text-[#183025]">
                {receipt.duration} {receipt.duration === 1 ? 'Hour' : 'Hours'}
              </span>
            </div>
          </div>

          {/* Fee Itemization */}
          <div className="py-3 border-b border-[#D5EBDD]">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#185C36] mb-2">
              Fee Itemization
            </h4>
            <div className="space-y-1.5 text-xs">
              {receipt.breakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[#183025]">
                  <div>
                    <span className="font-medium">{item.description}</span>
                    <span className="text-[#5E7165] text-[10px] ml-1.5 font-mono">
                      ({item.rateInfo})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#183025]">
                    {currency}{item.amount}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Amount Box with Mint Highlight */}
            <div className="mt-3.5 pt-2.5 flex justify-between items-center bg-[#D9FBE5] border border-[#A8DDB8] px-4 py-3 rounded-2xl">
              <div>
                <span className="text-[10px] font-bold text-[#185C36] uppercase tracking-wider block">
                  Total Amount Paid
                </span>
                <span className="text-[11px] text-[#185C36] flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3F8F5B]" />
                  <span>Settled via Gate ANPR</span>
                </span>
              </div>
              <span className="text-2xl font-extrabold font-mono tracking-tight text-[#185C36]">
                {currency}{receipt.fee}
              </span>
            </div>
          </div>

          {/* Footer & Barcode simulation */}
          <div className="pt-3 text-center space-y-2">
            <div className="flex items-center justify-center gap-4 text-[10px] text-[#5E7165]">
              <div className="w-10 h-10 rounded-lg border border-[#D5EBDD] bg-[#F1FBF4] flex items-center justify-center text-[#185C36]">
                <QrCode className="w-6 h-6" />
              </div>
              <div className="text-left font-medium">
                <div>Timestamp: {new Date(receipt.createdAt).toLocaleString()}</div>
                <div>Campus Security Terminal • Main Gate 1</div>
              </div>
            </div>

            {/* Barcode */}
            <div className="py-1 flex justify-center opacity-80" aria-hidden="true">
              <div className="h-6 flex items-end gap-0.5">
                {[2, 4, 1, 3, 5, 2, 6, 2, 3, 1, 4, 2, 5, 1, 3, 4, 2, 6, 1, 3, 2, 5, 2].map(
                  (h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#185C36]"
                      style={{ height: `${h * 3 + 5}px` }}
                    />
                  )
                )}
              </div>
            </div>
            <p className="text-[9px] text-[#5E7165] font-mono tracking-widest uppercase">
              *{receipt.id}*
            </p>
          </div>
        </div>

        {/* Footer Actions - Hidden when printing */}
        <div className="no-print bg-[#EAF8EE] px-5 py-3 flex items-center justify-between border-t border-[#D5EBDD] text-xs">
          <span className="text-[#185C36] font-semibold text-[11px]">
            Official Campus Audit Copy
          </span>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary-muted px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="btn-secondary-white px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
