import { Cpu, ExternalLink } from 'lucide-react'
import { useAIEngineStatus } from '@/hooks/useDashboard'
import { mockAIEngine } from '@/lib/mockData'

interface MetricRowProps { label: string; value: string; barPct?: number }

function MetricRow({ label, value, barPct }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[10px] text-fanos-dim flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {barPct !== undefined && (
          <div className="w-14 h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
            <div className="h-full rounded-full"
              style={{ width: `${barPct}%`, background: 'linear-gradient(90deg,#8b5cf6,#00c8ff)' }} />
          </div>
        )}
        <span className="text-[11px] font-semibold text-fanos-text">{value}</span>
      </div>
    </div>
  )
}

export default function AIEnginePanel() {
  const { data: ai = mockAIEngine } = useAIEngineStatus()

  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Cpu size={13} className="text-fanos-accent" />
          FANOS AI Engine
        </div>
      </div>

      <div className="px-3 py-2.5 border-b border-white/[0.05]"
        style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.07),rgba(0,200,255,0.04))' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <Cpu size={13} className="text-fanos-purple" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-white">{ai.model_name}</div>
            <div className="text-[9px] text-fanos-dim">{ai.model_version}</div>
          </div>
          <span className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,229,160,0.1)', color: '#00e5a0', border: '1px solid rgba(0,229,160,0.25)' }}>
            ● {ai.status}
          </span>
        </div>
      </div>

      <div className="px-3 py-2 flex flex-col">
        <MetricRow label="Accuracy"          value={`${ai.accuracy}%`}   barPct={ai.accuracy} />
        <MetricRow label="Precision"         value={`${ai.precision}%`}  barPct={ai.precision} />
        <MetricRow label="Recall"            value={`${ai.recall}%`}     barPct={ai.recall} />
        <MetricRow label="F1 Score"          value={`${ai.f1_score}%`}   barPct={ai.f1_score} />
        <div className="my-1 border-t border-white/[0.04]" />
        <MetricRow label="Inference Latency" value={`${ai.inference_ms} ms`} />
        <MetricRow label="Requests / sec"    value={ai.requests_per_sec.toLocaleString()} />
      </div>

      <div className="px-3 pb-3">
        <button className="fanos-btn w-full justify-center gap-1.5">
          <ExternalLink size={11} />
          VIEW AI ENGINE
        </button>
      </div>
    </div>
  )
}
