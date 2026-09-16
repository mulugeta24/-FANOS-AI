import { useState } from 'react'
import { Bell, Search, Clock, ChevronDown, Activity, AlertOctagon } from 'lucide-react'
import UserMenu from './UserMenu'
import { useLocation } from 'react-router-dom'

/* ── breadcrumb map ───────────────────────────────────── */
const BREADCRUMBS: Record<string, string> = {
  '/':                    'Security Operations Center',
  '/dashboard':           'Security Operations Center',
  '/soc/incidents':       'Incidents',
  '/soc/threats':         'Threat Intelligence',
  '/soc/alerts':          'Alerts',
  '/soc/timeline':        'Attack Timeline',
  '/soc/correlation':     'Threat Correlation',
  '/detection/network':   'Network IDS / NDR',
  '/detection/web':       'Web Attack Detection',
  '/detection/system':    'System Detection',
  '/detection/events':    'Detection Events',
  '/detection/rules':     'Detection Rules',
  '/prevention/ips':      'Blocked IPs',
  '/prevention/waf':      'WAF Protection',
  '/prevention/blocking': 'Active Blocking',
  '/ai/engine':           'AI Threat Detection',
  '/infra/sensors':       'Sensors',
  '/admin/users':         'Users & Identities',
  '/admin/audit':         'Audit Logs',
  '/admin/api-keys':      'API Keys',
  '/admin/settings':      'Settings',
  '/admin/sms':           'SMS Center',
  '/analytics/reports':   'Reports',
}

const TIME_OPTIONS = ['Last 1 Hour', 'Last 4 Hours', 'Last 24 Hours', 'Last 7 Days', 'Last 30 Days']

export default function Header() {
  const [timeRange, setTimeRange] = useState('Last 24 Hours')
  const [showTimeMenu, setShowTimeMenu] = useState(false)
  const location = useLocation()
  const pageLabel = BREADCRUMBS[location.pathname] ?? 'Security Operations Center'

  return (
    <header className="h-[58px] min-h-[58px] bg-fanos-surface border-b border-white/[0.06] flex items-center px-4 gap-2.5 z-40 flex-shrink-0 relative">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[14px] font-semibold text-fanos-muted">Dashboard</span>
        <span className="text-fanos-dim text-sm">/</span>
        <span className="text-[13px] text-white font-medium">{pageLabel}</span>
      </div>

      {/* Search — center */}
      <div className="flex-1 flex justify-center max-w-lg mx-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md w-full"
          style={{ background: 'rgba(11,20,36,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Search size={12} className="text-fanos-dim flex-shrink-0" />
          <input
            type="text"
            placeholder="Search threats, incidents, IPs, users, domains…"
            className="bg-transparent border-none outline-none text-[12px] text-fanos-muted placeholder:text-fanos-dim w-full"
          />
          <kbd className="text-[9px] text-fanos-dim px-1.5 py-0.5 rounded hidden sm:block"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Time range picker */}
        <div className="relative">
          <button
            onClick={() => setShowTimeMenu(m => !m)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] text-fanos-muted cursor-pointer transition-all hover:text-fanos-text"
            style={{ background: 'rgba(11,20,36,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Clock size={12} />
            <span className="whitespace-nowrap">{timeRange}</span>
            <ChevronDown size={10} />
          </button>
          {showTimeMenu && (
            <div className="absolute top-full mt-1 right-0 rounded-lg overflow-hidden z-50 min-w-[160px]"
              style={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
              {TIME_OPTIONS.map(opt => (
                <button key={opt}
                  onClick={() => { setTimeRange(opt); setShowTimeMenu(false) }}
                  className="w-full text-left px-4 py-2 text-[12px] hover:bg-white/[0.05] transition-colors"
                  style={{ color: timeRange === opt ? '#00c8ff' : '#8fa3bf' }}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-fanos-green tracking-wide"
          style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)' }}>
          <span className="dot-green" />
          LIVE
        </div>

        {/* Critical alert count */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-fanos-red"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertOctagon size={12} />
          7 CRITICAL
        </div>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-md transition-all hover:bg-white/[0.05]"
          style={{ background: 'rgba(11,20,36,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Bell size={14} className="text-fanos-muted" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-fanos-red text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-fanos-surface">
            7
          </span>
        </button>

        {/* System health */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-fanos-green"
          style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)' }}>
          <Activity size={12} />
          98.7%
        </div>

        {/* User */}
        <UserMenu />
      </div>
    </header>
  )
}
