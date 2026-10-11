import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useGSAP } from '@gsap/react'
import { ArrowRight, CalendarHeart } from 'lucide-react'
import { localized, wedding, type DayId } from '../../data/wedding'
import { dayOfMonth, formatClock, formatDayLong, formatWeekday, getTimeline, ordinalSuffix, parseIsoDate } from '../../lib/dates'
import { defaultDayId, getDayClock, getPhase, type DayClock } from '../../lib/weddingClock'
import { openCompass } from '../../lib/compass'
import { useNow, currentTime } from '../../hooks/useNow'
import { useInView } from '../../hooks/useInView'
import { useMotion } from '../../hooks/motion'
import { gsap, useReveal } from '../../hooks/useReveal'
import { CalendarDial } from '../ui/CalendarDial'
import { useI18n } from '../../i18n/useI18n'
import { MandapMotif } from '../ui/Ornaments'

const pad = (n: number) => String(n).padStart(2, '0')

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
      <div className="flex items-end gap-4" aria-hidden="true">
        <span className="font-display text-[clamp(4.4rem,3.2rem+5vw,7.2rem)] font-medium leading-[0.8] lining-nums tabular-nums text-ivory">{r.days}</span>
        <span className="mb-1.5 flex flex-col">
          <span className="font-display text-[1.6rem] leading-none text-gold-light">{r.days === 1 ? t('calendar.day') : t('calendar.days')}</span>
          <span className="mt-1 text-label font-semibold uppercase tracking-[0.28em] text-gold/80">{t('calendar.toGo')}</span>
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3 text-ivory/85" aria-hidden="true">
        {(
          [
            [r.hours, t('calendar.hours')],
            [r.minutes, t('calendar.minutes')],
            [r.seconds, t('calendar.seconds')],
          ] as const
        ).map(([v, label], i) => (
          <span key={label} className="flex items-baseline gap-1.5">
            {i > 0 && <span className="mr-1.5 text-gold/45">·</span>}
            <span className="font-display text-[1.7rem] leading-none lining-nums tabular-nums">{pad(v)}</span>
            <span className="text-label font-semibold uppercase tracking-[0.2em] text-gold/80">{label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

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
            className="relative mx-auto w-full max-w-[30rem] border-l-0 border-gold/30 lg:mx-0 lg:border-l lg:pl-12"
          >
            <div key={selected + phase} className={ambientMotion ? 'animate-[caption-in_.8s_var(--ease-silk)_both]' : ''}>
              <p className="eyebrow text-gold">
                {t(`days.${day.id}`)} · {formatWeekday(day, 'long', lang)}
              </p>
              <h3 className="mt-3 font-display text-[clamp(1.9rem,1.5rem+1.6vw,2.7rem)] leading-tight text-ivory">{formatDayLong(day, lang)}</h3>

              <div className="mt-7">
                {phase === 'after' ? (
                  <p className="font-display text-[length:var(--step-2)] italic leading-snug text-gold-light">{t('calendar.postEvent')}</p>
                ) : active.status === 'today' ? (
                  <div>
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
                  <p className="font-display text-[length:var(--step-2)] italic leading-snug text-ivory/85">
                    {t('calendar.pastDay')}
                    {otherClock.status === 'today' ? ` ${t('calendar.continuesToday')}` : ''}
                  </p>
                ) : (
                  <div>
                    <Countdown clock={active} />
                    <p className="mt-4 max-w-sm text-[0.84rem] leading-relaxed text-ivory/65">
                      {active.dateBased
                        ? t('calendar.dateBasedNote', { date: formatDayLong(day, lang) })
                        : t('calendar.timedNote', { date: formatDayLong(day, lang), time: formatClock(day.startTime, lang) ?? '' })}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 border-t border-gold/20 pt-6">
                {day.events.length ? (
                  <ul className="space-y-3">
                    {day.events.map((ev) => (
                      <li key={ev.name.en} className="flex gap-4">
                        <span className="w-28 shrink-0 text-[0.82rem] text-gold-light">
                          {[formatClock(ev.startTime, lang), formatClock(ev.endTime, lang)].filter(Boolean).join(' – ') || t('common.timeToBeAnnounced')}
                        </span>
                        <span className="font-display text-[1.15rem] text-ivory">{localized(ev.name, lang)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <p className="font-display text-[1.25rem] text-ivory">{t('calendar.schedulePending')}</p>
                    <p className="mt-1 text-[0.86rem] leading-relaxed text-ivory/65">{t('calendar.schedulePendingNote')}</p>
                  </>
                )}
                <p className="mt-4 text-[0.86rem] text-ivory/70">
                  {t('venue.name')}, {t('venue.city')}
                </p>
                <button
                  type="button"
                  onClick={() => openCompass('east')}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-label font-semibold uppercase tracking-[0.22em] text-gold-light underline-offset-[6px] transition-colors hover:text-ivory hover:underline"
                >
                  {t('calendar.viewSchedule')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
