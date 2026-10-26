import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ParkingSlot,
  Vehicle,
  ParkingSession,
  Receipt,
  VehicleType,
  CollegeMember,
} from './types';
import { StorageService } from './services/StorageService';
import { StatisticsService } from './services/StatisticsService';
import { ParkingService } from './services/ParkingService';
import { ApiClient } from './services/apiClient';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/views/DashboardView';
import { VehicleEntryView } from './components/views/VehicleEntryView';
import { VehicleExitView } from './components/views/VehicleExitView';
import { ParkingSlotsView } from './components/views/ParkingSlotsView';
import { VehicleFinderView } from './components/views/VehicleFinderView';
import { ParkingHistoryView } from './components/views/ParkingHistoryView';
import { ReportsView } from './components/views/ReportsView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { CollegeRegistryView } from './components/views/CollegeRegistryView';
import { AlertsCenterView } from './components/views/AlertsCenterView';
import { AboutView } from './components/views/AboutView';
import { AIGateCameraView } from './components/views/AIGateCameraView';
import { VipReservationView } from './components/views/VipReservationView';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { SlotDetailModal } from './components/modals/SlotDetailModal';
import { SmartParkingPassModal } from './components/modals/SmartParkingPassModal';
import { CheckCircle2, AlertCircle, Info, X, Database, RefreshCw } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Database Connection State
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // Core application state loaded from SQLite Backend / StorageService
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [activeVehicles, setActiveVehicles] = useState<Vehicle[]>([]);
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [members, setMembers] = useState<CollegeMember[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);

  // Navigation parameters passed across views
  const [exitSearchKey, setExitSearchKey] = useState<string>('');
  const [entryVehicleType, setEntryVehicleType] = useState<VehicleType>('TWO_WHEELER');

  // Modal dialog states
  const [activeReceiptForModal, setActiveReceiptForModal] = useState<Receipt | null>(null);
  const [activeSlotForModal, setActiveSlotForModal] = useState<ParkingSlot | null>(null);
  const [activeMemberForPassModal, setActiveMemberForPassModal] = useState<CollegeMember | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  // Reload state from SQLite API with local cache synchronization
  const reloadState = useCallback(async () => {
    try {
      const [
        backendSlots,
        backendVehicles,
        backendSessions,
        backendReceipts,
        backendMembers,
        backendAlerts,
      ] = await Promise.all([
        ApiClient.getSlots(),
        ApiClient.getVehicles('PARKED'),
        ApiClient.getActiveSessions(),
        ApiClient.getReceipts(),
        ApiClient.getMembers(),
        ApiClient.getAlerts(),
      ]);

      setSlots(backendSlots);
      setActiveVehicles(backendVehicles);
      setSessions(backendSessions);
      setReceipts(backendReceipts);
      setMembers(backendMembers);
      setUnreadAlertsCount(backendAlerts.filter((a) => a.status === 'UNREAD').length);
      setIsDbConnected(true);

      // Keep localStorage in sync as cache (non-blocking)
      try {
        StorageService.saveSlots(backendSlots);
        StorageService.saveActiveVehicles(backendVehicles);
        StorageService.saveSessions(backendSessions);
        StorageService.saveReceipts(backendReceipts);
        StorageService.saveCollegeMembers(backendMembers);
        StorageService.saveAlerts(backendAlerts);
      } catch {
        // localStorage errors are non-critical
      }
    } catch (err) {
      console.error('Failed to fetch from SQLite backend:', err);
      setIsDbConnected(false);
      // Initialize with empty state instead of localStorage fallback
      // This ensures we don't show stale data when backend is offline
      setSlots([]);
      setActiveVehicles([]);
      setSessions([]);
      setReceipts([]);
      setMembers([]);
      setUnreadAlertsCount(0);
    }
  }, []);

  const handleRetryConnection = async () => {
    setIsReconnecting(true);
    await reloadState();
    setIsReconnecting(false);
    showToast('Checked SQLite database connection.', 'info');
  };

  // Initial load - fetch from API first, don't reset localStorage on mount
  useEffect(() => {
    // Only initialize storage structure if needed, but never reset to defaults on page load
    // The API is the source of truth; localStorage is only a cache
    reloadState();
  }, [reloadState]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Compute live statistics
  const stats = StatisticsService.computeDailyStatistics(
    slots,
    sessions,
    receipts,
    StorageService.getCameraEvents(),
    members.length,
    unreadAlertsCount
  );

  // Handlers
  const handleEntrySuccess = () => {
    reloadState();
    showToast('Vehicle entry recorded successfully!', 'success');
  };

  const handleCheckoutSuccess = (receipt: Receipt) => {
    reloadState();
    setActiveReceiptForModal(receipt);
    showToast(`Check-out completed for ${receipt.vehicleNumber}. Receipt generated.`, 'success');
  };

  const handleSeedDemoData = async () => {
    try {
      await ApiClient.seedDemoData();
      showToast('Demo vehicles loaded into SQLite database!', 'info');
    } catch {
      ParkingService.seedRealisticDemoData();
      showToast('Demo vehicles loaded locally!', 'info');
    }
    reloadState();
  };

  const handleResetSystem = async () => {
    if (window.confirm('Reset all campus parking records? All 15 slots will become AVAILABLE in SQLite.')) {
      try {
        await ApiClient.resetSystem();
      } catch {
        StorageService.resetToDefaults();
      }
      reloadState();
      showToast('System reset. All 15 parking slots are now available.', 'info');
    }
  };

  const handleSlotModalNavigateToExit = (searchKey: string) => {
    setExitSearchKey(searchKey);
    setActiveTab('exit');
  };

  const handleSlotModalNavigateToEntry = (preferredType: string) => {
    setEntryVehicleType(preferredType as VehicleType);
    setActiveTab('entry');
  };

  return (
    <div className="min-h-screen bg-[#F1FBF4] flex flex-col font-sans text-[#183025] selection:bg-[#C8F1D5] selection:text-[#185C36]">
      {/* Toast Notification with Framer Motion slide-in & fade */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed top-4 right-4 z-50 pointer-events-auto"
          >
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-[0_12px_35px_rgba(24,92,54,0.12)] text-xs font-medium border bg-white ${
                toast.type === 'success'
                  ? 'border-[#A8DDB8] text-[#183025]'
                  : toast.type === 'error'
                  ? 'border-rose-200 text-[#B45353]'
                  : 'border-[#D5EBDD] text-[#183025]'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#3F8F5B] shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-[#B45353] shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-[#3F8F5B] shrink-0" />}
              <span>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-2 p-1 text-[#5E7165] hover:text-[#183025] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 min-h-screen">
        {/* Responsive Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          availableSlotsCount={stats.availableSlots}
          totalSlotsCount={stats.totalSlots}
          unreadAlertsCount={unreadAlertsCount}
          activeReservationsCount={slots.filter((s) => s.status === 'RESERVED' || s.status === 'SECURITY_LOCKED').length}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onSeedDemoData={handleSeedDemoData}
            onResetSystem={handleResetSystem}
            isDbConnected={isDbConnected}
          />

          {/* SQLite Backend Offline Warning Banner with Retry Option */}
          {!isDbConnected && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>SQLite Backend Offline:</strong> Running on local browser cache. Changes will not sync to SQLite server until connected.
                </span>
              </div>
              <button
                onClick={handleRetryConnection}
                disabled={isReconnecting}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-medium border border-amber-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
                <span>{isReconnecting ? 'Connecting...' : 'Retry Connection'}</span>
              </button>
            </div>
          )}

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {/* Smooth Page Transitions using AnimatePresence */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === 'dashboard' && (
                  <DashboardView
                    stats={stats}
                    slots={slots}
                    sessions={sessions}
                    onSelectTab={setActiveTab}
                    onSlotClick={(slot) => setActiveSlotForModal(slot)}
                    onSeedDemoData={handleSeedDemoData}
                  />
                )}

                {activeTab === 'camera' && (
                  <AIGateCameraView
                    slots={slots}
                    activeVehicles={activeVehicles}
                    onActionComplete={reloadState}
                    onNavigateToManualEntry={() => setActiveTab('entry')}
                    onNavigateToManualExit={(plate) => {
                      if (plate) setExitSearchKey(plate);
                      setActiveTab('exit');
                    }}
                    onOpenReceiptModal={(receipt) => {
                      reloadState();
                      setActiveReceiptForModal(receipt);
                      showToast(`Check-out completed for ${receipt.vehicleNumber}. Receipt generated.`, 'success');
                    }}
                    onNavigateToRegistry={() => setActiveTab('registry')}
                  />
                )}

                {activeTab === 'reservations' && (
                  <VipReservationView
                    slots={slots}
                    onRefreshSlots={reloadState}
                    showToast={showToast}
                  />
                )}

                {activeTab === 'entry' && (
                  <VehicleEntryView
                    slots={slots}
                    initialVehicleType={entryVehicleType}
                    onEntrySuccess={handleEntrySuccess}
                    onNavigateToExit={(plate) => {
                      setExitSearchKey(plate);
                      setActiveTab('exit');
                    }}
                  />
                )}

                {activeTab === 'exit' && (
                  <VehicleExitView
                    initialSearchKey={exitSearchKey}
                    activeVehicles={activeVehicles}
                    onCheckoutSuccess={handleCheckoutSuccess}
                  />
                )}

                {activeTab === 'slots' && (
                  <ParkingSlotsView
                    slots={slots}
                    onSelectSlot={(slot) => setActiveSlotForModal(slot)}
                  />
                )}

                {activeTab === 'finder' && (
                  <VehicleFinderView
                    activeVehicles={activeVehicles}
                    sessions={sessions}
                    onNavigateToExit={(plate) => {
                      setExitSearchKey(plate);
                      setActiveTab('exit');
                    }}
                  />
                )}

                {activeTab === 'registry' && (
                  <CollegeRegistryView
                    onOpenPassModal={(member) => setActiveMemberForPassModal(member)}
                    onRefreshRegistry={reloadState}
                  />
                )}

                {activeTab === 'analytics' && (
                  <AnalyticsView
                    stats={stats}
                    slots={slots}
                    sessions={sessions}
                  />
                )}

                {activeTab === 'alerts' && (
                  <AlertsCenterView onRefreshAlerts={reloadState} />
                )}

                {activeTab === 'history' && (
                  <ParkingHistoryView
                    receipts={receipts}
                    onViewReceipt={(receipt) => setActiveReceiptForModal(receipt)}
                  />
                )}

                {activeTab === 'reports' && (
                  <ReportsView stats={stats} sessions={sessions} />
                )}

                {activeTab === 'about' && (
                  <AboutView
                    onSeedDemoData={handleSeedDemoData}
                    onResetSystem={handleResetSystem}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        receipt={activeReceiptForModal}
        isOpen={activeReceiptForModal !== null}
        onClose={() => setActiveReceiptForModal(null)}
      />

      {/* Slot Inspection Modal */}
      <SlotDetailModal
        slot={activeSlotForModal}
        isOpen={activeSlotForModal !== null}
        onClose={() => setActiveSlotForModal(null)}
        onNavigateToExit={handleSlotModalNavigateToExit}
        onNavigateToEntry={handleSlotModalNavigateToEntry}
      />

      {/* Digital Campus Parking Pass Modal */}
      <SmartParkingPassModal
        member={activeMemberForPassModal}
        isOpen={activeMemberForPassModal !== null}
        onClose={() => setActiveMemberForPassModal(null)}
      />
    </div>
  );
}

export default App;
