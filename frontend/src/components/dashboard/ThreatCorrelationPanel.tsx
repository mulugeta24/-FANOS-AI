import { Network, AlertOctagon } from 'lucide-react'

const CHAIN = [
  { label: 'Brute Force',         color: '#f97316', dot: '#f97316' },
  { label: 'Successful Login',    color: '#f59e0b', dot: '#f59e0b' },
  { label: 'Privilege Escalation',color: '#8b5cf6', dot: '#8b5cf6' },
  { label: 'SQL Injection',       color: '#ef4444', dot: '#ef4444' },
  { label: 'Data Access',         color: '#00c8ff', dot: '#00c8ff' },
]

export default function ThreatCorrelationPanel() {
  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Network size={13} className="text-fanos-accent" />
          Threat Correlation
        </div>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.25)' }}>
          CORRELATED
        </span>
      </div>

      <div className="px-3 py-2.5">
        {/* Chain */}
        <div className="flex flex-col items-center gap-0">
          {CHAIN.map((node, i) => (
            <div key={node.label} className="flex flex-col items-center w-full">
              {/* Node */}
              <div className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md"
                style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid ${node.color}22` }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: node.dot, border: `2px solid ${node.dot}`, boxShadow: `0 0 6px ${node.dot}55` }} />
                <span className="text-[11px] font-medium" style={{ color: node.color }}>{node.label}</span>
              </div>
              {/* Arrow */}
              {i < CHAIN.length - 1 && (
                <div className="w-px h-3"
                  style={{ background: 'linear-gradient(to bottom,rgba(0,200,255,0.3),rgba(239,68,68,0.3))' }} />
              )}
            </div>
          ))}
        </div>

        {/* Critical incident box */}
        <div className="mt-2 p-2.5 rounded-md flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(249,115,22,0.08))', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div className="flex items-center gap-2">
            <AlertOctagon size={14} className="text-fanos-red" />
            <div>
              <div className="text-[9px] font-bold tracking-[0.8px] uppercase text-fanos-red">Critical Incident</div>
              <div className="text-[10px] text-fanos-muted">Correlated Campaign</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[20px] font-bold text-fanos-red leading-none">96</div>
            <div className="text-[8px] text-fanos-dim">/ 100</div>
          </div>
        </div>
      </div>
    </div>
  )
}
