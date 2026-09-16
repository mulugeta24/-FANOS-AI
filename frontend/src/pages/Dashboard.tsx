import { useState } from 'react'
import {
  AlertOctagon, AlertTriangle, ShieldCheck,
  Activity, BrainCircuit, HeartPulse,
} from 'lucide-react'
import { useDashboardKPIs } from '@/hooks/useDashboard'
import { mockKPIs } from '@/lib/mockData'

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
  const { data: kpi = mockKPIs } = useDashboardKPIs()

  // Modals / drawers state
  const [openIncident, setOpenIncident] = useState<IncidentDetail | null>(null)
  const [openIP, setOpenIP]             = useState<string | null>(null)

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

        {/* ── Page Hero ─────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[22px] font-bold text-white tracking-tight leading-tight">
              Security Operations Center
            </h1>
            <p className="text-[13px] text-fanos-muted mt-1">
              Real-time visibility, AI-powered threat detection, prevention and incident response.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Demo mode badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold text-fanos-amber"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-fanos-amber animate-pulse" />
              DEMO MODE — Backend Offline
            </div>
            {/* Live badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold text-fanos-accent"
              style={{ background: 'rgba(0,200,255,0.05)', border: '1px solid rgba(0,200,255,0.15)' }}>
              <span className="dot-accent" />
              LIVE · Updated just now
            </div>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-6 gap-3">
          <KpiCard
            label="Critical Threats"
            value={kpi.critical_threats}
            change={kpi.critical_change}
            changeTone="red"
            sub="today"
            accent="red"
            icon={<AlertOctagon size={14} />}
          />
          <KpiCard
            label="Active Incidents"
            value={kpi.active_incidents}
            change={`+${kpi.incidents_today} today`}
            changeTone="amber"
            accent="orange"
            icon={<AlertTriangle size={14} />}
          />
          <KpiCard
            label="Blocked Threats"
            value={kpi.blocked_threats}
            change={kpi.blocked_change}
            changeTone="green"
            sub="today"
            accent="teal"
            icon={<ShieldCheck size={14} />}
          />
          <KpiCard
            label="Security Events"
            value={kpi.security_events.toLocaleString()}
            change={kpi.events_change}
            changeTone="blue"
            sub="today"
            accent="blue"
            icon={<Activity size={14} />}
          />
          <KpiCard
            label="AI Detection Accuracy"
            value={`${kpi.ai_accuracy}%`}
            sub2={`F1 SCORE: ${kpi.ai_f1_score}%`}
            accent="ai"
            icon={<BrainCircuit size={14} />}
            extra={
              <div className="flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden mt-1">
                <div className="h-full rounded-full"
                  style={{ width: `${kpi.ai_accuracy}%`, background: 'linear-gradient(90deg,#8b5cf6,#00c8ff)' }} />
              </div>
            }
          />
          <KpiCard
            label="System Health"
            value={`${kpi.system_health}%`}
            sub={`Sensors: ${kpi.sensors_online}/${kpi.sensors_total}`}
            accent="health"
            icon={<HeartPulse size={14} />}
            extra={
              <div className="flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden mt-1">
                <div className="h-full rounded-full"
                  style={{ width: `${kpi.system_health}%`, background: 'linear-gradient(90deg,#00e5a0,#00c8ff)' }} />
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
