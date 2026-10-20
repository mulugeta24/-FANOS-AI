import React, { useState } from 'react';
import {
  Flame,
  ShieldAlert,
  AlertTriangle,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lock,
  FlaskConical,
  Activity,
  Layers,
  FileCode,
  Radio,
  FileText,
  Zap,
} from 'lucide-react';
import { Domain, AttackSimulationResponse, AttackSimulationItem } from '@/types/waf';
import { runAttackSimulation, runLiveProxyTest, updateWafDomain } from '@/services/wafApi';

interface WAFTestConsoleTabProps {
  selectedDomainId: string;
  selectedDomain?: Domain;
  domains: Domain[];
  onSelectDomain: (domainId: string, domain?: Domain) => void;
}

const AVAILABLE_TEST_CASES = [
  {
    id: 'baseline_benign',
    name: 'Baseline Clean HTTP Probe',
    category: 'BENIGN_HEALTH',
    description: 'Benign telemetry probe. Confirms legitimate traffic is permitted without false positives.',
    defaultSelected: true,
  },
  {
    id: 'sqli_auth_bypass',
    name: 'SQL Injection — Auth Bypass Tautology',
    category: 'SQL_INJECTION',
    description: "Payload: username=admin' OR 1=1--. Tests SQL pattern detection and query parser.",
    defaultSelected: true,
  },
  {
    id: 'sqli_union',
    name: 'SQL Injection — UNION Data Exfiltration',
    category: 'SQL_INJECTION',
    description: 'Payload: id=1 UNION SELECT 1,2,3,version()--. Tests DB schema extraction defense.',
    defaultSelected: true,
  },
  {
    id: 'xss_script_tag',
    name: 'Cross-Site Scripting — Reflected Script Tag',
    category: 'XSS',
    description: 'Payload: <script>alert(document.cookie)</script>. Tests browser script execution defense.',
    defaultSelected: true,
  },
  {
    id: 'path_traversal_etc_passwd',
    name: 'Path Traversal — Local File Inclusion (/etc/passwd)',
    category: 'PATH_TRAVERSAL',
    description: 'Payload: /../../../../etc/passwd. Tests directory escape and filesystem boundary defense.',
    defaultSelected: true,
  },
  {
    id: 'cmdi_pipe',
    name: 'Remote Command Execution — Shell Pipe Injection',
    category: 'COMMAND_INJECTION',
    description: 'Payload: input=8.8.8.8; cat /etc/passwd |. Tests shell metacharacter and execution filtering.',
    defaultSelected: true,
  },
  {
    id: 'bruteforce_cred_spray',
    name: 'Brute Force — Authentication Credential Spray',
    category: 'BRUTE_FORCE',
    description: 'Payload: username=admin&password=admin. Tests credential stuffing and dictionary brute force defenses.',
    defaultSelected: true,
  },
  {
    id: 'ssrf_cloud_metadata',
    name: 'SSRF — Cloud Metadata Exfiltration',
    category: 'SSRF',
    description: 'Payload: url=http://169.254.169.254/latest/meta-data/. Tests cloud instance credential theft defense.',
    defaultSelected: true,
  },
  {
    id: 'xxe_external_entity',
    name: 'XML External Entity (XXE) Injection',
    category: 'XXE',
    description: 'Payload: <!ENTITY xxe SYSTEM "file:///etc/passwd">. Tests XML parser entity expansion defense.',
    defaultSelected: true,
  },
  {
    id: 'ssti_template_injection',
    name: 'Server-Side Template Injection (SSTI)',
    category: 'SSTI',
    description: 'Payload: template={{7*7}}. Tests Jinja2, Twig, and Freemarker sandbox escape defenses.',
    defaultSelected: true,
  },
  {
    id: 'nosql_injection',
    name: 'NoSQL & LDAP Injection Probe',
    category: 'NOSQL_LDAP',
    description: 'Payload: {"$gt": "", "$ne": null}. Tests MongoDB operator injection and LDAP directory filter tampering.',
    defaultSelected: true,
  },
  {
    id: 'file_upload_webshell',
    name: 'Malicious File Upload & Web Shell',
    category: 'FILE_UPLOAD',
    description: 'Payload: filename="shell.php" with <?php eval(...). Tests script upload and webshell signature detection.',
    defaultSelected: true,
  },
  {
    id: 'open_redirect_probe',
    name: 'Open Redirect & Phishing Target',
    category: 'OPEN_REDIRECT',
    description: 'Payload: url=https://malicious-attacker.com/login. Tests untrusted external redirect interception.',
    defaultSelected: true,
  },
];

