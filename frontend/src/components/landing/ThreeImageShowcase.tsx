import { useState, useEffect } from 'react'

// 3 Professional cybersecurity images
const IMAGES = [
  {
    url: 'https://codearies.com/wp-content/uploads/2024/07/AI-in-Cybersecurity-Advanced-Threat-Detection-and-Automated-Response-1024x576.png',
    title: 'AI Detection'
  },
  {
    url: 'https://www.blockchain-council.org/wp-content/uploads/2024/11/How-AI-is-Improving-Cybersecurity-with-Real-Time-Threat-Detection-_2_.webp',
    title: 'Real-Time Protection'
  },
  {
    url: 'https://hodeitek.com/wp-content/uploads/2025/09/automating-alert-triage.png',
    title: 'Automated Response'
  }
]

export default function ThreeImageShowcase() {
  const [centerIndex, setCenterIndex] = useState(1) // Start with middle image
  const [isAnimating, setIsAnimating] = useState(false)

  // Auto-rotate center image every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleNext()
    }, 5000)
    return () => clearInterval(interval)
  }, [centerIndex])

  const handleNext = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setTimeout(() => {
      setCenterIndex((prev) => (prev + 1) % IMAGES.length)
      setIsAnimating(false)
    }, 600)
  }

  const handlePrev = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setTimeout(() => {
      setCenterIndex((prev) => (prev - 1 + IMAGES.length) % IMAGES.length)
      setIsAnimating(false)
    }, 600)
  }

  // Calculate indices for left, center, right
  const leftIndex = (centerIndex - 1 + IMAGES.length) % IMAGES.length
  const rightIndex = (centerIndex + 1) % IMAGES.length

  return (
    <section 
      className="relative w-full overflow-hidden"
      style={{ 
        minHeight: '80vh',
        background: 'linear-gradient(180deg, #0A0E1A 0%, #050810 100%)',
        paddingTop: 64,
      }}>

      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '800px',
            height: '800px',
            background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }} 
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 px-6 py-16 max-w-7xl mx-auto">
        
        {/* Welcome Text */}
        <div className="text-center mb-16">
          <h1 
            className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight"
            style={{ 
              color: '#FFFFFF',
              textShadow: '0 4px 30px rgba(0,0,0,0.8)',
              letterSpacing: '-0.01em',
              animation: 'fadeInUp 0.8s ease-out both',
            }}>
            WELCOME TO{' '}
            <span 
              style={{ 
                background: 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 40px rgba(6,182,212,0.5))',
              }}>
              FANOS AI
            </span>
          </h1>
          <p 
            className="text-xl md:text-2xl lg:text-3xl font-semibold"
            style={{ 
              color: '#94A3B8',
              animation: 'fadeInUp 0.8s ease-out 0.2s both',
            }}>
            AI-powered cyber defense platform
          </p>
        </div>

        {/* Three Images Layout */}
        <div className="relative flex items-center justify-center gap-6 md:gap-8 lg:gap-12 mb-12">
          
          {/* Left Image */}
          <div 
            className="hidden md:block transition-all duration-600 hover:scale-105 cursor-pointer"
            onClick={handlePrev}
            style={{
              width: '280px',
              height: '320px',
              opacity: 0.6,
              animation: 'fadeIn 0.8s ease-out 0.4s both',
            }}>
            <div 
              className="w-full h-full rounded-2xl overflow-hidden border shadow-2xl"
              style={{
                backgroundImage: `url("${IMAGES[leftIndex].url}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderColor: 'rgba(6,182,212,0.2)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}>
              {/* Dark overlay */}
              <div className="w-full h-full backdrop-blur-[2px]"
                style={{ background: 'rgba(10,14,26,0.3)' }} />
            </div>
          </div>

          {/* Center Image (Main/Animated) */}
          <div 
            className="relative transition-all duration-600"
            style={{
              width: '100%',
              maxWidth: '500px',
              height: '400px',
              animation: 'fadeInScale 0.8s ease-out 0.6s both',
            }}>
            <div 
              className="w-full h-full rounded-3xl overflow-hidden border-2 shadow-2xl"
              style={{
                backgroundImage: `url("${IMAGES[centerIndex].url}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderColor: 'rgba(6,182,212,0.5)',
                boxShadow: '0 20px 80px rgba(6,182,212,0.4), 0 0 60px rgba(6,182,212,0.2)',
                animation: isAnimating 
                  ? 'none' 
                  : 'floatMove 6s ease-in-out infinite, glowPulse 3s ease-in-out infinite',
              }}>
              {/* Subtle overlay for depth */}
              <div 
                className="w-full h-full"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.05) 0%, transparent 100%)',
                }} 
              />
            </div>

            {/* Image title label */}
            <div 
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full backdrop-blur-xl border"
              style={{
                background: 'rgba(16,24,40,0.8)',
                borderColor: 'rgba(6,182,212,0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}>
              <p className="text-sm md:text-base font-bold whitespace-nowrap"
                style={{ color: '#06B6D4' }}>
                {IMAGES[centerIndex].title}
              </p>
            </div>
          </div>

          {/* Right Image */}
          <div 
            className="hidden md:block transition-all duration-600 hover:scale-105 cursor-pointer"
            onClick={handleNext}
            style={{
              width: '280px',
              height: '320px',
              opacity: 0.6,
              animation: 'fadeIn 0.8s ease-out 0.8s both',
            }}>
            <div 
              className="w-full h-full rounded-2xl overflow-hidden border shadow-2xl"
              style={{
                backgroundImage: `url("${IMAGES[rightIndex].url}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderColor: 'rgba(6,182,212,0.2)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}>
              {/* Dark overlay */}
              <div className="w-full h-full backdrop-blur-[2px]"
                style={{ background: 'rgba(10,14,26,0.3)' }} />
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110"
            style={{
              background: 'rgba(16,24,40,0.8)',
              border: '1px solid rgba(6,182,212,0.4)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            onClick={handleNext}
            className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110"
            style={{
              background: 'rgba(16,24,40,0.8)',
              border: '1px solid rgba(6,182,212,0.4)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Indicator Dots */}
        <div className="flex justify-center gap-3 mt-20">
          {IMAGES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (isAnimating || idx === centerIndex) return
                setIsAnimating(true)
                setTimeout(() => {
                  setCenterIndex(idx)
                  setIsAnimating(false)
                }, 600)
              }}
              className="transition-all duration-300 rounded-full"
              style={{
                width: idx === centerIndex ? '48px' : '12px',
                height: '12px',
                background: idx === centerIndex 
                  ? 'linear-gradient(90deg, #06B6D4, #0EA5E9)' 
                  : 'rgba(255,255,255,0.3)',
                boxShadow: idx === centerIndex 
                  ? '0 0 24px rgba(6,182,212,0.8)' 
                  : 'none',
                cursor: idx === centerIndex ? 'default' : 'pointer',
              }}
              aria-label={`View ${IMAGES[idx].title}`}
            />
          ))}
        </div>
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

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 0.6;
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

        @keyframes floatMove {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-12px) scale(1.02);
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 0 20px 80px rgba(6,182,212,0.4), 0 0 60px rgba(6,182,212,0.2);
          }
          50% {
            box-shadow: 0 20px 100px rgba(6,182,212,0.6), 0 0 80px rgba(6,182,212,0.3);
          }
        }
      `}</style>
    </section>
  )
}
