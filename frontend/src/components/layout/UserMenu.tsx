/**
 * UserMenu — top-right user avatar + dropdown.
 * Reads the logged-in user from localStorage (fanos_user),
 * so it reflects whoever actually signed in via the login page.
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, User, Settings, ScrollText,
  Key, LogOut, Shield, Moon,
} from 'lucide-react'

// ── Read current user from localStorage ───────────────────────
function readUser() {
  try {
    const raw = localStorage.getItem('fanos_user')
    if (raw) return JSON.parse(raw) as { full_name: string; email: string; role: string; username: string }
  } catch { /* ignore */ }
  return { full_name: 'Guest', email: '', role: 'customer', username: 'guest' }
}

// ── Role label shown in the dropdown header ───────────────────
const ROLE_LABELS: Record<string, string> = {
  admin:    'Administrator',
  analyst:  'SOC Analyst',
  customer: 'Customer',
}

// ── Role accent colour ────────────────────────────────────────
const ROLE_COLOR: Record<string, string> = {
  admin:    '#ef4444',
  analyst:  '#00c8ff',
  customer: '#00e5a0',
}

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const navigate        = useNavigate()
  const user            = readUser()

  const initials    = user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const roleLabel   = ROLE_LABELS[user.role]  ?? user.role
  const roleColor   = ROLE_COLOR[user.role]   ?? '#8fa3bf'

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function go(path: string) {
    setOpen(false)
    navigate(path)
  }

  function logout() {
    localStorage.removeItem('fanos_token')
    localStorage.removeItem('fanos_user')
    setOpen(false)
    navigate('/login')
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
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
          <div className="text-[9px]" style={{ color: roleColor }}>{roleLabel}</div>
        </div>
        <ChevronDown
          size={10}
          className={`text-fanos-dim transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-xl shadow-2xl z-[200] overflow-hidden animate-fade-in"
          style={{ background: '#111c2e', border: '1px solid rgba(0,200,255,0.15)' }}
        >
          {/* Profile header */}
          <div
            className="px-4 py-3 border-b border-white/[0.06]"
            style={{ background: 'linear-gradient(135deg,rgba(0,200,255,0.07),rgba(139,92,246,0.05))' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#0a3d62,#1565c0)' }}
              >
                {initials}
              </div>
              <div>
                <div className="text-[12px] font-bold text-white">{user.full_name}</div>
                <div className="text-[9px] text-fanos-dim truncate max-w-[140px]">{user.email}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield size={8} style={{ color: roleColor }} />
                  <span className="text-[9px] font-semibold" style={{ color: roleColor }}>{roleLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu items — destination depends on role */}
          <div className="py-1">
            <MenuItem
              icon={<User size={12} />}
              label="My Profile"
              onClick={() => go(user.role === 'admin' ? '/admin-portal/users' : '/dashboard')}
            />
            <MenuItem
              icon={<Settings size={12} />}
              label="Settings"
              onClick={() => go(user.role === 'admin' ? '/admin-portal/settings' : '/dashboard')}
            />
            <MenuItem
              icon={<ScrollText size={12} />}
              label="Audit Logs"
              onClick={() => go(user.role === 'admin' ? '/admin-portal/audit' : '/dashboard')}
            />
            <MenuItem
              icon={<Key size={12} />}
              label="API Keys"
              onClick={() => go('/admin/api-keys')}
            />
            <MenuItem
              icon={<Moon size={12} />}
              label="Dark Mode"
              onClick={() => {}}
              right={
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,229,160,.1)', color: '#00e5a0', border: '1px solid rgba(0,229,160,.2)' }}
                >
                  ON
                </span>
              }
            />
          </div>

          {/* Divider */}
          <div className="h-px mx-3 bg-white/[0.06]" />

          {/* Logout */}
          <div className="py-1">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium transition-colors cursor-pointer text-left"
              style={{ color: '#ef4444' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,.08)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <LogOut size={12} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon, label, onClick, right,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; right?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-fanos-muted font-medium transition-colors cursor-pointer text-left"
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,200,255,.05)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      <span className="text-fanos-accent flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {right}
    </button>
  )
}
