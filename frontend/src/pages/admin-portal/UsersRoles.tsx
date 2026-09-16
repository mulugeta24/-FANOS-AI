import { UserCog, Plus, Edit2, Trash2, Shield } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'

const USERS = [
  { id:1, name:'Mulugeta Ababi',   email:'mulugeta.ababi@fanos.ai', role:'Admin',           mfa:true,  status:'Active',   last:'Now'        },
  { id:2, name:'Kidist Worku',     email:'kidist@fanos.ai',         role:'Security Admin',  mfa:true,  status:'Active',   last:'2 min ago'  },
  { id:3, name:'SOC Analyst 1',    email:'analyst1@fanos.ai',       role:'SOC Analyst',     mfa:true,  status:'Active',   last:'5 min ago'  },
  { id:4, name:'SOC Analyst 2',    email:'analyst2@fanos.ai',       role:'SOC Analyst',     mfa:false, status:'Active',   last:'1 hr ago'   },
  { id:5, name:'Security Manager', email:'manager@fanos.ai',        role:'Manager',         mfa:true,  status:'Active',   last:'2 hr ago'   },
  { id:6, name:'Auditor',          email:'auditor@fanos.ai',        role:'Read-Only',       mfa:false, status:'Inactive', last:'3 days ago' },
]

const ROLES = [
  { name: 'Admin',          perms: ['All portals', 'Full platform access'],                              color: '#ef4444' },
  { name: 'Security Admin', perms: ['Security Operations', 'WAF/IDS config', 'Incident management'],    color: '#8b5cf6' },
  { name: 'SOC Analyst',    perms: ['Security Operations', 'View alerts/incidents', 'Investigations'],  color: '#00c8ff' },
  { name: 'Manager',        perms: ['Admin Portal', 'Customers', 'Reports'],                             color: '#f59e0b' },
  { name: 'Read-Only',      perms: ['View only', 'No write access'],                                     color: '#6b7280' },
]

const roleColor: Record<string,string> = {
  'Admin':          '#ef4444',
  'Security Admin': '#8b5cf6',
  'SOC Analyst':    '#00c8ff',
  'Manager':        '#f59e0b',
  'Read-Only':      '#6b7280',
}

export default function UsersRoles() {
  return (
    <PageShell
      title="Users & Roles"
      subtitle="Manage platform users, roles, and access permissions"
      badge={{ label: `${USERS.filter(u => u.status === 'Active').length} ACTIVE`, color: 'green' }}
      actions={<button className="fanos-btn"><Plus size={11} />Add User</button>}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Users table */}
        <div className="xl:col-span-2 fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><UserCog size={13} className="text-fanos-accent" />Platform Users</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/10 border-b border-white/[0.05]">
                  {['User','Role','MFA','Status','Last Active','Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {USERS.map(u => {
                  const rc = roleColor[u.role] ?? '#6b7280'
                  const initials = u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.018] transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: `${rc}20`, border: `1px solid ${rc}30`, color: rc }}>
                            {initials}
                          </div>
                          <div>
                            <div className="text-[11px] font-medium text-fanos-text">{u.name}</div>
                            <div className="text-[9px] text-fanos-dim">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded"
                          style={{ background: `${rc}15`, color: rc, border: `1px solid ${rc}25` }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`flex items-center gap-1 text-[9px] font-semibold ${u.mfa ? 'text-fanos-green' : 'text-fanos-red'}`}>
                          <Shield size={9} />{u.mfa ? 'ON' : 'OFF'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={u.status === 'Active' ? 'status-blocked' : 'status-monitored'}>{u.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{u.last}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded"
                            style={{ background: 'rgba(0,200,255,.1)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.25)' }}>
                            <Edit2 size={9} />Edit
                          </button>
                          <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded"
                            style={{ background: 'rgba(239,68,68,.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,.25)' }}>
                            <Trash2 size={9} />Remove
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

        {/* Roles panel */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Shield size={13} className="text-fanos-accent" />Role Definitions</div>
          </div>
          <div className="px-4 pb-4 space-y-3">
            {ROLES.map(r => (
              <div key={r.name} className="rounded-lg p-3"
                style={{ background: `${r.color}08`, border: `1px solid ${r.color}20` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold" style={{ color: r.color }}>{r.name}</span>
                  <button className="text-[9px] text-fanos-dim hover:text-fanos-accent">Edit</button>
                </div>
                <div className="space-y-0.5">
                  {r.perms.map(p => (
                    <div key={p} className="flex items-center gap-1.5 text-[10px] text-fanos-muted">
                      <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: r.color }} />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
