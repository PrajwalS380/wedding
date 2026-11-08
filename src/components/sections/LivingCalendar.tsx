import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useGSAP } from '@gsap/react'
import { ArrowRight, CalendarHeart } from 'lucide-react'
import { wedding, type DayId } from '../../data/wedding'
import { dayOfMonth, formatClock, formatDayLong, formatTimeWords, formatWeekday, getTimeline, ordinalSuffix, parseIsoDate } from '../../lib/dates'
import { defaultDayId, getDayClock, getPhase, type DayClock } from '../../lib/weddingClock'
import { scrollToSection } from '../../lib/browser'
import { useNow, currentTime } from '../../hooks/useNow'
import { useInView } from '../../hooks/useInView'
import { useMotion } from '../../hooks/motion'
import { gsap, useReveal } from '../../hooks/useReveal'
import { CalendarDial } from '../ui/CalendarDial'
import { useI18n } from '../../i18n/useI18n'
import { SKY } from '../celebrations/styles'
import { CalendarMenu } from '../celebrations/CalendarMenu'
import { CornerFlourish, MandapMotif } from '../ui/Ornaments'

const pad = (n: number) => String(n).padStart(2, '0')

/** One countdown unit: an enamelled plaque with a gold hairline, the number lit from above. */
function Tile({ value, label, lead = false }: { value: string | number; label: string; lead?: boolean }) {
  return (
    <span className="relative flex flex-col items-center rounded-[4px] bg-[linear-gradient(180deg,#123d30,#0a271f_60%,#071c16)] px-1 pb-2 pt-2.5 shadow-[inset_0_0_0_1px_rgba(213,176,109,.45),inset_0_1px_0_rgba(255,240,200,.18),inset_0_-10px_16px_-10px_rgba(0,0,0,.6),0_10px_18px_-12px_rgba(0,0,0,.8)]">
      <span className="pointer-events-none absolute inset-[3px] rounded-[2px] border border-gold/15" />
      <span className={`font-display text-[clamp(2rem,1.5rem+2.4vw,2.8rem)] font-medium leading-none lining-nums tabular-nums ${lead ? 'text-gold-gradient' : 'text-ivory'}`}>{value}</span>
      <span className="mt-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold/85 indic-boost">{label}</span>
    </span>
  )
}

function Countdown({ clock }: { clock: DayClock }) {
  const { t, lang } = useI18n()
  const r = clock.remaining
  const when = formatDayLong(clock.day, lang)
  const counts = { days: r.days, hours: r.hours, minutes: r.minutes, date: when }
  return (
    <div>
      <p className="sr-only">
        {clock.dateBased ? t('calendar.srCountdown', counts) : t('calendar.srCountdownTimed', { ...counts, time: formatClock(clock.day.startTime, lang) ?? '' })}
      </p>
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5" aria-hidden="true">
        <Tile value={r.days} label={r.days === 1 ? t('calendar.day') : t('calendar.days')} lead />
        <Tile value={pad(r.hours)} label={t('calendar.hours')} />
        <Tile value={pad(r.minutes)} label={t('calendar.minutes')} />
        <Tile value={pad(r.seconds)} label={t('calendar.seconds')} />
      </div>
    </div>
  )
}

/** Ticket notches: the two halves of the card are cut where they meet, like a pass with a tear line. */
const notch = (edge: 'top' | 'bottom'): CSSProperties => {
  const y = edge === 'top' ? '0' : '100%'
  const m = `radial-gradient(circle at 0 ${y}, transparent 13px, #000 13.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% ${y}, transparent 13px, #000 13.5px) right / 51% 100% no-repeat`
  return { WebkitMask: m, mask: m }
}
const cardFace = 'relative border-gold/45 bg-[linear-gradient(165deg,rgba(28,78,61,.82),rgba(10,38,30,.9)_55%,rgba(6,24,19,.94))]'

