/**
 * Security Operations — Assets
 * Monitored hosts and network assets with security posture.
 */
import { Package, Shield, AlertTriangle, Server } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'

const ASSETS = [
  { id:1, name:'web-server-01',   ip:'10.0.0.1',  type:'Web Server',   os:'Ubuntu 22.04',  agent:'Wazuh',    risk:'LOW',    alerts:2, status:'ONLINE',   sensor:'WAF,Zeek'  },
  { id:2, name:'api-server-01',   ip:'10.0.0.5',  type:'API Server',   os:'Ubuntu 22.04',  agent:'Wazuh',    risk:'HIGH',   alerts:8, status:'ONLINE',   sensor:'Suricata'  },
  { id:3, name:'db-server-01',    ip:'10.0.0.10', type:'Database',     os:'CentOS 8',      agent:'Wazuh',    risk:'MEDIUM', alerts:3, status:'ONLINE',   sensor:'Zeek'      },
  { id:4, name:'app-server-02',   ip:'10.0.0.15', type:'App Server',   os:'Windows Server',agent:'Wazuh',    risk:'MEDIUM', alerts:5, status:'ONLINE',   sensor:'Suricata'  },
  { id:5, name:'firewall-01',     ip:'10.0.0.254',type:'Firewall',     os:'pfSense 2.7',   agent:'SNMP',     risk:'LOW',    alerts:0, status:'ONLINE',   sensor:'Zeek'      },
  { id:6, name:'backup-server-01',ip:'10.0.1.5',  type:'Backup',       os:'Ubuntu 20.04',  agent:'Wazuh',    risk:'LOW',    alerts:1, status:'DEGRADED', sensor:'Zeek'      },
]

const riskStyle: Record<string,{bg:string;color:string}> = {
  HIGH:   { bg:'rgba(239,68,68,0.08)',   color:'#ef4444' },
  MEDIUM: { bg:'rgba(245,158,11,0.08)',  color:'#f59e0b' },
  LOW:    { bg:'rgba(0,229,160,0.08)',   color:'#00e5a0' },
}

const statusStyle: Record<string,{bg:string;color:string}> = {
  ONLINE:   { bg:'rgba(0,229,160,0.08)',  color:'#00e5a0' },
  DEGRADED: { bg:'rgba(245,158,11,0.08)', color:'#f59e0b' },
  OFFLINE:  { bg:'rgba(239,68,68,0.08)',  color:'#ef4444' },
}

export default function SecOpsAssets() {
  return (
    <PageShell
      title="Assets"
      subtitle="Monitored hosts, sensors, and network assets with security posture scoring"
      badge={{ label:`${ASSETS.filter(a=>a.status==='ONLINE').length} ONLINE`, color:'green' }}
    >
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Total Assets',   value:ASSETS.length,                                       color:'#00c8ff', icon:<Package size={14}/> },
          { label:'High Risk',      value:ASSETS.filter(a=>a.risk==='HIGH').length,            color:'#ef4444', icon:<AlertTriangle size={14}/> },
          { label:'Online',         value:ASSETS.filter(a=>a.status==='ONLINE').length,        color:'#00e5a0', icon:<Server size={14}/> },
          { label:'With Alerts',    value:ASSETS.filter(a=>a.alerts>0).length,                 color:'#f59e0b', icon:<Shield size={14}/> },
        ].map(s=>(
          <div key={s.label} className="fanos-card p-4 flex items-center gap-3">
            <span style={{color:s.color}}>{s.icon}</span>
            <div>
              <div className="text-[20px] font-bold" style={{color:s.color}}>{s.value}</div>
              <div className="text-[10px] text-fanos-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Asset table */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><Package size={13} className="text-fanos-accent"/>Monitored Assets</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Asset','IP','Type','OS','Agent','Risk','Alerts','Status','Sensors'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {ASSETS.map(a=>{
                const rs = riskStyle[a.risk]    ?? {bg:'rgba(255,255,255,0.04)',color:'#6b7280'}
                const ss = statusStyle[a.status] ?? {bg:'rgba(255,255,255,0.04)',color:'#6b7280'}
                return (
                  <tr key={a.id} className="hover:bg-white/[0.018] transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Server size={12} className="text-fanos-accent flex-shrink-0"/>
                        <span className="text-[11px] font-medium text-fanos-text">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{a.ip}</td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{a.type}</td>
                    <td className="px-3 py-2.5 text-[9px] text-fanos-dim">{a.os}</td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-accent">{a.agent}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{background:rs.bg,color:rs.color,border:`1px solid ${rs.color}25`}}>
                        {a.risk}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] font-bold"
                        style={{color:a.alerts>5?'#ef4444':a.alerts>0?'#f59e0b':'#00e5a0'}}>
                        {a.alerts}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{background:ss.bg,color:ss.color,border:`1px solid ${ss.color}25`}}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[9px] text-fanos-dim">{a.sensor}</td>
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
