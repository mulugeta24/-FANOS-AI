import { useNavigate } from 'react-router-dom'

export default function CTASection() {
  const navigate = useNavigate()

  return (
    <section className="py-28 px-16 text-center relative z-10" data-fade
      style={{ background: 'linear-gradient(180deg,#0D1421 0%,#080C14 100%)' }}>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(34,211,238,0.04) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-[800px] mx-auto">
        <div className="flex items-center justify-center gap-2 mb-4 text-[10px] font-bold tracking-widest uppercase"
          style={{ color: '#22D3EE' }}>
          <div className="w-6 h-0.5 bg-fanos-accent" />Get Started<div className="w-6 h-0.5 bg-fanos-accent" />
        </div>

        <h2 className="font-extrabold text-white leading-tight tracking-tight mb-4"
          style={{ fontSize: 'clamp(34px,4vw,52px)' }}>
          Attackers don't wait.<br />
          Why should your <span style={{ color: '#22D3EE' }}>defense?</span>
        </h2>

        <p className="text-[15px] text-fanos-muted leading-relaxed mb-3 max-w-[580px] mx-auto">
          Turn security events into intelligence. Turn intelligence into action. Turn action into protection.
        </p>

        {/* Flow */}
        <div className="flex items-center justify-center gap-4 my-6 flex-wrap text-[13px] font-bold tracking-wide">
          {['DETECT','UNDERSTAND','RESPOND','PREVENT'].map((step, i, arr) => (
            <>
              <span key={step} style={{ color: i === arr.length - 1 ? '#10B981' : '#22D3EE' }}>{step}</span>
              {i < arr.length - 1 && <span className="text-fanos-dim text-lg">→</span>}
            </>
          ))}
        </div>

        <p className="text-[14px] text-fanos-muted leading-relaxed mb-10 max-w-[640px] mx-auto">
          <strong className="text-fanos-accent">See Every Threat. Before It Becomes an Incident.</strong><br />
          FANOS AI is the intelligent cyber defense platform for banks, telecom companies,
          governments, and enterprises. Detect threats faster. Respond automatically. Stay protected continuously.
        </p>

        <div className="flex gap-4 justify-center flex-wrap mb-16">
          <button className="px-10 py-4 rounded-xl text-[15px] font-bold text-black transition-all"
            style={{ background: 'linear-gradient(135deg,#22D3EE,#0891b2)', boxShadow: '0 0 35px rgba(34,211,238,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 55px rgba(34,211,238,0.55)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 35px rgba(34,211,238,0.35)')}>
            Request Service
          </button>
          <button className="px-10 py-4 rounded-xl text-[15px] font-bold text-fanos-text border border-white/[0.12] hover:border-fanos-accent/40 hover:text-fanos-accent transition-all"
            onClick={() => navigate('/')}>
            Open SOC Dashboard
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-6 pt-10"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { val: '99.84%', lbl: 'AI Accuracy',       color: '#22D3EE' },
            { val: '4.2ms',  lbl: 'Detection Speed',    color: '#10B981' },
            { val: '12+',    lbl: 'Attack Classes',      color: '#A78BFA' },
            { val: '∞',      lbl: 'Continuous Defense',  color: '#3B82F6' },
          ].map(s => (
            <div key={s.lbl} className="text-center">
              <div className="text-[32px] font-extrabold leading-none" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[10px] text-fanos-dim uppercase tracking-widest mt-2">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
