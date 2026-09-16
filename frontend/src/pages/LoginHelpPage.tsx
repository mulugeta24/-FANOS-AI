import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ChevronLeft, Lock, UserPlus, HelpCircle, Key } from 'lucide-react';

const LoginHelpPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/login')} className="flex items-center gap-3 hover:opacity-80 transition">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-slate-900">FANOS AI</div>
              <div className="text-xs text-slate-600">Security Center</div>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Portal
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition"
            >
              Create Free Account
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
          <Link to="/login" className="hover:text-cyan-700 transition">FANOS Portal</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">Login Support</span>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Login & Account Help</h1>
            </div>
          </div>
          <p className="text-cyan-50 text-lg">
            Find help with logging in, MFA setup, and account access. Select a topic below to find step-by-step guides and resources for the most common login and account issues.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-8">
          <div className="flex border-b border-slate-200">
            <button className="px-6 py-3 text-sm font-semibold text-cyan-700 border-b-2 border-cyan-700 bg-cyan-50">
              Login & Account Access
            </button>
            <button className="px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Setting Up MFA
            </button>
          </div>

          <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Step-by-step Guides</h2>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Guide 1 */}
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6 hover:shadow-lg transition cursor-pointer">
                <div className="w-12 h-12 bg-cyan-600 rounded-lg flex items-center justify-center mb-4">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Accepting an invitation from your organization
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Got an invite email? Follow these steps to activate your account.
                </p>
                <Link to="#" className="text-sm font-semibold text-cyan-700 hover:text-cyan-800 inline-flex items-center gap-1">
                  View Guide
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </Link>
              </div>

              {/* Guide 2 */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 hover:shadow-lg transition cursor-pointer">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Signing up for a free portal account
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Access FANOS AI benchmarks, insights, and resources by creating your free account.
                </p>
                <Link to="/register" className="text-sm font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1">
                  View Guide
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </Link>
              </div>

              {/* Guide 3 */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 hover:shadow-lg transition cursor-pointer">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Logging into the FANOS Portal
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Step-by-step guide for accessing the portal, passwords, and MFA.
                </p>
                <Link to="/login" className="text-sm font-semibold text-purple-700 hover:text-purple-800 inline-flex items-center gap-1">
                  View Guide
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </Link>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="border-t border-slate-200 pt-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">New or First-Time Users</h2>
              
              <div className="space-y-3">
                <details className="bg-cyan-600 text-white rounded-lg overflow-hidden group">
                  <summary className="px-6 py-4 cursor-pointer font-semibold flex items-center justify-between hover:bg-cyan-700 transition">
                    <span>I'm not sure if I have an account</span>
                    <ChevronLeft className="w-5 h-5 rotate-180 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-6 py-4 bg-cyan-700">
                    <p className="text-cyan-50">
                      If you received an invitation email from FANOS AI or your organization administrator, you likely have an account. Check your email for an invite or try the "Forgot Password" link on the login page to verify.
                    </p>
                  </div>
                </details>

                <details className="bg-cyan-600 text-white rounded-lg overflow-hidden group">
                  <summary className="px-6 py-4 cursor-pointer font-semibold flex items-center justify-between hover:bg-cyan-700 transition">
                    <span>My invitation or verification link has expired</span>
                    <ChevronLeft className="w-5 h-5 rotate-180 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-6 py-4 bg-cyan-700">
                    <p className="text-cyan-50">
                      Invitation links expire after 7 days for security. Contact your organization administrator to request a new invitation, or reach out to FANOS AI support for assistance.
                    </p>
                  </div>
                </details>

                <details className="bg-cyan-600 text-white rounded-lg overflow-hidden group">
                  <summary className="px-6 py-4 cursor-pointer font-semibold flex items-center justify-between hover:bg-cyan-700 transition">
                    <span>I created an account but can't log in</span>
                    <ChevronLeft className="w-5 h-5 rotate-180 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-6 py-4 bg-cyan-700">
                    <p className="text-cyan-50 mb-3">
                      Common reasons for login issues:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-cyan-50">
                      <li>Email verification is pending - check your inbox</li>
                      <li>Account is not yet activated by administrator</li>
                      <li>Incorrect username or password - try password reset</li>
                      <li>MFA code is incorrect or expired</li>
                    </ul>
                  </div>
                </details>

                <details className="bg-cyan-600 text-white rounded-lg overflow-hidden group">
                  <summary className="px-6 py-4 cursor-pointer font-semibold flex items-center justify-between hover:bg-cyan-700 transition">
                    <span>My MFA isn't working or I'm not receiving a code</span>
                    <ChevronLeft className="w-5 h-5 rotate-180 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-6 py-4 bg-cyan-700">
                    <p className="text-cyan-50 mb-3">
                      If you're having MFA issues:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-cyan-50">
                      <li>Verify your authenticator app time is synchronized</li>
                      <li>Check spam/junk folder for SMS or email codes</li>
                      <li>Use backup codes if you have them saved</li>
                      <li>Contact support to reset your MFA settings</li>
                    </ul>
                  </div>
                </details>

                <details className="bg-cyan-600 text-white rounded-lg overflow-hidden group">
                  <summary className="px-6 py-4 cursor-pointer font-semibold flex items-center justify-between hover:bg-cyan-700 transition">
                    <span>My password reset link isn't working</span>
                    <ChevronLeft className="w-5 h-5 rotate-180 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-6 py-4 bg-cyan-700">
                    <p className="text-cyan-50">
                      Password reset links expire after 1 hour. If your link has expired, request a new password reset from the login page. Ensure you're clicking the most recent link if you've requested multiple resets.
                    </p>
                  </div>
                </details>

                <details className="bg-cyan-600 text-white rounded-lg overflow-hidden group">
                  <summary className="px-6 py-4 cursor-pointer font-semibold flex items-center justify-between hover:bg-cyan-700 transition">
                    <span>I need to update my email address</span>
                    <ChevronLeft className="w-5 h-5 rotate-180 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-6 py-4 bg-cyan-700">
                    <p className="text-cyan-50">
                      To update your email address, log into your FANOS AI account and navigate to Account Settings. For security reasons, you'll need to verify both your old and new email addresses. Contact support if you no longer have access to your registered email.
                    </p>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>

        {/* Need More Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Need More Help?</h3>
              <p className="text-slate-700 mb-4">
                Our support team is available for FANOS AI Portal login and account issues.
              </p>
              <button
                onClick={() => navigate('/contact')}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition inline-flex items-center gap-2"
              >
                Contact Support
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white px-6 py-6 mt-12">
        <div className="max-w-7xl mx-auto text-center text-sm text-slate-500">
          © 2026 FANOS AI Security Center. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default LoginHelpPage;
