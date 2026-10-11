import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ChevronsUp, MailOpen } from 'lucide-react'
import { wedding } from '../../data/wedding'
import { dateJoiner, dayOfMonth, getTimeline, ordinalSuffix } from '../../lib/dates'
import { useI18n } from '../../i18n/useI18n'
import { useMotion } from '../../hooks/motion'
import { gsap, useReveal } from '../../hooks/useReveal'
import { PetalField } from '../ui/Ambient'
import { CornerFlourish, FloralCorner, LotusDivider, MandapMotif } from '../ui/Ornaments'
import { NameJoiner } from '../ui/Amp'

/** Visible height of parchment between the two rolls while the scroll is tied shut. */
const COLLAPSED = 26

/**
 * Deckled (hand-torn) left and right paper edges as a clip-path polygon.
 * Deterministic so the edge never "shimmers" between renders.
 */
function useDeckleClip(): string {
  return useMemo(() => {
    let seed = 41
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const steps = 46
    const left: string[] = []
    const right: string[] = []
    for (let i = 0; i <= steps; i++) {
      const y = (i / steps) * 100
      left.push(`${(r() * 0.9).toFixed(2)}% ${y.toFixed(2)}%`)
      right.push(`${(100 - r() * 0.9).toFixed(2)}% ${(100 - y).toFixed(2)}%`)
    }
    return `polygon(${[...left, ...right].join(', ')})`
  }, [])
}

/** A rolled length of parchment with turned brass finials. */
function Roll({ position, spin }: { position: 'top' | 'bottom'; spin?: boolean }) {
  return (
    <div className="relative z-20 mx-auto h-[34px]" aria-hidden="true">
      {/* finials */}
      {(['left', 'right'] as const).map((side) => (
        <span
          key={side}
          className={`absolute top-1/2 h-[22px] w-[30px] -translate-y-1/2 ${side === 'left' ? '-left-[22px]' : '-right-[22px]'}`}
        >
          <span
            className="absolute inset-y-[7px] w-[16px] rounded-full bg-[linear-gradient(180deg,#f3dca8,#b98a43_55%,#5e3f1c)]"
            style={{ [side === 'left' ? 'right' : 'left']: 0 }}
          />
          <span
            className="absolute top-0 h-[22px] w-[18px] rounded-[45%] bg-[radial-gradient(circle_at_40%_30%,#fbe8bd,#c99a52_45%,#6b4820)] shadow-[0_6px_10px_-3px_rgba(0,0,0,.7)]"
            style={{ [side === 'left' ? 'left' : 'right']: 0 }}
          />
        </span>
      ))}
      {/* the rolled paper */}
      <div
        data-roll={position}
        className="absolute inset-x-0 inset-y-0 rounded-[17px] shadow-[0_10px_18px_-8px_rgba(0,0,0,.75)]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0 6px, rgba(120,84,46,.13) 6px 7px), linear-gradient(180deg, #6e4d2c 0%, #c9ab7c 18%, #f3e3c3 42%, #fbf1dc 52%, #e2c79a 72%, #8d6a41 100%)',
          backgroundPosition: '0 0, 0 0',
          ...(spin ? ({ animation: 'roll-turn 1.3s linear infinite' } as CSSProperties) : null),
        }}
      >
        {/* spiral end grain on each side */}
        {(['left-[3px]', 'right-[3px]'] as const).map((side) => (
          <span
            key={side}
            className={`absolute ${side} top-1/2 h-[30px] w-[11px] -translate-y-1/2 rounded-[50%] bg-[repeating-radial-gradient(ellipse_at_center,#e7d2a9_0_2px,#a9844b_2px_3px)] opacity-80`}
          />
        ))}
      </div>
    </div>
  )
}

/** Wax seal with the monogram. */
function WaxSeal() {
  const { first, second } = wedding.couple.monogram
  return (
    <div
      data-seal
      className="pointer-events-none absolute left-1/2 top-1/2 z-30 flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[46%_54%_50%_50%] bg-[radial-gradient(circle_at_35%_30%,#b2445a,#7d2535_45%,#4a0f1c)] shadow-[0_12px_26px_-6px_rgba(0,0,0,.75),inset_0_2px_6px_rgba(255,255,255,.2),inset_0_-5px_12px_rgba(0,0,0,.45)]"
      aria-hidden="true"
    >
      <span className="absolute inset-[7px] rounded-full border border-[#e7a7b0]/35" />
      <span className="font-display text-[1.6rem] font-medium leading-none text-[#f3c9cf] [text-shadow:0_-1px_0_rgba(0,0,0,.35)]">
        {first}
        <span className="mx-0.5 font-display text-[0.95rem] italic text-[#e7a7b0]">&amp;</span>
        {second}
      </span>
    </div>
  )
}

