import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Target, Users, Award, Globe, TrendingUp, Brain, Lock } from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav'
import LandingFooter from '@/components/landing/LandingFooter'

export default function AboutPage() {
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div style={{ background: '#080C14', minHeight: '100vh' }}>
      <LandingNav />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' }}>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm font-semibold" style={{ color: '#22D3EE' }}>About FANOS AI</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            The World's Most Advanced{' '}
            <span style={{ 
              background: 'linear-gradient(135deg, #22D3EE 0%, #0EA5E9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              AI Intrusion Detection & Response System
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            FANOS AI is a large-scale AI-powered intrusion detection and response alert system 
            engineered to secure organizations with real-time threat detection, intelligent analysis, 
            and automated response capabilities.
          </p>
        </div>
      </section>

      {/* What is FANOS AI */}
      <section className="py-20 px-6" style={{ background: 'rgba(10,14,26,0.5)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-4">What is FANOS AI?</h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              A comprehensive AI-driven security platform designed for enterprise-scale protection
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Brain size={32} />,
                color: '#A78BFA',
                title: 'AI-Powered Detection',
                desc: 'Advanced XGBoost machine learning engine with 99.84% accuracy detecting 15+ attack types including SQL Injection, XSS, DDoS, Brute Force, and zero-day threats in 4.2ms.'
              },
              {
                icon: <Shield size={32} />,
                color: '#22D3EE',
                title: 'Multi-Layer Security',
                desc: 'Integrated defense across network (Suricata IDS/IPS), web (ModSecurity WAF), and host (Wazuh HIDS) layers with unified threat correlation and risk scoring.'
              },
              {
                icon: <Target size={32} />,
                color: '#EF4444',
                title: 'Automated Response',
                desc: 'Instant automated response actions including IP blocking, session termination, WAF rules, incident creation, and SOC team alerts — all within milliseconds of threat detection.'
              },
            ].map((item, idx) => (
              <div key={idx} className="p-8 rounded-2xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(17,26,42,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}40`, color: item.color }}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How FANOS AI Works - Detection & Response Rules */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">How FANOS AI Secures Your Organization</h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              A comprehensive detection and response framework built on proven security principles
            </p>
          </div>

          {/* Detection Rules */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)' }}>
                <Shield size={24} style={{ color: '#22D3EE' }} />
              </div>
              Detection Rules & Capabilities
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Real-time network traffic analysis and anomaly detection',
                'ML-powered attack classification (SQL Injection, XSS, CSRF, etc.)',
                'Behavioral analysis and baseline deviation detection',
                'Kill-chain attack campaign correlation and attribution',
                'Zero-day threat detection through anomaly patterns',
                'Multi-vector threat detection across network, web, and host',
                'Signature-based detection for known attack patterns',
                'Heuristic analysis for emerging threat identification',
                'DDoS attack detection and volumetric analysis',
                'Brute force and credential stuffing detection',
                'Web application vulnerability scanning and assessment',
                'File integrity monitoring and unauthorized change detection',
              ].map((rule, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 rounded-lg transition-all hover:bg-white/5"
                  style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(34,211,238,0.1)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(34,211,238,0.2)', border: '1px solid rgba(34,211,238,0.4)' }}>
                    <span className="text-xs font-bold" style={{ color: '#22D3EE' }}>{idx + 1}</span>
                  </div>
                  <span className="text-sm text-gray-300">{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Response Rules */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <Target size={24} style={{ color: '#EF4444' }} />
              </div>
              Automated Response Rules & Actions
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Automatic IP address blocking at firewall level',
                'Session termination for compromised user accounts',
                'WAF rule deployment to block attack patterns',
                'Rate limiting and traffic throttling enforcement',
                'Geo-blocking for suspicious geographical sources',
                'Incident ticket creation and priority assignment',
                'Real-time SOC team alerts via email, SMS, and dashboard',
                'Automated evidence collection and forensic logging',
                'Quarantine of compromised systems and accounts',
                'Network segmentation and isolation of affected hosts',
                'Rollback of unauthorized configuration changes',
                'Integration with SIEM for centralized response coordination',
              ].map((rule, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 rounded-lg transition-all hover:bg-white/5"
                  style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(239,68,68,0.1)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
                    <span className="text-xs font-bold" style={{ color: '#EF4444' }}>{idx + 1}</span>
                  </div>
                  <span className="text-sm text-gray-300">{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alert & Reporting Rules */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <TrendingUp size={24} style={{ color: '#F59E0B' }} />
              </div>
              Alert Classification & Reporting
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Real-time threat severity scoring (Critical, High, Medium, Low)',
                'Composite risk calculation based on threat + asset criticality',
                'Automated incident priority assignment and escalation',
                'SOC dashboard with live threat activity visualization',
                'Detailed attack timeline and kill-chain stage mapping',
                'Compliance reporting (PCI-DSS, HIPAA, ISO 27001)',
                'Executive summary reports and trend analysis',
                'Custom alerting rules and notification channels',
              ].map((rule, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 rounded-lg transition-all hover:bg-white/5"
                  style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(245,158,11,0.1)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)' }}>
                    <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>{idx + 1}</span>
                  </div>
                  <span className="text-sm text-gray-300">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Mission */}
            <div className="p-8 rounded-2xl"
              style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(34,211,238,0.2)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)' }}>
                  <Target size={24} style={{ color: '#22D3EE' }} />
                </div>
                <h2 className="text-2xl font-bold text-white">Our Mission</h2>
              </div>
              <p className="text-gray-400 leading-relaxed">
                To empower organizations with AI-powered cyber defense capabilities that detect threats 
                in milliseconds, provide actionable intelligence, and enable rapid response — turning 
                security data into decisive action before attacks cause damage.
              </p>
            </div>

            {/* Vision */}
            <div className="p-8 rounded-2xl"
              style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(34,211,238,0.2)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)' }}>
                  <TrendingUp size={24} style={{ color: '#22D3EE' }} />
                </div>
                <h2 className="text-2xl font-bold text-white">Our Vision</h2>
              </div>
              <p className="text-gray-400 leading-relaxed">
                To become Africa's leading AI-powered cybersecurity platform and expand globally, 
                protecting critical infrastructure, financial systems, and enterprises with 
                intelligence-driven defense that evolves faster than emerging threats.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 px-6" style={{ background: 'rgba(10,14,26,0.5)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-4">Core Values</h2>
            <p className="text-gray-400 text-lg">The principles that drive everything we build</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                icon: <Brain size={28} />,
                color: '#A78BFA',
                title: 'Intelligence',
                desc: 'AI-first approach to threat detection and response'
              },
              {
                icon: <Shield size={28} />,
                color: '#22D3EE',
                title: 'Security',
                desc: 'Uncompromising protection for critical systems'
              },
              {
                icon: <TrendingUp size={28} />,
                color: '#10B981',
                title: 'Innovation',
                desc: 'Continuous improvement and cutting-edge technology'
              },
              {
                icon: <Users size={28} />,
                color: '#F59E0B',
                title: 'Trust',
                desc: 'Transparency and reliability in every decision'
              },
            ].map((value, idx) => (
              <div key={idx} className="p-6 rounded-xl text-center transition-all hover:scale-105"
                style={{ background: 'rgba(17,26,42,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${value.color}15`, border: `1px solid ${value.color}40`, color: value.color }}>
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{value.title}</h3>
                <p className="text-sm text-gray-400">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why FANOS */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Why FANOS AI</h2>
            <p className="text-gray-400 text-lg">What makes us different from traditional cybersecurity</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: <Brain size={32} />,
                color: '#A78BFA',
                title: 'AI-Powered Detection',
                desc: 'XGBoost machine learning models achieve 99.84% accuracy in classifying 12+ attack types with 4.2ms latency — detecting threats traditional systems miss.',
                metrics: '99.84% Accuracy · 4.2ms Latency'
              },
              {
                icon: <TrendingUp size={32} />,
                color: '#22D3EE',
                title: 'Real-Time Intelligence',
                desc: 'Transform security events into actionable intelligence instantly. Composite risk scoring, threat correlation, and kill-chain mapping in real-time.',
                metrics: 'Sub-second Analysis'
              },
              {
                icon: <Shield size={32} />,
                color: '#10B981',
                title: 'Automated Response',
                desc: 'Detect, classify, and block threats automatically. From incident creation to IP blocking, FANOS AI responds before human analysts can react.',
                metrics: 'Millisecond Response'
              },
              {
                icon: <Globe size={32} />,
                color: '#F59E0B',
                title: 'Multi-Layer Defense',
                desc: 'Network IDS/IPS (Suricata), Web Application Firewall (ModSecurity), Host IDS (Wazuh), and AI engine — unified in one platform.',
                metrics: 'Full-Stack Protection'
              },
              {
                icon: <Lock size={32} />,
                color: '#EF4444',
                title: 'Enterprise-Grade',
                desc: 'Built for critical infrastructure: banks, telecoms, government, and enterprise. SOC-ready dashboards, compliance reporting, and audit trails.',
                metrics: 'Production-Ready'
              },
              {
                icon: <Award size={32} />,
                color: '#06B6D4',
                title: 'African Innovation',
                desc: 'Designed and engineered in Africa, for Africa and the world. Understanding unique regional threats while meeting global security standards.',
                metrics: 'Global Standards'
              },
            ].map((item, idx) => (
              <div key={idx} className="p-8 rounded-2xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}15`, border: `1px solid ${item.color}40`, color: item.color }}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: `${item.color}20`, color: item.color }}>
                      {item.metrics}
                    </div>
                  </div>
                </div>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-20 px-6" style={{ background: 'rgba(10,14,26,0.5)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Our Technology</h2>
            <p className="text-gray-400 text-lg">Enterprise-grade security infrastructure powered by AI</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'AI & Machine Learning',
                items: ['XGBoost 3.4.1', 'Neural Architecture Search', 'Feature Engineering', 'Model Registry']
              },
              {
                title: 'Security Stack',
                items: ['Suricata IDS/IPS', 'ModSecurity WAF', 'Wazuh HIDS', 'Custom Detection']
              },
              {
                title: 'Platform',
                items: ['Python FastAPI', 'React + TypeScript', 'PostgreSQL', 'Docker + Kubernetes']
              },
            ].map((stack, idx) => (
              <div key={idx} className="p-6 rounded-xl"
                style={{ background: 'rgba(17,26,42,0.8)', border: '1px solid rgba(34,211,238,0.2)' }}>
                <h3 className="text-lg font-bold text-white mb-4">{stack.title}</h3>
                <ul className="space-y-2">
                  {stack.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(14,165,233,0.1) 100%)', border: '1px solid rgba(34,211,238,0.3)' }}>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/30 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                Ready to Transform Your Cyber Defense?
              </h2>
              <p className="text-lg text-gray-400 mb-8">
                Join leading organizations protecting critical infrastructure with FANOS AI
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button 
                  onClick={() => navigate('/home#contact')}
                  className="px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #0891b2 100%)', boxShadow: '0 8px 30px rgba(34,211,238,0.4)' }}>
                  Request a Demo
                </button>
                <button 
                  onClick={() => navigate('/home#contact')}
                  className="px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:bg-white/10"
                  style={{ border: '2px solid rgba(34,211,238,0.5)', background: 'rgba(34,211,238,0.05)' }}>
                  Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
