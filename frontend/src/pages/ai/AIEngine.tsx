import { Cpu, Activity, Zap, CheckCircle2 } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { useAIEngineStatus } from '@/hooks/useDashboard'
import { mockAIEngine } from '@/lib/mockData'

function MetricBar({ label, value, pct }: { label:string; value:string; pct:number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-fanos-muted w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/[0.07] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{width:`${pct}%`, background:'linear-gradient(90deg,#8b5cf6,#00c8ff)'}}/>
      </div>
      <span className="text-[12px] font-bold text-white w-16 text-right flex-shrink-0">{value}</span>
    </div>
  )
}

export default function AIEngine() {
  const { data: ai = mockAIEngine } = useAIEngineStatus()

  return (
    <PageShell title="AI Engine" subtitle="FANOS-V3-XGBoost multi-class intrusion detection model"
      badge={{ label:'PRODUCTION', color:'green' }}>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'Accuracy',    value:`${ai.accuracy}%`,          color:'#8b5cf6' },
          { label:'F1 Score',    value:`${ai.f1_score}%`,          color:'#00c8ff' },
          { label:'Inference',   value:`${ai.inference_ms} ms`,    color:'#00e5a0' },
          { label:'Req / sec',   value:ai.requests_per_sec.toLocaleString(), color:'#f59e0b' },
        ].map(s=>(
          <div key={s.label} className="fanos-card px-4 py-3">
            <div className="text-[9px] uppercase tracking-widest text-fanos-dim mb-1">{s.label}</div>
            <div className="text-[22px] font-bold" style={{color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Model info */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Cpu size={13} className="text-fanos-accent"/>Model Information</div>
          </div>
          <div className="px-4 py-4 flex flex-col gap-3">
            {[
              { label:'Model Name',    value: ai.model_name },
              { label:'Version',       value: ai.model_version },
              { label:'Framework',     value: 'XGBoost 2.0' },
              { label:'Algorithm',     value: 'Gradient Boosted Trees' },
              { label:'Status',        value: ai.status },
              { label:'Classes',       value: '12 attack categories' },
              { label:'Features',      value: '46 network flow features' },
              { label:'Training Data', value: 'NSL-KDD + CICIDS-2017 + custom' },
            ].map(r=>(
              <div key={r.label} className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                <span className="text-[11px] text-fanos-muted">{r.label}</span>
                <span className="text-[11px] font-semibold text-fanos-text">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance metrics */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Activity size={13} className="text-fanos-accent"/>Performance Metrics</div>
          </div>
          <div className="px-4 py-4 flex flex-col gap-4">
            <MetricBar label="Accuracy"   value={`${ai.accuracy}%`}  pct={ai.accuracy} />
            <MetricBar label="Precision"  value={`${ai.precision}%`} pct={ai.precision} />
            <MetricBar label="Recall"     value={`${ai.recall}%`}    pct={ai.recall} />
            <MetricBar label="F1 Score"   value={`${ai.f1_score}%`}  pct={ai.f1_score} />
            <div className="pt-2 border-t border-white/[0.05] flex flex-col gap-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-fanos-muted">Inference Latency</span>
                <span className="font-bold text-fanos-green">{ai.inference_ms} ms</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-fanos-muted">Throughput</span>
                <span className="font-bold text-fanos-accent">{ai.requests_per_sec.toLocaleString()} req/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attack classes */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><Zap size={13} className="text-fanos-accent"/>Detected Attack Classes</div>
          <span className="text-[9px] text-fanos-dim">12 categories</span>
        </div>
        <div className="grid grid-cols-4 gap-2 p-4">
          {['SQL Injection','XSS','Brute Force','DDoS','Port Scan','SSRF','Path Traversal','Command Injection','File Upload Attack','CSRF','IDOR / BOLA','Normal Traffic'].map((c,i)=>(
            <div key={c} className="flex items-center gap-2 px-3 py-2 rounded-md"
              style={{background:'rgba(0,0,0,.15)',border:'1px solid rgba(255,255,255,.05)'}}>
              <CheckCircle2 size={11} className={i===11 ? 'text-fanos-green' : 'text-fanos-accent'} />
              <span className="text-[10px] text-fanos-muted truncate">{c}</span>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
