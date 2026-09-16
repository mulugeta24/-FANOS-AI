/**
 * Security Operations → Network Security → Suricata
 * Suricata IDS/IPS — signature-based network threat detection.
 */
import { Shield, AlertTriangle, List, Activity } from 'lucide-react'
import { useState } from 'react'
import PageShell from '@/components/ui/PageShell'

const TABS = ['Overview','Alerts','Signatures','Events'] as const
type Tab = typeof TABS[number]

const SURICATA_ALERTS = [
  { time:'14:22:11', sid:'2021001', msg:'ET SCAN Potential SSH Scan',         src:'185.220.0.14', dst:'10.0.0.5:22',   proto:'TCP', sev:'HIGH',     action:'DROP',   category:'Attempted Recon'    },
  { time:'14:21:44', sid:'2012887', msg:'ET POLICY GNU wget User-Agent',      src:'10.0.2.55',    dst:'185.x.x.x:80', proto:'TCP', sev:'MEDIUM',   action:'ALERT',  category:'Potentially Bad'    },
  { time:'14:20:22', sid:'2100498', msg:'GPL ATTACK_RESPONSE id check',       src:'192.168.56.10',dst:'10.0.0.5:80',  proto:'TCP', sev:'CRITICAL', action:'DROP',   category:'Attack Response'    },
  { time:'14:19:05', sid:'2027939', msg:'ET DOS Potential DDoS SYN Flood',   src:'Multiple',     dst:'10.0.0.1:80',  proto:'TCP', sev:'HIGH',     action:'DROP',   category:'Denial of Service'  },
  { time:'14:17:33', sid:'2014727', msg:'ET TROJAN Observed Malicious SSL',  src:'10.0.1.15',    dst:'91.105.0.4:443',proto:'TCP', sev:'CRITICAL', action:'DROP',   category:'Trojan Activity'    },
  { time:'14:15:11', sid:'2023476', msg:'ET MALWARE DNS Query to Sinkhole',  src:'10.0.0.88',    dst:'8.8.8.8:53',   proto:'UDP', sev:'MEDIUM',   action:'ALERT',  category:'Malware CnC'        },
]

const SIGNATURES = [
  { sid:'2021001', msg:'ET SCAN Potential SSH Scan',          category:'Recon',   sev:'HIGH',     rev:5,  enabled:true,  hits:324 },
  { sid:'2100498', msg:'GPL ATTACK_RESPONSE id check',        category:'Exploit', sev:'CRITICAL', rev:12, enabled:true,  hits:18  },
  { sid:'2027939', msg:'ET DOS Potential DDoS SYN Flood',     category:'DoS',     sev:'HIGH',     rev:3,  enabled:true,  hits:892 },
  { sid:'2014727', msg:'ET TROJAN Observed Malicious SSL',    category:'Malware', sev:'CRITICAL', rev:8,  enabled:true,  hits:6   },
  { sid:'2023476', msg:'ET MALWARE DNS Query to Sinkhole',    category:'CnC',     sev:'MEDIUM',   rev:4,  enabled:true,  hits:44  },
  { sid:'2012887', msg:'ET POLICY GNU wget User-Agent',       category:'Policy',  sev:'LOW',      rev:2,  enabled:false, hits:0   },
]

const sevStyle: Record<string,{bg:string;color:string}> = {
  CRITICAL: { bg:'rgba(239,68,68,0.12)',  color:'#ef4444' },
  HIGH:     { bg:'rgba(245,158,11,0.12)', color:'#f59e0b' },
  MEDIUM:   { bg:'rgba(0,200,255,0.10)',  color:'#00c8ff' },
  LOW:      { bg:'rgba(107,114,128,0.1)', color:'#9ca3af' },
}

const actionStyle: Record<string,{bg:string;color:string}> = {
  DROP:  { bg:'rgba(239,68,68,0.1)',  color:'#ef4444' },
  ALERT: { bg:'rgba(245,158,11,0.1)', color:'#f59e0b' },
}

