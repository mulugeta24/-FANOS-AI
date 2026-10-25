import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { PieChart as PieIcon, ShieldCheck, Radio } from 'lucide-react'
import { useAttackDistribution } from '@/hooks/useDashboard'
import { mockAttackDistribution } from '@/lib/mockData'
import { useWorkspace } from '@/context/WorkspaceContext'

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-[#0a0f1d]/95 backdrop-blur-xl rounded-xl p-2.5 text-[11px] shadow-2xl border border-white/[0.1] text-white">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.payload.color }} />
        <span className="text-white font-bold">{d.name}</span>
      </div>
      <div className="text-slate-400 mt-0.5 font-mono">{d.value}% of attacks</div>
    </div>
  )
}

export default function AttackDistributionChart() {
  const { hasService } = useWorkspace()
  const { data: defaultData = mockAttackDistribution } = useAttackDistribution()

  const hasWaf = hasService('waf')
  const hasIds = hasService('ids')

  let data = defaultData
  let title = 'Threat Distribution'

  if (hasWaf && !hasIds) {
    title = 'WAF Exploit Distribution'
    data = [
      { name: 'SQL Injection', value: 38, color: '#ef4444' },
      { name: 'Cross-Site Scripting (XSS)', value: 24, color: '#f97316' },
      { name: 'SSRF & Probes', value: 19, color: '#00c8ff' },
      { name: 'Path Traversal', value: 13, color: '#00e5a0' },
      { name: 'Malformed JSON Payload', value: 6, color: '#8b5cf6' },
    ]
  } else if (hasIds && !hasWaf) {
    title = 'Network Exploit Distribution'
    data = [
      { name: 'Network Exploit', value: 42, color: '#ef4444' },
      { name: 'Port Scan & Recon', value: 28, color: '#38bdf8' },
      { name: 'TCP SYN Flood', value: 18, color: '#f59e0b' },
      { name: 'Protocol Anomaly', value: 12, color: '#8b5cf6' },
    ]
  }

  return (
    <div className="fanos-card overflow-hidden flex flex-col justify-between">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#0c1324]/50">
        <div className="flex items-center gap-2">
          {hasWaf && !hasIds ? (
            <ShieldCheck size={15} className="text-emerald-400" />
          ) : hasIds && !hasWaf ? (
            <Radio size={15} className="text-sky-400" />
          ) : (
            <PieIcon size={15} className="text-cyan-400" />
          )}
          <span className="text-[13px] font-bold text-white tracking-wide">{title}</span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          {hasWaf && !hasIds ? 'WAF Scoped' : hasIds && !hasWaf ? 'IDS Scoped' : 'Last 24h'}
        </span>
      </div>

      <div className="flex items-center gap-4 px-5 py-3" style={{ minHeight: 200 }}>
        <div style={{ width: 120, height: 120, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={36} outerRadius={54}
                paddingAngle={3}
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
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-[11px] text-slate-300 flex-1 truncate font-medium">{d.name}</span>
              <span className="text-[11px] font-bold text-white font-mono">{d.value}%</span>
            </div>
          ))}
          <div className="mt-1 pt-1.5 border-t border-white/[0.06] text-[10px] text-slate-400">
            Total: <span className="text-white font-bold font-mono">
              {data.reduce((s, d) => s + d.value, 0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

