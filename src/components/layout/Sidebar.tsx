import React from 'react';
import { APP_CONFIG } from '../../constants';
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Grid3X3,
  Search,
  History,
  BarChart3,
  Info,
  Car,
  ShieldCheck,
  Camera,
  Users,
  TrendingUp,
  Bell,
  Box,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'entry'
  | 'exit'
  | 'reservations'
  | 'slots'
  | 'finder'
  | 'registry'
  | 'camera'
  | 'history'
  | 'analytics'
  | 'alerts'
  | 'reports'
  | 'about';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  availableSlotsCount: number;
  totalSlotsCount: number;
  unreadAlertsCount?: number;
  activeReservationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
  availableSlotsCount,
  totalSlotsCount,
  unreadAlertsCount = 0,
  activeReservationsCount = 0,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reservations' as NavTab, label: 'Reserve VIP Slot', icon: ShieldCheck, count: activeReservationsCount > 0 ? `${activeReservationsCount} Active` : undefined },
    { id: 'entry' as NavTab, label: 'Vehicle Entry', icon: LogIn },
    { id: 'exit' as NavTab, label: 'Vehicle Exit', icon: LogOut },
    { id: 'slots' as NavTab, label: '3D Parking Grid', icon: Box, count: `${availableSlotsCount}/${totalSlotsCount}` },
    { id: 'finder' as NavTab, label: 'Vehicle Finder', icon: Search },
    { id: 'registry' as NavTab, label: 'College Registry', icon: Users },
    { id: 'camera' as NavTab, label: 'AI Gate Camera', icon: Camera },
    { id: 'history' as NavTab, label: 'Parking History', icon: History },
    { id: 'analytics' as NavTab, label: 'Analytics & Intel', icon: TrendingUp },
    { id: 'alerts' as NavTab, label: 'Alerts Center', icon: Bell, alertCount: unreadAlertsCount },
    { id: 'reports' as NavTab, label: 'Reports & Export', icon: BarChart3 },
    { id: 'about' as NavTab, label: 'About', icon: Info },
  ];

  const occupancyPercent = Math.round(((totalSlotsCount - availableSlotsCount) / totalSlotsCount) * 100);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#185C36]/20 backdrop-blur-xs lg:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container: Bright Green + White Depth Gradient */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-[#F1FBF4] to-[#E7F7EC] border-r border-[#D5EBDD] text-[#183025] flex flex-col shadow-[0_4px_24px_rgba(24,92,54,0.06)] transition-transform duration-250 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with Green Circle Logo */}
        <div className="p-5 border-b border-[#D5EBDD] bg-white/60 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#3F8F5B] flex items-center justify-center text-white shrink-0 shadow-md transition-transform duration-200 hover:scale-105">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#185C36] text-base tracking-tight leading-none">
                  SCPM
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#D9FBE5] text-[#185C36] border border-[#A8DDB8]">
                  v{APP_CONFIG.version}
                </span>
              </div>
              <p className="text-[12px] text-[#5E7165] mt-1 leading-none font-medium">
                Smart Campus Parking
              </p>
            </div>
          </div>
        </div>

        {/* Capacity Summary with Bright Mint Accents */}
        <div className="px-4 py-3 border-b border-[#D5EBDD] bg-[#EAF8EE]/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#185C36] font-semibold text-[11px]">Campus Capacity</span>
            <span className="font-mono font-bold text-xs text-[#185C36]">
              {availableSlotsCount} Free ({100 - occupancyPercent}%)
            </span>
          </div>
          <div className="w-full bg-[#D5EBDD] h-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#68B77D] to-[#3F8F5B]"
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer text-left relative ${
                  isActive
                    ? 'bg-gradient-to-r from-[#BFECCA] to-[#E5F8EA] text-[#185C36] font-bold shadow-xs border border-[#A8DDB8]'
                    : 'text-[#183025] hover:bg-[#DDF5E4] hover:text-[#185C36] font-medium'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-6 rounded-r-md bg-[#3F8F5B] transition-all duration-200" />
                )}

                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      isActive
                        ? 'text-[#3F8F5B] translate-x-0.5'
                        : 'text-[#5E7165] group-hover:text-[#3F8F5B] group-hover:translate-x-0.5'
                    }`}
                  />
                  <span className="transition-colors duration-200">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.count && (
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        isActive
                          ? 'bg-white text-[#185C36] shadow-xs border border-[#A8DDB8]'
                          : 'bg-white/80 text-[#185C36] border border-[#D5EBDD] group-hover:bg-white'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  {item.alertCount !== undefined && item.alertCount > 0 && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[#B45353] text-white animate-pulse">
                      {item.alertCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer Info with Green Badge */}
        <div className="p-3.5 border-t border-[#D5EBDD] bg-white/70 backdrop-blur-xs text-xs">
          <div className="flex items-center gap-2 text-[#185C36] font-semibold text-[11px] mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3F8F5B]" />
            <span>Terminal Gate-01</span>
          </div>
          <div className="flex justify-between items-center text-[11px] text-[#5E7165]">
            <span>Local Persistence</span>
            <span className="text-[#185C36] font-semibold flex items-center gap-1.5 bg-[#D9FBE5] px-2 py-0.5 rounded-md border border-[#A8DDB8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3F8F5B] animate-camera-pulse"></span>
              Online
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
