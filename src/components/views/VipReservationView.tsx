import React, { useState, useEffect, useMemo } from 'react';
import {
  ParkingSlot,
  ParkingReservation,
  SlotSecurityLock,
  ReservationType,
  ReservationStatus,
  VehicleType,
  FastTrackArrivalResult,
} from '../../types';
import { ApiClient } from '../../services/apiClient';
import { StorageService } from '../../services/StorageService';
import { LicensePlate } from '../common/LicensePlate';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Star,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Car,
  Bike,
  Sparkles,
  Info,
  KeyRound,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface VipReservationViewProps {
  slots: ParkingSlot[];
  onRefreshSlots: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const VipReservationView: React.FC<VipReservationViewProps> = ({
  slots,
  onRefreshSlots,
  showToast,
}) => {
  // Navigation sub-tabs inside Reservation Management
  const [activeSubTab, setActiveSubTab] = useState<'RESERVATIONS' | 'CREATE' | 'LOCKS' | 'FAST_TRACK'>('RESERVATIONS');

  // Core Data States
  const [reservations, setReservations] = useState<ParkingReservation[]>([]);
  const [locks, setLocks] = useState<SlotSecurityLock[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Security Credentials State (default to Security Officer for seamless operation)
  const [operatorRole, setOperatorRole] = useState<'SECURITY_OFFICER' | 'CAMPUS_OFFICIAL' | 'REGULAR_USER'>('SECURITY_OFFICER');
  const [operatorId, setOperatorId] = useState('SEC-OFF-01');
  const [securityPin, setSecurityPin] = useState('1234');

  // Create Reservation Form State
  const [createType, setCreateType] = useState<ReservationType>('VIP_GUEST');
  const [createSlotId, setCreateSlotId] = useState<string>('F-01');
  const [createVehicleNumber, setCreateVehicleNumber] = useState('');
  const [createGuestName, setCreateGuestName] = useState('');
  const [createStartTime, setCreateStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [createEndTime, setCreateEndTime] = useState(() => {
    const d = new Date(Date.now() + 4 * 3600 * 1000);
    d.setMinutes(0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [createReason, setCreateReason] = useState('Executive Campus Visitation & Committee Review');
  const [createDept, setCreateDept] = useState('Office of the Principal & Deans');
  const [createNotes, setCreateNotes] = useState('Priority VIP bay protection active. Reserved bay inspection complete.');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Lock Slot Form State
  const [lockSlotId, setLockSlotId] = useState<string>('F-02');
  const [lockType, setLockType] = useState<'SECURITY_LOCKED' | 'RESERVED'>('SECURITY_LOCKED');
  const [lockReason, setLockReason] = useState('Security protocol cordon - Reserved exclusively for Convocation Dignitaries');
  const [isSubmittingLock, setIsSubmittingLock] = useState(false);

  // Modal Dialogs State
  const [cancelModalRes, setCancelModalRes] = useState<ParkingReservation | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [unlockModalSlot, setUnlockModalSlot] = useState<ParkingSlot | null>(null);
  const [unlockReasonInput, setUnlockReasonInput] = useState('');
  const [isSubmittingUnlock, setIsSubmittingUnlock] = useState(false);

  // Fast-Track Arrival State
  const [fastTrackSearchPlate, setFastTrackSearchPlate] = useState('');
  const [fastTrackResult, setFastTrackResult] = useState<FastTrackArrivalResult | null>(null);
  const [isProcessingFastTrack, setIsProcessingFastTrack] = useState(false);

  // Load Data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resList, lockList] = await Promise.all([
        ApiClient.getReservations(),
        ApiClient.getSecurityLocks(),
      ]);
      setReservations(resList);
      setLocks(lockList);
      // Cache to localStorage (non-blocking)
      try {
        StorageService.saveReservations(resList);
      } catch {
        // localStorage errors are non-critical
      }
    } catch (err) {
      console.error('Failed to fetch reservations and locks:', err);
      // Do NOT fall back to localStorage - show empty state instead
      // This prevents stale local data from being presented as current
      setReservations([]);
      setLocks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Reservations List
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && r.reservationType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toUpperCase();
        const matchPlate = r.vehicleNumber ? r.vehicleNumber.toUpperCase().includes(q) : false;
        const matchId = r.id.toUpperCase().includes(q);
        const matchSlot = r.slotId.toUpperCase().includes(q);
        const matchName = r.guestName.toUpperCase().includes(q);
        if (!matchPlate && !matchId && !matchSlot && !matchName) return false;
      }
      return true;
    });
  }, [reservations, statusFilter, typeFilter, searchQuery]);

  // Format ISO timestamps to user-friendly AM/PM
  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  // Helper: Get human label & styling for reservation type
  const getTypeBadge = (type: ReservationType) => {
    switch (type) {
      case 'EMERGENCY':
        return {
          label: 'Emergency Vehicle',
          bg: 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]',
          icon: ShieldAlert,
        };
      case 'VIP_GUEST':
        return {
          label: 'VIP Campus Guest',
          bg: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]',
          icon: Star,
        };
      case 'EVENT_GUEST':
        return {
          label: 'Campus Event Guest',
          bg: 'bg-[#E0E7FF] text-[#3730A3] border-[#C7D2FE]',
          icon: Shield,
        };
    }
  };

  // Helper: Get status badge styling
  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-[#D9FBE5] text-[#185C36] border-[#A8DDB8]';
      case 'CHECKED_IN':
        return 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]';
      case 'COMPLETED':
        return 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]';
      case 'CANCELLED':
        return 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]';
      case 'EXPIRED':
        return 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]';
    }
  };

  // Handler: Create Reservation
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);

    try {
      const res = await ApiClient.createReservation({
        reservationType: createType,
        slotId: createSlotId,
        vehicleNumber: createVehicleNumber.trim() || undefined,
        guestName: createGuestName.trim() || 'VIP Campus Dignitary',
        startTime: new Date(createStartTime).toISOString(),
        endTime: new Date(createEndTime).toISOString(),
        reason: createReason.trim(),
        contactDepartment: createDept.trim() || undefined,
        notes: createNotes.trim() || undefined,
        operatorRole,
        operatorId,
        securityPin,
      });

      if (res.unauthorized) {
        showToast(res.message || 'Unauthorized: Only authorized personnel can create reservations.', 'error');
        setIsSubmittingCreate(false);
        return;
      }

      if (!res.success) {
        showToast(res.message || 'Failed to create reservation.', 'error');
        setIsSubmittingCreate(false);
        return;
      }

      showToast(`Reservation confirmed for Bay ${createSlotId}!`, 'success');
      onRefreshSlots();
      await fetchData();
      setActiveSubTab('RESERVATIONS');
      // Reset form fields
      setCreateVehicleNumber('');
      setCreateGuestName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handler: Cancel Reservation
  const handleConfirmCancel = async () => {
    if (!cancelModalRes) return;
    setIsSubmittingCancel(true);

    try {
      const res = await ApiClient.cancelReservation(cancelModalRes.id, {
        reason: cancelReasonInput.trim() || 'Cancelled by authorized staff',
        operatorRole,
        operatorId,
        securityPin,
      });

      if (res.unauthorized) {
        showToast('Unauthorized: Regular users cannot cancel reservations.', 'error');
      } else if (res.success) {
        showToast(`Reservation ${cancelModalRes.id} cancelled. Protected slot status released.`, 'success');
        setCancelModalRes(null);
        setCancelReasonInput('');
        onRefreshSlots();
        await fetchData();
      } else {
        showToast(res.message || 'Failed to cancel reservation.', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Handler: Lock Slot
  const handleLockSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockReason.trim()) {
      showToast('A mandatory reason is required to lock a bay.', 'error');
      return;
    }

    setIsSubmittingLock(true);
    try {
      const res = await ApiClient.lockSlot(lockSlotId, {
        slotId: lockSlotId,
        lockType,
        reason: lockReason.trim(),
        operatorRole,
        operatorId,
        securityPin,
      });

      if (res.unauthorized) {
        showToast('Forbidden: Only Security Officers can lock bays.', 'error');
      } else if (res.success) {
        showToast(`Bay ${lockSlotId} successfully locked as ${lockType}!`, 'success');
        onRefreshSlots();
        await fetchData();
      } else {
        showToast(res.message || 'Failed to lock bay.', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingLock(false);
    }
  };

  // Handler: Unlock Slot
  const handleConfirmUnlock = async () => {
    if (!unlockModalSlot) return;
    if (!unlockReasonInput.trim()) {
      showToast('A mandatory release reason is required.', 'error');
      return;
    }

    setIsSubmittingUnlock(true);
    try {
      const res = await ApiClient.unlockSlot(unlockModalSlot.id, {
        slotId: unlockModalSlot.id,
        releaseReason: unlockReasonInput.trim(),
        operatorRole,
        operatorId,
        securityPin,
      });

      if (res.unauthorized) {
        showToast('Forbidden: Only Security Officers can unlock protected bays.', 'error');
      } else if (res.success) {
        showToast(`Bay ${unlockModalSlot.id} released and unlocked.`, 'success');
        setUnlockModalSlot(null);
        setUnlockReasonInput('');
        onRefreshSlots();
        await fetchData();
      } else {
        showToast(res.message || 'Failed to unlock bay.', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingUnlock(false);
    }
  };

  // Handler: Fast-Track Arrival Check
  const handleRunFastTrack = async (plateToTest?: string) => {
    const target = (plateToTest || fastTrackSearchPlate).trim();
    if (!target) {
      showToast('Please enter or select a vehicle plate number to verify arrival.', 'error');
      return;
    }

    setIsProcessingFastTrack(true);
    try {
      const result = await ApiClient.processFastTrackArrival({
        vehicleNumber: target,
        operatorRole,
        operatorId,
        securityPin,
      });
      setFastTrackResult(result);
      if (result.approved) {
        showToast(`Fast-Track Approved! Directed to Bay ${result.allocatedSlotId}`, 'success');
        onRefreshSlots();
        await fetchData();
      } else {
        showToast(result.message, 'info');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setIsProcessingFastTrack(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & OPERATOR CREDENTIALS STRIP */}
      <div className="card-classic p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#D5EBDD]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#185C36] animate-camera-pulse"></span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#185C36]">
                Security-Governed Priority Protection
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#183025] tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#3F8F5B]" />
              VIP & Emergency Priority Parking System
            </h2>
            <p className="text-xs text-[#5E7165] mt-1 font-medium">
              Guaranteed bay reservations, security-controlled slot locks, and fast-track arrival routing. Protected slots are strictly excluded from ordinary student/visitor allocation.
            </p>
          </div>

          {/* Security Operator Credential Selector */}
          <div className="bg-[#EAF8EE] border border-[#D5EBDD] rounded-2xl p-3 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-[#185C36] font-bold">
              <KeyRound className="w-4 h-4 text-[#3F8F5B]" />
              <span>Active Role:</span>
            </div>
            <select
              value={operatorRole}
              onChange={(e) => setOperatorRole(e.target.value as any)}
              className="bg-white border border-[#D5EBDD] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#183025] focus:outline-hidden focus:border-[#3F8F5B]"
            >
              <option value="SECURITY_OFFICER">Security Officer (PIN: 1234)</option>
              <option value="CAMPUS_OFFICIAL">Campus Official / Staff</option>
              <option value="REGULAR_USER">Regular User (Student / Visitor)</option>
            </select>
            <div className="flex items-center gap-1 text-[11px] text-[#5E7165]">
              <span>PIN:</span>
              <input
                type="password"
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value)}
                className="w-14 bg-white border border-[#D5EBDD] rounded px-1.5 py-0.5 font-mono text-center text-xs"
              />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div className="flex items-center gap-1 bg-[#EAF8EE] border border-[#D5EBDD] p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('RESERVATIONS')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === 'RESERVATIONS'
                  ? 'bg-white text-[#185C36] shadow-xs'
                  : 'text-[#5E7165] hover:text-[#183025]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Active Reservations ({reservations.filter((r) => r.status === 'ACTIVE' || r.status === 'CHECKED_IN').length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('CREATE')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === 'CREATE'
                  ? 'bg-[#3F8F5B] text-white shadow-xs'
                  : 'text-[#5E7165] hover:text-[#183025]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create VIP / Emergency Reservation</span>
            </button>
            <button
              onClick={() => setActiveSubTab('LOCKS')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === 'LOCKS'
                  ? 'bg-white text-[#185C36] shadow-xs'
                  : 'text-[#5E7165] hover:text-[#183025]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Security Slot Locks ({locks.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('FAST_TRACK')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === 'FAST_TRACK'
                  ? 'bg-white text-[#185C36] shadow-xs'
                  : 'text-[#5E7165] hover:text-[#183025]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fast-Track Arrival Simulator</span>
            </button>
          </div>

          <button
            onClick={() => {
              fetchData();
              onRefreshSlots();
              showToast('Refreshed reservations and bay locks.', 'info');
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D5EBDD] text-xs font-semibold text-[#185C36] hover:bg-[#EAF8EE] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-TAB 1: RESERVATIONS LIST & FILTER */}
      {activeSubTab === 'RESERVATIONS' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl border border-[#D5EBDD] p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#5E7165] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by plate, ID, bay, guest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl text-xs text-[#183025] focus:outline-hidden focus:border-[#3F8F5B]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Type Filter */}
              <div className="flex items-center gap-1 bg-[#EAF8EE] border border-[#D5EBDD] p-1 rounded-xl text-xs">
                <span className="text-[11px] font-bold text-[#185C36] px-1">Type:</span>
                {['ALL', 'VIP_GUEST', 'EMERGENCY', 'EVENT_GUEST'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      typeFilter === t
                        ? 'bg-white text-[#185C36] shadow-xs'
                        : 'text-[#5E7165] hover:text-[#183025]'
                    }`}
                  >
                    {t === 'ALL' ? 'All' : t === 'VIP_GUEST' ? 'VIP' : t === 'EMERGENCY' ? 'Emergency' : 'Event'}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-[#EAF8EE] border border-[#D5EBDD] p-1 rounded-xl text-xs">
                <span className="text-[11px] font-bold text-[#185C36] px-1">Status:</span>
                {['ALL', 'ACTIVE', 'CHECKED_IN', 'CANCELLED', 'EXPIRED'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      statusFilter === s
                        ? 'bg-white text-[#185C36] shadow-xs'
                        : 'text-[#5E7165] hover:text-[#183025]'
                    }`}
                  >
                    {s === 'ALL' ? 'All' : s === 'CHECKED_IN' ? 'Arrived' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reservations Cards Grid */}
          {filteredReservations.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#D5EBDD] p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#EAF8EE] text-[#185C36] flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-[#183025]">No reservations match your filters</h3>
              <p className="text-xs text-[#5E7165] max-w-md mx-auto">
                Create a VIP or Emergency priority reservation to reserve dedicated campus bays.
              </p>
              <button
                onClick={() => setActiveSubTab('CREATE')}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3F8F5B] text-white font-bold text-xs hover:bg-[#185C36] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Reservation</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReservations.map((res) => {
                const typeInfo = getTypeBadge(res.reservationType);
                const TypeIcon = typeInfo.icon;
                const isDeletable = res.status === 'ACTIVE' || res.status === 'CHECKED_IN';

                return (
                  <div
                    key={res.id}
                    className="bg-white rounded-2xl border border-[#D5EBDD] p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    {/* Top Type & Status Banner */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg border ${typeInfo.bg}`}>
                        <TypeIcon className="w-3.5 h-3.5" />
                        {typeInfo.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(res.status)}`}>
                        {res.status}
                      </span>
                    </div>

                    {/* Middle Details */}
                    <div className="space-y-2.5 mb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-extrabold text-sm text-[#183025]">{res.guestName}</h4>
                          <span className="text-[11px] text-[#5E7165] font-mono">{res.id}</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-xl bg-[#EAF8EE] border border-[#A8DDB8] text-[#185C36] font-mono font-extrabold text-xs">
                          Bay {res.slotId}
                        </div>
                      </div>

                      {/* Plate Badge if known */}
                      {res.vehicleNumber ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#5E7165]">Designated Plate:</span>
                          <LicensePlate plateNumber={res.vehicleNumber} size="sm" />
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#8C9E92] italic">Plate: TBA upon arrival</span>
                      )}

                      {/* Time Window */}
                      <div className="bg-[#F8FAF9] p-2.5 rounded-xl border border-[#E3EDE6] text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#5E7165] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#3F8F5B]" /> Window:
                          </span>
                          <span className="font-semibold text-[#183025]">
                            {formatDateTime(res.startTime)} — {formatDateTime(res.endTime)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5E7165] italic line-clamp-1">
                          Reason: {res.reason}
                        </p>
                      </div>

                      {res.contactDepartment && (
                        <div className="text-[10px] text-[#5E7165]">
                          <span className="font-semibold text-[#185C36]">Dept:</span> {res.contactDepartment}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-[#E3EDE6] flex items-center justify-between text-xs">
                      <span className="text-[10px] text-[#8C9E92]">
                        By {res.createdBy} ({res.createdByRole})
                      </span>

                      {isDeletable ? (
                        <button
                          onClick={() => {
                            setCancelModalRes(res);
                            setCancelReasonInput('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FEE2E2] hover:bg-[#FCA5A5] text-[#991B1B] font-bold text-xs cursor-pointer transition-colors"
                        >
                          Cancel & Release
                        </button>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#8C9E92]">
                          {res.status === 'CANCELLED' ? `Cancelled (${res.cancellationReason || 'Staff'})` : 'Closed'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. SUB-TAB 2: CREATE RESERVATION FORM */}
      {activeSubTab === 'CREATE' && (
        <div className="bg-white rounded-3xl border border-[#D5EBDD] p-6 max-w-3xl mx-auto shadow-xs">
          <div className="pb-4 border-b border-[#D5EBDD] mb-5">
            <h3 className="font-extrabold text-base text-[#183025] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#3F8F5B]" />
              Create Priority Parking Reservation
            </h3>
            <p className="text-xs text-[#5E7165] mt-1 font-medium">
              Reserve a specific bay for VIP campus guests, emergency vehicles, or campus events. Overlapping time conflicts are strictly rejected transactionally.
            </p>
          </div>

          <form onSubmit={handleCreateReservation} className="space-y-4 text-xs">
            {/* 1. Category Selector */}
            <div>
              <label className="block font-bold text-[#183025] mb-1.5">Reservation Category *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'VIP_GUEST', label: 'VIP Campus Guest', desc: 'Official dignitary / guest', icon: Star, color: 'border-[#FCD34D] bg-[#FFFBEB]' },
                  { id: 'EMERGENCY', label: 'Emergency Vehicle', desc: 'Ambulance, fire, security', icon: ShieldAlert, color: 'border-[#FCA5A5] bg-[#FEF2F2]' },
                  { id: 'EVENT_GUEST', label: 'Campus Event Guest', desc: 'Conference / seminar panelist', icon: Shield, color: 'border-[#C7D2FE] bg-[#EEF2FF]' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = createType === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setCreateType(item.id as ReservationType)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? `${item.color} ring-2 ring-[#3F8F5B]`
                          : 'border-[#D5EBDD] bg-white hover:bg-[#F8FAF9]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-[#185C36]" />
                        <span className="font-extrabold text-xs text-[#183025]">{item.label}</span>
                      </div>
                      <p className="text-[10px] text-[#5E7165]">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Slot Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#183025] mb-1">Assigned Parking Bay *</label>
                <select
                  value={createSlotId}
                  onChange={(e) => setCreateSlotId(e.target.value)}
                  className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs font-bold text-[#185C36] focus:outline-hidden focus:border-[#3F8F5B]"
                >
                  <optgroup label="Four-Wheeler Bays (F-01..F-05)">
                    {slots.filter((s) => s.type === 'FOUR_WHEELER').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} — Status: {s.status}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Two-Wheeler Bays (T-01..T-10)">
                    {slots.filter((s) => s.type === 'TWO_WHEELER').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} — Status: {s.status}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-[10px] text-[#5E7165] mt-0.5">
                  Regular drivers will NEVER be assigned this bay while reserved or locked.
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#183025] mb-1">Guest / Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vice Chancellor Dr. Sen / Fire Brigade"
                  value={createGuestName}
                  onChange={(e) => setCreateGuestName(e.target.value)}
                  className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs text-[#183025] focus:outline-hidden focus:border-[#3F8F5B]"
                />
              </div>
            </div>

            {/* 3. Vehicle Plate (Optional/If Known) & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#183025] mb-1">Vehicle Plate Number (if known)</label>
                <input
                  type="text"
                  placeholder="e.g. KA-01-VIP-0001 (Optional)"
                  value={createVehicleNumber}
                  onChange={(e) => setCreateVehicleNumber(e.target.value.toUpperCase())}
                  className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#183025] focus:outline-hidden focus:border-[#3F8F5B]"
                />
                <span className="text-[10px] text-[#5E7165]">Leave blank if license plate is not yet assigned.</span>
              </div>

              <div>
                <label className="block font-bold text-[#183025] mb-1">Authorized Department</label>
                <input
                  type="text"
                  placeholder="e.g. Office of the Principal / Emergency Ward"
                  value={createDept}
                  onChange={(e) => setCreateDept(e.target.value)}
                  className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs text-[#183025] focus:outline-hidden focus:border-[#3F8F5B]"
                />
              </div>
            </div>

            {/* 4. Time Window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#183025] mb-1">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={createStartTime}
                  onChange={(e) => setCreateStartTime(e.target.value)}
                  className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs text-[#183025] focus:outline-hidden focus:border-[#3F8F5B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#183025] mb-1">End Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={createEndTime}
                  onChange={(e) => setCreateEndTime(e.target.value)}
                  className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs text-[#183025] focus:outline-hidden focus:border-[#3F8F5B]"
                />
              </div>
            </div>

            {/* 5. Reason & Notes */}
            <div>
              <label className="block font-bold text-[#183025] mb-1">Mandatory Reservation Reason *</label>
              <input
                type="text"
                required
                placeholder="Reason for reservation (audited)"
                value={createReason}
                onChange={(e) => setCreateReason(e.target.value)}
                className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs text-[#183025] focus:outline-hidden focus:border-[#3F8F5B]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#183025] mb-1">Notes / Instructions</label>
              <textarea
                rows={2}
                placeholder="Special gate clearance, escort instructions, etc."
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs text-[#183025] focus:outline-hidden focus:border-[#3F8F5B]"
              />
            </div>

            {/* Submit Bar */}
            <div className="pt-3 border-t border-[#D5EBDD] flex items-center justify-between">
              <span className="text-[11px] text-[#5E7165]">
                Authorized as: <span className="font-bold text-[#185C36]">{operatorRole}</span>
              </span>
              <button
                type="submit"
                disabled={isSubmittingCreate}
                className="px-5 py-2.5 rounded-xl bg-[#3F8F5B] hover:bg-[#185C36] text-white font-extrabold text-xs cursor-pointer shadow-sm flex items-center gap-2"
              >
                {isSubmittingCreate ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>Confirm & Lock Bay</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. SUB-TAB 3: SECURITY-CONTROLLED SLOT LOCKS */}
      {activeSubTab === 'LOCKS' && (
        <div className="space-y-6">
          {/* Quick Lock Control Form */}
          <div className="bg-white rounded-3xl border border-[#D5EBDD] p-5 shadow-xs">
            <div className="pb-3 border-b border-[#D5EBDD] mb-4">
              <h3 className="font-extrabold text-sm text-[#183025] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#B45353]" />
                Security Bay Lock Control
              </h3>
              <p className="text-xs text-[#5E7165] mt-0.5">
                Authorized security users can directly lock any bay to <span className="font-bold text-[#991B1B]">SECURITY_LOCKED</span> or <span className="font-bold text-[#92400E]">RESERVED</span>. Ordinary allocation is transactionally blocked.
              </p>
            </div>

            <form onSubmit={handleLockSlot} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
              <div>
                <label className="block font-bold text-[#183025] mb-1">Select Bay</label>
                <select
                  value={lockSlotId}
                  onChange={(e) => setLockSlotId(e.target.value)}
                  className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs font-bold text-[#185C36]"
                >
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} ({s.type === 'TWO_WHEELER' ? '2W' : '4W'}) — {s.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#183025] mb-1">Lock Protection Level</label>
                <select
                  value={lockType}
                  onChange={(e) => setLockType(e.target.value as any)}
                  className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs font-bold text-[#183025]"
                >
                  <option value="SECURITY_LOCKED">SECURITY_LOCKED (Highest Security)</option>
                  <option value="RESERVED">RESERVED (Priority Protected)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#183025] mb-1">Mandatory Justification</label>
                <input
                  type="text"
                  required
                  placeholder="Security justification reason"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs text-[#183025]"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmittingLock}
                  className="w-full py-2.5 rounded-xl bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Lock className="w-4 h-4" />
                  <span>Enforce Security Lock</span>
                </button>
              </div>
            </form>
          </div>

          {/* All 15 Bays Status Grid */}
          <div className="bg-[#EAF8EE] rounded-3xl border border-[#D5EBDD] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5EBDD] mb-4">
              <h4 className="font-extrabold text-sm text-[#185C36]">
                All 15 Campus Parking Bays — Lock & Protection Status
              </h4>
              <span className="text-xs text-[#185C36] font-bold">
                {slots.filter((s) => s.status === 'SECURITY_LOCKED' || s.status === 'RESERVED').length} Protected Bays
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {slots.map((s) => {
                const isLocked = s.status === 'SECURITY_LOCKED';
                const isReserved = s.status === 'RESERVED';
                const isOccupied = s.status === 'OCCUPIED';
                const lockData = locks.find((l) => l.slotId === s.id);

                return (
                  <div
                    key={s.id}
                    className={`rounded-2xl border p-3 flex flex-col justify-between h-32 transition-all ${
                      isLocked
                        ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
                        : isReserved
                        ? 'bg-[#FFFBEB] border-[#FCD34D] text-[#92400E]'
                        : isOccupied
                        ? 'bg-[#DFF6E6] border-[#3F8F5B] text-[#183025]'
                        : 'bg-white border-[#D5EBDD] text-[#183025]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-extrabold text-xs">{s.id}</span>
                      {isLocked ? (
                        <Lock className="w-3.5 h-3.5 text-[#991B1B]" />
                      ) : isReserved ? (
                        <Star className="w-3.5 h-3.5 text-[#92400E]" />
                      ) : isOccupied ? (
                        <span className="w-2 h-2 rounded-full bg-[#185C36]"></span>
                      ) : (
                        <span className="text-[10px] text-[#3F8F5B] font-bold">FREE</span>
                      )}
                    </div>

                    <div className="my-auto">
                      <span className="text-[10px] font-extrabold tracking-wider block">
                        {s.status}
                      </span>
                      {lockData ? (
                        <span className="text-[9px] text-[#5E7165] line-clamp-1 italic">
                          {lockData.reason}
                        </span>
                      ) : s.vehicleNumber ? (
                        <span className="text-[10px] font-bold truncate block">{s.vehicleNumber}</span>
                      ) : null}
                    </div>

                    {isLocked || isReserved ? (
                      <button
                        onClick={() => {
                          setUnlockModalSlot(s);
                          setUnlockReasonInput('');
                        }}
                        className="w-full py-1 rounded-lg bg-white border border-[#D5EBDD] hover:bg-[#FEE2E2] text-[10px] font-bold text-[#991B1B] cursor-pointer"
                      >
                        Release Lock
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setLockSlotId(s.id);
                          setActiveSubTab('LOCKS');
                        }}
                        className="w-full py-1 rounded-lg bg-[#EAF8EE] hover:bg-[#DDF5E4] text-[10px] font-bold text-[#185C36] cursor-pointer"
                      >
                        Lock Bay
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 4: FAST-TRACK ARRIVAL SIMULATOR */}
      {activeSubTab === 'FAST_TRACK' && (
        <div className="bg-white rounded-3xl border border-[#D5EBDD] p-6 max-w-2xl mx-auto shadow-xs space-y-5">
          <div className="pb-3 border-b border-[#D5EBDD]">
            <h3 className="font-extrabold text-base text-[#183025] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#3F8F5B]" />
              VIP & Emergency Fast-Track Arrival Verification
            </h3>
            <p className="text-xs text-[#5E7165] mt-0.5">
              Simulate or verify gate arrival: checks active reservation, checks dedicated bay availability, and checks in vehicle without manual intervention.
            </p>
          </div>

          {/* Quick Plate Presets */}
          <div>
            <label className="block font-bold text-xs text-[#183025] mb-2">Preset Test Scenarios:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setFastTrackSearchPlate('KA-01-VIP-0001');
                  handleRunFastTrack('KA-01-VIP-0001');
                }}
                className="p-2.5 rounded-xl border border-[#FCD34D] bg-[#FFFBEB] text-left hover:bg-[#FEF3C7] cursor-pointer"
              >
                <div className="font-bold text-[#92400E]">Scenario 1: Valid VIP Plate</div>
                <div className="text-[10px] text-[#5E7165]">Test: "KA-01-VIP-0001"</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFastTrackSearchPlate('DL-01-EMG-108');
                  handleRunFastTrack('DL-01-EMG-108');
                }}
                className="p-2.5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] text-left hover:bg-[#FEE2E2] cursor-pointer"
              >
                <div className="font-bold text-[#991B1B]">Scenario 2: Emergency Ambulance</div>
                <div className="text-[10px] text-[#5E7165]">Test: "DL-01-EMG-108"</div>
              </button>
            </div>
          </div>

          {/* Manual Input Search */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter vehicle plate to verify (e.g. KA-01-VIP-0001)"
              value={fastTrackSearchPlate}
              onChange={(e) => setFastTrackSearchPlate(e.target.value.toUpperCase())}
              className="flex-1 bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#183025]"
            />
            <button
              onClick={() => handleRunFastTrack()}
              disabled={isProcessingFastTrack}
              className="px-5 py-2.5 rounded-xl bg-[#3F8F5B] hover:bg-[#185C36] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isProcessingFastTrack ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              <span>Run Verification</span>
            </button>
          </div>

          {/* Fast-Track Result Display */}
          {fastTrackResult && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 ${
                fastTrackResult.approved
                  ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#15803D]'
                  : fastTrackResult.status === 'SLOT_OCCUPIED_CONFLICT'
                  ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
                  : 'bg-[#FFFBEB] border-[#FCD34D] text-[#92400E]'
              }`}
            >
              <div className="flex items-center gap-2 font-extrabold text-sm">
                {fastTrackResult.approved ? (
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
                )}
                <span>Status: {fastTrackResult.status}</span>
              </div>
              <p className="text-xs font-medium">{fastTrackResult.message}</p>

              {fastTrackResult.allocatedSlotId && (
                <div className="font-bold">
                  Allocated Bay: <span className="font-mono underline">{fastTrackResult.allocatedSlotId}</span>
                </div>
              )}

              {fastTrackResult.alternativeSlots && fastTrackResult.alternativeSlots.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#FCA5A5]/40 text-xs">
                  <span className="font-bold">Available Alternative Bays:</span>{' '}
                  <span className="font-mono">{fastTrackResult.alternativeSlots.join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL: CANCEL RESERVATION PROMPT */}
      {cancelModalRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#185C36]/20 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#D5EBDD] p-6 max-w-md w-full shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE2E2] text-[#991B1B] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#183025]">Cancel Reservation {cancelModalRes.id}</h3>
                <p className="text-[11px] text-[#5E7165]">
                  Bay: <span className="font-bold text-[#185C36]">{cancelModalRes.slotId}</span> • Guest: {cancelModalRes.guestName}
                </p>
              </div>
            </div>

            <p className="text-[#5E7165]">
              Cancelling will release this bay's reservation status. If an independent security lock is active, the bay remains <span className="font-bold text-[#991B1B]">SECURITY_LOCKED</span>.
            </p>

            <div>
              <label className="block font-bold text-[#183025] mb-1">Cancellation Reason *</label>
              <input
                type="text"
                required
                placeholder="Reason for cancellation (audited)"
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs text-[#183025]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalRes(null)}
                className="px-4 py-2 rounded-xl border border-[#D5EBDD] font-bold text-xs text-[#5E7165] hover:bg-[#F8FAF9] cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
                className="px-4 py-2 rounded-xl bg-[#991B1B] hover:bg-[#7F1D1D] font-bold text-xs text-white cursor-pointer"
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: UNLOCK SLOT PROMPT */}
      {unlockModalSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#185C36]/20 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#D5EBDD] p-6 max-w-md w-full shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEF3C7] text-[#92400E] flex items-center justify-center shrink-0">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#183025]">Release Security Lock on Bay {unlockModalSlot.id}</h3>
                <p className="text-[11px] text-[#5E7165]">
                  Current Status: <span className="font-bold text-[#991B1B]">{unlockModalSlot.status}</span>
                </p>
              </div>
            </div>

            <p className="text-[#5E7165]">
              Only explicitly authorized security releases can clear this lock. Provide a mandatory operational justification.
            </p>

            <div>
              <label className="block font-bold text-[#183025] mb-1">Release Reason *</label>
              <input
                type="text"
                required
                placeholder="Reason for unlocking bay (mandatory)"
                value={unlockReasonInput}
                onChange={(e) => setUnlockReasonInput(e.target.value)}
                className="w-full bg-[#F6FAF7] border border-[#D5EBDD] rounded-xl px-3 py-2 text-xs text-[#183025]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUnlockModalSlot(null)}
                className="px-4 py-2 rounded-xl border border-[#D5EBDD] font-bold text-xs text-[#5E7165] hover:bg-[#F8FAF9] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlock}
                disabled={isSubmittingUnlock}
                className="px-4 py-2 rounded-xl bg-[#185C36] hover:bg-[#0D3820] font-bold text-xs text-white cursor-pointer"
              >
                {isSubmittingUnlock ? 'Releasing...' : 'Release & Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
