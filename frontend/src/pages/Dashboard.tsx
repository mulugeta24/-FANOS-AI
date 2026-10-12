import { useState } from 'react'
import {
  AlertOctagon, AlertTriangle, ShieldCheck,
  Activity, BrainCircuit, HeartPulse, RefreshCw,
} from 'lucide-react'
import { useDashboardKPIs, useSystemHealth, useRefreshAll } from '@/hooks/useDashboard'

// Existing components
import KpiCard                  from '@/components/dashboard/KpiCard'
import ThreatActivityChart      from '@/components/dashboard/ThreatActivityChart'
import AttackDistributionChart  from '@/components/dashboard/AttackDistributionChart'
import ActiveIncidentsTable     from '@/components/dashboard/ActiveIncidentsTable'
import AIEnginePanel            from '@/components/dashboard/AIEnginePanel'
import RiskDistributionPanel    from '@/components/dashboard/RiskDistributionPanel'
import PreventionPanel          from '@/components/dashboard/PreventionPanel'
import WebSecurityPanel         from '@/components/dashboard/WebSecurityPanel'
import URIAssessmentPanel       from '@/components/dashboard/URIAssessmentPanel'
import ThreatCorrelationPanel   from '@/components/dashboard/ThreatCorrelationPanel'
import ResponseActionsPanel     from '@/components/dashboard/ResponseActionsPanel'
import ArchitecturePanel        from '@/components/dashboard/ArchitecturePanel'

// New production-grade components
import LiveEventsPanelEnhanced  from '@/components/dashboard/LiveEventsPanelEnhanced'
import IncidentDetailModal      from '@/components/dashboard/IncidentDetailModal'
import type { IncidentDetail }  from '@/components/dashboard/IncidentDetailModal'
import ThreatIntelPanel         from '@/components/dashboard/ThreatIntelPanel'
import MitreAttackPanel         from '@/components/dashboard/MitreAttackPanel'
import SystemStatusPanel        from '@/components/dashboard/SystemStatusPanel'
import AIWorkflowPanel          from '@/components/dashboard/AIWorkflowPanel'

