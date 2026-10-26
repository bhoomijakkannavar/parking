import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VehicleType,
  OwnerCategory,
  GateType,
  DetectionMode,
  GateDetectionEvent,
  ParkingSlot,
  Receipt,
  Vehicle,
  CollegeMember,
  IdVerificationResult,
  IdVerificationStatus,
  IdCardDetectionResult,
} from '../../types';
import { APP_CONFIG, OWNER_CATEGORY_LABELS, VEHICLE_TYPE_LABELS } from '../../constants';
import { CameraService } from '../../services/CameraService';
import { PlateRecognitionService } from '../../services/PlateRecognitionService';
import { VehicleDetectionService } from '../../services/VehicleDetectionService';
import { IdCardRecognitionService } from '../../services/IdCardRecognitionService';
import { IdVerificationService } from '../../services/IdVerificationService';
import { GateProcessingService, EntryScanResult, ExitScanResult } from '../../services/GateProcessingService';
import { CollegeRegistryService } from '../../services/CollegeRegistryService';
import { StorageService } from '../../services/StorageService';
import { ApiClient } from '../../services/apiClient';
import { ValidationService } from '../../services/ValidationService';
import { LicensePlate } from '../common/LicensePlate';
import {
  Camera,
  CameraOff,
  Video,
  Scan,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Car,
  Bike,
  RotateCcw,
  LogIn,
  LogOut,
  Sliders,
  History,
  Activity,
  ScanFace,
  UserCheck,
  UserX,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Upload,
  FileText,
  AlertCircle,
  Lock,
  Check,
  X,
  Eye,
  RefreshCw,
  CreditCard,
  KeyRound,
} from 'lucide-react';

interface AIGateCameraViewProps {
  slots: ParkingSlot[];
  activeVehicles: Vehicle[];
  onActionComplete: () => void;
  onNavigateToManualEntry: () => void;
  onNavigateToManualExit: (plate?: string) => void;
  onOpenReceiptModal: (receipt: Receipt) => void;
  onNavigateToRegistry?: () => void;
}

