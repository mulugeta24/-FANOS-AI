/**
 * SecOpsHeader — top bar for the Security Operations workspace.
 * Modern SOC Command Header: Live streaming beacon, critical threats,
 * rapid spotlight search, time filter & analyst identity.
 */
import { useState, useRef, useEffect } from 'react'
import { Bell, Search, Clock, ChevronDown, AlertOctagon, Activity, ShieldAlert } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useSecOpsAlerts } from '@/context/SecOpsAlertContext'

const BREADCRUMBS: Record<string, string> = {
  '/secops/overview':            'SOC Overview',
  '/secops/alerts':              'Alerts & Detections',
  '/secops/incidents':           'Active Incidents',
  '/secops/investigations':      'Threat Investigations',
  '/secops/events':              'Security Events Stream',
  '/secops/network/zeek':        'Zeek — Network Security',
  '/secops/network/suricata':    'Suricata + XGBoost — Network IDS',
  '/secops/web/waf':             'WAF — Web Security',
  '/secops/threat-intel':        'Threat Intelligence',
  '/secops/assets':              'Monitored Assets',
  '/secops/reports':             'Security Reports',
}

const TIME_OPTIONS = ['Last 1 Hour', 'Last 4 Hours', 'Last 24 Hours', 'Last 7 Days', 'Last 30 Days']

export default function SecOpsHeader() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user }  = useWorkspace()
  const { criticalAlertsCount, newAlertsCount } = useSecOpsAlerts()

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
    <header className="h-[62px] min-h-[62px] border-b border-white/[0.08] flex items-center px-6 gap-4 z-40 flex-shrink-0 relative bg-[#070b14]/85 backdrop-blur-2xl shadow-xl">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500/20 via-sky-500/10 to-transparent border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.2)]">
          <ShieldAlert size={15} />
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span 
            onClick={() => navigate('/secops/overview')}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer font-medium"
          >
            Security Ops
          </span>
          <span className="text-slate-600 font-bold">/</span>
          <span className="text-white font-bold tracking-tight bg-white/[0.05] px-2.5 py-0.5 rounded-lg border border-white/[0.08] shadow-sm">
            {pageLabel}
          </span>
        </div>
      </div>

      {/* Modern Center Spotlight Search */}
      <div className="flex-1 flex justify-center max-w-xl mx-auto px-2">
        <div className="group flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl w-full bg-slate-900/60 border border-white/[0.08] hover:border-white/[0.18] focus-within:border-sky-500/50 focus-within:bg-slate-900/95 focus-within:shadow-[0_0_25px_rgba(56,189,248,0.18)] transition-all duration-200">
          <Search size={14} className="text-slate-400 group-focus-within:text-sky-400 transition-colors flex-shrink-0" />
          <input
            type="text"
            placeholder="Search telemetry, signatures, CVEs, destination IPs, flow anomalies (⌘K)..."
            className="bg-transparent border-none outline-none text-[12px] text-slate-200 placeholder:text-slate-500 w-full"
          />
          <kbd className="text-[9.5px] font-mono text-slate-400 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.1] hidden sm:inline-block shadow-sm">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Modernized Controls Deck */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Time range selector */}
        <div className="relative">
          <button
            onClick={() => setShowTimeDrop(m => !m)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-300 hover:text-white bg-slate-900/70 border border-white/[0.08] hover:border-white/[0.18] transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(255,255,255,0.05)]"
          >
            <Clock size={12} className="text-sky-400" />
            <span className="whitespace-nowrap font-medium">{timeRange}</span>
            <ChevronDown size={11} className={`text-slate-400 transition-transform duration-200 ${showTimeDrop ? 'rotate-180 text-sky-400' : ''}`} />
          </button>
          {showTimeDrop && (
            <div
              className="absolute top-full mt-2 right-0 rounded-2xl overflow-hidden z-50 min-w-[170px] bg-[#0c1424]/98 border border-white/[0.1] shadow-2xl backdrop-blur-2xl animate-fade-in p-1.5"
            >
              <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/[0.06] mb-1">
                Time Window
              </div>
              {TIME_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => { setTimeRange(opt); setShowTimeDrop(false) }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-medium transition-all ${
                    timeRange === opt
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/35 font-bold shadow-[0_0_10px_rgba(56,189,248,0.15)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LIVE Stream Beacon */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold text-emerald-400 tracking-wider bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] uppercase tracking-widest font-mono">LIVE</span>
        </div>

        {/* Critical Threats Quick-Counter */}
        <button
          onClick={() => navigate('/secops/alerts')}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold text-rose-400 tracking-wide bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all cursor-pointer shadow-[0_0_16px_rgba(244,63,94,0.18)] active:scale-95 group"
        >
          <AlertOctagon size={13} className={criticalAlertsCount > 0 ? 'animate-pulse text-rose-400' : 'text-rose-400'} />
          <span className="font-mono">{criticalAlertsCount} CRITICAL</span>
        </button>

        {/* Notifications Bell */}
        <button
          onClick={() => navigate('/secops/alerts')}
          className="relative w-8 h-8 flex items-center justify-center rounded-xl bg-slate-900/60 border border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.05] transition-all cursor-pointer text-slate-300 hover:text-white"
          title={`${newAlertsCount} new alerts`}
        >
          <Bell size={14} />
          {newAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-4 px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#070b14] shadow-md animate-pulse">
              {newAlertsCount > 99 ? '99+' : newAlertsCount}
            </span>
          )}
        </button>

        {/* System SLA badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 shadow-sm font-mono">
          <Activity size={12} className="animate-pulse text-emerald-400" />
          <span>99.8% SLA</span>
        </div>

        {/* User profile dropdown */}
        <div ref={ref} className="relative">
          <button
            onClick={() => setUserOpen(o => !o)}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-xl bg-slate-900/70 border border-white/[0.08] hover:border-white/[0.18] cursor-pointer transition-all hover:bg-white/[0.05] shadow-sm"
          >
            <div className="relative w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0 bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-md border border-white/20">
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#070b14]" />
            </div>
            <div className="leading-tight text-left hidden sm:block">
              <div className="text-[11px] font-semibold text-slate-200">{user.full_name}</div>
              <div className="text-[9px] text-sky-400 font-bold capitalize tracking-wide font-mono">Tier 3 Lead Analyst</div>
            </div>
            <ChevronDown size={11} className={`text-slate-400 transition-transform duration-200 ${userOpen ? 'rotate-180 text-sky-400' : ''}`} />
          </button>

          {userOpen && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-2xl shadow-2xl z-[200] overflow-hidden bg-[#0c1424]/98 border border-white/[0.12] backdrop-blur-2xl animate-fade-in p-1.5"
            >
              <div className="px-3.5 py-2.5 border-b border-white/[0.06] mb-1 bg-gradient-to-r from-sky-500/10 to-transparent rounded-xl">
                <div className="text-[12px] font-bold text-white">{user.full_name}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                <div className="inline-block mt-1 px-2 py-0.5 rounded text-[8.5px] bg-sky-500/20 text-sky-300 font-bold uppercase tracking-wider border border-sky-500/35">
                  SOC Tier 3 Analyst
                </div>
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => { navigate('/secops/reports'); setUserOpen(false) }}
                  className="w-full text-left px-3 py-2 text-[12px] text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  Security Reports
                </button>
                <button
                  onClick={() => { navigate('/admin-portal/settings'); setUserOpen(false) }}
                  className="w-full text-left px-3 py-2 text-[12px] text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  Platform Settings
                </button>
                <div className="h-px bg-white/[0.06] my-1" />
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-[12px] text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors font-semibold"
                >
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
