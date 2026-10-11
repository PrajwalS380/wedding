import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useGSAP } from '@gsap/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { INITIAL_MOMENT, moments, type Moment, type MomentFrame } from '../../data/moments'
import { useMotion } from '../../hooks/motion'
import { gsap, useReveal } from '../../hooks/useReveal'
import { PetalField } from '../ui/Ambient'
import { Picture } from '../ui/Picture'
import { withAmp } from '../ui/withAmp'
import { BlessingsArt, FamiliesArt } from './MomentArt'

/** Photos load lazily: the section sits several screens down, and native lazy loading starts well before it is reached. */
function FrameVisual({ moment }: { moment: Moment }) {
  const v = moment.visual
  if (v.kind === 'art') return v.art === 'blessings' ? <BlessingsArt /> : <FamiliesArt />
  if (v.kind === 'photo') {
    return (
      <Picture
        asset={v.asset}
        sizes="(min-width: 1024px) 24rem, 72vw"
        className="absolute inset-0 h-full w-full"
        style={{ aspectRatio: 'auto' }}
        imgClassName="object-cover"
        imgStyle={{ objectPosition: v.position ?? '50% 50%' }}
      />
    )
  }
  // Cut-out portrait on a warm champagne stage beneath a marigold-and-jasmine torana (never over faces).
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(75%_55%_at_50%_58%,#c98d4f_0%,#7a3a1e_38%,#3a1410_70%,#1a0807_100%)]">
      <svg viewBox="0 0 200 250" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {Array.from({ length: 15 }, (_, i) => {
          const x = 22 + i * 11.1
          const y = 40 - Math.sin((i / 14) * Math.PI) * 16
          return <circle key={i} cx={x} cy={y} r="2.3" fill={i % 3 === 1 ? '#fbf4e4' : '#e39a32'} />
        })}
        {[30, 62, 100, 138, 170].map((x, i) => (
          <path key={x} d={`M${x} ${40 - Math.sin(((x - 22) / 155) * Math.PI) * 16} v${10 + (i % 2) * 6}`} stroke="#e39a32" strokeWidth="2.2" strokeDasharray="0.1 4" strokeLinecap="round" />
        ))}
      </svg>
      <div className="absolute left-1/2 top-[46%] h-[60%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,226,170,.42),transparent)]" />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ maskImage: 'linear-gradient(180deg, black 86%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, black 86%, transparent 100%)' }}
      >
        <Picture asset={v.asset} sizes="(min-width: 1024px) 24rem, 72vw" imgClassName="object-contain object-bottom" />
      </div>
    </div>
  )
}

/** Mat / mount shape per memory: temple-arch window, ivory print, or oval cameo. */
const SHAPE: Record<MomentFrame, { outer: string; inner: string; line: string }> = {
  arch: {
    outer: 'rounded-[50%_50%_6px_6px/38%_38%_6px_6px] p-2.5 sm:p-3',
    inner: 'rounded-[50%_50%_3px_3px/37%_37%_3px_3px]',
    line: 'rounded-[50%_50%_2px_2px/36%_36%_2px_2px]',
  },
  print: { outer: 'rounded-[3px] p-2.5 pb-7 sm:p-3 sm:pb-9', inner: 'rounded-[1px]', line: 'rounded-[1px]' },
  oval: { outer: 'rounded-[50%] p-2.5 sm:p-3', inner: 'rounded-[50%]', line: 'rounded-[50%]' },
}

function MemoryFrame({ moment }: { moment: Moment }) {
  const shape = SHAPE[moment.frame]
  return (
    <div
      className={`bg-[linear-gradient(160deg,#fbf3e3,#e6cfa6)] shadow-[0_40px_70px_-24px_rgba(0,0,0,.95),inset_0_1px_0_rgba(255,255,255,.6)] ${shape.outer}`}
    >
      <div className={`relative aspect-[4/5] overflow-hidden ring-1 ring-brass/55 ${shape.inner}`}>
        <FrameVisual moment={moment} />
        <div className={`pointer-events-none absolute inset-1.5 border border-gold/45 ${shape.line}`} aria-hidden="true" />
      </div>
    </div>
  )
}

