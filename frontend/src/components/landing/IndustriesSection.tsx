import { useState } from 'react'

const TABS = [
  {
    id: 'banking', label: '🏦 Banking & Finance',
    title: 'Protect Financial Systems.\nStop Fraud-Related Threats.',
    desc: 'FANOS AI monitors every transaction endpoint, API, and network segment — detecting credential attacks, injection attempts, and fraud-related traffic in real time.',
    features: ['Real-time transaction monitoring', 'Credential brute force prevention', 'API security & abuse detection', 'Regulatory compliance monitoring', 'Insider threat detection'],
    stats: [
      { label: 'Transactions Monitored', value: '12,842/hr' },
      { label: 'Credential Attacks Blocked', value: '128 today' },
      { label: 'AI Detection Accuracy', value: '99.84%' },
      { label: 'Avg Response Time', value: '4.2 ms' },
      { label: 'System Health', value: '98.7% ●', color: '#10B981' },
    ],
    color: '#10B981',
  },
  {
    id: 'telecom', label: '📡 Telecommunication',
    title: 'Protect Network Infrastructure.\nDetect Network Attacks.',
    desc: 'FANOS AI secures telecom backbone networks, detecting volumetric attacks, BGP hijacks, signaling abuse, and network reconnaissance at carrier scale.',
    features: ['DDoS volumetric attack detection', 'Network segment monitoring', 'Signaling security analysis', 'Subscriber data protection', 'Infrastructure recon detection'],
    stats: [
      { label: 'Network Events / hr', value: '48,200' },
      { label: 'DDoS Attacks Mitigated', value: '14 today' },
      { label: 'Network Scans Blocked', value: '891' },
      { label: 'Uptime', value: '99.99%' },
      { label: 'Sensors Active', value: '12 / 12 ●', color: '#10B981' },
    ],
    color: '#22D3EE',
  },
  {
    id: 'gov', label: '🏛 Government',
    title: 'Protect Critical Systems.\nCentralized Security Control.',
    desc: 'FANOS AI provides government agencies with centralized threat visibility, advanced persistent threat detection, and compliance-driven security operations.',
    features: ['Critical infrastructure protection', 'APT detection and response', 'Centralized SOC visibility', 'Data classification protection', 'Full audit trail & compliance'],
    stats: [
      { label: 'APT Attempts Blocked', value: '7 today' },
      { label: 'Compliance Score', value: '98.4%' },
      { label: 'Audit Log Entries', value: '24,891' },
      { label: 'Incident MTTR', value: '4.2 min' },
      { label: 'Clearance Level', value: 'CLASSIFIED ●', color: '#A78BFA' },
    ],
    color: '#A78BFA',
  },
  {
    id: 'enterprise', label: '🏢 Enterprise',
    title: 'Protect Business Infrastructure.\nSOC Visibility & Response.',
    desc: 'FANOS AI gives enterprises full SOC capabilities — from detection to incident management — with automated response that scales with your threat landscape.',
    features: ['Full SOC dashboard visibility', 'Automated incident creation', 'Multi-vector threat coverage', 'Role-based access control', 'Executive reporting & analytics'],
    stats: [
      { label: 'Security Events / day', value: '8,421' },
      { label: 'Active Incidents', value: '24' },
      { label: 'MTTR', value: '4.2 min' },
      { label: 'Threats Blocked Today', value: '156' },
      { label: 'AI Engine', value: 'Production ●', color: '#10B981' },
    ],
    color: '#3B82F6',
  },
]

export default function IndustriesSection() {
  const [active, setActive] = useState(0)
  const tab = TABS[active]

  return (
    <section className="py-24 px-16 relative z-10" data-fade
      style={{ background: 'linear-gradient(180deg,#080C14,#0D1421)' }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3 text-[10px] font-bold tracking-widest uppercase"
            style={{ color: '#22D3EE' }}>
            <div className="w-6 h-0.5 bg-fanos-accent" />Solutions<div className="w-6 h-0.5 bg-fanos-accent" />
          </div>
          <h2 className="text-[38px] font-extrabold text-white tracking-tight">
            Built for Organizations<br />
            <span style={{ color: '#22D3EE' }}>That Cannot Afford to Fail.</span>
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 justify-center mb-10 flex-wrap">
          {TABS.map((t, i) => (
            <button key={t.id} onClick={() => setActive(i)}
              className="px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 border cursor-pointer"
              style={active === i
                ? { background: `${t.color}15`, borderColor: `${t.color}55`, color: t.color }
                : { background: 'transparent', borderColor: '#1E3047', color: '#94A3B8' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 gap-12 items-center"
          style={{ animation: 'lp-menu-in 0.3s ease' }} key={active}>
          <div>
            <div className="text-[9px] font-bold px-2.5 py-1 rounded-full inline-flex mb-4"
              style={{ background: `${tab.color}12`, color: tab.color, border: `1px solid ${tab.color}30` }}>
              {tab.label}
            </div>
            <h3 className="text-[28px] font-extrabold text-white leading-tight mb-4 whitespace-pre-line">
              {tab.title}
            </h3>
            <p className="text-[14px] text-fanos-muted leading-relaxed mb-6">{tab.desc}</p>
            <div className="flex flex-col gap-2.5">
              {tab.features.map(f => (
                <div key={f} className="flex items-center gap-2.5 text-[13px] text-fanos-muted">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tab.color }} />
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-6" style={{ background: '#111A2A', border: `1px solid ${tab.color}25` }}>
            <div className="text-[9px] font-bold tracking-widest uppercase text-fanos-dim mb-4">
              FANOS AI — {TABS[active].label.replace(/^.+?\s/, '')} Profile
            </div>
            <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {tab.stats.map(s => (
                <div key={s.label} className="flex justify-between items-center py-3">
                  <span className="text-[11px] text-fanos-dim">{s.label}</span>
                  <span className="text-[13px] font-bold" style={{ color: s.color ?? tab.color }}>{s.value}</span>
                </div>
              ))}
            </div>
            <button className="mt-5 w-full py-3 rounded-xl text-[13px] font-bold transition-all duration-200"
              style={{ background: `${tab.color}15`, border: `1px solid ${tab.color}35`, color: tab.color }}>
              Learn More →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