export const WAFTestConsoleTab: React.FC<WAFTestConsoleTabProps> = ({
  selectedDomainId,
  selectedDomain,
  domains,
  onSelectDomain,
}) => {
  const [selectedTests, setSelectedTests] = useState<string[]>(
    AVAILABLE_TEST_CASES.map((t) => t.id)
  );
  const [testMode, setTestMode] = useState<'live_proxy_test' | 'detection_engine_simulation'>('live_proxy_test');
  const [confirmProdAuth, setConfirmProdAuth] = useState(false);
  const [running, setRunning] = useState(false);
  const [simulationResult, setSimulationResult] = useState<AttackSimulationResponse | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [updatingMode, setUpdatingMode] = useState(false);
  const [modeToast, setModeToast] = useState<string | null>(null);

  // If no domain selected, pick from selectedDomainId or first domain
  const activeDomain =
    selectedDomain ||
    domains.find((d) => d.id === selectedDomainId) ||
    (domains.length > 0 ? domains[0] : undefined);
  const isProd = activeDomain?.target_type === 'production';

  const handleShiftTargetMode = async (targetMode: 'monitor' | 'hybrid' | 'block') => {
    if (!activeDomain) return;
    setUpdatingMode(true);
    setModeToast(null);
    try {
      const updated = await updateWafDomain(activeDomain.id, {
        enforcement_mode: targetMode,
      });
      onSelectDomain(updated.id, updated);
      setModeToast(`Target "${activeDomain.domain_name}" enforcement mode shifted to ${targetMode.toUpperCase()}${targetMode === 'hybrid' ? ' (BOTH)' : ''}!`);
      setTimeout(() => setModeToast(null), 4000);
    } catch (err: any) {
      setModeToast(`Failed to update mode: ${err?.response?.data?.detail || err?.message}`);
      setTimeout(() => setModeToast(null), 4000);
    } finally {
      setUpdatingMode(false);
    }
  };

  const toggleTest = (id: string) => {
    setSelectedTests((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedTests(AVAILABLE_TEST_CASES.map((t) => t.id));
  };

  const deselectAll = () => {
    setSelectedTests([]);
  };

  const handleRunTest = async (mode: 'live_proxy_test' | 'detection_engine_simulation' = testMode) => {
    if (!activeDomain) {
      setSimulationError('Please select a target website before running security tests.');
      return;
    }

    if (isProd && !confirmProdAuth) {
      setSimulationError('Production testing requires explicit authorization confirmation.');
      return;
    }

    if (selectedTests.length === 0) {
      setSimulationError('Please select at least one test case to execute.');
      return;
    }

    setRunning(true);
    setSimulationError(null);
    setSimulationResult(null);

    try {
      if (mode === 'live_proxy_test') {
        const res = await runLiveProxyTest(activeDomain.id, {
          test_case_ids: selectedTests,
          confirm_production_authorization: confirmProdAuth,
        });
        setSimulationResult(res);
      } else {
        const res = await runAttackSimulation(activeDomain.id, {
          test_case_ids: selectedTests,
          confirm_production_authorization: confirmProdAuth,
        });
        setSimulationResult(res);
      }
    } catch (err: any) {
      setSimulationError(
        err?.response?.data?.detail || err?.message || 'Test execution failed'
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-5 w-full">
      {/* Target Selector Bar */}
      <div className="fanos-card p-4 space-y-3" style={{ border: '1px solid rgba(0,200,255,0.3)', background: 'rgba(0,200,255,0.03)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Flame size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                FANOS WAF Security Test Console
              </h3>
              <p className="text-[10px] text-fanos-dim">
                Execute safe, non-destructive threat simulations to verify real-time proxy blocking and SOC alert dispatch.
              </p>
            </div>
          </div>

          {/* Target Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">Test Target:</span>
            <select
              value={activeDomain?.id || ''}
              onChange={(e) => {
                const dom = domains.find((d) => d.id === e.target.value);
                if (dom) onSelectDomain(dom.id, dom);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-xs text-white font-mono outline-none cursor-pointer"
            >
              {domains.map((dom) => {
                const rawMode = (dom.enforcement_mode || 'monitor').toLowerCase();
                const modeLabel = rawMode === 'hybrid' || rawMode === 'both' ? 'BOTH' : rawMode.toUpperCase();
                return (
                  <option key={dom.id} value={dom.id} className="bg-slate-950 text-slate-200">
                    {dom.domain_name} [{dom.target_type === 'demo_lab' ? 'LAB' : 'PROD'}] [{modeLabel}]
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Mode Shift Toast Notification */}
        {modeToast && (
          <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-xs font-mono flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <span>{modeToast}</span>
          </div>
        )}

        {/* Selected Target Meta Details (with interactive Shift Mode buttons in the ENFORCEMENT MODE card) */}
        {activeDomain ? (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[10px] font-mono pt-1">
            {/* Target Type */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 sm:col-span-1">
              <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-1">TARGET TYPE</span>
              <span className={activeDomain.target_type === 'demo_lab' ? 'text-purple-300 font-bold flex items-center gap-1' : 'text-cyan-300 font-bold flex items-center gap-1'}>
                {activeDomain.target_type === 'demo_lab' ? <FlaskConical size={11} /> : <Lock size={11} />}
                {activeDomain.target_type === 'demo_lab' ? 'DEMO / LAB' : 'PRODUCTION'}
              </span>
            </div>

            {/* ENFORCEMENT MODE: Interactive Shift Mode (MONITOR | BOTH/HYBRID | BLOCK) */}
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/30 sm:col-span-2 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span>ENFORCEMENT MODE</span>
                  <span className="text-cyan-400 font-normal font-sans">(Click to shift)</span>
                </span>
                {updatingMode && (
                  <span className="flex items-center gap-1 text-[9px] text-cyan-400 font-mono">
                    <RefreshCw size={9} className="animate-spin" />
                    <span>Updating...</span>
                  </span>
                )}
              </div>

              {/* 3-Button Shift Mode Control */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleShiftTargetMode('monitor')}
                  disabled={updatingMode}
                  title="Shift target to MONITOR mode (Audit only - logs threats, drops 0 traffic)"
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                    activeDomain.enforcement_mode === 'monitor'
                      ? 'bg-amber-500/25 text-amber-300 border-amber-500 shadow-sm shadow-amber-500/20'
                      : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-amber-300 hover:border-amber-500/40 hover:bg-slate-900'
                  }`}
                >
                  <Radio size={10} className={activeDomain.enforcement_mode === 'monitor' ? 'text-amber-300' : 'text-slate-500'} />
                  <span>MONITOR</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShiftTargetMode('hybrid')}
                  disabled={updatingMode}
                  title="Shift target to BOTH / HYBRID mode (Blocks critical/high threats + audits low-risk traffic)"
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                    activeDomain.enforcement_mode === 'hybrid' || activeDomain.enforcement_mode === 'both'
                      ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-cyan-300 hover:border-cyan-500/40 hover:bg-slate-900'
                  }`}
                >
                  <Zap size={10} className={activeDomain.enforcement_mode === 'hybrid' || activeDomain.enforcement_mode === 'both' ? 'text-cyan-300' : 'text-slate-500'} />
                  <span>BOTH (HYBRID)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShiftTargetMode('block')}
                  disabled={updatingMode}
                  title="Shift target to BLOCK mode (Active drop - drops threats with HTTP 403)"
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                    activeDomain.enforcement_mode === 'block'
                      ? 'bg-rose-500/25 text-rose-300 border-rose-500 shadow-sm shadow-rose-500/20'
                      : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-rose-300 hover:border-rose-500/40 hover:bg-slate-900'
                  }`}
                >
                  <ShieldAlert size={10} className={activeDomain.enforcement_mode === 'block' ? 'text-rose-300' : 'text-slate-500'} />
                  <span>BLOCK</span>
                </button>
              </div>

              {/* Status explanation */}
              <div className="text-[9px] text-slate-400 font-sans leading-tight pt-0.5">
                {activeDomain.enforcement_mode === 'block' ? (
                  <span className="text-rose-300 font-medium">Active Defense: drops attacks with HTTP 403.</span>
                ) : activeDomain.enforcement_mode === 'hybrid' || activeDomain.enforcement_mode === 'both' ? (
                  <span className="text-cyan-300 font-medium">Dual Mode: drops critical/high threats & audits low risk.</span>
                ) : (
                  <span className="text-amber-300 font-medium">Audit Only: monitors and logs without dropping traffic.</span>
                )}
              </div>
            </div>

            {/* Traffic Verified */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 sm:col-span-1">
              <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-1">TRAFFIC VERIFIED</span>
              <span className={activeDomain.traffic_verified ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {activeDomain.traffic_verified ? 'VERIFIED (PASS)' : 'AWAITING TEST'}
              </span>
            </div>

            {/* Upstream Origin */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 sm:col-span-1">
              <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-1">UPSTREAM ORIGIN</span>
              <span className="text-slate-300 font-bold truncate block" title={activeDomain.origin_url}>
                {activeDomain.origin_url}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            No domain registered yet. Please click &ldquo;+ Protect Website&rdquo; to add a production or demo lab domain.
          </div>
        )}
      </div>

      {/* Production Warning / Authorization Banner */}
      {isProd && (
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <AlertTriangle size={15} className="shrink-0" />
            <span>Production Target Authorization Required</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Target <strong className="text-white font-mono">{activeDomain?.domain_name}</strong> is designated as a live <span className="text-amber-300 font-bold">PRODUCTION</span> environment. Tests use strictly non-destructive probe payloads that do not persist or corrupt state. You must explicitly confirm authorization before proceeding.
          </p>
          <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmProdAuth}
              onChange={(e) => setConfirmProdAuth(e.target.checked)}
              className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
            />
            <span className="text-[11px] font-semibold text-white">
              I am authorized by the domain owner to execute non-destructive security test vectors against this production origin.
            </span>
          </label>
        </div>
      )}

      {/* Test Case Selection Panel */}
      <div className="fanos-card p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-2">
            <FileCode size={15} className="text-cyan-400" />
            <span className="text-xs font-bold text-white">Predefined Security Test Suite ({selectedTests.length} of {AVAILABLE_TEST_CASES.length} selected)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <button
              type="button"
              onClick={selectAll}
              className="text-cyan-400 hover:text-cyan-300 cursor-pointer underline"
            >
              Select All
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-slate-400 hover:text-slate-300 cursor-pointer underline"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {AVAILABLE_TEST_CASES.map((tc) => {
            const isChecked = selectedTests.includes(tc.id);
            return (
              <label
                key={tc.id}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                  isChecked
                    ? 'bg-cyan-500/[0.05] border-cyan-500/30 text-white'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleTest(tc.id)}
                  className="mt-0.5 accent-cyan-400 rounded cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-white">{tc.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-mono uppercase bg-slate-800 text-cyan-300">
                      {tc.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-fanos-dim">{tc.description}</p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Execution Trigger Bar & Mode Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Execution Mode:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-900 border border-slate-800 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setTestMode('live_proxy_test')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  testMode === 'live_proxy_test'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Live-Proxy Test (Real Network)
              </button>
              <button
                type="button"
                onClick={() => setTestMode('detection_engine_simulation')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  testMode === 'detection_engine_simulation'
                    ? 'bg-purple-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Engine Simulation (In-Memory)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[10px] text-fanos-dim hidden md:flex items-center gap-1.5">
              <Activity size={12} className="text-cyan-400" />
              <span>Events tagged with <code className="text-cyan-300 font-mono font-bold">is_test: true</code></span>
            </div>

            <button
              type="button"
              onClick={() => handleRunTest(testMode)}
              disabled={running || (isProd && !confirmProdAuth) || selectedTests.length === 0}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs transition-all shadow-lg cursor-pointer ${
                running || (isProd && !confirmProdAuth) || selectedTests.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : testMode === 'live_proxy_test'
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
              }`}
            >
              {running ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
              <span>
                {running
                  ? 'Executing Test Pipeline...'
                  : testMode === 'live_proxy_test'
                  ? 'Run Live-Proxy Test'
                  : 'Run Engine Simulation'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {simulationError && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0 text-rose-400" />
          <span>{simulationError}</span>
        </div>
      )}

      {/* Simulation Results Display */}
      {simulationResult && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">TEST TYPE</span>
              <div className="text-xs font-bold font-mono text-cyan-300">
                {simulationResult.test_type === 'live_proxy_test'
                  ? 'LIVE REVERSE PROXY'
                  : 'DETECTION-ENGINE SIM'}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-emerald-500/30 space-y-1">
              <span className="text-[10px] text-emerald-400 font-mono">TESTS PASSED</span>
              <div className="text-lg font-bold font-mono text-emerald-300">
                {simulationResult.tests_passed} / {simulationResult.tests_total}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-rose-500/30 space-y-1">
              <span className="text-[10px] text-rose-400 font-mono">ENFORCEMENT MODE</span>
              <div className="text-lg font-bold font-mono uppercase text-rose-300">
                {simulationResult.enforcement_mode}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-cyan-500/30 space-y-1">
              <span className="text-[10px] text-cyan-400 font-mono">SOC ALERT DISPATCH</span>
              <div className="text-lg font-bold font-mono text-cyan-300 flex items-center gap-1">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>SENT [TEST]</span>
              </div>
            </div>
          </div>

          {/* Per-Test Breakdown Table */}
          <div className="fanos-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" />
                <span className="text-xs font-bold text-white">
                  {simulationResult.test_type === 'live_proxy_test'
                    ? 'Live-Proxy Traffic Interception Proof (Origin Audit Verified)'
                    : 'Detection-Engine In-Memory Rule Simulation Results'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Executed at: {new Date(simulationResult.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
                    <th className="py-2 px-2">Test Vector</th>
                    <th className="py-2 px-2">Test Type</th>
                    <th className="py-2 px-2">Decision</th>
                    <th className="py-2 px-2">Risk</th>
                    <th className="py-2 px-2">Blocked Before Origin</th>
                    <th className="py-2 px-2">Rule Intercept</th>
                    <th className="py-2 px-2 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {simulationResult.results.map((sim: AttackSimulationItem) => (
                    <tr key={sim.test_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-2">
                        <div className="font-bold text-white">{sim.name}</div>
                        <div className="text-[9px] text-slate-400">{sim.details}</div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          sim.test_type === 'live_proxy_test'
                            ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
                            : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                        }`}>
                          {sim.test_type === 'live_proxy_test' ? 'LIVE PROXY' : 'ENGINE SIM'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                            sim.decision === 'BLOCK'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : sim.decision === 'MONITOR'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {sim.decision}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="text-slate-200 font-bold">{sim.risk_score}</span>
                        <span className="text-slate-500 text-[10px]"> / 100</span>
                      </td>
                      <td className="py-2.5 px-2">
                        {sim.test_type === 'live_proxy_test' ? (
                          sim.blocked_before_origin ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" title="Confirmed: 0 entries found in Origin request log">
                              <CheckCircle2 size={10} />
                              YES (ORIGIN AUDIT: 0 HITS)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              FORWARDED TO ORIGIN
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-800/60 border border-slate-700" title="Engine evaluation only; not verified through reverse proxy network traffic">
                            N/A (SIMULATION ONLY)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        {sim.matched_rule ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                            <span>{sim.matched_rule}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">None (Clean)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {sim.status === 'PASSED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 size={11} />
                            PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            <XCircle size={11} />
                            FAIL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Audit Trail Log Summary Box */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-[10px] font-mono text-slate-400">
              <div className="text-slate-300 font-bold flex items-center gap-1">
                <FileText size={12} className="text-cyan-400" />
                <span>Audit Trail Record:</span>
              </div>
              <div className="text-cyan-200 select-all">
                Run ID: {simulationResult.test_run_id} | Target: {simulationResult.domain_name} ({simulationResult.target_type.toUpperCase()}) | Passed: {simulationResult.tests_passed} of {simulationResult.tests_total} | Enforcement: {simulationResult.enforcement_mode.toUpperCase()} | Timestamp: {simulationResult.timestamp}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
