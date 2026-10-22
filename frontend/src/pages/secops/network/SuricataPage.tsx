/**
 * Security Operations -> Network Security -> Suricata
 * Modern, High-Performance SOC IDS/IPS Command Console
 * Live Telemetry, Direct OnLive / Pause Controls, AI Inferences & Diagnostic Logging
 */
import { useState, useMemo, useEffect } from 'react'
import {
  Shield, AlertTriangle, Activity, Search, RefreshCw, Filter,
  Terminal, Copy, Check, X, Code, Play, Pause, Zap, Sparkles,
  Server, Cpu, Wifi, Layers, FileText, CheckCircle2,
  Clock, ArrowUpRight, Flame, ShieldAlert,
} from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import {
  useSuricataEvents,
  useSuricataStats,
  useSuricataControlStatus,
  useStartSuricataEngine,
  usePauseSuricataEngine,
  useSimulateSuricataAttack,
  useSuricataLogs,
  useRefreshAll,
} from '@/hooks/useDashboard'
import { severityClass, statusClass, riskColor } from '@/lib/utils'
import type { SecurityEvent } from '@/types'

const TABS = ['Live Telemetry', 'SOC Attack Analytics', 'Engine Diagnostics', 'Raw EVE JSON'] as const
type Tab = typeof TABS[number]

