/**
 * Security Operations — Threat Intelligence
 * Global threat feeds, IOCs, and intelligence enrichment.
 */
import { BrainCircuit, Globe, AlertTriangle, ExternalLink, Search } from 'lucide-react'
import { useState } from 'react'
import PageShell from '@/components/ui/PageShell'

const IOCS = [
  { ioc:'192.168.56.10',    type:'IP',     threat:'SQL Injection Actor', confidence:98, source:'FANOS AI', last_seen:'2 min ago',  status:'Active' },
  { ioc:'185.220.0.14',     type:'IP',     threat:'Brute Force Origin',  confidence:95, source:'AbuseIPDB',last_seen:'8 min ago',  status:'Active' },
  { ioc:'91.105.0.4',       type:'IP',     threat:'C2 Server',           confidence:92, source:'Zeek',     last_seen:'30 min ago', status:'Active' },
  { ioc:'evildomain.xyz',   type:'Domain', threat:'DNS Tunnel Endpoint', confidence:89, source:'Zeek DNS', last_seen:'45 min ago', status:'Active' },
  { ioc:'c2.malware-host.ru',type:'Domain',threat:'Malware C2',          confidence:97, source:'Suricata', last_seen:'1 hr ago',   status:'Blocked'},
  { ioc:'sha256:a1b2c3...',  type:'Hash',  threat:'Malware Sample',      confidence:99, source:'FANOS AI', last_seen:'2 hr ago',   status:'Blocked'},
]

const INTEL_FEEDS = [
  { name:'FANOS AI Internal',   type:'Behavioral', iocs:284,  updated:'Live',       status:'Active' },
  { name:'Suricata ET Rules',   type:'Signatures', iocs:45821, updated:'Daily',     status:'Active' },
  { name:'Zeek Notices',        type:'Network',   iocs:42,   updated:'Live',        status:'Active' },
  { name:'AbuseIPDB',           type:'Reputation', iocs:12841, updated:'Hourly',    status:'Active' },
  { name:'MISP Community',      type:'Threat Intel',iocs:8452, updated:'Daily',     status:'Paused' },
  { name:'OpenPhish',           type:'Phishing',  iocs:3281,  updated:'Hourly',     status:'Active' },
]

const iocTypeColor: Record<string,string> = {
  IP:     '#00c8ff',
  Domain: '#8b5cf6',
  Hash:   '#f59e0b',
  URL:    '#00e5a0',
}
const statusStyle: Record<string,{bg:string;color:string}> = {
  Active:  { bg:'rgba(239,68,68,0.08)',  color:'#ef4444' },
  Blocked: { bg:'rgba(0,229,160,0.08)',  color:'#00e5a0' },
  Paused:  { bg:'rgba(107,114,128,0.08)',color:'#6b7280' },
}

