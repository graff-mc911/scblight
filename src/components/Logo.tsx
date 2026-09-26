import React from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Типи пропсів для логотипа
 */
interface LogoProps {
  variant?: 'full' | 'icon' | 'text' | 'glass'  // тип відображення
  size?: 'sm' | 'md' | 'lg' | 'xl'              // розмір
  className?: string                           // додаткові стилі
  /** When false, logo is not clickable (default: navigates to Home). */
  linkToHome?: boolean
}

/**
 * Головний компонент логотипа — клік веде на Home (/).
 */
export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  linkToHome = true,
}) => {
  const navigate = useNavigate()

  /**
   * Розміри для різних варіантів
   */
  const sizes = {
    sm: {
      icon: 24,
      text: 'text-base',
      glass: 'w-12 h-12',
      glassText: 'text-xs',
      glassSubtitle: 'text-[5px]',
    },
    md: {
      icon: 32,
      text: 'text-xl',
      glass: 'w-16 h-16',
      glassText: 'text-sm',
      glassSubtitle: 'text-[6px]',
    },
    lg: {
      icon: 48,
      text: 'text-3xl',
      glass: 'w-44 h-44',
      glassText: 'text-4xl',
      glassSubtitle: 'text-[12px]',
    },
    xl: {
      icon: 64,
      text: 'text-4xl',
      glass: 'w-56 h-56',
      glassText: 'text-5xl',
      glassSubtitle: 'text-[14px]',
    },
  }

  // беремо значення з обраного розміру
  const iconSize = sizes[size].icon
  const textSize = sizes[size].text
  const glassSize = sizes[size].glass
  const glassTextSize = sizes[size].glassText
  const glassSubtitleSize = sizes[size].glassSubtitle

  /**
   * SVG ІКОНКА
   * ❗ НЕ ЗАЛЕЖИТЬ ВІД ФАЙЛІВ → завжди працює
   */
  const IconSVG = () => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 100 100"
      fill="none"
    >
      {/* фон */}
      <rect width="100" height="100" rx="20" fill="url(#gradient)" />

      {/* буква S */}
      <path
        d="M25 25 L75 25 L75 45 M25 45 L75 45 L75 75 L25 75"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* градієнт */}
      <defs>
        <linearGradient id="gradient" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#FF6600" />
        </linearGradient>
      </defs>
    </svg>
  )

  /**
   * ТЕКСТОВИЙ ЛОГОТИП
   */
  const TextLogo = () => (
    <div className={`font-bold tracking-tighter ${textSize}`}>
      <span className="text-orange-500">SCB</span>
      {/* ❗ без кастомного кольору щоб не ламалось */}
      <span className="text-white ml-1">Light</span>
    </div>
  )

  /**
   * GLASS СТИЛЬ (як у тебе)
   */
  const GlassLogo = () => (
    <div
      className={`${glassSize} rounded-2xl bg-gradient-to-br from-black to-[#1a1a1a]
      flex flex-col items-center justify-center shadow-2xl
      border border-orange-400/30 backdrop-blur-xl relative ${className}`}
    >
      {/* glow ефект */}
      <div className="absolute inset-0 rounded-2xl border border-orange-500/20 shadow-[0_0_25px_rgba(249,115,22,0.25)]" />

      {/* текст */}
      <span className={`text-orange-400 ${glassTextSize} font-semibold tracking-widest`}>
        SCB
      </span>

      <span className={`mt-0.5 w-full text-center ${glassSubtitleSize} tracking-[0.4em] text-gray-300`}>
        LIGHT
      </span>
    </div>
  )

  const content = (() => {
    if (variant === 'glass') return <GlassLogo />
    if (variant === 'icon') return <div className={className}><IconSVG /></div>
    if (variant === 'text') return <div className={className}><TextLogo /></div>
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <IconSVG />
        <TextLogo />
      </div>
    )
  })()

  if (!linkToHome) return content

  return (
    <button
      type="button"
      onClick={() => navigate('/')}
      className="inline-flex items-center justify-center p-0 m-0 bg-transparent border-0 cursor-pointer shrink-0 active:scale-95 transition-transform"
      aria-label="Home"
      title="Home"
    >
      {content}
    </button>
  )
}