export default function SuricataPage() {
  const [tab, setTab] = useState<Tab>('Overview')

  return (
    <PageShell
      title="Suricata — Network IDS/IPS"
      subtitle="Signature-based intrusion detection and prevention — alerts, rules, and protocol analysis"
      badge={{ label:'ONLINE', color:'green' }}
    >
      {/* Engine info bar */}
      <div className="fanos-card p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[16px] font-black"
          style={{ background:'rgba(0,200,255,0.15)', border:'1px solid rgba(0,200,255,0.3)', color:'#00c8ff' }}>
          S
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-bold text-white">Suricata IDS/IPS</div>
          <div className="text-[11px] text-fanos-muted mt-0.5">v7.0.4 · Emerging Threats ruleset · Inline IPS mode</div>
        </div>
        {[
          { label:'Alerts Today',  value: SURICATA_ALERTS.length.toLocaleString(), color:'#ef4444' },
          { label:'Signatures',    value: SIGNATURES.length,                        color:'#00c8ff' },
          { label:'Packets/sec',   value:'48.2K',                                   color:'#00e5a0' },
          { label:'Drop Rate',     value:'0.02%',                                   color:'#f59e0b' },
        ].map(s => (
          <div key={s.label} className="text-center flex-shrink-0">
            <div className="text-[18px] font-bold" style={{ color:s.color }}>{s.value}</div>
            <div className="text-[9px] text-fanos-dim">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg w-fit"
        style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
            style={{
              background: tab===t ? 'rgba(0,200,255,0.15)' : 'transparent',
              color:       tab===t ? '#00c8ff' : '#6b7280',
              border:      tab===t ? '1px solid rgba(0,200,255,0.3)' : '1px solid transparent',
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Alert severity breakdown */}
          <div className="fanos-card">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title"><AlertTriangle size={13} className="text-fanos-amber"/>Alert Severity Breakdown</div>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {[
                { label:'Critical', count: SURICATA_ALERTS.filter(a=>a.sev==='CRITICAL').length, color:'#ef4444', pct:33 },
                { label:'High',     count: SURICATA_ALERTS.filter(a=>a.sev==='HIGH').length,     color:'#f59e0b', pct:33 },
                { label:'Medium',   count: SURICATA_ALERTS.filter(a=>a.sev==='MEDIUM').length,   color:'#00c8ff', pct:33 },
                { label:'Low',      count: SURICATA_ALERTS.filter(a=>a.sev==='LOW').length,      color:'#9ca3af', pct:0  },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-[10px] text-fanos-muted w-14 flex-shrink-0">{s.label}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width:`${s.pct}%`, background:s.color }}/>
                  </div>
                  <span className="text-[11px] font-bold flex-shrink-0" style={{ color:s.color }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="fanos-card">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title"><Activity size={13} className="text-fanos-accent"/>Alert Categories</div>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {[
                { cat:'Recon / Scanning',    count:324, color:'#f59e0b' },
                { cat:'DoS / DDoS',          count:892, color:'#ef4444' },
                { cat:'Exploit',             count:18,  color:'#ef4444' },
                { cat:'Malware / Trojan',    count:50,  color:'#8b5cf6' },
                { cat:'Policy Violation',    count:0,   color:'#6b7280' },
              ].map(c => (
                <div key={c.cat} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:c.color }}/>
                    <span className="text-[11px] text-fanos-muted">{c.cat}</span>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color:c.color }}>{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Alerts' && (
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Shield size={13} className="text-fanos-accent"/>Suricata Alerts</div>
            <span className="text-[10px] text-fanos-dim">{SURICATA_ALERTS.length} alerts</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/10 border-b border-white/[0.05]">
                  {['Time','SID','Signature','Source','Destination','Proto','Severity','Action','Category'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {SURICATA_ALERTS.map((a,i) => {
                  const sv = sevStyle[a.sev]    ?? { bg:'rgba(255,255,255,0.04)', color:'#6b7280' }
                  const ac = actionStyle[a.action] ?? { bg:'rgba(255,255,255,0.04)', color:'#6b7280' }
                  return (
                    <tr key={i} className="hover:bg-white/[0.018] transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-dim">{a.time}</td>
                      <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-accent">{a.sid}</td>
                      <td className="px-3 py-2.5 text-[10px] text-fanos-text max-w-[200px] truncate">{a.msg}</td>
                      <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-muted">{a.src}</td>
                      <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-dim">{a.dst}</td>
                      <td className="px-3 py-2.5 text-[9px] text-fanos-accent">{a.proto}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background:sv.bg, color:sv.color, border:`1px solid ${sv.color}25` }}>
                          {a.sev}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background:ac.bg, color:ac.color, border:`1px solid ${ac.color}25` }}>
                          {a.action}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[9px] text-fanos-dim">{a.category}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Signatures' && (
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><List size={13} className="text-fanos-accent"/>Signature Rules</div>
            <span className="text-[10px] text-fanos-dim">{SIGNATURES.filter(s=>s.enabled).length} enabled</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/10 border-b border-white/[0.05]">
                  {['SID','Signature','Category','Severity','Rev','Enabled','Hits (24h)'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {SIGNATURES.map(s => {
                  const sv = sevStyle[s.sev] ?? { bg:'rgba(255,255,255,0.04)', color:'#6b7280' }
                  return (
                    <tr key={s.sid} className="hover:bg-white/[0.018] transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-accent">{s.sid}</td>
                      <td className="px-3 py-2.5 text-[10px] text-fanos-text max-w-[220px] truncate">{s.msg}</td>
                      <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{s.category}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background:sv.bg, color:sv.color, border:`1px solid ${sv.color}25` }}>
                          {s.sev}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-fanos-dim">{s.rev}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[9px] font-semibold ${s.enabled ? 'text-fanos-green' : 'text-fanos-dim'}`}>
                          {s.enabled ? '● ENABLED' : '○ DISABLED'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-bold text-fanos-text">{s.hits}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Events' && (
        <div className="fanos-card p-8 flex flex-col items-center gap-4">
          <Activity size={28} className="text-fanos-dim"/>
          <div className="text-center">
            <div className="text-[13px] font-bold text-white">Suricata Event Stream</div>
            <div className="text-[11px] text-fanos-muted mt-1">
              Full EVE JSON event stream available when Suricata log ingestion is configured.
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
