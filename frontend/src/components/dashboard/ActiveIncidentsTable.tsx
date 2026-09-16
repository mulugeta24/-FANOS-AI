import { FileWarning } from 'lucide-react'
import { useActiveIncidents } from '@/hooks/useDashboard'
import { mockIncidents } from '@/lib/mockData'
import { severityClass, statusClass, timeAgo, riskColor } from '@/lib/utils'

export default function ActiveIncidentsTable() {
  const { data: incidents = mockIncidents } = useActiveIncidents()

  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <FileWarning size={16} className="text-fanos-accent" />
          Active Incidents
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}>
          {incidents.length} OPEN
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/[0.05] bg-black/10">
              {['Incident ID', 'Threat', 'Severity', 'Source IP', 'Status', 'Risk', 'Assigned', 'Time'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {incidents.map(inc => (
              <tr key={inc.id as string} className="hover:bg-white/[0.018] transition-colors">
                <td className="px-3 py-3 font-mono text-xs text-fanos-accent whitespace-nowrap">
                  {inc.id as string}
                </td>
                <td className="px-3 py-3 text-sm text-fanos-text font-medium max-w-[180px]">
                  <span className="truncate block">{inc.threat}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={severityClass(inc.severity)}>{inc.severity}</span>
                </td>
                <td className="px-3 py-3 font-mono text-xs text-fanos-muted whitespace-nowrap">
                  {inc.source_ip}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={statusClass(inc.status)}>{inc.status}</span>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-sm font-bold ${riskColor(inc.risk_score)}`}>
                    {inc.risk_score}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-fanos-muted whitespace-nowrap">
                  {inc.assigned_to}
                </td>
                <td className="px-3 py-3 text-xs text-fanos-dim whitespace-nowrap">
                  {timeAgo(new Date(inc.created_at as string))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-white/[0.04] flex justify-between items-center">
        <span className="text-xs text-fanos-dim">Showing {incidents.length} active incidents</span>
        <button className="fanos-btn text-xs py-1.5 px-3">View All Incidents</button>
      </div>
    </div>
  )
}
