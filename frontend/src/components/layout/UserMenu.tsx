/**
 * UserMenu — top-right user avatar + dropdown.
 * Reads the logged-in user from localStorage (fanos_user),
 * so it reflects whoever actually signed in via the login page.
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, User, Settings, ScrollText,
  Key, LogOut, Shield,
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
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all bg-slate-900/70 border border-white/[0.08] hover:border-white/[0.18] shadow-sm hover:shadow-[0_0_12px_rgba(255,255,255,0.05)]"
      >
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-sm"
        >
          {initials}
        </div>
        <div className="leading-tight hidden sm:block text-left">
          <div className="text-[12px] font-semibold text-white">{user.full_name}</div>
          <div className="text-[9px] font-medium" style={{ color: roleColor }}>{roleLabel}</div>
        </div>
        <ChevronDown
          size={11}
          className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-2xl shadow-2xl z-[200] overflow-hidden bg-[#0c1424]/98 border border-white/[0.1] backdrop-blur-2xl animate-fade-in"
        >
          {/* Profile header */}
          <div className="px-4 py-3 border-b border-white/[0.08] bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0 bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-sm"
              >
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-white truncate">{user.full_name}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield size={9} style={{ color: roleColor }} />
                  <span className="text-[9px] font-semibold" style={{ color: roleColor }}>{roleLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu items — destination depends on role */}
          <div className="py-1">
            <MenuItem
              icon={<User size={13} />}
              label="My Profile"
              onClick={() => go(user.role === 'admin' ? '/admin-portal/users' : user.role === 'customer' ? '/customer/profile' : '/dashboard')}
            />
            {user.role === 'customer' ? (
              <>
                <MenuItem
                  icon={<Shield size={13} />}
                  label="My Service Requests"
                  onClick={() => go('/customer/requests')}
                />
                <MenuItem
                  icon={<ScrollText size={13} />}
                  label="Security Reports"
                  onClick={() => go('/customer/reports')}
                />
              </>
            ) : (
              <>
                <MenuItem
                  icon={<Settings size={13} />}
                  label="Settings"
                  onClick={() => go(user.role === 'admin' ? '/admin-portal/settings' : '/dashboard')}
                />
                <MenuItem
                  icon={<ScrollText size={13} />}
                  label="Audit Logs"
                  onClick={() => go(user.role === 'admin' ? '/admin-portal/audit' : '/dashboard')}
                />
                <MenuItem
                  icon={<Key size={13} />}
                  label="API Keys"
                  onClick={() => go('/admin/api-keys')}
                />
              </>
            )}
          </div>

          {/* Divider */}
          <div className="h-px mx-3 bg-white/[0.08]" />

          {/* Logout */}
          <div className="py-1">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium transition-colors cursor-pointer text-left text-rose-400 hover:bg-rose-500/10"
            >
              <LogOut size={13} />
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
      className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-slate-300 hover:text-white font-medium transition-colors cursor-pointer text-left hover:bg-white/[0.05]"
    >
      <span className="text-slate-400 flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {right}
    </button>
  )
}