export const AIGateCameraView: React.FC<AIGateCameraViewProps> = ({
  slots,
  activeVehicles,
  onActionComplete,
  onNavigateToManualEntry,
  onNavigateToManualExit,
  onOpenReceiptModal,
  onNavigateToRegistry,
}) => {
  // Gate Mode State
  const [gateType, setGateType] = useState<GateType>('ENTRY');
  const [autoDirectionEnabled] = useState(true);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('DEMO');

  // Camera Hardware State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Active ANPR Detection Buffer
  const [detectedPlate, setDetectedPlate] = useState<string>('');
  const [detectedVehicleType, setDetectedVehicleType] = useState<VehicleType>('TWO_WHEELER');
  const [confidence, setConfidence] = useState<number>(95);
  const [faceDetected, setFaceDetected] = useState<boolean>(true);
  const [ownerCategory, setOwnerCategory] = useState<OwnerCategory>('STUDENT');
  const [exitHour, setExitHour] = useState<number>(new Date().getHours());
  const [isProcessing, setIsProcessing] = useState(false);

  // College ID Card Detection & OCR State
  const [detectedIdCard, setDetectedIdCard] = useState<string>('');
  const [idCardConfidence, setIdCardConfidence] = useState<number>(0);
  const [idVerification, setIdVerification] = useState<IdVerificationResult | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Guard Manual Override State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideReasonInput, setOverrideReasonInput] = useState('Physical student/staff ID manually verified by guard on duty');
  const [isOverridden, setIsOverridden] = useState(false);
  const [activeOverrideReason, setActiveOverrideReason] = useState<string | null>(null);

  // Decision & Registry State
  const [entryResult, setEntryResult] = useState<EntryScanResult | null>(null);
  const [exitResult, setExitResult] = useState<ExitScanResult | null>(null);
  const [matchedMember, setMatchedMember] = useState<CollegeMember | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Detection Activity History
  const [activityLogs, setActivityLogs] = useState<GateDetectionEvent[]>([]);

  // Load persisted camera activity on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const events = await ApiClient.getCameraEvents();
        setActivityLogs(events);
      } catch {
        setActivityLogs(StorageService.getCameraEvents());
      }
    };
    fetchEvents();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        CameraService.stopCamera(mediaStreamRef.current);
      }
    };
  }, []);

  // Sync video element with media stream
  useEffect(() => {
    if (videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [isCameraActive]);

  // Handle Camera Toggle
  const handleStartCamera = async () => {
    setCameraError(null);
    const result = await CameraService.startCamera();
    if (result.success && result.stream) {
      mediaStreamRef.current = result.stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = result.stream;
      }
    } else {
      setCameraError(result.error || 'Unable to connect to camera hardware.');
      setIsCameraActive(false);
    }
  };

  const handleStopCamera = () => {
    if (mediaStreamRef.current) {
      CameraService.stopCamera(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Re-evaluate gate when plate, ID card, type, or confidence changes
  const evaluateDetection = (
    plate: string,
    vType: VehicleType,
    conf: number,
    gate: GateType,
    eHour: number,
    idResult?: IdVerificationResult | null
  ) => {
    if (!plate) {
      setEntryResult(null);
      setExitResult(null);
      setMatchedMember(null);
      return;
    }

    // Determine ownerCategory from ID verification or College Registry
    if (idResult?.member) {
      setMatchedMember(idResult.member);
      if (idResult.member.role === 'Faculty' || idResult.member.role === 'Staff' || idResult.member.role === 'Administration') {
        setOwnerCategory('STAFF');
      } else {
        setOwnerCategory('STUDENT');
      }
    } else {
      // Fallback check against vehicle plate in registry
      const regCheck = CollegeRegistryService.verifyVehicle(plate);
      if (regCheck.isRegistered && regCheck.member) {
        setMatchedMember(regCheck.member);
        if (regCheck.member.role === 'Faculty' || regCheck.member.role === 'Staff' || regCheck.member.role === 'Administration') {
          setOwnerCategory('STAFF');
        } else {
          setOwnerCategory('STUDENT');
        }
      } else {
        setMatchedMember(null);
        setOwnerCategory('VISITOR');
      }
    }

    if (gate === 'ENTRY') {
      const res = GateProcessingService.processEntryScan(plate, vType, conf, detectionMode);
      setEntryResult(res);
      setExitResult(null);
    } else {
      const res = GateProcessingService.processExitScan(plate, conf, detectionMode, eHour);
      setExitResult(res);
      setEntryResult(null);
    }
  };

  // Trigger simulated/live dual ANPR + ID Card detection
  const runDetection = async (
    forcedPlate?: string,
    forcedType?: VehicleType,
    forcedConfidence?: number,
    forcedIdCard?: string,
    forcedIdConfidence?: number
  ) => {
    setIsProcessing(true);
    setIsOverridden(false);
    setActiveOverrideReason(null);
    setStatusFeedback('Scanning camera frame for Vehicle Plate & College ID Card...');

    setTimeout(async () => {
      // 1. Plate Recognition
      const plateRes = await PlateRecognitionService.detectPlate(
        videoRef.current,
        forcedPlate,
        forcedConfidence
      );
      const vehicleRes = await VehicleDetectionService.detectVehicle(
        videoRef.current,
        forcedType,
        forcedConfidence
      );

      const targetPlate = plateRes.plateNumber;
      const targetType = vehicleRes.vehicleType;
      const targetConfidence =
        forcedConfidence !== undefined ? forcedConfidence : plateRes.confidence;

      setDetectedPlate(targetPlate);
      setDetectedVehicleType(targetType);
      setConfidence(targetConfidence);
      setFaceDetected(true);

      // 2. ID Card Recognition & OCR
      const idCardRes = await IdCardRecognitionService.detectIdCard(
        videoRef.current,
        forcedIdCard,
        forcedIdConfidence
      );

      setDetectedIdCard(idCardRes.idNumber);
      setIdCardConfidence(idCardRes.confidence);

      // 3. ID Card Verification against SQLite Registry
      let idVerifResult: IdVerificationResult | null = null;
      if (idCardRes.idNumber) {
        idVerifResult = await IdVerificationService.verifyId(
          idCardRes.idNumber,
          targetPlate,
          idCardRes.confidence
        );
      } else {
        // Visitor bypass when no ID is presented
        idVerifResult = await IdVerificationService.verifyId('', targetPlate, 0);
      }
      setIdVerification(idVerifResult);

      setIsProcessing(false);
      setStatusFeedback(null);

      // 4. Automatic Direction Inference
      let effectiveGate = gateType;
      if (autoDirectionEnabled && targetPlate) {
        effectiveGate = GateProcessingService.inferGateDirection(targetPlate);
        setGateType(effectiveGate);
      }

      evaluateDetection(targetPlate, targetType, targetConfidence, effectiveGate, exitHour, idVerifResult);
    }, 400);
  };

  // Handle Snapshot / File Upload for ID Card or Vehicle Image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedImageName(file.name);
    setIsProcessing(true);
    setStatusFeedback(`Analyzing uploaded image file (${file.name})...`);

    const reader = new FileReader();
    reader.onload = async () => {
      // In demo/hybrid mode, analyze image or match preset
      const fileNameLower = file.name.toLowerCase();
      let presetPlate = 'KA-05-ST-2020';
      let presetId = 'STU-2023-045';

      if (fileNameLower.includes('faculty') || fileNameLower.includes('fac')) {
        presetPlate = 'KA-01-FA-1001';
        presetId = 'FAC-CS-101';
      } else if (fileNameLower.includes('staff')) {
        presetPlate = 'KA-04-SK-5555';
        presetId = 'STF-ADM-012';
      } else if (fileNameLower.includes('visitor')) {
        presetPlate = 'KA-02-VS-7777';
        presetId = '';
      }

      await runDetection(presetPlate, 'TWO_WHEELER', 95, presetId, 94);
    };
    reader.readAsDataURL(file);
  };

  // Security Guard Manual Override Handler
  const handleApplyOverride = () => {
    if (!overrideReasonInput.trim()) return;
    setIsOverridden(true);
    setActiveOverrideReason(overrideReasonInput.trim());
    setIsOverrideModalOpen(false);
    setStatusFeedback('Security Guard override authorized. Entry granted.');
  };

  // Confirm Entry Execution
  const handleConfirmEntry = async () => {
    if (!detectedPlate) return;

    try {
      // Execute via backend API
      const result = await ApiClient.parkVehicle({
        vehicleNumber: detectedPlate,
        vehicleType: detectedVehicleType,
        ownerCategory,
        entryHour: new Date().getHours(),
        origin: detectionMode === 'LIVE' ? 'AI' : 'DEMO',
      });

      // Prepare ID verification logging fields
      const maskedId = idVerification?.maskedIdCardNumber || (detectedIdCard ? ValidationService.maskMemberId(detectedIdCard) : undefined);
      const idStatus = isOverridden ? 'OVERRIDDEN' : (idVerification?.status || (detectedIdCard ? 'FAILED' : 'VISITOR_BYPASS'));

      // Log camera event to database with ID verification telemetry
      const eventToLog: GateDetectionEvent = {
        id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        plateNumber: detectedPlate,
        vehicleType: detectedVehicleType,
        ownerCategory,
        gateType: 'ENTRY',
        confidence,
        mode: detectionMode,
        action: result.success ? 'APPROVED' : 'REJECTED_FULL',
        actionSummary: result.message,
        slotId: result.data?.slot.id,
        faceDetected,
        memberId: idVerification?.member?.id || matchedMember?.id,
        memberName: idVerification?.member?.name || matchedMember?.name,
        role: idVerification?.member?.role || matchedMember?.role,
        idCardNumberMasked: maskedId,
        idVerificationStatus: idStatus as IdVerificationStatus,
        idVerificationReason: idVerification?.reasons?.join('; ') || undefined,
        overrideReason: isOverridden ? (activeOverrideReason || undefined) : undefined,
      };

      try {
        await ApiClient.addCameraEvent(eventToLog);
      } catch {
        StorageService.addCameraEvent(eventToLog);
      }

      if (result.success) {
        setStatusFeedback(result.message);
        try {
          const freshEvents = await ApiClient.getCameraEvents();
          setActivityLogs(freshEvents);
        } catch {
          setActivityLogs(StorageService.getCameraEvents());
        }
        onActionComplete();
        setTimeout(() => {
          handleClearDetection();
        }, 2200);
      } else {
        setStatusFeedback(result.message);
      }
    } catch {
      // Fallback local execution
      const result = GateProcessingService.confirmEntry(
        detectedPlate,
        detectedVehicleType,
        ownerCategory,
        confidence,
        detectionMode,
        undefined,
        faceDetected
      );

      if (result.success) {
        setStatusFeedback(result.message);
        setActivityLogs(StorageService.getCameraEvents());
        onActionComplete();
        setTimeout(() => {
          handleClearDetection();
        }, 2200);
      } else {
        setStatusFeedback(result.message);
      }
    }
  };

  // Confirm Exit Execution
  const handleConfirmExit = async () => {
    if (!detectedPlate) return;

    try {
      const result = await ApiClient.checkoutVehicle(detectedPlate, exitHour);

      const eventToLog: GateDetectionEvent = {
        id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        plateNumber: detectedPlate,
        vehicleType: detectedVehicleType,
        ownerCategory,
        gateType: 'EXIT',
        confidence,
        mode: detectionMode,
        action: result.success ? 'CHECKED_OUT' : 'NOT_FOUND',
        actionSummary: result.message,
        slotId: result.data?.receipt.slotId,
        fee: result.data?.receipt.fee,
        faceDetected,
        memberId: idVerification?.member?.id || matchedMember?.id,
        memberName: idVerification?.member?.name || matchedMember?.name,
        role: idVerification?.member?.role || matchedMember?.role,
        idCardNumberMasked: idVerification?.maskedIdCardNumber || (detectedIdCard ? ValidationService.maskMemberId(detectedIdCard) : undefined),
        idVerificationStatus: idVerification?.status || 'VISITOR_BYPASS',
      };

      try {
        await ApiClient.addCameraEvent(eventToLog);
      } catch {
        StorageService.addCameraEvent(eventToLog);
      }

      if (result.success && result.data) {
        setStatusFeedback(result.message);
        try {
          const freshEvents = await ApiClient.getCameraEvents();
          setActivityLogs(freshEvents);
        } catch {
          setActivityLogs(StorageService.getCameraEvents());
        }
        onActionComplete();
        onOpenReceiptModal(result.data.receipt);
        setTimeout(() => {
          handleClearDetection();
        }, 1200);
      } else {
        setStatusFeedback(result.message);
      }
    } catch {
      const result = GateProcessingService.confirmExit(
        detectedPlate,
        exitHour,
        confidence,
        detectionMode,
        faceDetected
      );

      if (result.success && result.data) {
        setStatusFeedback(result.message);
        setActivityLogs(StorageService.getCameraEvents());
        onActionComplete();
        onOpenReceiptModal(result.data.receipt);
        setTimeout(() => {
          handleClearDetection();
        }, 1200);
      } else {
        setStatusFeedback(result.message);
      }
    }
  };

  const handleClearDetection = () => {
    setDetectedPlate('');
    setDetectedIdCard('');
    setIdCardConfidence(0);
    setIdVerification(null);
    setIsOverridden(false);
    setActiveOverrideReason(null);
    setEntryResult(null);
    setExitResult(null);
    setMatchedMember(null);
    setStatusFeedback(null);
    setUploadedImageName(null);
  };

  // Pipeline Step Progress
  const detectionSteps = [
    { id: 1, label: 'Camera Ready', isDone: true, isActive: !detectedPlate && !isProcessing },
    { id: 2, label: 'Scanning', isDone: Boolean(detectedPlate || isProcessing), isActive: isProcessing },
    { id: 3, label: 'Vehicle ANPR', isDone: Boolean(detectedPlate), isActive: false },
    { id: 4, label: 'ID Card OCR', isDone: Boolean(detectedIdCard || (detectedPlate && idVerification?.status === 'VISITOR_BYPASS')), isActive: false },
    { id: 5, label: 'Registry Match', isDone: Boolean(idVerification), isActive: false },
    { id: 6, label: 'Gate Decision', isDone: Boolean(entryResult || exitResult), isActive: Boolean(detectedPlate) },
  ];

  // Helper to determine whether entry can be confirmed
  const canConfirmEntry =
    Boolean(entryResult && entryResult.status === 'NEW_VEHICLE') &&
    (isOverridden || idVerification?.canAutoApprove || idVerification?.status === 'VISITOR_BYPASS');

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & OPERATIONAL BAR */}
      <div className="card-classic p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#3F7D58] animate-camera-pulse"></span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#66736B]">
              Automated Campus Gate Sensor + ID Verification
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F2EB] text-[#285C3F] border border-[#D5EBDD]">
              DEMO & LIVE DUAL-STREAM
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#18231D] tracking-tight">
            AI Gate Camera, ANPR & College ID Verification
          </h2>
          <p className="text-xs text-[#66736B] mt-0.5">
            Real-time optical plate recognition coupled with institutional ID card verification and policy compliance.
          </p>
        </div>

        {/* Controls: Mode & Direction */}
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#F7F9F8] p-1 rounded-xl border border-[#D5EBDD] text-xs font-medium">
            <button
              onClick={() => setDetectionMode('DEMO')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                detectionMode === 'DEMO'
                  ? 'bg-white text-[#18231D] shadow-xs font-semibold'
                  : 'text-[#66736B] hover:text-[#18231D]'
              }`}
            >
              Demo Simulation
            </button>
            <button
              onClick={() => {
                setDetectionMode('LIVE');
                if (!isCameraActive) handleStartCamera();
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                detectionMode === 'LIVE'
                  ? 'bg-white text-[#18231D] shadow-xs font-semibold'
                  : 'text-[#66736B] hover:text-[#18231D]'
              }`}
            >
              Live Camera
            </button>
          </div>

          {/* Direction Switcher */}
          <div className="flex items-center bg-[#F7F9F8] p-1 rounded-xl border border-[#D5EBDD] text-xs font-medium">
            <button
              onClick={() => {
                setGateType('ENTRY');
                if (detectedPlate) evaluateDetection(detectedPlate, detectedVehicleType, confidence, 'ENTRY', exitHour, idVerification);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                gateType === 'ENTRY'
                  ? 'bg-[#3F7D58] text-white shadow-xs'
                  : 'text-[#66736B] hover:text-[#18231D]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entry</span>
            </button>
            <button
              onClick={() => {
                setGateType('EXIT');
                if (detectedPlate) evaluateDetection(detectedPlate, detectedVehicleType, confidence, 'EXIT', exitHour, idVerification);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                gateType === 'EXIT'
                  ? 'bg-[#18231D] text-white shadow-xs'
                  : 'text-[#66736B] hover:text-[#18231D]'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. STEP-BY-STEP PROGRESS PIPELINE INDICATOR */}
      <div className="card-classic p-4">
        <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs py-1">
          {detectionSteps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-bold transition-all ${
                    step.isDone
                      ? 'bg-[#3F7D58] text-white'
                      : step.isActive
                      ? 'bg-[#E8F2EB] text-[#285C3F] border border-[#3F7D58] animate-pulse'
                      : 'bg-[#F1F3F2] text-[#AAB7AF]'
                  }`}
                >
                  {step.isDone ? '✓' : step.id}
                </span>
                <span
                  className={`font-medium ${
                    step.isDone
                      ? 'text-[#18231D]'
                      : step.isActive
                      ? 'text-[#285C3F] font-semibold'
                      : 'text-[#AAB7AF]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < detectionSteps.length - 1 && (
                <div className="w-8 h-[1px] bg-[#D5EBDD] shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. MAIN 2-COLUMN VIEWPORT: LEFT CAMERA / RIGHT RESULT CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: CAMERA PREVIEW & OCR HUD (7 cols) */}
        <div className="lg:col-span-7 card-classic card-interactive p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#3F7D58]" />
              <span className="font-semibold text-xs uppercase tracking-wider text-[#18231D]">
                Dual Sensor Feed (Vehicle ANPR + ID Scanner)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary-white px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                title="Upload ID Card or Vehicle Snapshot"
              >
                <Upload className="w-3.5 h-3.5 text-[#3F7D58]" />
                <span>Upload Snapshot</span>
              </button>

              {!isCameraActive ? (
                <button
                  onClick={handleStartCamera}
                  className="btn-secondary-white px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-[#3F7D58]" />
                  <span>Connect Hardware</span>
                </button>
              ) : (
                <button
                  onClick={handleStopCamera}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#B45353] border border-rose-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>
          </div>

          {/* Clean Camera Viewport with scanning line animation */}
          <div className="relative aspect-video bg-[#F7F9F8] rounded-2xl overflow-hidden border border-[#D5EBDD] flex items-center justify-center select-none shadow-inner">
            {/* Real WebRTC Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
            />

            {/* Clean Simulated State when camera is inactive */}
            {!isCameraActive && (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#F7F9F8]">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#D5EBDD] text-[#3F7D58] mx-auto flex items-center justify-center mb-2 shadow-xs">
                  <Scan className="w-6 h-6" />
                </div>
                <h4 className="text-[#18231D] font-semibold text-sm">
                  {detectionMode === 'DEMO' ? 'AI Simulation Stream (ANPR + ID OCR)' : 'Camera Sensor Idle'}
                </h4>
                <p className="text-[#66736B] text-xs max-w-xs mt-1">
                  {detectionMode === 'DEMO'
                    ? 'Use the test simulation buttons below or upload a snapshot image to test optical ID verification.'
                    : 'Click "Connect Hardware" to activate live camera feed.'}
                </p>
                {uploadedImageName && (
                  <span className="mt-2 px-2.5 py-1 bg-white border border-[#D5EBDD] rounded-lg text-[11px] text-[#285C3F] font-mono">
                    Loaded snapshot: {uploadedImageName}
                  </span>
                )}
              </div>
            )}

            {/* Scanning line animation */}
            <div className="animate-scanline" />

            {/* Clean Overlay Indicators */}
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-20">
              {/* Top status pills */}
              <div className="flex justify-between items-start text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 border border-[#D5EBDD] text-[#18231D] shadow-xs backdrop-blur-xs">
                    <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-[#3F7D58] animate-camera-pulse' : 'bg-[#3F7D58]'}`}></span>
                    <span className="font-medium">{isCameraActive ? 'Live ANPR Sensor' : 'Sensor Ready'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 border border-[#D5EBDD] text-[#18231D] shadow-xs backdrop-blur-xs">
                    <CreditCard className="w-3.5 h-3.5 text-[#3F7D58]" />
                    <span className="font-medium">
                      {detectedIdCard ? 'ID CARD LOCKED' : 'ID SCANNER READY'}
                    </span>
                  </div>
                </div>

                {/* Face presence badge: presence only, zero biometrics */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 border border-[#D5EBDD] text-[#66736B] shadow-xs backdrop-blur-xs">
                  <ScanFace className="w-3.5 h-3.5 text-[#3F7D58]" />
                  <span className="font-medium">FACE PRESENT</span>
                  <span className="text-[9px] text-[#AAB7AF] font-normal">(Zero Biometrics)</span>
                </div>
              </div>

              {/* Bounding Boxes Container: Plate + ID Card */}
              <div className="flex items-center justify-around w-full gap-3 my-auto">
                {/* 1. Plate Bounding Box */}
                {detectedPlate && (
                  <div className="relative w-1/2 max-w-[240px] h-28 border-2 border-[#3F7D58] rounded-xl bg-[#3F7D58]/10 flex flex-col justify-between p-2 backdrop-blur-xs shadow-md">
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-[#285C3F]"></div>
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-[#285C3F]"></div>
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-[#285C3F]"></div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-[#285C3F]"></div>

                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="bg-[#3F7D58] text-white px-1.5 py-0.5 rounded font-medium">
                        ANPR OCR
                      </span>
                      <span className="bg-white text-[#18231D] border border-[#D5EBDD] px-1 py-0.5 rounded font-semibold">
                        {confidence}%
                      </span>
                    </div>

                    <div className="self-center bg-white px-2.5 py-1 rounded-lg border border-[#3F7D58] text-center shadow-xs">
                      <span className="font-mono font-bold text-[#18231D] text-xs tracking-wider">
                        {detectedPlate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-[#285C3F] font-medium">
                      <span>{VEHICLE_TYPE_LABELS[detectedVehicleType]}</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3F7D58]"></span>
                        LOCKED
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. College ID Card Bounding Box */}
                {detectedIdCard ? (
                  <div className="relative w-1/2 max-w-[240px] h-28 border-2 border-emerald-500 rounded-xl bg-emerald-500/10 flex flex-col justify-between p-2 backdrop-blur-xs shadow-md">
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-emerald-600"></div>
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-emerald-600"></div>
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-emerald-600"></div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-emerald-600"></div>

                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <CreditCard className="w-2.5 h-2.5" /> ID CARD OCR
                      </span>
                      <span className={`px-1 py-0.5 rounded font-semibold border ${
                        idCardConfidence >= 80
                          ? 'bg-white text-[#18231D] border-[#D5EBDD]'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {idCardConfidence}%
                      </span>
                    </div>

                    <div className="self-center bg-white px-2.5 py-1 rounded-lg border border-emerald-500 text-center shadow-xs">
                      <span className="text-[9px] text-[#66736B] uppercase font-mono block">
                        INSTITUTIONAL ID
                      </span>
                      <span className="font-mono font-bold text-[#18231D] text-xs tracking-wider">
                        {ValidationService.maskMemberId(detectedIdCard)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-medium">
                      <span className="text-[#285C3F]">
                        {idVerification?.status === 'VERIFIED'
                          ? 'STATUS: VERIFIED'
                          : idVerification?.status === 'NEEDS_REVIEW'
                          ? 'STATUS: REVIEW REQ.'
                          : 'STATUS: ' + (idVerification?.status || 'OCR')}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        READ
                      </span>
                    </div>
                  </div>
                ) : detectedPlate ? (
                  /* ID Not Presented Prompt */
                  <div className="w-1/2 max-w-[240px] h-28 border border-dashed border-[#AAB7AF] rounded-xl bg-white/70 flex flex-col items-center justify-center p-3 text-center">
                    <CreditCard className="w-5 h-5 text-[#AAB7AF] mb-1" />
                    <span className="text-[11px] font-semibold text-[#66736B]">No ID Card Detected</span>
                    <span className="text-[9px] text-[#AAB7AF]">Visitor Bypass or Hold Card Near Lens</span>
                  </div>
                ) : null}
              </div>

              {/* Bottom HUD bar */}
              <div className="flex justify-between items-end text-[10px] text-[#66736B]">
                <div className="px-2.5 py-1 rounded-lg bg-white/95 border border-[#D5EBDD] backdrop-blur-xs">
                  SCPM Dual-Sensor ANPR + ID Card v3.1
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-white/95 border border-[#D5EBDD] font-medium backdrop-blur-xs">
                  Direction: {gateType}
                </div>
              </div>
            </div>
          </div>

          {/* Quick trigger row */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-[#66736B]">
              {isProcessing
                ? 'Processing optical telemetry...'
                : isOverridden
                ? 'Overridden by Security Guard.'
                : 'Sensor buffer ready for next vehicle or ID scan.'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleClearDetection()}
                disabled={!detectedPlate && !detectedIdCard}
                className="px-3 py-1.5 rounded-xl border border-[#D5EBDD] text-[#66736B] hover:text-[#18231D] text-xs font-medium cursor-pointer disabled:opacity-40"
              >
                Reset
              </button>
              <button
                onClick={() => runDetection()}
                disabled={isProcessing}
                className="btn-primary-muted px-3.5 py-2 rounded-xl font-medium text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Scan className="w-3.5 h-3.5" />
                <span>Scan Frame</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: DETECTION & COLLEGE ID VERIFICATION PANEL (5 cols) */}
        <div className="lg:col-span-5 card-classic card-interactive p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5EBDD]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#3F7D58]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#18231D]">
                  Verification & Gate Clearance
                </h3>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#285C3F] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3F7D58] animate-camera-pulse"></span>
                <span>Active</span>
              </div>
            </div>

            {/* When NO vehicle has been detected yet */}
            {!detectedPlate && (
              <div className="py-12 text-center text-[#66736B] space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-[#F7F9F8] border border-[#D5EBDD] text-[#AAB7AF] mx-auto flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-[#18231D] text-xs">Awaiting Vehicle & ID at Gate</h4>
                <p className="text-[11px] text-[#66736B] max-w-xs mx-auto">
                  Select a test simulation preset below or scan camera frame to trigger vehicle + ID card OCR.
                </p>
              </div>
            )}

            {/* When vehicle IS detected */}
            {detectedPlate && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* 1. Vehicle ANPR Metadata */}
                <div className="rounded-2xl border border-[#D5EBDD] divide-y divide-[#D5EBDD] bg-white text-xs shadow-xs">
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-[#66736B]">Vehicle Plate</span>
                    <div className="flex items-center gap-2">
                      <LicensePlate plateNumber={detectedPlate} size="sm" />
                      <span className="font-mono text-[10px] bg-[#F7F9F8] px-1.5 py-0.5 rounded border border-[#D5EBDD]">
                        {confidence}%
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-[#66736B]">Vehicle Type</span>
                    <span className="font-medium text-[#18231D] flex items-center gap-1">
                      {detectedVehicleType === 'TWO_WHEELER' ? (
                        <Bike className="w-3.5 h-3.5 text-[#3F7D58]" />
                      ) : (
                        <Car className="w-3.5 h-3.5 text-[#3F7D58]" />
                      )}
                      <span>{VEHICLE_TYPE_LABELS[detectedVehicleType]}</span>
                    </span>
                  </div>
                </div>

                {/* 2. DEDICATED COLLEGE ID CARD VERIFICATION PANEL */}
                <div className="p-3.5 rounded-2xl border border-[#D5EBDD] bg-[#F7F9F8] space-y-3 text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#3F7D58]" />
                      <span className="font-bold text-[#18231D] text-xs">College ID Verification</span>
                    </div>

                    {/* Status Badge */}
                    {isOverridden ? (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <KeyRound className="w-3 h-3" /> OVERRIDDEN
                      </span>
                    ) : idVerification?.status === 'VERIFIED' ? (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-[#E8F2EB] text-[#285C3F] border border-[#3F7D58] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED
                      </span>
                    ) : idVerification?.status === 'NEEDS_REVIEW' ? (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> NEEDS REVIEW
                      </span>
                    ) : idVerification?.status === 'FAILED' ? (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-rose-50 text-[#B45353] border border-rose-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> FAILED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full font-medium text-[10px] bg-[#EAF2ED] text-[#285C3F] border border-[#D5EBDD]">
                        VISITOR BYPASS
                      </span>
                    )}
                  </div>

                  {/* ID Checklist details */}
                  <div className="space-y-1.5 pt-1 border-t border-[#D5EBDD]/70 text-[11px]">
                    {/* Checklist item 1: ID card detected */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#66736B]">College ID Card</span>
                      {detectedIdCard ? (
                        <span className="font-mono font-medium text-[#18231D] flex items-center gap-1">
                          <Check className="w-3 h-3 text-[#3F7D58]" />
                          {ValidationService.maskMemberId(detectedIdCard)}
                        </span>
                      ) : (
                        <span className="text-[#AAB7AF] flex items-center gap-1">
                          <X className="w-3 h-3" /> None (Visitor Rate)
                        </span>
                      )}
                    </div>

                    {/* Checklist item 2: Active Registry Status */}
                    {idVerification?.member && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#66736B]">Member Name & Role</span>
                        <span className="font-medium text-[#18231D]">
                          {idVerification.member.name} ({idVerification.member.role})
                        </span>
                      </div>
                    )}

                    {/* Checklist item 3: Vehicle plate matching */}
                    {detectedIdCard && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#66736B]">Vehicle Registered to Member</span>
                        {idVerification?.plateMatched || idVerification?.member?.registeredVehicles?.some((v: any) => v.plateNumber === detectedPlate) ? (
                          <span className="text-[#285C3F] font-medium flex items-center gap-1">
                            <Check className="w-3 h-3 text-[#3F7D58]" /> Matches Registry
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Plate Mismatch
                          </span>
                        )}
                      </div>
                    )}

                    {/* Checklist item 4: OCR Confidence threshold */}
                    {detectedIdCard && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#66736B]">OCR Confidence (≥80% required)</span>
                        <span className={`font-mono font-semibold ${idCardConfidence >= 80 ? 'text-[#285C3F]' : 'text-amber-700'}`}>
                          {idCardConfidence}% {idCardConfidence >= 80 ? '✓' : '(Low confidence)'}
                        </span>
                      </div>
                    )}

                    {/* Applicable Tariff */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#D5EBDD]/70">
                      <span className="text-[#66736B]">Applicable Tariff</span>
                      <span className="font-medium text-[#285C3F]">
                        {ownerCategory === 'STAFF'
                          ? 'Staff Free Parking (₹0)'
                          : ownerCategory === 'STUDENT'
                          ? 'Student Rate (2h Grace, ₹10/hr)'
                          : 'Visitor Rate (₹20/hr standard)'}
                      </span>
                    </div>

                    {/* Reasons or Warnings */}
                    {idVerification?.reasons && idVerification.reasons.length > 0 && idVerification.status !== 'VISITOR_BYPASS' && (
                      <div className="p-2 rounded-xl bg-white border border-[#D5EBDD] space-y-0.5 mt-2">
                        <span className="text-[10px] font-semibold text-[#66736B] uppercase tracking-wider block">
                          Verification Details
                        </span>
                        {idVerification.reasons.map((r, idx) => (
                          <p key={idx} className="text-[11px] text-[#18231D]">
                            • {r}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Overridden Banner */}
                    {isOverridden && activeOverrideReason && (
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-0.5 mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-amber-700" /> Security Guard Override Logged
                        </span>
                        <p className="text-[11px]">{activeOverrideReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Manual Override Action Button if not verified */}
                  {(!idVerification?.canAutoApprove && idVerification?.status !== 'VISITOR_BYPASS' && !isOverridden) && (
                    <button
                      onClick={() => setIsOverrideModalOpen(true)}
                      className="w-full mt-2 py-1.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    >
                      <KeyRound className="w-3 h-3 text-amber-600" />
                      <span>Security Guard Override</span>
                    </button>
                  )}
                </div>

                {/* 3. Assigned Bay Preview for Entry */}
                {gateType === 'ENTRY' && entryResult && (
                  <div className="p-3 rounded-2xl border border-[#D5EBDD] bg-white flex items-center justify-between text-xs shadow-xs">
                    <div>
                      <span className="text-[#66736B] block">Assigned Parking Bay</span>
                      <span className="text-[11px] text-[#285C3F] font-medium">
                        {entryResult.status === 'NEW_VEHICLE' ? 'Auto-allocated by smart engine' : entryResult.message}
                      </span>
                    </div>
                    {entryResult.status === 'NEW_VEHICLE' && (
                      <span className="font-mono font-bold text-base text-[#18231D] bg-[#F7F9F8] border border-[#D5EBDD] px-2.5 py-1 rounded-xl">
                        {entryResult.assignedPreviewSlot}
                      </span>
                    )}
                  </div>
                )}

                {/* Assigned Settle Fee Preview for Exit */}
                {gateType === 'EXIT' && exitResult && exitResult.status === 'ACTIVE_FOUND' && (
                  <div className="p-3 rounded-2xl border border-[#D5EBDD] bg-white flex items-center justify-between text-xs shadow-xs">
                    <div>
                      <span className="text-[#66736B] block">Settled Parking Fee</span>
                      <span className="text-[11px] text-[#285C3F] font-medium">
                        Parked Duration: {exitResult.duration}h
                      </span>
                    </div>
                    <span className="font-mono font-bold text-base text-[#18231D] bg-[#F7F9F8] border border-[#D5EBDD] px-2.5 py-1 rounded-xl">
                      {APP_CONFIG.currencySymbol}{exitResult.fee}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Confirmation Buttons */}
          <div className="pt-3 border-t border-[#D5EBDD] space-y-2">
            {gateType === 'ENTRY' && (
              <>
                {canConfirmEntry ? (
                  <button
                    onClick={handleConfirmEntry}
                    className="w-full py-2.5 rounded-xl btn-primary-muted font-medium text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Confirm Entry & Open Barrier</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsOverrideModalOpen(true)}
                    disabled={!detectedPlate || entryResult?.status !== 'NEW_VEHICLE'}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-[#F1F3F2] disabled:text-[#AAB7AF] disabled:cursor-not-allowed text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Manual Review Required to Open</span>
                  </button>
                )}
              </>
            )}

            {gateType === 'EXIT' && (
              <button
                onClick={handleConfirmExit}
                disabled={!exitResult || exitResult.status !== 'ACTIVE_FOUND'}
                className="w-full py-2.5 rounded-xl bg-[#18231D] hover:bg-[#111827] disabled:bg-[#F1F3F2] disabled:text-[#AAB7AF] disabled:cursor-not-allowed text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Process Checkout & Receipt</span>
              </button>
            )}

            {/* Fallback Manual Action Links */}
            <div className="flex items-center justify-between text-[11px] text-[#66736B] pt-1">
              <button
                onClick={onNavigateToManualEntry}
                className="text-[#3F7D58] hover:text-[#285C3F] hover:underline font-medium cursor-pointer"
              >
                Manual Entry Fallback →
              </button>
              <button
                onClick={() => onNavigateToManualExit(detectedPlate)}
                className="text-[#66736B] hover:text-[#18231D] hover:underline cursor-pointer"
              >
                Manual Exit Fallback →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DEMONSTRATION TEST CONTROLS - EXTENDED FOR ID VERIFICATION SCENARIOS */}
      <div className="card-classic p-6 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#D5EBDD]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#3F7D58]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#18231D]">
              Demonstration & Verification Presets
            </h3>
          </div>
          <span className="text-[11px] text-[#66736B]">
            Simulate OCR camera scans & test policy verification criteria
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {/* Preset 1: Student Match */}
          <button
            onClick={() => runDetection('KA-05-ST-2020', 'TWO_WHEELER', 96, 'STU-2023-045', 95)}
            className="p-2.5 rounded-xl bg-white hover:bg-[#F1F7F3] border border-[#D5EBDD] hover:border-[#3F7D58] text-left transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <span className="text-[10px] font-semibold block uppercase text-[#3F7D58]">Student Match</span>
            <span className="text-xs font-mono font-bold block text-[#18231D]">KA-05-ST-2020</span>
            <span className="text-[10px] text-[#66736B]">STU-***-045 (95%)</span>
          </button>

          {/* Preset 2: Faculty Match */}
          <button
            onClick={() => runDetection('KA-01-FA-1001', 'FOUR_WHEELER', 98, 'FAC-CS-101', 98)}
            className="p-2.5 rounded-xl bg-white hover:bg-[#F1F7F3] border border-[#D5EBDD] hover:border-[#3F7D58] text-left transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <span className="text-[10px] font-semibold block uppercase text-[#3F7D58]">Faculty Match</span>
            <span className="text-xs font-mono font-bold block text-[#18231D]">KA-01-FA-1001</span>
            <span className="text-[10px] text-[#66736B]">FAC-***-101 (98%)</span>
          </button>

          {/* Preset 3: Staff Match */}
          <button
            onClick={() => runDetection('KA-04-SK-5555', 'TWO_WHEELER', 95, 'STF-ADM-012', 96)}
            className="p-2.5 rounded-xl bg-white hover:bg-[#F1F7F3] border border-[#D5EBDD] hover:border-[#3F7D58] text-left transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <span className="text-[10px] font-semibold block uppercase text-[#3F7D58]">Staff Match</span>
            <span className="text-xs font-mono font-bold block text-[#18231D]">KA-04-SK-5555</span>
            <span className="text-[10px] text-[#66736B]">STF-***-012 (96%)</span>
          </button>

          {/* Preset 4: Plate Mismatch */}
          <button
            onClick={() => runDetection('KA-01-FA-1001', 'FOUR_WHEELER', 95, 'STU-2023-045', 92)}
            className="p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-left transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <span className="text-[10px] font-semibold block uppercase text-amber-700">Plate Mismatch</span>
            <span className="text-xs font-mono font-bold block text-[#18231D]">KA-01-FA-1001</span>
            <span className="text-[10px] text-amber-800">Student ID with Faculty Car</span>
          </button>

          {/* Preset 5: Low Confidence OCR (<80%) */}
          <button
            onClick={() => runDetection('KA-05-ST-2020', 'TWO_WHEELER', 94, 'STU-2023-045', 68)}
            className="p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-left transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <span className="text-[10px] font-semibold block uppercase text-amber-700">Low OCR (68%)</span>
            <span className="text-xs font-mono font-bold block text-[#18231D]">STU-***-045</span>
            <span className="text-[10px] text-amber-800">Manual Review Flag</span>
          </button>

          {/* Preset 6: Unknown ID */}
          <button
            onClick={() => runDetection('KA-05-ST-2020', 'TWO_WHEELER', 92, 'STU-999-999', 91)}
            className="p-2.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-left transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <span className="text-[10px] font-semibold block uppercase text-[#B45353]">Unknown ID</span>
            <span className="text-xs font-mono font-bold block text-[#18231D]">STU-999-999</span>
            <span className="text-[10px] text-[#B45353]">Unregistered ID</span>
          </button>

          {/* Preset 7: Visitor (No ID presented) */}
          <button
            onClick={() => runDetection('KA-02-VS-7777', 'FOUR_WHEELER', 92, '', 0)}
            className="p-2.5 rounded-xl bg-white hover:bg-[#F1F7F3] border border-[#D5EBDD] text-left transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <span className="text-[10px] font-semibold block uppercase text-[#66736B]">Visitor (No ID)</span>
            <span className="text-xs font-mono font-bold block text-[#18231D]">KA-02-VS-7777</span>
            <span className="text-[10px] text-[#66736B]">Visitor Tariff Fallback</span>
          </button>

          {/* Preset 8: Active Exit */}
          <button
            onClick={() => {
              if (activeVehicles.length > 0) {
                const randomParked = activeVehicles[Math.floor(Math.random() * activeVehicles.length)];
                runDetection(randomParked.vehicleNumber, randomParked.vehicleType, 97);
              } else {
                setStatusFeedback('No vehicles currently parked to simulate exit for.');
              }
            }}
            className="p-2.5 rounded-xl bg-white hover:bg-[#F1F7F3] border border-[#D5EBDD] text-left transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <span className="text-[10px] font-semibold block uppercase text-[#18231D]">Active Exit</span>
            <span className="text-xs font-semibold block truncate text-[#18231D]">Parked Bay</span>
            <span className="text-[10px] text-[#66736B]">Lookup & Checkout</span>
          </button>
        </div>
      </div>

      {/* 5. CAMERA & ID TELEMETRY AUDIT TABLE */}
      <div className="card-classic p-6 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#D5EBDD]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#3F7D58]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#18231D]">
              Camera & ID Verification Audit Log ({activityLogs.length})
            </h3>
          </div>
          <span className="text-[11px] text-[#66736B]">Persisted in SQLite database (`scpm.db`)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9F8] border-b border-[#D5EBDD] text-[#66736B] uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Gate</th>
                <th className="py-2.5 px-3">Plate</th>
                <th className="py-2.5 px-3">Masked ID Card</th>
                <th className="py-2.5 px-3">ID Status</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Registry Member</th>
                <th className="py-2.5 px-3">Gate Action</th>
                <th className="py-2.5 px-3">Override Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5EBDD]">
              {activityLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-[#AAB7AF] text-xs">
                    No camera events logged yet today.
                  </td>
                </tr>
              ) : (
                activityLogs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-[#F1F7F3] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#66736B]">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${log.gateType === 'ENTRY' ? 'bg-[#E8F2EB] text-[#285C3F]' : 'bg-[#F1F3F2] text-[#18231D]'}`}>
                        {log.gateType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <LicensePlate plateNumber={log.plateNumber} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#18231D]">
                      {log.idCardNumberMasked || (log.memberId ? ValidationService.maskMemberId(log.memberId) : '—')}
                    </td>
                    <td className="py-2.5 px-3">
                      {log.idVerificationStatus === 'VERIFIED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F2EB] text-[#285C3F]">
                          VERIFIED
                        </span>
                      ) : log.idVerificationStatus === 'NEEDS_REVIEW' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
                          REVIEW
                        </span>
                      ) : log.idVerificationStatus === 'FAILED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-[#B45353]">
                          FAILED
                        </span>
                      ) : log.idVerificationStatus === 'OVERRIDDEN' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          OVERRIDDEN
                        </span>
                      ) : (
                        <span className="text-[#AAB7AF] text-[10px]">VISITOR</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#66736B]">
                      {VEHICLE_TYPE_LABELS[log.vehicleType]}
                    </td>
                    <td className="py-2.5 px-3">
                      {log.memberName ? (
                        <span className="text-[#285C3F] font-medium">{log.memberName} ({log.role})</span>
                      ) : (
                        <span className="text-[#AAB7AF]">Visitor</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#18231D]">
                      {log.actionSummary}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-amber-800 font-medium truncate max-w-[150px]">
                      {log.overrideReason || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. GUARD MANUAL OVERRIDE MODAL / DRAWER */}
      <AnimatePresence>
        {isOverrideModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-md w-full border border-[#D5EBDD] shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#D5EBDD]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#18231D]">Security Guard Manual Override</h3>
                    <p className="text-[11px] text-[#66736B]">Authorize entry barrier opening with mandatory reason log</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="p-1 rounded-lg text-[#AAB7AF] hover:text-[#18231D] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F7F9F8] border border-[#D5EBDD] space-y-1">
                  <div className="flex justify-between text-[#66736B]">
                    <span>Detected Plate:</span>
                    <span className="font-mono font-bold text-[#18231D]">{detectedPlate}</span>
                  </div>
                  <div className="flex justify-between text-[#66736B]">
                    <span>Scanned ID:</span>
                    <span className="font-mono font-medium text-[#18231D]">
                      {detectedIdCard ? ValidationService.maskMemberId(detectedIdCard) : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#66736B]">
                    <span>Flagged Issue:</span>
                    <span className="text-amber-800 font-medium">
                      {idVerification?.reasons?.join('; ') || 'Requires security authorization'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#18231D] mb-1.5">
                    Authorized Guard Justification (Logged to Database Audit Trail)
                  </label>
                  <select
                    className="w-full mb-2 p-2 rounded-xl border border-[#D5EBDD] bg-white text-xs text-[#18231D]"
                    onChange={(e) => setOverrideReasonInput(e.target.value)}
                    value={overrideReasonInput}
                  >
                    <option value="Physical student/staff ID manually verified by guard on duty">
                      Physical student/staff ID manually verified by guard
                    </option>
                    <option value="Temporary/replacement vehicle authorized by department head">
                      Temporary/replacement vehicle authorized by department
                    </option>
                    <option value="ID card barcode worn out - manual physical badge inspection passed">
                      ID card worn out - manual physical badge inspection passed
                    </option>
                    <option value="Campus guest/guest lecturer accompanied by faculty">
                      Campus guest accompanied by faculty
                    </option>
                    <option value="Emergency entry authorization granted">
                      Emergency entry authorization granted
                    </option>
                  </select>

                  <textarea
                    rows={2}
                    value={overrideReasonInput}
                    onChange={(e) => setOverrideReasonInput(e.target.value)}
                    placeholder="Enter specific guard justification..."
                    className="w-full p-2.5 rounded-xl border border-[#D5EBDD] text-xs text-[#18231D] focus:border-[#3F7D58] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D5EBDD]">
                <button
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-[#D5EBDD] text-[#66736B] hover:text-[#18231D] text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyOverride}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Authorize & Grant Clearance</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
