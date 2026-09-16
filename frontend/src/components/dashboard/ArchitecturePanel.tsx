import { GitBranch } from 'lucide-react'

const LAYERS = [
  { label: 'Network / Web / System',       cls: 'bg-cyan-500/[0.07]   border-cyan-500/20   text-cyan-400' },
  { label: 'Data Collection',              cls: 'bg-green-500/[0.07]  border-green-500/20  text-fanos-green' },
  { label: 'Feature Engineering',          cls: 'bg-amber-500/[0.07]  border-amber-500/20  text-fanos-amber' },
  { label: 'Rule Engine + AI Engine',      cls: 'bg-violet-500/[0.08] border-violet-500/25 text-fanos-purple', bold: true },
  { label: 'Attack Detection',             cls: 'bg-red-500/[0.08]    border-red-500/20    text-fanos-red' },
  { label: 'Confidence Score',             cls: 'bg-cyan-500/[0.07]   border-cyan-500/20   text-cyan-400' },
  { label: 'Risk Engine',                  cls: 'bg-orange-500/[0.07] border-orange-500/20 text-fanos-orange' },
  { label: 'Alert',                        cls: 'bg-amber-500/[0.07]  border-amber-500/20  text-fanos-amber' },
  { label: 'Threat Correlation',           cls: 'bg-violet-500/[0.08] border-violet-500/20 text-fanos-purple' },
  { label: 'Incident',                     cls: 'bg-red-500/[0.1]     border-red-500/25    text-fanos-red', bold: true },
  { label: 'Response Engine',              cls: 'bg-orange-500/[0.07] border-orange-500/20 text-fanos-orange' },
  { label: 'Prevention',                   cls: 'bg-green-500/[0.07]  border-green-500/20  text-fanos-green' },
  { label: 'Block / Isolate / Rate Limit', cls: 'bg-red-500/[0.12]    border-red-500/30    text-fanos-red', bold: true },
  { label: 'SOC Dashboard',                cls: 'bg-cyan-500/[0.1]    border-cyan-500/30   text-fanos-accent', bold: true },
]

export default function ArchitecturePanel() {
  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <GitBranch size={13} className="text-fanos-accent" />
          FANOS Architecture
        </div>
        <span className="text-[9px] text-fanos-dim">Detection → Response</span>
      </div>

      <div className="px-3 py-2.5 flex flex-col items-center gap-0">
        {LAYERS.map((layer, i) => (
          <div key={layer.label} className="flex flex-col items-center w-full">
            {/* Node */}
            <div className={`flex items-center justify-center w-full px-2 py-1.5 rounded-md border text-center ${layer.cls} ${layer.bold ? 'font-bold' : 'font-medium'}`}
              style={{ fontSize: '10px', letterSpacing: '0.3px' }}>
              {layer.label}
            </div>
            {/* Arrow */}
            {i < LAYERS.length - 1 && (
              <div className="w-px h-2.5 flex-shrink-0"
                style={{ background: 'linear-gradient(to bottom,rgba(0,200,255,0.25),rgba(0,200,255,0.08))' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
