import { Ban, Plus, Trash2 } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'

const IPS = [
  { ip: '192.168.56.10', reason: 'SQL Injection Campaign',   by: 'FANOS AI', ago: '2 min ago',  active: true },
  { ip: '192.168.56.21', reason: 'Brute Force Attack',        by: 'FANOS AI', ago: '8 min ago',  active: true },
  { ip: '192.168.56.31', reason: 'Port Scan / Recon',         by: 'FANOS AI', ago: '15 min ago', active: true },
  { ip: '172.16.0.88',   reason: 'Command Injection',         by: 'FANOS AI', ago: '20 min ago', active: true },
  { ip: '10.0.0.44',     reason: 'XSS Attack Wave',           by: 'FANOS AI', ago: '30 min ago', active: true },
  { ip: '10.0.1.99',     reason: 'DDoS Source',               by: 'SOC Team', ago: '1 hr ago',   active: true },
  { ip: '203.0.113.42',  reason: 'Credential Stuffing',       by: 'FANOS AI', ago: '2 hr ago',   active: false },
  { ip: '198.51.100.5',  reason: 'Malware Callback',          by: 'SOC Team', ago: '4 hr ago',   active: false },
]

export default function BlockedIPs() {
  return (
    <PageShell title="Blocked IPs" subtitle="IP addresses currently blocked by FANOS AI prevention engine"
      badge={{ label: `${IPS.filter(i=>i.active).length} ACTIVE`, color: 'red' }}
      actions={<button className="fanos-btn"><Plus size={11}/>Block IP</button>}>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Blocked',  value: IPS.length,                      color: '#00c8ff' },
          { label: 'Active Blocks',  value: IPS.filter(i=>i.active).length,  color: '#ef4444' },
          { label: 'Auto-Blocked',   value: IPS.filter(i=>i.by==='FANOS AI').length, color: '#8b5cf6' },
        ].map(s=>(
          <div key={s.label} className="fanos-card px-4 py-3">
            <div className="text-[9px] uppercase tracking-widest text-fanos-dim">{s.label}</div>
            <div className="text-[26px] font-bold mt-1" style={{color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><Ban size={13} className="text-fanos-accent"/>Blocked IP List</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['IP Address','Reason','Blocked By','Time','Status','Action'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {IPS.map(ip=>(
                <tr key={ip.ip} className="hover:bg-white/[0.018] transition-colors">
                  <td className="px-3 py-2.5 font-mono text-[11px] text-fanos-accent">{ip.ip}</td>
                  <td className="px-3 py-2.5 text-[11px] text-fanos-text">{ip.reason}</td>
                  <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{ip.by}</td>
                  <td className="px-3 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{ip.ago}</td>
                  <td className="px-3 py-2.5">
                    <span className={ip.active?'status-blocked':'status-monitored'}>{ip.active?'ACTIVE':'EXPIRED'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded cursor-pointer"
                      style={{background:'rgba(239,68,68,.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,.25)'}}>
                      <Trash2 size={10}/>Unblock
                    </button>
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
