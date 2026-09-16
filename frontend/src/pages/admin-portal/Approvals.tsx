import { CheckSquare, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import PageShell from '@/components/ui/PageShell'

const APPROVALS = [
  { id:'APR-001', title:'Enterprise Plan Upgrade',   org:'GlobalBank Group',  type:'Plan Change',       urgency:'High',   submitted:'2 hr ago',  requestedBy:'Tigist Bekele',  details:'Upgrade from Business to Enterprise — 6 additional sensors, SLA upgrade to 99.99%' },
  { id:'APR-002', title:'New Sensor Cluster Deploy', org:'Acme Corporation',  type:'Deployment',        urgency:'High',   submitted:'5 hr ago',  requestedBy:'Hiwot Tadesse',  details:'Deploy 3 sensor nodes in AWS us-east-1 for datacenter zone B coverage' },
  { id:'APR-003', title:'Trial Period Extension',    org:'SecureOps Inc',     type:'Account Change',    urgency:'Low',    submitted:'1 day ago', requestedBy:'Abel Girma',     details:'Extend 30-day trial by an additional 15 days — customer evaluating WAF features' },
  { id:'APR-004', title:'WAF Rule Set Update',       org:'NovaTech Systems',  type:'Security Config',   urgency:'Medium', submitted:'1 day ago', requestedBy:'Yonas Haile',    details:'Enable OWASP CRS v3.3 ruleset with custom API gateway rules' },
  { id:'APR-005', title:'API Key Generation',        org:'DataGuard Africa',  type:'Access Control',    urgency:'Low',    submitted:'2 days ago',requestedBy:'Selam Tesfaye',  details:'Generate new production API key for SIEM integration (QRadar)' },
]

const urgencyStyle: Record<string,{bg:string;color:string}> = {
  High:   { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444' },
  Medium: { bg: 'rgba(245,158,11,0.08)',  color: '#f59e0b' },
  Low:    { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af' },
}

export default function Approvals() {
  const [decisions, setDecisions] = useState<Record<string,'approved'|'rejected'|null>>({})

  function decide(id: string, d: 'approved' | 'rejected') {
    setDecisions(prev => ({ ...prev, [id]: prev[id] === d ? null : d }))
  }

  const pending  = APPROVALS.filter(a => !decisions[a.id])
  const resolved = APPROVALS.filter(a => decisions[a.id])

  return (
    <PageShell
      title="Approvals"
      subtitle="Review and approve pending platform requests"
      badge={{ label: `${pending.length} PENDING`, color: 'orange' }}
    >
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending',  value: pending.length,                                              color: '#f59e0b', icon: <Clock size={14}/> },
          { label: 'Approved', value: Object.values(decisions).filter(d=>d==='approved').length,   color: '#00e5a0', icon: <CheckCircle2 size={14}/> },
          { label: 'Rejected', value: Object.values(decisions).filter(d=>d==='rejected').length,   color: '#ef4444', icon: <XCircle size={14}/> },
        ].map(s => (
          <div key={s.label} className="fanos-card p-4 flex items-center gap-3">
            <span style={{ color: s.color }}>{s.icon}</span>
            <div>
              <div className="text-[20px] font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-fanos-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><AlertCircle size={13} className="text-fanos-amber" />Awaiting Approval</div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {pending.map(a => (
              <div key={a.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[10px] font-bold text-fanos-dim">{a.id}</span>
                      <span className="text-[12px] font-semibold text-white">{a.title}</span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: urgencyStyle[a.urgency].bg, color: urgencyStyle[a.urgency].color,
                          border: `1px solid ${urgencyStyle[a.urgency].color}25` }}>
                        {a.urgency}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-fanos-dim">
                      <span>{a.org}</span>
                      <span>·</span>
                      <span>{a.type}</span>
                      <span>·</span>
                      <span>by {a.requestedBy}</span>
                      <span>·</span>
                      <span>{a.submitted}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-fanos-muted mb-3 ml-0">{a.details}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decide(a.id, 'approved')}
                    className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(0,229,160,0.12)', color: '#00e5a0', border: '1px solid rgba(0,229,160,0.3)' }}
                  >
                    <CheckCircle2 size={11} />Approve
                  </button>
                  <button
                    onClick={() => decide(a.id, 'rejected')}
                    className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    <XCircle size={11} />Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><CheckSquare size={13} className="text-fanos-green" />Resolved</div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {resolved.map(a => {
              const d = decisions[a.id]!
              return (
                <div key={a.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.018] transition-colors">
                  <div className={d === 'approved' ? 'text-fanos-green' : 'text-fanos-red'}>
                    {d === 'approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] text-fanos-text">{a.title}</span>
                    <span className="text-[10px] text-fanos-dim ml-2">{a.org}</span>
                  </div>
                  <span className={`text-[9px] font-bold capitalize ${d === 'approved' ? 'text-fanos-green' : 'text-fanos-red'}`}>
                    {d}
                  </span>
                  <button onClick={() => setDecisions(prev => { const n={...prev}; delete n[a.id]; return n })}
                    className="text-[9px] text-fanos-dim hover:text-fanos-accent">Undo</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </PageShell>
  )
}