export function MagicalMoments() {
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(INITIAL_MOMENT)
  const { prefersReducedMotion, ambientMotion } = useMotion()
  const pointer = useRef<{ x: number; y: number } | null>(null)
  // A mouse drag-swipe is followed by a click on the dragged frame; ignore that click.
  const justSwiped = useRef(false)
  useReveal(section)

  const go = useCallback((i: number) => setActive(Math.max(0, Math.min(moments.length - 1, i))), [])

  useGSAP(
    () => {
      if (prefersReducedMotion) return
      // the installation "lights up": stage glow, then the memories float in from the dark
      gsap.from('[data-moment-glow]', {
        opacity: 0,
        duration: 2,
        ease: 'power2.out',
        scrollTrigger: { trigger: stage.current, start: 'top 85%', once: true },
      })
      gsap.from('[data-moment-frame]', {
        opacity: 0,
        y: 40,
        duration: 1.6,
        ease: 'expo.out',
        stagger: { each: 0.12, from: INITIAL_MOMENT },
        scrollTrigger: { trigger: stage.current, start: 'top 78%', once: true },
        clearProps: 'transform,opacity',
      })
    },
    { scope: section, dependencies: [prefersReducedMotion] },
  )

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') go(active + 1)
    else if (e.key === 'ArrowLeft') go(active - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(moments.length - 1)
    else return
    e.preventDefault()
  }

  const onPointerDown = (e: PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: PointerEvent) => {
    const start = pointer.current
    pointer.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      justSwiped.current = true
      window.setTimeout(() => (justSwiped.current = false), 0)
      go(active + (dx < 0 ? 1 : -1))
    }
  }

  const current = moments[active]
  const arrow =
    'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/45 text-gold-light transition-[background-color,opacity,transform] hover:bg-gold/10 active:scale-95 disabled:opacity-25'

  return (
    <section
      ref={section}
      id="moments"
      aria-labelledby="moments-title"
      className="relative isolate overflow-hidden bg-[#020a08] section-pad"
    >
      {/* the installation's ambient light shifts with each memory's mood */}
      <div
        data-moment-glow
        className="pointer-events-none absolute inset-0 transition-[background] duration-[1400ms]"
        style={{ background: `radial-gradient(40% 46% at var(--glow-x, 50%) 48%, ${current.mood}, transparent 72%)` }}
      />
      <PetalField count={5} kinds={['rose']} seed={31} intensity={0.6} />

      <div className="container-wide relative">
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Magical moments"
          onKeyDown={onKeyDown}
          className="grid items-center gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-12"
        >
          <header className="text-center lg:col-start-2 lg:row-start-1 lg:self-end lg:text-left">
            <p className="eyebrow text-gold" data-reveal="fade">
              Magical Moments
            </p>
            <h2 id="moments-title" className="mt-4 text-[length:var(--step-4)] text-ivory" data-reveal="up">
              A Journey
              <span className="script block text-[1.05em] text-gold-light">through Forever</span>
            </h2>
          </header>

          {/* Stage: one memory in the spotlight, the rest receding into the dark */}
          <div
            ref={stage}
            data-moments-stage
            className="relative mx-auto h-[calc(var(--frame-w)*1.32+6rem)] w-full select-none [--frame-w:min(66vw,18.5rem)] [perspective:1400px] [touch-action:pan-y] sm:[--frame-w:min(44vw,20rem)] lg:row-span-2 lg:row-start-1 lg:[--frame-w:21rem]"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (pointer.current = null)}
          >
            {/* spotlight beam */}
            <div
              className="pointer-events-none absolute left-1/2 top-[-14%] h-[100%] w-[calc(var(--frame-w)*2)] -translate-x-1/2 blur-[14px] [clip-path:polygon(40%_0,60%_0,92%_100%,8%_100%)] bg-[linear-gradient(180deg,transparent,rgba(255,226,170,.09)_30%,rgba(255,226,170,.05)_62%,transparent_92%)]"
              aria-hidden="true"
            />
            {/* reflective ceremonial floor with a pool of light */}
            <div className="pointer-events-none absolute inset-x-[-20%] bottom-0 h-[6rem]" aria-hidden="true">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent" />
              <div className="absolute left-1/2 top-0 h-20 w-[calc(var(--frame-w)*1.6)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,214,150,.26),transparent)]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,#020a08_92%)]" />
            </div>

            {moments.map((m, i) => {
              const d = i - active
              const abs = Math.abs(d)
              const side = Math.sign(d)
              const x = abs === 0 ? 0 : side * (0.66 + (abs - 1) * 0.42)
              const lift = abs === 0 ? 0 : abs === 1 ? -14 : -30
              const style: CSSProperties = {
                transform: `translate3d(calc(-50% + ${x} * var(--frame-w)), ${lift}%, ${-abs * 380}px) rotateY(${-side * Math.min(abs, 1) * 14}deg)`,
                opacity: abs === 0 ? 1 : abs === 1 ? 0.32 : abs === 2 ? 0.1 : 0,
                zIndex: 10 - abs,
                filter: abs === 0 ? 'none' : 'brightness(.55) saturate(.7)',
                pointerEvents: abs > 2 ? 'none' : undefined,
              }
              return (
                <div
                  key={m.id}
                  className="absolute bottom-[4.5rem] left-1/2 w-[var(--frame-w)] cursor-pointer transition-[transform,opacity,filter] duration-[1100ms] ease-[var(--ease-silk)] [-webkit-box-reflect:below_10px_linear-gradient(transparent_76%,rgba(255,255,255,.14))]"
                  style={style}
                  onClick={() => !justSwiped.current && abs !== 0 && go(i)}
                  aria-hidden={abs !== 0}
                  inert={abs !== 0}
                  role={abs === 0 ? 'group' : undefined}
                  aria-roledescription={abs === 0 ? 'slide' : undefined}
                  aria-label={abs === 0 ? `${i + 1} of ${moments.length}: ${m.title}` : undefined}
                >
                  <div data-moment-frame className={abs === 0 && ambientMotion ? 'ambient animate-[memory-float_7s_ease-in-out_infinite]' : ''}>
                    <MemoryFrame moment={m} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Caption + journey */}
          <div className="mx-auto w-full max-w-xl text-center lg:col-start-2 lg:row-start-2 lg:mx-0 lg:self-start lg:text-left">
            <div aria-live="polite">
              <div key={current.id} className={ambientMotion ? 'animate-[caption-in_.9s_var(--ease-silk)_both]' : ''}>
                <p className="font-display text-[clamp(2.6rem,2rem+2vw,3.6rem)] leading-none text-gold/30" aria-hidden="true">
                  {String(active + 1).padStart(2, '0')}
                </p>
                <p className="sr-only">
                  Moment {active + 1} of {moments.length}
                </p>
                <h3 className="mt-2 font-display text-[length:var(--step-3)] text-ivory">{current.title}</h3>
                <p className="script mt-2 text-[length:var(--step-2)] text-gold-light">{withAmp(current.caption, 'text-[0.8em]')}</p>
                <p className="mx-auto mt-3 max-w-md text-[0.98rem] leading-relaxed text-ivory/70 lg:mx-0">{current.description}</p>
              </div>
            </div>

            {/* desktop: a readable vertical journey */}
            <ol className="mt-10 hidden border-l border-gold/20 lg:block" aria-label="Moments">
              {moments.map((m, i) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={i === active ? 'step' : undefined}
                    aria-label={`Moment ${i + 1}: ${m.title}`}
                    className={`group relative -ml-px flex min-h-11 w-full items-center gap-4 border-l py-1.5 pl-5 text-left transition-colors ${
                      i === active ? 'border-gold text-ivory' : 'border-transparent text-ivory/55 hover:text-ivory/85'
                    }`}
                  >
                    <span className="w-6 font-sans text-tag font-semibold tracking-[0.2em] text-gold/70">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-display text-[1.12rem]">{m.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-6 hidden gap-3 lg:flex">
              <button type="button" onClick={() => go(active - 1)} disabled={active === 0} className={arrow}>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Previous moment</span>
              </button>
              <button type="button" onClick={() => go(active + 1)} disabled={active === moments.length - 1} className={arrow}>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Next moment</span>
              </button>
            </div>

            {/* phones & tablets: arrows around a golden diamond timeline */}
            <div className="mt-8 flex items-center gap-2 lg:hidden">
              <button type="button" onClick={() => go(active - 1)} disabled={active === 0} className={arrow}>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Previous moment</span>
              </button>
              <ol className="relative flex flex-1 items-center justify-between" aria-label="Moments">
                <span className="pointer-events-none absolute inset-x-[10%] top-1/2 h-px bg-gold/25" aria-hidden="true" />
                <span
                  className="pointer-events-none absolute left-[10%] top-1/2 h-px bg-gold transition-[width] duration-700 ease-[var(--ease-silk)]"
                  style={{ width: `${(active / (moments.length - 1)) * 80}%` }}
                  aria-hidden="true"
                />
                {moments.map((m, i) => (
                  <li key={m.id} className="relative flex w-[20%] justify-center">
                    <button type="button" onClick={() => go(i)} aria-current={i === active ? 'step' : undefined} className="flex h-11 w-11 items-center justify-center">
                      <span
                        className={`block h-3 w-3 rotate-45 border transition-all duration-500 ${
                          i === active
                            ? 'scale-125 border-gold bg-gold shadow-[0_0_18px_4px_rgba(213,176,109,.55)]'
                            : i < active
                              ? 'border-gold bg-gold/60'
                              : 'border-gold/60 bg-night'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        Moment {i + 1}: {m.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <button type="button" onClick={() => go(active + 1)} disabled={active === moments.length - 1} className={arrow}>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Next moment</span>
              </button>
            </div>
            <p className="mt-4 text-center text-caption text-ivory/65 lg:hidden">Swipe the memories or tap the timeline</p>
          </div>
        </div>
      </div>
    </section>
  )
}
