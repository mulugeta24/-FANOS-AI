import { useState, useEffect } from 'react'

// 5 Professional cybersecurity images (verified working URLs)
const HERO_SLIDES = [
  {
    url: 'https://asimily.com/wp-content/uploads/2023/09/IoT-Security-Powered-with-AI-Asimily-png.png',
    title: 'AI-Powered IoT Security'
  },
  {
    url: 'https://www.blockchain-council.org/wp-content/uploads/2024/11/How-AI-is-Improving-Cybersecurity-with-Real-Time-Threat-Detection-_2_.webp',
    title: 'Real-Time Protection'
  },
  {
    url: 'https://thumbs.dreamstime.com/b/ai-assisted-cybersecurity-threat-detection-alert-system-vouch-ai-identifies-cybersecurity-threat-breach-protecting-data-416201720.jpg',
    title: 'Threat Detection System'
  },
  {
    url: 'https://img.freepik.com/premium-photo/ai-robot-using-cyber-security-protect-information-privacy_31965-11705.jpg',
    title: 'AI-Powered Defense'
  },
  {
    url: 'https://informationsecurityasia.com/wp-content/uploads/2022/02/What-Is-An-Intrusion-Detection-System-IDS-1024x536.jpg',
    title: 'Intrusion Detection System'
  }
]

export default function FullPageRotatingHero() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Auto-rotate every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleNext()
    }, 5000)
    return () => clearInterval(interval)
  }, [currentIndex])

  const handleNext = () => {
    if (isTransitioning) return
    const next = (currentIndex + 1) % HERO_SLIDES.length
    setNextIndex(next)
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(next)
      setIsTransitioning(false)
    }, 1000)
  }

  const handlePrev = () => {
    if (isTransitioning) return
    const prev = (currentIndex - 1 + HERO_SLIDES.length) % HERO_SLIDES.length
    setNextIndex(prev)
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(prev)
      setIsTransitioning(false)
    }, 1000)
  }

  return (
    <section 
      className="relative w-full overflow-hidden"
      style={{ 
        height: '85vh',
        minHeight: '600px',
        maxHeight: '900px',
        marginTop: 64,
        background: '#0A1929',
      }}>

      {/* Full-Page Background Images with Crossfade (NO black screen ever!) */}
      <div className="absolute inset-0" style={{ background: '#0f1c2e' }}>
        {/* Layer 1: Current Image (always visible when not transitioning) */}
        <div
          className="absolute inset-0"
          style={{
            opacity: isTransitioning ? 0 : 1,
            transition: 'opacity 1200ms cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 2,
            pointerEvents: 'none',
          }}>
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url("${HERO_SLIDES[currentIndex].url}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#0f1c2e',
            }} 
          />
          
          {/* Lighter overlay for readability */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(10,14,26,0.45) 0%, rgba(6,10,20,0.40) 50%, rgba(10,14,26,0.50) 100%)',
            }} 
          />
        </div>

        {/* Layer 2: Next Image (fades in during transition) */}
        <div
          className="absolute inset-0"
          style={{
            opacity: isTransitioning ? 1 : 0,
            transition: 'opacity 1200ms cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1,
            pointerEvents: 'none',
          }}>
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url("${HERO_SLIDES[nextIndex].url}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#0f1c2e',
            }} 
          />
          
          {/* Lighter overlay for readability */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(10,14,26,0.45) 0%, rgba(6,10,20,0.40) 50%, rgba(10,14,26,0.50) 100%)',
            }} 
          />
        </div>
      </div>

      {/* Animated Scrolling Text Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
        <div className="text-center max-w-5xl">
          
          {/* Main Welcome Text - with scrolling animation */}
          <div className="overflow-hidden mb-6">
            <h1 
              key={`title-${currentIndex}`}
              className="text-5xl md:text-6xl lg:text-8xl font-black leading-tight"
              style={{ 
                color: '#FFFFFF',
                textShadow: '0 6px 50px rgba(0,0,0,0.95), 0 0 100px rgba(0,0,0,0.8), 0 4px 20px rgba(6,182,212,0.5)',
                letterSpacing: '-0.01em',
                animation: 'slideInFromRight 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
              }}>
              WELCOME TO{' '}
              <span 
                className="block mt-3"
                style={{ 
                  background: 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 50%, #06B6D4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  backgroundSize: '200% auto',
                  animation: 'shimmerGlow 3s linear infinite, slideInFromLeft 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
                  filter: 'drop-shadow(0 0 60px rgba(6,182,212,0.6))',
                }}>
                FANOS AI
              </span>
            </h1>
          </div>

          {/* Subtitle - with scrolling animation */}
          <div className="overflow-hidden mb-12">
            <p 
              key={`subtitle-${currentIndex}`}
              className="text-xl md:text-2xl lg:text-4xl font-semibold"
              style={{ 
                color: '#E2E8F0',
                textShadow: '0 4px 30px rgba(0,0,0,0.95), 0 0 60px rgba(0,0,0,0.8)',
                letterSpacing: '0.03em',
                animation: 'slideInFromBottom 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both',
              }}>
              AI-powered cyber defense platform
            </p>
          </div>

          {/* Slide title indicator */}
          <div 
            key={`indicator-${currentIndex}`}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-xl border"
            style={{
              background: 'rgba(16,24,40,0.8)',
              borderColor: 'rgba(6,182,212,0.5)',
              boxShadow: '0 4px 30px rgba(6,182,212,0.3)',
              animation: 'fadeInScale 0.8s ease-out 0.6s both',
            }}>
            <span 
              className="w-2.5 h-2.5 rounded-full"
              style={{ 
                background: '#06B6D4',
                boxShadow: '0 0 16px rgba(6,182,212,0.9)',
                animation: 'pulse 2s ease-in-out infinite'
              }} 
            />
            <span 
              className="text-sm md:text-base font-bold"
              style={{ color: '#06B6D4' }}>
              {HERO_SLIDES[currentIndex].title}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110"
        style={{
          background: 'rgba(16,24,40,0.8)',
          border: '1px solid rgba(6,182,212,0.5)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        }}
        aria-label="Previous image">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110"
        style={{
          background: 'rgba(16,24,40,0.8)',
          border: '1px solid rgba(6,182,212,0.5)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        }}
        aria-label="Next image">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (isTransitioning || idx === currentIndex) return
              setNextIndex(idx)
              setIsTransitioning(true)
              setTimeout(() => {
                setCurrentIndex(idx)
                setIsTransitioning(false)
              }, 1000)
            }}
            className="transition-all duration-300 rounded-full"
            style={{
              width: idx === currentIndex ? '48px' : '12px',
              height: '12px',
              background: idx === currentIndex 
                ? 'linear-gradient(90deg, #06B6D4, #0EA5E9)' 
                : 'rgba(255,255,255,0.4)',
              boxShadow: idx === currentIndex 
                ? '0 0 24px rgba(6,182,212,0.8)' 
                : 'none',
              cursor: idx === currentIndex ? 'default' : 'pointer',
            }}
            aria-label={`View slide ${idx + 1}`}
          />
        ))}
      </div>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(60px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shimmerGlow {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 200% center;
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
      `}</style>
    </section>
  )
}
