/**
 * Security Operations — Security Reports
 */
import { BarChart2, Download, FileText, Calendar, TrendingUp } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'

const REPORTS = [
  { id:'RPT-001', title:'Weekly Security Summary',          type:'Summary',    period:'Sep 8–14, 2026', status:'Ready',      size:'2.4 MB', format:'PDF' },
  { id:'RPT-002', title:'Incident Response Report — INC-001',type:'Incident',  period:'Sep 15, 2026',   status:'Ready',      size:'1.1 MB', format:'PDF' },
  { id:'RPT-003', title:'WAF Activity Report',              type:'Engine',     period:'Sep 1–14, 2026', status:'Ready',      size:'3.2 MB', format:'PDF' },
  { id:'RPT-004', title:'Threat Intelligence Summary',      type:'Intel',      period:'Sep 2026',       status:'Ready',      size:'1.8 MB', format:'PDF' },
  { id:'RPT-005', title:'Monthly Executive Report',         type:'Executive',  period:'August 2026',    status:'Ready',      size:'4.5 MB', format:'PDF' },
  { id:'RPT-006', title:'Compliance Security Report',       type:'Compliance', period:'Q3 2026',        status:'Generating', size:'—',      format:'PDF' },
]

const typeColor: Record<string,string> = {
  Summary:    '#00c8ff',
  Incident:   '#ef4444',
  Engine:     '#00e5a0',
  Intel:      '#8b5cf6',
  Executive:  '#f59e0b',
  Compliance: '#06b6d4',
}

export default function SecurityReports() {
  return (
    <PageShell
      title="Security Reports"
      subtitle="Generated security, compliance, and executive reports"
      badge={{ label:`${REPORTS.filter(r=>r.status==='Ready').length} READY`, color:'green' }}
      actions={
        <button className="fanos-btn">
          <FileText size={11}/>Generate Report
        </button>
      }
    >
      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Reports Ready',      value: REPORTS.filter(r=>r.status==='Ready').length,      color:'#00e5a0', icon:<FileText size={14}/> },
          { label:'Generating',         value: REPORTS.filter(r=>r.status==='Generating').length, color:'#f59e0b', icon:<Calendar size={14}/> },
          { label:'This Month',         value: REPORTS.length,                                     color:'#00c8ff', icon:<BarChart2 size={14}/> },
          { label:'Trend Reports',      value: 2,                                                  color:'#8b5cf6', icon:<TrendingUp size={14}/> },
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

      {/* Report list */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><BarChart2 size={13} className="text-fanos-accent"/>Available Reports</div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {REPORTS.map(r=>{
            const tc = typeColor[r.type] ?? '#6b7280'
            return (
              <div key={r.id} className="px-4 py-3 flex items-center gap-4 hover:bg-white/[0.018] transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{background:`${tc}15`,border:`1px solid ${tc}25`}}>
                  <FileText size={14} style={{color:tc}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-fanos-text">{r.title}</div>
                  <div className="flex items-center gap-3 mt-0.5 text-[9px] text-fanos-dim flex-wrap">
                    <span>{r.id}</span>
                    <span>·</span>
                    <span>{r.period}</span>
                    <span>·</span>
                    <span>{r.format}</span>
                    {r.size !== '—' && <><span>·</span><span>{r.size}</span></>}
                  </div>
                </div>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded flex-shrink-0"
                  style={{background:`${tc}15`,color:tc,border:`1px solid ${tc}25`}}>
                  {r.type}
                </span>
                {r.status === 'Ready' ? (
                  <button className="flex items-center gap-1.5 text-[9px] font-semibold px-3 py-1.5 rounded flex-shrink-0"
                    style={{background:'rgba(0,229,160,0.1)',color:'#00e5a0',border:'1px solid rgba(0,229,160,0.25)'}}>
                    <Download size={10}/>Download
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-[9px] font-semibold px-3 py-1.5 rounded flex-shrink-0"
                    style={{background:'rgba(245,158,11,0.1)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.25)'}}>
                    <span className="w-1.5 h-1.5 rounded-full bg-fanos-amber animate-pulse"/>
                    Generating
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Schedule */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><Calendar size={13} className="text-fanos-accent"/>Scheduled Reports</div>
        </div>
        <div className="px-4 pb-4 space-y-2">
          {[
            { name:'Daily Security Summary',   freq:'Daily at 08:00 EAT',  next:'Sep 16, 2026',  enabled:true  },
            { name:'Weekly Incident Report',   freq:'Mondays at 09:00 EAT',next:'Sep 22, 2026',  enabled:true  },
            { name:'Monthly Executive Report', freq:'1st of month',         next:'Oct 1, 2026',   enabled:true  },
            { name:'Compliance Report',        freq:'Quarterly',            next:'Dec 31, 2026',  enabled:false },
          ].map(s=>(
            <div key={s.name} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.enabled ? 'dot-green' : 'bg-fanos-dim'}`}/>
              <div className="flex-1">
                <div className="text-[11px] font-medium text-fanos-text">{s.name}</div>
                <div className="text-[9px] text-fanos-dim">{s.freq}</div>
              </div>
              <div className="text-[9px] text-fanos-dim flex-shrink-0">Next: {s.next}</div>
              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                s.enabled ? 'text-fanos-green' : 'text-fanos-dim'}`}
                style={{background: s.enabled ? 'rgba(0,229,160,0.08)':'rgba(255,255,255,0.04)',
                  border: `1px solid ${s.enabled ? 'rgba(0,229,160,0.2)':'rgba(255,255,255,0.08)'}`}}>
                {s.enabled ? 'ACTIVE':'PAUSED'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
