import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WrongParkingIncident,
  WrongParkingStatus,
  ParkingSlot,
  ParkingSession,
} from '../../types';
import { ApiClient } from '../../services/apiClient';
import {
  WrongParkingService,
  CONFIGURED_SURVEILLANCE_ZONES,
  DEMO_WRONG_PARKING_SCENARIOS,
  DemoWrongParkingScenario,
} from '../../services/WrongParkingService';
import { SirenAudioService, SirenState } from '../../services/SirenAudioService';
import { LicensePlate } from '../common/LicensePlate';
import {
  AlertTriangle,
  Volume2,
  VolumeX,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Play,
  RotateCcw,
  Camera,
  Layers,
  Lock,
  Unlock,
  Eye,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Radio,
  Sliders,
  Check,
  X,
  AlertCircle,
  Info,
} from 'lucide-react';

interface WrongParkingDashboardSectionProps {
  slots?: ParkingSlot[];
  sessions?: ParkingSession[];
  onRefreshParent?: () => void;
}

export const WrongParkingDashboardSection: React.FC<WrongParkingDashboardSectionProps> = ({
  slots = [],
  sessions = [],
  onRefreshParent,
}) => {
  const [incidents, setIncidents] = useState<WrongParkingIncident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sirenState, setSirenState] = useState<SirenState>(SirenAudioService.getState());
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'NEEDS_REVIEW' | 'RESOLVED'>('ACTIVE');

  // Staff Authorization Modal / Credentials
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeActionIncident, setActiveActionIncident] = useState<{
    incident: WrongParkingIncident;
    action: 'ACKNOWLEDGE' | 'RESOLVE' | 'FALSE_POSITIVE';
  } | null>(null);
  const [staffRoleInput, setStaffRoleInput] = useState<string>('Security Guard');
  const [staffPinInput, setStaffPinInput] = useState<string>('1234');
  const [actionNotesInput, setActionNotesInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Surveillance Simulation Custom Trigger state
  const [selectedScenario, setSelectedScenario] = useState<DemoWrongParkingScenario>(DEMO_WRONG_PARKING_SCENARIOS[1]);
  const [simPlateInput, setSimPlateInput] = useState<string>('KA22XY9876');
  const [simSlotInput, setSimSlotInput] = useState<string>('F-05');
  const [simConfidence, setSimConfidence] = useState<number>(94);
  const [isSimulating, setIsSimulating] = useState(false);

  // Subscribe to SirenAudioService
  useEffect(() => {
    const unsubscribe = SirenAudioService.subscribe((state) => {
      setSirenState(state);
    });
    return () => unsubscribe();
  }, []);

  // Fetch incidents from API or local service
  const loadIncidents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.getWrongParkingIncidents(50);
      setIncidents(data);
    } catch {
      // Local fallback
      const cached = WrongParkingService['processDetectionLocally'];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 6000); // Polling surveillance events
    return () => clearInterval(interval);
  }, [loadIncidents]);

  const activeViolationsCount = incidents.filter((i) => i.status === 'ACTIVE').length;
  const needsReviewCount = incidents.filter((i) => i.status === 'NEEDS_REVIEW').length;

  // Handle Scenario Quick Fill
  const handleSelectScenario = (scenario: DemoWrongParkingScenario) => {
    setSelectedScenario(scenario);
    setSimPlateInput(scenario.plate);
    setSimSlotInput(scenario.detectedSlot);
    setSimConfidence(scenario.confidence);
  };

  // Run AI Surveillance Detection
  const handleRunDetection = async () => {
    setIsSimulating(true);
    setFeedbackMessage(null);

    try {
      const result = await WrongParkingService.processDetection({
        vehicleNumber: simPlateInput,
        detectedSlotId: simSlotInput,
        confidence: simConfidence,
        isDemo: true,
      });

      if (result.status === 'VIOLATION_DETECTED') {
        setFeedbackMessage({
          type: 'warning',
          text: `🚨 High-Confidence Wrong Parking Detected! Vehicle ${result.vehicleNumberMasked} parked in ${result.detectedSlotId} (allocated: ${result.allocatedSlotId}). Facility alarm dispatched.`,
        });
      } else if (result.status === 'CORRECTLY_PARKED') {
        setFeedbackMessage({
          type: 'success',
          text: `✅ Correct Parking Validated: Vehicle ${result.vehicleNumberMasked} matches designated bay ${result.allocatedSlotId}. No violation declared.`,
        });
      } else if (result.status === 'NEEDS_REVIEW') {
        setFeedbackMessage({
          type: 'warning',
          text: `⚠️ Low-Confidence Detection (${result.confidence}% < ${result.confidenceThreshold}%). Marked as NEEDS REVIEW for guard visual inspection. Siren silent.`,
        });
      } else if (result.status === 'DUPLICATE_DEBOUNCED') {
        setFeedbackMessage({
          type: 'warning',
          text: `🔄 Repeated Frame Debounced: Ongoing incident already active for ${result.vehicleNumberMasked}. Repeated alarm suppressed.`,
        });
      } else if (result.status === 'NO_ACTIVE_SESSION') {
        setFeedbackMessage({
          type: 'error',
          text: `ℹ️ Unchecked Vehicle: No active campus entry session found for ${result.vehicleNumber}. Handled safely without false violation.`,
        });
      }

      await loadIncidents();
      if (onRefreshParent) onRefreshParent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMessage({ type: 'error', text: `Detection failed: ${msg}` });
    } finally {
      setIsSimulating(false);
    }
  };

  // Open authorization modal
  const promptStaffAction = (
    incident: WrongParkingIncident,
    action: 'ACKNOWLEDGE' | 'RESOLVE' | 'FALSE_POSITIVE'
  ) => {
    setActiveActionIncident({ incident, action });
    setActionNotesInput('');
    setAuthError(null);
    setIsAuthModalOpen(true);
  };

  // Execute staff action with credentials
  const handleConfirmStaffAction = async () => {
    if (!activeActionIncident) return;
    const { incident, action } = activeActionIncident;

    // Check staff authorization
    if (!WrongParkingService.isAuthorized(staffRoleInput, staffPinInput)) {
      setAuthError('Unauthorized: Access restricted to authorized security guards or campus staff.');
      return;
    }

    try {
      if (action === 'ACKNOWLEDGE') {
        await ApiClient.acknowledgeWrongParkingIncident(incident.id, {
          operatorRole: staffRoleInput,
          operatorId: `GUARD-${staffPinInput}`,
          notes: actionNotesInput || 'Acknowledged by security staff',
        });
      } else if (action === 'RESOLVE') {
        await ApiClient.resolveWrongParkingIncident(incident.id, {
          operatorRole: staffRoleInput,
          operatorId: `GUARD-${staffPinInput}`,
          notes: actionNotesInput || 'Vehicle moved to designated bay / resolved by guard',
          isFalsePositive: false,
        });
      } else if (action === 'FALSE_POSITIVE') {
        await ApiClient.resolveWrongParkingIncident(incident.id, {
          operatorRole: staffRoleInput,
          operatorId: `GUARD-${staffPinInput}`,
          notes: actionNotesInput || 'Investigated and marked as false positive',
          isFalsePositive: true,
        });
      }

      setIsAuthModalOpen(false);
      setActiveActionIncident(null);
      await loadIncidents();
      if (onRefreshParent) onRefreshParent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(`Action failed: ${msg}`);
    }
  };

  // Mute Alarm
  const handleMuteAlarm = async (incidentId?: string) => {
    SirenAudioService.stopAndMute();
    if (incidentId) {
      try {
        await ApiClient.muteWrongParkingIncident(incidentId, {
          operatorRole: 'Security Guard',
          reason: 'Manual alarm mute from ParkSphere dashboard',
        });
        await loadIncidents();
      } catch {}
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return inc.status === 'ACTIVE';
    if (statusFilter === 'NEEDS_REVIEW') return inc.status === 'NEEDS_REVIEW';
    if (statusFilter === 'RESOLVED') return inc.status === 'RESOLVED' || inc.status === 'FALSE_POSITIVE';
    return true;
  });

  return (
    <div className="card-classic p-6 space-y-5 border-2 border-[#D5EBDD] bg-gradient-to-b from-white via-[#F7FCF8] to-[#EEF9F1]">
      {/* 1. Header with Live Siren Warning Radar & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#D5EBDD]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeViolationsCount > 0 ? 'bg-red-500 animate-ping' : 'bg-[#3F8F5B] animate-camera-pulse'
              }`}
            />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#185C36] flex items-center gap-1.5">
              <span>AI Wrong Parking Surveillance Radar</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#EAF8EE] text-[#185C36] font-mono border border-[#D5EBDD]">
                ParkSphere Radar
              </span>
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-[#183025] tracking-tight flex items-center gap-2">
            <span>Wrong Parking Detection & Siren Alerts</span>
            {activeViolationsCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FDF2F2] text-[#B45353] border border-[#F8D7DA] animate-pulse">
                {activeViolationsCount} Active Violation{activeViolationsCount > 1 ? 's' : ''}
              </span>
            )}
            {needsReviewCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF9E7] text-[#B7791F] border border-[#FCE8B2]">
                {needsReviewCount} Needs Review
              </span>
            )}
          </h3>
          <p className="text-xs text-[#5E7165]">
            Correlates physical camera-detected parking bays with active SQLite allocated sessions. Triggers facility acoustic warnings for confirmed violations.
          </p>
        </div>

        {/* Siren Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mute Active Siren Button */}
          {sirenState.isPlaying ? (
            <button
              onClick={() => handleMuteAlarm()}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-md flex items-center gap-1.5 animate-bounce"
            >
              <VolumeX className="w-4 h-4" />
              <span>STOP / MUTE SIREN</span>
            </button>
          ) : (
            <button
              onClick={() => handleMuteAlarm()}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#D5EBDD] text-[#5E7165] hover:text-[#183025] cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Ensure siren is muted"
            >
              <VolumeX className="w-3.5 h-3.5 text-[#5E7165]" />
              <span>Silence</span>
            </button>
          )}

          {/* Test Sound Button */}
          <button
            onClick={() => SirenAudioService.playTestAlarm()}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#D5EBDD] text-[#185C36] hover:bg-[#EAF8EE] cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
            title="Play sample 1-second audio chime"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#3F8F5B]" />
            <span>Test Sound</span>
          </button>

          {/* Enable / Disable Siren Toggle */}
          <button
            onClick={() => SirenAudioService.setAudioEnabled(!sirenState.isEnabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 shadow-xs ${
              sirenState.isEnabled
                ? 'bg-[#EAF8EE] text-[#185C36] border-[#A8DDB8]'
                : 'bg-white text-[#8A9C90] border-[#D5EBDD]'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${sirenState.isEnabled ? 'text-[#3F8F5B] animate-pulse' : 'text-[#8A9C90]'}`} />
            <span>{sirenState.isEnabled ? 'Siren: Enabled' : 'Siren: Disabled'}</span>
          </button>
        </div>
      </div>

      {/* Notice Banner: Discloses Software Audio Alarm Safety */}
      <div className="p-3 rounded-xl bg-[#EAF8EE] border border-[#A8DDB8] text-[11px] text-[#185C36] flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#3F8F5B]" />
        <div className="space-y-0.5">
          <p className="font-semibold">
            Campus Acoustic Alert Notice (Safety & Regulation Compliance):
          </p>
          <p className="text-[10px] text-[#5E7165]">
            The acoustic alert uses the browser Web Audio synthesizer to simulate an authorized parking-facility warning chime. It <strong>never connects to or triggers a vehicle horn</strong>, adheres to strict rate-limiting (25s cooldown), and respects browser autoplay preferences.
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold animate-in fade-in flex items-center justify-between gap-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-[#D9FBE5] text-[#185C36] border-[#A8DDB8]'
              : feedbackMessage.type === 'warning'
              ? 'bg-[#FEF9E7] text-[#B7791F] border-[#FCE8B2]'
              : 'bg-[#FDF2F2] text-[#B45353] border-[#F8D7DA]'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs hover:opacity-75 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Interactive AI Camera Wrong-Parking Simulation Sandbox */}
      <div className="p-4 rounded-2xl bg-white border border-[#D5EBDD] space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAF8EE] pb-2.5">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#3F8F5B]" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#185C36]">
              AI Camera Optical Slot Correlation Simulation
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#FEF9E7] text-[#B7791F] font-bold border border-[#FCE8B2]">
              DEMO MODE
            </span>
          </div>
          <span className="text-[11px] text-[#5E7165]">
            Select preset scenarios or input custom coordinates to test optical slot detection.
          </span>
        </div>

        {/* Preset Scenarios Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
          {DEMO_WRONG_PARKING_SCENARIOS.map((sc) => {
            const isSelected = selectedScenario.id === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => handleSelectScenario(sc)}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#EAF8EE] border-[#3F8F5B] text-[#185C36] shadow-xs'
                    : 'bg-white border-[#D5EBDD] text-[#5E7165] hover:border-[#A8DDB8]'
                }`}
              >
                <div className="font-bold text-[11px] truncate">{sc.name.split(':')[0]}</div>
                <div className="text-[10px] text-[#8A9C90] mt-1 line-clamp-2">{sc.description}</div>
              </button>
            );
          })}
        </div>

        {/* Inputs & Trigger */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end pt-1">
          <div>
            <label className="block text-[11px] font-bold text-[#185C36] mb-1">
              Detected Vehicle Plate
            </label>
            <input
              type="text"
              value={simPlateInput}
              onChange={(e) => setSimPlateInput(e.target.value.toUpperCase())}
              placeholder="e.g. KA22XY9876"
              className="w-full px-3 py-1.5 rounded-xl border border-[#D5EBDD] bg-[#F7FBF8] text-xs font-mono font-bold text-[#183025] focus:outline-hidden focus:border-[#3F8F5B]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#185C36] mb-1">
              Physically Detected Slot
            </label>
            <select
              value={simSlotInput}
              onChange={(e) => setSimSlotInput(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#D5EBDD] bg-[#F7FBF8] text-xs font-mono font-bold text-[#183025] focus:outline-hidden focus:border-[#3F8F5B]"
            >
              <optgroup label="Zone F (Four-Wheelers)">
                <option value="F-01">F-01</option>
                <option value="F-02">F-02</option>
                <option value="F-03">F-03</option>
                <option value="F-04">F-04</option>
                <option value="F-05">F-05</option>
              </optgroup>
              <optgroup label="Zone T (Two-Wheelers)">
                <option value="T-01">T-01</option>
                <option value="T-02">T-02</option>
                <option value="T-03">T-03</option>
                <option value="T-04">T-04</option>
                <option value="T-05">T-05</option>
                <option value="T-06">T-06</option>
                <option value="T-07">T-07</option>
                <option value="T-08">T-08</option>
                <option value="T-09">T-09</option>
                <option value="T-10">T-10</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#185C36] mb-1">
              Optical Confidence: <span className="font-mono">{simConfidence}%</span>
            </label>
            <input
              type="range"
              min="40"
              max="99"
              value={simConfidence}
              onChange={(e) => setSimConfidence(parseInt(e.target.value))}
              className="w-full accent-[#3F8F5B] cursor-pointer"
            />
          </div>

          <div>
            <button
              onClick={handleRunDetection}
              disabled={isSimulating}
              className="w-full btn-primary-muted py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isSimulating ? 'Correlating...' : 'Execute Camera Scan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Wrong Parking Incident Feed & Surveillance Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#B45353]" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#183025]">
              Surveillance Incident Log ({filteredIncidents.length})
            </h4>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#D5EBDD] text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-[#FDF2F2] text-[#B45353] font-bold border border-[#F8D7DA]'
                  : 'text-[#5E7165] hover:text-[#183025]'
              }`}
            >
              Active ({incidents.filter((i) => i.status === 'ACTIVE').length})
            </button>
            <button
              onClick={() => setStatusFilter('NEEDS_REVIEW')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'NEEDS_REVIEW'
                  ? 'bg-[#FEF9E7] text-[#B7791F] font-bold border border-[#FCE8B2]'
                  : 'text-[#5E7165] hover:text-[#183025]'
              }`}
            >
              Review ({incidents.filter((i) => i.status === 'NEEDS_REVIEW').length})
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'RESOLVED'
                  ? 'bg-[#EAF8EE] text-[#185C36] font-bold border border-[#A8DDB8]'
                  : 'text-[#5E7165] hover:text-[#183025]'
              }`}
            >
              Resolved ({incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'FALSE_POSITIVE').length})
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-[#185C36] text-white font-bold'
                  : 'text-[#5E7165] hover:text-[#183025]'
              }`}
            >
              All ({incidents.length})
            </button>
          </div>
        </div>

        {/* Incident List */}
        {filteredIncidents.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-[#D5EBDD] text-center text-[#5E7165] text-xs space-y-1">
            <CheckCircle2 className="w-6 h-6 mx-auto text-[#3F8F5B]" />
            <p className="font-bold text-[#183025]">No incidents matching filter.</p>
            <p className="text-[11px]">All vehicles in surveillance zones are parked in their allocated bays.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredIncidents.map((incident) => {
              const isViolation = incident.status === 'ACTIVE';
              const isReview = incident.status === 'NEEDS_REVIEW';
              const isResolved = incident.status === 'RESOLVED' || incident.status === 'FALSE_POSITIVE';

              return (
                <div
                  key={incident.id}
                  className={`p-4 rounded-2xl border transition-all text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isViolation
                      ? 'bg-gradient-to-r from-[#FFF5F5] to-white border-[#F8D7DA] shadow-xs'
                      : isReview
                      ? 'bg-[#FFFAF0] border-[#FCE8B2]'
                      : 'bg-white border-[#D5EBDD]'
                  }`}
                >
                  {/* Left: Plate, Slot Comparison, Meta */}
                  <div className="flex flex-wrap items-center gap-3">
                    <LicensePlate plateNumber={incident.vehicleNumberMasked} size="sm" />

                    <div className="flex items-center gap-2">
                      <div className="text-center px-2.5 py-1 rounded-xl bg-white border border-[#D5EBDD]">
                        <span className="text-[9px] uppercase font-bold text-[#5E7165] block">Allocated</span>
                        <span className="font-mono font-bold text-xs text-[#185C36]">
                          {incident.allocatedSlotId}
                        </span>
                      </div>

                      <span className="text-base font-bold text-[#B45353]">➔</span>

                      <div className="text-center px-2.5 py-1 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA]">
                        <span className="text-[9px] uppercase font-bold text-[#B45353] block">Detected In</span>
                        <span className="font-mono font-extrabold text-xs text-[#B45353]">
                          {incident.detectedSlotId}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isViolation
                              ? 'bg-[#FDF2F2] text-[#B45353] border border-[#F8D7DA]'
                              : isReview
                              ? 'bg-[#FEF9E7] text-[#B7791F] border border-[#FCE8B2]'
                              : incident.status === 'FALSE_POSITIVE'
                              ? 'bg-[#F0F4F8] text-[#4F6B8A] border border-[#D9E2EC]'
                              : 'bg-[#D9FBE5] text-[#185C36] border border-[#A8DDB8]'
                          }`}
                        >
                          {incident.status}
                        </span>
                        <span className="text-[11px] font-bold text-[#183025]">
                          {incident.cameraZone} ({incident.confidence}% conf)
                        </span>
                      </div>

                      <div className="text-[11px] text-[#5E7165] flex items-center gap-2">
                        <span>Time: {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        <span>•</span>
                        <span>Cam: {incident.cameraId}</span>
                        {incident.isDemo && <span>• <strong className="text-[#B7791F]">DEMO</strong></span>}
                      </div>

                      {incident.resolutionNotes && (
                        <div className="text-[10px] text-[#5E7165] italic">
                          Notes: "{incident.resolutionNotes}" ({incident.resolvedBy || incident.acknowledgedBy})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {incident.sirenTriggered && !incident.sirenMuted && isViolation && (
                      <button
                        onClick={() => handleMuteAlarm(incident.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                        title="Mute siren for this incident"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Mute Alarm</span>
                      </button>
                    )}

                    {incident.status === 'ACTIVE' && (
                      <button
                        onClick={() => promptStaffAction(incident, 'ACKNOWLEDGE')}
                        className="btn-secondary-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    )}

                    {(incident.status === 'ACTIVE' || incident.status === 'ACKNOWLEDGED' || incident.status === 'NEEDS_REVIEW') && (
                      <>
                        <button
                          onClick={() => promptStaffAction(incident, 'RESOLVE')}
                          className="btn-primary-muted px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Resolve</span>
                        </button>
                        <button
                          onClick={() => promptStaffAction(incident, 'FALSE_POSITIVE')}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#D5EBDD] text-[#5E7165] hover:text-[#B45353] hover:border-[#F8D7DA] cursor-pointer"
                        >
                          False Positive
                        </button>
                      </>
                    )}

                    {isResolved && (
                      <span className="text-[11px] font-bold text-[#185C36] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#3F8F5B]" />
                        <span>Handled</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Staff Authorization & Action Modal */}
      {isAuthModalOpen && activeActionIncident && (
        <div className="fixed inset-0 z-50 bg-[#185C36]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-classic p-6 max-w-md w-full bg-white space-y-4 shadow-xl border-2 border-[#A8DDB8] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5EBDD]">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#185C36]" />
                <h4 className="text-sm font-extrabold text-[#183025]">
                  Staff Authorization Required
                </h4>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="text-[#5E7165] hover:text-[#183025] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5E7165]">
              Confirming action <strong>{activeActionIncident.action}</strong> for vehicle{' '}
              <strong className="font-mono text-[#183025]">{activeActionIncident.incident.vehicleNumberMasked}</strong>.
            </p>

            {authError && (
              <div className="p-2.5 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] text-xs text-[#B45353] font-semibold">
                {authError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#185C36] mb-1">
                  Security Operator Role
                </label>
                <select
                  value={staffRoleInput}
                  onChange={(e) => setStaffRoleInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5EBDD] bg-[#F7FBF8] text-xs font-semibold text-[#183025]"
                >
                  <option value="Security Guard">Security Guard</option>
                  <option value="Staff">Campus Staff</option>
                  <option value="Authorized Personnel">Authorized Personnel</option>
                  <option value="Administration">Administration Officer</option>
                  <option value="Visitor">Unauthorized Visitor (Test Reject)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#185C36] mb-1">
                  Guard Authorization PIN / Badge
                </label>
                <input
                  type="password"
                  value={staffPinInput}
                  onChange={(e) => setStaffPinInput(e.target.value)}
                  placeholder="Enter PIN (e.g. 1234)"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5EBDD] bg-[#F7FBF8] text-xs font-mono font-bold text-[#183025]"
                />
                <span className="text-[10px] text-[#8A9C90] mt-0.5 block">
                  Default authorized PIN: <code className="font-mono font-bold text-[#185C36]">1234</code>
                </span>
              </div>

              <div>
                <label className="block font-bold text-[#185C36] mb-1">
                  Resolution Notes / Log Justification
                </label>
                <input
                  type="text"
                  value={actionNotesInput}
                  onChange={(e) => setActionNotesInput(e.target.value)}
                  placeholder="e.g. Guided driver to correct bay / cleared"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5EBDD] bg-[#F7FBF8] text-xs text-[#183025]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D5EBDD]">
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="btn-secondary-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStaffAction}
                className="btn-primary-muted px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                Confirm & Log Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