export default function SuricataPage() {
  const [tab, setTab] = useState<Tab>('Live Telemetry')
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('ALL')
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'SURICATA' | 'ML_FLOW'>('ALL')
  const [protocolFilter, setProtocolFilter] = useState<string>('ALL')
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [copied, setCopied] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [showSimulateMenu, setShowSimulateMenu] = useState(false)
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(3)

  // Data fetching hooks
  const { data: rawEvents = [], isFetching: eventsFetching, refetch: refetchEvents } = useSuricataEvents(
    150,
    24
  )
  const { data: stats } = useSuricataStats(24)
  const {
    data: controlStatus,
    isFetching: controlFetching,
    refetch: refetchControl,
  } = useSuricataControlStatus(autoRefreshSec > 0 ? autoRefreshSec * 1000 : 10000)

  const { data: logData, refetch: refetchLogs } = useSuricataLogs(80, tab === 'Engine Diagnostics')

  // Mutations
  const startEngine = useStartSuricataEngine()
  const pauseEngine = usePauseSuricataEngine()
  const simulateAttack = useSimulateSuricataAttack()
  const refreshAll = useRefreshAll()

  // Auto-dismiss action feedback notice after 4 seconds
  useEffect(() => {
    if (!actionNotice) return
    const timer = setTimeout(() => setActionNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [actionNotice])

  // Determine current operating mode
  const currentMode = controlStatus?.mode || 'OFFLINE'
  const isLive = currentMode === 'LIVE'
  const isPaused = currentMode === 'PAUSED'
  const isOffline = currentMode === 'OFFLINE'

  // Handlers for OnLive and Pause
  const handleOnLive = async () => {
    try {
      setActionNotice('Starting Suricata engine & collector in LIVE streaming mode...')
      const res = await startEngine.mutateAsync()
      setActionNotice(res.message || 'Suricata is now streaming LIVE telemetry!')
      refetchControl()
      refetchEvents()
    } catch (err: any) {
      setActionNotice(`Failed to start: ${err?.message || 'Check backend connection'}`)
    }
  }

  const handlePause = async () => {
    try {
      setActionNotice('Pausing telemetry collector ingestion...')
      const res = await pauseEngine.mutateAsync()
      setActionNotice(res.message || 'Telemetry ingestion paused.')
      refetchControl()
      refetchEvents()
    } catch (err: any) {
      setActionNotice(`Failed to pause: ${err?.message || 'Check backend connection'}`)
    }
  }

  const handleSimulate = async (type: string) => {
    setShowSimulateMenu(false)
    try {
      setActionNotice(`Simulating ${type.toUpperCase()} detection through live pipeline...`)
      const res = await simulateAttack.mutateAsync(type)
      setActionNotice(`Simulated alert ingested: ${res.attack_type || 'Event created'}`)
      refetchEvents()
      refetchControl()
    } catch (err: any) {
      setActionNotice(`Simulation error: ${err?.message || 'Failed'}`)
    }
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    return rawEvents.filter(ev => {
      if (severityFilter !== 'ALL' && ev.severity.toUpperCase() !== severityFilter) {
        return false
      }
      if (sourceFilter === 'SURICATA' && ev.sensor_source === 'suricata-flow') {
        return false
      }
      if (sourceFilter === 'ML_FLOW' && ev.sensor_source !== 'suricata-flow') {
        return false
      }
      if (protocolFilter !== 'ALL') {
        let proto = ''
        try {
          const raw = ev.raw_payload ? JSON.parse(ev.raw_payload) : {}
          proto = (raw.proto || raw.protocol || '').toUpperCase()
        } catch {
          proto = ''
        }
        if (proto && proto !== protocolFilter) return false
      }
      if (search.trim()) {
        const term = search.toLowerCase()
        const matchesTerm =
          ev.source_ip.toLowerCase().includes(term) ||
          ev.target.toLowerCase().includes(term) ||
          ev.attack_type.toLowerCase().includes(term) ||
          (ev.id && String(ev.id).toLowerCase().includes(term))
        if (!matchesTerm) return false
      }
      return true
    })
  }, [rawEvents, severityFilter, sourceFilter, protocolFilter, search])

  // Category statistics
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    rawEvents.forEach(ev => {
      const cat = ev.attack_type || 'Unclassified'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [rawEvents])

  // Protocol statistics
  const protocolCounts = useMemo(() => {
    const counts: Record<string, number> = { TCP: 0, UDP: 0, HTTP: 0, TLS: 0, DNS: 0, OTHER: 0 }
    rawEvents.forEach(ev => {
      try {
        const raw = ev.raw_payload ? JSON.parse(ev.raw_payload) : {}
        const p = (raw.proto || raw.protocol || 'OTHER').toUpperCase()
        if (p in counts) counts[p]++
        else counts.OTHER++
      } catch {
        counts.OTHER++
      }
    })
    return counts
  }, [rawEvents])

  // Helper copy payload
  const handleCopyPayload = (payload: any) => {
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Parse modal payload safely
  const parsedModalPayload = useMemo(() => {
    if (!selectedEvent?.raw_payload) return null
    try {
      return JSON.parse(selectedEvent.raw_payload)
    } catch {
      return selectedEvent.raw_payload
    }
  }, [selectedEvent])

  const totalCount = stats?.total_events ?? rawEvents.length
  const alertCount = stats?.alerts ?? rawEvents.filter(e => e.status === 'ALERT').length
  const criticalCount = stats?.critical ?? rawEvents.filter(e => e.severity === 'CRITICAL').length
  const highCount = stats?.high ?? rawEvents.filter(e => e.severity === 'HIGH').length
  const mlFlowCount = rawEvents.filter(e => e.sensor_source === 'suricata-flow').length

  return (
    <PageShell
      title="Suricata — Network IDS/IPS"
      subtitle="NextGen Enterprise Deep Packet Inspection & AI Anomaly Correlator"
      badge={{
        label: isLive ? 'ON LIVE • STREAMING' : isPaused ? 'PAUSED' : 'OFFLINE',
        color: isLive ? 'green' : isPaused ? 'orange' : 'blue',
      }}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Action Notification Toast */}
          {actionNotice && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-[11px] font-medium shadow-lg animate-fade-in">
              <CheckCircle2 size={12} className="text-cyan-400 flex-shrink-0" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* ── THE TWO CORE BUTTONS: ONLIVE & PAUSE ───────────── */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/10 shadow-inner">
            {/* OnLive Button */}
            <button
              id="suricata-btn-onlive"
              onClick={handleOnLive}
              disabled={startEngine.isPending || isLive}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[11px] font-bold tracking-wide uppercase transition-all duration-200 ${
                isLive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.35)] cursor-default'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400 active:scale-95'
              } ${startEngine.isPending ? 'opacity-70 cursor-wait' : ''}`}
              title="Start or resume Suricata & Collector in live streaming mode without terminal"
            >
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`} />
              <Play size={11} className={isLive ? 'fill-emerald-400' : ''} />
              <span>{isLive ? 'Live Active' : 'OnLive'}</span>
            </button>

            {/* Pause Button */}
            <button
              id="suricata-btn-pause"
              onClick={handlePause}
              disabled={pauseEngine.isPending || isPaused || isOffline}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[11px] font-bold tracking-wide uppercase transition-all duration-200 ${
                isPaused
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.35)] cursor-default'
                  : isOffline
                  ? 'opacity-40 text-gray-500 cursor-not-allowed border border-transparent'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-400 active:scale-95'
              } ${pauseEngine.isPending ? 'opacity-70 cursor-wait' : ''}`}
              title="Pause telemetry stream without closing the backend"
            >
              <Pause size={11} className={isPaused ? 'fill-amber-400' : ''} />
              <span>{isPaused ? 'Paused' : 'Pause'}</span>
            </button>
          </div>

          {/* Simulate Attack Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowSimulateMenu(!showSimulateMenu)}
              disabled={simulateAttack.isPending}
              className="fanos-btn flex items-center gap-1.5 text-[11px] bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20"
              title="Simulate realistic attack traffic to verify live detection pipeline without terminal"
            >
              <Sparkles size={11} className={simulateAttack.isPending ? 'animate-spin' : 'text-purple-400'} />
              <span>Test Traffic</span>
            </button>

            {showSimulateMenu && (
              <div
                className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-[#0c1527] border border-white/10 shadow-2xl p-1.5 z-40 space-y-1 animate-fade-in"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-fanos-dim border-b border-white/[0.06]">
                  Simulate Live Telemetry
                </div>
                {[
                  { id: 'log4j', label: 'Log4j RCE Attempt', desc: 'Critical CVE-2021-44228 probe', color: 'text-red-400' },
                  { id: 'sqli',  label: 'SQL Injection Attack', desc: 'High UNION SELECT probe', color: 'text-amber-400' },
                  { id: 'nmap',  label: 'Nmap Port Scan Alert', desc: 'Medium Reconnaissance event', color: 'text-cyan-400' },
                  { id: 'flow',  label: 'AI ML Flow Anomaly', desc: 'High-volume traffic flow burst', color: 'text-purple-400' },
                ].map(sim => (
                  <button
                    key={sim.id}
                    onClick={() => handleSimulate(sim.id)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors flex flex-col group"
                  >
                    <span className={`text-[11px] font-semibold ${sim.color} group-hover:translate-x-0.5 transition-transform flex items-center justify-between`}>
                      {sim.label}
                      <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <span className="text-[10px] text-fanos-dim">{sim.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh All */}
          <button
            onClick={() => {
              refetchEvents()
              refetchControl()
              refreshAll()
            }}
            className="fanos-btn flex items-center gap-1.5 text-[11px]"
            title="Refresh events and engine state"
          >
            <RefreshCw size={11} className={eventsFetching || controlFetching ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      {/* ── Modern Hero Console & Telemetry Status Bar ──────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#0c1629]/90 via-[#0a1120]/95 to-[#060a12]/90 backdrop-blur-md p-5 shadow-2xl">
        {/* Glow ambient background accents */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-20"
          style={{ background: isLive ? '#00e5a0' : isPaused ? '#f59e0b' : '#3b82f6' }}
        />
        <div
          className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-10"
          style={{ background: '#8b5cf6' }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Engine Identity & Live Control Badge */}
          <div className="flex items-start sm:items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 relative shadow-lg"
              style={{
                background: isLive
                  ? 'radial-gradient(circle at 30% 30%, rgba(0,229,160,0.25), rgba(0,100,80,0.1))'
                  : 'radial-gradient(circle at 30% 30%, rgba(0,200,255,0.2), rgba(15,25,45,0.8))',
                border: `1.5px solid ${isLive ? 'rgba(0,229,160,0.45)' : 'rgba(0,200,255,0.3)'}`,
                boxShadow: isLive ? '0 0 20px rgba(0,229,160,0.2)' : 'none',
              }}
            >
              <Shield
                size={26}
                className={isLive ? 'text-emerald-400 animate-pulse' : 'text-cyan-400'}
              />
              {isLive && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#0c1629]" />
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-[17px] font-bold text-white tracking-tight flex items-center gap-2">
                  Suricata IDS/IPS Core Engine
                </h2>
                {/* State Pill */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                  style={{
                    background: isLive
                      ? 'rgba(0,229,160,0.15)'
                      : isPaused
                      ? 'rgba(245,158,11,0.15)'
                      : 'rgba(100,116,139,0.15)',
                    color: isLive ? '#00e5a0' : isPaused ? '#f59e0b' : '#94a3b8',
                    border: `1px solid ${
                      isLive ? 'rgba(0,229,160,0.35)' : isPaused ? 'rgba(245,158,11,0.35)' : 'rgba(100,116,139,0.3)'
                    }`,
                  }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isLive ? 'bg-emerald-400 animate-pulse' : isPaused ? 'bg-amber-400' : 'bg-slate-400'
                    }`}
                  />
                  <span>{isLive ? 'LIVE CAPTURE' : isPaused ? 'PAUSED' : 'STANDBY'}</span>
                </div>
              </div>

              <div className="text-[11px] text-fanos-muted flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-cyan-300 font-mono">
                  <Wifi size={11} /> {controlStatus?.interface || '192.168.56.1'}
                </span>
                <span className="text-white/20">•</span>
                <span className="flex items-center gap-1">
                  <Cpu size={11} /> Suricata PID: {controlStatus?.suricata_pid || 'Running'}
                </span>
                <span className="text-white/20">•</span>
                <span className="flex items-center gap-1 text-purple-300">
                  <Server size={11} /> Collector PID: {controlStatus?.collector_pid || (isLive ? 'Active' : 'Idle')}
                </span>
                <span className="text-white/20">•</span>
                <span className="text-fanos-dim">{controlStatus?.ruleset || 'Emerging Threats v7.0'}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
            <div className="text-center px-2">
              <div className="text-[20px] font-black text-white tracking-tight">
                {totalCount.toLocaleString()}
              </div>
              <div className="text-[9px] font-bold text-fanos-dim uppercase tracking-wider flex items-center justify-center gap-1">
                <Activity size={9} className="text-cyan-400" /> Ingested 24h
              </div>
            </div>

            <div className="text-center px-2 border-l border-white/[0.06]">
              <div className="text-[20px] font-black text-cyan-400 tracking-tight">
                {alertCount.toLocaleString()}
              </div>
              <div className="text-[9px] font-bold text-fanos-dim uppercase tracking-wider flex items-center justify-center gap-1">
                <ShieldAlert size={9} className="text-cyan-400" /> Alerts Raised
              </div>
            </div>

            <div className="text-center px-2 border-l border-white/[0.06]">
              <div className="text-[20px] font-black text-red-400 tracking-tight">
                {criticalCount}
              </div>
              <div className="text-[9px] font-bold text-fanos-dim uppercase tracking-wider flex items-center justify-center gap-1">
                <Flame size={9} className="text-red-400" /> Critical
              </div>
            </div>

            <div className="text-center px-2 border-l border-white/[0.06]">
              <div className="text-[20px] font-black text-purple-400 tracking-tight">
                {mlFlowCount}
              </div>
              <div className="text-[9px] font-bold text-fanos-dim uppercase tracking-wider flex items-center justify-center gap-1">
                <Zap size={9} className="text-purple-400" /> AI Flows
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-1 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all ${
                tab === t
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/30 shadow-[0_0_12px_rgba(0,200,255,0.15)]'
                  : 'text-fanos-muted hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Streaming frequency indicator */}
        <div className="flex items-center gap-2 text-[11px] text-fanos-dim font-mono">
          <Clock size={11} className="text-cyan-400" />
          <span>Polling:</span>
          <select
            value={autoRefreshSec}
            onChange={e => setAutoRefreshSec(Number(e.target.value))}
            className="bg-white/[0.04] border border-white/[0.08] text-white text-[11px] rounded px-2 py-0.5 outline-none focus:border-cyan-400"
          >
            <option value={1} className="bg-[#0c1629]">1s (Realtime)</option>
            <option value={3} className="bg-[#0c1629]">3s (Fast)</option>
            <option value={5} className="bg-[#0c1629]">5s (Balanced)</option>
            <option value={10} className="bg-[#0c1629]">10s (Eco)</option>
            <option value={0} className="bg-[#0c1629]">Manual Only</option>
          </select>
        </div>
      </div>

      {/* ── TAB 1: Live Telemetry ────────────────────────── */}
      {tab === 'Live Telemetry' && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Filter Toolbar */}
          <div className="fanos-card p-3 flex items-center justify-between gap-3 flex-wrap">
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 flex-1 min-w-[240px] focus-within:border-cyan-400/50 transition-colors">
              <Search size={13} className="text-fanos-dim flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by source IP, target IP, port, or attack signature..."
                className="bg-transparent text-[12px] text-white outline-none w-full placeholder:text-fanos-dim"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-fanos-dim hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Severity Filter Chips */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-fanos-dim mr-1 flex items-center gap-1 font-semibold">
                <Filter size={10} /> Severity:
              </span>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
                    severityFilter === sev
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                      : 'bg-white/[0.03] text-fanos-dim hover:text-white border border-transparent'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Source Classification Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-fanos-dim mr-1 font-semibold">Engine Source:</span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'SURICATA', label: 'Suricata IDS' },
                { id: 'ML_FLOW', label: 'ML Flow Anomaly' },
              ].map(src => (
                <button
                  key={src.id}
                  onClick={() => setSourceFilter(src.id as any)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
                    sourceFilter === src.id
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-sm'
                      : 'bg-white/[0.03] text-fanos-dim hover:text-white border border-transparent'
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>

            {/* Protocol Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-fanos-dim mr-1 font-semibold">Proto:</span>
              {['ALL', 'TCP', 'UDP'].map(pr => (
                <button
                  key={pr}
                  onClick={() => setProtocolFilter(pr)}
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all ${
                    protocolFilter === pr
                      ? 'bg-white/20 text-white'
                      : 'text-fanos-dim hover:text-white'
                  }`}
                >
                  {pr}
                </button>
              ))}
            </div>
          </div>

          {/* Events Table */}
          <div className="fanos-card overflow-hidden shadow-xl border border-white/[0.08]">
            <div className="fanos-panel-header justify-between">
              <div className="fanos-panel-title flex items-center gap-2">
                <Shield size={13} className="text-cyan-400" />
                <span>Live Ingested Suricata Telemetry</span>
                {isLive && (
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono font-normal">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    STREAMING
                  </span>
                )}
              </div>
              <span className="text-[11px] text-fanos-dim font-mono">
                Displaying {filteredEvents.length} of {rawEvents.length} events
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black/30 border-b border-white/[0.06]">
                    {[
                      'TIMESTAMP',
                      'SOURCE IP & PORT',
                      'TARGET & PORT',
                      'DETECTION SIGNATURE',
                      'SEVERITY',
                      'AI CONFIDENCE',
                      'RISK SCORE',
                      'STATUS',
                      'ENGINE',
                      'DETAILS',
                    ].map(h => (
                      <th
                        key={h}
                        className="px-3.5 py-2.5 text-left text-[9px] font-bold tracking-[0.8px] uppercase text-fanos-dim whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        <Activity size={32} className="text-fanos-dim mx-auto mb-2 opacity-50" />
                        <div className="text-[13px] font-bold text-white">No Telemetry Events Found</div>
                        <div className="text-[11px] text-fanos-muted mt-1 max-w-md mx-auto">
                          {search
                            ? 'No events match your current filter criteria.'
                            : isPaused
                            ? 'The collector is currently PAUSED. Click "OnLive" above to resume real-time ingestion.'
                            : 'Click "OnLive" to stream Suricata events, or click "Test Traffic" to simulate an alert.'}
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <button
                            onClick={handleOnLive}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 hover:bg-emerald-500/30 transition-all"
                          >
                            <Play size={11} /> Start OnLive
                          </button>
                          <button
                            onClick={() => handleSimulate('log4j')}
                            className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold flex items-center gap-1.5 hover:bg-purple-500/30 transition-all"
                          >
                            <Sparkles size={11} /> Simulate Alert
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((ev, idx) => {
                      const timeStr = ev.created_at
                        ? new Date(ev.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false,
                          })
                        : 'Just now'
                      const isMlFlow = ev.sensor_source === 'suricata-flow'

                      return (
                        <tr
                          key={String(ev.id || idx)}
                          onClick={() => setSelectedEvent(ev)}
                          className="hover:bg-white/[0.025] transition-colors cursor-pointer group"
                        >
                          {/* Time */}
                          <td className="px-3.5 py-2.5 font-mono text-[10px] text-fanos-dim whitespace-nowrap">
                            {timeStr}
                          </td>

                          {/* Source IP */}
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-cyan-300 font-medium whitespace-nowrap">
                            <span className="hover:underline">{ev.source_ip}</span>
                          </td>

                          {/* Target */}
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-fanos-muted whitespace-nowrap">
                            {ev.target}
                          </td>

                          {/* Threat / Signature */}
                          <td className="px-3.5 py-2.5 text-[11px] text-white font-medium max-w-[260px] truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="truncate">{ev.attack_type}</span>
                            </div>
                          </td>

                          {/* Severity */}
                          <td className="px-3.5 py-2.5">
                            <span className={severityClass(ev.severity)}>{ev.severity}</span>
                          </td>

                          {/* AI Confidence */}
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, ev.ai_confidence || 0)}%`,
                                    background: 'linear-gradient(90deg, #8b5cf6, #00c8ff)',
                                  }}
                                />
                              </div>
                              <span className="font-mono text-[10px] text-fanos-muted">
                                {ev.ai_confidence ? ev.ai_confidence.toFixed(0) : '—'}%
                              </span>
                            </div>
                          </td>

                          {/* Risk */}
                          <td className={`px-3.5 py-2.5 font-mono font-bold text-[11px] ${riskColor(ev.risk_score)}`}>
                            {ev.risk_score}
                          </td>

                          {/* Status */}
                          <td className="px-3.5 py-2.5">
                            <span className={statusClass(ev.status)}>{ev.status}</span>
                          </td>

                          {/* Source Type Pill */}
                          <td className="px-3.5 py-2.5">
                            <span
                              className="text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap"
                              style={{
                                background: isMlFlow ? 'rgba(139,92,246,0.12)' : 'rgba(0,200,255,0.1)',
                                color: isMlFlow ? '#a78bfa' : '#00c8ff',
                                border: `1px solid ${isMlFlow ? 'rgba(139,92,246,0.25)' : 'rgba(0,200,255,0.25)'}`,
                              }}
                            >
                              {isMlFlow ? 'ML Flow' : 'Suricata IDS'}
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="px-3.5 py-2.5">
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setSelectedEvent(ev)
                              }}
                              className="fanos-btn text-[9px] py-1 px-2.5 flex items-center gap-1 group-hover:border-cyan-400/50"
                            >
                              <Code size={10} /> Inspect
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 border-t border-white/[0.04] text-[10px] text-fanos-dim flex justify-between items-center bg-black/20">
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {isLive ? 'Streaming active from local Suricata EVE engine' : 'Telemetry stream paused / idle'}
              </span>
              <span>Loaded records: {rawEvents.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: SOC Attack Analytics ──────────────────── */}
      {tab === 'SOC Attack Analytics' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Severity Distribution */}
            <div className="fanos-card p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div className="text-[12px] font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  Severity Distribution Matrix
                </div>
                <span className="text-[10px] text-fanos-dim">24-Hour Ingestion Window</span>
              </div>
              <div className="space-y-3 pt-1">
                {[
                  { label: 'Critical Severity', count: criticalCount, color: '#ef4444' },
                  { label: 'High Severity', count: highCount, color: '#f97316' },
                  {
                    label: 'Medium Severity',
                    count: stats?.medium ?? rawEvents.filter(e => e.severity === 'MEDIUM').length,
                    color: '#f59e0b',
                  },
                  {
                    label: 'Low & Informational',
                    count: (stats?.low ?? 0) + rawEvents.filter(e => e.severity === 'LOW' || e.severity === 'INFO').length,
                    color: '#00c8ff',
                  },
                ].map(s => {
                  const pct = totalCount > 0 ? Math.round((s.count / totalCount) * 100) : 0
                  return (
                    <div key={s.label} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-fanos-muted font-medium">{s.label}</span>
                        <span className="font-bold text-white font-mono">
                          {s.count} <span className="text-fanos-dim font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: s.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Attack Categories */}
            <div className="fanos-card p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div className="text-[12px] font-bold text-white flex items-center gap-2">
                  <Flame size={14} className="text-red-400" />
                  Top Detected Attack Signatures
                </div>
                <span className="text-[10px] text-fanos-dim">Classification Breakdown</span>
              </div>
              <div className="space-y-2 pt-1">
                {categoryCounts.length === 0 ? (
                  <div className="text-[11px] text-fanos-muted py-8 text-center">
                    No attack classifications observed yet. Click "Test Traffic" above to generate sample detections.
                  </div>
                ) : (
                  categoryCounts.slice(0, 7).map(([cat, cnt]) => {
                    const pct = totalCount > 0 ? Math.round((cnt / totalCount) * 100) : 0
                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
                      >
                        <div className="flex items-center gap-2 max-w-[70%]">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                          <span className="text-[11px] text-white truncate font-medium">{cat}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-fanos-dim font-mono">{pct}%</span>
                          <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                            {cnt}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Protocols & Threat Vector Overview */}
          <div className="fanos-card p-4">
            <div className="text-[12px] font-bold text-white mb-3 flex items-center gap-2">
              <Layers size={14} className="text-purple-400" />
              Network Protocol Distribution
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {Object.entries(protocolCounts).map(([proto, cnt]) => (
                <div key={proto} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-center">
                  <div className="text-[10px] font-bold text-fanos-dim uppercase">{proto}</div>
                  <div className="text-[18px] font-black text-white font-mono mt-0.5">{cnt}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Engine Diagnostics & Logging ──────────── */}
      {tab === 'Engine Diagnostics' && (
        <div className="space-y-4 animate-fade-in">
          {/* Engine Parameters Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="fanos-card p-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Cpu size={12} /> Suricata Engine Process
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-fanos-dim">Binary:</span>
                  <span className="text-white font-mono text-[10px] truncate max-w-[170px]" title={controlStatus?.eve_path}>
                    suricata.exe
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-fanos-dim">Status:</span>
                  <span className={controlStatus?.suricata_running ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {controlStatus?.suricata_running ? `RUNNING (PID ${controlStatus?.suricata_pid})` : 'OFFLINE'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-fanos-dim">Capture Interface:</span>
                  <span className="text-white font-mono">{controlStatus?.interface || '192.168.56.1'}</span>
                </div>
              </div>
            </div>

            <div className="fanos-card p-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Server size={12} /> EVE Telemetry Collector
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-fanos-dim">Worker Process:</span>
                  <span className="text-white font-mono text-[10px]">app.main (Python)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-fanos-dim">Streaming Mode:</span>
                  <span className={isLive ? 'text-emerald-400 font-bold' : isPaused ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                    {currentMode}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-fanos-dim">Collector PID:</span>
                  <span className="text-white font-mono">{controlStatus?.collector_pid || 'Inactive'}</span>
                </div>
              </div>
            </div>

            <div className="fanos-card p-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <FileText size={12} /> EVE JSON Log File
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-fanos-dim">Log Exists:</span>
                  <span className={controlStatus?.eve_exists ? 'text-emerald-400' : 'text-red-400'}>
                    {controlStatus?.eve_exists ? 'Yes (Verified)' : 'Not Found'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-fanos-dim">File Size:</span>
                  <span className="text-white font-mono">{controlStatus?.eve_size_mb || 0} MB</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-fanos-dim">Sensor ID:</span>
                  <span className="text-white font-mono">{controlStatus?.sensor_id || 'windows-suricata-01'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Collector Log Console */}
          <div className="fanos-card shadow-2xl overflow-hidden border border-white/[0.1]">
            <div className="fanos-panel-header justify-between bg-black/40">
              <div className="fanos-panel-title text-cyan-400 flex items-center gap-2">
                <Terminal size={14} />
                <span>Telemetry Collector Live Log Feed</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refetchLogs()}
                  className="fanos-btn text-[9px] py-1 px-2"
                  title="Refresh logs"
                >
                  <RefreshCw size={10} /> Refresh Logs
                </button>
              </div>
            </div>
            <pre className="p-4 bg-black/80 font-mono text-[11px] text-cyan-200/90 max-h-[350px] overflow-y-auto leading-relaxed divide-y divide-white/[0.02]">
              {logData?.logs && logData.logs.length > 0 ? (
                logData.logs.map((line, i) => (
                  <div key={i} className="py-0.5 hover:bg-white/[0.03]">
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-fanos-dim italic">
                  No log lines available. Start the collector via "OnLive" to stream logs.
                </div>
              )}
            </pre>
          </div>
        </div>
      )}

      {/* ── TAB 4: Raw EVE JSON ──────────────────────────── */}
      {tab === 'Raw EVE JSON' && (
        <div className="fanos-card border border-white/[0.08] shadow-2xl">
          <div className="fanos-panel-header justify-between">
            <div className="fanos-panel-title">
              <Code size={14} className="text-cyan-400" />
              <span>Raw EVE Ingestion Feed</span>
            </div>
            <span className="text-[11px] text-fanos-dim font-mono">
              Displaying recent {rawEvents.length} payloads
            </span>
          </div>

          <div className="divide-y divide-white/[0.04] max-h-[620px] overflow-y-auto">
            {rawEvents.length === 0 ? (
              <div className="py-16 text-center text-fanos-muted text-[12px]">
                No raw EVE records ingested yet. Click "OnLive" to stream from the sensor.
              </div>
            ) : (
              rawEvents.map(ev => {
                let parsed: any = null
                try {
                  parsed = ev.raw_payload ? JSON.parse(ev.raw_payload) : null
                } catch {
                  parsed = ev.raw_payload
                }

                return (
                  <div key={String(ev.id)} className="p-4 hover:bg-white/[0.015] transition-colors">
                    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={severityClass(ev.severity)}>{ev.severity}</span>
                        <span className="font-mono text-[11px] text-white font-bold">{ev.attack_type}</span>
                        <span className="text-[11px] text-fanos-dim font-mono">
                          {ev.source_ip} &rarr; {ev.target}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-fanos-dim">
                          {ev.created_at ? new Date(ev.created_at).toISOString() : '—'}
                        </span>
                        <button
                          onClick={() => handleCopyPayload(parsed || ev)}
                          className="fanos-btn text-[9px] py-1 px-2 flex items-center gap-1"
                          title="Copy JSON"
                        >
                          <Copy size={9} /> Copy
                        </button>
                      </div>
                    </div>

                    <pre className="p-3 rounded-lg bg-black/50 border border-white/[0.06] text-[10px] font-mono text-cyan-200 overflow-x-auto max-h-[160px]">
                      {parsed ? JSON.stringify(parsed, null, 2) : JSON.stringify(ev, null, 2)}
                    </pre>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── Event Detail Modal ───────────────────────────── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/[0.12] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            style={{ background: '#0a1122' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="text-[14px] font-bold text-white flex items-center gap-2">
                    Suricata Event Details
                    <span className={severityClass(selectedEvent.severity)}>{selectedEvent.severity}</span>
                  </div>
                  <div className="text-[10px] text-fanos-dim font-mono">
                    ID: {String(selectedEvent.id)} •{' '}
                    {selectedEvent.created_at ? new Date(selectedEvent.created_at).toLocaleString() : '—'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-fanos-dim hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Summary 4-Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                <div className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                  <span className="text-fanos-dim text-[10px] block">Source IP</span>
                  <span className="font-mono font-bold text-cyan-400 text-[12px]">{selectedEvent.source_ip}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                  <span className="text-fanos-dim text-[10px] block">Target Destination</span>
                  <span className="font-mono text-white text-[12px] truncate block">{selectedEvent.target}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                  <span className="text-fanos-dim text-[10px] block">AI Confidence</span>
                  <span className="font-bold text-purple-400 text-[12px]">
                    {selectedEvent.ai_confidence ? selectedEvent.ai_confidence.toFixed(1) : '—'}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                  <span className="text-fanos-dim text-[10px] block">Risk Score</span>
                  <span className={`font-bold text-[12px] ${riskColor(selectedEvent.risk_score)}`}>
                    {selectedEvent.risk_score} / 100
                  </span>
                </div>
              </div>

              {/* Threat Classification */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-fanos-dim uppercase block">Threat / Attack Signature</span>
                  <span className="text-[13px] font-bold text-white">{selectedEvent.attack_type}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-fanos-dim uppercase block">Sensor Engine</span>
                  <span className="text-[12px] font-semibold text-cyan-400">
                    {selectedEvent.sensor_source === 'suricata-flow' ? 'AI ML Flow Engine' : 'Suricata IDS'}
                  </span>
                </div>
              </div>

              {/* Raw JSON Payload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-fanos-muted flex items-center gap-1.5">
                    <Code size={12} /> Raw Telemetry Payload (EVE JSON)
                  </span>
                  <button
                    onClick={() => handleCopyPayload(parsedModalPayload || selectedEvent)}
                    className="fanos-btn text-[10px] py-1 px-2.5 flex items-center gap-1"
                  >
                    {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-black/60 border border-white/[0.08] text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-[220px]">
                  {parsedModalPayload
                    ? JSON.stringify(parsedModalPayload, null, 2)
                    : JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-white/[0.08] flex justify-end bg-white/[0.02]">
              <button
                onClick={() => setSelectedEvent(null)}
                className="fanos-btn text-[11px] px-5 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
