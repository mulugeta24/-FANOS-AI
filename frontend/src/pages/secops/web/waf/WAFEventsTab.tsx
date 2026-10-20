import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Download,
  RefreshCw,
  Globe,
  Volume2,
  VolumeX,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { getWafEvents, downloadWafEventsCsv } from '@/services/wafApi';
import { WAFSecurityEvent, Domain } from '@/types/waf';
import { WAFDetailModal } from './WAFDetailModal';

// Audio chime for high-severity live alerts
const playCyberAlertChime = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(780, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(392, ctx.currentTime + 0.28);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
};

interface WAFEventsTabProps {
  selectedDomainId?: string;
  selectedDomain?: Domain;
}

export const WAFEventsTab: React.FC<WAFEventsTabProps> = ({
  selectedDomainId,
  selectedDomain,
}) => {
  const [events, setEvents] = useState<WAFSecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [decisionFilter, setDecisionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<WAFSecurityEvent | null>(null);
  const [exporting, setExporting] = useState(false);

  // Live real-time ingestion stream state
  const [liveStream, setLiveStream] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [latestAlert, setLatestAlert] = useState<WAFSecurityEvent | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  const fetchEvents = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getWafEvents({
        page,
        limit: 15,
        decision: decisionFilter || undefined,
        domain_id: selectedDomainId === 'all' ? undefined : selectedDomainId,
        search: search.trim() || undefined,
      });

      const fetchedList = data.events || [];
      if (fetchedList.length > 0) {
        const top = fetchedList[0];
        // Only trigger live alert banner if a NEW attack event arrives while the operator is actively watching
        if (lastEventIdRef.current && top.id !== lastEventIdRef.current) {
          if (top.risk_score >= 30 || top.decision === 'BLOCK') {
            setLatestAlert(top);
            if (soundEnabled) {
              playCyberAlertChime();
            }
          }
        }
        lastEventIdRef.current = top.id;
      }

      setEvents(fetchedList);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      console.error('Failed to load WAF security events', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(false);
  }, [page, decisionFilter, selectedDomainId]);

  // Live Polling every 3.5 seconds
  useEffect(() => {
    if (!liveStream) return;
    const timer = setInterval(() => {
      fetchEvents(true);
    }, 3500);
    return () => clearInterval(timer);
  }, [liveStream, page, decisionFilter, selectedDomainId, search, soundEnabled]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadWafEventsCsv();
    } catch (err) {
      console.error('CSV Export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision?.toUpperCase()) {
      case 'BLOCK':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-2.5 h-2.5" />
            BLOCK
          </span>
        );
      case 'MONITOR':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-2.5 h-2.5" />
            MONITOR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-2.5 h-2.5" />
            ALLOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-fanos-dim absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events by client IP, URI path, rule ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </form>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-fanos-dim" />
            <select
              value={decisionFilter}
              onChange={(e) => {
                setDecisionFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">All Decisions</option>
              <option value="BLOCK">Block Only</option>
              <option value="MONITOR">Monitor Only</option>
              <option value="ALLOW">Allow Only</option>
            </select>
          </div>

          <button
            onClick={() => setLiveStream(!liveStream)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              liveStream
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white'
            }`}
            title={liveStream ? 'Live capture active (polling every 3.5s)' : 'Live capture paused'}
          >
            <span className={`w-2 h-2 rounded-full ${liveStream ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="hidden sm:inline">{liveStream ? 'LIVE CAPTURE ACTIVE' : 'LIVE PAUSED'}</span>
          </button>

          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playCyberAlertChime();
            }}
            className={`p-1.5 rounded-lg text-xs border transition-colors ${
              soundEnabled
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white'
            }`}
            title={soundEnabled ? 'Live threat chime alert: ON' : 'Live threat chime alert: OFF'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => fetchEvents(false)}
            disabled={loading}
            className="fanos-btn px-2.5 py-1.5 text-xs"
            title="Refresh events"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Threat Ingress Alert Banner */}
      {latestAlert && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-950 border border-rose-500/50 shadow-lg shadow-rose-950/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  🚨 Live Attack Intercepted
                </span>
                <span className="text-xs font-bold text-white font-mono">{latestAlert.client_ip}</span>
                <span className="text-slate-400 text-xs">→</span>
                <span className="text-xs font-mono text-cyan-300 font-semibold truncate max-w-xs">{latestAlert.path}</span>
              </div>
              <div className="text-[11px] text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                <span>Decision: <strong className={latestAlert.decision === 'BLOCK' ? 'text-rose-400' : 'text-amber-400'}>{latestAlert.decision}</strong> (HTTP {latestAlert.http_status || (latestAlert.decision === 'BLOCK' ? 403 : 200)})</span>
                <span className="text-slate-600">•</span>
                <span>Risk Score: <strong className="text-rose-400 font-mono">{latestAlert.risk_score}/100</strong></span>
                <span className="text-slate-600">•</span>
                <span>Rule: <code className="text-slate-200">{latestAlert.findings?.[0]?.rule_id || latestAlert.action || 'Deterministic Signature'}</code></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedEvent(latestAlert)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors flex items-center gap-1"
            >
              <span>Inspect</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setLatestAlert(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Domain Scope Badge */}
      {selectedDomain ? (
        <div
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(0,200,255,0.05)', border: '1px solid rgba(0,200,255,0.2)' }}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-300">
              Filtered to Protected Website: <strong className="text-white font-mono">{selectedDomain.domain_name}</strong>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-800 text-slate-300">
              {selectedDomain.environment}
            </span>
          </div>
          <span className="text-[10px] text-fanos-dim font-mono">
            Origin: {selectedDomain.origin_url}
          </span>
        </div>
      ) : (
        <div
          className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2 text-slate-400">
            <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Viewing events across <strong>All Protected Domains</strong>.</span>
          </div>
          <span className="text-[10px] text-fanos-dim font-mono">Unfiltered Scope</span>
        </div>
      )}

      {/* Events Table Card */}
      <div className="fanos-card overflow-hidden">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title">
            <Layers size={13} className="text-cyan-400" />
            Real-time WAF Security Event Log
          </div>
          <span className="text-[10px] text-fanos-dim font-mono">
            {total.toLocaleString()} total logged events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/20 border-b border-white/[0.06]">
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Timestamp</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Request ID</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Host</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Client IP</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Method & Path</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Decision</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">HTTP</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Risk Score</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Findings</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Latency</th>
                <th className="px-3 py-2.5 text-right text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-xs text-fanos-dim font-mono">
                    <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    Querying WAF event stream...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-xs text-fanos-dim font-mono">
                    No security events found matching criteria.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-dim whitespace-nowrap">
                      {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-cyan-400 font-semibold whitespace-nowrap">
                      {e.request_id || '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-cyan-300 font-semibold whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{e.hostname || '—'}</span>
                        {e.is_test && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            TEST
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-300 whitespace-nowrap">
                      {e.client_ip}
                    </td>
                    <td className="px-3 py-2.5 max-w-xs truncate">
                      <span className="font-mono text-[10px] font-bold text-cyan-400 mr-1.5">{e.method}</span>
                      <span className="font-mono text-[10px] text-white">{e.path}</span>
                    </td>
                    <td className="px-3 py-2.5">{getDecisionBadge(e.decision)}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] font-bold whitespace-nowrap">
                      <span className={(e.http_status || 200) >= 400 ? 'text-rose-400' : 'text-emerald-400'}>
                        {e.http_status || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] font-bold">
                      <span
                        style={{
                          color:
                            e.risk_score >= 70
                              ? '#ef4444'
                              : e.risk_score >= 30
                              ? '#f59e0b'
                              : '#00e5a0',
                        }}
                      >
                        {e.risk_score}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {e.findings_count > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {e.findings_count} finding{e.findings_count > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] text-fanos-dim font-mono">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-dim">
                      {e.processing_time_ms}ms
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setSelectedEvent(e)}
                        className="px-2 py-1 rounded text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-fanos-dim">
          <div>
            Showing Page <span className="font-mono font-bold text-white">{page}</span> of{' '}
            <span className="font-mono font-bold text-white">{pages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || loading}
              className="p-1 rounded border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, pages))}
              disabled={page >= pages || loading}
              className="p-1 rounded border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      <WAFDetailModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={`WAF Event Inspection — ${selectedEvent?.request_id || ''}`}
      >
        {selectedEvent && (
          <div className="space-y-4 text-xs">
            {/* Meta header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-black/40 border border-white/10">
              <div>
                <span className="text-[9px] font-bold text-fanos-dim uppercase">Client IP</span>
                <p className="font-mono text-white mt-0.5">{selectedEvent.client_ip}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-fanos-dim uppercase">Decision</span>
                <div className="mt-0.5">{getDecisionBadge(selectedEvent.decision)}</div>
              </div>
              <div>
                <span className="text-[9px] font-bold text-fanos-dim uppercase">Risk Score</span>
                <p className="font-mono text-white mt-0.5 font-bold text-sm">
                  {selectedEvent.risk_score} / 100
                </p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-fanos-dim uppercase">Latency</span>
                <p className="font-mono text-cyan-400 mt-0.5">{selectedEvent.processing_time_ms} ms</p>
              </div>
            </div>

            {/* Path */}
            <div>
              <span className="text-[10px] font-bold text-fanos-dim uppercase">Target Request</span>
              <div className="p-2.5 mt-1 rounded bg-black/50 border border-white/10 font-mono text-xs text-white break-all">
                <span className="font-bold text-cyan-400 mr-2">{selectedEvent.method}</span>
                {selectedEvent.path}
              </div>
            </div>

            {/* Matched Findings */}
            <div>
              <span className="text-[10px] font-bold text-fanos-dim uppercase">
                Triggered Detector Findings ({selectedEvent.findings?.length || 0})
              </span>
              <div className="mt-1 space-y-2 max-h-48 overflow-y-auto">
                {selectedEvent.findings?.map((f, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-rose-500/[0.08] border border-rose-500/25 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-300">{f.rule_id}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        {f.severity}
                      </span>
                    </div>
                    <div className="text-white font-semibold">{f.rule_name}</div>
                    <div className="text-fanos-dim text-[11px]">{f.description}</div>
                    {f.matched_value && (
                      <div className="pt-1 mt-1 border-t border-rose-500/10 font-mono text-[10px] text-rose-400 break-all">
                        Matched: <span className="bg-rose-950/70 px-1 py-0.5 rounded">{f.matched_value}</span> ({f.location})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sanitized Body */}
            {selectedEvent.body_sanitized && (
              <div>
                <span className="text-[10px] font-bold text-fanos-dim uppercase">Sanitized Body Payload</span>
                <pre className="p-3 mt-1 rounded bg-black/50 border border-white/10 font-mono text-[10px] text-slate-300 overflow-x-auto">
                  {selectedEvent.body_sanitized}
                </pre>
              </div>
            )}
          </div>
        )}
      </WAFDetailModal>
    </div>
  );
};
