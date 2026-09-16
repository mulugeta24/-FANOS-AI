import { ClipboardList, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/components/ui/PageShell'

const REQUESTS = [
  { id:'REQ-001', org:'Acme Corporation',  type:'New Deployment',     priority:'High',   status:'Pending',  submitted:'Sep 14, 2026', assignee:'Unassigned',  desc:'Deploy 3 additional sensors in datacenter zone B.' },
  { id:'REQ-002', org:'GlobalBank Group',  type:'Service Upgrade',    priority:'Medium', status:'Pending',  submitted:'Sep 13, 2026', assignee:'Kidist W.',   desc:'Upgrade from Business to Enterprise plan.' },
  { id:'REQ-003', org:'NovaTech Systems',  type:'WAF Configuration',  priority:'High',   status:'Pending',  submitted:'Sep 12, 2026', assignee:'Unassigned',  desc:'Enable additional WAF rules for API gateway protection.' },
  { id:'REQ-004', org:'DataGuard Africa',  type:'API Key Rotation',   priority:'Low',    status:'Approved', submitted:'Sep 10, 2026', assignee:'Mulugeta A.', desc:'Routine API key rotation per compliance policy.' },
  { id:'REQ-005', org:'SecureOps Inc',     type:'Trial Extension',    priority:'Low',    status:'Approved', submitted:'Sep 8, 2026',  assignee:'Mulugeta A.', desc:'Request to extend trial period by 30 days.' },
  { id:'REQ-006', org:'CyberShield Ltd',   type:'Account Suspension', priority:'High',   status:'Rejected', submitted:'Sep 5, 2026',  assignee:'Mulugeta A.', desc:'Suspend account due to non-payment.' },
]

const priorityStyle: Record<string, { bg: string; color: string }> = {
  High:   { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444' },
  Medium: { bg: 'rgba(245,158,11,0.08)',  color: '#f59e0b' },
  Low:    { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af' },
}
const statusStyle: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  Pending:  { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', icon: <Clock size={10} /> },
  Approved: { bg: 'rgba(0,229,160,0.08)',  color: '#00e5a0', icon: <CheckCircle2 size={10} /> },
  Rejected: { bg: 'rgba(239,68,68,0.08)',  color: '#ef4444', icon: <XCircle size={10} /> },
}

export default function ServiceRequests() {
  const navigate = useNavigate()
  return (
    <PageShell
      title="Service Requests"
      subtitle="Customer service and deployment requests awaiting review"
      badge={{ label: `${REQUESTS.filter(r => r.status === 'Pending').length} PENDING`, color: 'orange' }}
      actions={
        <button
          className="fanos-btn"
          onClick={() => navigate('/admin-portal/approvals')}
          style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}
        >
          <ArrowRight size={11} />Go to Approvals
        </button>
      }
    >
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><ClipboardList size={13} className="text-fanos-amber" />All Requests</div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {REQUESTS.map(r => {
            const ps = priorityStyle[r.priority]
            const ss = statusStyle[r.status]
            return (
              <div key={r.id} className="px-4 py-3 hover:bg-white/[0.018] transition-colors">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-bold text-fanos-dim">{r.id}</span>
                      <span className="text-[11px] font-semibold text-fanos-text">{r.type}</span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.color}25` }}>
                        {r.priority}
                      </span>
                    </div>
                    <div className="text-[10px] text-fanos-muted mb-1">{r.org}</div>
                    <div className="text-[10px] text-fanos-dim">{r.desc}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold"
                      style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.color}25` }}>
                      {ss.icon}{r.status}
                    </div>
                    <div className="text-[9px] text-fanos-dim">{r.submitted}</div>
                    <div className="text-[9px] text-fanos-dim">Assignee: {r.assignee}</div>
                  </div>
                </div>
                {r.status === 'Pending' && (
                  <div className="flex items-center gap-2 mt-2">
                    <button className="text-[9px] font-semibold px-2.5 py-1 rounded flex items-center gap-1"
                      style={{ background: 'rgba(0,229,160,0.1)', color: '#00e5a0', border: '1px solid rgba(0,229,160,0.25)' }}>
                      <CheckCircle2 size={9} />Approve
                    </button>
                    <button className="text-[9px] font-semibold px-2.5 py-1 rounded flex items-center gap-1"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <XCircle size={9} />Reject
                    </button>
                    <button className="text-[9px] font-semibold px-2.5 py-1 rounded text-fanos-dim hover:text-fanos-accent"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      Assign
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </PageShell>
  )
}
