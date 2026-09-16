import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

/* ── Mega menu data ─────────────────────────────────────── */
const PLATFORM = {
  left: {
    title: 'DEFENSE',
    items: [
      { icon: '🛡', title: 'AI Threat Detection',     sub: 'XGBoost-powered real-time detection' },
      { icon: '📡', title: 'Network Security',        sub: 'Suricata & Zeek IDS/IPS' },
      { icon: '🌐', title: 'Web Application Security',sub: 'WAF, URI assessment, OWASP Top 10' },
      { icon: '🖥', title: 'System Security',         sub: 'Host IDS via Wazuh agent' },
      { icon: '⚡', title: 'Threat Detection',        sub: 'Multi-vector real-time alerts' },
    ],
  },
  right: {
    title: 'RESPONSE',
    items: [
      { icon: '🚨', title: 'Incident Response',   sub: 'SOC-driven incident lifecycle' },
      { icon: '🤖', title: 'Automated Response',  sub: 'Instant block, isolate, rate-limit' },
      { icon: '🕸', title: 'Threat Correlation',  sub: 'Attack campaign detection' },
      { icon: '🚫', title: 'Prevention',          sub: 'Active blocking engine' },
      { icon: '🔒', title: 'Active Blocking',     sub: 'IP, session, WAF blocking' },
    ],
  },
  cta: 'Explore FANOS Platform →',
}

const SOLUTIONS = {
  left: {
    title: 'BANKING & FINANCE',
    items: [
      { icon: '🏦', title: 'Financial System Protection', sub: 'Protect core banking infrastructure' },
      { icon: '🔍', title: 'Fraud Threat Detection',      sub: 'Detect fraud-related attack patterns' },
    ],
    title2: 'GOVERNMENT',
    items2: [
      { icon: '🏛', title: 'Critical Infrastructure', sub: 'Protect government systems' },
      { icon: '📋', title: 'Centralized Security',    sub: 'Unified SOC across agencies' },
    ],
  },
  right: {
    title: 'TELECOMMUNICATION',
    items: [
      { icon: '📡', title: 'Network Infrastructure', sub: 'Protect telecom backbone' },
      { icon: '🌊', title: 'DDoS & Attack Detection',sub: 'Detect volumetric network attacks' },
    ],
    title2: 'ENTERPRISE',
    items2: [
      { icon: '🏢', title: 'Business Infrastructure', sub: 'Enterprise-grade cyber defense' },
      { icon: '📊', title: 'SOC Visibility',          sub: 'Full SOC dashboard & response' },
    ],
  },
  cta: 'Explore Solutions →',
}

const INTELLIGENCE = {
  left: {
    title: 'AI ENGINE',
    items: [
      { icon: '🧠', title: 'FANOS AI Engine',      sub: 'Next-gen XGBoost threat detection engine with 99.84% accuracy' },
      { icon: '📈', title: 'XGBoost Models',        sub: '15-class attack classifier with real-time prediction · 4.2ms latency' },
      { icon: '🔬', title: 'Behavioral Analysis',   sub: 'Advanced anomaly detection and attack pattern recognition system' },
      { icon: '⚖️', title: 'Confidence Analysis',   sub: 'Per-prediction confidence scoring with explainable AI decisions' },
      { icon: '⏱', title: 'Model Performance',      sub: '99.84% accuracy · 4.2ms response · Production-grade reliability' },
    ],
  },
  right: {
    title: 'SECURITY INTELLIGENCE',
    items: [
      { icon: '⚡', title: 'Threat Detection',     sub: 'Real-time multi-layer detection across network, web, and host' },
      { icon: '📊', title: 'Risk Scoring',          sub: 'Composite 0–100 risk calculation engine with severity assessment' },
      { icon: '🕸', title: 'Threat Correlation',   sub: 'AI-powered kill-chain campaign mapping and attack attribution' },
      { icon: '📉', title: 'Security Analytics',   sub: 'MTTR metrics, detection coverage, trend analysis, and forecasting' },
      { icon: '🎯', title: 'Attack Intelligence',  sub: 'Deep pattern analysis, threat actor profiling, and campaign tracking' },
    ],
  },
  cta: 'Explore FANOS Intelligence →',
}

