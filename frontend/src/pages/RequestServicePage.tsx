import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, CheckCircle2, Zap, Brain, Network, Lock } from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav'
import LandingFooter from '@/components/landing/LandingFooter'

export default function RequestServicePage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    organization: '',
    jobTitle: '',
    phoneNumber: '',
    serviceType: '',
    industryType: '',
    organizationSize: '',
    timeline: '',
    budget: '',
    message: '',
    agreeToTerms: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const serviceTypes = [
    'AI Threat Detection',
    'Network Security (IDS/IPS)',
    'Web Application Security (WAF)',
    'Host-Based Security (HIDS)',
    'Security Assessment',
    'SOC Implementation',
    'Managed Security Services',
    'Enterprise Deployment',
    'Custom Integration',
    'Security Consulting',
  ]

  const industryTypes = [
    'Banking & Finance',
    'Telecommunications',
    'Government',
    'Healthcare',
    'Education',
    'Energy & Utilities',
    'Manufacturing',
    'Retail & E-commerce',
    'Technology',
    'Other',
  ]

  const organizationSizes = [
    '1-50 employees',
    '51-200 employees',
    '201-500 employees',
    '501-1000 employees',
    '1000+ employees',
  ]

  const timelines = [
    'Immediate (Within 1 month)',
    'Short-term (1-3 months)',
    'Mid-term (3-6 months)',
    'Long-term (6+ months)',
    'Exploring options',
  ]

  const budgets = [
    'Under $10,000',
    '$10,000 - $50,000',
    '$50,000 - $100,000',
    '$100,000 - $500,000',
    '$500,000+',
    'Not yet determined',
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!formData.workEmail.trim()) {
      newErrors.workEmail = 'Work email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workEmail)) {
      newErrors.workEmail = 'Please enter a valid email address'
    }
    if (!formData.organization.trim()) newErrors.organization = 'Organization is required'
    if (!formData.serviceType) newErrors.serviceType = 'Please select a service type'
    if (!formData.industryType) newErrors.industryType = 'Please select your industry'
    if (!formData.message.trim()) newErrors.message = 'Message is required'
    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'Please agree to the terms'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitSuccess(true)
      setFormData({
        fullName: '',
        workEmail: '',
        organization: '',
        jobTitle: '',
        phoneNumber: '',
        serviceType: '',
        industryType: '',
        organizationSize: '',
        timeline: '',
        budget: '',
        message: '',
        agreeToTerms: false,
      })
    }, 1500)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  if (submitSuccess) {
    return (
      <div style={{ background: '#080C14', minHeight: '100vh' }}>
        <LandingNav />
        
        <div className="flex items-center justify-center min-h-screen px-6 pt-20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8 flex justify-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)' }}>
                <CheckCircle2 size={40} style={{ color: '#10B981' }} />
              </div>
            </div>
            
            <h1 className="text-4xl font-black text-white mb-4">Service Request Received</h1>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              Thank you for requesting FANOS AI services. Our team will review your requirements 
              and contact you within 24-48 hours to discuss how we can protect your organization.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button 
                onClick={() => setSubmitSuccess(false)}
                className="px-6 py-3 rounded-xl text-base font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #0891b2 100%)', boxShadow: '0 6px 24px rgba(34,211,238,0.4)' }}>
                Submit Another Request
              </button>
              <button 
                onClick={() => navigate('/home')}
                className="px-6 py-3 rounded-xl text-base font-bold text-white transition-all hover:bg-white/10"
                style={{ border: '2px solid rgba(34,211,238,0.5)', background: 'rgba(34,211,238,0.05)' }}>
                Return to Home
              </button>
            </div>
          </div>
        </div>
        
        <LandingFooter />
      </div>
    )
  }

  return (
    <div style={{ background: '#080C14', minHeight: '100vh' }}>
      <LandingNav />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' }}>
            <Shield size={14} style={{ color: '#22D3EE' }} />
            <span className="text-sm font-semibold" style={{ color: '#22D3EE' }}>REQUEST SERVICE</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            Protect Your Organization with{' '}
            <span style={{ 
              background: 'linear-gradient(135deg, #22D3EE 0%, #10B981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              AI-Powered Defense
            </span>
          </h1>
          
          <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Tell us about your cybersecurity needs. Our team will design a custom FANOS AI 
            solution tailored to your organization's security requirements and infrastructure.
          </p>
        </div>
      </section>

      {/* Service Benefits */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: <Zap size={28} />,
                color: '#22D3EE',
                title: 'Rapid Deployment',
                desc: 'Get FANOS AI deployed and protecting your systems within weeks, not months.'
              },
              {
                icon: <Brain size={28} />,
                color: '#A78BFA',
                title: 'Custom AI Models',
                desc: 'Threat detection models tailored to your specific environment and attack patterns.'
              },
              {
                icon: <Network size={28} />,
                color: '#10B981',
                title: 'Full Integration',
                desc: 'Seamless integration with your existing security infrastructure and SIEM.'
              },
            ].map((benefit, idx) => (
              <div key={idx} className="p-6 rounded-xl text-center transition-all hover:scale-105"
                style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${benefit.color}15`, border: `1px solid ${benefit.color}40`, color: benefit.color }}>
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-400">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Request Form */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 md:p-10 rounded-2xl"
            style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(34,211,238,0.2)' }}>
            <h2 className="text-3xl font-black text-white mb-8">Service Request Form</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Contact Information</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Full Name <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: `1px solid ${errors.fullName ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                      }}
                      placeholder="John Smith"
                    />
                    {errors.fullName && (
                      <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.fullName}</p>
                    )}
                  </div>

                  {/* Work Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Work Email <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      name="workEmail"
                      value={formData.workEmail}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: `1px solid ${errors.workEmail ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                      }}
                      placeholder="john.smith@company.com"
                    />
                    {errors.workEmail && (
                      <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.workEmail}</p>
                    )}
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Organization <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="organization"
                      value={formData.organization}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: `1px solid ${errors.organization ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                      }}
                      placeholder="Company Name"
                    />
                    {errors.organization && (
                      <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.organization}</p>
                    )}
                  </div>

                  {/* Job Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Job Title
                    </label>
                    <input
                      type="text"
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      placeholder="Chief Security Officer"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      placeholder="+251 91 234 5678"
                    />
                  </div>
                </div>
              </div>

              {/* Organization Details */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Organization Details</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Industry Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Industry <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      name="industryType"
                      value={formData.industryType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: `1px solid ${errors.industryType ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                      }}>
                      <option value="">Select industry...</option>
                      {industryTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {errors.industryType && (
                      <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.industryType}</p>
                    )}
                  </div>

                  {/* Organization Size */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Organization Size
                    </label>
                    <select
                      name="organizationSize"
                      value={formData.organizationSize}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}>
                      <option value="">Select size...</option>
                      {organizationSizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Service Requirements */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Service Requirements</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Service Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Service Type <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      name="serviceType"
                      value={formData.serviceType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: `1px solid ${errors.serviceType ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                      }}>
                      <option value="">Select service...</option>
                      {serviceTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {errors.serviceType && (
                      <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.serviceType}</p>
                    )}
                  </div>

                  {/* Timeline */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Implementation Timeline
                    </label>
                    <select
                      name="timeline"
                      value={formData.timeline}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}>
                      <option value="">Select timeline...</option>
                      {timelines.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>

                  {/* Budget */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Estimated Budget (Optional)
                    </label>
                    <select
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}>
                      <option value="">Select budget range...</option>
                      {budgets.map(budget => (
                        <option key={budget} value={budget}>{budget}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Describe Your Security Requirements <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2 resize-none"
                  style={{ 
                    background: 'rgba(10,14,26,0.8)', 
                    border: `1px solid ${errors.message ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                  }}
                  placeholder="Tell us about your current security challenges, infrastructure, compliance requirements, and what you're looking to achieve with FANOS AI..."
                />
                {errors.message && (
                  <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.message}</p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    className="mt-1 w-5 h-5 rounded cursor-pointer"
                    style={{ 
                      accentColor: '#22D3EE',
                      border: `1px solid ${errors.agreeToTerms ? '#EF4444' : 'rgba(255,255,255,0.2)'}`,
                    }}
                  />
                  <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                    I agree to the FANOS AI service terms and authorize the team to contact me regarding this request.
                  </span>
                </label>
                {errors.agreeToTerms && (
                  <p className="text-xs mt-1 ml-8" style={{ color: '#EF4444' }}>{errors.agreeToTerms}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-8 py-4 rounded-xl text-base font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                style={{ 
                  background: isSubmitting ? 'rgba(34,211,238,0.5)' : 'linear-gradient(135deg, #22D3EE 0%, #10B981 100%)', 
                  boxShadow: '0 6px 24px rgba(34,211,238,0.4)',
                }}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting Request...
                  </span>
                ) : (
                  'Submit Service Request'
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-20 px-6" style={{ background: 'rgba(10,14,26,0.5)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-4">Why Organizations Choose FANOS AI</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Shield size={24} />, title: 'Enterprise-Grade Security', color: '#22D3EE' },
              { icon: <Brain size={24} />, title: '99.84% AI Accuracy', color: '#A78BFA' },
              { icon: <Zap size={24} />, title: '4.2ms Response Time', color: '#F59E0B' },
              { icon: <Lock size={24} />, title: 'Multi-Layer Defense', color: '#10B981' },
              { icon: <Network size={24} />, title: 'Full Integration Support', color: '#06B6D4' },
              { icon: <CheckCircle2 size={24} />, title: 'Proven in Production', color: '#10B981' },
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-xl text-center transition-all hover:scale-105"
                style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}40`, color: item.color }}>
                  {item.icon}
                </div>
                <h3 className="text-base font-bold text-white">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
