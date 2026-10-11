import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import { wedding } from '../../data/wedding'
import { dayOfMonth, getTimeline, ordinalSuffix } from '../../lib/dates'
import { getDeviceTier, hasWebGL, scrollToSection } from '../../lib/browser'
import { useInView } from '../../hooks/useInView'
import { useMotion } from '../../hooks/motion'
import { gsap } from '../../hooks/useReveal'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { LotusDivider, MandapMotif } from '../ui/Ornaments'
import { MotionToggle } from '../ui/Ambient'
import { PORTRAIT_ANCHOR, PORTRAIT_POSTER_ASPECT } from '../three/stage'

const MandapScene = lazy(() => import('../three/MandapScene'))

/** `?still` renders the bare 3D stage (used to capture the poster images). */
const STILL_MODE = new URLSearchParams(window.location.search).has('still')

type SceneStatus = 'loading' | 'ready' | 'unsupported' | 'failed'

interface HeroLayout {
  /** Centre of the couple's names, as a fraction of the hero's height from the top. */
  anchor: number
  width: number
  height: number
}

/**
 * Tracks where the names sit in the hero. On portrait screens the 3D camera
 * (and the poster still) frame the whole mandap with its interior behind them.
 */
function useHeroLayout(section: RefObject<HTMLElement | null>, title: RefObject<HTMLElement | null>): HeroLayout {
  const [layout, setLayout] = useState<HeroLayout>(() => ({ anchor: PORTRAIT_ANCHOR, width: window.innerWidth, height: window.innerHeight }))
  useEffect(() => {
    const sec = section.current
    const t = title.current
    if (!sec || !t || STILL_MODE) return
    const measure = () => {
      const s = sec.getBoundingClientRect()
      const r = t.getBoundingClientRect()
      if (!s.height || !r.height) return
      const next = {
        anchor: Math.round(((r.top + r.height / 2 - s.top) / s.height) * 400) / 400,
        width: Math.round(s.width),
        height: Math.round(s.height),
      }
      setLayout((prev) => (prev.anchor === next.anchor && prev.width === next.width && prev.height === next.height ? prev : next))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(sec)
    ro.observe(t)
    return () => ro.disconnect()
  }, [section, title])
  return layout
}

/**
 * Aligns the portrait poster with the live camera: the poster is rendered with
 * the names' interior at PORTRAIT_ANCHOR; on screens wider than the poster the
 * spare height is cropped so that point lands where the names actually are.
 */
function posterPosition({ anchor, width, height }: HeroLayout): string {
  const aspect = width / Math.max(height, 1)
  if (aspect >= 1 || aspect <= PORTRAIT_POSTER_ASPECT) return '50% 50%'
  const imageH = width / PORTRAIT_POSTER_ASPECT
  const p = (anchor * height - PORTRAIT_ANCHOR * imageH) / (height - imageH)
  return `50% ${(Math.min(1, Math.max(0, p)) * 100).toFixed(2)}%`
}

/** Static poster: a render of the same mandap scene, with an illustrated fallback underneath. */
function HeroPoster({ objectPosition }: { objectPosition: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_42%,#5a2a14_0%,#2a1408_35%,#0b2019_70%,#061914_100%)]" />
      <MandapMotif className="absolute left-1/2 top-[44%] w-[min(92vw,820px)] -translate-x-1/2 -translate-y-1/2 text-gold/25" />
      {!failed && (
        <picture>
          <source media="(max-aspect-ratio: 1/1)" srcSet="/images/hero/mandap-still-portrait.webp" />
          <img
            src="/images/hero/mandap-still-landscape.webp"
            alt=""
            fetchPriority="high"
            decoding="async"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition }}
          />
        </picture>
      )}
    </div>
  )
}

