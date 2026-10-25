import { useState } from 'react'
import { Bell, Search, Clock, ChevronDown, Activity, AlertOctagon } from 'lucide-react'
import UserMenu from './UserMenu'
import { useLocation } from 'react-router-dom'

/* ── breadcrumb map ───────────────────────────────────── */
const BREADCRUMBS: Record<string, string> = {
  '/':                    'Security Operations Center',
  '/dashboard':           'Dashboard',
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
  const pageLabel = BREADCRUMBS[location.pathname] ?? 'Dashboard'

  return (
    <header className="h-[60px] min-h-[60px] bg-[#070b14]/85 backdrop-blur-2xl border-b border-white/[0.08] flex items-center px-6 gap-3 z-40 flex-shrink-0 relative shadow-xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[13px] font-medium text-slate-400">FANOS</span>
        <span className="text-slate-600 text-xs font-semibold">&gt;</span>
        <span className="text-[13px] text-white font-semibold bg-white/[0.05] px-2.5 py-0.5 rounded-lg border border-white/[0.08]">{pageLabel}</span>
      </div>

      {/* Search — center */}
      <div className="flex-1 flex justify-center max-w-md mx-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl w-full bg-slate-900/60 border border-white/[0.08] focus-within:border-sky-500/50 focus-within:bg-slate-900/90 transition-all">
          <Search size={13} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search threats, incidents, IPs, users, domains…"
            className="bg-transparent border-none outline-none text-[12px] text-white placeholder:text-slate-500 w-full"
          />
          <kbd className="text-[9px] text-slate-400 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.1] hidden sm:block font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5 flex-shrink-0">

        {/* Time range picker */}
        <div className="relative">
          <button
            onClick={() => setShowTimeMenu(m => !m)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-slate-300 bg-slate-900/70 border border-white/[0.08] hover:border-white/[0.18] transition-colors shadow-sm cursor-pointer"
          >
            <Clock size={12} className="text-sky-400" />
            <span className="whitespace-nowrap">{timeRange}</span>
            <ChevronDown size={11} className="text-slate-400" />
          </button>
          {showTimeMenu && (
            <div className="absolute top-full mt-1.5 right-0 rounded-2xl overflow-hidden z-50 min-w-[170px] bg-[#0c1424]/98 border border-white/[0.1] shadow-2xl backdrop-blur-2xl py-1">
              {TIME_OPTIONS.map(opt => (
                <button key={opt}
                  onClick={() => { setTimeRange(opt); setShowTimeMenu(false) }}
                  className="w-full text-left px-4 py-2 text-[12px] hover:bg-white/[0.05] transition-colors font-medium text-slate-300 hover:text-white"
                  style={{ color: timeRange === opt ? '#38bdf8' : undefined }}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-mono shadow-[0_0_8px_rgba(16,185,129,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </div>

        {/* Critical alert count */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-rose-400 bg-rose-500/15 border border-rose-500/30 font-mono shadow-[0_0_8px_rgba(244,63,94,0.2)]">
          <AlertOctagon size={12} />
          7 CRITICAL
        </div>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-xl border border-white/[0.08] bg-slate-900/70 hover:bg-slate-800 transition-colors shadow-sm text-slate-300 hover:text-white cursor-pointer">
          <Bell size={14} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-[#070b14]">
            7
          </span>
        </button>

        {/* System health */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-sky-400 bg-sky-500/15 border border-sky-500/30 font-mono">
          <Activity size={12} />
          98.7%
        </div>

        {/* User */}
        <UserMenu />
      </div>
    </header>
  )
}
