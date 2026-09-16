import { Target, ExternalLink, Info } from 'lucide-react'

/* ── MITRE ATT&CK tactic columns ─────────────────────────── */
const TACTICS: {
  id: string
  name: string
  techniques: { id: string; name: string; severity: 'critical' | 'high' | 'medium' | 'low' | null }[]
}[] = [
  {
    id: 'TA0001', name: 'Initial Access',
    techniques: [
      { id: 'T1566.001', name: 'Spearphishing',        severity: null },
      { id: 'T1078',     name: 'Valid Accounts',        severity: null },
      { id: 'T1190',     name: 'Exploit Public App',    severity: 'medium' },
    ],
  },
  {
    id: 'TA0002', name: 'Execution',
    techniques: [
      { id: 'T1059.001', name: 'PowerShell',            severity: 'critical' },
      { id: 'T1059.003', name: 'Windows CMD',           severity: null },
      { id: 'T1047',     name: 'WMI',                   severity: null },
    ],
  },
  {
    id: 'TA0003', name: 'Persistence',
    techniques: [
      { id: 'T1053.005', name: 'Scheduled Task',        severity: null },
      { id: 'T1136',     name: 'Create Account',        severity: null },
      { id: 'T1543',     name: 'Create/Modify Service', severity: null },
    ],
  },
  {
    id: 'TA0004', name: 'Privilege Escalation',
    techniques: [
      { id: 'T1548',     name: 'Abuse Elevation Control', severity: null },
      { id: 'T1055',     name: 'Process Injection',     severity: null },
      { id: 'T1134',     name: 'Access Token Manip.',   severity: null },
    ],
  },
  {
    id: 'TA0006', name: 'Credential Access',
    techniques: [
      { id: 'T1003.001', name: 'LSASS Memory',          severity: 'critical' },
      { id: 'T1110',     name: 'Brute Force',            severity: 'high' },
      { id: 'T1552',     name: 'Unsecured Credentials', severity: null },
    ],
  },
  {
    id: 'TA0007', name: 'Discovery',
    techniques: [
      { id: 'T1046',     name: 'Network Port Scan',     severity: 'medium' },
      { id: 'T1082',     name: 'System Info Disc.',     severity: null },
      { id: 'T1083',     name: 'File & Dir Discovery',  severity: null },
    ],
  },
  {
    id: 'TA0008', name: 'Lateral Movement',
    techniques: [
      { id: 'T1021.002', name: 'SMB/Admin Shares',      severity: 'critical' },
      { id: 'T1534',     name: 'Internal Spearphishing', severity: null },
      { id: 'T1570',     name: 'Lateral Tool Transfer', severity: null },
    ],
  },
  {
    id: 'TA0009', name: 'Collection',
    techniques: [
      { id: 'T1074.001', name: 'Local Data Staging',    severity: 'high' },
      { id: 'T1115',     name: 'Clipboard Data',        severity: null },
      { id: 'T1560',     name: 'Archive Collected Data',severity: null },
    ],
  },
  {
    id: 'TA0011', name: 'C2',
    techniques: [
      { id: 'T1071.001', name: 'Web Protocols',         severity: 'high' },
      { id: 'T1573',     name: 'Encrypted Channel',     severity: null },
      { id: 'T1105',     name: 'Ingress Tool Transfer', severity: null },
    ],
  },
  {
    id: 'TA0010', name: 'Exfiltration',
    techniques: [
      { id: 'T1041',     name: 'Exfil Over C2',         severity: null },
      { id: 'T1048',     name: 'Exfil Over Alt Proto',  severity: null },
    ],
  },
  {
    id: 'TA0040', name: 'Impact',
    techniques: [
      { id: 'T1486',     name: 'Data Encrypted',        severity: 'critical' },
      { id: 'T1490',     name: 'Inhibit Recovery',      severity: 'high' },
      { id: 'T1529',     name: 'System Shutdown',       severity: null },
    ],
  },
]

const SEV_STYLE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.45)',   text: '#ef4444', dot: '#ef4444' },
  high:     { bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.4)',   text: '#f97316', dot: '#f97316' },
  medium:   { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)',  text: '#f59e0b', dot: '#f59e0b' },
  low:      { bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.3)',   text: '#3b82f6', dot: '#3b82f6' },
}

/* Summary stats */
const SUMMARY = [
  { label: 'Critical',  count: 3, color: '#ef4444' },
  { label: 'High',      count: 3, color: '#f97316' },
  { label: 'Medium',    count: 3, color: '#f59e0b' },
  { label: 'Monitored', count: 2, color: '#3b82f6' },
]

export default function MitreAttackPanel() {

  return (
    <div className="fanos-card">
      {/* Header */}
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Target size={13} className="text-fanos-accent" />
          MITRE ATT&CK Coverage
        </div>
        <div className="flex items-center gap-3">
          {SUMMARY.map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              <span className="text-[10px] text-fanos-dim font-semibold">
                <span style={{ color: s.color }}>{s.count}</span> {s.label}
              </span>
            </div>
          ))}
          <button className="text-fanos-dim hover:text-fanos-muted transition-colors" title="Info">
            <Info size={12} />
          </button>
          <button className="fanos-btn text-[9px] py-0.5 px-2 gap-1">
            <ExternalLink size={9} />
            ATT&CK Navigator
          </button>
        </div>
      </div>

      {/* Sub-header note */}
      <div className="px-4 py-2 border-b border-white/[0.04] bg-black/10">
        <p className="text-[10px] text-fanos-dim">
          Techniques observed in active incidents and detection events — Last 24h · Incident INC-2026-004821 highlighted
        </p>
      </div>

      {/* Matrix */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {TACTICS.map(tac => (
            <div key={tac.id} className="w-[120px] flex-shrink-0">
              {/* Tactic header */}
              <div className="px-2 py-1.5 rounded-t text-center mb-1"
                style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[9px] font-bold uppercase tracking-[0.8px] text-fanos-muted leading-tight">{tac.name}</div>
                <div className="text-[8px] text-fanos-dim font-mono mt-0.5">{tac.id}</div>
              </div>

              {/* Techniques */}
              <div className="flex flex-col gap-1">
                {tac.techniques.map(tech => {
                  const style = tech.severity ? SEV_STYLE[tech.severity] : null
                  return (
                    <div
                      key={tech.id}
                      className="px-2 py-1.5 rounded text-center cursor-pointer transition-all duration-100"
                      style={style
                        ? { background: style.bg, border: `1px solid ${style.border}` }
                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }
                      }
                      title={`${tech.id} — ${tech.name}`}
                    >
                      {style && (
                        <div className="w-1.5 h-1.5 rounded-full mx-auto mb-1" style={{ background: style.dot }} />
                      )}
                      <div className="text-[9px] leading-tight truncate"
                        style={{ color: style ? style.text : '#4a6080', fontWeight: style ? 600 : 400 }}>
                        {tech.name}
                      </div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: style ? style.text + 'cc' : '#3a5060' }}>
                        {tech.id}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center gap-6">
        {Object.entries(SEV_STYLE).map(([sev, s]) => (
          <div key={sev} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: s.bg, border: `1px solid ${s.border}` }} />
            <span className="text-[10px] capitalize" style={{ color: s.text }}>{sev}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
          <span className="text-[10px] text-fanos-dim">Not Observed</span>
        </div>
      </div>
    </div>
  )
}
