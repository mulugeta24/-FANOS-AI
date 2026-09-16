/**
 * FANOS AI — Login Page
 * Demo mode: no backend required. Credentials are validated locally.
 * After login the user is redirected based on their role:
 *   admin    → /admin-portal/overview
 *   analyst  → /secops/overview
 *   customer → /dashboard
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Shield, ChevronDown, ChevronUp } from 'lucide-react'

// ── Demo credential store ─────────────────────────────────────
// In production this is replaced by a real API call.
const DEMO_USERS: Record<string, { full_name: string; email: string; role: 'admin' | 'analyst' | 'customer'; password: string }> = {
  'fanos ai': {
    full_name: 'FANOS AI Administrator',
    email:     'admin@fanos.ai',
    role:      'admin',
    password:  'Fanos4561644@',
  },
  'mulugeta.ababi': {
    full_name: 'Mulugeta Ababi',
    email:     'mulugeta.ababi@fanos.ai',
    role:      'admin',
    password:  'FanosAdmin2026!',
  },
  'soc.analyst': {
    full_name: 'SOC Analyst',
    email:     'analyst@fanos.ai',
    role:      'analyst',
    password:  'SocAnalyst2026!',
  },
  'customer': {
    full_name: 'Demo Customer',
    email:     'customer@acme.com',
    role:      'customer',
    password:  'Customer2026!',
  },
}

// ── Role → redirect destination ───────────────────────────────
const ROLE_HOME: Record<string, string> = {
  admin:    '/admin-portal/overview',
  analyst:  '/secops/overview',
  customer: '/dashboard',
}

// ── Demo credential cards ──────────────────────────────────────
const DEMO_HINTS = [
  { label: 'Admin Portal',        username: 'mulugeta.ababi', password: 'FanosAdmin2026!',  role: 'admin',    color: '#8b5cf6' },
  { label: 'Security Operations', username: 'soc.analyst',   password: 'SocAnalyst2026!',  role: 'analyst',  color: '#00c8ff' },
  { label: 'Customer SOC',        username: 'customer',       password: 'Customer2026!',    role: 'customer', color: '#00e5a0' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [username,     setUsername]     = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [showHints,    setShowHints]    = useState(true)

  function fillDemo(u: string, p: string) {
    setUsername(u)
    setPassword(p)
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('Username and password are required.')
      return
    }

    setLoading(true)

    // Small artificial delay so it feels like a real login
    setTimeout(() => {
      const key  = username.trim().toLowerCase()
      const user = DEMO_USERS[key]

      if (!user || user.password !== password) {
        setError('Invalid username or password. Use the demo credentials below.')
        setLoading(false)
        return
      }

      // Persist user info for WorkspaceContext + UserMenu
      localStorage.setItem('fanos_token', `demo-token-${key}-${Date.now()}`)
      localStorage.setItem('fanos_user', JSON.stringify({
        username:  key,
        full_name: user.full_name,
        email:     user.email,
        role:      user.role,
      }))

      const destination = ROLE_HOME[user.role] ?? '/dashboard'
      navigate(destination, { replace: true })
    }, 600)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#080f1c' }}>

      {/* ── Left panel ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #0a2540 0%, #0d3b6e 50%, #0a3d62 100%)' }}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0a3d62,#1565c0)', border: '1px solid rgba(0,200,255,0.4)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6.5V12c0 5 3.58 9.6 8 10.93C16.42 21.6 20 17 20 12V6.5L12 2Z"
                  stroke="#00c8ff" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(0,200,255,0.08)" />
                <path d="M9 12l2.5 2.5L15 9" stroke="#00e5a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="text-[16px] font-bold tracking-wide">FANOS <span style={{ color: '#00c8ff' }}>AI</span></div>
              <div className="text-[10px] tracking-[1.5px] uppercase" style={{ color: '#00c8ff' }}>AI Cyber Defense</div>
            </div>
          </div>

          <div className="mb-2 text-[11px] font-semibold tracking-[1.5px] uppercase" style={{ color: '#00c8ff' }}>
            What's New
          </div>
          <h1 className="text-[32px] font-bold leading-tight mb-5">
            Unified Access to the<br />
            FANOS AI Portal and<br />
            Security Platform.
          </h1>
          <p className="text-[14px] leading-relaxed mb-6" style={{ color: '#8fa3bf' }}>
            One login gives you access to all experiences. Move between the Admin Portal, Security Operations, and Customer SOC without separate logins.
          </p>
          <Link to="/login-help" className="text-[13px] font-medium hover:underline" style={{ color: '#00c8ff' }}>
            Need help accessing your account?
          </Link>

          {/* Three workspace cards */}
          <div className="mt-10 space-y-3">
            {[
              { label: 'Admin Portal',        desc: 'Business & platform management', color: '#8b5cf6', icon: '🏢' },
              { label: 'Security Operations', desc: 'Security monitoring & response',  color: '#00c8ff', icon: '🛡️' },
              { label: 'Customer SOC',        desc: 'Your security visibility',        color: '#00e5a0', icon: '👁️' },
            ].map(w => (
              <div key={w.label}
                className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${w.color}20` }}
              >
                <span className="text-lg">{w.icon}</span>
                <div>
                  <div className="text-[12px] font-semibold" style={{ color: w.color }}>{w.label}</div>
                  <div className="text-[11px]" style={{ color: '#6b7280' }}>{w.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link to="/home" className="text-[13px] hover:underline" style={{ color: '#8fa3bf' }}>
          ← Learn about the FANOS AI Portal
        </Link>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Logo (mobile only) */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0a3d62,#1565c0)', border: '1px solid rgba(0,200,255,0.4)' }}>
              <Shield size={18} style={{ color: '#00c8ff' }} />
            </div>
            <div className="text-[16px] font-bold text-white">FANOS <span style={{ color: '#00c8ff' }}>AI</span></div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h2 className="text-[28px] font-bold text-white">Sign In</h2>
            <p className="text-[13px] mt-1" style={{ color: '#8fa3bf' }}>Sign in to the FANOS AI Platform</p>
          </div>

          {/* ── Demo credentials panel ─── */}
          <div className="mb-6 rounded-xl overflow-hidden"
            style={{ background: 'rgba(0,200,255,0.05)', border: '1px solid rgba(0,200,255,0.2)' }}>
            <button
              type="button"
              onClick={() => setShowHints(h => !h)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-fanos-green animate-pulse inline-block" />
                <span className="text-[12px] font-semibold" style={{ color: '#00c8ff' }}>
                  DEMO MODE — Click a credential to auto-fill
                </span>
              </div>
              {showHints
                ? <ChevronUp size={14} style={{ color: '#00c8ff' }} />
                : <ChevronDown size={14} style={{ color: '#00c8ff' }} />
              }
            </button>

            {showHints && (
              <div className="px-3 pb-3 space-y-2">
                {DEMO_HINTS.map(h => (
                  <button
                    key={h.username}
                    type="button"
                    onClick={() => fillDemo(h.username, h.password)}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all hover:opacity-90"
                    style={{ background: `${h.color}12`, border: `1px solid ${h.color}30` }}
                  >
                    <div>
                      <div className="text-[11px] font-bold" style={{ color: h.color }}>{h.label}</div>
                      <div className="text-[10px] font-mono mt-0.5" style={{ color: '#8fa3bf' }}>
                        {h.username} / {h.password}
                      </div>
                    </div>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded"
                      style={{ background: `${h.color}20`, color: h.color, border: `1px solid ${h.color}35` }}>
                      {h.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Login form ─── */}
          <div className="rounded-xl p-8"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

              {/* Error */}
              {error && (
                <div className="rounded-lg p-3 flex items-start gap-2"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                  <p className="text-[12px]" style={{ color: '#fca5a5' }}>{error}</p>
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#8fa3bf' }}>
                  Username or Email address*
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  placeholder="Enter username or email"
                  className="w-full rounded-lg px-4 py-2.5 text-[13px] text-white outline-none transition-all"
                  style={{
                    background:  'rgba(255,255,255,0.06)',
                    border:      '1px solid rgba(255,255,255,0.12)',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#00c8ff')}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#8fa3bf' }}>
                  Password*
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="Enter password"
                    className="w-full rounded-lg px-4 py-2.5 pr-11 text-[13px] text-white outline-none transition-all"
                    style={{
                      background:  'rgba(255,255,255,0.06)',
                      border:      '1px solid rgba(255,255,255,0.12)',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#00c8ff')}
                    onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                    autoComplete="current-password"
                  />
                  <button type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: '#6b7280' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Forgot */}
              <div className="text-right">
                <Link to="/login-help"
                  className="text-[12px] font-medium hover:underline"
                  style={{ color: '#00c8ff' }}>
                  Forgot / Reset Password
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-[13px] font-bold tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0891b2,#1565c0)', color: '#fff' }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                    Signing in…
                  </>
                ) : 'SIGN IN'}
              </button>
            </form>

            {/* Sign up */}
            <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[12px]" style={{ color: '#6b7280' }}>
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold hover:underline" style={{ color: '#00c8ff' }}>
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-5 text-[11px]" style={{ color: '#4a6070' }}>
            <Link to="/home" className="hover:text-white transition">Privacy Policy</Link>
            <span>·</span>
            <Link to="/home" className="hover:text-white transition">Terms of Use</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