export function WeddingHero({ introActive }: { introActive: boolean }) {
  const section = useRef<HTMLElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const layout = useHeroLayout(section, title)
  const { ambientMotion, prefersReducedMotion } = useMotion()
  const inView = useInView(section, { rootMargin: '80px' })
  // WebGL support is probed lazily (creating a context is costly), right before the scene would mount.
  const [status, setStatus] = useState<SceneStatus>('loading')
  const quality = useMemo(() => getDeviceTier(), [])
  const timeline = getTimeline()
  const [first, second] = wedding.days

  // The poster (a render of this very scene) is shown first. The heavy 3D
  // chunk is mounted only once the intro has closed and the title animation
  // has finished, in idle time — WebGL start-up can then never stutter the
  // intro or the title reveal, and the still image simply "comes alive".
  const [mountScene, setMountScene] = useState(false)
  useEffect(() => {
    if (status === 'unsupported' || introActive || mountScene) return
    let idle = 0
    const timer = window.setTimeout(
      () => {
        const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1))
        idle = ric(() => (hasWebGL() ? setMountScene(true) : setStatus('unsupported')), { timeout: 1500 })
      },
      STILL_MODE ? 0 : 1900,
    )
    return () => {
      window.clearTimeout(timer)
      window.cancelIdleCallback?.(idle)
    }
  }, [status, introActive, mountScene])

  // Idle while off-screen or hidden behind the intro; a single still frame when motion is reduced.
  const frameloop = !inView || introActive ? 'never' : ambientMotion ? 'always' : 'demand'

  useGSAP(
    () => {
      if (introActive || prefersReducedMotion) return
      const q = gsap.utils.selector(content)
      gsap
        .timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 })
        .from(q('[data-hero="eyebrow"]'), { autoAlpha: 0, y: 14, duration: 1.2 })
        .from(q('[data-hero="name"]'), { autoAlpha: 0, y: 40, duration: 1.6, stagger: 0.18 }, 0.15)
        .from(q('[data-hero="and"]'), { autoAlpha: 0, scale: 0.8, duration: 1.4 }, 0.45)
        .from(q('[data-hero="rest"]'), { autoAlpha: 0, y: 16, duration: 1.2, stagger: 0.1 }, 0.75)
    },
    { scope: content, dependencies: [introActive, prefersReducedMotion] },
  )

  const sceneFallback = <span className="sr-only">3D scene unavailable; showing still image.</span>

  return (
    <section
      ref={section}
      id="home"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-night"
    >
      {!STILL_MODE && <HeroPoster objectPosition={posterPosition(layout)} />}

      {mountScene && status !== 'unsupported' && status !== 'failed' && (
        <div
          data-scene-status={status}
          className={`absolute inset-0 ${STILL_MODE ? '' : 'transition-opacity duration-[1600ms] ease-[var(--ease-silk)]'} ${
            status === 'ready' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ErrorBoundary fallback={sceneFallback} onError={() => setStatus('failed')}>
            <Suspense fallback={null}>
              <MandapScene
                frameloop={frameloop}
                animate={ambientMotion}
                quality={quality}
                anchor={STILL_MODE ? PORTRAIT_ANCHOR : layout.anchor}
                onReady={() => setStatus((s) => (s === 'loading' ? 'ready' : s))}
                onFail={() => setStatus('failed')}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {/* Legibility layers: top & bottom fades, soft shadow pool behind the title */}
      <div data-still-hide className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-night/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night via-night/55 to-transparent" />
        <div className="absolute left-1/2 top-[47%] h-[74%] w-[min(118vw,1000px)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(18,6,8,.66),rgba(18,6,8,.3)_58%,transparent)]" />
        {/* phones: deepen the band where the date and action sit over the lit platform */}
        <div className="absolute inset-x-0 top-[52%] h-[30%] bg-[linear-gradient(180deg,transparent,rgba(14,6,6,.5)_35%,rgba(14,6,6,.5)_70%,transparent)] sm:hidden" />
      </div>

      <div
        ref={content}
        data-still-hide
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-[var(--gutter)] pb-6 pt-[calc(11.5rem+var(--safe-top))] text-center sm:pb-14 sm:pt-[calc(6.5rem+var(--safe-top))]"
      >
        <p data-hero="eyebrow" className="eyebrow text-gold-light drop-shadow-[0_1px_6px_rgba(0,0,0,.95)]">
          {wedding.copy.heroEyebrow}
        </p>
        <h1 ref={title} id="hero-title" tabIndex={-1} className="mt-3 flex flex-col items-center font-display font-medium leading-[0.86] sm:mt-5">
          <span
            data-hero="name"
            className="text-gold-gradient block text-[length:var(--step-names)] tracking-[-0.015em] portrait:text-[length:clamp(2.2rem,10.6vw,5.4rem)] [filter:drop-shadow(0_6px_26px_rgba(0,0,0,.7))] md:landscape:-translate-x-[0.32em]"
          >
            {wedding.couple.displayNames[0]}
          </span>
          <span data-hero="and" className="script my-0.5 block text-[clamp(1.8rem,min(1.2rem+3.4vw,6svh),4rem)] text-ivory/90 sm:my-1 portrait:text-[clamp(1.25rem,5.6vw,2.6rem)] drop-shadow-[0_2px_10px_rgba(0,0,0,.85)]">
            and
          </span>
          <span
            data-hero="name"
            className="text-gold-gradient block text-[length:var(--step-names)] tracking-[-0.015em] portrait:text-[length:clamp(2.2rem,10.6vw,5.4rem)] [filter:drop-shadow(0_6px_26px_rgba(0,0,0,.7))] md:landscape:translate-x-[0.32em]"
          >
            {wedding.couple.displayNames[1]}
          </span>
        </h1>

        <LotusDivider data-hero="rest" className="mt-4 h-5 w-48 sm:mt-5 sm:w-56 text-gold drop-shadow-[0_1px_4px_rgba(0,0,0,.8)]" />
        <p data-hero="rest" className="mt-3 font-display text-[1.3rem] italic leading-snug text-ivory drop-shadow-[0_2px_10px_rgba(0,0,0,.9)] sm:text-[length:var(--step-2)]">
          {/* phones: one sentence per line, so the tagline stays within the mandap */}
          {wedding.tagline.split(/(?<=\.)\s+/).map((part, i) => (
            <span key={i} className="max-sm:block">
              {i > 0 && ' '}
              {part}
            </span>
          ))}
        </p>
        <p data-hero="rest" className="mt-3 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-ivory drop-shadow-[0_2px_8px_rgba(0,0,0,.9)]">
          <span className="font-display text-[length:var(--step-2)] tracking-wide">
            {dayOfMonth(first)}
            <sup className="text-[0.55em]">{ordinalSuffix(dayOfMonth(first))}</sup> &amp; {dayOfMonth(second)}
            <sup className="text-[0.55em]">{ordinalSuffix(dayOfMonth(second))}</sup>
          </span>
          <span className="eyebrow text-gold-light">{timeline.monthYearLabel}</span>
        </p>

        <div data-hero="rest" className="mt-8">
          <button
            type="button"
            onClick={() => scrollToSection('invitation', prefersReducedMotion)}
            className="group relative inline-flex min-h-12 items-center gap-3 whitespace-nowrap border border-gold/70 bg-[rgba(10,6,4,.45)] px-5 text-button font-semibold uppercase tracking-[0.2em] xs:gap-4 xs:px-7 xs:tracking-[0.3em] text-gold-light shadow-[0_0_40px_-12px_rgba(213,176,109,.6)] backdrop-blur-[3px] transition-[background-color,color,box-shadow] duration-500 hover:bg-gold/15 hover:text-ivory hover:shadow-[0_0_50px_-10px_rgba(213,176,109,.85)] active:scale-[0.98]"
          >
            <span className="h-1.5 w-1.5 rotate-45 bg-gold transition-transform duration-500 group-hover:-translate-x-1" aria-hidden="true" />
            Open the Invitation
            <span className="h-1.5 w-1.5 rotate-45 bg-gold transition-transform duration-500 group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div data-still-hide className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-end gap-4 px-[var(--gutter)] pb-[calc(1rem+var(--safe-bottom))]">
        <span />
        <button
          type="button"
          onClick={() => scrollToSection('invitation', prefersReducedMotion)}
          className="flex h-12 w-11 items-end justify-center"
        >
          <span className="relative block h-10 w-px overflow-hidden bg-gold/25" aria-hidden="true">
            <span className="ambient absolute inset-0 bg-gold" style={{ animation: 'scroll-cue 2.6s var(--ease-curtain) infinite' }} />
          </span>
          <span className="sr-only">Scroll to the invitation</span>
        </button>
        <div className="flex justify-end">
          <MotionToggle className="hidden sm:inline-flex" />
        </div>
      </div>
    </section>
  )
}
