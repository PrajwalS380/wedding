import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import { ChevronsUp, MailOpen } from 'lucide-react'
import { SCROLL_ART as A } from '../../data/scrollArt.generated'
import { wedding } from '../../data/wedding'
import { dateJoiner, dayOfMonth, getTimeline, ordinalSuffix } from '../../lib/dates'
import { rng } from '../../lib/random'
import { useI18n } from '../../i18n/useI18n'
import { useMotion } from '../../hooks/motion'
import { gsap, useReveal } from '../../hooks/useReveal'
import { PetalField } from '../ui/Ambient'
import { CornerFlourish, FloralCorner, LampMotif, LotusDivider, MandapMotif } from '../ui/Ornaments'
import { DateTile, FoilDefs, JoinerMedallion, Motes, PetalShower, Thorana } from '../invitation/parts'
import { PAISLEY_BORDER, useDeckle } from '../invitation/paper'

/**
 * The invitation: a parchment scroll on brass-finialled rolls, tied with gold-bordered maroon silk, marigolds
 * tucked in the bow, sealed in red wax with the couple's monogram (rendered parts — tools/scenes/scenes/scroll.js).
 * Opening it is a little film: the seal cracks and falls away, the ribbon slips off, the scroll unrolls — the
 * page follows it down — and each part of the letter settles into the paper as the roll passes it; petals
 * fall. Rolling it up reverses it and ties it again. With reduced motion the letter is simply open.
 *
 * Units: the renders' own (`--u`, the frame is 2.6 wide): rolls 0.28 tall, the paper 2 wide, the tied rolls'
 * centres 0.2 apart — so the rolls laid out here sit exactly where they are in the tied picture.
 */

type Phase = 'closed' | 'opening' | 'open' | 'closing'
const SIZES = '(min-width: 640px) 36rem, 100vw'
const ROLL_MASK = 'url(/images/invitation/roll-900.webp) 0 0 / 100% 100% no-repeat'
const SEAL_MASK = 'url(/images/invitation/seal-900.webp) 0 0 / 100% 100% no-repeat'

// the crack across the seal, as a jagged line through its centre (percent of the tied picture)
const CRACK: [number, number][] = [
  [50.7, 10],
  [49.5, 15],
  [51.2, 19.5],
  [49.2, 24],
  [51, 28.7],
  [49.4, 33],
  [50.9, 37.5],
  [49.6, 42],
  [50.3, 47],
]
const crackPts = (pts: [number, number][]) => pts.map(([x, y]) => `${x}% ${y}%`).join(', ')
const HALF_L = `polygon(0 0, ${CRACK[0][0]}% 0, ${crackPts(CRACK)}, ${CRACK[CRACK.length - 1][0]}% 100%, 0 100%)`
const HALF_R = `polygon(${CRACK[0][0]}% 0, 100% 0, 100% 100%, ${CRACK[CRACK.length - 1][0]}% 100%, ${crackPts([...CRACK].reverse())})`
const SEAL_ORIGIN = `${A.tied.seal.x * 100}% ${A.tied.seal.y * 100}%`
// crumbs of wax that fly when it cracks
const CRUMBS = (() => {
  const r = rng(23)
  return Array.from({ length: 14 }, () => ({ size: 3 + r() * 5, dx: (r() - 0.5) * 2, dy: 0.6 + r(), spin: r() * 540 }))
})()

