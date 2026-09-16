import { useState } from 'react'

const MODULES = [
  {
    icon: '📡', title: 'Network Security', color: '#3B82F6',
    sub: 'Real-time network intrusion detection and prevention across all traffic layers.',
    features: ['Suricata IDS/IPS engine', 'Zeek network analysis', 'Port scan detection', 'DDoS mitigation', 'Traffic anomaly detection'],
  },
  {
    icon: '🌐', title: 'Web Security', color: '#22D3EE',
    sub: 'Complete web application protection against OWASP Top 10 and beyond.',
    features: ['SQL Injection detection', 'XSS prevention', 'SSRF & CSRF blocking', 'ModSecurity WAF', 'URI assessment engine'],
  },
  {
    icon: '🖥', title: 'System Security', color: '#A78BFA',
    sub: 'Host-based intrusion detection across servers, endpoints, and infrastructure.',
    features: ['Wazuh host IDS', 'File integrity monitoring', 'System log analysis', 'Rootkit detection', 'Compliance monitoring'],
  },
  {
    icon: '🧠', title: 'AI + Risk Intelligence', color: '#10B981',
    sub: 'XGBoost classification with composite risk scoring and automated response.',
    features: ['XGBoost AI engine (99.84%)', 'Composite risk 0–100', 'Threat correlation engine', 'Incident management', 'Auto-response engine'],
  },
]

export default function PlatformSection() {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section className="py-24 px-16 relative z-10" data-fade
      style={{ background: '#080C14' }}>
      <style>{`@keyframes scanLineX{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-2 mb-3 text-[10px] font-bold tracking-widest uppercase"
            style={{ color: '#22D3EE' }}>
            <div className="w-6 h-0.5 bg-fanos-accent" />Platform<div className="w-6 h-0.5 bg-fanos-accent" />
          </div>
          <h2 className="text-[42px] font-extrabold text-white tracking-tight mb-4">
            One Platform. <span style={{ color: '#22D3EE' }}>Complete Defense.</span>
          </h2>
          <p className="text-[15px] text-fanos-muted max-w-[540px] mx-auto leading-relaxed">
            FANOS AI covers every attack surface with a unified AI engine and automated response.
            Hover each module to explore its capabilities.
          </p>
        </div>

        {/* IMAGE 4: IDS laptop with shields — shown as a featured banner above modules */}
        <div data-fade className="relative rounded-2xl overflow-hidden mb-8"
          style={{ height: 260, border: '1px solid rgba(34,211,238,0.18)', boxShadow: '0 0 60px rgba(34,211,238,0.08)' }}>
          <img src="/images/ids-laptop-shields.jpg" alt="FANOS IDS Platform"
            className="w-full h-full object-cover object-center"
            style={{ opacity: 0.85 }}
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.background = '#111A2A' }}
          />
          {/* Dark gradient overlay — left side for text */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(8,12,20,0.92) 0%,rgba(8,12,20,0.6) 50%,rgba(8,12,20,0.2) 100%)' }} />
          {/* Scan shimmer */}
          <div className="absolute inset-y-0 w-32 pointer-events-none"
            style={{ background: 'linear-gradient(90deg,transparent,rgba(34,211,238,0.05),transparent)', animation: 'scanLineX 3s linear infinite' }} />
          {/* Text overlay */}
          <div className="absolute inset-0 flex flex-col justify-center pl-12">
            <div className="text-[9px] font-bold tracking-widest uppercase mb-2"
              style={{ color: '#22D3EE' }}>Intrusion Detection System</div>
            <h3 className="text-[26px] font-extrabold text-white leading-tight mb-2">
              AI-Powered IDS<br />
              <span style={{ color: '#22D3EE' }}>Across Every Layer.</span>
            </h3>
            <p className="text-[13px] max-w-[400px]" style={{ color: '#94A3B8' }}>
              Network · Web · System — FANOS AI watches every attack surface simultaneously.
            </p>
            <div className="flex gap-2 mt-4">
              {['Suricata','Zeek','Wazuh','WAF'].map(t => (
                <span key={t} className="text-[9px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(34,211,238,0.1)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.25)', backdropFilter:'blur(4px)' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          {/* Right side: stats */}
          <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col gap-3">
            {[
              { val: '6/6',    lbl: 'Sensors Online', color: '#10B981' },
              { val: '99.84%', lbl: 'AI Accuracy',    color: '#22D3EE' },
              { val: '4.2ms',  lbl: 'Detection',      color: '#A78BFA' },
            ].map(s => (
              <div key={s.lbl} className="text-right px-3 py-2 rounded-lg"
                style={{ background: 'rgba(8,12,20,0.7)', border: `1px solid ${s.color}30`, backdropFilter:'blur(4px)' }}>
                <div className="text-[18px] font-extrabold leading-none" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[9px] uppercase tracking-wide mt-0.5" style={{ color: '#64748B' }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-5">
          {MODULES.map((m, i) => (
            <div key={m.title}
              data-fade data-delay={String(i + 1)}
              className="rounded-2xl p-6 cursor-pointer transition-all duration-300 relative overflow-hidden"
              style={{
                background: hovered === i ? 'rgba(17,26,42,0.95)' : '#111A2A',
                border: `1px solid ${hovered === i ? m.color + '55' : '#1E3047'}`,
                transform: hovered === i ? 'translateY(-6px)' : 'translateY(0)',
                boxShadow: hovered === i ? `0 20px 50px rgba(0,0,0,0.5), 0 0 30px ${m.color}20` : 'none',
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}>

              {/* Top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl transition-all duration-300"
                style={{ background: hovered === i ? `linear-gradient(90deg,${m.color},transparent)` : 'transparent' }} />

              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{ background: `${m.color}15`, border: `1px solid ${m.color}30` }}>
                {m.icon}
              </div>

              <h3 className="text-[16px] font-bold text-white mb-2">{m.title}</h3>
              <p className="text-[12px] text-fanos-dim leading-relaxed mb-4">{m.sub}</p>

              <div className="flex flex-col gap-2">
                {m.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-[11px] text-fanos-muted">
                    <span className="text-[10px] font-bold" style={{ color: m.color }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
