import { BarChart2 } from 'lucide-react'
import { mockRiskDistribution } from '@/lib/mockData'

export default function RiskDistributionPanel() {
  const maxCount = Math.max(...mockRiskDistribution.map(r => r.count))

  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <BarChart2 size={13} className="text-fanos-accent" />
          Risk Distribution
        </div>
        <span className="text-[9px] text-fanos-dim">Active threats</span>
      </div>

      <div className="px-3 py-3 flex flex-col gap-2.5">
        {mockRiskDistribution.map((r) => {
          const pct = (r.count / maxCount) * 100
          return (
            <div key={r.label} className="flex items-center gap-2.5">
              <span className="text-[10px] text-fanos-muted w-16 flex-shrink-0">{r.label}</span>
              <div className="flex-1 h-[6px] rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: r.color }}
                />
              </div>
              <span className="text-[10px] font-semibold text-fanos-text w-7 text-right flex-shrink-0">
                {r.count}
              </span>
            </div>
          )
        })}
      </div>

      {/* Summary row */}
      <div className="px-3 pb-3 flex justify-between text-[9px] text-fanos-dim border-t border-white/[0.04] pt-2">
        <span>Total: <span className="text-fanos-text font-semibold">
          {mockRiskDistribution.reduce((s, r) => s + r.count, 0)}
        </span> events</span>
        <span>Active window: 24h</span>
      </div>
    </div>
  )
}
