import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Shield, Lock, Terminal, Network, ExternalLink, Clock, Tag } from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav'
import LandingFooter from '@/components/landing/LandingFooter'

type GuideCategory = 'all' | 'escalation' | 'web' | 'network' | 'red-team'

interface SecurityGuide {
  id: string
  title: string
  category: string
  categoryColor: string
  description: string
  updated: string
  author: string
  readTime: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  tags: string[]
}

const guides: SecurityGuide[] = [
  {
    id: '1',
    title: 'Linux Privilege Escalation Methodology & Cheatsheet',
    category: 'PRIVILEGE ESCALATION',
    categoryColor: '#8b5cf6',
    description: 'Comprehensive step-by-step checklist for identifying Linux misconfigurations: SUID/SGID abuse, sudo privilege checks, capability enumeration, NFS exports, and kernel exploits. Includes automated enumeration scripts and manual verification techniques.',
    updated: '2026',
    author: 'FANOS S&C Offensive Ops',
    readTime: '25 min read',
    difficulty: 'Advanced',
    tags: ['Linux', 'Privilege Escalation', 'SUID', 'Kernel Exploits', 'Post-Exploitation']
  },
  {
    id: '2',
    title: 'SQL Injection: From Manual Exploitation to Automated Remediation',
    category: 'WEB SECURITY',
    categoryColor: '#22d3ee',
    description: 'Deep-dive guide into Union-based, Error-based, Blind, and Time-based SQL injections, parameterized queries, and defensive ORM best practices. Includes detection techniques, exploitation workflows, and secure coding patterns.',
    updated: '2026',
    author: 'FANOS S&C Web Research',
    readTime: '30 min read',
    difficulty: 'Intermediate',
    tags: ['SQL Injection', 'Web Security', 'Database', 'OWASP Top 10', 'Secure Coding']
  },
  {
    id: '3',
    title: 'Active Directory Attack Playbook: Kerberoasting & DCSync',
    category: 'RED TEAMING',
    categoryColor: '#ef4444',
    description: 'Tactical reference for extracting service account Kerberos tickets, offline hash cracking, Pass-the-Ticket, and performing DCSync user account replication. Covers reconnaissance, exploitation, persistence, and defensive countermeasures.',
    updated: '2026',
    author: 'FANOS S&C Offensive Ops',
    readTime: '35 min read',
    difficulty: 'Expert',
    tags: ['Active Directory', 'Kerberos', 'DCSync', 'Pass-the-Ticket', 'Domain Persistence']
  },
  {
    id: '4',
    title: 'Wireshark Network Forensics & Protocol Anomaly Detection',
    category: 'NETWORK FORENSICS',
    categoryColor: '#10b981',
    description: 'Practical filter cheat sheet for isolating suspicious beaconing, unencrypted credentials, DNS tunneling, and HTTP payload reconstructions. Includes capture file analysis workflows and threat hunting techniques.',
    updated: '2026',
    author: 'FANOS S&C Network Team',
    readTime: '28 min read',
    difficulty: 'Intermediate',
    tags: ['Wireshark', 'Network Analysis', 'Packet Capture', 'Protocol Analysis', 'Threat Hunting']
  },
  {
    id: '5',
    title: 'Container Security: Docker & Kubernetes Hardening Guide',
    category: 'CLOUD SECURITY',
    categoryColor: '#f59e0b',
    description: 'Comprehensive guide to securing containerized environments: image scanning, runtime protection, network policies, secrets management, and admission controllers. Covers both Docker and Kubernetes security best practices.',
    updated: '2026',
    author: 'FANOS S&C Cloud Security',
    readTime: '32 min read',
    difficulty: 'Advanced',
    tags: ['Docker', 'Kubernetes', 'Container Security', 'Cloud Native', 'DevSecOps']
  },
  {
    id: '6',
    title: 'Advanced Threat Hunting: EDR Bypass & Living-off-the-Land',
    category: 'RED TEAMING',
    categoryColor: '#ef4444',
    description: 'Modern adversary tactics using native Windows binaries, fileless malware, process injection, and EDR evasion techniques. Includes defensive detection strategies and behavioral analysis patterns.',
    updated: '2026',
    author: 'FANOS S&C Red Team',
    readTime: '40 min read',
    difficulty: 'Expert',
    tags: ['EDR Bypass', 'LOLBAS', 'Process Injection', 'Threat Hunting', 'Advanced Persistent Threats']
  },
  {
    id: '7',
    title: 'AWS Security Audit: IAM Policies & S3 Bucket Misconfiguration',
    category: 'CLOUD SECURITY',
    categoryColor: '#f59e0b',
    description: 'Step-by-step AWS security assessment covering IAM role analysis, overly permissive policies, public S3 buckets, unencrypted RDS instances, and VPC misconfigurations. Includes automated scanning tools and remediation scripts.',
    updated: '2026',
    author: 'FANOS S&C Cloud Security',
    readTime: '27 min read',
    difficulty: 'Intermediate',
    tags: ['AWS', 'Cloud Security', 'IAM', 'S3', 'Security Audit']
  },
  {
    id: '8',
    title: 'Zero Trust Architecture: Implementation & Best Practices',
    category: 'NETWORK SECURITY',
    categoryColor: '#10b981',
    description: 'Complete guide to implementing Zero Trust principles: micro-segmentation, identity-based access, continuous verification, and least privilege. Covers architecture design, policy enforcement, and monitoring strategies.',
    updated: '2026',
    author: 'FANOS S&C Architecture Team',
    readTime: '45 min read',
    difficulty: 'Advanced',
    tags: ['Zero Trust', 'Network Security', 'Architecture', 'Access Control', 'Identity Management']
  },
  {
    id: '9',
    title: 'Web Application Penetration Testing: Complete OWASP Methodology',
    category: 'WEB SECURITY',
    categoryColor: '#22d3ee',
    description: 'Comprehensive web app security testing methodology covering OWASP Top 10, authentication bypass, session management flaws, business logic vulnerabilities, and API security. Includes automated scanning and manual testing techniques.',
    updated: '2026',
    author: 'FANOS S&C Web Research',
    readTime: '38 min read',
    difficulty: 'Advanced',
    tags: ['Web Security', 'Penetration Testing', 'OWASP', 'API Security', 'Authentication']
  },
  {
    id: '10',
    title: 'Incident Response Playbook: Ransomware Detection & Containment',
    category: 'INCIDENT RESPONSE',
    categoryColor: '#a78bfa',
    description: 'Tactical incident response guide for ransomware attacks: early indicators, containment procedures, forensic collection, backup recovery, and post-incident hardening. Includes communication templates and legal considerations.',
    updated: '2026',
    author: 'FANOS S&C IR Team',
    readTime: '35 min read',
    difficulty: 'Advanced',
    tags: ['Incident Response', 'Ransomware', 'Forensics', 'Containment', 'Recovery']
  },
  {
    id: '11',
    title: 'API Security: REST & GraphQL Vulnerability Assessment',
    category: 'WEB SECURITY',
    categoryColor: '#22d3ee',
    description: 'Modern API security testing covering authentication flaws, authorization bypass, rate limiting, injection attacks, and GraphQL-specific vulnerabilities. Includes automated tools and manual testing workflows.',
    updated: '2026',
    author: 'FANOS S&C Web Research',
    readTime: '30 min read',
    difficulty: 'Intermediate',
    tags: ['API Security', 'REST', 'GraphQL', 'Authentication', 'Authorization']
  },
  {
    id: '12',
    title: 'Memory Forensics: Analyzing Malware with Volatility Framework',
    category: 'FORENSICS',
    categoryColor: '#ec4899',
    description: 'Advanced memory analysis techniques for malware investigation: process injection detection, hidden processes, network connections, and credential extraction. Covers Volatility plugins and analysis workflows.',
    updated: '2026',
    author: 'FANOS S&C Forensics Team',
    readTime: '42 min read',
    difficulty: 'Expert',
    tags: ['Memory Forensics', 'Malware Analysis', 'Volatility', 'Digital Forensics', 'Threat Analysis']
  },
]

