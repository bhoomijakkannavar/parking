import React, { useState, useRef, useEffect } from 'react';
import { ParkingSlot } from '../../types';
import { OWNER_CATEGORY_LABELS } from '../../constants';
import { LicensePlate } from '../common/LicensePlate';
import { ReceiptService } from '../../services/ReceiptService';
import { IsometricParking3D } from './IsometricParking3D';
import {
  Car,
  Bike,
  CheckCircle2,
  Clock,
  Search,
  ArrowRight,
  Info,
  Box,
  LayoutGrid,
  Lock,
  Star,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface ParkingSlotsViewProps {
  slots: ParkingSlot[];
  onSelectSlot: (slot: ParkingSlot) => void;
}

export const ParkingSlotsView: React.FC<ParkingSlotsViewProps> = ({
  slots,
  onSelectSlot,
}) => {
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [zoneFilter, setZoneFilter] = useState<'ALL' | 'TWO_WHEELER' | 'FOUR_WHEELER'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'SECURITY_LOCKED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [selected3DSlot, setSelected3DSlot] = useState<ParkingSlot | null>(null);

  const filteredSlots = slots.filter((s) => {
    if (zoneFilter !== 'ALL' && s.type !== zoneFilter) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      const matchSlot = s.id.toUpperCase().includes(q);
      const matchPlate = s.vehicleNumber ? s.vehicleNumber.toUpperCase().includes(q) : false;
      if (!matchSlot && !matchPlate) return false;
    }
    return true;
  });

  const twoWheelerSlots = filteredSlots.filter((s) => s.type === 'TWO_WHEELER');
  const fourWheelerSlots = filteredSlots.filter((s) => s.type === 'FOUR_WHEELER');

  const twoWheelerOccupied = slots.filter((s) => s.type === 'TWO_WHEELER' && s.status === 'OCCUPIED').length;
  const fourWheelerOccupied = slots.filter((s) => s.type === 'FOUR_WHEELER' && s.status === 'OCCUPIED').length;

  return (
    <div className="space-y-6">
      {/* 1. HEADER & CONTROLS */}
      <div className="card-classic p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#D5EBDD]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#3F8F5B] animate-camera-pulse"></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#185C36]">
                15 Allocated Campus Bays
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#183025] tracking-tight">
              Parking Grid Visualization
            </h2>
            <p className="text-xs text-[#5E7165] mt-0.5 font-medium">
              Two-Wheelers: T-01..T-10 • Four-Wheelers: F-01..F-05. White: Available (+), Mint: Occupied.
            </p>
          </div>

          {/* Quick zone metrics & View mode toggle */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-[#EAF8EE] border border-[#D5EBDD] p-1 rounded-xl">
              <button
                onClick={() => setViewMode('2D')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === '2D'
                    ? 'bg-white text-[#185C36] shadow-xs'
                    : 'text-[#5E7165] hover:text-[#183025]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tactical 2D</span>
              </button>
              <button
                onClick={() => setViewMode('3D')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === '3D'
                    ? 'bg-[#3F8F5B] text-white shadow-xs'
                    : 'text-[#5E7165] hover:text-[#183025]'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D Isometric</span>
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EAF8EE] border border-[#D5EBDD] text-[#185C36] font-semibold">
              <Bike className="w-4 h-4 text-[#3F8F5B]" />
              <span>Zone T:</span>
              <strong className="font-mono text-[#183025]">{twoWheelerOccupied}/10</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EAF8EE] border border-[#D5EBDD] text-[#185C36] font-semibold">
              <Car className="w-4 h-4 text-[#3F8F5B]" />
              <span>Zone F:</span>
              <strong className="font-mono text-[#183025]">{fourWheelerOccupied}/5</strong>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="pt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[#A8DDB8] absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by slot ID or plate..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D5EBDD] bg-[#F1FBF4] text-xs text-[#183025] placeholder:text-[#5E7165] focus:outline-hidden focus:border-[#3F8F5B] focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Zone Filter */}
            <div className="flex items-center gap-1 bg-[#EAF8EE] border border-[#D5EBDD] p-1 rounded-xl">
              <button
                onClick={() => setZoneFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  zoneFilter === 'ALL'
                    ? 'bg-white text-[#185C36] shadow-xs'
                    : 'text-[#5E7165] hover:text-[#183025]'
                }`}
              >
                All Zones
              </button>
              <button
                onClick={() => setZoneFilter('TWO_WHEELER')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  zoneFilter === 'TWO_WHEELER'
                    ? 'bg-white text-[#185C36] shadow-xs'
                    : 'text-[#5E7165] hover:text-[#183025]'
                }`}
              >
                2W Zone
              </button>
              <button
                onClick={() => setZoneFilter('FOUR_WHEELER')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  zoneFilter === 'FOUR_WHEELER'
                    ? 'bg-white text-[#185C36] shadow-xs'
                    : 'text-[#5E7165] hover:text-[#183025]'
                }`}
              >
                4W Zone
              </button>
            </div>

              {/* Status Filter */}
            <div className="flex flex-wrap items-center gap-1 bg-[#EAF8EE] border border-[#D5EBDD] p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-[#185C36] shadow-xs'
                    : 'text-[#5E7165] hover:text-[#183025]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('AVAILABLE')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'AVAILABLE'
                    ? 'bg-[#D9FBE5] text-[#185C36]'
                    : 'text-[#5E7165] hover:text-[#183025]'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setStatusFilter('OCCUPIED')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'OCCUPIED'
                    ? 'bg-white text-[#183025] shadow-xs'
                    : 'text-[#5E7165] hover:text-[#183025]'
                }`}
              >
                Occupied
              </button>
              <button
                onClick={() => setStatusFilter('RESERVED')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'RESERVED'
                    ? 'bg-[#FEF3C7] text-[#92400E] shadow-xs'
                    : 'text-[#5E7165] hover:text-[#92400E]'
                }`}
              >
                Reserved (VIP)
              </button>
              <button
                onClick={() => setStatusFilter('SECURITY_LOCKED')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'SECURITY_LOCKED'
                    ? 'bg-[#FEE2E2] text-[#991B1B] shadow-xs'
                    : 'text-[#5E7165] hover:text-[#991B1B]'
                }`}
              >
                Security Locked
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Isometric Architectural Three.js WebGL Model */}
      {viewMode === '3D' && (
        <IsometricParking3D
          slots={slots}
          selectedSlot={selected3DSlot}
          onSelectSlot={(slot) => {
            setSelected3DSlot(slot);
            onSelectSlot(slot);
          }}
          statusFilter={statusFilter}
          zoneFilter={zoneFilter}
        />
      )}

      {/* 2. PARKING OCCUPANCY (Tactical 2D) */}
      {viewMode === '2D' && (
        <div className="space-y-6">
          {/* Two-Wheeler Zone */}
        {(zoneFilter === 'ALL' || zoneFilter === 'TWO_WHEELER') && twoWheelerSlots.length > 0 && (
          <div className="rounded-3xl border border-[#D5EBDD] bg-[#EAF8EE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#D5EBDD]">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-[#3F8F5B]" />
                <h3 className="font-extrabold text-sm text-[#185C36]">
                  Two-Wheeler Zone (T-01 to T-10)
                </h3>
              </div>
              <span className="text-xs text-[#185C36] font-bold">
                {twoWheelerSlots.filter((s) => s.status === 'AVAILABLE').length} Available
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {twoWheelerSlots.map((slot) => {
                const isOccupied = slot.status === 'OCCUPIED';
                const isReserved = slot.status === 'RESERVED';
                const isLocked = slot.status === 'SECURITY_LOCKED';

                return (
                  <div key={slot.id} className="relative group">
                    <button
                      onClick={() => onSelectSlot(slot)}
                      className={`slot-bay-card w-full rounded-2xl p-3.5 border cursor-pointer text-left flex flex-col justify-between h-28 ${
                        isLocked
                          ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
                          : isReserved
                          ? 'bg-[#FFFBEB] border-[#FCD34D] text-[#92400E]'
                          : isOccupied
                          ? 'bg-[#DFF6E6] border-[#3F8F5B] text-[#183025]'
                          : 'bg-white border-[#D5EBDD] text-[#183025]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-xs">{slot.id}</span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isLocked
                              ? 'bg-[#991B1B]'
                              : isReserved
                              ? 'bg-[#D97706]'
                              : isOccupied
                              ? 'bg-[#185C36]'
                              : 'bg-[#3F8F5B]'
                          }`}
                        />
                      </div>

                      <div className="my-auto flex justify-center py-1">
                        {isLocked ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-[#FCA5A5] text-[#991B1B] shadow-xs">
                            <Lock className="w-4 h-4" />
                          </div>
                        ) : isReserved ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-[#FCD34D] text-[#D97706] shadow-xs">
                            <Star className="w-4 h-4" />
                          </div>
                        ) : isOccupied ? (
                          <div className="vehicle-silhouette flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-[#A8DDB8] text-[#185C36] shadow-xs">
                            <Bike className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl border border-dashed border-[#A8DDB8] flex items-center justify-center text-[#3F8F5B] font-bold text-xs">
                            +
                          </div>
                        )}
                      </div>

                      {isLocked ? (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-extrabold text-[#991B1B]">
                            SECURITY LOCKED
                          </div>
                          <div className="text-[10px] text-[#5E7165]">
                            Protected Bay
                          </div>
                        </div>
                      ) : isReserved ? (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-extrabold text-[#D97706]">
                            RESERVED (VIP)
                          </div>
                          <div className="text-[10px] text-[#5E7165]">
                            {slot.vehicleNumber || 'Priority Bay'}
                          </div>
                        </div>
                      ) : isOccupied ? (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-bold truncate text-[#185C36]">
                            {slot.vehicleNumber}
                          </div>
                          <div className="text-[10px] text-[#5E7165]">
                            In: {slot.entryHour !== undefined ? ReceiptService.formatHour(slot.entryHour) : ''}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-bold text-[#3F8F5B]">
                            AVAILABLE
                          </div>
                          <div className="text-[10px] text-[#5E7165]">
                            2W Bay
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Four-Wheeler Zone */}
        {(zoneFilter === 'ALL' || zoneFilter === 'FOUR_WHEELER') && fourWheelerSlots.length > 0 && (
          <div className="rounded-3xl border border-[#D5EBDD] bg-[#EAF8EE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#D5EBDD]">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-[#3F8F5B]" />
                <h3 className="font-extrabold text-sm text-[#185C36]">
                  Four-Wheeler Zone (F-01 to F-05)
                </h3>
              </div>
              <span className="text-xs text-[#185C36] font-bold">
                {fourWheelerSlots.filter((s) => s.status === 'AVAILABLE').length} Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {fourWheelerSlots.map((slot) => {
                const isOccupied = slot.status === 'OCCUPIED';
                const isReserved = slot.status === 'RESERVED';
                const isLocked = slot.status === 'SECURITY_LOCKED';

                return (
                  <div key={slot.id} className="relative group">
                    <button
                      onClick={() => onSelectSlot(slot)}
                      className={`slot-bay-card w-full rounded-2xl p-3.5 border cursor-pointer text-left flex flex-col justify-between h-32 ${
                        isLocked
                          ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
                          : isReserved
                          ? 'bg-[#FFFBEB] border-[#FCD34D] text-[#92400E]'
                          : isOccupied
                          ? 'bg-[#DFF6E6] border-[#3F8F5B] text-[#183025]'
                          : 'bg-white border-[#D5EBDD] text-[#183025]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-xs">{slot.id}</span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isLocked
                              ? 'bg-[#991B1B]'
                              : isReserved
                              ? 'bg-[#D97706]'
                              : isOccupied
                              ? 'bg-[#185C36]'
                              : 'bg-[#3F8F5B]'
                          }`}
                        />
                      </div>

                      <div className="my-auto flex justify-center py-1">
                        {isLocked ? (
                          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-[#FCA5A5] text-[#991B1B] shadow-xs">
                            <Lock className="w-5 h-5" />
                          </div>
                        ) : isReserved ? (
                          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-[#FCD34D] text-[#D97706] shadow-xs">
                            <Star className="w-5 h-5" />
                          </div>
                        ) : isOccupied ? (
                          <div className="vehicle-silhouette flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-[#A8DDB8] text-[#185C36] shadow-xs">
                            <Car className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-xl border border-dashed border-[#A8DDB8] flex items-center justify-center text-[#3F8F5B] font-bold text-xs">
                            +
                          </div>
                        )}
                      </div>

                      {isLocked ? (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-extrabold text-[#991B1B]">
                            SECURITY LOCKED
                          </div>
                          <div className="text-[10px] text-[#5E7165]">
                            Protected Bay
                          </div>
                        </div>
                      ) : isReserved ? (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-extrabold text-[#D97706]">
                            RESERVED (VIP)
                          </div>
                          <div className="text-[10px] text-[#5E7165]">
                            {slot.vehicleNumber || 'Priority Bay'}
                          </div>
                        </div>
                      ) : isOccupied ? (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-bold truncate text-[#185C36]">
                            {slot.vehicleNumber}
                          </div>
                          <div className="text-[10px] text-[#5E7165]">
                            In: {slot.entryHour !== undefined ? ReceiptService.formatHour(slot.entryHour) : ''}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-bold text-[#3F8F5B]">
                            AVAILABLE
                          </div>
                          <div className="text-[10px] text-[#5E7165]">
                            4W Bay
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
      )}

      {filteredSlots.length === 0 && (
        <div className="card-classic p-12 text-center text-[#5E7165]">
          <Info className="w-8 h-8 mx-auto mb-2 text-[#A8DDB8]" />
          <p className="text-sm font-semibold text-[#183025]">No parking slots matched your filter or search query.</p>
        </div>
      )}
    </div>
  );
};
