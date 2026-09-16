import { ScrollText } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'

const LOGS = [
  { id:'LOG-001', user:'Mulugeta Ababi', action:'LOGIN',           resource:'Platform',           ip:'10.0.0.5',  result:'SUCCESS', time:'Just now'    },
  { id:'LOG-002', user:'FANOS AI',       action:'BLOCK_IP',        resource:'192.168.56.10',      ip:'system',    result:'SUCCESS', time:'2 min ago'   },
  { id:'LOG-003', user:'Mulugeta Ababi', action:'VIEW_INCIDENT',   resource:'INC-2026-001',       ip:'10.0.0.5',  result:'SUCCESS', time:'3 min ago'   },
  { id:'LOG-004', user:'FANOS AI',       action:'CREATE_INCIDENT', resource:'INC-2026-004',       ip:'system',    result:'SUCCESS', time:'5 min ago'   },
  { id:'LOG-005', user:'SOC Analyst 1',  action:'ACK_ALERT',       resource:'ALT-003',            ip:'10.0.0.8',  result:'SUCCESS', time:'8 min ago'   },
  { id:'LOG-006', user:'FANOS AI',       action:'WAF_RULE',        resource:'Rule CRS-942100',    ip:'system',    result:'SUCCESS', time:'8 min ago'   },
  { id:'LOG-007', user:'SOC Analyst 2',  action:'LOGIN',           resource:'Platform',           ip:'10.0.0.9',  result:'FAILED',  time:'10 min ago'  },
  { id:'LOG-008', user:'Mulugeta Ababi', action:'EXPORT_REPORT',   resource:'Security Analytics', ip:'10.0.0.5',  result:'SUCCESS', time:'15 min ago'  },
]

export default function AuditLogs() {
  return (
    <PageShell title="Audit Logs" subtitle="Complete audit trail of all platform actions and events">
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><ScrollText size={13} className="text-fanos-accent"/>Audit Trail</div>
          <button className="fanos-btn text-[9px] py-1 px-2.5">Export Logs</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Log ID','User','Action','Resource','IP Address','Result','Time'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {LOGS.map(l=>(
                <tr key={l.id} className="hover:bg-white/[0.018] transition-colors">
                  <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent">{l.id}</td>
                  <td className="px-3 py-2.5 text-[11px] text-fanos-text font-medium whitespace-nowrap">{l.user}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[10px] font-semibold text-fanos-accent bg-fanos-accent/10 px-1.5 py-0.5 rounded">{l.action}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{l.resource}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{l.ip}</td>
                  <td className="px-3 py-2.5">
                    <span className={l.result==='SUCCESS'?'status-blocked':'status-alert'}>{l.result}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{l.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-white/[0.04] flex justify-between items-center">
          <span className="text-[10px] text-fanos-dim">Showing {LOGS.length} most recent entries</span>
          <button className="fanos-btn text-[9px] py-1 px-2.5">Load More</button>
        </div>
      </div>
    </PageShell>
  )
}
