import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, MapPin, Shield, Brain, Globe, CheckCircle2, Linkedin, Send, MessageCircle } from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav'
import LandingFooter from '@/components/landing/LandingFooter'

export default function ContactPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required'
    if (!formData.message.trim()) newErrors.message = 'Message is required'

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
        name: '',
        email: '',
        subject: '',
        message: '',
      })
    }, 1500)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: value
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
            
            <h1 className="text-4xl font-black text-white mb-4">Message Sent Successfully</h1>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              Thank you for reaching out to FANOS AI. We've received your message and will respond shortly.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button 
                onClick={() => setSubmitSuccess(false)}
                className="px-6 py-3 rounded-xl text-base font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #0891b2 100%)', boxShadow: '0 6px 24px rgba(34,211,238,0.4)' }}>
                Send Another Message
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
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' }}>
            <Mail size={14} style={{ color: '#22D3EE' }} />
            <span className="text-sm font-semibold" style={{ color: '#22D3EE' }}>CONTACT FANOS AI</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            Get in Touch with{' '}
            <span style={{ 
              background: 'linear-gradient(135deg, #22D3EE 0%, #0EA5E9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              FANOS AI Team
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Connect with our team for general inquiries, security questions, partnerships, 
            or to learn more about FANOS AI cyber defense platform.
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-12">
            
            {/* Left Column - Contact Info & Social */}
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-black text-white mb-6">Contact Information</h2>
              
              <div className="space-y-6 mb-8">
                {/* Email */}
                <div className="p-6 rounded-xl transition-all hover:scale-[1.02]"
                  style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(34,211,238,0.2)' }}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)' }}>
                      <Mail size={20} style={{ color: '#22D3EE' }} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white mb-1">Email</h3>
                      <a href="mailto:hello@fanos.ai" 
                        className="text-lg font-semibold block hover:opacity-80 transition-opacity"
                        style={{ color: '#22D3EE' }}>
                        hello@fanos.ai
                      </a>
                      <p className="text-xs text-gray-500 mt-1">General inquiries</p>
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className="p-6 rounded-xl transition-all hover:scale-[1.02]"
                  style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <Shield size={20} style={{ color: '#EF4444' }} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white mb-1">Security</h3>
                      <a href="mailto:security@fanos.ai" 
                        className="text-lg font-semibold block hover:opacity-80 transition-opacity"
                        style={{ color: '#EF4444' }}>
                        security@fanos.ai
                      </a>
                      <p className="text-xs text-gray-500 mt-1">Security reports</p>
                    </div>
                  </div>
                </div>

                {/* Partnerships */}
                <div className="p-6 rounded-xl transition-all hover:scale-[1.02]"
                  style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}>
                      <Brain size={20} style={{ color: '#A78BFA' }} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white mb-1">Partnerships</h3>
                      <a href="mailto:partners@fanos.ai" 
                        className="text-lg font-semibold block hover:opacity-80 transition-opacity"
                        style={{ color: '#A78BFA' }}>
                        partners@fanos.ai
                      </a>
                      <p className="text-xs text-gray-500 mt-1">Business collaboration</p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="p-6 rounded-xl transition-all hover:scale-[1.02]"
                  style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                      <MapPin size={20} style={{ color: '#10B981' }} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white mb-1">Location</h3>
                      <p className="text-lg font-semibold" style={{ color: '#10B981' }}>
                        Addis Ababa, Ethiopia
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Headquarters</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="p-6 rounded-xl"
                style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(34,211,238,0.2)' }}>
                <h3 className="text-lg font-bold text-white mb-4">Connect With Us</h3>
                <div className="space-y-3">
                  {/* LinkedIn */}
                  <a href="https://linkedin.com/company/fanos-ai" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-white/5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(10,102,194,0.15)', border: '1px solid rgba(10,102,194,0.3)' }}>
                      <Linkedin size={20} style={{ color: '#0A66C2' }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">LinkedIn</div>
                      <div className="text-xs text-gray-500">Follow our updates</div>
                    </div>
                  </a>

                  {/* Telegram */}
                  <a href="https://t.me/fanosai" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-white/5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(34,165,240,0.15)', border: '1px solid rgba(34,165,240,0.3)' }}>
                      <Send size={20} style={{ color: '#22A5F0' }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Telegram</div>
                      <div className="text-xs text-gray-500">Join our channel</div>
                    </div>
                  </a>

                  {/* WhatsApp */}
                  <a href="https://wa.me/251912345678" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-white/5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)' }}>
                      <MessageCircle size={20} style={{ color: '#25D366' }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">WhatsApp</div>
                      <div className="text-xs text-gray-500">Direct messaging</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column - Message Form */}
            <div className="lg:col-span-3">
              <div className="p-8 md:p-10 rounded-2xl"
                style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(34,211,238,0.2)' }}>
                <h2 className="text-3xl font-black text-white mb-2">Send Us a Message</h2>
                <p className="text-gray-400 mb-8">Fill out the form below and we'll get back to you as soon as possible.</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Your Name <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: `1px solid ${errors.name ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                      }}
                      placeholder="John Smith"
                    />
                    {errors.name && (
                      <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Email Address <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: `1px solid ${errors.email ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                      }}
                      placeholder="john.smith@company.com"
                    />
                    {errors.email && (
                      <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.email}</p>
                    )}
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Subject <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg text-white transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        background: 'rgba(10,14,26,0.8)', 
                        border: `1px solid ${errors.subject ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                      }}
                      placeholder="How can we help you?"
                    />
                    {errors.subject && (
                      <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.subject}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Message <span style={{ color: '#EF4444' }}>*</span>
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
                      placeholder="Tell us more about your inquiry..."
                    />
                    {errors.message && (
                      <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-8 py-4 rounded-xl text-base font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                    style={{ 
                      background: isSubmitting ? 'rgba(34,211,238,0.5)' : 'linear-gradient(135deg, #22D3EE 0%, #0891b2 100%)', 
                      boxShadow: '0 6px 24px rgba(34,211,238,0.4)',
                    }}>
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending Message...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Send size={18} />
                        Send Message
                      </span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-20 px-6" style={{ background: 'rgba(10,14,26,0.5)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-4">Looking for Something Specific?</h2>
            <p className="text-gray-400 text-lg">Choose the option that best fits your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Request Service */}
            <div className="p-8 rounded-xl text-center transition-all hover:scale-105 cursor-pointer"
              onClick={() => navigate('/request-service')}
              style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(34,211,238,0.2)', border: '1px solid rgba(34,211,238,0.4)' }}>
                <Shield size={28} style={{ color: '#22D3EE' }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Request Service</h3>
              <p className="text-sm text-gray-400 mb-4">
                Need FANOS AI protection? Submit a detailed service request.
              </p>
              <button className="px-6 py-2 rounded-lg text-sm font-bold transition-all"
                style={{ background: 'rgba(34,211,238,0.2)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.4)' }}>
                Get Started →
              </button>
            </div>

            {/* Learn About Platform */}
            <div className="p-8 rounded-xl text-center transition-all hover:scale-105 cursor-pointer"
              onClick={() => navigate('/intelligence')}
              style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.4)' }}>
                <Brain size={28} style={{ color: '#A78BFA' }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Intelligence</h3>
              <p className="text-sm text-gray-400 mb-4">
                Learn about our AI-powered threat detection and defense.
              </p>
              <button className="px-6 py-2 rounded-lg text-sm font-bold transition-all"
                style={{ background: 'rgba(167,139,250,0.2)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.4)' }}>
                Explore →
              </button>
            </div>

            {/* About Us */}
            <div className="p-8 rounded-xl text-center transition-all hover:scale-105 cursor-pointer"
              onClick={() => navigate('/about')}
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)' }}>
                <Globe size={28} style={{ color: '#10B981' }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">About FANOS AI</h3>
              <p className="text-sm text-gray-400 mb-4">
                Discover our mission, vision, and what makes us different.
              </p>
              <button className="px-6 py-2 rounded-lg text-sm font-bold transition-all"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981', border: '1px solid rgba(16,185,129,0.4)' }}>
                Learn More →
              </button>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
