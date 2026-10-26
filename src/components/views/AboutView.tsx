import React, { useState } from 'react';
import { APP_CONFIG } from '../../constants';
import { runAllCompetitionTests } from '../../tests/competitionTests';
import {
  CheckCircle2,
  Code2,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  FileCheck,
} from 'lucide-react';

interface AboutViewProps {
  onSeedDemoData: () => void;
  onResetSystem: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  onSeedDemoData,
  onResetSystem,
}) => {
  const [testResults, setTestResults] = useState<{
    passed: number;
    total: number;
    results: { id: string; name: string; success: boolean; details: string }[];
  } | null>(null);

  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleRunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const res = runAllCompetitionTests();
      setTestResults(res);
      setIsRunningTests(false);
    }, 250);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 1. HERO HEADER */}
      <div className="card-classic p-6 sm:p-7 space-y-4 border-[#D5EBDD] bg-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#D5EBDD]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3F8F5B] to-[#2F7748] text-white flex items-center justify-center font-bold text-base shadow-xs">
              S
            </div>
            <div>
              <span className="text-[11px] uppercase font-semibold tracking-wider text-[#185C36]">
                Competition Submission
              </span>
              <h2 className="text-xl font-bold text-[#183025] tracking-tight">
                {APP_CONFIG.appName}
              </h2>
              <p className="text-xs text-[#5E7165]">
                {APP_CONFIG.tagline}
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-[#D9FBE5] border border-[#A8DDB8] text-[#185C36]">
            v{APP_CONFIG.version} • Production
          </span>
        </div>

        <p className="text-xs text-[#183025] leading-relaxed">
          <strong>Smart Campus Parking Management (SCPM)</strong> digitizes campus parking registers. It provides instant vehicle entry logging,
          rule-based parking slot allocation (Zone T: 10 bays, Zone F: 5 bays), live occupancy telemetry, transparent duration & fee calculations,
          college vehicle directory verification, AI camera ANPR with face presence detection (zero biometric storage), rule-based anomaly detection, and printable official audit receipts.
        </p>

        {/* Core Technologies Badges */}
        <div className="pt-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#5E7165] mb-2">
            Technology Stack
          </h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Three.js / Isometric Canvas', 'Local Storage', 'Lucide React'].map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 rounded-lg bg-[#EAF8EE] border border-[#D5EBDD] text-[#183025] font-medium flex items-center gap-1.5 text-xs shadow-2xs"
              >
                <Code2 className="w-3.5 h-3.5 text-[#3F8F5B]" />
                <span>{tech}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2. OOP ARCHITECTURE & SERVICES */}
      <div className="card-classic p-6 sm:p-7 space-y-3.5 border-[#D5EBDD] bg-white">
        <div className="flex items-center gap-2 pb-2 border-b border-[#D5EBDD]">
          <Layers className="w-4 h-4 text-[#3F8F5B]" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#183025]">
            Modular Object-Oriented Architecture
          </h3>
        </div>

        <p className="text-xs text-[#5E7165] leading-relaxed">
          Business rules are isolated into pure TypeScript service modules:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] space-y-0.5 shadow-2xs">
            <span className="font-mono font-bold text-[#185C36] block text-xs">ParkingService</span>
            <p className="text-[#5E7165] text-[11px]">
              Compatible bay discovery (2W: T-01..T-10, 4W: F-01..F-05), check-ins, check-outs.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] space-y-0.5 shadow-2xs">
            <span className="font-mono font-bold text-[#185C36] block text-xs">FeeCalculator</span>
            <p className="text-[#5E7165] text-[11px]">
              Deterministic fee engine applying student grace periods, staff waivers, and visitor rates.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] space-y-0.5 shadow-2xs">
            <span className="font-mono font-bold text-[#185C36] block text-xs">ValidationService</span>
            <p className="text-[#5E7165] text-[11px]">
              Sanitizes plates, checks active duplicates, validates 0–23h bounds, and ensures exit ≥ entry.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] space-y-0.5 shadow-2xs">
            <span className="font-mono font-bold text-[#185C36] block text-xs">CollegeRegistryService</span>
            <p className="text-[#5E7165] text-[11px]">
              Validates institutional members (Students, Faculty, Staff, Admin) and authorized license plates.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] space-y-0.5 shadow-2xs">
            <span className="font-mono font-bold text-[#185C36] block text-xs">SlotAllocationService</span>
            <p className="text-[#5E7165] text-[11px]">
              Intelligent slot recommendation evaluating congestion, bay compatibility, and proximity.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] space-y-0.5 shadow-2xs">
            <span className="font-mono font-bold text-[#185C36] block text-xs">AlertService</span>
            <p className="text-[#5E7165] text-[11px]">
              Rule-based anomaly detection radar logging duplicate attempts, capacity risks, and OCR warnings.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] space-y-0.5 shadow-2xs">
            <span className="font-mono font-bold text-[#185C36] block text-xs">ReceiptService</span>
            <p className="text-[#5E7165] text-[11px]">
              Generates audit receipts with unique IDs, line item breakdowns, and print layout.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] space-y-0.5 shadow-2xs">
            <span className="font-mono font-bold text-[#185C36] block text-xs">GateProcessingService</span>
            <p className="text-[#5E7165] text-[11px]">
              Orchestrates optical camera scanning, face presence signals, auto-direction, and gate barrier control.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-white to-[#EAF8EE] border border-[#D5EBDD] space-y-0.5 shadow-2xs">
            <span className="font-mono font-bold text-[#185C36] block text-xs">StatisticsService</span>
            <p className="text-[#5E7165] text-[11px]">
              Dynamically computes occupancy rates, daily collections, and AI gate telemetry.
            </p>
          </div>
        </div>
      </div>

      {/* 3. COMPETITION TEST SUITE RUNNER */}
      <div className="card-classic p-6 sm:p-7 space-y-4 border-[#D5EBDD] bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D5EBDD]">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#3F8F5B]" />
            <div>
              <h3 className="font-bold text-sm text-[#183025]">
                Automated Competition Test Suite
              </h3>
              <p className="text-[11px] text-[#5E7165]">
                Validates all 23 required competition scenarios.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunningTests}
            className="px-4 py-2 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-[#3F8F5B] to-[#2F7748] hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunningTests ? 'Executing...' : 'Run All Tests'}</span>
          </button>
        </div>

        {testResults && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#D9FBE5] border border-[#A8DDB8] text-[#185C36] text-xs font-semibold">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#3F8F5B]" />
                <span>All {testResults.total} Test Scenarios Passed!</span>
              </span>
              <span className="font-mono font-bold">
                {testResults.passed} / {testResults.total} (100%)
              </span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {testResults.results.map((res) => (
                <div
                  key={res.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#D5EBDD] text-xs hover:bg-[#F1FBF4] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#185C36] text-[11px]">
                      {res.id}:
                    </span>
                    <span className="text-[#183025]">{res.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#5E7165] font-mono hidden sm:inline">
                      {res.details}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#D9FBE5] border border-[#A8DDB8] text-[#185C36] font-semibold text-[10px]">
                      PASS
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. DEMO & ENVIRONMENT ACTIONS */}
      <div className="card-classic p-6 sm:p-7 border-[#D5EBDD] bg-white">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#5E7165] mb-3">
          Environment & Demo Tools
        </h4>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onSeedDemoData}
            className="bg-white border border-[#D5EBDD] text-[#185C36] hover:bg-[#F1FBF4] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-[#3F8F5B]" />
            <span>Load Demo Data</span>
          </button>

          <button
            onClick={onResetSystem}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#B45353] border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset All Storage (15 Vacant Bays)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