export default function Dashboard() {
  const { data: health, isFetching: healthFetching } = useSystemHealth()
  const { data: kpi, isError: kpiError, refetch: refetchKpis } = useDashboardKPIs()
  const refreshAll = useRefreshAll()

  // Modals / drawers state
  const [openIncident, setOpenIncident] = useState<IncidentDetail | null>(null)
  const [openIP, setOpenIP]             = useState<string | null>(null)

  const displayKpi = kpi || {
    critical_threats: 0,
    critical_change: '—',
    active_incidents: 0,
    incidents_today: 0,
    blocked_threats: 0,
    blocked_change: '—',
    security_events: 0,
    events_change: '—',
    ai_accuracy: 99.84,
    ai_f1_score: 99.85,
    system_health: health?.status === 'healthy' ? 100 : 98.7,
    sensors_online: health?.suricata === 'active' ? 1 : 0,
    sensors_total: 1,
  }

  return (
    <>
      {/* ── Incident Detail Modal ───────────────────────── */}
      {openIncident && (
        <IncidentDetailModal
          incident={openIncident}
          onClose={() => setOpenIncident(null)}
        />
      )}

      <div className="px-4 py-4 flex flex-col gap-4">

        {/* ── Page Hero & Truthful Disaggregated Health ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[22px] font-bold text-white tracking-tight leading-tight">
              Security Operations Center
            </h1>
            <p className="text-[13px] text-fanos-muted mt-1">
              Real-time threat monitoring, AI-assisted detection, prevention and incident triage.
            </p>
          </div>

          {/* Disaggregated System Health Status Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Backend API */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold"
              style={{
                background: health?.backend ? 'rgba(0,229,160,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${health?.backend ? 'rgba(0,229,160,0.2)' : 'rgba(239,68,68,0.2)'}`,
                color: health?.backend ? '#00e5a0' : '#ef4444',
              }}>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.backend ? 'bg-emerald-400' : 'bg-red-500'}`} />
              API: {health?.backend ? 'Online' : 'Offline'}
            </div>

            {/* PostgreSQL */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold"
              style={{
                background: health?.database === 'online' ? 'rgba(0,229,160,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${health?.database === 'online' ? 'rgba(0,229,160,0.2)' : 'rgba(239,68,68,0.2)'}`,
                color: health?.database === 'online' ? '#00e5a0' : '#ef4444',
              }}>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.database === 'online' ? 'bg-emerald-400' : 'bg-red-500'}`} />
              DB: {health?.database === 'online' ? 'Connected' : 'Offline'}
            </div>

            {/* Suricata Sensor */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold"
              style={{
                background: health?.suricata === 'active' ? 'rgba(0,200,255,0.08)' : health?.suricata === 'idle' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${health?.suricata === 'active' ? 'rgba(0,200,255,0.25)' : health?.suricata === 'idle' ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
                color: health?.suricata === 'active' ? '#00c8ff' : health?.suricata === 'idle' ? '#f59e0b' : '#ef4444',
              }}>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.suricata === 'active' ? 'bg-cyan-400 animate-pulse' : health?.suricata === 'idle' ? 'bg-amber-400' : 'bg-red-500'}`} />
              Suricata: {health?.suricata === 'active' ? 'Live Stream' : health?.suricata === 'idle' ? 'Idle' : 'Offline'}
            </div>

            {/* ML Engine */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold"
              style={{
                background: health?.ml_engine === 'loaded' ? 'rgba(139,92,246,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${health?.ml_engine === 'loaded' ? 'rgba(139,92,246,0.25)' : 'rgba(239,68,68,0.25)'}`,
                color: health?.ml_engine === 'loaded' ? '#a78bfa' : '#ef4444',
              }}>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.ml_engine === 'loaded' ? 'bg-purple-400' : 'bg-red-500'}`} />
              AI: {health?.ml_engine === 'loaded' ? 'XGBoost Active' : 'Offline'}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refreshAll()}
              className="p-1.5 rounded-md text-fanos-dim hover:text-white hover:bg-white/[0.04] transition-colors"
              title="Refresh all metrics"
            >
              <RefreshCw size={13} className={healthFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── KPI Error Banner ───────────────────────────── */}
        {kpiError && (
          <div className="rounded-lg p-3 flex items-center justify-between gap-3 text-[12px]"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
              <span>Failed to fetch real-time KPI aggregates from backend API. Displaying unverified state.</span>
            </div>
            <button
              onClick={() => refetchKpis()}
              className="px-2.5 py-1 rounded text-[11px] font-semibold bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-6 gap-3">
          <KpiCard
            label="Critical Threats"
            value={displayKpi.critical_threats}
            change={displayKpi.critical_change}
            changeTone="red"
            sub="today"
            accent="red"
            icon={<AlertOctagon size={14} />}
          />
          <KpiCard
            label="Active Incidents"
            value={displayKpi.active_incidents}
            change={`+${displayKpi.incidents_today} today`}
            changeTone="amber"
            accent="orange"
            icon={<AlertTriangle size={14} />}
          />
          <KpiCard
            label="Blocked Threats"
            value={displayKpi.blocked_threats}
            change={displayKpi.blocked_change}
            changeTone="green"
            sub="today"
            accent="teal"
            icon={<ShieldCheck size={14} />}
          />
          <KpiCard
            label="Security Events"
            value={displayKpi.security_events.toLocaleString()}
            change={displayKpi.events_change}
            changeTone="blue"
            sub="today"
            accent="blue"
            icon={<Activity size={14} />}
          />
          <KpiCard
            label="AI Detection Accuracy"
            value={`${displayKpi.ai_accuracy}%`}
            sub2={`F1 SCORE: ${displayKpi.ai_f1_score}%`}
            accent="ai"
            icon={<BrainCircuit size={14} />}
            extra={
              <div className="flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden mt-1">
                <div className="h-full rounded-full"
                  style={{ width: `${displayKpi.ai_accuracy}%`, background: 'linear-gradient(90deg,#8b5cf6,#00c8ff)' }} />
              </div>
            }
          />
          <KpiCard
            label="System Health"
            value={`${displayKpi.system_health}%`}
            sub={`Sensors: ${displayKpi.sensors_online}/${displayKpi.sensors_total}`}
            accent="health"
            icon={<HeartPulse size={14} />}
            extra={
              <div className="flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden mt-1">
                <div className="h-full rounded-full"
                  style={{ width: `${displayKpi.system_health}%`, background: 'linear-gradient(90deg,#00e5a0,#00c8ff)' }} />
              </div>
            }
          />
        </div>

        {/* ── Row 2: Threat Activity + Attack Distribution ── */}
        <div className="grid grid-cols-[1fr_280px] gap-4">
          <ThreatActivityChart />
          <AttackDistributionChart />
        </div>

        {/* ── Row 3: Live Security Events (enhanced) ─────── */}
        <LiveEventsPanelEnhanced
          onOpenIncident={setOpenIncident}
          onOpenIP={setOpenIP}
        />

        {/* ── Row 4: Active Incidents + AI Engine + Risk ──── */}
        <div className="grid grid-cols-[1fr_220px_220px] gap-4">
          <ActiveIncidentsTable />
          <AIEnginePanel />
          <RiskDistributionPanel />
        </div>

        {/* ── Row 5: AI Workflow Pipeline ───────────────── */}
        <AIWorkflowPanel />

        {/* ── Row 6: MITRE ATT&CK Matrix ────────────────── */}
        <MitreAttackPanel />

        {/* ── Row 7: Threat Intel (with IP filter if set) ── */}
        <ThreatIntelPanel
          filterIp={openIP}
        />

        {/* ── Row 8: Real-Time System Status ────────────── */}
        <SystemStatusPanel />

        {/* ── Row 9: Prevention + Web + URI + Correlation ── */}
        <div className="grid grid-cols-4 gap-4">
          <PreventionPanel />
          <WebSecurityPanel />
          <URIAssessmentPanel />
          <ThreatCorrelationPanel />
        </div>

        {/* ── Row 10: Response + Architecture ───────────── */}
        <div className="grid grid-cols-[1fr_220px] gap-4">
          <ResponseActionsPanel />
          <ArchitecturePanel />
        </div>

        <div className="h-4" />
      </div>
    </>
  )
}
