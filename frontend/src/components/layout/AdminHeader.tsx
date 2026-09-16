/**
 * AdminHeader — top bar for the Admin Portal workspace.
 * Business/platform management focused.
 */
import { useState, useRef, useEffect } from 'react'
import { Bell, Search, ChevronDown, Building2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'

const BREADCRUMBS: Record<string, string> = {
  '/admin-portal/overview':      'Overview',
  '/admin-portal/organizations': 'Organizations',
  '/admin-portal/customers':     'Customers',
  '/admin-portal/requests':      'Service Requests',
  '/admin-portal/approvals':     'Approvals',
  '/admin-portal/assets':        'Assets',
  '/admin-portal/deployments':   'Deployments',
  '/admin-portal/services':      'Services',
  '/admin-portal/integrations':  'Integrations',
  '/admin-portal/users':         'Users & Roles',
  '/admin-portal/audit':         'Audit Logs',
  '/admin-portal/settings':      'System Settings',
}

export default function AdminHeader() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user }  = useWorkspace()
  const [userOpen, setUserOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const pageLabel = BREADCRUMBS[location.pathname] ?? 'Admin Portal'

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
    setUserOpen(false)
    navigate('/login')
  }

  return (
    <header
      className="h-[58px] min-h-[58px] border-b border-white/[0.06] flex items-center px-4 gap-3 z-40 flex-shrink-0"
      style={{ background: '#0d1525' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Building2 size={13} style={{ color: '#8b5cf6' }} />
        <span className="text-[13px] text-fanos-muted font-medium">Admin Portal</span>
        <span className="text-fanos-dim">/</span>
        <span className="text-[13px] text-white font-semibold">{pageLabel}</span>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center max-w-md mx-auto">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md w-full"
          style={{ background: 'rgba(11,20,36,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Search size={12} className="text-fanos-dim flex-shrink-0" />
          <input
            type="text"
            placeholder="Search organizations, customers, users…"
            className="bg-transparent border-none outline-none text-[12px] text-fanos-muted placeholder:text-fanos-dim w-full"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Pending approvals badge */}
        <button
          onClick={() => navigate('/admin-portal/approvals')}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border:     '1px solid rgba(245,158,11,0.25)',
            color:      '#f59e0b',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-fanos-amber" />
          5 Pending
        </button>

        {/* Notifications */}
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-md transition-all hover:bg-white/[0.05]"
          style={{ background: 'rgba(11,20,36,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Bell size={14} className="text-fanos-muted" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-fanos-amber text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2"
            style={{ borderColor: '#0d1525' }}>
            3
          </span>
        </button>

        {/* User menu */}
        <div ref={ref} className="relative">
          <button
            onClick={() => setUserOpen(o => !o)}
            className="flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-all hover:bg-white/[0.05]"
            style={{ background: 'rgba(17,28,46,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#2d1b69,#4c1d95)' }}
            >
              {initials}
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-[11px] font-semibold text-fanos-text">{user.full_name}</div>
              <div className="text-[9px] capitalize" style={{ color: '#a78bfa' }}>{user.role}</div>
            </div>
            <ChevronDown size={10} className={`text-fanos-dim transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`} />
          </button>

          {userOpen && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-xl shadow-2xl z-[200] overflow-hidden"
              style={{ background: '#111c2e', border: '1px solid rgba(139,92,246,0.2)' }}
            >
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <div className="text-[11px] font-bold text-white">{user.full_name}</div>
                <div className="text-[9px] text-fanos-dim">{user.email}</div>
                <div className="text-[9px] mt-0.5 capitalize font-semibold" style={{ color: '#a78bfa' }}>
                  {user.role}
                </div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { navigate('/admin-portal/users'); setUserOpen(false) }}
                  className="w-full text-left px-4 py-2 text-[11px] text-fanos-muted hover:bg-white/[0.04] transition-colors"
                >
                  My Profile
                </button>
                <button
                  onClick={() => { navigate('/admin-portal/settings'); setUserOpen(false) }}
                  className="w-full text-left px-4 py-2 text-[11px] text-fanos-muted hover:bg-white/[0.04] transition-colors"
                >
                  System Settings
                </button>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-[11px] text-fanos-red hover:bg-red-500/[0.06] transition-colors"
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
