import { useRef, useEffect, useState } from 'react'
import { useNetworkCanvas } from '@/hooks/useAnimatedCanvas'

const NODES = [
  { label: 'SQL ATTACK',   color: '#EF4444', bg: 'rgba(239,68,68,.14)',   border: 'rgba(239,68,68,.4)',   pos: 'top-[12%] left-[4%]',   delay: '0s'   },
  { label: 'BRUTE FORCE',  color: '#F59E0B', bg: 'rgba(245,158,11,.12)',  border: 'rgba(245,158,11,.4)',  pos: 'top-[20%] right-[4%]',  delay: '.3s'  },
  { label: 'PORT SCAN',    color: '#F97316', bg: 'rgba(249,115,22,.12)',  border: 'rgba(249,115,22,.4)',  pos: 'bottom-[24%] left-[4%]',delay: '.7s'  },
  { label: '✓ BLOCKED',   color: '#10B981', bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.4)',  pos: 'bottom-[20%] right-[4%]',delay: '.2s' },
  { label: 'XGBoost AI',   color: '#22D3EE', bg: 'rgba(34,211,238,.08)',  border: 'rgba(34,211,238,.28)', pos: 'top-[45%] left-[1%]',   delay: '.5s'  },
  { label: 'RISK: 96',     color: '#A78BFA', bg: 'rgba(167,139,250,.08)', border: 'rgba(167,139,250,.28)',pos: 'top-[45%] right-[1%]',  delay: '.9s'  },
  { label: 'XSS',          color: '#EF4444', bg: 'rgba(239,68,68,.1)',    border: 'rgba(239,68,68,.25)',  pos: 'top-[30%] left-[12%]',  delay: '1.1s' },
  { label: '✓ DETECT',    color: '#22D3EE', bg: 'rgba(34,211,238,.07)',  border: 'rgba(34,211,238,.2)',  pos: 'bottom-[36%] right-[12%]',delay:'1.3s' },
]

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useNetworkCanvas(canvasRef as React.RefObject<HTMLCanvasElement>)
  const [imgLoaded, setImgLoaded] = useState(false)

  useEffect(() => {
    const targets = [
      { id: 'h-stat-acc', end: 99.84, suffix: '%',   decimals: 2, dur: 2200 },
      { id: 'h-stat-lat', end: 4.2,   suffix: 'ms',  decimals: 1, dur: 1600 },
      { id: 'h-stat-cls', end: 12,    suffix: '+',   decimals: 0, dur: 1300 },
      { id: 'h-stat-blk', end: 2481,  suffix: '/s',  decimals: 0, dur: 2000 },
    ]
    targets.forEach(({ id, end, suffix, decimals, dur }) => {
      const el = document.getElementById(id)
      if (!el) return
      const start = performance.now()
      function frame(now: number) {
        const p = Math.min((now - start) / dur, 1)
        el!.textContent = (end * (1 - Math.pow(1 - p, 3))).toFixed(decimals) + suffix
        if (p < 1) requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
  }, [])

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden"
      style={{ paddingTop: 64, background: 'linear-gradient(180deg,#080C14 0%,#0A1020 100%)' }}>

      {/* Animated canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.4 }} />

      {/* Radial glows */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 55% 70% at 65% 50%, rgba(34,211,238,0.06) 0%, transparent 70%)'
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 30% 40% at 20% 50%, rgba(59,130,246,0.04) 0%, transparent 60%)'
      }} />

      {/* Left: text content */}
      <div className="relative z-10 px-16 py-20 flex-1 max-w-[640px]" data-fade>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase mb-6"
          style={{ background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.22)', color: '#22D3EE' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-fanos-accent" style={{ animation: 'lp-pulse-cyan 1.5s infinite' }} />
          AI-Powered Cyber Defense Platform
        </div>

        <div className="text-[14px] font-semibold mb-4 pl-3 tracking-wide"
          style={{ color: '#22D3EE', borderLeft: '3px solid #22D3EE' }}>
          Cyber threats move fast. Your defense should move faster.
        </div>

        <h1 className="font-extrabold leading-[1.06] tracking-tight text-white mb-5"
          style={{ fontSize: 'clamp(36px,4vw,58px)', letterSpacing: '-0.5px' }}>
          See Every <span style={{ color: '#22D3EE' }}>Threat.</span><br />
          Before It Becomes<br />
          <span className="lp-grad">an Incident.</span>
        </h1>

        <p className="text-[15px] leading-relaxed mb-8 max-w-[500px]" style={{ color: '#94A3B8' }}>
          FANOS AI continuously monitors your network, web applications, systems, and security events.
          Detect threats faster with one intelligent security platform — powered by XGBoost AI,
          real-time risk scoring, and automated response.
        </p>

        <div className="flex gap-4 flex-wrap mb-12">
          <button className="px-8 py-4 rounded-xl text-[14px] font-bold text-black transition-all duration-200"
            style={{ background: 'linear-gradient(135deg,#22D3EE,#0891b2)', boxShadow: '0 0 30px rgba(34,211,238,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 48px rgba(34,211,238,0.55)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 30px rgba(34,211,238,0.35)')}>
            Request Service
          </button>
          <button className="px-8 py-4 rounded-xl text-[14px] font-bold transition-all"
            style={{ color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,211,238,0.4)'; e.currentTarget.style.color = '#22D3EE' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#F1F5F9' }}>
            Explore FANOS →
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-8 flex-wrap">
          {[
            { id: 'h-stat-acc', label: 'AI Accuracy' },
            { id: 'h-stat-lat', label: 'Inference Speed' },
            { id: 'h-stat-cls', label: 'Attack Classes' },
            { id: 'h-stat-blk', label: 'Detections/sec' },
          ].map(s => (
            <div key={s.id}>
              <div id={s.id} className="text-[26px] font-extrabold leading-none" style={{ color: '#22D3EE' }}>0</div>
              <div className="text-[10px] uppercase tracking-widest mt-1" style={{ color: '#64748B' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: AI Cybersecurity Image — hero visual */}
      <div className="relative z-10 flex-1 flex items-center justify-center pr-10"
        style={{ minHeight: 520 }}>
        <div className="relative" style={{ width: 500, height: 500 }}>

          {/* Outer glow rings */}
          {[480, 400, 320].map((size, i) => (
            <div key={size} className="absolute rounded-full border"
              style={{
                width: size, height: size,
                top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                borderColor: i === 0 ? 'rgba(34,211,238,0.06)' : i === 1 ? 'rgba(59,130,246,0.08)' : 'rgba(34,211,238,0.11)',
                animation: `lp-ring 3s ease-in-out ${i * 0.6}s infinite`,
              }} />
          ))}

          {/* ── IMAGE 1: AI in Cybersecurity (robot+globe+shield) ── */}
          {/* Since images are from chat, we use a styled placeholder that perfectly frames the concept */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative rounded-2xl overflow-hidden"
              style={{
                width: 380, height: 380,
                animation: 'lp-float 5s ease-in-out infinite',
                border: '1px solid rgba(34,211,238,0.2)',
                boxShadow: '0 0 60px rgba(34,211,238,0.12), 0 0 120px rgba(34,211,238,0.06)',
              }}>

              {/* Image: user must place at public/images/hero-ai-cyber.jpg
                  Shown with a professional fallback visual until placed */}
              <img
                src="/images/hero-ai-cyber.jpg"
                alt="AI Cybersecurity — FANOS AI"
                className="w-full h-full object-cover"
                style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }}
                onLoad={() => setImgLoaded(true)}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />

              {/* Fallback visual shown when image not yet placed */}
              <div className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ background: 'linear-gradient(135deg,rgba(8,12,20,0.95),rgba(13,20,33,0.9))', zIndex: -1 }}>
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 6.5V12c0 5 3.58 9.6 8 10.93C16.42 21.6 20 17 20 12V6.5L12 2Z"
                    stroke="#22D3EE" strokeWidth="1" fill="rgba(34,211,238,0.08)"/>
                  <path d="M9 12l2.5 2.5L15 9" stroke="#10B981" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="text-[11px] font-bold mt-3" style={{ color: '#22D3EE' }}>FANOS AI</div>
                <div className="text-[9px] mt-1" style={{ color: '#64748B' }}>Place hero-ai-cyber.jpg</div>
              </div>

              {/* Scan line overlay */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(180deg,transparent 0%,rgba(34,211,238,0.04) 50%,transparent 100%)', animation: 'scanLine 3s linear infinite' }} />

              {/* Gradient fade edges */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%,transparent 50%,rgba(8,12,20,0.7) 100%)' }} />
            </div>
          </div>

          {/* Floating threat/status nodes around image */}
          {NODES.map(n => (
            <div key={n.label}
              className={`absolute text-[9px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${n.pos}`}
              style={{
                color: n.color, background: n.bg, border: `1px solid ${n.border}`,
                animation: `lp-node-float 3.5s ease-in-out ${n.delay} infinite`,
                backdropFilter: 'blur(6px)',
              }}>
              {n.label}
            </div>
          ))}
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10">
        <div className="text-[9px] uppercase tracking-widest" style={{ color: '#64748B' }}>Scroll to explore</div>
        <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom,rgba(34,211,238,0.4),transparent)' }} />
      </div>

      <style>{`
        @keyframes scanLine {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </section>
  )
}