/* ── Reusable mega column ───────────────────────────────── */
function MegaCol({ title, items, onClick }: { 
  title: string; 
  items: { icon: string; title: string; sub: string }[]; 
  onClick?: (title: string) => void;
}) {
  return (
    <div>
      <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-fanos-dim border-b border-white/[0.06] pb-2 mb-3">
        {title}
      </div>
      {items.map(item => (
        <button
          key={item.title}
          onClick={() => onClick?.(item.title)}
          className="w-full flex items-start gap-3 px-2 py-2.5 rounded-lg cursor-pointer hover:bg-fanos-accent/5 transition-colors group">
          <div className="w-7 h-7 rounded-md bg-fanos-accent/8 border border-fanos-accent/15 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
            {item.icon}
          </div>
          <div className="text-left">
            <div className="text-[12px] font-600 text-fanos-text group-hover:text-fanos-accent transition-colors">{item.title}</div>
            <div className="text-[10px] text-fanos-dim mt-0.5">{item.sub}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

/* ── Main Nav ───────────────────────────────────────────── */
export default function LandingNav() {
  const [open, setOpen]       = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const navHeight = 64 // Height of fixed nav
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
      const offsetPosition = elementPosition - navHeight

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
    setOpen(null)
  }

  // Handle menu item clicks with section mapping
  const handleMenuClick = (menuItem: string) => {
    console.log('Clicked:', menuItem)
    setOpen(null)
    
    // Contact page navigation
    if (menuItem === 'Contact Us') {
      navigate('/contact')
      return
    }
    
    // About page navigation
    const aboutPageItems = ['About FANOS', 'Mission & Vision', 'Careers', 'Why FANOS', 'Security & Trust']
    if (aboutPageItems.includes(menuItem)) {
      navigate('/about')
      return
    }
    
    // Intelligence page navigation
    const intelligenceItems = [
      'FANOS AI Engine', 'XGBoost Models', 'Behavioral Analysis', 'Confidence Analysis', 
      'Model Performance', 'Threat Detection', 'Risk Scoring', 'Threat Correlation', 
      'Security Analytics', 'Attack Intelligence', 'Intelligence Overview'
    ]
    if (intelligenceItems.includes(menuItem)) {
      navigate('/intelligence')
      return
    }
    
    // Map menu items to sections
    const sectionMap: { [key: string]: string } = {
      // Platform items
      'AI Threat Detection': 'platform',
      'Network Security': 'platform',
      'Web Application Security': 'platform',
      'System Security': 'platform',
      'Threat Detection': 'platform',
      'Incident Response': 'platform',
      'Automated Response': 'demo',
      'Threat Correlation': 'platform',
      'Prevention': 'platform',
      'Active Blocking': 'platform',
      'Platform Overview': 'platform',
      
      // Solutions items
      'Financial System Protection': 'solutions',
      'Fraud Threat Detection': 'solutions',
      'Critical Infrastructure': 'solutions',
      'Centralized Security': 'solutions',
      'Network Infrastructure': 'solutions',
      'DDoS & Attack Detection': 'solutions',
      'Business Infrastructure': 'solutions',
      'SOC Visibility': 'soc',
      'Solutions Overview': 'solutions',
      
      // Intelligence items
      'FANOS AI Engine': 'demo',
      'XGBoost Models': 'demo',
      'Behavioral Analysis': 'demo',
      'Confidence Analysis': 'demo',
      'Model Performance': 'demo',
      'Risk Scoring': 'platform',
      'Security Analytics': 'soc',
      'Attack Intelligence': 'demo',
      'Intelligence Overview': 'demo',
      
      // Resources items
      'Documentation': 'contact',
      'Research': 'contact',
      'FAQ': 'contact',
      'Security Insights': 'contact',
      'Blog': 'contact',
      'Support': 'contact',
    }
    
    const section = sectionMap[menuItem]
    if (section) {
      // If we're not on landing page, navigate there first
      if (window.location.pathname !== '/home') {
        navigate(`/home#${section}`)
      } else {
        scrollToSection(section)
      }
    }
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function NavItem({ id, label, children }: { id: string; label: string; children?: React.ReactNode }) {
    return (
      <div className="relative"
        onMouseEnter={() => setOpen(id)}
        onMouseLeave={() => setOpen(null)}>
        <button className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-[16px] font-bold transition-all
          ${open === id ? 'text-fanos-accent bg-fanos-accent/5' : 'text-white hover:text-fanos-accent hover:bg-white/[0.06]'}`}>
          {label}
          {children && <ChevronDown size={15} className={`transition-transform duration-200 ${open === id ? 'rotate-180' : ''}`} />}
        </button>
        {children && open === id && (
          <div className="lp-mega" onMouseEnter={() => setOpen(id)} onMouseLeave={() => setOpen(null)}>
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <nav ref={navRef} className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
      {/* Brand */}
      <button onClick={() => scrollToSection('hero')}
        className="flex items-center gap-2.5 text-left flex-shrink-0 cursor-pointer">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#0d2a45,#0a3d62)', border: '1px solid rgba(34,211,238,0.35)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6.5V12c0 5 3.58 9.6 8 10.93C16.42 21.6 20 17 20 12V6.5L12 2Z"
              stroke="#22D3EE" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(34,211,238,0.07)"/>
            <path d="M9 12l2.5 2.5L15 9" stroke="#10B981" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div className="text-[17px] font-extrabold text-white tracking-wide leading-tight">
            FANOS <span style={{ color: '#22D3EE' }}>AI</span>
          </div>
          <div className="text-[9px] text-gray-400 tracking-widest uppercase font-semibold">AI Cyber Defense</div>
        </div>
      </button>

      {/* Nav links */}
      <div className="flex items-center gap-0.5 ml-10 flex-1">

        {/* Home */}
        <button 
          onClick={() => navigate('/home')}
          className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-[16px] font-bold transition-all text-white hover:text-fanos-accent hover:bg-white/[0.06]">
          Home
        </button>

        {/* Platform */}
        <NavItem id="platform" label="Platform">
          <div className="grid grid-cols-2 gap-6">
            <MegaCol title={PLATFORM.left.title}  items={PLATFORM.left.items} onClick={handleMenuClick} />
            <MegaCol title={PLATFORM.right.title} items={PLATFORM.right.items} onClick={handleMenuClick} />
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-center">
            <button 
              onClick={() => handleMenuClick('Platform Overview')}
              className="text-[12px] font-semibold text-fanos-accent cursor-pointer hover:opacity-80">
              {PLATFORM.cta}
            </button>
          </div>
        </NavItem>

        {/* Solutions */}
        <NavItem id="solutions" label="Solutions">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <MegaCol title={SOLUTIONS.left.title}  items={SOLUTIONS.left.items} onClick={handleMenuClick} />
              <div className="mt-4"><MegaCol title={SOLUTIONS.left.title2!} items={SOLUTIONS.left.items2!} onClick={handleMenuClick} /></div>
            </div>
            <div>
              <MegaCol title={SOLUTIONS.right.title}  items={SOLUTIONS.right.items} onClick={handleMenuClick} />
              <div className="mt-4"><MegaCol title={SOLUTIONS.right.title2!} items={SOLUTIONS.right.items2!} onClick={handleMenuClick} /></div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-center">
            <button 
              onClick={() => handleMenuClick('Solutions Overview')}
              className="text-[12px] font-semibold text-fanos-accent cursor-pointer hover:opacity-80">
              {SOLUTIONS.cta}
            </button>
          </div>
        </NavItem>

        {/* Intelligence */}
        <NavItem id="intelligence" label="Intelligence">
          <div className="grid grid-cols-2 gap-6">
            <MegaCol title={INTELLIGENCE.left.title}  items={INTELLIGENCE.left.items} onClick={handleMenuClick} />
            <MegaCol title={INTELLIGENCE.right.title} items={INTELLIGENCE.right.items} onClick={handleMenuClick} />
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-center">
            <button 
              onClick={() => navigate('/intelligence')}
              className="text-[12px] font-semibold text-fanos-accent cursor-pointer hover:opacity-80">
              {INTELLIGENCE.cta}
            </button>
          </div>
        </NavItem>

        {/* Resources */}
        <NavItem id="resources" label="Resources">
          <div className="grid grid-cols-2 gap-6 min-w-[400px]">
            <MegaCol title="LEARN" items={[
              { icon: '🔒', title: 'Security Guides',    sub: 'Professional security methodologies' },
              { icon: '📖', title: 'Documentation',    sub: 'Platform guides and API reference' },
              { icon: '🔬', title: 'Research',          sub: 'Security research papers' },
              { icon: '❓', title: 'FAQ',               sub: 'Frequently asked questions' },
            ]} onClick={(item) => {
              if (item === 'Security Guides') {
                navigate('/security-guides')
              } else {
                handleMenuClick(item)
              }
            }} />
            <MegaCol title="CONNECT" items={[
              { icon: '💡', title: 'Security Insights', sub: 'Threat intelligence reports' },
              { icon: '✍️', title: 'Blog',              sub: 'Cybersecurity articles' },
              { icon: '🛟', title: 'Support',           sub: 'Technical support portal' },
            ]} onClick={handleMenuClick} />
          </div>
        </NavItem>

        {/* About */}
        <NavItem id="about" label="About">
          <div className="grid grid-cols-2 gap-6 min-w-[380px]">
            <MegaCol title="COMPANY" items={[
              { icon: '🛡', title: 'About FANOS',     sub: 'Our story and mission' },
              { icon: '🎯', title: 'Mission & Vision', sub: 'Why we build FANOS AI' },
              { icon: '👥', title: 'Careers',          sub: 'Join the FANOS team' },
            ]} onClick={handleMenuClick} />
            <MegaCol title="TRUST" items={[
              { icon: '✅', title: 'Why FANOS',         sub: 'What makes us different' },
              { icon: '🔐', title: 'Security & Trust',  sub: 'Our security commitments' },
              { icon: '📞', title: 'Contact Us',        sub: 'Get in touch with our team' },
            ]} onClick={handleMenuClick} />
          </div>
        </NavItem>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button 
          onClick={() => navigate('/portal-login')}
          className="px-7 py-3 rounded-lg text-[14px] font-bold text-white transition-all cursor-pointer relative overflow-hidden group"
          style={{ 
            background: 'linear-gradient(135deg, #22D3EE 0%, #0891b2 100%)',
            boxShadow: '0 4px 20px rgba(34,211,238,0.35), 0 0 0 1px rgba(34,211,238,0.2)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 6px 30px rgba(34,211,238,0.5), 0 0 0 1px rgba(34,211,238,0.3)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(34,211,238,0.35), 0 0 0 1px rgba(34,211,238,0.2)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}>
          <span className="relative z-10 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L4 6.5V12c0 5 3.58 9.6 8 10.93C16.42 21.6 20 17 20 12V6.5L12 2Z" />
              <path d="M9 12l2.5 2.5L15 9" />
            </svg>
            FANOS Portal Login
          </span>
          {/* Shine effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
        </button>
        
        <button 
          onClick={() => navigate('/contact')}
          className="px-5 py-3 rounded-lg text-[14px] font-bold text-white border border-white/[0.12] hover:border-fanos-accent/40 hover:text-fanos-accent transition-all cursor-pointer">
          Contact
        </button>
        
        <button onClick={() => navigate('/login')}
          className="px-6 py-3 rounded-lg text-[14px] font-bold text-white cursor-pointer transition-all"
          style={{ 
            background: 'rgba(34,211,238,0.1)', 
            border: '1px solid rgba(34,211,238,0.4)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(34,211,238,0.15)'
            e.currentTarget.style.borderColor = 'rgba(34,211,238,0.6)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(34,211,238,0.1)'
            e.currentTarget.style.borderColor = 'rgba(34,211,238,0.4)'
          }}>
          Sign In →
        </button>
      </div>
    </nav>
  )
}
