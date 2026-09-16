import { useEffect, useRef, useState } from 'react'

const ARCH = [
  { label: 'INTERNET', color: '#EF4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)'  },
  { label: 'WAF',       color: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
  { label: 'WEB APPLICATION', color: '#F59E0B', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.22)' },
  { label: 'SURICATA / ZEEK', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
  { label: 'FANOS COLLECTOR', color: '#22D3EE', bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.25)' },
  { label: 'AI ENGINE (XGBoost)', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)', bold: true },
  { label: 'RISK ENGINE', color: '#F97316', bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.22)' },
  { label: 'THREAT CORRELATION', color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.22)' },
  { label: 'RESPONSE ENGINE', color: '#22D3EE', bg: 'rgba(34,211,238,0.07)', border: 'rgba(34,211,238,0.2)' },
  { label: 'PREVENTION', color: '#10B981', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.22)' },
  { label: '🛡 PROTECTED', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: '#10B981', bold: true },
]

export default function ArchSection() {
  const [active, setActive] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let i = 0
        const t = setInterval(() => {
          setActive(i)
          i++
          if (i >= ARCH.length) clearInterval(t)
        }, 200)
        obs.disconnect()
      }
    }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section className="py-24 px-16 relative z-10" data-fade style={{ background: '#080C14' }}>
      <div className="max-w-[1200px] mx-auto grid grid-cols-2 gap-16 items-center">

        <div data-fade data-delay="1">
          <div className="flex items-center gap-2 mb-3 text-[10px] font-bold tracking-widest uppercase"
            style={{ color: '#22D3EE' }}>
            <div className="w-6 h-0.5 bg-fanos-accent" />Architecture
          </div>
          <h2 className="text-[38px] font-extrabold text-white leading-tight tracking-tight mb-5">
            End-to-End<br />
            <span style={{ color: '#22D3EE' }}>Security Architecture.</span>
          </h2>
          <p className="text-[14px] text-fanos-muted leading-relaxed mb-6">
            From the first packet to the final block — every FANOS AI component works together
            to deliver continuous, intelligent security across your entire attack surface.
          </p>
          <p className="text-[14px] text-fanos-muted leading-relaxed mb-8">
            Threat enters → FANOS detects → AI understands → risk is calculated →
            threat is correlated → response happens → attack is <strong className="text-fanos-green">prevented.</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {['Suricata','Zeek','Wazuh','ModSecurity WAF','XGBoost AI','FastAPI','PostgreSQL','React SOC'].map(t => (
              <span key={t} className="text-[10px] font-semibold px-2.5 py-1 rounded"
                style={{ background: 'rgba(34,211,238,0.07)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.2)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div ref={ref} data-fade data-delay="2"
          className="rounded-2xl p-8 flex flex-col items-center"
          style={{ background: '#111A2A', border: '1px solid rgba(34,211,238,0.15)' }}>
          {ARCH.map((node, i) => (
            <div key={node.label} className="flex flex-col items-center w-full">
              <div className="w-full text-center rounded-xl py-2.5 px-4 text-[11px] tracking-wider transition-all duration-500"
                style={{
                  background: i <= active ? node.bg : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${i <= active ? node.border : 'rgba(30,48,71,0.5)'}`,
                  color: i <= active ? node.color : '#4a6080',
                  fontWeight: node.bold ? 700 : 600,
                  boxShadow: i === active ? `0 0 18px ${node.border}` : 'none',
                  opacity: i <= active ? 1 : 0.4,
                  animation: i === ARCH.length - 1 && i <= active ? 'lp-arch-glow 2s ease-in-out infinite' : 'none',
                }}>
                {node.label}
              </div>
              {i < ARCH.length - 1 && (
                <div className="w-px h-5 transition-all duration-300"
                  style={{ background: i < active ? `linear-gradient(to bottom,${node.color}60,${ARCH[i+1].color}40)` : 'rgba(30,48,71,0.5)' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
