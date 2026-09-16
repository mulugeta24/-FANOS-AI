import { useEffect, useState } from 'react'

// Professional cybersecurity images for carousel
const HERO_IMAGES = [
  'https://codearies.com/wp-content/uploads/2024/07/AI-in-Cybersecurity-Advanced-Threat-Detection-and-Automated-Response-1024x576.png',
  'https://www.blockchain-council.org/wp-content/uploads/2024/11/How-AI-is-Improving-Cybersecurity-with-Real-Time-Threat-Detection-_2_.webp',
  'https://hodeitek.com/wp-content/uploads/2025/09/automating-alert-triage.png',
  'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/sites/104576/images/150dc0f-6471-25ca-edcb-78f3e32a7c_2da56203-7191-41eb-9416-cb61fc481726.jpeg',
]

export default function MinimalMovingHero() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Auto-rotate images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length)
        setIsTransitioning(false)
      }, 800)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section 
      className="relative w-full overflow-hidden"
      style={{ 
        height: '85vh',
        minHeight: '600px',
        maxHeight: '900px',
        marginTop: 64,
      }}>

      {/* Moving Background Images with Ken Burns Effect */}
      <div className="absolute inset-0">
        {HERO_IMAGES.map((imgUrl, idx) => (
          <div
            key={idx}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{
              opacity: idx === currentIndex && !isTransitioning ? 1 : 0,
              zIndex: idx === currentIndex ? 1 : 0,
            }}>
            {/* Image with continuous zoom animation */}
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url("${imgUrl}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                animation: idx === currentIndex ? 'kenBurnsZoom 20s ease-in-out infinite alternate' : 'none',
              }} 
            />
            
            {/* Professional dark overlay for text readability */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, rgba(10,14,26,0.85) 0%, rgba(6,10,20,0.75) 50%, rgba(10,14,26,0.9) 100%)',
              }} 
            />
          </div>
        ))}
      </div>

      {/* Simple Text Overlay - Centered on Image */}
      <div className="relative z-10 flex items-center justify-center h-full px-6 md:px-12">
        <div className="text-center max-w-5xl">
          
          {/* Main Welcome Text */}
          <h1 
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight"
            style={{ 
              color: '#FFFFFF',
              textShadow: '0 4px 30px rgba(0,0,0,0.8), 0 0 80px rgba(6,182,212,0.3)',
              letterSpacing: '-0.02em',
              animation: 'fadeSlideUp 1.2s ease-out both',
            }}>
            WELCOME TO{' '}
            <span 
              style={{ 
                background: 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: 'none',
                filter: 'drop-shadow(0 0 40px rgba(6,182,212,0.5))',
              }}>
              FANOS AI
            </span>
          </h1>

          {/* Subtitle */}
          <p 
            className="text-xl md:text-3xl lg:text-4xl font-semibold"
            style={{ 
              color: '#E2E8F0',
              textShadow: '0 2px 20px rgba(0,0,0,0.9)',
              letterSpacing: '0.02em',
              animation: 'fadeSlideUp 1.2s ease-out 0.3s both',
            }}>
            AI-powered cyber defense platform
          </p>

        </div>
      </div>

      {/* Slide Navigation Dots */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {HERO_IMAGES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (isTransitioning || idx === currentIndex) return
              setIsTransitioning(true)
              setTimeout(() => {
                setCurrentIndex(idx)
                setIsTransitioning(false)
              }, 800)
            }}
            className="transition-all duration-300 rounded-full backdrop-blur-sm"
            style={{
              width: idx === currentIndex ? '48px' : '12px',
              height: '12px',
              background: idx === currentIndex 
                ? 'linear-gradient(90deg, #06B6D4, #0EA5E9)' 
                : 'rgba(255,255,255,0.4)',
              boxShadow: idx === currentIndex ? '0 0 24px rgba(6,182,212,0.7)' : 'none',
              cursor: idx === currentIndex ? 'default' : 'pointer',
            }}
            aria-label={`Go to slide ${idx + 1}`}
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
          }, 800)
        }}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110"
        style={{
          background: 'rgba(16,24,40,0.7)',
          border: '1px solid rgba(6,182,212,0.3)',
        }}
        aria-label="Previous slide">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
          }, 800)
        }}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110"
        style={{
          background: 'rgba(16,24,40,0.7)',
          border: '1px solid rgba(6,182,212,0.3)',
        }}
        aria-label="Next slide">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Scroll Indicator */}
      <div 
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 mt-20"
        style={{ animation: 'fadeIn 1.2s ease-out 1.5s both' }}>
        <div 
          className="w-1 h-16 rounded-full mx-auto"
          style={{ 
            background: 'linear-gradient(to bottom, rgba(6,182,212,0.6), transparent)',
            animation: 'scrollBounce 2s ease-in-out infinite',
          }} 
        />
      </div>

      <style>{`
        @keyframes kenBurnsZoom {
          0% {
            transform: scale(1) translateX(0) translateY(0);
          }
          50% {
            transform: scale(1.15) translateX(-3%) translateY(-2%);
          }
          100% {
            transform: scale(1.08) translateX(2%) translateY(1%);
          }
        }

        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
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

        @keyframes scrollBounce {
          0%, 100% {
            opacity: 0.5;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(12px);
          }
        }
      `}</style>
    </section>
  )
}
