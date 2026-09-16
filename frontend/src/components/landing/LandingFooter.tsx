import { useNavigate } from 'react-router-dom'

const LINKS = [
  { title: 'Platform',      items: ['AI Threat Detection','Network Security','Web Security','System Security','Incident Response'] },
  { title: 'Solutions',     items: ['Banking & Finance','Telecommunication','Government','Enterprise'] },
  { title: 'Intelligence',  items: ['AI Engine','Risk Scoring','Threat Correlation','Model Performance'] },
  { title: 'Company',       items: ['About FANOS','Mission & Vision','Security & Trust','Contact Us'] },
]

export default function LandingFooter() {
  const navigate = useNavigate()

  return (
    <footer className="relative z-10" style={{ background: '#0D1421', borderTop: '1px solid #1E3047' }}>
      <div className="px-16 py-14 grid gap-16" style={{ gridTemplateColumns: '260px 1fr' }}>
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0d2a45,#0a3d62)', border: '1px solid rgba(34,211,238,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6.5V12c0 5 3.58 9.6 8 10.93C16.42 21.6 20 17 20 12V6.5L12 2Z"
                  stroke="#22D3EE" strokeWidth="1.5" fill="rgba(34,211,238,0.08)"/>
                <path d="M9 12l2.5 2.5L15 9" stroke="#10B981" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-extrabold text-white">FANOS <span style={{ color: '#22D3EE' }}>AI</span></div>
            </div>
          </div>
          <p className="text-[12px] text-fanos-dim leading-relaxed mb-5 max-w-[210px]">
            AI-Powered Intrusion Detection, Prevention & Response System for enterprise security operations.
          </p>
          <div className="flex gap-2 flex-wrap">
            <span className="text-[9px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
              ✓ System Online
            </span>
            <span className="text-[9px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(34,211,238,0.08)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.2)' }}>
              v1.0 Production
            </span>
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-4 gap-8">
          {LINKS.map(col => (
            <div key={col.title}>
              <h4 className="text-[9px] font-bold tracking-[1.3px] uppercase text-fanos-dim mb-4">{col.title}</h4>
              {col.items.map(item => (
                <div key={item} className="text-[12px] text-fanos-dim mb-2.5 cursor-pointer hover:text-fanos-accent transition-colors">
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-16 py-4 flex items-center justify-between"
        style={{ borderTop: '1px solid #1E3047' }}>
        <div className="text-[11px] text-fanos-dim">
          © 2026 <span style={{ color: '#22D3EE' }}>FANOS AI</span> — AI-Powered Cyber Defense Platform. Built by Mulugeta Ababi.
        </div>
        <div className="flex gap-5">
          {['Privacy Policy', 'Terms of Service', 'Sign In'].map(t => (
            <span key={t}
              className="text-[11px] text-fanos-dim cursor-pointer hover:text-fanos-accent transition-colors"
              onClick={() => t === 'Sign In' ? navigate('/login') : undefined}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </footer>
  )
}
