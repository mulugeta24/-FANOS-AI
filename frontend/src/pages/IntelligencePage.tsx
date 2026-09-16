import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Zap, Target, TrendingUp, Network, BarChart3, Activity, Eye, Shield, Layers, CheckCircle2 } from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav'
import LandingFooter from '@/components/landing/LandingFooter'

export default function IntelligencePage() {
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
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)' }}>
            <Brain size={14} style={{ color: '#A78BFA' }} />
            <span className="text-sm font-semibold" style={{ color: '#A78BFA' }}>FANOS AI Intelligence</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            The World's Most Advanced{' '}
            <span style={{ 
              background: 'linear-gradient(135deg, #A78BFA 0%, #22D3EE 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              AI Cyber Defense Platform
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
            FANOS AI combines cutting-edge machine learning with real-time security intelligence 
            to detect, analyze, and respond to cyber threats faster than any human analyst — with 
            99.84% accuracy and 4.2ms response time.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/contact')}
              className="px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)', boxShadow: '0 8px 30px rgba(167,139,250,0.4)' }}>
              Request Intelligence Demo
            </button>
            <button 
              onClick={() => navigate('/home')}
              className="px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:bg-white/10"
              style={{ border: '2px solid rgba(167,139,250,0.5)', background: 'rgba(167,139,250,0.05)' }}>
              Explore Platform
            </button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 px-6" style={{ background: 'rgba(10,14,26,0.5)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { value: '99.84%', label: 'AI Accuracy', desc: 'Attack Classification', color: '#A78BFA' },
              { value: '4.2ms', label: 'Response Time', desc: 'Detection Latency', color: '#22D3EE' },
              { value: '15+', label: 'Attack Classes', desc: 'Threat Categories', color: '#10B981' },
              { value: '2,481/s', label: 'Predictions', desc: 'Real-Time Processing', color: '#F59E0B' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-6 rounded-xl transition-all hover:scale-105"
                style={{ background: 'rgba(17,26,42,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="text-4xl font-black mb-2" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-base font-bold text-white mb-1">{stat.label}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FANOS AI Engine */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">FANOS AI Engine</h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Our next-generation XGBoost threat detection engine represents the future of cyber defense — 
              combining advanced machine learning with security domain expertise.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: <Brain size={32} />,
                color: '#A78BFA',
                title: 'XGBoost Detection Engine',
                desc: 'State-of-the-art gradient boosting algorithm trained on millions of attack patterns. Achieves 99.84% accuracy across 15 attack categories including SQL Injection, XSS, DDoS, Brute Force, and more.',
                features: ['99.84% Accuracy', '4.2ms Latency', '15 Attack Classes', 'Real-Time Inference']
              },
              {
                icon: <TrendingUp size={32} />,
                color: '#22D3EE',
                title: 'Behavioral Analysis',
                desc: 'Advanced anomaly detection system that learns normal behavior patterns and identifies deviations. Detects zero-day attacks and novel threat vectors that signature-based systems miss.',
                features: ['Anomaly Detection', 'Pattern Recognition', 'Baseline Learning', 'Drift Detection']
              },
              {
                icon: <Target size={32} />,
                color: '#10B981',
                title: 'Confidence Scoring',
                desc: 'Every prediction includes confidence analysis and explainable AI features. Security teams understand not just what was detected, but why — enabling informed response decisions.',
                features: ['Per-Prediction Scores', 'Explainable AI', 'Feature Importance', 'Decision Transparency']
              },
              {
                icon: <Activity size={32} />,
                color: '#F59E0B',
                title: 'Model Performance',
                desc: 'Continuous model evaluation and drift detection ensure sustained accuracy. Automated retraining pipelines and A/B testing framework maintain peak performance over time.',
                features: ['Continuous Evaluation', 'Drift Detection', 'Auto Retraining', 'Version Control']
              },
            ].map((item, idx) => (
              <div key={idx} className="p-8 rounded-2xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}15`, border: `1px solid ${item.color}40`, color: item.color }}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  </div>
                </div>
                <p className="text-gray-400 leading-relaxed mb-4">{item.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {item.features.map((feature, i) => (
                    <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ background: `${item.color}20`, color: item.color }}>
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Intelligence */}
      <section className="py-20 px-6" style={{ background: 'rgba(10,14,26,0.5)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Security Intelligence</h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Transform raw security events into actionable intelligence. FANOS AI correlates threats, 
              calculates risk, and provides the context security teams need to make fast, informed decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap size={28} />,
                color: '#EF4444',
                title: 'Threat Detection',
                desc: 'Real-time multi-layer detection across network (Suricata), web (ModSecurity WAF), and host (Wazuh) data sources.',
                metrics: 'Multi-Vector Detection'
              },
              {
                icon: <BarChart3 size={28} />,
                color: '#22D3EE',
                title: 'Risk Scoring',
                desc: 'Composite 0–100 risk calculation engine that combines threat severity, asset criticality, and attack confidence.',
                metrics: 'Composite Risk Engine'
              },
              {
                icon: <Network size={28} />,
                color: '#A78BFA',
                title: 'Threat Correlation',
                desc: 'AI-powered correlation engine links related events into attack campaigns with kill-chain stage mapping.',
                metrics: 'Kill-Chain Mapping'
              },
              {
                icon: <TrendingUp size={28} />,
                color: '#10B981',
                title: 'Security Analytics',
                desc: 'Advanced analytics including MTTR metrics, detection coverage analysis, trend visualization, and forecasting.',
                metrics: 'Trend Analysis'
              },
              {
                icon: <Eye size={28} />,
                color: '#F59E0B',
                title: 'Attack Intelligence',
                desc: 'Deep pattern analysis, threat actor profiling, campaign tracking, and attribution across attack vectors.',
                metrics: 'Campaign Tracking'
              },
              {
                icon: <Shield size={28} />,
                color: '#06B6D4',
                title: 'Threat Hunting',
                desc: 'Proactive threat hunting capabilities with hypothesis-driven investigation and IoC enrichment.',
                metrics: 'Proactive Defense'
              },
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-xl transition-all hover:scale-105"
                style={{ background: 'rgba(17,26,42,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}15`, border: `1px solid ${item.color}40`, color: item.color }}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                    <div className="text-xs font-semibold px-2 py-0.5 rounded inline-block"
                      style={{ background: `${item.color}20`, color: item.color }}>
                      {item.metrics}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Architecture */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Intelligence Architecture</h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Built on enterprise-grade infrastructure designed for scale, reliability, and security.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Left - AI Stack */}
            <div className="p-8 rounded-2xl"
              style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}>
                  <Brain size={24} style={{ color: '#A78BFA' }} />
                </div>
                <h3 className="text-2xl font-bold text-white">AI & Machine Learning</h3>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'XGBoost 3.4.1', desc: 'Core detection engine' },
                  { name: 'Scikit-learn', desc: 'Preprocessing & feature engineering' },
                  { name: 'SHAP', desc: 'Explainable AI & interpretability' },
                  { name: 'MLflow', desc: 'Model versioning & registry' },
                  { name: 'Neural Architecture Search', desc: 'Automated model optimization' },
                  { name: 'Feature Store', desc: 'Centralized feature management' },
                ].map((tech, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg transition-all hover:bg-white/5">
                    <CheckCircle2 size={18} style={{ color: '#A78BFA', marginTop: 2 }} />
                    <div>
                      <div className="text-sm font-semibold text-white">{tech.name}</div>
                      <div className="text-xs text-gray-500">{tech.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Security Stack */}
            <div className="p-8 rounded-2xl"
              style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(34,211,238,0.2)' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)' }}>
                  <Layers size={24} style={{ color: '#22D3EE' }} />
                </div>
                <h3 className="text-2xl font-bold text-white">Security Intelligence Stack</h3>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Suricata IDS/IPS', desc: 'Network traffic analysis' },
                  { name: 'ModSecurity WAF', desc: 'Web application protection' },
                  { name: 'Wazuh HIDS', desc: 'Host-based intrusion detection' },
                  { name: 'Custom Correlation Engine', desc: 'AI-powered event linking' },
                  { name: 'Risk Scoring Engine', desc: 'Composite threat assessment' },
                  { name: 'Threat Intelligence Feeds', desc: 'Global threat context' },
                ].map((tech, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg transition-all hover:bg-white/5">
                    <CheckCircle2 size={18} style={{ color: '#22D3EE', marginTop: 2 }} />
                    <div>
                      <div className="text-sm font-semibold text-white">{tech.name}</div>
                      <div className="text-xs text-gray-500">{tech.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Capabilities */}
      <section className="py-20 px-6" style={{ background: 'rgba(10,14,26,0.5)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Enterprise Intelligence Capabilities</h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Everything security teams need to stay ahead of evolving cyber threats.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Real-Time Threat Detection',
              'AI-Powered Classification',
              'Behavioral Anomaly Detection',
              'Kill-Chain Correlation',
              'Composite Risk Scoring',
              'Threat Campaign Attribution',
              'Automated Response Actions',
              'Security Analytics Dashboard',
              'Threat Intelligence Integration',
              'Custom Detection Rules',
              'SOC Workflow Automation',
              'Compliance Reporting',
              'API-First Architecture',
              'Multi-Tenant Support',
              'Role-Based Access Control',
              'Audit Trail & Forensics',
              'Performance Monitoring',
              'Scalable Infrastructure',
            ].map((capability, idx) => (
              <div key={idx} className="flex items-center gap-3 p-4 rounded-lg transition-all hover:bg-white/5"
                style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#22D3EE' }} />
                <span className="text-sm font-semibold text-white">{capability}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="p-12 rounded-3xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.1) 0%, rgba(34,211,238,0.1) 100%)', border: '1px solid rgba(167,139,250,0.3)' }}>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/30 rounded-full blur-3xl" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                Experience AI-Powered Cyber Defense
              </h2>
              <p className="text-lg text-gray-400 mb-8 max-w-3xl mx-auto">
                See how FANOS AI Intelligence can transform your security operations. 
                Request a personalized demo from our team.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button 
                  onClick={() => navigate('/contact')}
                  className="px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)', boxShadow: '0 8px 30px rgba(167,139,250,0.4)' }}>
                  Request Intelligence Demo
                </button>
                <button 
                  onClick={() => navigate('/about')}
                  className="px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:bg-white/10"
                  style={{ border: '2px solid rgba(167,139,250,0.5)', background: 'rgba(167,139,250,0.05)' }}>
                  Learn More About FANOS AI
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