/** One roll on its rod; while it turns, faint paper edges run round it. */
function Roll({ ref, turning, style }: { ref?: Ref<HTMLDivElement>; turning?: 'down' | 'up'; style?: CSSProperties }) {
  return (
    <div ref={ref} className="pointer-events-none relative z-[3] w-full" style={{ aspectRatio: A.roll.aspect, ...style }} aria-hidden="true">
      <img srcSet={A.src.roll} sizes={SIZES} alt="" decoding="async" className="absolute inset-0 h-full w-full select-none" draggable={false} />
      {turning && (
        <div
          className="absolute inset-0"
          style={{
            mask: ROLL_MASK,
            WebkitMask: ROLL_MASK,
            background:
              'repeating-linear-gradient(180deg, rgba(110,74,36,0) 0, rgba(110,74,36,.13) calc(var(--u) * .012), rgba(255,244,220,.08) calc(var(--u) * .03), rgba(110,74,36,0) calc(var(--u) * .05))',
            animation: `roll-spin .32s linear infinite${turning === 'up' ? ' reverse' : ''}`,
          }}
        />
      )}
    </div>
  )
}

/** The tied scroll: both rolls, the ribbon, the bow and the seal, stacked layers of one picture. */
function Tied({ ref }: { ref?: Ref<HTMLDivElement> }) {
  const layer = 'absolute inset-0 h-full w-full select-none'
  return (
    <div ref={ref} className="pointer-events-none absolute inset-x-0 top-0 z-[5]" style={{ aspectRatio: A.tied.aspect }} aria-hidden="true">
      <img data-tied srcSet={A.src.tied} sizes={SIZES} alt="" className={layer} draggable={false} />
      <img data-band srcSet={A.src.band} sizes={SIZES} alt="" className={layer} draggable={false} />
      <img data-bow srcSet={A.src.bow} sizes={SIZES} alt="" className={layer} style={{ transformOrigin: SEAL_ORIGIN }} draggable={false} />
      <img data-seal-whole srcSet={A.src.seal} sizes={SIZES} alt="" className={layer} style={{ transformOrigin: SEAL_ORIGIN }} draggable={false} />
      {/* a glint of candlelight travelling over the wax */}
      <div
        data-seal-whole
        className="ambient absolute inset-0"
        style={{
          mask: SEAL_MASK,
          WebkitMask: SEAL_MASK,
          transformOrigin: SEAL_ORIGIN,
          background: 'linear-gradient(115deg, transparent 44%, rgba(255,214,200,.42) 50%, transparent 56%) 0 0 / 320% 100%',
          animation: 'seal-glint 6.5s ease-in-out infinite',
        }}
      />
      {(['l', 'r'] as const).map((s) => (
        <img
          key={s}
          data-seal-half={s}
          srcSet={A.src.seal}
          sizes={SIZES}
          alt=""
          className={layer}
          style={{ clipPath: s === 'l' ? HALF_L : HALF_R, transformOrigin: SEAL_ORIGIN, opacity: 0, visibility: 'hidden' }}
          draggable={false}
        />
      ))}
      {CRUMBS.map((c, i) => (
        <span
          key={i}
          data-crumb
          data-dx={c.dx}
          data-dy={c.dy}
          data-spin={c.spin}
          className="absolute rounded-[40%] bg-[radial-gradient(circle_at_35%_30%,#a3283a,#5a0d18_70%)]"
          style={{ left: `${A.tied.seal.x * 100}%`, top: `${A.tied.seal.y * 100}%`, width: c.size, height: c.size * 0.8, opacity: 0 }}
        />
      ))}
      {/* candlelight breathing over it all */}
      <div className="ambient absolute -inset-[12%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,186,110,.16),transparent)] mix-blend-screen" style={{ animation: 'candle-flicker 3.4s ease-in-out infinite' }} />
    </div>
  )
}

