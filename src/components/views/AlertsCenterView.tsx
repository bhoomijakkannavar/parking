import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertSeverity } from '../../types';
import { AlertService } from '../../services/AlertService';
import { LicensePlate } from '../common/LicensePlate';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Trash2,
  Filter,
} from 'lucide-react';

interface AlertsCenterViewProps {
  onRefreshAlerts?: () => void;
}

export const AlertsCenterView: React.FC<AlertsCenterViewProps> = () => {
  const [alerts, setAlerts] = useState<Alert[]>(AlertService.getAllAlerts());
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const reloadAlerts = () => {
    setAlerts(AlertService.getAllAlerts());
  };

  const handleResolve = (id: string) => {
    AlertService.resolve(id);
    reloadAlerts();
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all alerts from history?')) {
      AlertService.clearAll();
      reloadAlerts();
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (selectedSeverity === 'ALL') return true;
    return a.severity === selectedSeverity;
  });

  const criticalCount = alerts.filter(
    (a) => a.severity === 'CRITICAL' && a.status === 'UNREAD'
  ).length;
  const warningCount = alerts.filter(
    (a) => a.severity === 'WARNING' && a.status === 'UNREAD'
  ).length;
  const infoCount = alerts.filter(
    (a) => a.severity === 'INFO' && a.status === 'UNREAD'
  ).length;

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-medium bg-[#FDF2F2] text-[#B45353] border border-[#F8D7DA]">
            <AlertCircle className="w-3 h-3 text-[#B45353]" />
            Critical
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-medium bg-[#FEF9E7] text-[#B7791F] border border-[#FCE8B2]">
            <AlertTriangle className="w-3 h-3 text-[#B7791F]" />
            Warning
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-medium bg-[#F0F4F8] text-[#4F6B8A] border border-[#D9E2EC]">
            <Info className="w-3 h-3 text-[#4F6B8A]" />
            Info
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="card-classic p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#3F7D58] animate-camera-pulse"></span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#66736B]">
              Campus Anomaly Radar
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#18231D] tracking-tight">
            Security & Anomaly Alerts
          </h2>
          <p className="text-xs text-[#66736B] mt-0.5">
            Automated surveillance for duplicate vehicle scans, low OCR confidence, and zone capacity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <button
              onClick={handleClearAll}
              className="btn-secondary-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-classic card-interactive p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#66736B] block mb-1">
            Total Logged
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#18231D]">
              {alerts.length}
            </span>
            <span className="text-xs text-[#66736B]">Events</span>
          </div>
        </div>

        <div className="card-classic card-interactive p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B45353] block mb-1">
            Critical
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#B45353]">
              {criticalCount}
            </span>
            <span className="text-xs text-[#66736B]">Unresolved</span>
          </div>
        </div>

        <div className="card-classic card-interactive p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B7791F] block mb-1">
            Warnings
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#B7791F]">
              {warningCount}
            </span>
            <span className="text-xs text-[#66736B]">Caution</span>
          </div>
        </div>

        <div className="card-classic card-interactive p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4F6B8A] block mb-1">
            Informational
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#4F6B8A]">
              {infoCount}
            </span>
            <span className="text-xs text-[#66736B]">Audit Logs</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="card-classic p-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-[#9CA3AF] mr-1 shrink-0" />
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                selectedSeverity === sev
                  ? 'bg-[#18231D] text-white'
                  : 'bg-[#F7F9F8] text-[#66736B] hover:text-[#18231D]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <span className="text-xs text-[#66736B]">
          Showing {filteredAlerts.length} event(s)
        </span>
      </div>

      {/* 4. Alerts List with Smooth Slide-in & Collapse Animations */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="card-classic p-12 text-center">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F2EB] text-[#285C3F] flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-5 h-5 text-[#3F7D58]" />
            </div>
            <h4 className="font-semibold text-[#18231D] text-sm">
              All Security Radar Anomalies Cleared
            </h4>
            <p className="text-xs text-[#66736B] mt-1 max-w-sm mx-auto">
              No unresolved alerts detected. Camera sensors and barrier gates operating normally.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: alert.status === 'UNREAD' ? 1 : 0.65, x: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={`card-classic p-4 transition-all ${
                  alert.status === 'UNREAD' ? 'border-[#E4EAE6]' : 'border-[#E4EAE6]/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getSeverityBadge(alert.severity)}</div>

                    <div>
                      <h4 className="font-semibold text-xs text-[#18231D] leading-snug">
                        {alert.message}
                      </h4>
                      {alert.details && (
                        <p className="text-[11px] text-[#66736B] mt-0.5">
                          {alert.details}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-[#9CA3AF]">
                        <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                        {alert.vehicleNumber && (
                          <div className="flex items-center gap-1.5">
                            <span>Target:</span>
                            <LicensePlate plateNumber={alert.vehicleNumber} size="sm" />
                          </div>
                        )}
                        {alert.slotId && (
                          <span className="font-mono font-medium text-[#18231D] bg-[#F7F9F8] border border-[#E4EAE6] px-1.5 py-0.5 rounded">
                            Bay {alert.slotId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {alert.status === 'UNREAD' ? (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="btn-secondary-white px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="text-[11px] font-medium text-[#285C3F] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#3F7D58]" />
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