const categories = [
  { id: 'all' as const, label: 'All Guides', icon: BookOpen, color: '#22d3ee' },
  { id: 'escalation' as const, label: 'Privilege Escalation', icon: Lock, color: '#8b5cf6' },
  { id: 'web' as const, label: 'Web Security', icon: Shield, color: '#22d3ee' },
  { id: 'network' as const, label: 'Network & Forensics', icon: Network, color: '#10b981' },
  { id: 'red-team' as const, label: 'Red Team & Offensive', icon: Terminal, color: '#ef4444' },
]

export default function SecurityGuidesPage() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState<GuideCategory>('all')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const filteredGuides = activeCategory === 'all' 
    ? guides 
    : guides.filter(g => {
        if (activeCategory === 'escalation') return g.category.includes('ESCALATION')
        if (activeCategory === 'web') return g.category.includes('WEB')
        if (activeCategory === 'network') return g.category.includes('NETWORK') || g.category.includes('FORENSICS')
        if (activeCategory === 'red-team') return g.category.includes('RED TEAM')
        return true
      })

  return (
    <div style={{ background: '#080C14', minHeight: '100vh' }}>
      <LandingNav />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' }}>
            <BookOpen size={16} style={{ color: '#22D3EE' }} />
            <span className="text-sm font-semibold" style={{ color: '#22D3EE' }}>Security Guides & Research</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            Professional Security{' '}
            <span style={{ 
              background: 'linear-gradient(135deg, #22D3EE 0%, #8B5CF6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Guides & Methodologies
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
            Comprehensive security research, penetration testing methodologies, and defensive best practices 
            from the FANOS AI Security & Research team. Updated regularly with the latest attack vectors and defensive techniques.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                  style={{
                    background: isActive ? `${cat.color}15` : 'rgba(17,26,42,0.6)',
                    border: isActive ? `2px solid ${cat.color}` : '1px solid rgba(255,255,255,0.1)',
                    color: isActive ? cat.color : '#9CA3AF',
                  }}
                >
                  <Icon size={18} />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Guides Grid */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {filteredGuides.map((guide) => (
              <div
                key={guide.id}
                className="p-6 rounded-2xl transition-all hover:scale-[1.02] cursor-pointer group"
                style={{ background: 'rgba(17,26,42,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={() => navigate('/contact')}
              >
                {/* Category Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4"
                  style={{ background: `${guide.categoryColor}15`, border: `1px solid ${guide.categoryColor}40` }}>
                  <Tag size={14} style={{ color: guide.categoryColor }} />
                  <span className="text-xs font-bold tracking-wider" style={{ color: guide.categoryColor }}>
                    {guide.category}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors leading-tight">
                  {guide.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  {guide.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {guide.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium px-2 py-1 rounded"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#9CA3AF' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Meta Info */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {guide.readTime}
                    </span>
                    <span className="px-2 py-1 rounded" style={{ background: 'rgba(34,211,238,0.1)', color: '#22D3EE' }}>
                      {guide.difficulty}
                    </span>
                  </div>
                  <button className="flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
                    Read Guide
                    <ExternalLink size={14} />
                  </button>
                </div>

                {/* Author & Date */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <span className="text-xs text-gray-500">By {guide.author}</span>
                  <span className="text-xs text-gray-600">Updated {guide.updated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto text-center">
          <div className="p-12 rounded-3xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(34,211,238,0.3)' }}>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/30 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                Need Custom Security Research?
              </h2>
              <p className="text-lg text-gray-400 mb-8 max-w-3xl mx-auto">
                Our security research team provides custom threat intelligence, penetration testing methodologies, 
                and security assessments tailored to your organization's needs.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button 
                  onClick={() => navigate('/contact')}
                  className="px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #06B6D4 100%)', boxShadow: '0 8px 30px rgba(34,211,238,0.4)' }}>
                  Contact Research Team
                </button>
                <button 
                  onClick={() => navigate('/intelligence')}
                  className="px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:bg-white/10"
                  style={{ border: '2px solid rgba(34,211,238,0.5)', background: 'rgba(34,211,238,0.05)' }}>
                  Explore AI Platform
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
