/**
 * FANOS AI — Portal Selection Page
 * Shown when the user clicks "FANOS Portal Login" on the landing page.
 * Presents two clear entry points:
 *   1. Admin & Security Portal  (Admin + SOC analysts)
 *   2. Customer SOC Portal      (Customers)
 * Clicking either card takes them to the unified login page.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowUpRight,
  ShieldCheck,
  Headphones,
  Briefcase,
  User,
  Database,
  FileText,
  Building2,
  CalendarRange,
  BookOpen,
  ExternalLink,
} from 'lucide-react'

export default function PortalSelectPage() {
  const navigate = useNavigate()
  const [activeMenu, setActiveMenu] = useState<'portal' | 'support'>('portal')

  const handlePortalClick = () => {
    setActiveMenu('portal')
    navigate('/portal-login')
  }

  const handleSupportClick = () => {
    setActiveMenu('support')
    navigate('/support-center')
  }

  return (
    <div className="min-h-screen flex bg-[#e9edf0] text-slate-800">
      <aside className="w-[330px] border-r border-slate-300 bg-[#eef2f4] px-5 py-5 flex flex-col">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md border border-slate-300 bg-white flex items-center justify-center shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-label="FANOS logo">
                <path d="M12 2L4 6.5V12c0 5 3.58 9.6 8 10.93C16.42 21.6 20 17 20 12V6.5L12 2Z" stroke="#0f8cc9" strokeWidth="1.3" strokeLinejoin="round" fill="rgba(15,140,201,0.08)" />
                <path d="M9 12l2.5 2.5L15 9" stroke="#199ec6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-bold text-slate-800">
                Center for
              </div>
              <div className="text-[18px] font-bold text-slate-800">
                FANOS Portal
              </div>
            </div>
          </div>

          <div className="w-8 h-8 rounded-md border border-slate-300 bg-white flex items-center justify-center text-slate-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePortalClick}
          className={`mb-4 w-full rounded-md border px-4 py-3 shadow-inner flex items-center gap-3 text-left transition-colors ${
            activeMenu === 'portal' ? 'border-slate-300 bg-[#d9efe8] text-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck size={18} className="text-slate-700" />
          <span className="font-medium text-[15px]">FANOS Portal</span>
        </button>

        <button
          type="button"
          onClick={handleSupportClick}
          className={`w-full rounded-lg border px-4 py-3 flex items-center gap-3 text-left transition-colors ${
            activeMenu === 'support' ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Headphones size={18} className="text-slate-700" />
          <span className="text-[15px]">Support Center</span>
          <span className="ml-auto text-slate-500 text-xs">▼</span>
        </button>

        <div className="mt-auto space-y-4">
          <div className="flex items-center gap-3 text-[15px] text-slate-700">
            <User size={18} className="text-slate-700" />
            <span>Login &amp; Account Help</span>
          </div>

          <div className="flex items-center justify-between text-[15px] text-slate-700 rounded-lg border border-slate-300 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <Briefcase size={18} className="text-slate-700" />
              <span>Contact Support</span>
            </div>
            <ArrowUpRight size={16} className="text-slate-500" />
          </div>
        </div>
      </aside>

      <main className="flex-1 px-8 py-4">
        <header className="flex justify-end items-center gap-3 py-2">
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 rounded-md border border-sky-700 bg-white text-sky-700 font-semibold text-[15px] hover:bg-sky-50 transition-colors"
          >
            Log In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-5 py-2.5 rounded-md border border-sky-700 bg-sky-600 text-white font-semibold text-[15px] hover:bg-sky-700 transition-colors"
          >
            Create Free Account
          </button>
        </header>

        <div className="mt-8 rounded-[18px] px-10 py-8 bg-gradient-to-r from-[#0d8bbd] via-[#1aa3c8] to-[#2fbad5] shadow-inner shadow-sky-300/20">
          <h1 className="text-[36px] font-light tracking-tight text-white text-center leading-tight mb-3">
            Welcome to the FANOS Portal, Your access to FANOS
          </h1>
          <p className="text-center text-[16px] text-sky-50/90">
            Log in or create a free account to access the FANOS resources available to you.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1200px]">
          <div className="rounded-[18px] border border-sky-700/40 bg-slate-50/80 p-8 shadow-sm">
            <h2 className="text-[30px] font-light text-sky-700 mb-5 text-center">
              Customer Portal Login
            </h2>

            <p className="text-[16px] leading-8 text-slate-700 text-center mb-6">
              For organizations using FANOS AI cybersecurity services.
            </p>

            <p className="text-[16px] leading-8 text-slate-700 text-center mb-8">
              Approved customers log in to access the organization’s security environment and Customer SOC after review and onboarding.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => navigate('/login')}
                className="mx-auto block px-8 py-3 rounded-lg bg-sky-700 text-white text-[15px] font-semibold hover:bg-sky-800 transition-colors"
              >
                Log In to Customer Portal
              </button>

              <button
                onClick={() => navigate('/request-service')}
                className="mx-auto block px-8 py-3 rounded-lg border border-sky-700 bg-white text-sky-700 text-[15px] font-semibold hover:bg-sky-50 transition-colors"
              >
                Request Security Service
              </button>
            </div>
          </div>

          <div className="rounded-[18px] border border-slate-300 bg-slate-50/80 p-8 shadow-sm">
            <h2 className="text-[30px] font-light text-sky-700 mb-5 text-center">
              Free Portal Account Login
            </h2>

            <p className="text-[16px] leading-8 text-slate-700 text-center mb-6">
              Access FANOSSec security resources, insights, services, news, and membership content.
            </p>

            <p className="text-[16px] leading-8 text-slate-700 text-center mb-8">
              This is a separate membership portal and does not grant access to the Customer SOC or organization infrastructure.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => navigate('/login')}
                className="mx-auto block px-8 py-3 rounded-lg bg-sky-700 text-white text-[15px] font-semibold hover:bg-sky-800 transition-colors"
              >
                Log In
              </button>

              <button
                onClick={() => navigate('/register')}
                className="mx-auto block px-8 py-3 rounded-lg border border-sky-700 bg-white text-sky-700 text-[15px] font-semibold hover:bg-sky-50 transition-colors"
              >
                Create Free Account
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 max-w-[1200px] rounded-[18px] border border-slate-300 bg-slate-50/80 p-0 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-300 bg-slate-100/80">
            <div className="flex-1 px-5 py-3 text-center text-[15px] font-semibold text-sky-700 border-b-2 border-sky-700 bg-white">
              Customer Portal
            </div>
            <div className="flex-1 px-5 py-3 text-center text-[15px] font-semibold text-slate-500">
              Free Portal Account
            </div>
          </div>

          <div className="p-5">
            <h3 className="text-[22px] font-semibold text-slate-700 mb-4 text-center">
              What’s Available on Customer Portal
            </h3>

            {[
              {
                icon: <Database size={18} className="text-sky-700" />,
                title: 'Threat Intelligence',
                text: 'Advisories, indicators of compromise, and analysis from the FANOS analyst team.',
              },
              {
                icon: <Building2 size={18} className="text-sky-700" />,
                title: 'Products & Services',
                text: 'Set up and access your organization’s FANOS products and services through the portal.',
              },
              {
                icon: <User size={18} className="text-sky-700" />,
                title: 'Organization Management',
                text: 'Manage your organization profile and your team’s portal accounts.',
              },
              {
                icon: <FileText size={18} className="text-sky-700" />,
                title: 'Member Resources',
                text: 'Content, documentation, and resources available to FANOS Sec members.',
              },
              {
                icon: <CalendarRange size={18} className="text-sky-700" />,
                title: 'Events & Webinars',
                text: 'Events, webinars, and training sessions available to FANOS Sec members.',
              },
              {
                icon: <BookOpen size={18} className="text-sky-700" />,
                title: 'Reports',
                text: 'See what FANOS Sec monitors for your organization and track your membership value.',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 border-t border-slate-300 py-5 first:border-t-0 first:pt-0">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-[18px] font-semibold text-sky-700 mb-1">{item.title}</h4>
                  <p className="text-[15px] leading-7 text-slate-600">{item.text}</p>
                </div>
              </div>
            ))}

            <div className="mt-4 text-[15px] leading-7 text-slate-600 text-center">
              FANOS Sec partners have access to a subset of these resources based on their participation level.
              <br />
              Log in to see what’s available to your organization.
            </div>
          </div>
        </div>

        <div className="mt-8 grid max-w-[1200px] grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-[18px] border border-slate-300 bg-slate-50/80 p-6 shadow-sm">
            <h3 className="text-[20px] font-semibold text-sky-700 mb-3 text-center">Not yet a FANOS Sec Member?</h3>
            <p className="text-[15px] leading-7 text-slate-600 text-center mb-5">
              Membership is available to organizations seeking cybersecurity collaboration, threat intelligence, and operational support at no cost.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="mx-auto flex items-center justify-center gap-2 rounded-md border border-sky-700 bg-white px-4 py-2 text-[14px] font-semibold text-sky-700 hover:bg-sky-50 transition-colors"
            >
              Learn About Membership
              <ExternalLink size={14} />
            </button>
          </div>

          <div className="rounded-[18px] border border-slate-300 bg-slate-50/80 p-6 shadow-sm">
            <h3 className="text-[20px] font-semibold text-sky-700 mb-3 text-center">Looking for FANOS SecureSuite?</h3>
            <p className="text-[15px] leading-7 text-slate-600 text-center mb-5">
              SecureSuite Membership gives organizations access to FANOS-CAT Pro, the SecureSuite Platform, Build Kits, and more resources.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="mx-auto flex items-center justify-center gap-2 rounded-md border border-sky-700 bg-white px-4 py-2 text-[14px] font-semibold text-sky-700 hover:bg-sky-50 transition-colors"
            >
              Learn About SecureSuite
              <ExternalLink size={14} />
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-slate-300 pt-4 text-[13px] text-slate-500">
          <span>© 2026 FANOS AI — AI-Powered Cyber Defense Platform</span>
          <div className="flex items-center gap-5">
            <Link to="/home" className="hover:text-sky-700 transition-colors">Privacy Policy</Link>
            <Link to="/home" className="hover:text-sky-700 transition-colors">Terms of Service</Link>
            <Link to="/login" className="hover:text-sky-700 transition-colors">Sign In</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
