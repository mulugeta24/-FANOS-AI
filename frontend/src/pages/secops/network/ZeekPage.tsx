/**
 * Security Operations → Network Security → Zeek
 * Zeek Network Security Monitor — connection analysis and protocol visibility.
 */
import { Network, Activity, Globe, Lock, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import PageShell from '@/components/ui/PageShell'

const TABS = ['Overview','Connections','DNS','HTTP','TLS','Notices'] as const
type Tab = typeof TABS[number]

const CONNECTIONS = [
  { time:'14:22:05', src:'192.168.56.10:51234', dst:'10.0.0.5:22',   proto:'TCP',  bytes:'2.1 KB',  dur:'0.3s',  state:'SF',  notice:'Brute Force'   },
  { time:'14:21:44', src:'10.0.1.22:49320',     dst:'8.8.8.8:53',    proto:'UDP',  bytes:'512 B',   dur:'0.01s', state:'SF',  notice:'DNS Tunnel'    },
  { time:'14:20:33', src:'192.168.1.100:60234', dst:'10.0.0.1:443',  proto:'TCP',  bytes:'14.2 KB', dur:'1.2s',  state:'SF',  notice:'—'             },
  { time:'14:19:55', src:'91.105.0.4:443',      dst:'10.0.1.15:52001',proto:'TCP', bytes:'8.4 KB',  dur:'12.4s', state:'SF',  notice:'C2 Beacon'     },
  { time:'14:18:22', src:'192.168.56.31:34567', dst:'10.0.0.0/24',   proto:'TCP',  bytes:'420 B',   dur:'2.1s',  state:'RSTO',notice:'Port Scan'      },
]

const DNS_QUERIES = [
  { time:'14:22:10', src:'10.0.1.22',    query:'suspicious-long-subdomain.evildomain.xyz', type:'A',   answer:'185.220.0.1',  flag:'Tunnel'   },
  { time:'14:21:55', src:'10.0.0.100',   query:'api.fanos.ai',                              type:'A',   answer:'10.0.0.5',    flag:'—'        },
  { time:'14:20:44', src:'10.0.0.88',    query:'updates.microsoft.com',                     type:'A',   answer:'13.107.4.52', flag:'—'        },
  { time:'14:19:33', src:'192.168.1.50', query:'c2.malware-host.ru',                         type:'A',   answer:'NXDOMAIN',   flag:'Blocked'  },
  { time:'14:18:22', src:'10.0.1.15',    query:'*.d4t4exfil.io',                             type:'TXT', answer:'<data>',      flag:'Exfil?'   },
]

const TLS_EVENTS = [
  { time:'14:22:05', src:'10.0.0.15',   dst:'91.105.0.4:443',    version:'TLS 1.3', cipher:'TLS_AES_256_GCM_SHA384',  sni:'cdn.legit.com',      flag:'C2 Pattern'   },
  { time:'14:21:30', src:'10.0.0.100',  dst:'142.250.80.78:443', version:'TLS 1.3', cipher:'TLS_AES_128_GCM_SHA256',  sni:'www.google.com',     flag:'—'            },
  { time:'14:20:15', src:'10.0.1.22',   dst:'185.220.0.4:443',   version:'TLS 1.2', cipher:'TLS_RSA_WITH_AES_128',    sni:'<empty>',            flag:'Weak Cipher'  },
]

const noticeColor: Record<string,{bg:string;color:string}> = {
  'Brute Force': { bg:'rgba(239,68,68,0.1)',  color:'#ef4444' },
  'DNS Tunnel':  { bg:'rgba(245,158,11,0.1)', color:'#f59e0b' },
  'C2 Beacon':   { bg:'rgba(239,68,68,0.1)',  color:'#ef4444' },
  'Port Scan':   { bg:'rgba(245,158,11,0.1)', color:'#f59e0b' },
  'C2 Pattern':  { bg:'rgba(239,68,68,0.1)',  color:'#ef4444' },
  'Weak Cipher': { bg:'rgba(245,158,11,0.1)', color:'#f59e0b' },
  'Blocked':     { bg:'rgba(0,229,160,0.08)', color:'#00e5a0' },
  'Exfil?':      { bg:'rgba(239,68,68,0.1)',  color:'#ef4444' },
  '—':           { bg:'transparent',           color:'#4a6070' },
}

export default function ZeekPage() {
  const [tab, setTab] = useState<Tab>('Overview')

  return (
    <PageShell
      title="Zeek — Network Security Monitor"
      subtitle="Full network visibility: connections, protocols, DNS, TLS, and behavioral notices"
      badge={{ label:'ONLINE', color:'green' }}
    >
      {/* Engine info */}
      <div className="fanos-card p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[16px] font-black"
          style={{background:'rgba(139,92,246,0.15)',border:'1px solid rgba(139,92,246,0.3)',color:'#8b5cf6'}}>
          Z
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-bold text-white">Zeek Network Security Monitor</div>
          <div className="text-[11px] text-fanos-muted mt-0.5">v5.0.1 · Passive network monitoring · Full protocol analysis</div>
        </div>
        {[
          { label:'Connections',   value:'9,823', color:'#00c8ff' },
          { label:'DNS Queries',   value:'4,521', color:'#8b5cf6' },
          { label:'TLS Sessions',  value:'2,841', color:'#00e5a0' },
          { label:'Notices',       value:'42',    color:'#f59e0b' },
        ].map(s=>(
          <div key={s.label} className="text-center flex-shrink-0">
            <div className="text-[18px] font-bold" style={{color:s.color}}>{s.value}</div>
            <div className="text-[9px] text-fanos-dim">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg w-fit"
        style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
            style={{
              background: tab===t ? 'rgba(139,92,246,0.15)':'transparent',
              color:       tab===t ? '#a78bfa':'#6b7280',
              border:      tab===t ? '1px solid rgba(139,92,246,0.3)':'1px solid transparent',
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Protocol breakdown */}
          <div className="fanos-card">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title"><Network size={13} className="text-fanos-accent"/>Protocol Distribution</div>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {[
                { proto:'HTTP/S',  count:4821, pct:49, color:'#00c8ff' },
                { proto:'DNS',     count:4521, pct:46, color:'#8b5cf6' },
                { proto:'SSH',     count:284,  pct: 3, color:'#f59e0b' },
                { proto:'SMTP',    count:142,  pct: 1, color:'#00e5a0' },
                { proto:'Other',   count:55,   pct: 1, color:'#6b7280' },
              ].map(p=>(
                <div key={p.proto} className="flex items-center gap-3">
                  <span className="text-[10px] text-fanos-muted w-16 flex-shrink-0">{p.proto}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                    <div className="h-full rounded-full" style={{width:`${p.pct}%`,background:p.color}}/>
                  </div>
                  <span className="text-[9px] font-mono text-fanos-dim w-14 text-right">{p.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top talkers */}
          <div className="fanos-card">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title"><Activity size={13} className="text-fanos-accent"/>Top Talkers</div>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { ip:'192.168.56.10', bytes:'142 MB', conns:1842, flag:'Suspicious' },
                { ip:'10.0.1.22',     bytes:'84 MB',  conns:924,  flag:'DNS Anomaly'},
                { ip:'10.0.0.100',    bytes:'38 MB',  conns:421,  flag:'Normal'     },
                { ip:'91.105.0.4',    bytes:'22 MB',  conns:156,  flag:'C2 Pattern' },
                { ip:'10.0.0.88',     bytes:'12 MB',  conns:284,  flag:'Normal'     },
              ].map(t=>{
                const flagStyle = t.flag==='Normal'
                  ? {color:'#4a6070',bg:'transparent'}
                  : {color:'#f59e0b',bg:'rgba(245,158,11,0.08)'}
                return (
                  <div key={t.ip} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="font-mono text-[10px] text-fanos-muted flex-1">{t.ip}</span>
                    <span className="text-[10px] text-fanos-dim">{t.bytes}</span>
                    <span className="text-[10px] text-fanos-dim">{t.conns} conns</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{background:flagStyle.bg,color:flagStyle.color,border:`1px solid ${flagStyle.color}25`}}>
                      {t.flag}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'Connections' && (
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Network size={13} className="text-fanos-accent"/>Recent Connections</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/10 border-b border-white/[0.05]">
                  {['Time','Source','Destination','Proto','Bytes','Duration','State','Notice'].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {CONNECTIONS.map((c,i)=>{
                  const ns = noticeColor[c.notice] ?? {bg:'transparent',color:'#4a6070'}
                  return (
                    <tr key={i} className="hover:bg-white/[0.018] transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-dim">{c.time}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{c.src}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{c.dst}</td>
                      <td className="px-3 py-2.5 text-[9px] text-fanos-accent">{c.proto}</td>
                      <td className="px-3 py-2.5 text-[10px] text-fanos-dim">{c.bytes}</td>
                      <td className="px-3 py-2.5 text-[10px] text-fanos-dim">{c.dur}</td>
                      <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-dim">{c.state}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{background:ns.bg,color:ns.color,border:ns.bg==='transparent'?'none':`1px solid ${ns.color}25`}}>
                          {c.notice}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'DNS' && (
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Globe size={13} className="text-fanos-accent"/>DNS Query Log</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/10 border-b border-white/[0.05]">
                  {['Time','Source','Query','Type','Answer','Flag'].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {DNS_QUERIES.map((d,i)=>{
                  const fs = noticeColor[d.flag] ?? {bg:'transparent',color:'#4a6070'}
                  return (
                    <tr key={i} className="hover:bg-white/[0.018] transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-dim">{d.time}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{d.src}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-text max-w-[240px] truncate">{d.query}</td>
                      <td className="px-3 py-2.5 text-[9px] text-fanos-accent">{d.type}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-dim">{d.answer}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{background:fs.bg,color:fs.color,border:fs.bg==='transparent'?'none':`1px solid ${fs.color}25`}}>
                          {d.flag}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'TLS' && (
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Lock size={13} className="text-fanos-accent"/>TLS Session Analysis</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/10 border-b border-white/[0.05]">
                  {['Time','Source','Destination','Version','Cipher Suite','SNI','Flag'].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {TLS_EVENTS.map((t,i)=>{
                  const fs = noticeColor[t.flag] ?? {bg:'transparent',color:'#4a6070'}
                  return (
                    <tr key={i} className="hover:bg-white/[0.018] transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-dim">{t.time}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{t.src}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{t.dst}</td>
                      <td className="px-3 py-2.5 text-[9px]" style={{color:t.version.includes('1.2')?'#f59e0b':'#00e5a0'}}>{t.version}</td>
                      <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-dim max-w-[180px] truncate">{t.cipher}</td>
                      <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{t.sni}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{background:fs.bg,color:fs.color,border:fs.bg==='transparent'?'none':`1px solid ${fs.color}25`}}>
                          {t.flag}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(tab === 'HTTP' || tab === 'Notices') && (
        <div className="fanos-card p-8 flex flex-col items-center gap-4">
          <ArrowRight size={28} className="text-fanos-dim"/>
          <div className="text-center">
            <div className="text-[13px] font-bold text-white">Zeek {tab} Log</div>
            <div className="text-[11px] text-fanos-muted mt-1">Full {tab} analysis available when Zeek log ingestion is configured.</div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
