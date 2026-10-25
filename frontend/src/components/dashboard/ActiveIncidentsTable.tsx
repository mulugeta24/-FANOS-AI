import { FileWarning, ShieldCheck, Radio, AlertCircle } from 'lucide-react'
import { useActiveIncidents } from '@/hooks/useDashboard'
import { mockIncidents } from '@/lib/mockData'
import { severityClass, statusClass, timeAgo, riskColor } from '@/lib/utils'
import { useWorkspace } from '@/context/WorkspaceContext'

export default function ActiveIncidentsTable() {
  const { activeCustomer, hasService } = useWorkspace()
  const { data: defaultIncidents = mockIncidents } = useActiveIncidents()

  const hasWaf = hasService('waf')
  const hasIds = hasService('ids')

  let incidents: any[] = []

  if (activeCustomer.approvedServices.length === 0) {
    incidents = []
  } else if (hasWaf && !hasIds) {
    incidents = [
      {
        id: `INC-WAF-${activeCustomer.id.slice(5, 9)}-01`,
        threat: 'Targeted SSRF & Injection Campaign',
        severity: 'CRITICAL',
        source_ip: '194.26.29.112',
        status: 'Contained',
        risk_score: 96,
        assigned_to: 'WAF Auto-Defense',
        created_at: new Date(Date.now() - 180000).toISOString(),
      },
      {
        id: `INC-WAF-${activeCustomer.id.slice(5, 9)}-02`,
        threat: 'Automated SQL Injection Wave',
        severity: 'HIGH',
        source_ip: '185.220.101.45',
        status: 'Blocked',
        risk_score: 88,
        assigned_to: 'SOC Analyst',
        created_at: new Date(Date.now() - 600000).toISOString(),
      },
    ]
  } else if (hasIds && !hasWaf) {
    incidents = [
      {
        id: `INC-NET-${activeCustomer.id.slice(5, 9)}-01`,
        threat: 'Network Port Reconnaissance',
        severity: 'HIGH',
        source_ip: '192.168.56.31',
        status: 'Investigating',
        risk_score: 84,
        assigned_to: 'Suricata Sensor',
        created_at: new Date(Date.now() - 360000).toISOString(),
      },
      {
        id: `INC-NET-${activeCustomer.id.slice(5, 9)}-02`,
        threat: 'Datacenter SYN Flood DoS',
        severity: 'CRITICAL',
        source_ip: '45.142.214.18',
        status: 'Contained',
        risk_score: 94,
        assigned_to: 'Tier 3 SOC Lead',
        created_at: new Date(Date.now() - 900000).toISOString(),
      },
    ]
  } else {
    incidents = defaultIncidents
  }

  return (
    <div className="fanos-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#0c1324]/50">
        <div className="flex items-center gap-2">
          {hasWaf && !hasIds ? (
            <ShieldCheck size={16} className="text-emerald-400" />
          ) : hasIds && !hasWaf ? (
            <Radio size={16} className="text-sky-400" />
          ) : (
            <FileWarning size={16} className="text-cyan-400" />
          )}
          <span className="text-[13px] font-bold text-white tracking-wide">
            {hasWaf && !hasIds ? 'WAF Security Incidents' : hasIds && !hasWaf ? 'Network IDS Incidents' : 'Active Incidents'}
          </span>
        </div>
        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-sm ${
          incidents.length > 0
            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        }`}>
          {incidents.length} {incidents.length === 1 ? 'OPEN' : incidents.length > 0 ? 'OPEN' : 'CLEAR'}
        </span>
      </div>

      <div className="overflow-x-auto">
        {incidents.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs px-4">
            <AlertCircle size={20} className="mx-auto text-slate-500 mb-2" />
            No active incidents reported for {activeCustomer.name}.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-black/30">
                {['Incident ID', 'Threat', 'Severity', 'Source IP', 'Status', 'Risk', 'Assigned', 'Time'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.7px] uppercase text-slate-400 whitespace-nowrap font-mono">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {incidents.map(inc => (
                <tr key={inc.id as string} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-cyan-400 whitespace-nowrap">
                    {inc.id as string}
                  </td>
                  <td className="px-4 py-3 text-xs text-white font-medium max-w-[180px]">
                    <span className="truncate block">{inc.threat}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={severityClass(inc.severity)}>{inc.severity}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                    {inc.source_ip}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={statusClass(inc.status)}>{inc.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold font-mono ${riskColor(inc.risk_score)}`}>
                      {inc.risk_score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {inc.assigned_to}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                    {timeAgo(new Date(inc.created_at as string))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-5 py-3 border-t border-white/[0.08] flex justify-between items-center bg-[#0c1324]/30">
        <span className="text-xs text-slate-400">Showing {incidents.length} active incidents</span>
        <button className="fanos-btn text-xs py-1.5 px-3">View All Incidents</button>
      </div>
    </div>
  )
}

