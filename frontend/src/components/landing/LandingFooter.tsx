import { useNavigate } from 'react-router-dom'
import FanosLogo from '@/components/common/FanosLogo'

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
          <div className="mb-4">
            <FanosLogo size={36} />
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
