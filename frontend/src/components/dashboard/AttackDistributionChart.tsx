import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { PieChart as PieIcon } from 'lucide-react'
import { useAttackDistribution } from '@/hooks/useDashboard'
import { mockAttackDistribution } from '@/lib/mockData'

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-lg p-2.5 text-[11px] shadow-xl"
      style={{ background: '#111c2e', border: '1px solid rgba(0,200,255,0.15)' }}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm" style={{ background: d.payload.color }} />
        <span className="text-white font-semibold">{d.name}</span>
      </div>
      <div className="text-fanos-muted mt-0.5">{d.value}% of attacks</div>
    </div>
  )
}

export default function AttackDistributionChart() {
  const { data = mockAttackDistribution } = useAttackDistribution()

  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <PieIcon size={13} className="text-fanos-accent" />
          Attack Distribution
        </div>
        <span className="text-[9px] text-fanos-dim">Last 24h</span>
      </div>

      <div className="flex items-center gap-3 px-3 py-2" style={{ minHeight: 190 }}>
        <div style={{ width: 130, height: 130, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={38} outerRadius={58}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 flex flex-col gap-1.5">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
              <span className="text-[10px] text-fanos-muted flex-1 truncate">{d.name}</span>
              <span className="text-[10px] font-semibold text-fanos-text">{d.value}%</span>
            </div>
          ))}
          <div className="mt-1 pt-1.5 border-t border-white/[0.05] text-[9px] text-fanos-dim">
            Total: <span className="text-fanos-text font-semibold">
              {data.reduce((s, d) => s + d.value, 0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
