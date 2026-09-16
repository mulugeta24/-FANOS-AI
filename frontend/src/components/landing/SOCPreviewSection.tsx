import { useEffect, useState, useRef } from 'react'

const CHART_HEIGHTS = [30, 55, 42, 70, 88, 65, 95, 78, 60, 72, 85, 64, 90, 75, 58, 80, 68, 92, 55, 70]
const EVENTS = [
  { type: 'SQL Injection Campaign',   status: 'BLOCKED',   statusColor: '#10B981', statusBg: 'rgba(16,185,129,.12)' },
  { type: 'Port Scan Reconnaissance', status: 'BLOCKED',   statusColor: '#10B981', statusBg: 'rgba(16,185,129,.12)' },
  { type: 'DDoS Attempt',             status: 'MITIGATED', statusColor: '#3B82F6', statusBg: 'rgba(59,130,246,.12)' },
  { type: 'Brute Force Login',        status: 'BLOCKED',   statusColor: '#10B981', statusBg: 'rgba(16,185,129,.12)' },
  { type: 'XSS Payload Detected',     status: 'BLOCKED',   statusColor: '#10B981', statusBg: 'rgba(16,185,129,.12)' },
]

function useCountUp(target: number, duration = 2000) {
  const [val, setVal] = useState(0)
  const started = useRef(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        function frame(now: number) {
          const p = Math.min((now - start) / duration, 1)
          setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
          if (p < 1) requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
        obs.disconnect()
      }
    }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target, duration])

  return { val, ref }
}

function KPI({ value, label, color }: { value: number; label: string; color: string }) {
  const { val, ref } = useCountUp(value, 1800)
  return (
    <div ref={ref} className="py-5 px-6"
      style={{ background: '#111A2A', borderBottom: '1px solid #1E3047' }}>
      <div className="text-[30px] font-extrabold leading-none" style={{ color }}>
        {val.toLocaleString()}
      </div>
      <div className="text-[9px] font-semibold uppercase tracking-widest text-fanos-dim mt-1">{label}</div>
    </div>
  )
}

export default function SOCPreviewSection() {
  const [chartVisible, setChartVisible] = useState(false)
  const secRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setChartVisible(true); obs.disconnect() }
    }, { threshold: 0.3 })
    if (secRef.current) obs.observe(secRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={secRef} className="py-24 px-16 relative z-10" data-fade
      style={{ background: '#0D1421' }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3 text-[10px] font-bold tracking-widest uppercase"
            style={{ color: '#22D3EE' }}>
            <div className="w-6 h-0.5 bg-fanos-accent" />SOC Dashboard<div className="w-6 h-0.5 bg-fanos-accent" />
          </div>
          <h2 className="text-[38px] font-extrabold text-white tracking-tight mb-4">
            Your Security Operations Center.<br />
            <span style={{ color: '#22D3EE' }}>Live & Intelligent.</span>
          </h2>
        </div>

        {/* SOC card */}
        <div data-fade data-delay="1" className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(34,211,238,0.18)', boxShadow: '0 0 80px rgba(34,211,238,0.07)' }}>

          {/* Header bar */}
          <div className="flex items-center justify-between px-6 py-4"
            style={{ background: 'rgba(8,12,20,0.95)', borderBottom: '1px solid #1E3047' }}>
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6.5V12c0 5 3.58 9.6 8 10.93C16.42 21.6 20 17 20 12V6.5L12 2Z"
                  stroke="#22D3EE" strokeWidth="1.5" fill="rgba(34,211,238,0.08)"/>
                <path d="M9 12l2.5 2.5L15 9" stroke="#10B981" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[13px] font-bold text-white">FANOS AI — Security Operations Center</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                style={{ background: 'rgba(34,211,238,0.1)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.2)' }}>
                ENTERPRISE
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: '#10B981' }}>
              <span className="w-2 h-2 rounded-full bg-fanos-green"
                style={{ animation: 'lp-pulse-green 1.5s infinite' }} />
              LIVE MONITORING
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4" style={{ borderBottom: '1px solid #1E3047' }}>
            <KPI value={7}    label="Critical Threats"  color="#EF4444" />
            <KPI value={24}   label="Active Incidents"  color="#F97316" />
            <KPI value={156}  label="Blocked Threats"   color="#10B981" />
            <KPI value={8421} label="Security Events"   color="#22D3EE" />
          </div>

          {/* Bottom panels */}
          <div className="grid grid-cols-2" style={{ background: '#111A2A' }}>
            {/* Chart */}
            <div className="px-6 py-5" style={{ borderRight: '1px solid #1E3047' }}>
              <div className="text-[10px] font-bold tracking-widest uppercase text-fanos-dim mb-4 flex items-center gap-2">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                Live Threat Activity — 24h
              </div>
              <div className="flex items-end gap-1 h-16">
                {CHART_HEIGHTS.map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm transition-all duration-700"
                    style={{
                      height: chartVisible ? `${h}%` : '0%',
                      background: `linear-gradient(to top, rgba(34,211,238,0.7), rgba(34,211,238,0.15))`,
                      transitionDelay: `${i * 40}ms`,
                    }} />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[8px] text-fanos-dim">
                {['00:00','04:00','08:00','12:00','16:00','20:00','24:00'].map(t => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>

            {/* Events */}
            <div className="px-6 py-5">
              <div className="text-[10px] font-bold tracking-widest uppercase text-fanos-dim mb-4 flex items-center gap-2">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Recent Detections
              </div>
              <div className="flex flex-col gap-0 divide-y"
                style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                {EVENTS.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between py-2"
                    style={{ animation: chartVisible ? `lp-threat-slide 0.4s ease ${i * 0.1}s both` : 'none' }}>
                    <span className="text-[11px] text-fanos-text">{ev.type}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: ev.statusBg, color: ev.statusColor, border: `1px solid ${ev.statusColor}40` }}>
                      {ev.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
