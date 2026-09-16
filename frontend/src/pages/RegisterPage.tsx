import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, CheckCircle2, AlertCircle, FileText, Eye, EyeOff } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    organization: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.username.trim() || formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Valid email is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!formData.agreeToTerms) {
      setError('You must agree to the terms and conditions');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          organization: formData.organization,
          password: formData.password,
          role: 'customer',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Registration failed');
      }

      setSuccess(true);
      
      setTimeout(() => {
        navigate('/login', { state: { message: 'Registration successful! Please login.' } });
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white border border-emerald-200 rounded-xl p-8 text-center shadow-lg">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Successful!</h2>
            <p className="text-slate-600 mb-4">
              Your account has been created successfully.
            </p>
            <p className="text-sm text-slate-500">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel - Dark Blue with Benefits */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-cyan-800 via-cyan-900 to-blue-900 p-12 flex-col justify-between text-white">
        <div>
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-cyan-200 mb-2">FANOS AI Security Platform</h2>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              One Free Account, Access to Enterprise Security.
            </h1>
            <p className="text-cyan-100 text-base">
              Create a free account for immediate access to FANOS AI resources, tools, and thought leadership.
            </p>
          </div>

          <div className="space-y-6 mt-12">
            {/* Benefit 1 */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-cyan-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-cyan-200" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Security Frameworks & Best Practices</h3>
                <p className="text-cyan-100 text-sm">
                  AI-powered threat detection and prevention frameworks with real-time analysis.
                </p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-cyan-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-cyan-200" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Insights & Resources</h3>
                <p className="text-cyan-100 text-sm">
                  Articles, Webinars, Case Studies, and threat intelligence reports.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <Link to="/home" className="text-cyan-200 hover:text-white text-sm font-medium inline-flex items-center gap-2 transition">
            ← Learn about the FANOS AI Platform
          </Link>
        </div>
      </div>

      {/* Right Panel - White with Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xl font-bold text-slate-900">FANOS AI</div>
                <div className="text-xs text-slate-600">Security Center</div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome</h2>
            <p className="text-slate-600 text-sm">
              Sign Up to FANOS AI Security Platform to continue to Portal.
            </p>
          </div>

          {/* Registration Form Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Username*
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition text-slate-900"
                  placeholder="Enter username"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address*
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition text-slate-900"
                  placeholder="Enter email"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password*
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 pr-11 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition text-slate-900"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm Password*
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 pr-11 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition text-slate-900"
                    placeholder="Confirm password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Optional Fields - Collapsible */}
              <details className="border border-slate-200 rounded-lg">
                <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                  Optional Information (recommended)
                </summary>
                <div className="px-4 pb-4 pt-2 space-y-4 border-t border-slate-200 bg-slate-50">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition text-slate-900"
                      placeholder="John Doe"
                    />
                  </div>

                  {/* Organization */}
                  <div>
                    <label htmlFor="organization" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Organization
                    </label>
                    <input
                      type="text"
                      id="organization"
                      name="organization"
                      value={formData.organization}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition text-slate-900"
                      placeholder="Your Company"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition text-slate-900"
                      placeholder="+251 912 345 678"
                    />
                  </div>
                </div>
              </details>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                  required
                />
                <label htmlFor="agreeToTerms" className="text-sm text-slate-700">
                  I agree to the FANOS AI{' '}
                  <Link to="/terms" className="text-cyan-700 hover:text-cyan-800 font-medium transition">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-cyan-700 hover:text-cyan-800 font-medium transition">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="text-center mt-6 pt-6 border-t border-slate-200">
              <p className="text-slate-600 text-sm">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-cyan-700 hover:text-cyan-800 font-semibold transition"
                >
                  Log in
                </Link>
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
            <Link to="/privacy" className="hover:text-slate-700 transition">Privacy Policy</Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-slate-700 transition">Terms of Use</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