export function InvitationScroll() {
  const section = useRef<HTMLElement>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const openBtn = useRef<HTMLButtonElement>(null)
  const { prefersReducedMotion } = useMotion()
  const [opened, setOpened] = useState<boolean | null>(null)
  // Without animation the complete invitation is shown immediately (unless the guest rolls it up).
  const open = opened ?? prefersReducedMotion
  const [animating, setAnimating] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const deckle = useDeckleClip()
  const { t, lang } = useI18n()
  const timeline = getTimeline(lang)
  const [first, second] = wedding.days
  useReveal(section)

  useEffect(() => () => void tlRef.current?.kill(), [])

  const unfurl = () => {
    const el = sheet.current
    if (!el || open || animating) return
    if (prefersReducedMotion) {
      setOpened(true)
      requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }))
      return
    }
    setAnimating(true)
    const q = gsap.utils.selector(scroll)
    el.style.height = 'auto'
    const full = el.scrollHeight
    el.style.height = `${COLLAPSED}px`
    tlRef.current?.kill()
    tlRef.current = gsap
      .timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          gsap.set(el, { clearProps: 'height' })
          setAnimating(false)
          heading.current?.focus({ preventScroll: true })
        },
      })
      .to(q('[data-seal]'), { y: -26, scale: 1.12, rotate: -10, autoAlpha: 0, duration: 0.5, ease: 'power2.in' })
      .to(q('[data-ribbon]'), { scaleY: 0, autoAlpha: 0, duration: 0.45, ease: 'power2.in', transformOrigin: '50% 100%' }, 0.08)
      .add(() => setOpened(true), 0.42)
      .fromTo(el, { height: COLLAPSED }, { height: full, duration: 1.35, ease: 'power2.inOut' }, 0.45)
      .from(q('[data-inv="border"]'), { opacity: 0, scale: 0.985, duration: 0.9 }, 0.95)
      .from(q('[data-inv="item"]'), { opacity: 0, y: 14, duration: 0.8, stagger: 0.07 }, 1.0)
  }

  const rollUp = () => {
    const el = sheet.current
    if (!el || !open || animating) return
    if (prefersReducedMotion) {
      setOpened(false)
      requestAnimationFrame(() => openBtn.current?.focus())
      return
    }
    setAnimating(true)
    tlRef.current?.kill()
    tlRef.current = gsap
      .timeline({
        onComplete: () => {
          setOpened(false)
          setAnimating(false)
          requestAnimationFrame(() => {
            gsap.from(gsap.utils.selector(scroll)('[data-seal], [data-ribbon]'), { autoAlpha: 0, scale: 1.08, duration: 0.5, ease: 'power2.out' })
            openBtn.current?.focus()
          })
        },
      })
      .to(el, { height: COLLAPSED, duration: 1.0, ease: 'power2.inOut' })
  }

  const rolling = animating

  return (
    <section
      ref={section}
      id="invitation"
      aria-labelledby="invitation-title"
      className="relative isolate overflow-hidden bg-[#110908] section-pad"
    >
      {/* warm, candle-lit surroundings */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_62%_38%,rgba(125,37,53,.42),transparent_70%),radial-gradient(40%_40%_at_62%_30%,rgba(240,169,74,.10),transparent_70%),linear-gradient(180deg,#061914_0%,#140a09_16%,#1a0d0c_72%,#061914_100%)]" />
      <PetalField count={7} kinds={['rose', 'rose', 'jasmine']} seed={13} intensity={0.7} />
      <FloralCorner className="pointer-events-none absolute -left-8 -top-8 w-36 opacity-55 sm:w-48" />

      <div className="container-wide relative">
        <div className="grid gap-x-14 gap-y-14 [grid-template-areas:'head'_'scroll'] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:[grid-template-areas:'head_scroll']">
          <header className="text-center [grid-area:head] lg:max-w-md lg:self-center lg:text-left">
            <p className="eyebrow text-gold" data-reveal="fade">
              {t('invitation.eyebrow')}
            </p>
            <h2 id="invitation-title" className="mt-4 text-[length:var(--step-4)] text-ivory" data-reveal="up">
              {t('invitation.titleLine')}
              <span className="script block text-[1.05em] text-gold-light lg:-ml-1">{t('invitation.titleScript')}</span>
            </h2>
            <p className="mx-auto mt-5 max-w-sm text-[0.98rem] leading-relaxed text-ivory/70 lg:mx-0">
              {t('invitation.intro')}
            </p>
          </header>

          {/* The scroll */}
          <div ref={scroll} className="relative mx-auto w-full max-w-[34rem] px-7 [grid-area:scroll] sm:px-9 lg:self-center" data-reveal="up">
            {/* candle-light pool that makes the tied scroll the focal point */}
            <div
              className={`pointer-events-none absolute left-1/2 top-0 h-[22rem] w-[min(36rem,120%)] -translate-x-1/2 -translate-y-[38%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(240,169,74,.20),rgba(240,169,74,.06)_55%,transparent)] transition-opacity duration-700 ${open ? 'opacity-0' : 'opacity-100'}`}
              aria-hidden="true"
            />
            {/* table glow beneath the scroll */}
            <div className="pointer-events-none absolute inset-x-[-10%] -bottom-10 h-24 rounded-[50%] bg-[radial-gradient(closest-side,rgba(0,0,0,.55),transparent)]" aria-hidden="true" />

            <Roll position="top" />
            <div className="relative -my-[13px]">
              <div
                ref={sheet}
                id="invitation-scroll"
                className="parchment relative z-10 overflow-hidden shadow-[0_28px_50px_-28px_rgba(0,0,0,.95)]"
                style={{ clipPath: deckle, ...(open || rolling ? null : { height: COLLAPSED }) }}
              >
                {/* candle-light pool, edge burn and roll-memory bands */}
                <div
                  className="pointer-events-none absolute inset-0 z-10"
                  aria-hidden="true"
                  style={{
                    backgroundImage:
                      'radial-gradient(70% 40% at 50% 18%, rgba(255,236,196,.45), transparent 70%), repeating-linear-gradient(180deg, transparent 0 86px, rgba(120,84,46,.06) 86px 88px, transparent 88px 96px)',
                    boxShadow: 'inset 0 0 70px rgba(110,72,38,.28), inset 0 0 14px rgba(110,72,38,.25)',
                  }}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7 bg-gradient-to-b from-[rgba(90,60,36,.4)] to-transparent" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-7 bg-gradient-to-t from-[rgba(90,60,36,.4)] to-transparent" aria-hidden="true" />

                <div
                  className="relative px-7 pb-14 pt-12 text-center sm:px-14 sm:pb-16 sm:pt-14"
                  aria-hidden={!open}
                  inert={!open}
                  style={open || rolling ? undefined : { visibility: 'hidden' }}
                >
                  <div data-inv="border" className="pointer-events-none absolute inset-x-4 inset-y-5 border border-brass/50 sm:inset-x-6 sm:inset-y-7" aria-hidden="true">
                    <div className="absolute inset-1.5 border border-brass/20" />
                    <CornerFlourish className="absolute -left-px -top-px h-9 w-9 text-brass" />
                    <CornerFlourish className="absolute -right-px -top-px h-9 w-9 rotate-90 text-brass" />
                    <CornerFlourish className="absolute -bottom-px -right-px h-9 w-9 rotate-180 text-brass" />
                    <CornerFlourish className="absolute -bottom-px -left-px h-9 w-9 -rotate-90 text-brass" />
                  </div>

                  <MandapMotif data-inv="item" className="mx-auto h-12 w-auto text-brass" />
                  <p data-inv="item" className="mt-5 text-label font-bold uppercase tracking-[0.3em] text-burgundy">
                    {t('invitation.blessings')}
                  </p>
                  <h3
                    ref={heading}
                    tabIndex={-1}
                    data-inv="item"
                    className="mt-4 font-display text-[clamp(1.7rem,1.3rem+1.6vw,2.4rem)] font-medium leading-tight text-ink"
                  >
                    {t('invitation.heading')}
                  </h3>
                  <p data-inv="item" className="mt-2 font-display text-[1.05rem] italic text-ink-soft">
                    {t('invitation.toCelebrate')}
                  </p>
                  <p data-inv="item" className="mt-4 font-display text-[clamp(2.5rem,1.8rem+3.6vw,4rem)] leading-[0.95] text-maroon">
                    {t('couple.first')}
                    <NameJoiner className="block py-1 text-[0.55em] text-brass-deep" wordClassName="text-[0.42em]" />
                    {t('couple.second')}
                  </p>
                  <LotusDivider data-inv="item" className="mx-auto mt-6 h-5 w-44 text-brass" />
                  <p data-inv="item" className="mt-5 font-display text-[length:var(--step-2)] text-ink">
                    {dayOfMonth(first)}
                    <sup className="text-[0.55em]">{ordinalSuffix(dayOfMonth(first), lang)}</sup> {dateJoiner(lang)} {dayOfMonth(second)}
                    <sup className="text-[0.55em]">{ordinalSuffix(dayOfMonth(second), lang)}</sup>
                    <span className="mt-1 block font-display text-[0.62em] italic text-ink-soft">
                      {timeline.monthYearLabel}
                    </span>
                  </p>
                  <p data-inv="item" className="mt-4 text-label font-bold uppercase tracking-[0.28em] text-burgundy">
                    {t('invitation.twoDays')}
                  </p>
                  <p data-inv="item" className="mt-6 font-display text-[length:var(--step-1)] font-medium text-ink">
                    {t('venue.name')}
                    <span className="block text-[0.82em] font-normal text-ink-soft">
                      {t('venue.line1')}, {t('venue.city')}
                    </span>
                  </p>
                  <p data-inv="item" className="mx-auto mt-7 max-w-[26rem] font-display text-[length:var(--step-1)] italic leading-relaxed text-ink">
                    {t('invitation.message')}
                  </p>
                  <p data-inv="item" className="script mt-6 text-[length:var(--step-2)] text-burgundy">
                    {t('invitation.signoff')}
                  </p>
                </div>
              </div>

              {!open && !rolling && (
                <>
                  {/* ribbon wrapped around both rolls, tied off with two tails */}
                  <div data-ribbon className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
                    <div className="h-[92px] w-[18px] bg-[linear-gradient(90deg,#4a0f1c,#8f2a3c_45%,#a8394f_55%,#5a1524)] shadow-[0_0_8px_rgba(0,0,0,.45)]" />
                    {[-14, 16].map((r) => (
                      <div
                        key={r}
                        className="absolute left-1/2 top-[60px] h-[74px] w-[15px] origin-top bg-[linear-gradient(90deg,#5a1524,#9b3245_50%,#5a1524)] shadow-[0_4px_8px_rgba(0,0,0,.4)]"
                        style={{ transform: `translateX(-50%) rotate(${r}deg)`, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 86%, 0 100%)' }}
                      />
                    ))}
                  </div>
                  <WaxSeal />
                </>
              )}
            </div>
            <Roll position="bottom" spin={rolling && !prefersReducedMotion} />

            <div className="mt-9 flex justify-center">
              {!open ? (
                <button
                  ref={openBtn}
                  type="button"
                  onClick={unfurl}
                  aria-expanded={false}
                  aria-controls="invitation-scroll"
                  disabled={rolling}
                  className="group mt-10 inline-flex min-h-12 items-center gap-3 whitespace-nowrap border border-gold/70 bg-gold/10 px-6 text-button font-semibold uppercase tracking-[0.18em] text-gold-light sm:px-8 sm:tracking-[0.26em] shadow-[0_0_40px_-10px_rgba(213,176,109,.55)] transition-[background-color,color,transform] duration-300 hover:bg-gold/20 hover:text-ivory active:scale-[0.97]"
                >
                  <MailOpen className="h-4 w-4" aria-hidden="true" />
                  {t('invitation.open')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={rollUp}
                  aria-expanded={true}
                  aria-controls="invitation-scroll"
                  disabled={rolling}
                  className="inline-flex min-h-11 items-center gap-2 px-4 text-label font-semibold uppercase tracking-[0.26em] text-gold-light/80 underline-offset-[6px] transition-colors hover:text-ivory hover:underline"
                >
                  <ChevronsUp className="h-4 w-4" aria-hidden="true" />
                  {t('invitation.rollUp')}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
