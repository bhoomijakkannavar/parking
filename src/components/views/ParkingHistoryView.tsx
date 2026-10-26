import React, { useState } from 'react';
import { Receipt, VehicleType, OwnerCategory } from '../../types';
import { APP_CONFIG } from '../../constants';
import { LicensePlate } from '../common/LicensePlate';
import { VehicleTypeBadge, OwnerCategoryBadge } from '../common/Badge';
import { ReceiptService } from '../../services/ReceiptService';
import {
  Search,
  Download,
  Printer,
  History,
} from 'lucide-react';

interface ParkingHistoryViewProps {
  receipts: Receipt[];
  onViewReceipt: (receipt: Receipt) => void;
}

export const ParkingHistoryView: React.FC<ParkingHistoryViewProps> = ({
  receipts,
  onViewReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | VehicleType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | OwnerCategory>('ALL');

  const filteredReceipts = receipts.filter((r) => {
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toUpperCase();
      const matchPlate = r.vehicleNumber.includes(q);
      const matchId = r.id.toUpperCase().includes(q);
      const matchSlot = r.slotId.toUpperCase().includes(q);
      if (!matchPlate && !matchId && !matchSlot) return false;
    }

    if (typeFilter !== 'ALL' && r.vehicleType !== typeFilter) return false;
    if (categoryFilter !== 'ALL' && r.ownerCategory !== categoryFilter) return false;

    return true;
  });

  const exportCSV = () => {
    if (receipts.length === 0) return;

    const headers = [
      'Receipt ID',
      'Vehicle Number',
      'Vehicle Type',
      'Owner Category',
      'Slot ID',
      'Entry Hour',
      'Exit Hour',
      'Duration (Hours)',
      'Fee (INR)',
      'Timestamp',
    ];

    const rows = filteredReceipts.map((r) => [
      r.id,
      r.vehicleNumber,
      r.vehicleType,
      r.ownerCategory,
      r.slotId,
      r.entryHour,
      r.exitHour,
      r.duration,
      r.fee,
      new Date(r.createdAt).toISOString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SCPM_Parking_History_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. FILTER & SEARCH HEADER */}
      <div className="card-classic p-6 border-[#D5EBDD] bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D5EBDD]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D9FBE5] border border-[#A8DDB8] text-[#185C36] text-[10px] font-bold uppercase tracking-wider mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3F8F5B]"></span>
              Audit Logs
            </div>
            <h2 className="text-xl font-bold text-[#183025] tracking-tight">
              Parking History & Audit Logs
            </h2>
            <p className="text-xs text-[#5E7165] mt-0.5">
              Settled campus parking transactions, receipts, and durations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              disabled={filteredReceipts.length === 0}
              className="bg-white border border-[#D5EBDD] text-[#185C36] hover:bg-[#F1FBF4] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-[#3F8F5B]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#5E7165] absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search plate, bay, or receipt ID..."
              className="input-clean w-full pl-9 pr-3 py-2 text-xs text-[#183025] placeholder:text-[#9CA3AF] border-[#D5EBDD] focus:border-[#3F8F5B]"
            />
          </div>

          {/* Vehicle type filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'ALL' | VehicleType)}
              className="input-clean w-full px-3 py-2 text-xs text-[#183025] border-[#D5EBDD] focus:border-[#3F8F5B]"
            >
              <option value="ALL">All Vehicle Types</option>
              <option value="TWO_WHEELER">Two-Wheeler Only</option>
              <option value="FOUR_WHEELER">Four-Wheeler Only</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | OwnerCategory)}
              className="input-clean w-full px-3 py-2 text-xs text-[#183025] border-[#D5EBDD] focus:border-[#3F8F5B]"
            >
              <option value="ALL">All Categories</option>
              <option value="STUDENT">Student</option>
              <option value="STAFF">Staff</option>
              <option value="VISITOR">Visitor</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. HISTORY TABLE */}
      <div className="card-classic overflow-hidden border-[#D5EBDD] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#EAF8EE] border-b border-[#D5EBDD] text-[11px] font-semibold uppercase tracking-wider text-[#185C36]">
                <th className="py-3 px-4">Receipt ID</th>
                <th className="py-3 px-4">Plate</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Bay</th>
                <th className="py-3 px-4">In</th>
                <th className="py-3 px-4">Out</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5EBDD] text-[#183025]">
              {filteredReceipts.map((r) => (
                <tr key={r.id} className="hover:bg-[#F1FBF4] transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-[#185C36] text-[11px]">
                    {r.id}
                  </td>
                  <td className="py-3 px-4">
                    <LicensePlate plateNumber={r.vehicleNumber} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <VehicleTypeBadge type={r.vehicleType} />
                  </td>
                  <td className="py-3 px-4">
                    <OwnerCategoryBadge category={r.ownerCategory} />
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-[#185C36] bg-[#EAF8EE] border border-[#D5EBDD] px-2 py-0.5 rounded text-[11px]">
                      {r.slotId}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#5E7165]">
                    {ReceiptService.formatHour(r.entryHour)}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#5E7165]">
                    {ReceiptService.formatHour(r.exitHour)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#183025]">
                    {r.duration}h
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-[#185C36]">
                    {APP_CONFIG.currencySymbol}{r.fee}
                  </td>
                  <td className="py-3 px-4 text-[#5E7165] text-[11px]">
                    {new Date(r.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onViewReceipt(r)}
                      className="bg-white border border-[#D5EBDD] text-[#185C36] hover:bg-[#F1FBF4] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] cursor-pointer transition-all shadow-2xs"
                    >
                      <Printer className="w-3 h-3 text-[#3F8F5B]" />
                      <span>Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReceipts.length === 0 && (
          <div className="py-12 text-center text-[#5E7165] text-xs">
            <History className="w-8 h-8 mx-auto mb-2 text-[#3F8F5B]" />
            <p className="font-semibold text-[#183025]">No parking history records found.</p>
            <p className="mt-0.5 text-[#5E7165]">Completed vehicle checkouts will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
};
