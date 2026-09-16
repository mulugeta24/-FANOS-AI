/**
 * Admin Portal — Audit Logs
 * Platform-level audit trail (user actions, config changes, approvals).
 */
import { ScrollText, Search, Filter } from 'lucide-react'
import { useState } from 'react'
import PageShell from '@/components/ui/PageShell'

type ActionType = 'Login' | 'Config' | 'Approval' | 'User' | 'Deployment' | 'System'

interface AuditEntry {
  id: string; time: string; user: string; action: ActionType; resource: string
  detail: string; ip: string; result: 'Success' | 'Failure' | 'Warning'
}

const LOGS: AuditEntry[] = [
  { id:'AUD-001', time:'2026-09-15 14:22:11', user:'mulugeta.ababi', action:'Login',      resource:'Admin Portal',          detail:'Admin login from trusted IP',           ip:'196.188.0.1',  result:'Success' },
  { id:'AUD-002', time:'2026-09-15 14:18:43', user:'mulugeta.ababi', action:'Approval',   resource:'REQ-002 GlobalBank',     detail:'Approved enterprise upgrade',           ip:'196.188.0.1',  result:'Success' },
  { id:'AUD-003', time:'2026-09-15 13:55:02', user:'kidist.worku',   action:'Config',     resource:'WAF — NovaTech',         detail:'Updated WAF ruleset OWASP CRS v3.3',    ip:'196.188.0.2',  result:'Success' },
  { id:'AUD-004', time:'2026-09-15 13:40:18', user:'mulugeta.ababi', action:'User',       resource:'SOC Analyst 2',          detail:'Disabled MFA — policy violation noted', ip:'196.188.0.1',  result:'Warning' },
  { id:'AUD-005', time:'2026-09-15 12:30:07', user:'system',         action:'Deployment', resource:'DEP-002 GlobalBank WAF', detail:'Deployment phase 2 completed',          ip:'internal',     result:'Success' },
  { id:'AUD-006', time:'2026-09-15 11:10:55', user:'abel.girma',     action:'Login',      resource:'Customer Portal',        detail:'Login from new device/location',        ip:'41.66.12.88',  result:'Warning' },
  { id:'AUD-007', time:'2026-09-15 10:05:34', user:'unknown',        action:'Login',      resource:'Admin Portal',           detail:'Failed login — wrong password x3',      ip:'185.220.0.14', result:'Failure' },
  { id:'AUD-008', time:'2026-09-15 09:22:00', user:'mulugeta.ababi', action:'System',     resource:'API Keys',               detail:'Regenerated system API key',            ip:'196.188.0.1',  result:'Success' },
]

const actionColor: Record<ActionType, string> = {
  Login:      '#00c8ff',
  Config:     '#8b5cf6',
  Approval:   '#00e5a0',
  User:       '#f59e0b',
  Deployment: '#06b6d4',
  System:     '#6b7280',
}

const resultStyle: Record<string,{bg:string;color:string}> = {
  Success: { bg:'rgba(0,229,160,0.08)',  color:'#00e5a0' },
  Failure: { bg:'rgba(239,68,68,0.08)',  color:'#ef4444' },
  Warning: { bg:'rgba(245,158,11,0.08)', color:'#f59e0b' },
}

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('')
  const filtered = LOGS.filter(l =>
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.detail.toLowerCase().includes(search.toLowerCase()) ||
    l.resource.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageShell
      title="Audit Logs"
      subtitle="Complete platform audit trail — user actions, config changes, and system events"
      badge={{ label: `${LOGS.length} ENTRIES`, color: 'green' }}
    >
      {/* Search / filter bar */}
      <div className="fanos-card p-3 flex items-center gap-2.5">
        <Search size={13} className="text-fanos-dim" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search user, resource, or action…"
          className="flex-1 bg-transparent border-none outline-none text-[12px] text-fanos-text placeholder:text-fanos-dim"
        />
        <button className="flex items-center gap-1.5 text-[10px] text-fanos-dim hover:text-fanos-accent px-2 py-1 rounded"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <Filter size={10} />Filter
        </button>
      </div>

      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><ScrollText size={13} className="text-fanos-accent"/>Platform Audit Trail</div>
          <span className="text-[10px] text-fanos-dim">{filtered.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Time','User','Action','Resource','Detail','IP','Result'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map(l=>{
                const rs = resultStyle[l.result]
                const ac = actionColor[l.action]
                return (
                  <tr key={l.id} className="hover:bg-white/[0.018] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-dim whitespace-nowrap">{l.time}</td>
                    <td className="px-3 py-2.5 text-[10px] font-medium text-fanos-muted">{l.user}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                        style={{ background:`${ac}15`, color:ac, border:`1px solid ${ac}25` }}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-muted max-w-[160px] truncate">{l.resource}</td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-dim max-w-[200px] truncate">{l.detail}</td>
                    <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-dim">{l.ip}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded"
                        style={{ background:rs.bg, color:rs.color, border:`1px solid ${rs.color}25` }}>
                        {l.result}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
