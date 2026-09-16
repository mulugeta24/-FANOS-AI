import { Brain, ArrowRight } from 'lucide-react'

/* ── AI workflow pipeline steps ───────────────────────── */
const PIPELINE_STEPS = [
  { label: 'DETECT',     sub: '8,421 events/24h',    color: '#00c8ff',  active: true  },
  { label: 'CORRELATE',  sub: '37 event chains',      color: '#3b82f6',  active: true  },
  { label: 'UNDERSTAND', sub: 'Attack pattern match', color: '#8b5cf6',  active: true  },
  { label: 'RISK SCORE', sub: 'Risk: 98 / 100',       color: '#f97316',  active: true  },
  { label: 'DECIDE',     sub: 'Auto + manual',        color: '#f59e0b',  active: true  },
  { label: 'RESPOND',    sub: '156 threats blocked',  color: '#ef4444',  active: true  },
  { label: 'VERIFY',     sub: 'Containment check',    color: '#00e5a0',  active: true  },
  { label: 'REPORT',     sub: 'Audit trail created',  color: '#00e5a0',  active: false },
]

/* ── AI model metrics ─────────────────────────────────── */
const METRICS = [
  { label: 'Model',     value: 'FANOS-V3-XGBoost' },
  { label: 'Version',   value: 'v3.2.1' },
  { label: 'Accuracy',  value: '99.84%' },
  { label: 'F1 Score',  value: '99.85%' },
  { label: 'Inference', value: '4.2ms' },
  { label: 'Req/sec',   value: '2,481' },
]

export default function AIWorkflowPanel() {
  return (
    <div className="fanos-card">
      {/* Header */}
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Brain size={13} className="text-fanos-purple" />
          AI Security Engine — Workflow
        </div>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(0,229,160,0.1)', color: '#00e5a0', border: '1px solid rgba(0,229,160,0.25)' }}>
          ● ACTIVE
        </span>
      </div>

      {/* Pipeline */}
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-1 flex-wrap">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-center transition-all"
                style={{
                  background: step.active ? `${step.color}12` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${step.active ? step.color + '35' : 'rgba(255,255,255,0.06)'}`,
                  minWidth: 72,
                }}>
                <div className="w-1.5 h-1.5 rounded-full mx-auto"
                  style={{ background: step.active ? step.color : '#2a4060' }} />
                <div className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: step.active ? step.color : '#4a6080' }}>
                  {step.label}
                </div>
                <div className="text-[8px] text-fanos-dim leading-tight whitespace-nowrap">{step.sub}</div>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <ArrowRight size={10} className="text-fanos-dim flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Model metrics */}
      <div className="grid grid-cols-6 gap-0 divide-x divide-white/[0.05]">
        {METRICS.map(m => (
          <div key={m.label} className="flex flex-col items-center justify-center py-3">
            <div className="text-[12px] font-bold text-white">{m.value}</div>
            <div className="text-[9px] text-fanos-dim mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Demo note */}
      <div className="px-4 py-2 border-t border-white/[0.04]">
        <p className="text-[10px] text-fanos-dim">
          <span className="text-fanos-amber font-semibold">⚠ DEMO:</span> AI metrics are demonstration data. Connect a verified evaluation pipeline for production accuracy validation.
        </p>
      </div>
    </div>
  )
}
