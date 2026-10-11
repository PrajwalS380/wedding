import { useMemo, useRef, type CSSProperties } from 'react'
import { Pause, Play } from 'lucide-react'
import { useInView } from '../../hooks/useInView'
import { useMotion } from '../../hooks/motion'
import { PetalShape } from './Ornaments'
import { useI18n } from '../../i18n/useI18n'

/** Deterministic PRNG so decorative layouts are stable across renders. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

type PetalKind = 'rose' | 'marigold' | 'jasmine'

interface PetalFieldProps {
  count?: number
  kinds?: PetalKind[]
  seed?: number
  className?: string
  /** Opacity multiplier for very subtle fields */
  intensity?: number
}

/** A few drifting petals rendered with compositor-only CSS animation. */
export function PetalField({ count = 8, kinds = ['rose', 'marigold', 'jasmine'], seed = 7, className = '', intensity = 1 }: PetalFieldProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { rootMargin: '120px' })
  const { ambientMotion } = useMotion()
  const petals = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: count }, (_, i) => {
      const duration = 16 + r() * 12
      return {
        kind: kinds[i % kinds.length],
        left: `${4 + r() * 92}%`,
        size: 10 + r() * 12,
        duration,
        delay: -r() * duration,
        drift: `${(r() - 0.5) * 18}vw`,
        spin: `${180 + r() * 360}deg`,
        sway: 3 + r() * 3,
        opacity: (0.45 + r() * 0.45) * intensity,
      }
    })
  }, [count, kinds, seed, intensity])

  if (!ambientMotion) return <div ref={ref} className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true" />

  return (
    <div ref={ref} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {petals.map((p, i) => (
        <span
          key={i}
          className="ambient absolute top-0 block will-change-transform"
          style={
            {
              left: p.left,
              width: p.size,
              height: p.size * 1.25,
              animation: `petal-fall ${p.duration}s linear ${p.delay}s infinite`,
              animationPlayState: inView ? 'running' : 'paused',
              '--petal-drift': p.drift,
              '--petal-spin': p.spin,
              '--petal-opacity': p.opacity,
            } as CSSProperties
          }
        >
          <span
            className="ambient block h-full w-full"
            style={{ animation: `petal-sway ${p.sway}s ease-in-out infinite`, animationPlayState: inView ? 'running' : 'paused' }}
          >
            <PetalShape kind={p.kind} className="h-full w-full drop-shadow-[0_2px_3px_rgba(0,0,0,.35)]" />
          </span>
        </span>
      ))}
    </div>
  )
}

/** Soft floating golden motes. */
export function GoldMotes({ count = 18, seed = 3, className = '' }: { count?: number; seed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { rootMargin: '120px' })
  const motes = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: count }, () => ({
      left: `${r() * 100}%`,
      top: `${r() * 100}%`,
      size: 1.5 + r() * 2.8,
      duration: 6 + r() * 8,
      delay: -r() * 10,
      x: `${(r() - 0.5) * 40}px`,
      y: `${-10 - r() * 40}px`,
      opacity: 0.35 + r() * 0.5,
    }))
  }, [count, seed])
  return (
    <div ref={ref} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {motes.map((m, i) => (
        <span
          key={i}
          className="ambient absolute rounded-full bg-gold-light"
          style={
            {
              left: m.left,
              top: m.top,
              width: m.size,
              height: m.size,
              boxShadow: `0 0 ${m.size * 4}px ${m.size}px rgba(236,212,162,.35)`,
              animation: `mote-float ${m.duration}s ease-in-out ${m.delay}s infinite`,
              animationPlayState: inView ? 'running' : 'paused',
              '--mote-x': m.x,
              '--mote-y': m.y,
              '--mote-opacity': m.opacity,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

/** Guest-facing control to pause all decorative motion (WCAG 2.2.2). */
export function MotionToggle({ className = '' }: { className?: string }) {
  const { paused, prefersReducedMotion, togglePaused } = useMotion()
  const { t } = useI18n()
  if (prefersReducedMotion) return null
  return (
    <button
      type="button"
      onClick={togglePaused}
      aria-pressed={paused}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-gold/35 bg-night/40 px-4 text-label font-semibold uppercase tracking-[0.22em] text-gold-light/90 backdrop-blur-sm transition-colors hover:border-gold/70 hover:text-ivory ${className}`}
    >
      {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
      <span>{paused ? t('motion.play') : t('motion.pause')}</span>
    </button>
  )
}
