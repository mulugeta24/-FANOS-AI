import { useState, useEffect } from 'react'

// Cybersecurity images - full page backgrounds
const HERO_SLIDES = [
  {
    url: 'https://codearies.com/wp-content/uploads/2024/07/AI-in-Cybersecurity-Advanced-Threat-Detection-and-Automated-Response-1024x576.png',
    title: 'Welcome to FANOS AI',
    subtitle: 'Advanced Threat Detection',
    description: 'AI-Powered real-time intrusion detection that identifies threats before they become incidents'
  },
  {
    url: 'https://www.blockchain-council.org/wp-content/uploads/2024/11/How-AI-is-Improving-Cybersecurity-with-Real-Time-Threat-Detection-_2_.webp',
    title: 'Real-Time Protection',
    subtitle: 'Instant Threat Response',
    description: 'XGBoost V3 AI engine analyzes network traffic in real-time with 99.84% accuracy'
  },
  {
    url: 'https://hodeitek.com/wp-content/uploads/2025/09/automating-alert-triage.png',
    title: 'Automated Defense',
    subtitle: 'Smart Alert Triage',
    description: 'Intelligent automation blocks threats, isolates incidents, and prevents attacks automatically'
  },
  {
    url: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/sites/104576/images/150dc0f-6471-25ca-edcb-78f3e32a7c_2da56203-7191-41eb-9416-cb61fc481726.jpeg',
    title: 'Next-Gen Security',
    subtitle: 'AI-Driven Defense',
    description: '15 attack classes detected, 2481 predictions per second, protecting your entire infrastructure'
  }
]

export default function FullPageHero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Auto-advance slides every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      handleNext()
    }, 6000)
    return () => clearInterval(timer)
  }, [currentSlide])

  const handleNext = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)
      setIsAnimating(false)
    }, 800)
  }

  const handlePrev = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
      setIsAnimating(false)
    }, 800)
  }

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentSlide) return
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentSlide(index)
      setIsAnimating(false)
    }, 800)
  }

  const slide = HERO_SLIDES[currentSlide]

  return (
    <section className="relative w-full h-screen overflow-hidden"
      style={{ 
        background: '#000',
        marginTop: -64 // Offset the navbar height
      }}>

      {/* Full-page background images with Ken Burns effect */}
      {HERO_SLIDES.map((s, idx) => (
        <div
          key={idx}
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{
            opacity: idx === currentSlide ? 1 : 0,
            transform: idx === currentSlide 
              ? 'scale(1.05)' 
              : 'scale(1.1)',
            zIndex: idx === currentSlide ? 1 : 0,
          }}>
          <div className="absolute inset-0"
            style={{
              backgroundImage: `url("${s.url}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              animation: idx === currentSlide ? 'kenBurns 20s ease-in-out infinite alternate' : 'none',
            }} />
          
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(8,12,20,0.65) 50%, rgba(0,0,0,0.8) 100%)',
            }} />
        </div>
      ))}

      {/* Content overlay - centered */}
      <div className="relative z-10 flex items-center justify-center h-full px-8 md:px-16">
        <div className="max-w-5xl w-full text-center">
          
          {/* AI Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 backdrop-blur-md"
            style={{ 
              background: 'rgba(34,211,238,0.12)', 
              border: '1px solid rgba(34,211,238,0.3)',
              animation: 'fadeInUp 0.8s ease-out'
            }}>
            <span className="w-2 h-2 rounded-full"
              style={{ 
                background: '#22D3EE',
                boxShadow: '0 0 12px rgba(34,211,238,0.8)',
                animation: 'pulse 2s ease-in-out infinite'
              }} />
            <span className="text-xs font-bold tracking-wider uppercase" 
              style={{ color: '#22D3EE' }}>
              AI-POWERED CYBER DEFENSE PLATFORM
            </span>
          </div>

          {/* Main Title - Animated */}
          <h1 
            key={`title-${currentSlide}`}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white mb-4 leading-tight"
            style={{ 
              animation: 'fadeInUp 1s ease-out 0.2s both',
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}>
            {slide.title.split(' ').map((word, i) => (
              <span key={i}>
                {word === 'FANOS' || word === 'AI' ? (
                  <span style={{ 
                    background: 'linear-gradient(135deg, #22D3EE, #3B82F6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    {word}
                  </span>
                ) : word}{' '}
              </span>
            ))}
          </h1>

          {/* Subtitle */}
          <h2 
            key={`subtitle-${currentSlide}`}
            className="text-2xl md:text-4xl font-bold mb-6"
            style={{ 
              color: '#22D3EE',
              animation: 'fadeInUp 1s ease-out 0.4s both',
              textShadow: '0 2px 10px rgba(34,211,238,0.5)',
            }}>
            {slide.subtitle}
          </h2>

          {/* Description */}
          <p 
            key={`desc-${currentSlide}`}
            className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed"
            style={{ 
              animation: 'fadeInUp 1s ease-out 0.6s both',
              textShadow: '0 2px 8px rgba(0,0,0,0.7)',
            }}>
            {slide.description}
          </p>

          {/* CTA Buttons */}
          <div 
            className="flex gap-4 justify-center flex-wrap mb-12"
            style={{ animation: 'fadeInUp 1s ease-out 0.8s both' }}>
            <button 
              className="px-10 py-4 rounded-xl text-base font-bold text-black transition-all duration-300 backdrop-blur-sm"
              style={{ 
                background: 'linear-gradient(135deg, #22D3EE, #0891b2)',
                boxShadow: '0 0 40px rgba(34,211,238,0.5)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 50px rgba(34,211,238,0.7)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 0 40px rgba(34,211,238,0.5)'
              }}>
              Request Service
            </button>
            
            <button 
              className="px-10 py-4 rounded-xl text-base font-bold text-white transition-all duration-300 backdrop-blur-md"
              style={{ 
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(34,211,238,0.15)'
                e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)'
                e.currentTarget.style.transform = 'translateY(-4px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}>
              Explore Platform →
            </button>
          </div>

          {/* Stats - Quick Facts */}
          <div 
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            style={{ animation: 'fadeInUp 1s ease-out 1s both' }}>
            {[
              { value: '99.84%', label: 'AI Accuracy' },
              { value: '4.2ms', label: 'Response Time' },
              { value: '15+', label: 'Attack Types' },
              { value: '2481/s', label: 'Predictions' },
            ].map((stat, i) => (
              <div 
                key={i} 
                className="backdrop-blur-md p-4 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(34,211,238,0.2)',
                }}>
                <div className="text-3xl font-extrabold mb-1" 
                  style={{ color: '#22D3EE' }}>
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full backdrop-blur-md transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(34,211,238,0.2)'
          e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
        }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        onClick={handleNext}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full backdrop-blur-md transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(34,211,238,0.2)'
          e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
        }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goToSlide(idx)}
            className="transition-all duration-300 rounded-full backdrop-blur-sm"
            style={{
              width: idx === currentSlide ? '48px' : '12px',
              height: '12px',
              background: idx === currentSlide 
                ? 'linear-gradient(90deg, #22D3EE, #0891b2)' 
                : 'rgba(255,255,255,0.3)',
              boxShadow: idx === currentSlide ? '0 0 20px rgba(34,211,238,0.6)' : 'none',
            }}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        style={{ animation: 'bounce 2s ease-in-out infinite' }}>
        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
          Scroll to Explore
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(34,211,238,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes kenBurns {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.15);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          50% {
            transform: translateX(-50%) translateY(-10px);
          }
        }
      `}</style>
    </section>
  )
}