export function LivingCalendar() {
  const section = useRef<HTMLElement>(null)
  const dialRef = useRef<HTMLDivElement>(null)
  const { ambientMotion, prefersReducedMotion } = useMotion()
  const visible = useInView(section, { rootMargin: '120px' })
  const now = useNow(visible)
  const phase = getPhase(now)
  const [selected, setSelected] = useState<DayId>(() => defaultDayId(getPhase(currentTime())))
  const tabs = useRef<Record<DayId, HTMLButtonElement | null>>({ 'day-1': null, 'day-2': null })
  const { t, lang } = useI18n()
  const timeline = getTimeline(lang)
  useReveal(section)

  const clocks = useMemo(() => wedding.days.map((d) => getDayClock(d, now)), [now])
  const active = clocks.find((c) => c.day.id === selected) ?? clocks[0]
  const year = parseIsoDate(wedding.days[0].date)?.year ?? 0
  const inscription = `${wedding.couple.displayNames[0].toUpperCase()} ✦ ${wedding.couple.displayNames[1].toUpperCase()} ✦ ${timeline.datesLabel.toUpperCase()} ✦ ${wedding.venue.name.toUpperCase()} ✦ ${wedding.venue.city.toUpperCase()}`

  useGSAP(
    () => {
      if (prefersReducedMotion) return
      gsap.from(dialRef.current, {
        opacity: 0,
        scale: 0.94,
        rotate: -8,
        duration: 1.8,
        ease: 'expo.out',
        scrollTrigger: { trigger: dialRef.current, start: 'top 85%', once: true },
      })
    },
    { scope: section, dependencies: [prefersReducedMotion] },
  )

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const next: DayId = e.key === 'ArrowLeft' || e.key === 'Home' ? 'day-1' : 'day-2'
    setSelected(next)
    tabs.current[next]?.focus()
  }

  const day = active.day
  const otherClock = clocks.find((c) => c.day.id !== selected)!

  return (
    <section ref={section} id="calendar" aria-labelledby="calendar-title" className="grain relative isolate overflow-hidden bg-forest section-pad">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_50%_at_32%_50%,rgba(213,176,109,.13),transparent_70%),radial-gradient(60%_60%_at_100%_0%,rgba(90,21,36,.28),transparent_70%)]" />
      {/* melt into the invitation above and the sunset of the Celebrations below */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[min(28%,14rem)]" style={{ background: `linear-gradient(180deg, ${SKY.night}, transparent)` }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(30%,16rem)]" style={{ background: `linear-gradient(0deg, ${SKY.dusk}, transparent)` }} />

      <div className="container-wide relative">
        <header className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-gold" data-reveal="fade">
            {t('calendar.eyebrow')}
          </p>
          <h2 id="calendar-title" className="mt-4 text-[length:var(--step-4)] text-ivory" data-reveal="up">
            {t('calendar.titlePre')} <span className="script text-[1.1em] text-gold-light">{t('calendar.titleScript')}</span> {t('calendar.titlePost')}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[1rem] leading-relaxed text-ivory/75" data-reveal="fade">
            {t('calendar.intro')}
          </p>
        </header>

        <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
          {/* The dial: engraved artwork with real, selectable dates on top */}
          <div ref={dialRef} className="relative mx-auto aspect-square w-[min(88vw,23rem)] sm:w-[min(70vw,28rem)] lg:w-full lg:max-w-[33rem]">
            <CalendarDial inscription={inscription} year={year} spinning={ambientMotion && visible} />
            <div className="absolute inset-[19%] flex flex-col items-center justify-center text-center">
              <MandapMotif className="h-[clamp(1.6rem,6vw,2.4rem)] w-auto text-gold/80" />
              <p className="mt-[2.5%] indic-boost text-[clamp(0.6875rem,0.55rem+0.6vw,0.8rem)] font-semibold uppercase tracking-[0.34em] text-gold-light">{timeline.monthYearLabel}</p>

              <div role="tablist" aria-label={t('calendar.tabs')} className="mt-[4%] flex items-start justify-center gap-[6%]">
                {clocks.map((c) => {
                  const isActive = c.day.id === selected
                  const n = dayOfMonth(c.day)
                  return (
                    <button
                      key={c.day.id}
                      ref={(el) => void (tabs.current[c.day.id] = el)}
                      id={`calendar-tab-${c.day.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls="calendar-panel"
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setSelected(c.day.id)}
                      onKeyDown={onTabKey}
                      className="group relative flex min-h-11 min-w-[4.5rem] flex-col items-center rounded-[4px] px-2 pb-3 pt-1 outline-offset-4 transition-colors"
                    >
                      <span
                        className={`font-display leading-none lining-nums tabular-nums transition-[color,transform,text-shadow] duration-700 ease-[var(--ease-silk)] ${
                          isActive
                            ? 'scale-100 text-gold-light [text-shadow:0_0_28px_rgba(236,212,162,.45)]'
                            : 'scale-[0.86] text-ivory/70 group-hover:text-ivory'
                        } text-[clamp(3.1rem,13vw,5.4rem)]`}
                      >
                        {n}
                        <sup className="ml-0.5 align-super text-[0.3em] italic">{ordinalSuffix(n, lang)}</sup>
                      </span>
                      {/* on the day itself the weekday slot becomes a "Today" seal — same place, no overlap */}
                      {c.status === 'today' ? (
                        <span className="mt-1 rounded-full bg-maroon px-2 py-px indic-boost text-[clamp(0.6875rem,0.55rem+0.5vw,0.78rem)] font-bold uppercase tracking-[0.18em] text-ivory">
                          <span className="sr-only">{formatWeekday(c.day, 'long', lang)}, </span>
                          {t('calendar.today')}
                        </span>
                      ) : (
                        <span className={`mt-1 indic-boost text-[clamp(0.6875rem,0.55rem+0.5vw,0.78rem)] font-semibold uppercase tracking-[0.24em] ${isActive ? 'text-ivory' : 'text-ivory/60'}`}>
                          {formatWeekday(c.day, 'short', lang)}
                        </span>
                      )}
                      {/* selection mark — shape, not only colour */}
                      <span
                        className={`absolute -bottom-0.5 left-1/2 flex -translate-x-1/2 items-center gap-1 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                        aria-hidden="true"
                      >
                        <span className="h-px w-4 bg-gold" />
                        <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
                        <span className="h-px w-4 bg-gold" />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* The selected day */}
          <div
            id="calendar-panel"
            role="tabpanel"
            aria-labelledby={`calendar-tab-${selected}`}
            className="relative mx-auto w-full max-w-[30rem] lg:mx-0"
          >
            <div key={selected + phase} className={`[filter:drop-shadow(0_26px_30px_rgba(0,0,0,.45))] ${ambientMotion ? 'animate-[caption-in_.8s_var(--ease-silk)_both]' : ''}`}>
              {/* a gold diamond set into the top edge */}
              <div aria-hidden="true" className="relative z-10 h-0">
                <span className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#fff3cf]/60 bg-[linear-gradient(135deg,#fbecc4,#b98a43_55%,#7a5524)] shadow-[0_0_12px_rgba(240,200,120,.55)]" />
              </div>
              {/* the pass: day and date above the tear line */}
              <div className={`${cardFace} rounded-t-[8px] border border-b-0 px-6 pb-6 pt-7 text-center lg:text-left`} style={notch('bottom')}>
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-2 h-[calc(100%-0.5rem)] rounded-t-[5px] border border-b-0 border-gold/15" />
                <CornerFlourish className="pointer-events-none absolute left-1.5 top-1.5 h-9 w-9 text-gold/55" />
                <CornerFlourish className="pointer-events-none absolute right-1.5 top-1.5 h-9 w-9 rotate-90 text-gold/55" />
                <p className="eyebrow flex items-center justify-center gap-3 text-gold lg:justify-start">
                  <span className="h-px w-6 bg-gold/50" aria-hidden="true" />
                  {t(`days.${day.id}`)}
                  <span className="h-px w-6 bg-gold/50" aria-hidden="true" />
                </p>
                <h3 className="mt-3 font-display text-[clamp(1.8rem,1.45rem+1.5vw,2.5rem)] leading-tight text-ivory [text-shadow:0_2px_12px_rgba(0,0,0,.35)]">{formatDayLong(day, lang)}</h3>
              </div>
              {/* the tear line */}
              <div aria-hidden="true" className="relative h-0">
                <span className="absolute inset-x-[18px] top-0 border-t border-dashed border-gold/40" />
              </div>
              {/* the stub: countdown and actions */}
              <div className={`${cardFace} rounded-b-[8px] border border-t-0 px-5 pb-5 pt-6`} style={notch('top')}>
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 bottom-2 h-[calc(100%-0.5rem)] rounded-b-[5px] border border-t-0 border-gold/15" />
                <CornerFlourish className="pointer-events-none absolute bottom-1.5 left-1.5 h-9 w-9 -rotate-90 text-gold/55" />
                <CornerFlourish className="pointer-events-none absolute bottom-1.5 right-1.5 h-9 w-9 rotate-180 text-gold/55" />
                <div className="relative">
                  {phase === 'after' ? (
                    <p className="px-2 py-3 text-center font-display text-[length:var(--step-2)] italic leading-snug text-gold-light">{t('calendar.postEvent')}</p>
                  ) : active.status === 'today' ? (
                    <div className="px-2 py-1 text-center">
                      <p className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-4 py-1.5 text-label font-semibold uppercase tracking-[0.26em] text-gold-light">
                        <CalendarHeart className="h-4 w-4" aria-hidden="true" /> {t('calendar.today')}
                      </p>
                      <p className="mt-4 font-display text-[length:var(--step-2)] leading-snug text-ivory">{t('calendar.todayMessage')}</p>
                      {!active.dateBased && active.remaining.totalMs > 0 && (
                        <p className="mt-2 text-ivory/75">
                          {t('calendar.beginsAt', { time: formatClock(day.startTime, lang) ?? '', hours: active.remaining.hours, minutes: active.remaining.minutes })}
                        </p>
                      )}
                    </div>
                  ) : active.status === 'past' ? (
                    <p className="px-2 py-3 text-center font-display text-[length:var(--step-2)] italic leading-snug text-ivory/85">
                      {t('calendar.pastDay')}
                      {otherClock.status === 'today' ? ` ${t('calendar.continuesToday')}` : ''}
                    </p>
                  ) : (
                    <div>
                      <Countdown clock={active} />
                      <p className="mt-3 text-center text-[0.84rem] leading-relaxed text-ivory/70">
                        {active.dateBased
                          ? t('calendar.dateBasedNote', { date: formatDayLong(day, lang) })
                          : t('calendar.timedNote', { time: formatTimeWords(day.startTime, lang) ?? '' })}
                      </p>
                    </div>
                  )}

                  {/* what happens that day is told in the Celebrations; saving both dates lives here */}
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-gold/20 pt-4">
                    <CalendarMenu days={wedding.days} tone="dark" />
                    <button
                      type="button"
                      onClick={() => scrollToSection(day.id === 'day-1' ? 'aaratakshate' : 'muhurta', prefersReducedMotion)}
                      className="inline-flex min-h-11 items-center gap-2 text-label font-semibold uppercase tracking-[0.22em] text-gold-light underline-offset-[6px] transition-colors hover:text-ivory hover:underline"
                    >
                      {t('calendar.viewSchedule')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
