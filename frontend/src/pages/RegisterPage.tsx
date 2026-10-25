import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Shield, CheckCircle2, AlertCircle, Eye, EyeOff,
  Building2, User, Mail, Lock, ArrowRight, Sparkles,
  ShieldCheck
} from 'lucide-react'
import { registerCustomerApi } from '@/lib/api'
import FanosLogo from '@/components/common/FanosLogo'

const ORGANIZATION_TYPES = [
  'Enterprise / Corporate',
  'Banking & Financial Services',
  'Technology / SaaS Provider',
  'Healthcare & Life Sciences',
  'Government & Public Sector',
  'Small / Medium Business (SMB)',
  'Education & Academic Research',
  'Critical Infrastructure & Energy',
  'Other',
]

const PLATFORM_PILLARS = [
  { icon: Shield, title: 'Zero Trust Architecture', desc: 'Strict identity verification, cryptographic authentication, and granular tenant isolation.' },
  { icon: Sparkles, title: 'Autonomous AI Telemetry', desc: 'Real-time telemetry ingestion and threat correlation across enterprise infrastructure.' },
  { icon: User, title: 'Customer Security Portal', desc: 'Unified self-service asset registration, custom security telemetry, and audit reporting.' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationType: '',
    phone: '',
    agreeToTerms: false,
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [createdUser, setCreatedUser] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData(prev => ({
      ...prev,
      [name]: val,
    }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Full Name is required')
      return false
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please provide a valid corporate or personal email address')
      return false
    }
    if (!formData.username.trim() || formData.username.trim().length < 3) {
      setError('Username must be at least 3 characters long')
      return false
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify confirmation password.')
      return false
    }
    if (!formData.agreeToTerms) {
      setError('You must agree to the FANOS AI platform terms of service')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError('')

    try {
      const res = await registerCustomerApi({
        full_name: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirm_password: formData.confirmPassword,
        phone: formData.phone.trim(),
        organization_name: formData.organizationName.trim(),
        organization_type: formData.organizationType,
        role: 'customer',
      })

      setCreatedUser(res)
      setSuccess(true)

      // Auto redirect after 3 seconds
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: `Account created successfully for ${res.full_name}! Please enter your password to sign in.`,
            username: res.username || res.email,
          },
        })
      }, 3000)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Registration failed. Please check credentials.')
    } finally {
      setLoading(false)
    }
  }

  // Password strength helper
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Empty', color: 'bg-slate-700' }
    let s = 0
    if (pwd.length >= 8) s += 1
    if (pwd.length >= 12) s += 1
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s += 1
    if (/[0-9]/.test(pwd)) s += 1
    if (/[^A-Za-z0-9]/.test(pwd)) s += 1

    if (s <= 2) return { score: 1, label: 'Weak', color: 'bg-rose-500' }
    if (s <= 3) return { score: 2, label: 'Fair', color: 'bg-amber-500' }
    if (s <= 4) return { score: 3, label: 'Good', color: 'bg-sky-500' }
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' }
  }

  const strength = getPasswordStrength(formData.password)

  // Success view
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#080f1c] text-slate-100">
        <div className="max-w-md w-full bg-[#0d1726]/95 border border-emerald-500/40 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-xl relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500" />
          
          <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Customer Account Created!</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Welcome to FANOS AI Security Platform, <span className="text-emerald-400 font-semibold">{createdUser?.full_name || formData.fullName}</span>. Your security workspace is ready.
          </p>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-medium">Username:</span>
              <span className="text-white font-mono font-semibold">{createdUser?.username || formData.username}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-medium">Email:</span>
              <span className="text-white font-mono">{createdUser?.email || formData.email}</span>
            </div>
            {formData.organizationName && (
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-medium">Organization:</span>
                <span className="text-cyan-400 font-medium">{formData.organizationName}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/login', {
              state: {
                message: 'Registration successful! Enter your password to sign in.',
                username: createdUser?.username || formData.username,
              },
            })}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:brightness-110 transition-all shadow-lg cursor-pointer"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight size={16} />
          </button>

          <p className="text-[11px] text-slate-500 mt-4">
            Automatically redirecting to login in 3 seconds…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#080f1c] text-slate-100">
      {/* ── Left Showcase Panel ─────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-5/12 p-12 flex-col justify-between text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #071529 0%, #0c2340 50%, #061322 100%)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Glow orb */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-10">
            <FanosLogo size={46} subtitle="CYBER DEFENSE PLATFORM" subtitleClass="text-cyan-400 font-mono" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 mb-4">
            <Sparkles size={13} className="text-cyan-400" />
            <span>Customer Security Portal</span>
          </div>

          <h1 className="text-3xl font-bold leading-tight mb-4 text-white">
            Register Your Assets & Request AI-Powered Security Services.
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed mb-8">
            Create your account to register assets, launch vulnerability assessments, configure WAF policies, and submit security service requests with zero friction.
          </p>

          {/* Platform Pillars */}
          <div className="space-y-3.5">
            {PLATFORM_PILLARS.map((pillar) => {
              const IconComp = pillar.icon
              return (
                <div
                  key={pillar.title}
                  className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 transition-all duration-200"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                    <IconComp size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white mb-0.5">{pillar.title}</h3>
                    <p className="text-[11px] text-slate-400 leading-normal">{pillar.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <span>Demo Environment · No credit card required</span>
          <Link to="/home" className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1.5 transition">
            <span>Explore Platform</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── Right Registration Form ──────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-lg my-auto py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <Shield className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-base font-bold text-white">FANOS AI</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Create Customer Account</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select security services and register enterprise assets in one centralized SOC.
            </p>
          </div>

          {/* Card Form */}
          <div className="bg-[#0c1626]/90 border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-md">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Banner */}
              {error && (
                <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-300 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* 1. Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User size={13} className="text-cyan-400" />
                  <span>Full Name <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Mulugeta Ababi"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white placeholder:text-slate-500 text-xs transition outline-none"
                />
              </div>

              {/* 2. Email & Username row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Mail size={13} className="text-cyan-400" />
                    <span>Email Address <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@company.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white placeholder:text-slate-500 text-xs transition outline-none"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User size={13} className="text-cyan-400" />
                    <span>Username <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="unique_username"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white placeholder:text-slate-500 text-xs transition outline-none font-mono"
                  />
                </div>
              </div>

              {/* 3. Password & Confirm Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock size={13} className="text-cyan-400" />
                    <span>Password <span className="text-rose-400">*</span></span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 8 characters"
                      required
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white placeholder:text-slate-500 text-xs transition outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock size={13} className="text-cyan-400" />
                    <span>Confirm Password <span className="text-rose-400">*</span></span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      required
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white placeholder:text-slate-500 text-xs transition outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password strength bar */}
              {formData.password && (
                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 transition-all duration-300 ${
                          step <= strength.score ? strength.color : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-slate-400 font-medium">{strength.label}</span>
                </div>
              )}

              {/* 4. Optional Organization Section */}
              <div className="pt-2">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 border-b border-slate-800 pb-2">
                    <Building2 size={14} className="text-cyan-400" />
                    <span>Organization Information (Optional)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Organization Name */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        name="organizationName"
                        value={formData.organizationName}
                        onChange={handleChange}
                        placeholder="e.g. Acme Corporation"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 focus:border-cyan-400 text-white placeholder:text-slate-500 text-xs transition outline-none"
                      />
                    </div>

                    {/* Organization Type */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Organization Type
                      </label>
                      <select
                        name="organizationType"
                        value={formData.organizationType}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 focus:border-cyan-400 text-white text-xs transition outline-none"
                      >
                        <option value="">Select industry / type…</option>
                        {ORGANIZATION_TYPES.map(t => (
                          <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Direct Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+251 912 345 678"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 focus:border-cyan-400 text-white placeholder:text-slate-500 text-xs transition outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Terms Agreement Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 cursor-pointer"
                  />
                  <span className="leading-relaxed">
                    I agree to the{' '}
                    <span className="text-cyan-400 hover:underline">FANOS AI Terms of Service</span>{' '}
                    and authorize security telemetry and scanning requests on registered assets.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 text-slate-950 hover:brightness-110 active:scale-[0.99] transition-all shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Creating Account…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Create Account</span>
                  </>
                )}
              </button>

              {/* Link to login */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  Already have an account?{' '}
                  <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition hover:underline">
                    Sign in to Portal
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
