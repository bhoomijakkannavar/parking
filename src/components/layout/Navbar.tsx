import React, { useState, useEffect } from 'react';
import { NavTab } from './Sidebar';
import {
  Menu,
  Clock,
  Sparkles,
  RotateCcw,
  LogIn,
  LogOut,
  Calendar,
  Camera,
  Database,
} from 'lucide-react';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMobileSidebar: () => void;
  onSeedDemoData: () => void;
  onResetSystem: () => void;
  isDbConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenMobileSidebar,
  onSeedDemoData,
  onResetSystem,
  isDbConnected = true,
}) => {
  const [time, setTime] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getTitleAndSubtitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Dashboard',
          subtitle: 'Real-time campus parking operations & vehicle telemetry',
        };
      case 'camera':
        return {
          title: 'AI Gate Camera',
          subtitle: 'Automated ANPR scanning & institutional gate verification',
        };
      case 'entry':
        return {
          title: 'Vehicle Entry',
          subtitle: 'Manual vehicle check-in & automated bay allocation',
        };
      case 'exit':
        return {
          title: 'Vehicle Exit',
          subtitle: 'Vehicle checkout, duration calculation & fee settlement',
        };
      case 'reservations':
        return {
          title: 'VIP & Emergency Priority Reservations',
          subtitle: 'Security-controlled bay reservations, slot locking & fast-track arrival routing',
        };
      case 'slots':
        return {
          title: 'Parking Slots',
          subtitle: 'Live visual occupancy map across 15 allocated bays',
        };
      case 'finder':
        return {
          title: 'Vehicle Finder',
          subtitle: 'Search and locate currently parked campus vehicles',
        };
      case 'registry':
        return {
          title: 'College Registry',
          subtitle: 'Institutional member directory & authorized vehicles',
        };
      case 'analytics':
        return {
          title: 'Analytics & Intelligence',
          subtitle: 'Occupancy forecasting, dwell times & fleet breakdown',
        };
      case 'alerts':
        return {
          title: 'Alerts Center',
          subtitle: 'Security anomaly surveillance & capacity warnings',
        };
      case 'history':
        return {
          title: 'Parking History',
          subtitle: 'Audit log of completed parking sessions & receipts',
        };
      case 'reports':
        return {
          title: 'Reports & Export',
          subtitle: 'Daily operational reports & CSV data export',
        };
      case 'about':
        return {
          title: 'About SCPM',
          subtitle: 'System architecture, rule specifications & test suite',
        };
      default:
        return {
          title: 'Smart Campus Parking Management',
          subtitle: 'Main Gate Terminal • NIT Campus',
        };
    }
  };

  const { title, subtitle } = getTitleAndSubtitle();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#D5EBDD] px-4 sm:px-6 py-3 transition-all shadow-[0_2px_12px_rgba(24,92,54,0.03)]">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & View title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="p-2 -ml-2 rounded-xl text-[#5E7165] hover:text-[#185C36] hover:bg-[#DDF5E4] lg:hidden cursor-pointer transition-colors"
            aria-label="Open Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#183025] tracking-tight leading-tight">
              {title}
            </h1>
            <p className="hidden sm:block text-[12px] text-[#5E7165]">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Date, Time, AI Camera Status, Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Live Date & Clock Pill with light mint elevation */}
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#F1FBF4] border border-[#D5EBDD] text-xs text-[#5E7165] font-mono transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs hover:border-[#A8DDB8]">
            <span className="flex items-center gap-1.5 font-sans">
              <Calendar className="w-3.5 h-3.5 text-[#3F8F5B]" />
              {dateStr}
            </span>
            <span className="text-[#D5EBDD]">|</span>
            <span className="flex items-center gap-1.5 font-semibold text-[#185C36]">
              <Clock className="w-3.5 h-3.5 text-[#3F8F5B]" />
              {time}
            </span>
          </div>

          {/* SQLite DB Status Pill */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-xs transition-colors ${
              isDbConnected
                ? 'bg-[#EAF8EE] border-[#A8DDB8] text-[#185C36]'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
            title={isDbConnected ? 'Persistent SQLite Database: scpm.db active' : 'SQLite server unreachable (running cached)'}
          >
            <Database className={`w-3.5 h-3.5 ${isDbConnected ? 'text-[#3F8F5B]' : 'text-amber-600'}`} />
            <span>{isDbConnected ? 'SQLite Active' : 'DB Offline'}</span>
          </div>

          {/* AI Camera Status Pill with pulsing green dot */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D9FBE5] border border-[#A8DDB8] text-[11px] font-bold text-[#185C36] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#3F8F5B] animate-camera-pulse"></span>
            <span>Camera Online</span>
          </div>

          {/* Quick Entry Button: Light Green Button */}
          <button
            onClick={() => onSelectTab('entry')}
            className={`group hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-180 cursor-pointer border active:translate-y-0 ${
              activeTab === 'entry'
                ? 'bg-[#3F8F5B] text-white border-[#3F8F5B] shadow-sm'
                : 'bg-[#D9FBE5] text-[#185C36] hover:bg-[#C8F1D5] border-[#A8DDB8] hover:-translate-y-0.5 hover:shadow-xs'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-[#185C36] group-hover:translate-x-0.5 transition-transform duration-180" />
            <span>Entry</span>
          </button>

          {/* Quick Exit Button: White with Green Outline */}
          <button
            onClick={() => onSelectTab('exit')}
            className={`group hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-180 cursor-pointer border active:translate-y-0 ${
              activeTab === 'exit'
                ? 'bg-[#183025] text-white border-[#183025] shadow-sm'
                : 'bg-white text-[#185C36] hover:bg-[#DDF5E4] border-[#D5EBDD] hover:border-[#A8DDB8] hover:-translate-y-0.5 hover:shadow-xs'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 text-[#185C36] group-hover:translate-x-0.5 transition-transform duration-180" />
            <span>Exit</span>
          </button>

          {/* Demo Data button: Light Mint Button */}
          <button
            onClick={onSeedDemoData}
            title="Populate realistic demo vehicles"
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#EAF8EE] text-[#185C36] hover:bg-[#D9FBE5] border border-[#D5EBDD] hover:border-[#A8DDB8] hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 transition-all duration-180 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#3F8F5B] group-hover:rotate-12 transition-transform duration-200" />
            <span className="hidden sm:inline">Demo Data</span>
            <span className="sm:hidden">Demo</span>
          </button>

          {/* Reset button */}
          <button
            onClick={onResetSystem}
            title="Reset storage to 15 empty slots"
            className="p-1.5 rounded-xl text-[#5E7165] hover:text-[#B45353] hover:bg-rose-50 border border-[#D5EBDD] hover:border-rose-200 hover:-translate-y-0.5 transition-all duration-180 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
