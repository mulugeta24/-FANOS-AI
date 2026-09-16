import { useEffect, useState } from 'react'

const STEPS = [
  { label: 'Normal Traffic',                  badge: 'MONITORING', bColor: '#3B82F6',  bgB: 'rgba(59,130,246,.15)',  borderB: 'rgba(59,130,246,.35)',  border: '#1E3047',  bg: 'rgba(17,26,42,1)' },
  { label: 'Suspicious Activity Detected',    badge: 'SUSPICIOUS', bColor: '#F59E0B',  bgB: 'rgba(245,158,11,.15)', borderB: 'rgba(245,158,11,.35)',  border: '#F59E0B',  bg: 'rgba(245,158,11,.04)' },
  { label: 'FANOS AI Analyzing',              badge: 'AI ENGINE',  bColor: '#A78BFA',  bgB: 'rgba(167,139,250,.15)',borderB: 'rgba(167,139,250,.35)', border: '#A78BFA',  bg: 'rgba(167,139,250,.04)' },
  { label: 'SQL Injection — Classified',      badge: 'CLASSIFIED', bColor: '#A78BFA',  bgB: 'rgba(167,139,250,.15)',borderB: 'rgba(167,139,250,.35)', border: '#A78BFA',  bg: 'rgba(167,139,250,.04)' },
  { label: 'Risk Score: 96 / 100',            badge: 'CRITICAL',   bColor: '#EF4444',  bgB: 'rgba(239,68,68,.15)',  borderB: 'rgba(239,68,68,.35)',   border: '#EF4444',  bg: 'rgba(239,68,68,.06)' },
  { label: 'Incident Created + Team Alerted', badge: 'RESPONSE',   bColor: '#F97316',  bgB: 'rgba(249,115,22,.15)', borderB: 'rgba(249,115,22,.35)',  border: '#F97316',  bg: 'rgba(249,115,22,.04)' },
  { label: '✓ Threat Blocked',                badge: 'PROTECTED',  bColor: '#10B981',  bgB: 'rgba(16,185,129,.15)', borderB: 'rgba(16,185,129,.35)',  border: '#10B981',  bg: 'rgba(16,185,129,.08)', bold: true },
]

