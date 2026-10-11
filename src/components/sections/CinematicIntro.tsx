import { useLayoutEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../../hooks/useReveal'
import { useMotion } from '../../hooks/motion'
import { getTimeline } from '../../lib/dates'
import { useI18n } from '../../i18n/useI18n'
import { MandapMotif } from '../ui/Ornaments'
import { Monogram } from '../ui/Monogram'
import { PetalField } from '../ui/Ambient'
import { IntroMusicToggle } from '../ui/MusicControl'
import { LanguageSelector } from '../ui/LanguageSelector'

interface CinematicIntroProps {
  onEnter: () => void
}

/**
 * Optional ~3 s establishing sequence: darkness → distant lamps → mandap
 * silhouette → petals → monogram → "Enter". Skippable at any moment
 * (button, Esc, scroll or swipe). No audio. Reduced motion shows the final
 * frame immediately.
 */
export function CinematicIntro({ onEnter }: CinematicIntroProps) {
  const root = useRef<HTMLDivElement>(null)
  const leaving = useRef(false)
  const { prefersReducedMotion } = useMotion()
  const [showPetals, setShowPetals] = useState(prefersReducedMotion)
  const { t, lang } = useI18n()
  const timeline = getTimeline(lang)

  const leave = () => {
    if (leaving.current) return
    leaving.current = true
    if (prefersReducedMotion || !root.current) {
      onEnter()
      return
    }
    gsap.to(root.current, { autoAlpha: 0, duration: 0.9, ease: 'power2.inOut', onComplete: onEnter })
    gsap.to(root.current.querySelector('[data-intro-stage]'), { scale: 1.08, duration: 1.0, ease: 'power2.in' })
  }

  // Scroll lock + escape hatches — attached before the dialog paints, so a key
  // pressed the moment it appears is never missed.
  useLayoutEffect(() => {
    const html = document.documentElement
    html.classList.add('is-locked')
    root.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (['Escape', 'PageDown', 'ArrowDown', ' '].includes(e.key) && !(e.target as HTMLElement).closest('button')) {
        e.preventDefault()
        leave()
      } else if (e.key === 'Escape') {
        leave()
      }
    }
    let touchY = 0
    const onWheel = (e: WheelEvent) => e.deltaY > 8 && leave()
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0].clientY)
    const onTouchMove = (e: TouchEvent) => touchY - e.touches[0].clientY > 40 && leave()
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      html.classList.remove('is-locked')
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useGSAP(
    () => {
      if (prefersReducedMotion) return
      const q = gsap.utils.selector(root)
      const paths = Array.from(
        root.current?.querySelectorAll<SVGGeometryElement>('[data-intro-mandap] path, [data-intro-mandap] ellipse') ?? [],
      )
      paths.forEach((p) => {
        const len = p.getTotalLength?.() || 300
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len })
      })
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tl.from(q('[data-intro-light]'), { autoAlpha: 0, scale: 0.4, duration: 1.4, stagger: { each: 0.08, from: 'center' } }, 0.15)
        .to(paths, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.012 }, 0.7)
        .from(q('[data-intro-glow]'), { autoAlpha: 0, duration: 1.6 }, 0.9)
        .add(() => setShowPetals(true), 1.4)
        .from(q('[data-intro-monogram]'), { autoAlpha: 0, y: 16, scale: 0.94, duration: 1.1, ease: 'expo.out' }, 1.9)
        .from(q('[data-intro-copy]'), { autoAlpha: 0, y: 12, duration: 0.9, stagger: 0.12 }, 2.25)
        .from(q('[data-intro-enter]'), { opacity: 0, y: 10, duration: 0.8 }, 2.6)
    },
    { scope: root, dependencies: [prefersReducedMotion] },
  )

  const lights = Array.from({ length: 11 }, (_, i) => i)

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      aria-describedby="intro-desc"
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-night outline-none"
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_100%,#123d30_0%,#061914_55%,#030c09_100%)]" />

      <div data-intro-stage className="absolute inset-0">
        {/* distant warm lights on the horizon */}
        <div className="absolute inset-x-0 top-[58%] flex justify-center gap-[4.5vw]" aria-hidden="true">
          {lights.map((i) => (
            <span
              key={i}
              data-intro-light
              className="block rounded-full"
              style={{
                width: `${6 + (5 - Math.abs(i - 5)) * 1.4}px`,
                height: `${6 + (5 - Math.abs(i - 5)) * 1.4}px`,
                transform: `translateY(${Math.abs(i - 5) * -6}px)`,
                background: 'radial-gradient(circle, #ffe3a3 0%, #f0a94a 40%, transparent 72%)',
                boxShadow: '0 0 24px 8px rgba(240,169,74,.35)',
              }}
            />
          ))}
        </div>

        <div
          data-intro-glow
          className="absolute left-1/2 top-[44%] h-[60vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(240,169,74,.22),transparent)]"
          aria-hidden="true"
        />

        <div data-intro-mandap className="absolute left-1/2 top-[44%] w-[min(86vw,560px)] -translate-x-1/2 -translate-y-1/2 text-gold/80">
          <MandapMotif className="h-auto w-full" />
        </div>

        {showPetals && <PetalField count={10} seed={21} intensity={0.8} />}
      </div>

      <div className="relative z-10 mt-[42vh] flex flex-col items-center px-6 text-center">
        <h2 id="intro-title" className="sr-only">
          {t('intro.welcome')}
        </h2>
        <div data-intro-monogram>
          <Monogram size="md" />
        </div>
        <p id="intro-desc" data-intro-copy className="eyebrow mt-5 text-gold-light/90">
          {t('tagline.full')}
        </p>
        <p data-intro-copy className="mt-2 font-display text-lg italic text-ivory/75">
          {timeline.daysLabel} · {t('venue.city')}
        </p>
        <button
          type="button"
          data-intro-enter
          onClick={leave}
          className="group mt-8 inline-flex min-h-12 items-center gap-3 border border-gold/60 px-8 py-3 font-sans text-button font-semibold uppercase tracking-[0.3em] text-gold-light transition-colors duration-300 hover:bg-gold/10 hover:text-ivory focus-visible:opacity-100"
        >
          <span className="h-px w-6 bg-gold/70 transition-all duration-500 group-hover:w-10" aria-hidden="true" />
          {t('intro.enter')}
          <span className="h-px w-6 bg-gold/70 transition-all duration-500 group-hover:w-10" aria-hidden="true" />
        </button>
      </div>

      {/* music and language can be chosen before entering; neither starts by itself */}
      <div className="absolute left-[calc(0.75rem+env(safe-area-inset-left,0px))] top-[calc(0.75rem+var(--safe-top))] z-20 flex items-start gap-2">
        <IntroMusicToggle />
        <LanguageSelector variant="intro" align="left" />
      </div>

      <button
        type="button"
        onClick={leave}
        className="absolute right-[calc(1rem+env(safe-area-inset-right,0px))] top-[calc(1rem+var(--safe-top))] z-20 inline-flex min-h-11 items-center px-4 text-label font-semibold uppercase tracking-[0.26em] text-ivory/70 underline-offset-4 transition-colors hover:text-ivory hover:underline"
      >
        {t('intro.skip')}
      </button>
    </div>
  )
}
