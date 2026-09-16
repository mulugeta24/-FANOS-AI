import { useEffect } from 'react'
import { useIntersectionFade } from '@/hooks/useIntersectionFade'
import LandingNav            from '@/components/landing/LandingNav'
import FullPageRotatingHero  from '@/components/landing/FullPageRotatingHero'
import PremiumHeroSection    from '@/components/landing/PremiumHeroSection'
import LiveDemoSection       from '@/components/landing/LiveDemoSection'
import PlatformSection       from '@/components/landing/PlatformSection'
import SOCPreviewSection     from '@/components/landing/SOCPreviewSection'
import IndustriesSection     from '@/components/landing/IndustriesSection'
import ArchSection           from '@/components/landing/ArchSection'
import CTASection            from '@/components/landing/CTASection'
import LandingFooter         from '@/components/landing/LandingFooter'

/* Separator */
function Sep() {
  return <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,#1E3047,transparent)' }} />
}

export default function LandingPage() {
  // Activate scroll-fade for all [data-fade] elements
  useIntersectionFade()

  // Scroll to top on mount
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div style={{ background: '#080C14', minHeight: '100vh', overflow: 'hidden' }}>
      <LandingNav />
      <div id="hero">
        <FullPageRotatingHero />
      </div>
      <PremiumHeroSection />
      <Sep />
      <div id="demo">
        <LiveDemoSection />
      </div>
      <Sep />
      <div id="platform">
        <PlatformSection />
      </div>
      <Sep />
      <div id="soc">
        <SOCPreviewSection />
      </div>
      <Sep />
      <div id="solutions">
        <IndustriesSection />
      </div>
      <Sep />
      <div id="architecture">
        <ArchSection />
      </div>
      <Sep />
      <div id="contact">
        <CTASection />
      </div>
      <LandingFooter />
    </div>
  )
}