export default function ThreatIntelligence() {
  const [search, setSearch] = useState('')
  const filtered = IOCS.filter(i =>
    i.ioc.toLowerCase().includes(search.toLowerCase()) ||
    i.threat.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageShell
      title="Threat Intelligence"
      subtitle="Active indicators of compromise, threat feeds, and security intelligence"
      badge={{ label:`${IOCS.filter(i=>i.status==='Active').length} ACTIVE IOCs`, color:'red' }}
    >
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Active IOCs',   value: IOCS.filter(i=>i.status==='Active').length,  color:'#ef4444' },
          { label:'Blocked IOCs',  value: IOCS.filter(i=>i.status==='Blocked').length, color:'#00e5a0' },
          { label:'Threat Feeds',  value: INTEL_FEEDS.filter(f=>f.status==='Active').length, color:'#00c8ff' },
          { label:'Total IOCs',    value: IOCS.length,                                  color:'#8b5cf6' },
        ].map(s=>(
          <div key={s.label} className="fanos-card p-4">
            <div className="text-[22px] font-bold" style={{color:s.color}}>{s.value}</div>
            <div className="text-[10px] text-fanos-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* IOC table */}
        <div className="xl:col-span-2 flex flex-col gap-3">
          <div className="fanos-card p-3 flex items-center gap-2.5">
            <Search size={13} className="text-fanos-dim"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search IOCs, threats, sources…"
              className="flex-1 bg-transparent border-none outline-none text-[12px] text-fanos-text placeholder:text-fanos-dim"/>
          </div>
          <div className="fanos-card">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title"><BrainCircuit size={13} className="text-fanos-accent"/>Indicators of Compromise</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black/10 border-b border-white/[0.05]">
                    {['IOC','Type','Threat','Confidence','Source','Last Seen','Status'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {filtered.map((ioc,i)=>{
                    const tc = iocTypeColor[ioc.type] ?? '#6b7280'
                    const st = statusStyle[ioc.status] ?? {bg:'rgba(255,255,255,0.04)',color:'#6b7280'}
                    return (
                      <tr key={i} className="hover:bg-white/[0.018] transition-colors">
                        <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-text max-w-[160px] truncate">{ioc.ioc}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{background:`${tc}15`,color:tc,border:`1px solid ${tc}25`}}>
                            {ioc.type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-fanos-muted max-w-[140px] truncate">{ioc.threat}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-[11px] font-bold"
                            style={{color:ioc.confidence>=95?'#ef4444':ioc.confidence>=85?'#f59e0b':'#00c8ff'}}>
                            {ioc.confidence}%
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-fanos-dim">{ioc.source}</td>
                        <td className="px-3 py-2.5 text-[9px] text-fanos-dim whitespace-nowrap">{ioc.last_seen}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                            style={{background:st.bg,color:st.color,border:`1px solid ${st.color}25`}}>
                            {ioc.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Feed status */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Globe size={13} className="text-fanos-accent"/>Intelligence Feeds</div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {INTEL_FEEDS.map(f=>{
              const st = f.status==='Active'
                ? {bg:'rgba(0,229,160,0.08)',color:'#00e5a0'}
                : {bg:'rgba(107,114,128,0.08)',color:'#6b7280'}
              return (
                <div key={f.name} className="px-4 py-3 hover:bg-white/[0.018] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-[11px] font-semibold text-fanos-text">{f.name}</div>
                    <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{background:st.bg,color:st.color,border:`1px solid ${st.color}25`}}>
                      {f.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-fanos-dim">
                    <span>{f.type}</span>
                    <span>·</span>
                    <span>{f.iocs.toLocaleString()} IOCs</span>
                    <span>·</span>
                    <span>{f.updated}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-4 py-3 border-t border-white/[0.06]">
            <button className="w-full flex items-center gap-2 text-[11px] text-fanos-dim hover:text-fanos-accent transition-colors">
              <ExternalLink size={11}/>
              Add Intelligence Feed
            </button>
          </div>
        </div>
      </div>

      {/* MITRE summary */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><AlertTriangle size={13} className="text-fanos-amber"/>Active Threat Actors</div>
        </div>
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { actor:'Unknown Actor A', ttps:['T1190','T1059','T1078'], campaigns:2, first_seen:'Sep 12', color:'#ef4444' },
            { actor:'Unknown Actor B', ttps:['T1110','T1021','T1071'], campaigns:1, first_seen:'Sep 15', color:'#f59e0b' },
            { actor:'Unknown Actor C', ttps:['T1071','T1095'],          campaigns:1, first_seen:'Sep 14', color:'#8b5cf6' },
          ].map(a=>(
            <div key={a.actor} className="rounded-lg p-3"
              style={{background:`${a.color}08`,border:`1px solid ${a.color}20`}}>
              <div className="text-[11px] font-bold mb-1" style={{color:a.color}}>{a.actor}</div>
              <div className="text-[9px] text-fanos-dim mb-1.5">First seen: {a.first_seen} · {a.campaigns} campaign(s)</div>
              <div className="flex flex-wrap gap-1">
                {a.ttps.map(t=>(
                  <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                    style={{background:`${a.color}15`,color:a.color,border:`1px solid ${a.color}25`}}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
