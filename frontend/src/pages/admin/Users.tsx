import { Users as UsersIcon, Plus, Edit2, Trash2 } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'

const USERS = [
  { id:1, name:'Mulugeta Ababi',   email:'mulugeta.ababi@fanos.ai',  role:'Administrator', mfa:true,  status:'Active',   last:'Now'        },
  { id:2, name:'SOC Analyst 1',    email:'analyst1@fanos.ai',         role:'SOC Analyst',   mfa:true,  status:'Active',   last:'5 min ago'  },
  { id:3, name:'SOC Analyst 2',    email:'analyst2@fanos.ai',         role:'SOC Analyst',   mfa:false, status:'Active',   last:'1 hr ago'   },
  { id:4, name:'Security Manager', email:'manager@fanos.ai',          role:'Manager',       mfa:true,  status:'Active',   last:'2 hr ago'   },
  { id:5, name:'Auditor',          email:'auditor@fanos.ai',          role:'Read-Only',     mfa:false, status:'Inactive', last:'3 days ago' },
]

const roleColor: Record<string,string> = {
  Administrator: 'bg-red-500/10 text-fanos-red border border-red-500/25',
  'SOC Analyst':  'bg-cyan-500/10 text-fanos-accent border border-fanos-accent/25',
  Manager:        'bg-violet-500/10 text-fanos-purple border border-fanos-purple/25',
  'Read-Only':    'bg-white/5 text-fanos-muted border border-white/10',
}

export default function Users() {
  return (
    <PageShell title="Users" subtitle="Manage FANOS AI platform user accounts and permissions"
      badge={{ label:`${USERS.filter(u=>u.status==='Active').length} ACTIVE`, color:'green' }}
      actions={<button className="fanos-btn"><Plus size={11}/>Add User</button>}>

      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><UsersIcon size={13} className="text-fanos-accent"/>Platform Users</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Name','Email','Role','MFA','Status','Last Active','Actions'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {USERS.map(u=>(
                <tr key={u.id} className="hover:bg-white/[0.018] transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{background:'linear-gradient(135deg,#0a3d62,#1565c0)'}}>
                        {u.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                      </div>
                      <span className="text-[11px] font-medium text-fanos-text">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{u.email}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold ${roleColor[u.role]??roleColor['Read-Only']}`}>{u.role}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={u.mfa?'status-blocked':'status-alert'}>{u.mfa?'ENABLED':'DISABLED'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={u.status==='Active'?'status-blocked':'status-monitored'}>{u.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{u.last}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded cursor-pointer"
                        style={{background:'rgba(0,200,255,.1)',color:'#00c8ff',border:'1px solid rgba(0,200,255,.25)'}}>
                        <Edit2 size={9}/>Edit
                      </button>
                      <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded cursor-pointer"
                        style={{background:'rgba(239,68,68,.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,.25)'}}>
                        <Trash2 size={9}/>Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
