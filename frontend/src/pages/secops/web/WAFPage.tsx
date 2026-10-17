/**
 * Security Operations → Web Security → WAF
 * Web Application Firewall operational interface integrated directly into FANOS AI SOC.
 */
import { useState, useEffect } from 'react';
import {
  Globe,
  Sliders,
  FileCode,
  ListFilter,
  FileText,
  RefreshCw,
  Activity,
  Flame,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import PageShell from '@/components/ui/PageShell';
import { getWafStats, getWafDomains, ensureWafAuth, updateWafDomain, updateWafSettings } from '@/services/wafApi';
import { StatsSummary, Domain } from '@/types/waf';
import { DEFAULT_WAF_STATS, DEFAULT_WAF_DOMAINS } from './waf/wafDefaults';
import { WAFOverviewTab } from './waf/WAFOverviewTab';
import { WAFLiveInspectTab } from './waf/WAFLiveInspectTab';
import { WAFEventsTab } from './waf/WAFEventsTab';
import { WAFRulesTab } from './waf/WAFRulesTab';
import { WAFPoliciesTab } from './waf/WAFPoliciesTab';
import { WAFReportsTab } from './waf/WAFReportsTab';
import { WAFTestConsoleTab } from './waf/WAFTestConsoleTab';
import { WAFDomainSelector } from './waf/WAFDomainSelector';

const TABS = [
  { id: 'Overview', label: 'Overview', icon: <Activity size={12} /> },
  { id: 'Live Inspect', label: 'Live Inspect', icon: <FileCode size={12} /> },
  { id: 'Events', label: 'Security Events', icon: <Globe size={12} /> },
  { id: 'Rules', label: 'Rules & Detectors', icon: <ListFilter size={12} /> },
  { id: 'Policies', label: 'Policies & Limits', icon: <Sliders size={12} /> },
  { id: 'Test Console', label: 'Security Test Console', icon: <Flame size={12} /> },
  { id: 'Reports', label: 'Reports', icon: <FileText size={12} /> },
] as const;

type TabId = typeof TABS[number]['id'];

export default function WAFPage() {
  const [tab, setTab] = useState<TabId>('Overview');
  const [stats, setStats] = useState<StatsSummary>(DEFAULT_WAF_STATS);
  const [loading, setLoading] = useState(false);
  const [domains, setDomains] = useState<Domain[]>(DEFAULT_WAF_DOMAINS);
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [domainsError, setDomainsError] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);

  // Modal triggers for external action buttons (such as in Overview tab)
  const [isProtectModalOpen, setIsProtectModalOpen] = useState(false);
  const [externalManageDomain, setExternalManageDomain] = useState<Domain | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      await ensureWafAuth();
      const data = await getWafStats();
      if (data && data.total_inspected !== undefined) {
        setStats(data);
        setIsLiveConnected(true);
      }
    } catch (err) {
      console.warn('WAF live stats sync notice: retaining operational telemetry cache', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDomains = async () => {
    setDomainsLoading(true);
    try {
      await ensureWafAuth();
      const doms = await getWafDomains();
      if (doms && Array.isArray(doms) && doms.length > 0) {
        // Filter out unwanted default test domains if they somehow exist
        const cleaned = doms.filter((d) => d.domain_name === 'fanos-sec.vercel.app' || !['juiceshop.lab.test', 'test-portal.example.com', 'attacker-proxy.com', 'demo-app.local', '127.0.0.1', 'localhost'].includes(d.domain_name));
        setDomains(cleaned.length > 0 ? cleaned : doms);
        setDomainsError(null);
        setIsLiveConnected(true);
      }
    } catch (err: any) {
      console.warn('WAF domains sync notice: retaining fleet cache', err);
      if (domains.length === 0) {
        setDomainsError(err?.response?.data?.detail || err?.message || 'Failed to load domains');
      }
    } finally {
      setDomainsLoading(false);
    }
  };

  const handleDomainModeChange = async (domainId: string, newMode: 'monitor' | 'block' | 'hybrid') => {
    // Optimistically update fleet in UI
    setDomains((prev) =>
      prev.map((d) => (d.id === domainId ? { ...d, enforcement_mode: newMode } : d))
    );
    try {
      await updateWafDomain(domainId, { enforcement_mode: newMode });
      fetchDomains();
      fetchStats();
    } catch (err) {
      console.error('Failed to change domain mode', err);
      fetchDomains();
    }
  };

  const handleModeShift = async (newMode: 'monitor' | 'block' | 'hybrid') => {
    if (selectedDomainId && selectedDomainId !== 'all') {
      await handleDomainModeChange(selectedDomainId, newMode);
    } else {
      setDomains((prev) => prev.map((d) => ({ ...d, enforcement_mode: newMode })));
      setStats((prev) => ({ ...prev, current_mode: newMode }));
      try {
        await updateWafSettings({ waf_mode: newMode });
        for (const d of domains) {
          try {
            await updateWafDomain(d.id, { enforcement_mode: newMode });
          } catch {}
        }
        fetchDomains();
        fetchStats();
      } catch (err) {
        console.error('Failed to shift global mode', err);
        fetchDomains();
        fetchStats();
      }
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDomains();
    const interval = setInterval(() => {
      fetchStats();
      fetchDomains();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const selectedDomain = domains.find((d) => d.id === selectedDomainId);
  const currentEffectiveMode = (
    selectedDomain?.enforcement_mode || stats?.current_mode || 'block'
  ).toLowerCase();
  const isBlock = currentEffectiveMode === 'block';
  const isHybrid = currentEffectiveMode === 'hybrid' || currentEffectiveMode === 'both';

  return (
    <PageShell
      title="WAF — Web Application Firewall"
      subtitle="Deterministic Web Security Engine — real-time inspection, multi-vector threat prevention & rule operations"
      badge={{
        label: isBlock
          ? 'BLOCKING ENFORCED'
          : isHybrid
          ? 'HYBRID DEFENSE (BOTH)'
          : 'MONITOR MODE',
        color: isBlock ? 'green' : isHybrid ? 'blue' : 'orange',
      }}
      actions={
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Shift Mode Top Button Group (BLOCK / HYBRID / MONITOR) */}
          <div
            className="flex items-center p-0.5 rounded-lg border shadow-sm"
            style={{
              background: 'rgba(8,14,26,0.95)',
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <span className="text-[10px] font-mono font-bold text-slate-400 px-2 select-none hidden md:inline">
              MODE:
            </span>
            <button
              onClick={() => handleModeShift('block')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                isBlock
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40 ring-1 ring-rose-300'
                  : 'text-slate-400 hover:text-rose-300 hover:bg-rose-500/10'
              }`}
              title="Block Mode: Drops threats at the edge with HTTP 403"
            >
              <ShieldAlert size={12} className={isBlock ? 'text-white' : 'text-rose-400'} />
              <span>BLOCK</span>
            </button>
            <button
              onClick={() => handleModeShift('hybrid')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                isHybrid
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40 ring-1 ring-cyan-200'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'
              }`}
              title="Hybrid Defense: Drops high-risk threats, audits low-risk anomalies"
            >
              <Zap size={12} className={isHybrid ? 'text-slate-950' : 'text-cyan-400'} />
              <span>HYBRID</span>
            </button>
            <button
              onClick={() => handleModeShift('monitor')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                !isBlock && !isHybrid
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/40 ring-1 ring-amber-200'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
              title="Monitor Mode: Passive audit without dropping requests"
            >
              <ShieldCheck size={12} className={!isBlock && !isHybrid ? 'text-slate-950' : 'text-amber-400'} />
              <span>MONITOR</span>
            </button>
          </div>

          {/* Live Engine Connectivity Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border"
            style={{
              background: 'rgba(8,14,26,0.85)',
              borderColor: isLiveConnected ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)',
              color: isLiveConnected ? '#34d399' : '#fbbf24',
            }}
            title="WAF Ingress Daemon on 127.0.0.1:8001 / 8002"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold tracking-tight">
              {isLiveConnected ? 'LIVE (8001)' : 'SYNCING'}
            </span>
          </div>

          <WAFDomainSelector
            selectedDomainId={selectedDomainId}
            onSelectDomain={(id) => setSelectedDomainId(id)}
            domains={domains}
            loading={domainsLoading}
            error={domainsError}
            onRefresh={fetchDomains}
            onDomainAdded={(newDom) => {
              setSelectedDomainId(newDom.id);
              fetchDomains();
            }}
            isExternalModalOpen={isProtectModalOpen}
            setIsExternalModalOpen={setIsProtectModalOpen}
            externalManageDomain={externalManageDomain}
            setExternalManageDomain={setExternalManageDomain}
          />

          <button
            onClick={() => {
              fetchStats();
              fetchDomains();
            }}
            disabled={loading || domainsLoading}
            className="fanos-btn px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5"
            title="Refresh engine state & fleet"
          >
            <RefreshCw size={12} className={loading || domainsLoading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      }
    >
      {/* Real-time Ingress Threat Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            INLINE PROXY ACTIVE
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Gateway: <strong className="text-cyan-400">127.0.0.1:8002</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Target Website: <strong className="text-emerald-400">{selectedDomain ? selectedDomain.domain_name : 'fanos-sec.vercel.app'}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Core: <strong className="text-white">Deterministic v1.0</strong>
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span className="text-slate-400">
            Total Inspected: <strong className="text-cyan-400">{stats?.total_inspected?.toLocaleString() ?? '0'}</strong>
          </span>
          <span className="text-slate-400">
            Blocked: <strong className="text-rose-400">{stats?.total_blocked?.toLocaleString() ?? '0'}</strong>
          </span>
          <span className="text-slate-400">
            Allowed: <strong className="text-emerald-400">{stats?.total_allowed?.toLocaleString() ?? '0'}</strong>
          </span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg w-fit overflow-x-auto max-w-full"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {TABS.map((t) => {
          const isEventsTab = t.id === 'Events';
          const blockedCount = stats?.total_blocked ?? 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer"
              style={{
                background: tab === t.id ? 'rgba(0,200,255,0.15)' : 'transparent',
                color: tab === t.id ? '#00c8ff' : '#94A3B8',
                border: tab === t.id ? '1px solid rgba(0,200,255,0.3)' : '1px solid transparent',
              }}
            >
              <span style={{ color: tab === t.id ? '#00c8ff' : '#64748B' }}>{t.icon}</span>
              <span>{t.label}</span>
              {isEventsTab && blockedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  {blockedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-2">
        {tab === 'Overview' && (
          <WAFOverviewTab
            stats={stats}
            domains={domains}
            selectedDomainId={selectedDomainId}
            selectedDomain={selectedDomain}
            onSelectDomain={(id) => setSelectedDomainId(id)}
            onNavigateTab={(targetTab: any) => setTab(targetTab)}
            onOpenProtectModal={() => setIsProtectModalOpen(true)}
            onManageDomain={(domain) => setExternalManageDomain(domain)}
            onDomainModeChange={handleDomainModeChange}
            onGlobalModeChange={handleModeShift}
            isLiveConnected={isLiveConnected}
          />
        )}
        {tab === 'Live Inspect' && <WAFLiveInspectTab />}
        {tab === 'Events' && (
          <WAFEventsTab
            selectedDomainId={selectedDomainId}
            selectedDomain={selectedDomain}
          />
        )}
        {tab === 'Rules' && <WAFRulesTab />}
        {tab === 'Policies' && (
          <WAFPoliciesTab
            selectedDomainId={selectedDomainId}
            selectedDomain={selectedDomain}
            onDomainUpdated={fetchDomains}
          />
        )}
        {tab === 'Test Console' && (
          <WAFTestConsoleTab
            selectedDomainId={selectedDomainId}
            selectedDomain={selectedDomain}
            domains={domains}
            onSelectDomain={(id) => {
              setSelectedDomainId(id);
            }}
          />
        )}
        {tab === 'Reports' && <WAFReportsTab />}
      </div>
    </PageShell>
  );
}
