import { Users, Plus, Search, Edit2, Mail, Shield } from 'lucide-react'
import { useState } from 'react'
import PageShell from '@/components/ui/PageShell'

const CUSTOMERS = [
  { id:1,  name:'Mulugeta Ababi',      email:'mulugeta@acme.com',       org:'Acme Corporation',  plan:'Enterprise', status:'Active',    sensors:12, mfa:true,  joined:'Jan 15, 2025' },
  { id:2,  name:'Tigist Bekele',       email:'tigist@globalbank.net',   org:'GlobalBank Group',  plan:'Business',   status:'Active',    sensors:6,  mfa:true,  joined:'Mar 2, 2025'  },
  { id:3,  name:'Yonas Haile',         email:'yonas@novatech.co',       org:'NovaTech Systems',  plan:'Business',   status:'Active',    sensors:8,  mfa:true,  joined:'May 10, 2025' },
  { id:4,  name:'Selam Tesfaye',       email:'selam@dataguard.sa',      org:'DataGuard Africa',  plan:'Enterprise', status:'Active',    sensors:15, mfa:true,  joined:'Jun 1, 2025'  },
  { id:5,  name:'Abel Girma',          email:'abel@secureops.io',       org:'SecureOps Inc',     plan:'Starter',    status:'Trial',     sensors:2,  mfa:false, joined:'Aug 20, 2025' },
  { id:6,  name:'Meron Alemu',         email:'meron@cybershield.io',    org:'CyberShield Ltd',   plan:'Business',   status:'Suspended', sensors:0,  mfa:false, joined:'Apr 5, 2025'  },
  { id:7,  name:'Dawit Mengistu',      email:'dawit@globalbank.net',    org:'GlobalBank Group',  plan:'Business',   status:'Active',    sensors:4,  mfa:true,  joined:'Mar 15, 2025' },
  { id:8,  name:'Hiwot Tadesse',       email:'hiwot@acme.com',          org:'Acme Corporation',  plan:'Enterprise', status:'Active',    sensors:5,  mfa:true,  joined:'Feb 8, 2025'  },
]

const statusStyle: Record<string, { bg: string; color: string }> = {
  Active:    { bg: 'rgba(0,229,160,0.08)',  color: '#00e5a0' },
  Trial:     { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' },
  Suspended: { bg: 'rgba(239,68,68,0.08)',  color: '#ef4444' },
}
const planColor: Record<string,string> = {
  Enterprise: '#8b5cf6',
  Business:   '#00c8ff',
  Starter:    '#f59e0b',
}

export default function Customers() {
  const [search, setSearch] = useState('')
  const filtered = CUSTOMERS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.org.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageShell
      title="Customers"
      subtitle="Manage customer accounts across all organizations"
      badge={{ label: `${CUSTOMERS.filter(c => c.status === 'Active').length} ACTIVE`, color: 'green' }}
      actions={
        <button className="fanos-btn">
          <Plus size={11} /> Onboard Customer
        </button>
      }
    >
      {/* Search + stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-3 fanos-card p-3 flex items-center gap-2.5">
          <Search size={13} className="text-fanos-dim" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers, emails, or organizations…"
            className="flex-1 bg-transparent border-none outline-none text-[12px] text-fanos-text placeholder:text-fanos-dim"
          />
        </div>
        {[
          { label: 'Total', value: CUSTOMERS.length, color: '#00c8ff' },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ].map(s => (
          <div key={s.label} className="fanos-card p-3 flex items-center gap-3">
            <div className="text-[20px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] text-fanos-muted">{s.label} Customers</div>
          </div>
        ))}
        <div className="fanos-card p-3 flex items-center gap-3">
          <div className="text-[20px] font-bold text-fanos-green">{CUSTOMERS.filter(c => c.status === 'Active').length}</div>
          <div className="text-[11px] text-fanos-muted">Active</div>
        </div>
        <div className="fanos-card p-3 flex items-center gap-3">
          <div className="text-[20px] font-bold text-fanos-amber">{CUSTOMERS.filter(c => c.status === 'Trial').length}</div>
          <div className="text-[11px] text-fanos-muted">Trial</div>
        </div>
      </div>

      {/* Table */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><Users size={13} className="text-fanos-accent" />Customer Accounts</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Customer', 'Organization', 'Plan', 'Status', 'Sensors', 'MFA', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map(c => {
                const st = statusStyle[c.status]
                const pc = planColor[c.plan]
                const initials = c.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
                return (
                  <tr key={c.id} className="hover:bg-white/[0.018] transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#0a3d62,#1565c0)' }}>
                          {initials}
                        </div>
                        <div>
                          <div className="text-[11px] font-medium text-fanos-text">{c.name}</div>
                          <div className="text-[9px] text-fanos-dim">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{c.org}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded"
                        style={{ background: `${pc}15`, color: pc, border: `1px solid ${pc}25` }}>
                        {c.plan}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded"
                        style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}25` }}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{c.sensors}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-[9px] font-semibold"
                        style={{ color: c.mfa ? '#00e5a0' : '#ef4444' }}>
                        <Shield size={9} />
                        {c.mfa ? 'ON' : 'OFF'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{c.joined}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded"
                          style={{ background: 'rgba(0,200,255,.1)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.25)' }}>
                          <Edit2 size={9} />Edit
                        </button>
                        <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded"
                          style={{ background: 'rgba(139,92,246,.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.25)' }}>
                          <Mail size={9} />Contact
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
