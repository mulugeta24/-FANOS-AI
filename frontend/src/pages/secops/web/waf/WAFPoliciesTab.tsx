import { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldAlert,
  AlertTriangle,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  Globe,
  Radio,
  ShieldCheck,
  Activity,
  Zap,
  Lock,
  FlaskConical,
  RefreshCw,
} from 'lucide-react';
import { getWafSettings, updateWafSettings, updateWafDomain, runDomainTrafficTest } from '@/services/wafApi';
import { WAFSettings, Domain, TrafficTestResponse } from '@/types/waf';

interface WAFPoliciesTabProps {
  selectedDomainId?: string;
  selectedDomain?: Domain;
  onDomainUpdated?: () => void;
}

export const WAFPoliciesTab: React.FC<WAFPoliciesTabProps> = ({
  selectedDomainId,
  selectedDomain,
  onDomainUpdated,
}) => {
  const [settings, setSettings] = useState<WAFSettings>({
    waf_mode: 'monitor',
    block_threshold: 70,
    monitor_threshold: 30,
    max_body_size_bytes: 1048576,
    max_uri_length: 2048,
    allowlist_ips: ['127.0.0.1'],
    monitored_paths: ['/api/*'],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allowlistInput, setAllowlistInput] = useState('127.0.0.1, 10.0.0.0/24');
  const [monitoredPathsInput, setMonitoredPathsInput] = useState('/api/*, /login, /admin');

  // Traffic test state
  const [testingTraffic, setTestingTraffic] = useState(false);
  const [trafficTestResult, setTrafficTestResult] = useState<TrafficTestResponse | null>(null);
  const [trafficTestError, setTrafficTestError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getWafSettings();
      if (data) {
        setSettings(data);
        if (data.allowlist_ips) setAllowlistInput(data.allowlist_ips.join(', '));
        if (data.monitored_paths) setMonitoredPathsInput(data.monitored_paths.join(', '));
      }
    } catch (err) {
      console.error('Failed to load WAF settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    setTrafficTestResult(null);
    setTrafficTestError(null);
  }, [selectedDomainId]);

  const handleToggleDomainMode = async (targetMode: 'monitor' | 'block' | 'hybrid') => {
    if (!selectedDomain) return;
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateWafDomain(selectedDomain.id, { enforcement_mode: targetMode });
      setSuccessMessage(`Target ${selectedDomain.domain_name} enforcement mode set to ${targetMode.toUpperCase()}${targetMode === 'hybrid' ? ' (BOTH)' : ''}`);
      if (onDomainUpdated) onDomainUpdated();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || err?.message || 'Failed to update domain policy');
    } finally {
      setSaving(false);
    }
  };

  const handleRunTrafficTest = async () => {
    if (!selectedDomain) return;
    setTestingTraffic(true);
    setTrafficTestResult(null);
    setTrafficTestError(null);
    try {
      const res = await runDomainTrafficTest(selectedDomain.id);
      setTrafficTestResult(res);
      if (onDomainUpdated) onDomainUpdated();
    } catch (err: any) {
      setTrafficTestError(err?.response?.data?.detail || err?.message || 'Traffic test execution failed');
    } finally {
      setTestingTraffic(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const allowlist = allowlistInput
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);

    const paths = monitoredPathsInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    try {
      await updateWafSettings({
        waf_mode: settings.waf_mode,
        block_threshold: Number(settings.block_threshold),
        monitor_threshold: Number(settings.monitor_threshold),
        max_body_size_bytes: Number(settings.max_body_size_bytes),
        max_uri_length: Number(settings.max_uri_length),
        allowlist_ips: allowlist,
        monitored_paths: paths,
      });
      setSuccessMessage('WAF enforcement policies and engine parameters updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || err?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-xs text-fanos-dim font-mono gap-2">
        <Clock className="w-5 h-5 animate-spin text-cyan-400" />
        Loading WAF policy configuration...
      </div>
    );
  }

  // 6-stage lifecycle evaluation
  const stages = selectedDomain?.protection_stages || {
    domain_registered: !!selectedDomain,
    ownership_verified: selectedDomain?.verification_status === 'verified',
    tls_ready: selectedDomain?.tls_status === 'valid',
    proxy_route_configured: selectedDomain?.proxy_status === 'configured',
    traffic_verified: !!selectedDomain?.traffic_verified,
    protection_active: selectedDomain?.protection_status === 'PROTECTION_ACTIVE',
  };

  return (
    <div className="space-y-5 w-full">
      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Domain Policy Scope Card */}
      {selectedDomain ? (
        <div className="space-y-4">
          {/* Target Header Card */}
          <div className="fanos-card p-4 space-y-3" style={{ border: '1px solid rgba(0,200,255,0.3)', background: 'rgba(0,200,255,0.03)' }}>
            <div className="text-[11px] font-bold text-white flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Target: <span className="font-mono text-cyan-300 font-bold">{selectedDomain.domain_name}</span></span>
                {selectedDomain.target_type === 'demo_lab' ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <FlaskConical size={10} />
                    DEMO LAB
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Lock size={10} />
                    PRODUCTION
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-800 text-slate-300">
                  {selectedDomain.environment}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-slate-400">Upstream Origin:</span>
                <span className="text-slate-200">{selectedDomain.origin_url}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <div className="text-xs font-semibold text-white">Domain Enforcement Mode</div>
                <p className="text-[10px] text-fanos-dim mt-0.5">
                  Controls whether threats targeting this specific domain are dropped in real-time or monitored.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleDomainMode('monitor')}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    selectedDomain.enforcement_mode === 'monitor'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-white/[0.02] text-slate-400 border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <Radio size={12} />
                  MONITOR
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDomainMode('hybrid')}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    selectedDomain.enforcement_mode === 'hybrid' || selectedDomain.enforcement_mode === 'both'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-white/[0.02] text-slate-400 border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <Zap size={12} />
                  BOTH (HYBRID)
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDomainMode('block')}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    selectedDomain.enforcement_mode === 'block'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-white/[0.02] text-slate-400 border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <ShieldAlert size={12} />
                  BLOCK
                </button>
              </div>
            </div>
          </div>

          {/* Honest 6-Stage Protection Lifecycle Card */}
          <div className="fanos-card p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Universal Protection Lifecycle (6 Stages)</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                stages.protection_active
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {stages.protection_active ? 'STATUS: PROTECTION ACTIVE' : 'STATUS: PENDING VERIFICATION'}
              </span>
            </div>

            <p className="text-[11px] text-fanos-dim">
              FANOS WAF strictly enforces an honest protection model: a domain is never declared <strong className="text-white">PROTECTION ACTIVE</strong> until DNS ownership, TLS certificates, proxy routing, and real end-to-end traffic probes have all succeeded.
            </p>

            {/* 6-Stage Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
              {/* Stage 1: Registered */}
              <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                stages.domain_registered
                  ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-bold text-white">1. DOMAIN REGISTERED</div>
                  <div className="text-[9px] text-slate-400">Assigned tenant & environment</div>
                </div>
              </div>

              {/* Stage 2: Ownership */}
              <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                stages.ownership_verified
                  ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/[0.06] border-amber-500/30 text-amber-300'
              }`}>
                {stages.ownership_verified ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-[11px] font-bold text-white">2. OWNERSHIP VERIFIED</div>
                  <div className="text-[9px] text-slate-400">
                    {stages.ownership_verified ? 'DNS TXT challenge verified' : 'Awaiting DNS TXT check'}
                  </div>
                </div>
              </div>

              {/* Stage 3: TLS Ready */}
              <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                stages.tls_ready
                  ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-300'
                  : 'bg-indigo-500/[0.06] border-indigo-500/30 text-indigo-300'
              }`}>
                {stages.tls_ready ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Clock size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-[11px] font-bold text-white">3. TLS READY</div>
                  <div className="text-[9px] text-slate-400">
                    {stages.tls_ready ? 'Valid TLS certificate' : 'Self-signed / Lab TLS active'}
                  </div>
                </div>
              </div>

              {/* Stage 4: Proxy Configured */}
              <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                stages.proxy_route_configured
                  ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-300'
                  : 'bg-blue-500/[0.06] border-blue-500/30 text-blue-300'
              }`}>
                {stages.proxy_route_configured ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Clock size={16} className="text-blue-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-[11px] font-bold text-white">4. PROXY CONFIGURED</div>
                  <div className="text-[9px] text-slate-400">
                    {stages.proxy_route_configured ? 'Host route bound to reverse proxy' : 'Pending router binding'}
                  </div>
                </div>
              </div>

              {/* Stage 5: Traffic Verified */}
              <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                stages.traffic_verified
                  ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/[0.06] border-amber-500/30 text-amber-300'
              }`}>
                {stages.traffic_verified ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-[11px] font-bold text-white">5. TRAFFIC VERIFIED</div>
                  <div className="text-[9px] text-slate-400">
                    {stages.traffic_verified ? 'Live proxy-to-origin probe passed' : 'Awaiting live traffic test'}
                  </div>
                </div>
              </div>

              {/* Stage 6: Protection Active */}
              <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                stages.protection_active
                  ? 'bg-emerald-500/[0.12] border-emerald-500/50 text-emerald-200 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                {stages.protection_active ? (
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={16} className="text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-[11px] font-bold text-white">6. PROTECTION ACTIVE</div>
                  <div className="text-[9px] text-slate-400">
                    {stages.protection_active ? 'Active inline defense armed' : 'Gated until stages 1-5 pass'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive End-to-End Traffic Verification Test */}
          <div className="fanos-card p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">End-to-End Traffic Verification Test</span>
              </div>
              <button
                type="button"
                onClick={handleRunTrafficTest}
                disabled={testingTraffic}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-cyan-500/20"
              >
                {testingTraffic ? <RefreshCw size={12} className="animate-spin" /> : <Activity size={12} />}
                <span>Run Traffic Probe Now</span>
              </button>
            </div>

            <p className="text-[11px] text-fanos-dim">
              Executes a non-destructive HTTP test probe through the FANOS WAF reverse proxy pipeline to the configured upstream origin (<span className="font-mono text-slate-300">{selectedDomain.origin_url}</span>) to verify socket connectivity, latency, and response headers.
            </p>

            {trafficTestError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{trafficTestError}</span>
              </div>
            )}

            {trafficTestResult && (
              <div className="p-3.5 rounded-lg bg-slate-950 border border-cyan-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {trafficTestResult.success ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <XCircle size={16} className="text-rose-400" />
                    )}
                    <span className="font-bold text-white">
                      {trafficTestResult.success ? 'Traffic Path Verified Successfully' : 'Traffic Probe Encountered Failure'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-cyan-300">
                    Latency: {trafficTestResult.latency_ms} ms
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono pt-1">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[9px]">ORIGIN REACHABLE</div>
                    <div className={trafficTestResult.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {trafficTestResult.success ? 'YES' : 'NO'}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[9px]">ORIGIN STATUS</div>
                    <div className="text-cyan-300 font-bold">
                      HTTP {trafficTestResult.status_code || 'N/A'}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[9px]">PROXY ROUTED</div>
                    <div className={trafficTestResult.protection_stages?.proxy_route_configured ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {trafficTestResult.protection_stages?.proxy_route_configured ? 'CONFIGURED' : 'PENDING'}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[9px]">PROTECTION STATUS</div>
                    <div className="text-emerald-400 font-bold truncate" title={trafficTestResult.protection_status}>
                      {trafficTestResult.protection_status}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800">
                  {trafficTestResult.message}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Scope: <strong className="text-white">All Protected Domains</strong> — configuring global engine defaults and baseline limits.</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400">Global Engine Policy</span>
        </div>
      )}

      {/* Global WAF Engine Policy Form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Enforcement Mode Card */}
        <div className="fanos-card p-4 space-y-3">
          <div className="text-[11px] font-bold text-white flex items-center gap-1.5 border-b border-white/[0.06] pb-2.5">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            Global WAF Engine Operating Mode
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                settings.waf_mode === 'monitor'
                  ? 'bg-amber-500/[0.08] border-amber-500/40 text-white'
                  : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="waf_mode"
                  value="monitor"
                  checked={settings.waf_mode === 'monitor'}
                  onChange={() => setSettings({ ...settings, waf_mode: 'monitor' })}
                  className="accent-amber-400"
                />
                <span className="font-bold text-xs text-amber-300">Monitor-Only Mode</span>
              </div>
              <p className="text-[10px] text-fanos-dim mt-1.5 ml-6">
                Requests are analyzed, logged, and scored. No traffic is actively dropped. Ideal for baseline tuning.
              </p>
            </label>

            <label
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                settings.waf_mode === 'block'
                  ? 'bg-rose-500/[0.08] border-rose-500/40 text-white'
                  : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="waf_mode"
                  value="block"
                  checked={settings.waf_mode === 'block'}
                  onChange={() => setSettings({ ...settings, waf_mode: 'block' })}
                  className="accent-rose-500"
                />
                <span className="font-bold text-xs text-rose-400">Active Enforcement (Block) Mode</span>
              </div>
              <p className="text-[10px] text-fanos-dim mt-1.5 ml-6">
                Real-time protection. Requests exceeding the risk threshold are dropped immediately with HTTP 403 Forbidden.
              </p>
            </label>
          </div>
        </div>

        {/* Thresholds Card */}
        <div className="fanos-card p-4 space-y-4">
          <div className="text-[11px] font-bold text-white flex items-center gap-1.5 border-b border-white/[0.06] pb-2.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Risk Scoring Thresholds
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-300">Block Risk Threshold</span>
                <span className="font-mono font-bold text-rose-400">{settings.block_threshold} / 100</span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                value={settings.block_threshold}
                onChange={(e) => setSettings({ ...settings, block_threshold: Number(e.target.value) })}
                className="w-full accent-rose-500 h-1.5 bg-black/40 rounded-lg cursor-pointer"
              />
              <p className="text-[9px] text-fanos-dim mt-1">
                Requests with an anomaly risk score equal or above this value will be blocked.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-300">Monitor Risk Threshold</span>
                <span className="font-mono font-bold text-amber-400">{settings.monitor_threshold} / 100</span>
              </div>
              <input
                type="range"
                min="10"
                max="70"
                value={settings.monitor_threshold}
                onChange={(e) => setSettings({ ...settings, monitor_threshold: Number(e.target.value) })}
                className="w-full accent-amber-400 h-1.5 bg-black/40 rounded-lg cursor-pointer"
              />
              <p className="text-[9px] text-fanos-dim mt-1">
                Requests above this threshold are logged as suspicious events with anomaly alerts.
              </p>
            </div>
          </div>
        </div>

        {/* Traffic Limits */}
        <div className="fanos-card p-4 space-y-3.5">
          <div className="text-[11px] font-bold text-white flex items-center gap-1.5 border-b border-white/[0.06] pb-2.5">
            <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
            Traffic & Payload Limits
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-fanos-dim uppercase mb-1">
                Max Request Body Size (Bytes)
              </label>
              <input
                type="number"
                value={settings.max_body_size_bytes}
                onChange={(e) => setSettings({ ...settings, max_body_size_bytes: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[9px] text-fanos-dim mt-1">Default 1,048,576 bytes (1 MB)</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-fanos-dim uppercase mb-1">
                Max URI Length (Characters)
              </label>
              <input
                type="number"
                value={settings.max_uri_length}
                onChange={(e) => setSettings({ ...settings, max_uri_length: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[9px] text-fanos-dim mt-1">Default 2,048 characters</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-fanos-dim uppercase mb-1">
              IP Allowlist (Comma separated CIDRs / IPs)
            </label>
            <input
              type="text"
              value={allowlistInput}
              onChange={(e) => setAllowlistInput(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-fanos-dim uppercase mb-1">
              Protected URI Paths
            </label>
            <input
              type="text"
              value={monitoredPathsInput}
              onChange={(e) => setMonitoredPathsInput(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="fanos-btn px-5 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            {saving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving Changes...' : 'Save Policy Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
