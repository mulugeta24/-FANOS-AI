import { Building2, Plus, Search, Edit2, ExternalLink, Users, Package } from 'lucide-react'
import { useState } from 'react'
import PageShell from '@/components/ui/PageShell'

const ORGS = [
  { id: 1, name: 'Acme Corporation',   domain: 'acme.com',       plan: 'Enterprise', status: 'Active',    customers: 5, sensors: 28, created: 'Jan 2025' },
  { id: 2, name: 'GlobalBank Group',   domain: 'globalbank.net', plan: 'Business',   status: 'Active',    customers: 3, sensors: 14, created: 'Mar 2025' },
  { id: 3, name: 'NovaTech Systems',   domain: 'novatech.co',    plan: 'Business',   status: 'Active',    customers: 2, sensors: 9,  created: 'May 2025' },
  { id: 4, name: 'DataGuard Africa',   domain: 'dataguard.sa',   plan: 'Enterprise', status: 'Active',    customers: 4, sensors: 22, created: 'Jun 2025' },
  { id: 5, name: 'SecureOps Inc',      domain: 'secureops.io',   plan: 'Starter',    status: 'Trial',     customers: 1, sensors: 2,  created: 'Aug 2025' },
  { id: 6, name: 'CyberShield Ltd',    domain: 'cybershield.io', plan: 'Business',   status: 'Suspended', customers: 2, sensors: 0,  created: 'Apr 2025' },
]

const planColor: Record<string,string> = {
  Enterprise: '#8b5cf6',
  Business:   '#00c8ff',
  Starter:    '#f59e0b',
}

const statusColor: Record<string, { bg: string; color: string }> = {
  Active:    { bg: 'rgba(0,229,160,0.08)',  color: '#00e5a0' },
  Trial:     { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' },
  Suspended: { bg: 'rgba(239,68,68,0.08)',  color: '#ef4444' },
}

export default function Organizations() {
  const [search, setSearch] = useState('')
  const filtered = ORGS.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.domain.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageShell
      title="Organizations"
      subtitle="Manage multi-tenant organizations on the FANOS platform"
      badge={{ label: `${ORGS.filter(o => o.status === 'Active').length} ACTIVE`, color: 'green' }}
      actions={
        <button className="fanos-btn">
          <Plus size={11} /> Add Organization
        </button>
      }
    >
      {/* Search */}
      <div className="fanos-card p-3 flex items-center gap-2.5">
        <Search size={13} className="text-fanos-dim" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search organizations or domains…"
          className="flex-1 bg-transparent border-none outline-none text-[12px] text-fanos-text placeholder:text-fanos-dim"
        />
        <span className="text-[10px] text-fanos-dim">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><Building2 size={13} className="text-fanos-accent" />Organizations</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Organization', 'Domain', 'Plan', 'Status', 'Customers', 'Sensors', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map(org => {
                const st = statusColor[org.status]
                const pc = planColor[org.plan]
                return (
                  <tr key={org.id} className="hover:bg-white/[0.018] transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: `${pc}25`, border: `1px solid ${pc}30`, color: pc }}>
                          {org.name[0]}
                        </div>
                        <span className="text-[11px] font-medium text-fanos-text">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{org.domain}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded"
                        style={{ background: `${pc}15`, color: pc, border: `1px solid ${pc}25` }}>
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded"
                        style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}25` }}>
                        {org.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-[10px] text-fanos-muted">
                        <Users size={10} /> {org.customers}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-[10px] text-fanos-muted">
                        <Package size={10} /> {org.sensors}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-dim">{org.created}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded cursor-pointer"
                          style={{ background: 'rgba(0,200,255,.1)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.25)' }}>
                          <Edit2 size={9} /> Edit
                        </button>
                        <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded cursor-pointer"
                          style={{ background: 'rgba(139,92,246,.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.25)' }}>
                          <ExternalLink size={9} /> View
                        </button>
                      </div>
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
