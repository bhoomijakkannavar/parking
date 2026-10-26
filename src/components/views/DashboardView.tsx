import React from 'react';
import { motion } from 'framer-motion';
import {
  ParkingSlot,
  ParkingSession,
  DailyStatistics,
} from '../../types';
import { APP_CONFIG, OWNER_CATEGORY_LABELS, VEHICLE_TYPE_LABELS } from '../../constants';
import { LicensePlate } from '../common/LicensePlate';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { NavTab } from '../layout/Sidebar';
import { ReceiptService } from '../../services/ReceiptService';
import { WrongParkingDashboardSection } from './WrongParkingDashboardSection';
import {
  Car,
  Bike,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  LogIn,
  Camera,
  Users,
  Bell,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface DashboardViewProps {
  stats: DailyStatistics;
  slots: ParkingSlot[];
  sessions: ParkingSession[];
  onSelectTab: (tab: NavTab) => void;
  onSlotClick: (slot: ParkingSlot) => void;
  onSeedDemoData: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  slots,
  sessions,
  onSelectTab,
  onSlotClick,
  onSeedDemoData,
}) => {
  const twoWheelerSlots = slots.filter((s) => s.type === 'TWO_WHEELER');
  const fourWheelerSlots = slots.filter((s) => s.type === 'FOUR_WHEELER');

  const recentActiveSessions = sessions.filter((s) => s.status === 'ACTIVE').slice(-5).reverse();
  const recentCompletedSessions = sessions.filter((s) => s.status === 'COMPLETED').slice(-5).reverse();

  const availablePercent = Math.round((stats.availableSlots / stats.totalSlots) * 100);
  const occupiedPercent = Math.round((stats.occupiedSlots / stats.totalSlots) * 100);

  // Stagger variants for hero
  const heroContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const heroItemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  };

  return (
    <div className="space-y-6">
      {/* 1. BRIGHT GREEN + WHITE PREMIUM HERO SECTION */}
      <motion.div
        variants={heroContainerVariants}
        initial="hidden"
        animate="visible"
        className="hero-card-bright p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        {/* Subtle decorative green circular & grid patterns */}
        <div className="absolute right-0 top-0 w-96 h-96 pointer-events-none opacity-[0.10] overflow-hidden">
          <svg viewBox="0 0 200 200" className="w-full h-full text-[#3F8F5B]">
            <circle cx="170" cy="30" r="90" fill="currentColor" />
            <circle cx="110" cy="110" r="45" fill="#C8F1D5" />
            <path d="M 0 50 L 200 50 M 0 100 L 200 100 M 0 150 L 200 150" stroke="currentColor" strokeWidth="2" strokeDasharray="6,6" />
          </svg>
        </div>

        <div className="space-y-3 max-w-2xl relative z-10">
          <motion.div variants={heroItemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#A8DDB8] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#3F8F5B] animate-camera-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#185C36]">
              ● Campus Parking Operations • Main Gate Terminal
            </span>
          </motion.div>

          <motion.div variants={heroItemVariants}>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#183025] leading-tight">
              <span className="text-[#185C36] bg-gradient-to-r from-[#185C36] to-[#3F8F5B] bg-clip-text text-transparent">
                Smart Campus
              </span>{' '}
              Parking Management
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-[#3F8F5B] to-[#A8DDB8] rounded-full mt-2" />
          </motion.div>

          <motion.p variants={heroItemVariants} className="text-sm text-[#5E7165] leading-relaxed font-medium">
            Monitor campus parking, automate vehicle processing, and make smarter parking decisions with live ANPR camera telemetry.
          </motion.p>

          {/* Hero Statistics Mini Cards */}
          <motion.div
            variants={heroItemVariants}
            className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs"
          >
            <div className="p-3 rounded-2xl bg-white/85 border border-[#D5EBDD] shadow-xs hover:-translate-y-1 transition-transform">
              <span className="text-[10px] font-semibold uppercase text-[#5E7165] block">Total Slots</span>
              <span className="text-lg font-bold font-mono text-[#183025]">{stats.totalSlots}</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/85 border border-[#D5EBDD] shadow-xs hover:-translate-y-1 transition-transform">
              <span className="text-[10px] font-semibold uppercase text-[#5E7165] block">Occupied</span>
              <span className="text-lg font-bold font-mono text-[#185C36]">{stats.occupiedSlots}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#D9FBE5] border border-[#A8DDB8] shadow-xs hover:-translate-y-1 transition-transform">
              <span className="text-[10px] font-bold uppercase text-[#185C36] block">Available</span>
              <span className="text-lg font-extrabold font-mono text-[#185C36]">{stats.availableSlots}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#FEF3C7] border border-[#FCD34D] shadow-xs hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => onSelectTab('reservations')}>
              <span className="text-[10px] font-bold uppercase text-[#92400E] block">VIP / Locked</span>
              <span className="text-lg font-extrabold font-mono text-[#92400E]">
                {slots.filter((s) => s.status === 'RESERVED' || s.status === 'SECURITY_LOCKED').length}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#E2F7E9] border border-[#A8DDB8] shadow-xs hover:-translate-y-1 transition-transform">
              <span className="text-[10px] font-semibold uppercase text-[#185C36] block">Collection</span>
              <span className="text-lg font-bold font-mono text-[#185C36]">
                {APP_CONFIG.currencySymbol}<AnimatedCounter value={stats.totalFeesCollected} duration={500} />
              </span>
            </div>
          </motion.div>
        </div>

        {/* Hero Visual: 3D Miniature Parking Lot Graphic with Gentle Floating Animation */}
        <motion.div
          variants={heroItemVariants}
          className="relative shrink-0 flex flex-col items-center justify-center z-10 self-center lg:self-auto"
        >
          <div className="animate-float-slow w-60 h-44 sm:w-68 sm:h-48 rounded-2xl bg-gradient-to-br from-white via-[#E7F8EC] to-[#CFF2D9] border-2 border-[#A8DDB8] p-3 shadow-lg flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-bold text-[#185C36] border-b border-[#D5EBDD] pb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3F8F5B] animate-camera-pulse"></span>
                TERMINAL-01 SENSOR
              </span>
              <span className="bg-[#D9FBE5] px-2 py-0.5 rounded-full border border-[#A8DDB8]">
                LIVE MAP
              </span>
            </div>

            {/* Visual 3D Miniature Bays */}
            <div className="grid grid-cols-5 gap-1.5 py-1">
              {slots.slice(0, 10).map((s) => (
                <div
                  key={s.id}
                  className={`h-7 rounded-lg border flex items-center justify-center text-[9px] font-mono font-bold transition-transform hover:scale-105 ${
                    s.status === 'SECURITY_LOCKED'
                      ? 'bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B]'
                      : s.status === 'RESERVED'
                      ? 'bg-[#FEF3C7] border-[#FCD34D] text-[#92400E]'
                      : s.status === 'OCCUPIED'
                      ? 'bg-[#C8F1D5] border-[#3F8F5B] text-[#185C36]'
                      : 'bg-white border-[#D5EBDD] text-[#5E7165]'
                  }`}
                >
                  {s.status === 'SECURITY_LOCKED' ? '🔒' : s.status === 'RESERVED' ? '⭐' : s.status === 'OCCUPIED' ? '🚗' : s.id}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-1.5 border-t border-[#D5EBDD] text-[10px]">
              <span className="text-[#5E7165] font-medium">Auto-Allocated</span>
              <span className="font-bold text-[#185C36]">15 Smart Bays</span>
            </div>
          </div>

          <div className="flex gap-2.5 mt-3">
            <button
              onClick={() => onSelectTab('reservations')}
              className="px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] hover:bg-[#FDE68A] shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Reserve VIP</span>
            </button>
            <button
              onClick={() => onSelectTab('camera')}
              className="btn-primary-muted px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>AI Camera</span>
            </button>
            <button
              onClick={() => onSelectTab('entry')}
              className="btn-secondary-white px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-[#3F8F5B]" />
              <span>Vehicle Entry</span>
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* 2. STATISTIC CARDS — WHITE TO MINT GRADIENTS WITH WATERMARK ICONS & HOVER LIFT */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Slots */}
        <div className="card-classic card-interactive card-stat-total p-4 flex flex-col justify-between cursor-default">
          <div className="flex items-center justify-between text-[#5E7165] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#185C36]">Total Slots</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#A8DDB8]"></span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[#183025]">
              <AnimatedCounter value={stats.totalSlots} />
            </div>
            <div className="text-xs text-[#5E7165] mt-1 font-medium">
              100% capacity baseline
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#D5EBDD] text-[11px] text-[#5E7165] flex justify-between font-mono">
            <span>2W: 10</span>
            <span>4W: 5</span>
          </div>

          {/* Faint Watermark Icon */}
          <Car className="absolute -bottom-2 -right-2 w-16 h-16 text-[#3F8F5B] opacity-[0.06] pointer-events-none" />
        </div>

        {/* Occupied Slots */}
        <div className="card-classic card-interactive card-stat-occupied p-4 flex flex-col justify-between cursor-default">
          <div className="flex items-center justify-between text-[#5E7165] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#185C36]">Occupied</span>
            <Car className="w-4 h-4 text-[#3F8F5B] transition-transform duration-200 group-hover:translate-x-1" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[#183025]">
              <AnimatedCounter value={stats.occupiedSlots} />
            </div>
            <div className="text-xs text-[#5E7165] mt-1 font-medium">
              {occupiedPercent}% of campus capacity
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#D5EBDD] text-[11px] text-[#5E7165] flex justify-between font-mono">
            <span>2W: {stats.twoWheelerStats.occupied}</span>
            <span>4W: {stats.fourWheelerStats.occupied}</span>
          </div>

          {/* Faint Watermark Icon */}
          <Car className="absolute -bottom-2 -right-2 w-16 h-16 text-[#3F8F5B] opacity-[0.06] pointer-events-none" />
        </div>

        {/* Available Slots — Highlight Mint */}
        <div className="card-classic card-interactive card-stat-available p-4 flex flex-col justify-between cursor-default border-[#A8DDB8]">
          <div className="flex items-center justify-between text-[#185C36] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available</span>
            <CheckCircle2 className="w-4 h-4 text-[#3F8F5B] transition-transform duration-200 group-hover:rotate-6 group-hover:scale-110" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#185C36]">
              <AnimatedCounter value={stats.availableSlots} />
            </div>
            <div className="text-xs text-[#185C36] mt-1 font-semibold">
              {availablePercent}% of total capacity
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#A8DDB8] text-[11px] text-[#185C36] flex justify-between font-mono font-medium">
            <span>2W: {stats.twoWheelerStats.available} free</span>
            <span>4W: {stats.fourWheelerStats.available} free</span>
          </div>

          {/* Faint Watermark Icon */}
          <CheckCircle2 className="absolute -bottom-2 -right-2 w-16 h-16 text-[#3F8F5B] opacity-[0.07] pointer-events-none" />
        </div>

        {/* Vehicles Processed */}
        <div className="card-classic card-interactive card-stat-processed p-4 flex flex-col justify-between cursor-default">
          <div className="flex items-center justify-between text-[#5E7165] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#185C36]">Processed</span>
            <TrendingUp className="w-4 h-4 text-[#3F8F5B] transition-transform duration-200 group-hover:-translate-y-0.5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[#183025]">
              <AnimatedCounter value={stats.totalVehiclesParkedToday} />
            </div>
            <div className="text-xs text-[#5E7165] mt-1 font-medium">
              Total campus traffic today
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#D5EBDD] text-[11px] text-[#5E7165] flex justify-between font-mono">
            <span>Active: {stats.currentlyParked}</span>
            <span>Exited: {stats.totalCompletedCheckouts}</span>
          </div>

          {/* Faint Watermark Icon */}
          <TrendingUp className="absolute -bottom-2 -right-2 w-16 h-16 text-[#3F8F5B] opacity-[0.06] pointer-events-none" />
        </div>

        {/* Today's Collection */}
        <div className="card-classic card-interactive card-stat-collection p-4 flex flex-col justify-between col-span-2 sm:col-span-1 cursor-default">
          <div className="flex items-center justify-between text-[#5E7165] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#185C36]">Collection</span>
            <span className="text-xs font-mono font-bold text-[#3F8F5B] transition-transform duration-200 group-hover:scale-125 inline-block">₹</span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#185C36]">
              <AnimatedCounter value={stats.totalFeesCollected} prefix={APP_CONFIG.currencySymbol} />
            </div>
            <div className="text-xs text-[#5E7165] mt-1 font-medium">
              Settled audit revenue
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#D5EBDD] text-[11px] text-[#5E7165] flex justify-between font-mono">
            <span>Receipts</span>
            <span>{stats.totalCompletedCheckouts} txns</span>
          </div>

          {/* Faint Watermark Icon */}
          <Sparkles className="absolute -bottom-2 -right-2 w-16 h-16 text-[#3F8F5B] opacity-[0.06] pointer-events-none" />
        </div>
      </div>

      {/* 3. SECONDARY ENTERPRISE STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div
          onClick={() => onSelectTab('registry')}
          className="card-classic card-interactive p-3.5 flex items-center justify-between cursor-pointer bg-white"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-[#185C36] block">Registered Fleet</span>
            <span className="font-mono font-bold text-[#183025] text-sm">
              <AnimatedCounter value={stats.registeredVehiclesCount || 6} suffix=" Members" />
            </span>
          </div>
          <Users className="w-4 h-4 text-[#3F8F5B]" />
        </div>

        <div
          onClick={() => onSelectTab('camera')}
          className="card-classic card-interactive p-3.5 flex items-center justify-between cursor-pointer bg-white"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-[#185C36] block">AI Gate Scans</span>
            <span className="font-mono font-bold text-[#183025] text-sm">
              <AnimatedCounter value={stats.cameraDetectionsToday || 0} suffix=" Events" />
            </span>
          </div>
          <Camera className="w-4 h-4 text-[#3F8F5B]" />
        </div>

        <div
          onClick={() => onSelectTab('alerts')}
          className="card-classic card-interactive p-3.5 flex items-center justify-between cursor-pointer bg-white"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-[#185C36] block">Security Radar</span>
            <span className="font-mono font-bold text-[#183025] text-sm">
              {stats.activeAlertsCount || 0} Active Alerts
            </span>
          </div>
          <Bell className="w-4 h-4 text-[#B7791F]" />
        </div>

        <div
          onClick={() => onSelectTab('analytics')}
          className="card-classic card-interactive p-3.5 flex items-center justify-between cursor-pointer bg-white"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-[#185C36] block">Parking Intel</span>
            <span className="font-mono font-bold text-[#183025] text-sm">
              Hourly Forecast
            </span>
          </div>
          <TrendingUp className="w-4 h-4 text-[#3F8F5B]" />
        </div>
      </div>

      {/* 3.5. AI WRONG PARKING DETECTION & SIREN ALERTS RADAR */}
      <WrongParkingDashboardSection
        slots={slots}
        sessions={sessions}
      />

      {/* 4. PARKING BAYS — MINI PARKING ENVIRONMENT (BACKGROUND #EAF8EE) */}
      <div className="rounded-3xl border border-[#D5EBDD] bg-[#EAF8EE] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#D5EBDD]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-[#183025]">Campus Parking Bays</h3>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-white border border-[#D5EBDD] text-[#185C36]">
                15 Allocated Bays
              </span>
            </div>
            <p className="text-xs text-[#5E7165] mt-0.5 font-medium">
              Mini parking environment. White slots: Available (+). Mint slots: Occupied. Click any bay to inspect.
            </p>
          </div>

          <button
            onClick={() => onSelectTab('slots')}
            className="group text-xs font-bold text-[#185C36] hover:text-[#3F8F5B] flex items-center gap-1 cursor-pointer self-start sm:self-auto transition-colors bg-white px-3 py-1.5 rounded-xl border border-[#D5EBDD] shadow-xs"
          >
            <span>Full 3D / Tactical Map</span>
            <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>

        {/* Two-Wheeler Zone (10 Slots) */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#185C36] mb-3">
            <span className="flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-[#3F8F5B]" />
              Two-Wheeler Zone (T-01 to T-10)
            </span>
            <span className="font-mono text-[11px] text-[#5E7165]">
              {stats.twoWheelerStats.occupied}/10 Occupied
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
            {twoWheelerSlots.map((slot) => {
              const isOcc = slot.status === 'OCCUPIED';
              return (
                <div key={slot.id} className="relative group">
                  <button
                    onClick={() => onSlotClick(slot)}
                    className={`slot-bay-card w-full p-2.5 rounded-2xl border text-left cursor-pointer flex flex-col justify-between h-24 ${
                      isOcc
                        ? 'bg-[#DFF6E6] border-[#3F8F5B] text-[#183025]'
                        : 'bg-white border-[#D5EBDD] text-[#183025]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-mono font-bold text-xs">{slot.id}</span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isOcc ? 'bg-[#185C36]' : 'bg-[#3F8F5B]'
                        }`}
                      />
                    </div>

                    {/* Miniature vehicle silhouette visualization */}
                    <div className="my-auto flex justify-center items-center py-1">
                      {isOcc ? (
                        <div className="vehicle-silhouette flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-[#A8DDB8] text-[#185C36] shadow-xs">
                          <Bike className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl border border-dashed border-[#A8DDB8] flex items-center justify-center text-[#3F8F5B] font-bold text-xs">
                          +
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] font-bold truncate leading-tight text-[#185C36]">
                        {isOcc ? slot.vehicleNumber || 'Occupied' : 'AVAILABLE'}
                      </div>
                      <div className="text-[9px] text-[#5E7165] font-medium flex items-center justify-between">
                        <span>{isOcc && slot.entryHour !== undefined ? ReceiptService.formatHour(slot.entryHour) : '2W Bay'}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[#3F8F5B] font-bold text-[8px] transition-opacity">
                          View →
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Four-Wheeler Zone (5 Slots) */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#185C36] mb-3">
            <span className="flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-[#3F8F5B]" />
              Four-Wheeler Zone (F-01 to F-05)
            </span>
            <span className="font-mono text-[11px] text-[#5E7165]">
              {stats.fourWheelerStats.occupied}/5 Occupied
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {fourWheelerSlots.map((slot) => {
              const isOcc = slot.status === 'OCCUPIED';
              return (
                <div key={slot.id} className="relative group">
                  <button
                    onClick={() => onSlotClick(slot)}
                    className={`slot-bay-card w-full p-3 rounded-2xl border text-left cursor-pointer flex flex-col justify-between h-28 ${
                      isOcc
                        ? 'bg-[#DFF6E6] border-[#3F8F5B] text-[#183025]'
                        : 'bg-white border-[#D5EBDD] text-[#183025]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-mono font-bold text-xs">{slot.id}</span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isOcc ? 'bg-[#185C36]' : 'bg-[#3F8F5B]'
                        }`}
                      />
                    </div>

                    {/* Miniature car silhouette visualization */}
                    <div className="my-auto flex justify-center items-center py-1">
                      {isOcc ? (
                        <div className="vehicle-silhouette flex items-center justify-center w-12 h-7 rounded-xl bg-white border border-[#A8DDB8] text-[#185C36] shadow-xs">
                          <Car className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-12 h-7 rounded-xl border border-dashed border-[#A8DDB8] flex items-center justify-center text-[#3F8F5B] font-bold text-xs">
                          + PARK
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold truncate leading-tight text-[#185C36]">
                        {isOcc ? slot.vehicleNumber || 'Occupied' : 'AVAILABLE'}
                      </div>
                      <div className="text-[10px] text-[#5E7165] font-medium flex items-center justify-between">
                        <span>{isOcc && slot.entryHour !== undefined ? ReceiptService.formatHour(slot.entryHour) : '4W Bay'}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[#3F8F5B] font-bold text-[9px] transition-opacity">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. ACTIVITY & TRANSACTION SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actively Parked */}
        <div className="card-classic p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D5EBDD]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3F8F5B]"></span>
              <h3 className="font-bold text-sm text-[#183025]">
                Currently Parked ({recentActiveSessions.length})
              </h3>
            </div>
            <button
              onClick={() => onSelectTab('finder')}
              className="text-xs text-[#185C36] hover:text-[#3F8F5B] font-bold cursor-pointer transition-colors"
            >
              Search
            </button>
          </div>

          {recentActiveSessions.length === 0 ? (
            <div className="py-10 text-center text-[#5E7165] text-xs">
              <p>No vehicles currently parked.</p>
              <button
                onClick={onSeedDemoData}
                className="mt-2 inline-flex items-center gap-1 text-[#185C36] hover:text-[#3F8F5B] font-bold cursor-pointer transition-colors"
              >
                + Populate realistic demo vehicles
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActiveSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#F1FBF4] border border-[#D5EBDD] text-xs hover:bg-[#DDF5E4] hover:border-[#A8DDB8] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <LicensePlate plateNumber={s.vehicleNumber} size="sm" />
                    <div>
                      <span className="font-bold text-[#183025]">Slot {s.slotId}</span>
                      <span className="text-[#5E7165] text-[11px] block">
                        {OWNER_CATEGORY_LABELS[s.ownerCategory]} • {VEHICLE_TYPE_LABELS[s.vehicleType]}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[#5E7165] font-mono text-[11px] flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-[#A8DDB8]" />
                      In: {ReceiptService.formatHour(s.entryHour)}
                    </span>
                    <button
                      onClick={() => onSelectTab('exit')}
                      className="text-[11px] font-bold text-[#185C36] hover:text-[#3F8F5B] cursor-pointer transition-colors"
                    >
                      Check out →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completed Transactions */}
        <div className="card-classic p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D5EBDD]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5E7165]"></span>
              <h3 className="font-bold text-sm text-[#183025]">
                Settled Check-Outs ({recentCompletedSessions.length})
              </h3>
            </div>
            <button
              onClick={() => onSelectTab('history')}
              className="text-xs text-[#185C36] hover:text-[#3F8F5B] font-bold cursor-pointer transition-colors"
            >
              Full History
            </button>
          </div>

          {recentCompletedSessions.length === 0 ? (
            <div className="py-10 text-center text-[#5E7165] text-xs">
              No completed transactions recorded yet today.
            </div>
          ) : (
            <div className="space-y-2">
              {recentCompletedSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#F1FBF4] border border-[#D5EBDD] text-xs hover:bg-[#DDF5E4] hover:border-[#A8DDB8] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <LicensePlate plateNumber={s.vehicleNumber} size="sm" />
                    <div>
                      <span className="font-bold text-[#183025]">
                        {s.duration} hr(s) parked
                      </span>
                      <span className="text-[#5E7165] text-[11px] block">
                        Slot {s.slotId} • {OWNER_CATEGORY_LABELS[s.ownerCategory]}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#185C36] text-sm">
                      {APP_CONFIG.currencySymbol}{s.fee}
                    </span>
                    <span className="text-[10px] text-[#3F8F5B] font-bold block">Settled</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