export default function LiveDemoSection() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % STEPS.length), 1100)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="py-24 px-16 relative z-10" data-fade
      style={{ background: 'linear-gradient(180deg,#080C14 0%,#0D1421 100%)' }}>

      <style>{`
        @keyframes scanLineX { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
      `}</style>

      <div className="max-w-[1200px] mx-auto grid grid-cols-2 gap-16 items-start">

        {/* Left text */}
        <div data-fade data-delay="1">
          <div className="flex items-center gap-2 mb-3 text-[10px] font-bold tracking-widest uppercase"
            style={{ color: '#22D3EE' }}>
            <div className="w-6 h-0.5" style={{ background: '#22D3EE' }} />
            Live Demonstration
          </div>
          <h2 className="text-[38px] font-extrabold text-white leading-tight tracking-tight mb-5">
            Detect. Respond.<br />
            <span style={{ color: '#22D3EE' }}>Stop the Attack.</span>
          </h2>
          <p className="text-[14px] leading-relaxed mb-5" style={{ color: '#94A3B8' }}>
            FANOS AI transforms high-risk threats into controlled response and prevention
            actions — alerting SOC teams, creating incidents, and blocking malicious activity
            before they become damage.
          </p>
          <p className="text-[14px] leading-relaxed mb-8" style={{ color: '#94A3B8' }}>
            Turn Security Data Into Intelligence. Know what is happening, how dangerous it is,
            and what matters most — in <strong style={{ color: '#22D3EE' }}>milliseconds.</strong>
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { val: '4.2ms', lbl: 'Detection Speed', color: '#22D3EE' },
              { val: '96%',   lbl: 'Auto-Blocked',     color: '#10B981' },
              { val: '12+',   lbl: 'Attack Classes',   color: '#A78BFA' },
            ].map(s => (
              <div key={s.lbl} className="rounded-xl px-4 py-3"
                style={{ background: '#111A2A', border: '1px solid #1E3047' }}>
                <div className="text-[22px] font-extrabold leading-none" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[9px] uppercase tracking-widest mt-1" style={{ color: '#64748B' }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* IMAGE 2: AI Robot with blue shield+laptop in data center */}
          <div className="relative rounded-2xl overflow-hidden"
            style={{ height: 220, border: '1px solid rgba(34,211,238,0.18)', boxShadow: '0 0 40px rgba(34,211,238,0.08)' }}>
            <img src="https://img.freepik.com/premium-photo/ai-robot-using-cyber-security-protect-information-privacy_31965-11705.jpg" alt="AI Security Robot"
              className="w-full h-full object-cover object-center"
              style={{ opacity: 0.9 }}
              onError={e => { (e.target as HTMLImageElement).parentElement!.style.background = 'rgba(17,26,42,0.8)' }}
            />
            {/* Edge fade */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(180deg,transparent 30%,rgba(8,12,20,0.85) 100%)' }} />
            {/* Scan shimmer */}
            <div className="absolute inset-y-0 w-24 pointer-events-none"
              style={{ background: 'linear-gradient(90deg,transparent,rgba(34,211,238,0.06),transparent)', animation: 'scanLineX 2.5s linear infinite' }} />
            {/* Label */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-white">AI-Powered Cyber Defense</div>
                <div className="text-[9px]" style={{ color: '#94A3B8' }}>FANOS AI Engine — Production</div>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold px-2 py-1 rounded-full"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981', animation: 'lp-pulse-green 1.5s infinite' }} />
                ONLINE
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            {['✓ Real-Time', '✓ AI-Powered', '✓ Automated Response'].map(t => (
              <span key={t} className="text-[10px] font-semibold px-3 py-1 rounded-full"
                style={{ background: 'rgba(34,211,238,0.08)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.2)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Image 3 + Animated flow */}
        <div data-fade data-delay="2" className="flex flex-col items-center gap-0">

          {/* IMAGE 3: AI Robot standing with orange shield + network */}
          <div className="relative w-full mb-5 rounded-2xl overflow-hidden"
            style={{ height: 220, border: '1px solid rgba(249,115,22,0.2)', boxShadow: '0 0 40px rgba(249,115,22,0.1)', flexShrink: 0 }}>
            <img src="/images/ai-robot-shield-orange.jpg" alt="AI Defense Robot — Network"
              className="w-full h-full object-cover object-top"
              style={{ opacity: 0.88 }}
              onError={e => { (e.target as HTMLImageElement).parentElement!.style.background = 'rgba(17,26,42,0.9)' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 40%,rgba(8,12,20,0.9) 100%)' }} />
            <div className="absolute inset-y-0 w-20 pointer-events-none"
              style={{ background: 'linear-gradient(90deg,transparent,rgba(249,115,22,0.05),transparent)', animation: 'scanLineX 3s linear infinite' }} />
            <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(8,12,20,0.7)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.25)', backdropFilter: 'blur(4px)' }}>
                FANOS AI Active Defense
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', backdropFilter: 'blur(4px)' }}>
                THREAT DETECTED
              </span>
            </div>
            <div className="absolute bottom-3 left-4">
              <div className="text-[10px] font-semibold text-white">Analyzing attack pattern...</div>
            </div>
          </div>

          {/* Animated detection flow */}
          {STEPS.map((step, i) => (
            <div key={i} className="flex flex-col items-center w-full">
              <div className="w-full rounded-xl px-5 py-3 flex items-center justify-between transition-all duration-500"
                style={{
                  background: i <= active ? step.bg : 'rgba(17,26,42,0.6)',
                  border: `1px solid ${i <= active ? step.border : '#1E3047'}`,
                  opacity: i <= active ? 1 : 0.35,
                  boxShadow: i === active ? `0 0 18px ${step.border}40` : 'none',
                }}>
                <span className={`text-[12px] font-semibold ${step.bold ? '' : ''}`}
                  style={{ color: step.bold && i <= active ? '#10B981' : '#F1F5F9' }}>
                  {step.label}
                </span>
                <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                  style={{ background: step.bgB, color: step.bColor, border: `1px solid ${step.borderB}` }}>
                  {step.badge}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-px h-6 transition-all duration-300"
                  style={{ background: i < active ? `linear-gradient(to bottom,${step.border},${STEPS[i+1].border})` : 'rgba(30,48,71,0.5)' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
