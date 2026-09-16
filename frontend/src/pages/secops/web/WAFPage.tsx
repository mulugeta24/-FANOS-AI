/**
 * Security Operations → Web Security → WAF
 * Web Application Firewall operational interface.
 */
import {
  ShieldCheck, Globe, Ban, CheckCircle2, AlertTriangle,
  Activity, Settings, ArrowRight, List, Filter,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/components/ui/PageShell'

const WAF_EVENTS = [
  { time:'14:22:11', rule:'FANOS-SQL-001', type:'SQL Injection',    src:'192.168.56.10', target:'/login',     action:'BLOCK',  code:403, confidence:'98.7%' },
  { time:'14:21:03', rule:'FANOS-XSS-001', type:'XSS',             src:'10.0.0.44',     target:'/comment',   action:'BLOCK',  code:403, confidence:'93.4%' },
  { time:'14:18:45', rule:'FANOS-PATH-001',type:'Path Traversal',   src:'103.22.0.5',   target:'/download',  action:'BLOCK',  code:403, confidence:'90.5%' },
  { time:'14:15:22', rule:'FANOS-SSRF-001',type:'SSRF',             src:'45.78.90.12',  target:'/api/fetch', action:'ALERT',  code:200, confidence:'91.0%' },
  { time:'14:12:09', rule:'FANOS-CMD-001', type:'Command Injection',src:'172.16.0.88',  target:'/api/exec',  action:'BLOCK',  code:403, confidence:'97.2%' },
  { time:'14:09:34', rule:'OWASP-CRS-930', type:'RFI',              src:'91.105.0.4',   target:'/include',   action:'BLOCK',  code:403, confidence:'88.1%' },
  { time:'14:05:11', rule:'RATE-LIMIT',    type:'Rate Limit',        src:'198.51.0.6',   target:'/api/search',action:'LIMIT', code:429, confidence:'100%'  },
  { time:'14:01:44', rule:'NONE',          type:'Normal',            src:'192.168.1.100',target:'/api/health',action:'ALLOW', code:200, confidence:'99.9%' },
]

const RULES = [
  { id:'FANOS-SQL-001', name:'SQL Injection Detection',    type:'Custom',  status:'Active', triggers:1842, action:'BLOCK' },
  { id:'FANOS-XSS-001', name:'XSS Pattern Detection',     type:'Custom',  status:'Active', triggers:984,  action:'BLOCK' },
  { id:'FANOS-PATH-001',name:'Path Traversal Detection',  type:'Custom',  status:'Active', triggers:312,  action:'BLOCK' },
  { id:'FANOS-SSRF-001',name:'SSRF Detection',            type:'Custom',  status:'Active', triggers:156,  action:'BLOCK' },
  { id:'FANOS-CMD-001', name:'Command Injection',         type:'Custom',  status:'Active', triggers:228,  action:'BLOCK' },
  { id:'OWASP-CRS-930', name:'OWASP CRS RFI/LFI',        type:'OWASP',   status:'Active', triggers:88,   action:'BLOCK' },
  { id:'RATE-LIMIT',    name:'API Rate Limiting',         type:'System',  status:'Active', triggers:2156, action:'LIMIT' },
]

const TABS = ['Overview','Events','Rules','Configuration'] as const
type Tab = typeof TABS[number]

const actionStyle: Record<string,{bg:string;color:string}> = {
  BLOCK: { bg:'rgba(239,68,68,0.1)',   color:'#ef4444' },
  ALERT: { bg:'rgba(245,158,11,0.1)',  color:'#f59e0b' },
  ALLOW: { bg:'rgba(0,229,160,0.08)',  color:'#00e5a0' },
  LIMIT: { bg:'rgba(0,200,255,0.1)',   color:'#00c8ff' },
}

export default function WAFPage() {
  const [tab, setTab] = useState<Tab>('Overview')
  const navigate = useNavigate()

  return (
    <PageShell
      title="WAF — Web Application Firewall"
      subtitle="Web security engine — rule management, blocked requests, and security events"
      badge={{ label:'ONLINE', color:'green' }}
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg w-fit"
        style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
            style={{
              background: tab===t ? 'rgba(0,229,160,0.15)':'transparent',
              color:       tab===t ? '#00e5a0':'#6b7280',
              border:      tab===t ? '1px solid rgba(0,229,160,0.3)':'1px solid transparent',
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label:'Blocked Today',    value:'1,842', icon:<Ban size={15}/>,          color:'#ef4444' },
              { label:'Requests Allowed', value:'48,291',icon:<CheckCircle2 size={15}/>, color:'#00e5a0' },
              { label:'Active Rules',     value:RULES.length, icon:<List size={15}/>,    color:'#00c8ff' },
              { label:'WAF Uptime',       value:'99.95%',icon:<Activity size={15}/>,     color:'#00e5a0' },
            ].map(s=>(
              <div key={s.label} className="fanos-card p-4">
                <div className="flex items-start gap-2 mb-2">
                  <span style={{color:s.color}}>{s.icon}</span>
                </div>
                <div className="text-[22px] font-bold text-white">{s.value}</div>
                <div className="text-[10px] text-fanos-muted mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Attack type breakdown */}
          <div className="fanos-card">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title"><ShieldCheck size={13} className="text-fanos-green"/>Attack Type Breakdown</div>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {[
                { type:'SQL Injection',    count:1842, pct:38, color:'#ef4444' },
                { type:'XSS',             count:984,  pct:20, color:'#f59e0b' },
                { type:'Rate Limiting',   count:2156, pct:22, color:'#00c8ff' },
                { type:'Path Traversal',  count:312,  pct: 6, color:'#8b5cf6' },
                { type:'Command Injection',count:228, pct: 5, color:'#ef4444' },
                { type:'SSRF',            count:156,  pct: 3, color:'#f59e0b' },
                { type:'Other',           count:288,  pct: 6, color:'#6b7280' },
              ].map(a=>(
                <div key={a.type} className="flex items-center gap-3">
                  <span className="text-[10px] text-fanos-muted w-36 flex-shrink-0 truncate">{a.type}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                    <div className="h-full rounded-full" style={{width:`${a.pct}%`,background:a.color}}/>
                  </div>
                  <span className="text-[10px] font-mono text-fanos-dim w-12 text-right flex-shrink-0">{a.count.toLocaleString()}</span>
                  <span className="text-[9px] text-fanos-dim w-8 text-right flex-shrink-0">{a.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label:'View Events',    onClick:()=>setTab('Events'),        color:'#00c8ff', icon:<Globe size={13}/> },
              { label:'Manage Rules',   onClick:()=>setTab('Rules'),          color:'#00e5a0', icon:<List size={13}/> },
              { label:'Configuration',  onClick:()=>setTab('Configuration'),  color:'#8b5cf6', icon:<Settings size={13}/> },
              { label:'View Incidents', onClick:()=>navigate('/secops/incidents'), color:'#f59e0b', icon:<AlertTriangle size={13}/> },
            ].map(l=>(
              <button key={l.label} onClick={l.onClick}
                className="fanos-card p-3 flex items-center gap-2 text-left hover:border-white/10 transition-all cursor-pointer">
                <span style={{color:l.color}}>{l.icon}</span>
                <span className="text-[11px] text-fanos-muted flex-1">{l.label}</span>
                <ArrowRight size={10} className="text-fanos-dim"/>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'Events' && (
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Globe size={13} className="text-fanos-accent"/>WAF Event Log</div>
            <span className="text-[10px] text-fanos-dim">{WAF_EVENTS.length} events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/10 border-b border-white/[0.05]">
                  {['Time','Rule','Attack Type','Source IP','Target','Action','Status','Confidence'].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {WAF_EVENTS.map((e,i)=>{
                  const as_ = actionStyle[e.action] ?? {bg:'rgba(255,255,255,0.04)',color:'#6b7280'}
                  return (
                    <tr key={i} className="hover:bg-white/[0.018] transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-dim">{e.time}</td>
                      <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-accent">{e.rule}</td>
                      <td className="px-3 py-2.5 text-[11px] text-fanos-text">{e.type}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{e.src}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-dim">{e.target}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{background:as_.bg,color:as_.color,border:`1px solid ${as_.color}25`}}>
                          {e.action}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-dim">{e.code}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px]"
                        style={{color:parseFloat(e.confidence)>=95?'#00e5a0':'#f59e0b'}}>
                        {e.confidence}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Rules' && (
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><List size={13} className="text-fanos-accent"/>Active WAF Rules</div>
            <button className="fanos-btn text-[10px]"><Filter size={10}/>Add Rule</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/10 border-b border-white/[0.05]">
                  {['Rule ID','Name','Type','Status','Triggers (24h)','Action'].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {RULES.map(r=>(
                  <tr key={r.id} className="hover:bg-white/[0.018] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent">{r.id}</td>
                    <td className="px-3 py-2.5 text-[11px] text-fanos-text">{r.name}</td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{r.type}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{background:'rgba(0,229,160,0.08)',color:'#00e5a0',border:'1px solid rgba(0,229,160,0.25)'}}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-bold text-fanos-text">{r.triggers.toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={actionStyle[r.action] ?? {background:'rgba(255,255,255,0.04)',color:'#6b7280'}}>
                        {r.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Configuration' && (
        <div className="fanos-card p-6 flex flex-col items-center gap-4">
          <Settings size={36} className="text-fanos-dim" />
          <div className="text-center">
            <div className="text-[14px] font-bold text-white mb-1">WAF Configuration</div>
            <div className="text-[12px] text-fanos-muted">OWASP CRS integration, ModSecurity settings, and custom rule management.</div>
          </div>
          <div className="text-[10px] font-semibold px-3 py-1.5 rounded"
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'#6b7280'}}>
            Full configuration panel — coming soon
          </div>
        </div>
      )}
    </PageShell>
  )
}
