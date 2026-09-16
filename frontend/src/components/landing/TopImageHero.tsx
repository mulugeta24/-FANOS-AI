import { useState, useEffect } from 'react'

// 3 Professional cybersecurity images
const HERO_IMAGES = [
  'https://codearies.com/wp-content/uploads/2024/07/AI-in-Cybersecurity-Advanced-Threat-Detection-and-Automated-Response-1024x576.png',
  'https://www.blockchain-council.org/wp-content/uploads/2024/11/How-AI-is-Improving-Cybersecurity-with-Real-Time-Threat-Detection-_2_.webp',
  'https://hodeitek.com/wp-content/uploads/2025/09/automating-alert-triage.png',
]

export default function TopImageHero() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Auto-rotate every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length)
        setIsTransitioning(false)
      }, 700)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section 
      className="relative w-full overflow-hidden"
      style={{ 
        height: '70vh',
        minHeight: '500px',
        maxHeight: '700px',
        marginTop: 64,
      }}>

      {/* Moving Background Images */}
      <div className="absolute inset-0">
        {HERO_IMAGES.map((imgUrl, idx) => (
          <div
            key={idx}
            className="absolute inset-0"
            style={{
              opacity: idx === currentIndex && !isTransitioning ? 1 : 0,
              transition: 'opacity 700ms ease-in-out',
              zIndex: idx === currentIndex ? 1 : 0,
            }}>
            {/* Image with Ken Burns zoom + pan effect */}
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url("${imgUrl}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                animation: idx === currentIndex 
                  ? 'kenBurnsEffect 15s ease-in-out infinite alternate' 
                  : 'none',
              }} 
            />
            
            {/* Dark overlay for text readability */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, rgba(10,14,26,0.7) 0%, rgba(6,10,20,0.85) 100%)',
              }} 
            />
          </div>
        ))}
      </div>

      {/* Text Overlay - Top Center */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
        <div className="text-center max-w-4xl">
          
          {/* Welcome Text */}
          <h1 
            className="text-5xl md:text-6xl lg:text-7xl font-black mb-4 leading-tight"
            style={{ 
              color: '#FFFFFF',
              textShadow: '0 4px 40px rgba(0,0,0,0.9), 0 0 60px rgba(6,182,212,0.4)',
              letterSpacing: '-0.01em',
              animation: 'fadeInScale 1s ease-out both',
            }}>
            WELCOME TO{' '}
            <span 
              className="block mt-2"
              style={{ 
                background: 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 50%, #06B6D4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                backgroundSize: '200% auto',
                animation: 'shimmer 3s linear infinite, fadeInScale 1s ease-out 0.2s both',
              }}>
              FANOS AI
            </span>
          </h1>

          {/* Subtitle */}
          <p 
            className="text-xl md:text-2xl lg:text-3xl font-semibold"
            style={{ 
              color: '#E2E8F0',
              textShadow: '0 2px 24px rgba(0,0,0,0.9)',
              letterSpacing: '0.03em',
              animation: 'fadeInScale 1s ease-out 0.4s both',
            }}>
            AI-powered cyber defense platform
          </p>

        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {HERO_IMAGES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (isTransitioning || idx === currentIndex) return
              setIsTransitioning(true)
              setTimeout(() => {
                setCurrentIndex(idx)
                setIsTransitioning(false)
              }, 700)
            }}
            className="transition-all duration-300 rounded-full"
            style={{
              width: idx === currentIndex ? '40px' : '10px',
              height: '10px',
              background: idx === currentIndex 
                ? 'linear-gradient(90deg, #06B6D4, #0EA5E9)' 
                : 'rgba(255,255,255,0.4)',
              boxShadow: idx === currentIndex 
                ? '0 0 20px rgba(6,182,212,0.8)' 
                : 'none',
              cursor: idx === currentIndex ? 'default' : 'pointer',
            }}
            aria-label={`View image ${idx + 1}`}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => {
          if (isTransitioning) return
          setIsTransitioning(true)
          setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + HERO_IMAGES.length) % HERO_IMAGES.length)
            setIsTransitioning(false)
          }, 700)
        }}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 p-3 md:p-4 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110"
        style={{
          background: 'rgba(16,24,40,0.7)',
          border: '1px solid rgba(6,182,212,0.4)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
        aria-label="Previous image">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        onClick={() => {
          if (isTransitioning) return
          setIsTransitioning(true)
          setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length)
            setIsTransitioning(false)
          }, 700)
        }}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 p-3 md:p-4 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110"
        style={{
          background: 'rgba(16,24,40,0.7)',
          border: '1px solid rgba(6,182,212,0.4)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
        aria-label="Next image">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <style>{`
        @keyframes kenBurnsEffect {
          0% {
            transform: scale(1) translate(0, 0);
          }
          25% {
            transform: scale(1.12) translate(-2%, -1%);
          }
          50% {
            transform: scale(1.08) translate(1%, 1%);
          }
          75% {
            transform: scale(1.15) translate(-1%, -2%);
          }
          100% {
            transform: scale(1.05) translate(2%, 0);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 200% center;
          }
        }
      `}</style>
    </section>
  )
}
