/**
 * SecOpsHeader — top bar for the Security Operations workspace.
 * SOC-focused: live status, critical count, time range, user menu.
 */
import { useState, useRef, useEffect } from 'react'
import { Bell, Search, Clock, ChevronDown, AlertOctagon, Activity, ShieldAlert } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'

const BREADCRUMBS: Record<string, string> = {
  '/secops/overview':            'SOC Overview',
  '/secops/alerts':              'Alerts',
  '/secops/incidents':           'Incidents',
  '/secops/investigations':      'Investigations',
  '/secops/events':              'Security Events',
  '/secops/network/zeek':        'Zeek — Network Security',
  '/secops/network/suricata':    'Suricata — Network IDS',
  '/secops/web/waf':             'WAF — Web Security',
  '/secops/threat-intel':        'Threat Intelligence',
  '/secops/assets':              'Assets',
  '/secops/reports':             'Security Reports',
}

const TIME_OPTIONS = ['Last 1 Hour', 'Last 4 Hours', 'Last 24 Hours', 'Last 7 Days', 'Last 30 Days']

export default function SecOpsHeader() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user }  = useWorkspace()

  const [timeRange,    setTimeRange]    = useState('Last 24 Hours')
  const [showTimeDrop, setShowTimeDrop] = useState(false)
  const [userOpen,     setUserOpen]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const pageLabel = BREADCRUMBS[location.pathname] ?? 'Security Operations'

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const initials = user.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  function logout() {
    localStorage.removeItem('fanos_token')
    localStorage.removeItem('fanos_user')
    navigate('/login')
  }

  return (
    <header
      className="h-[58px] min-h-[58px] border-b border-white/[0.06] flex items-center px-4 gap-2.5 z-40 flex-shrink-0 relative"
      style={{ background: '#0b1422' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ShieldAlert size={13} className="text-fanos-accent" />
        <span className="text-[13px] text-fanos-muted font-medium">Security Ops</span>
        <span className="text-fanos-dim">/</span>
        <span className="text-[13px] text-white font-semibold">{pageLabel}</span>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center max-w-lg mx-auto">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md w-full"
          style={{ background: 'rgba(11,20,36,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Search size={12} className="text-fanos-dim flex-shrink-0" />
          <input
            type="text"
            placeholder="Search alerts, incidents, IPs, signatures…"
            className="bg-transparent border-none outline-none text-[12px] text-fanos-muted placeholder:text-fanos-dim w-full"
          />
          <kbd
            className="text-[9px] text-fanos-dim px-1.5 py-0.5 rounded hidden sm:block"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Time range */}
        <div className="relative">
          <button
            onClick={() => setShowTimeDrop(m => !m)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] text-fanos-muted cursor-pointer transition-all hover:text-fanos-text"
            style={{ background: 'rgba(11,20,36,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Clock size={12} />
            <span className="whitespace-nowrap">{timeRange}</span>
            <ChevronDown size={10} />
          </button>
          {showTimeDrop && (
            <div
              className="absolute top-full mt-1 right-0 rounded-lg overflow-hidden z-50 min-w-[160px]"
              style={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}
            >
              {TIME_OPTIONS.map(opt => (
                <button key={opt}
                  onClick={() => { setTimeRange(opt); setShowTimeDrop(false) }}
                  className="w-full text-left px-4 py-2 text-[12px] hover:bg-white/[0.05] transition-colors"
                  style={{ color: timeRange === opt ? '#00c8ff' : '#8fa3bf' }}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LIVE indicator */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-fanos-green tracking-wide"
          style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)' }}
        >
          <span className="dot-green" />
          LIVE
        </div>

        {/* Critical count */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-fanos-red"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertOctagon size={12} />
          7 CRITICAL
        </div>

        {/* Notifications */}
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-md transition-all hover:bg-white/[0.05]"
          style={{ background: 'rgba(11,20,36,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Bell size={14} className="text-fanos-muted" />
          <span
            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-fanos-red text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2"
            style={{ borderColor: '#0b1422' }}
          >
            7
          </span>
        </button>

        {/* System health */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-fanos-green"
          style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)' }}
        >
          <Activity size={12} />
          98.7%
        </div>

        {/* User menu */}
        <div ref={ref} className="relative">
          <button
            onClick={() => setUserOpen(o => !o)}
            className="flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-all hover:bg-white/[0.05]"
            style={{ background: 'rgba(17,28,46,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#0a3d62,#1565c0)' }}
            >
              {initials}
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-[11px] font-semibold text-fanos-text">{user.full_name}</div>
              <div className="text-[9px] text-fanos-accent capitalize">{user.role}</div>
            </div>
            <ChevronDown size={10} className={`text-fanos-dim transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`} />
          </button>

          {userOpen && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-xl shadow-2xl z-[200] overflow-hidden"
              style={{ background: '#111c2e', border: '1px solid rgba(0,200,255,0.15)' }}
            >
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <div className="text-[11px] font-bold text-white">{user.full_name}</div>
                <div className="text-[9px] text-fanos-dim">{user.email}</div>
                <div className="text-[9px] mt-0.5 text-fanos-accent capitalize font-semibold">{user.role}</div>
              </div>
              <div className="py-1">
                <button onClick={() => { navigate('/secops/reports'); setUserOpen(false) }}
                  className="w-full text-left px-4 py-2 text-[11px] text-fanos-muted hover:bg-white/[0.04] transition-colors">
                  Security Reports
                </button>
                <button onClick={() => { navigate('/admin-portal/settings'); setUserOpen(false) }}
                  className="w-full text-left px-4 py-2 text-[11px] text-fanos-muted hover:bg-white/[0.04] transition-colors">
                  Platform Settings
                </button>
                <button onClick={logout}
                  className="w-full text-left px-4 py-2 text-[11px] text-fanos-red hover:bg-red-500/[0.06] transition-colors">
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