export function InvitationScroll() {
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const topRoll = useRef<HTMLDivElement>(null)
  const bottomRoll = useRef<HTMLDivElement>(null)
  const tied = useRef<HTMLDivElement>(null)
  const namesCard = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const openBtn = useRef<HTMLButtonElement>(null)
  const { prefersReducedMotion, ambientMotion } = useMotion()
  const [chosen, setChosen] = useState<Phase | null>(null)
  // Without animation the complete invitation is shown (unless the guest rolls it up).
  const phase: Phase = chosen ?? (prefersReducedMotion ? 'open' : 'closed')
  const [shower, setShower] = useState(0)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const deckle = useDeckle()
  const { t, lang } = useI18n()
  const timeline = getTimeline(lang)
  const [first, second] = wedding.days
  useReveal(section)
  useEffect(() => () => void tl.current?.kill(), [])

  const shut = phase === 'closed'
  const open = phase === 'open'
  const moving = phase === 'opening' || phase === 'closing'

  // the plain rolls stand in for the tied picture once it's untied
  useLayoutEffect(() => {
    if (phase === 'closed') gsap.set([topRoll.current, bottomRoll.current], { autoAlpha: 0 })
    if (phase === 'open') gsap.set([topRoll.current, bottomRoll.current], { autoAlpha: 1 })
  }, [phase])

  // opening: crack the seal, slip the ribbon, unroll, reveal the letter as the roll passes, follow it down
  useLayoutEffect(() => {
    if (phase !== 'opening') return
    const el = sheet.current!,
      st = stage.current!
    const W = st.clientWidth,
      u = W / 2.6,
      sr = A.tied.seal.r * W
    const q = gsap.utils.selector(tied)
    gsap.set(content.current, { autoAlpha: 1 })
    el.style.height = 'auto'
    const full = el.scrollHeight
    el.style.height = `${0.2 * u}px`
    const items = [...el.querySelectorAll<HTMLElement>('[data-inv]')]
    items.forEach((i) => i.removeAttribute('data-in'))
    gsap.set([topRoll.current, bottomRoll.current], { autoAlpha: 0 })

    const root = document.documentElement
    root.style.overflowAnchor = 'none'
    let follow = true
    const stop = () => (follow = false)
    const evs = ['wheel', 'touchstart', 'keydown'] as const
    evs.forEach((e) => window.addEventListener(e, stop, { passive: true }))
    const step = () => {
      const edge = el.getBoundingClientRect().top + el.offsetHeight - 0.1 * u
      for (const it of items)
        if (!it.hasAttribute('data-in')) {
          const r = it.getBoundingClientRect()
          if (r.top + Math.min(r.height, 140) * 0.55 < edge) it.setAttribute('data-in', '')
        }
      if (follow) {
        // keep the turning roll in view until the names are well up the screen
        const vh = window.innerHeight
        const need = bottomRoll.current!.getBoundingClientRect().bottom - vh * 0.94
        const room = namesCard.current!.getBoundingClientRect().top - vh * 0.08
        if (need > 0 && room > 0) window.scrollBy({ top: Math.min(need, room), behavior: 'instant' })
      }
    }
    const crumbs = q('[data-crumb]')
    tl.current?.kill()
    tl.current = gsap
      .timeline({
        onComplete: () => {
          evs.forEach((e) => window.removeEventListener(e, stop))
          root.style.overflowAnchor = ''
          el.style.height = ''
          setChosen('open')
          requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }))
        },
      })
      .to(q('[data-seal-whole]'), { scale: 0.95, filter: 'brightness(1.35)', duration: 0.32, ease: 'power2.out' })
      .set(q('[data-seal-whole]'), { autoAlpha: 0 })
      .set(q('[data-seal-half]'), { autoAlpha: 1 })
      .to(q('[data-seal-half="l"]'), { x: -0.8 * sr, y: 3.6 * sr, rotation: -42, duration: 1.05, ease: 'power2.in' })
      .to(q('[data-seal-half="r"]'), { x: 0.95 * sr, y: 3.9 * sr, rotation: 38, duration: 1.05, ease: 'power2.in' }, '<')
      .to(q('[data-seal-half]'), { autoAlpha: 0, duration: 0.4, ease: 'power1.in' }, '<0.65')
      .fromTo(
        crumbs,
        { x: 0, y: 0, rotation: 0, autoAlpha: 1 },
        {
          x: (i) => Number(crumbs[i].dataset.dx) * 2.6 * sr,
          y: (i) => Number(crumbs[i].dataset.dy) * 3.2 * sr,
          rotation: (i) => Number(crumbs[i].dataset.spin),
          autoAlpha: 0,
          duration: 0.95,
          ease: 'power2.in',
          stagger: 0.012,
        },
        '<-0.65',
      )
      .to(q('[data-bow]'), { y: 0.35 * u, scale: 0.94, autoAlpha: 0, duration: 0.75, ease: 'power2.in' }, '<0.2')
      .to(q('[data-band]'), { autoAlpha: 0, duration: 0.45 }, '<0.25')
      .to([topRoll.current, bottomRoll.current], { autoAlpha: 1, duration: 0.3 }, '<0.2')
      .to(q('[data-tied]'), { autoAlpha: 0, duration: 0.3 }, '<')
      .to(el, { height: full, duration: 2.4, ease: 'power2.inOut', onUpdate: step, onComplete: step }, '>-0.05')
      .add(() => setShower((n) => n + 1), '-=1.2')
    return () => {
      evs.forEach((e) => window.removeEventListener(e, stop))
      root.style.overflowAnchor = ''
    }
  }, [phase])

  // rolling up: the letter fades, the roll climbs back (the page follows it), and it is tied again
  useLayoutEffect(() => {
    if (phase !== 'closing') return
    const el = sheet.current!,
      st = stage.current!
    const u = st.clientWidth / 2.6
    const q = gsap.utils.selector(tied)
    gsap.set(q('[data-tied], [data-band], [data-bow], [data-seal-whole]'), { autoAlpha: 0 })
    gsap.set([topRoll.current, bottomRoll.current], { autoAlpha: 1 })
    const startH = el.offsetHeight
    el.style.height = `${startH}px`
    // the page follows the roll up: it keeps its place on screen until the top of the scroll comes into view
    // (the browser's own scroll anchoring is paused, or it would hold the page below in place instead)
    const root = document.documentElement
    root.style.overflowAnchor = 'none'
    const startY = window.scrollY
    const rollY = bottomRoll.current!.getBoundingClientRect().bottom
    const minY = st.getBoundingClientRect().top + startY - window.innerHeight * 0.12
    const follow = rollY > 0 && rollY < window.innerHeight
    const step = () => {
      if (follow) window.scrollTo({ top: Math.max(Math.min(minY, startY), startY - (startH - el.offsetHeight)), behavior: 'instant' })
    }
    tl.current?.kill()
    tl.current = gsap
      .timeline({
        onComplete: () => {
          root.style.overflowAnchor = ''
          setChosen('closed')
          requestAnimationFrame(() => openBtn.current?.focus({ preventScroll: true }))
        },
      })
      .to(content.current, { autoAlpha: 0, duration: 0.45 })
      .to(el, { height: 0.2 * u, duration: 1.6, ease: 'power2.inOut', onUpdate: step })
      .to(q('[data-tied]'), { autoAlpha: 1, duration: 0.25 })
      .to([topRoll.current, bottomRoll.current], { autoAlpha: 0, duration: 0.25 }, '<')
      .fromTo(q('[data-band]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 })
      .fromTo(q('[data-bow]'), { autoAlpha: 0, y: 0.25 * u, scale: 0.95 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'power2.out' }, '<0.1')
      .fromTo(q('[data-seal-whole]'), { autoAlpha: 0, scale: 1.35, filter: 'brightness(1.3)' }, { autoAlpha: 1, scale: 1, filter: 'brightness(1)', duration: 0.6, ease: 'back.out(2.2)' }, '<0.3')
    return () => void (root.style.overflowAnchor = '')
  }, [phase])

  const unfurl = () => {
    if (!shut) return
    if (prefersReducedMotion) {
      setChosen('open')
      requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }))
      return
    }
    setChosen('opening')
  }
  const rollUp = () => {
    if (!open) return
    if (prefersReducedMotion) {
      setChosen('closed')
      requestAnimationFrame(() => openBtn.current?.focus())
      return
    }
    setChosen('closing')
  }

  const caps = 'inv-caps font-semibold text-burgundy'
  return (
    <section ref={section} id="invitation" aria-labelledby="invitation-title" className="relative isolate overflow-hidden bg-[#110908] section-pad">
      {/* warm, candle-lit surroundings */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_62%_38%,rgba(125,37,53,.42),transparent_70%),radial-gradient(40%_40%_at_62%_30%,rgba(240,169,74,.10),transparent_70%),linear-gradient(180deg,#061914_0%,#140a09_16%,#1a0d0c_72%,#061914_100%)]" />
      <PetalField count={7} kinds={['rose', 'rose', 'jasmine']} seed={13} intensity={0.7} />
      <FloralCorner className="pointer-events-none absolute -left-8 -top-8 w-36 opacity-55 sm:w-48" />
      <FoilDefs />

      <div className="container-wide relative">
        <div className="grid gap-x-14 gap-y-12 [grid-template-areas:'head'_'scroll'] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:[grid-template-areas:'head_scroll']">
          <header className={`text-center [grid-area:head] lg:max-w-md lg:text-left ${open ? 'lg:sticky lg:top-28 lg:self-start lg:pt-24' : 'lg:self-center'}`}>
            <p className="eyebrow text-gold" data-reveal="fade">
              {t('invitation.eyebrow')}
            </p>
            <h2 id="invitation-title" className="mt-4 text-[length:var(--step-4)] text-ivory" data-reveal="up">
              {t('invitation.titleLine')}
              <span className="script block text-[1.05em] text-gold-light lg:-ml-1">{t('invitation.titleScript')}</span>
            </h2>
            <p className="mx-auto mt-5 max-w-sm text-[0.98rem] leading-relaxed text-ivory/70 lg:mx-0">{t('invitation.intro')}</p>
          </header>

          <div className="relative mx-auto w-full max-w-[36rem] [grid-area:scroll] max-sm:-mx-3 max-sm:w-[calc(100%+1.5rem)] lg:max-w-[38rem] lg:self-center" data-reveal="up">
            <div className="inv-box">
              <div ref={stage} className="inv-stage relative" style={{ minHeight: open ? undefined : 'calc(var(--u) * 1.06)' }}>
                {/* candlelight pooled on the tied scroll, motes drifting in it */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute left-1/2 top-[calc(var(--u)*0.32)] h-[calc(var(--u)*2.4)] w-[135%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(240,169,74,.24),rgba(240,169,74,.07)_55%,transparent)] transition-opacity duration-700 ${shut ? 'opacity-100' : 'opacity-0'}`}
                />
                {shut && ambientMotion && (
                  <div className="absolute inset-x-0 -top-[calc(var(--u)*0.3)] h-[calc(var(--u)*1.4)]">
                    <Motes />
                  </div>
                )}

                <div style={{ height: 'calc(var(--u) * 0.06)' }} />
                <Roll ref={topRoll} />
                <div
                  ref={sheet}
                  id="invitation-scroll"
                  className={`inv-sheet relative z-[2] mx-auto overflow-hidden ${open ? 'is-open' : ''}`}
                  style={{ width: 'calc(var(--u) * 1.98)', marginTop: 'calc(var(--u) * -0.14)', ...deckle, ...(shut ? { height: 'calc(var(--u) * 0.2)' } : null) }}
                >
                  {/* the rolls' shade on the paper next to them */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(var(--u)*0.3)] bg-gradient-to-b from-[rgba(70,44,20,.42)] via-[rgba(70,44,20,.1)] to-transparent" aria-hidden="true" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[calc(var(--u)*0.3)] bg-gradient-to-t from-[rgba(70,44,20,.42)] via-[rgba(70,44,20,.1)] to-transparent" aria-hidden="true" />

                  <div
                    ref={content}
                    className="relative px-[10%] pb-[calc(var(--u)*0.42)] pt-[calc(var(--u)*0.24)] text-center"
                    aria-hidden={shut}
                    inert={shut}
                    style={shut ? { visibility: 'hidden' } : undefined}
                  >
                    {/* paisley borders and a double gold rule framing the letter */}
                    <div data-inv className="pointer-events-none absolute inset-x-[3%] bottom-[calc(var(--u)*0.3)] top-[calc(var(--u)*0.5)]" aria-hidden="true">
                      {(['left-0', 'right-0'] as const).map((s) => (
                        <span key={s} className={`absolute inset-y-0 ${s} w-4 opacity-55 mix-blend-multiply`} style={{ backgroundImage: PAISLEY_BORDER, backgroundSize: '16px 44px' }} />
                      ))}
                      <div className="absolute inset-x-4 inset-y-0 border border-[#a9844b]/60 sm:inset-x-6">
                        <div className="absolute inset-1.5 border border-[#a9844b]/25" />
                        <CornerFlourish className="foil-svg absolute -left-px -top-px h-9 w-9 text-brass" />
                        <CornerFlourish className="foil-svg absolute -right-px -top-px h-9 w-9 rotate-90 text-brass" />
                        <CornerFlourish className="foil-svg absolute -bottom-px -right-px h-9 w-9 rotate-180 text-brass" />
                        <CornerFlourish className="foil-svg absolute -bottom-px -left-px h-9 w-9 -rotate-90 text-brass" />
                      </div>
                    </div>

                    <Thorana data-inv className="relative mx-auto block w-[112%] max-w-none -translate-x-[5.4%] mix-blend-multiply" />
                    <MandapMotif data-inv className="foil-svg relative mx-auto mt-6 h-14 w-auto text-brass" />
                    <p data-inv className={`inv-flank relative mx-auto mt-5 indic-boost text-[0.7rem] tracking-[0.28em] xs:text-[0.74rem] ${caps}`}>
                      <span className="max-w-[15rem]">{t('invitation.blessings')}</span>
                    </p>

                    {/* the names, on their own card */}
                    <div ref={namesCard} data-inv className="inv-card relative mx-auto mt-7 max-w-[26rem] px-4 pb-8 pt-9 xs:px-8">
                      <span className="inv-frame" aria-hidden="true" />
                      <CornerFlourish className="foil-svg absolute left-1.5 top-1.5 h-7 w-7 text-brass" />
                      <CornerFlourish className="foil-svg absolute right-1.5 top-1.5 h-7 w-7 rotate-90 text-brass" />
                      <CornerFlourish className="foil-svg absolute bottom-1.5 right-1.5 h-7 w-7 rotate-180 text-brass" />
                      <CornerFlourish className="foil-svg absolute bottom-1.5 left-1.5 h-7 w-7 -rotate-90 text-brass" />
                      <h3
                        ref={heading}
                        tabIndex={-1}
                        className="inv-caps relative mx-auto max-w-[17rem] text-[clamp(1.08rem,0.9rem+1vw,1.42rem)] font-medium leading-snug tracking-[0.12em] text-ink"
                      >
                        {t('invitation.heading')}
                      </h3>
                      <p className="relative mt-2 font-display text-[1.14rem] italic text-ink-soft">{t('invitation.toCelebrate')}</p>
                      <p className="relative mt-3">
                        <span className="sr-only">{t('couple.pair')}</span>
                        <span aria-hidden="true" className="foil block px-[0.3em] pb-[0.12em] font-script text-[clamp(3rem,2.3rem+3.6vw,4.4rem)] leading-[1.2]">
                          {t('couple.first')}
                        </span>
                        <JoinerMedallion />
                        <span aria-hidden="true" className="foil block px-[0.3em] pb-[0.12em] font-script text-[clamp(3rem,2.3rem+3.6vw,4.4rem)] leading-[1.2]">
                          {t('couple.second')}
                        </span>
                      </p>
                    </div>

                    <LotusDivider data-inv className="foil-svg relative mx-auto mt-8 h-5 w-44 text-brass" />

                    {/* the two days */}
                    <div data-inv className="relative mt-6 flex items-center justify-center gap-3 xs:gap-4">
                      <DateTile day={dayOfMonth(first)} suffix={ordinalSuffix(dayOfMonth(first), lang)} />
                      <span className="foil px-1 font-display text-[1.9rem] italic leading-none">{dateJoiner(lang)}</span>
                      <DateTile day={dayOfMonth(second)} suffix={ordinalSuffix(dayOfMonth(second), lang)} />
                    </div>
                    <div data-inv className="relative mt-4 flex justify-center">
                      <span className="inv-ribbon px-8 py-1.5 font-display text-[1.1rem] italic text-[#fbe7c2]">{timeline.monthYearLabel}</span>
                    </div>
                    <p data-inv className={`relative mt-4 indic-boost text-[0.7rem] tracking-[0.28em] xs:text-[0.74rem] ${caps}`}>
                      {t('invitation.twoDays')}
                    </p>

                    {/* the hall, under a temple arch */}
                    <div data-inv className="inv-card inv-arch relative mx-auto mt-9 max-w-[21rem] px-6 pb-6 pt-7">
                      <span className="inv-frame inv-arch" aria-hidden="true" />
                      <LampMotif lit={false} className="foil-svg relative mx-auto h-14 w-auto text-brass" />
                      <p className="inv-caps relative mt-2 text-[0.98rem] font-semibold leading-snug tracking-[0.08em] text-maroon">{t('venue.name')}</p>
                      <p className="relative mt-1.5 font-display text-[1.04rem] italic leading-snug text-ink-soft">
                        {t('venue.line1')}, {t('venue.city')}
                      </p>
                    </div>

                    <p
                      data-inv
                      className={`relative mx-auto mt-9 max-w-[24rem] px-3 font-display text-[1.16rem] italic leading-relaxed text-ink xs:px-4 ${lang === 'en' ? 'inv-dropcap text-left' : ''}`}
                    >
                      {t('invitation.message')}
                    </p>
                    <div data-inv className="relative mt-6 flex flex-col items-center">
                      <p className="script text-[length:var(--step-2)] text-burgundy">{t('invitation.signoff')}</p>
                      <img src={A.src.stamp} alt="" width={72} height={72} loading="lazy" decoding="async" className="mt-1 h-[4.5rem] w-[4.5rem] -rotate-6 drop-shadow-[0_5px_6px_rgba(60,20,10,.35)]" />
                    </div>
                  </div>
                </div>
                <Roll ref={bottomRoll} turning={moving ? (phase === 'closing' ? 'up' : 'down') : undefined} style={{ marginTop: 'calc(var(--u) * -0.14)' }} />

                {!open && <Tied ref={tied} />}
                {shower > 0 && <PetalShower key={shower} />}
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              {!open ? (
                <button
                  ref={openBtn}
                  type="button"
                  onClick={unfurl}
                  aria-expanded={false}
                  aria-controls="invitation-scroll"
                  disabled={moving}
                  className={`group inline-flex min-h-12 items-center gap-3 whitespace-nowrap border border-gold/70 bg-gold/10 px-6 text-button font-semibold uppercase tracking-[0.18em] text-gold-light shadow-[0_0_40px_-10px_rgba(213,176,109,.55)] transition-[background-color,color,transform,opacity] duration-300 hover:bg-gold/20 hover:text-ivory active:scale-[0.97] disabled:opacity-0 sm:px-8 sm:tracking-[0.26em]`}
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
