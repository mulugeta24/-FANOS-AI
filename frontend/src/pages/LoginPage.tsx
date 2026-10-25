/**
 * FANOS AI — Login Page
 * Demo mode: no backend required. Credentials are validated locally.
 * After login the user is redirected based on their role:
 *   admin    → /admin-portal/overview
 *   analyst  → /secops/overview
 *   customer → /dashboard
 */
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { loginApi } from '@/lib/api'
import FanosLogo from '@/components/common/FanosLogo'

// ── Role → redirect destination ───────────────────────────────
const ROLE_HOME: Record<string, string> = {
  admin:    '/admin-portal/overview',
  analyst:  '/secops/overview',
  customer: '/customer/dashboard',
}

// ── Demo credential cards (submits against backend /auth/login) ──
const DEMO_HINTS = [
  { label: 'Customer Portal',     username: 'customer.demo',   password: 'CustomerDemo2026!', role: 'customer', color: '#00e5a0' },
  { label: 'Admin Portal',        username: 'mulugeta.ababi',  password: 'FanosAdmin2026!',  role: 'admin',    color: '#8b5cf6' },
  { label: 'Security Operations', username: 'soc.analyst',     password: 'SocAnalyst2026!',  role: 'analyst',  color: '#00c8ff' },
  { label: 'System Admin',        username: 'fanos ai',        password: 'Fanos4561644@',    role: 'admin',    color: '#f59e0b' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username,     setUsername]     = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error,        setError]        = useState('')
  const [successMsg,   setSuccessMsg]   = useState('')
  const [loading,      setLoading]      = useState(false)
  const [showHints,    setShowHints]    = useState(true)

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message)
    }
    if (location.state?.username) {
      setUsername(location.state.username)
    }
  }, [location.state])

  function fillDemo(u: string, p: string) {
    setUsername(u)
    setPassword(p)
    setError('')
    setSuccessMsg('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!username.trim() || !password) {
      setError('Email or username and password are required.')
      return
    }

    setLoading(true)

    try {
      const res = await loginApi(username.trim(), password)

      // Persist real JWT token & verified user payload
      localStorage.setItem('fanos_token', res.access_token)
      localStorage.setItem('fanos_user', JSON.stringify(res.user))

      // Trigger storage event for same-window context synchronization
      window.dispatchEvent(new Event('storage'))

      const userRole = res.user?.role || 'customer'
      const destination = ROLE_HOME[userRole] ?? '/dashboard'
      navigate(destination, { replace: true })
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Invalid username/email or password. Please verify credentials.')
    } finally {
      setLoading(false)
    }
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
          <div className="mb-12">
            <FanosLogo size={46} subtitle="AI CYBER DEFENSE" subtitleClass="text-cyan-400" />
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
          <div className="lg:hidden flex items-center justify-center mb-8">
            <FanosLogo size={40} subtitle="AI CYBER DEFENSE" subtitleClass="text-cyan-400" />
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

              {/* Success from Registration */}
              {successMsg && (
                <div className="rounded-lg p-3 flex items-start gap-2"
                  style={{ background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.35)' }}>
                  <CheckCircle2 size={16} style={{ color: '#00e5a0', flexShrink: 0, marginTop: 2 }} />
                  <p className="text-[12px] font-medium" style={{ color: '#a7f3d0' }}>{successMsg}</p>
                </div>
              )}

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
