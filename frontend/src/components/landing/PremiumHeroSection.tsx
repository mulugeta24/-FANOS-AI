export default function PremiumHeroSection() {
  return (
    <section 
      className="relative w-full overflow-hidden"
      style={{ 
        minHeight: 'calc(100vh - 64px)',
        background: '#0A0E1A',
      }}>

      {/* Main Content Container */}
      <div className="relative z-10 px-8 md:px-16 lg:px-24 py-20 md:py-32">
        <div className="max-w-7xl mx-auto">
          
          {/* Main Tagline */}
          <h2 
            className="text-2xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight transition-all duration-700"
            style={{ 
              color: '#E2E8F0',
              textShadow: '0 2px 16px rgba(0,0,0,0.5)',
              animation: 'fadeSlideUp 1s ease-out 0.2s both',
              letterSpacing: '-0.01em',
            }}>
            See Beyond the Threat.<br />
            <span style={{ color: '#06B6D4' }}>Defend with Intelligence.</span>
          </h2>

          {/* Description */}
          <p 
            className="text-base md:text-xl lg:text-2xl mb-8 leading-relaxed max-w-4xl transition-all duration-700"
            style={{ 
              color: '#CBD5E1',
              textShadow: '0 2px 12px rgba(0,0,0,0.7)',
              animation: 'fadeSlideUp 1s ease-out 0.4s both',
              lineHeight: '1.7',
            }}>
            A next-generation <strong style={{ color: '#06B6D4', fontWeight: 700 }}>AI-powered cyber defense platform</strong> engineered to turn complex security signals into clear, actionable intelligence.
          </p>

          {/* Feature Pills */}
          <div 
            className="flex flex-wrap gap-3 mb-12 transition-all duration-700"
            style={{ animation: 'fadeSlideUp 1s ease-out 0.6s both' }}>
            {[
              'Real-Time Detection',
              'AI-Powered Analysis',
              'Risk Intelligence',
              'Rapid Response'
            ].map((feature, i) => (
              <div 
                key={i}
                className="px-5 py-2.5 rounded-lg backdrop-blur-md border font-semibold text-sm md:text-base transition-all duration-300 hover:scale-105"
                style={{
                  background: 'rgba(6,182,212,0.08)',
                  borderColor: 'rgba(6,182,212,0.25)',
                  color: '#06B6D4',
                  boxShadow: '0 0 20px rgba(6,182,212,0.15)',
                }}>
                {feature}
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div 
            className="flex flex-wrap gap-5 mb-16 transition-all duration-700"
            style={{ animation: 'fadeSlideUp 1s ease-out 0.8s both' }}>
            <button 
              className="group px-10 py-5 rounded-xl text-base md:text-lg font-bold transition-all duration-300 backdrop-blur-sm shadow-2xl"
              style={{ 
                background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                color: '#0A0E1A',
                boxShadow: '0 8px 32px rgba(6,182,212,0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 48px rgba(6,182,212,0.6)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(6,182,212,0.4)'
              }}>
              Request Service
            </button>
            
            <button 
              className="group px-10 py-5 rounded-xl text-base md:text-lg font-bold transition-all duration-300 backdrop-blur-xl border shadow-xl"
              style={{ 
                background: 'rgba(16,24,40,0.5)',
                color: '#F8FAFC',
                borderColor: 'rgba(248,250,252,0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(6,182,212,0.15)'
                e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)'
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(6,182,212,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(16,24,40,0.5)'
                e.currentTarget.style.borderColor = 'rgba(248,250,252,0.2)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
              }}>
              Explore Platform →
            </button>
          </div>

          {/* Stats Grid */}
          <div 
            className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-6xl transition-all duration-700"
            style={{ animation: 'fadeSlideUp 1s ease-out 1s both' }}>
            {[
              { value: '99.84%', label: 'AI Accuracy', color: '#06B6D4' },
              { value: '4.2ms', label: 'Response Time', color: '#10B981' },
              { value: '15+', label: 'Attack Types', color: '#F59E0B' },
              { value: '2481/s', label: 'Predictions', color: '#8B5CF6' },
            ].map((stat, i) => (
              <div 
                key={i}
                className="group backdrop-blur-xl p-6 rounded-2xl border transition-all duration-300 hover:scale-105"
                style={{
                  background: 'rgba(16,24,40,0.6)',
                  borderColor: 'rgba(248,250,252,0.1)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                }}>
                <div 
                  className="text-4xl md:text-5xl font-black mb-2 transition-all duration-300"
                  style={{ 
                    color: stat.color,
                    textShadow: `0 0 32px ${stat.color}40`,
                  }}>
                  {stat.value}
                </div>
                <div 
                  className="text-xs md:text-sm uppercase tracking-widest font-bold"
                  style={{ color: '#94A3B8', letterSpacing: '0.1em' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Powerful Tagline */}
          <div 
            className="mt-16 text-center transition-all duration-700"
            style={{ animation: 'fadeSlideUp 1s ease-out 1.2s both' }}>
            <h3 
              className="text-xl md:text-3xl lg:text-4xl font-extrabold leading-tight"
              style={{ 
                color: '#E2E8F0',
                textShadow: '0 2px 16px rgba(0,0,0,0.6)',
              }}>
              <span style={{ color: '#06B6D4' }}>Illuminate</span> Hidden Threats.{' '}
              <span style={{ color: '#06B6D4' }}>Empower</span> Intelligent Defense.
            </h3>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div 
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 transition-all duration-700"
        style={{ animation: 'fadeIn 1s ease-out 1.6s both' }}>
        <span 
          className="text-xs md:text-sm uppercase tracking-widest font-bold"
          style={{ color: '#64748B', letterSpacing: '0.15em' }}>
          Scroll to Explore
        </span>
        <div 
          className="w-1 h-12 rounded-full"
          style={{ 
            background: 'linear-gradient(to bottom, rgba(6,182,212,0.6), transparent)',
            animation: 'scrollPulse 2s ease-in-out infinite',
          }} 
        />
      </div>

      <style>{`
        @keyframes fadeSlideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }

        @keyframes scrollPulse {
          0%, 100% {
            opacity: 0.4;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(8px);
          }
        }
      `}</style>
    </section>
  )
}
