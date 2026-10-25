import React from 'react'

export interface FanosLogoProps {
  /** Size variant or pixel dimension */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  /** Display variant:
   * - 'icon': Only the official shield emblem
   * - 'horizontal': Shield emblem + 'FANOS AI' text + optional subtitle
   * - 'badge': Full graphic emblem badge with integrated logo text
   */
  variant?: 'icon' | 'horizontal' | 'badge'
  /** Subtitle text shown under 'FANOS AI' in 'horizontal' mode */
  subtitle?: string
  /** Subtitle accent color class, default 'text-emerald-400' */
  subtitleClass?: string
  /** Optional custom class name for the wrapper */
  className?: string
  /** Optional custom class name for the image element */
  imageClassName?: string
  /** Whether to show a subtle ambient cyber glow behind the shield */
  glow?: boolean
}

const SIZE_MAP = {
  xs: { img: 24, text: 'text-[13px]', sub: 'text-[8px]' },
  sm: { img: 32, text: 'text-[15px]', sub: 'text-[9px]' },
  md: { img: 40, text: 'text-[17px]', sub: 'text-[10px]' },
  lg: { img: 52, text: 'text-[22px]', sub: 'text-[11px]' },
  xl: { img: 64, text: 'text-[28px]', sub: 'text-[13px]' },
}

export const FanosLogo: React.FC<FanosLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  subtitle,
  subtitleClass = 'text-emerald-400',
  className = '',
  imageClassName = '',
  glow = true,
}) => {
  const isNamedSize = typeof size === 'string'
  const sizeConfig = isNamedSize ? SIZE_MAP[size] : { img: size, text: 'text-[16px]', sub: 'text-[9px]' }
  const pixelSize = sizeConfig.img

  if (variant === 'badge') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        {glow && (
          <div
            className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl pointer-events-none"
            style={{ transform: 'scale(1.1)' }}
          />
        )}
        <img
          src="/images/fanos-logo-darkmode.png"
          alt="FANOS AI"
          style={{ width: pixelSize * 2, height: 'auto', objectFit: 'contain' }}
          className={`relative z-10 drop-shadow-[0_4px_16px_rgba(16,185,129,0.3)] ${imageClassName}`}
          loading="eager"
        />
      </div>
    )
  }

  const shieldElement = (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: pixelSize, height: pixelSize }}
    >
      {glow && (
        <div
          className="absolute inset-0 rounded-full bg-emerald-500/25 blur-md pointer-events-none"
          style={{ transform: 'scale(1.15)' }}
        />
      )}
      <img
        src="/images/fanos-shield.png"
        alt="FANOS AI Shield"
        style={{ width: pixelSize, height: pixelSize, objectFit: 'contain' }}
        className={`relative z-10 transition-transform duration-300 drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)] ${imageClassName}`}
        loading="eager"
      />
    </div>
  )

  if (variant === 'icon') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{shieldElement}</div>
  }

  // variant === 'horizontal'
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {shieldElement}
      <div className="flex flex-col text-left leading-none justify-center">
        <div className={`font-black text-white tracking-wide flex items-center gap-1 leading-tight ${sizeConfig.text}`}>
          <span>FANOS</span>
          <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">AI</span>
        </div>
        {subtitle && (
          <div className={`tracking-[1.4px] uppercase font-mono font-bold mt-0.5 leading-none ${sizeConfig.sub} ${subtitleClass}`}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

export default FanosLogo
