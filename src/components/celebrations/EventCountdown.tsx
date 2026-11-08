import { useRef } from 'react'
import type { CelebrationDay } from '../../data/wedding'
import { formatClock, formatDayLong } from '../../lib/dates'
import { getDayClock } from '../../lib/weddingClock'
import { useNow } from '../../hooks/useNow'
import { useInView } from '../../hooks/useInView'
import { useI18n } from '../../i18n/useI18n'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Live countdown to a ceremony's confirmed start (reckoned in India Standard
 * Time). Ticks only while on screen; never negative — on the day it says so,
 * and afterwards it thanks the guests.
 */
export function EventCountdown({ day, tone, layout }: { day: CelebrationDay; tone: 'dark' | 'light'; layout: 'inline' | 'boxes' }) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, { rootMargin: '120px' })
  const now = useNow(visible)
  const { t, lang } = useI18n()
  const c = getDayClock(day, now)
  const r = c.remaining
  const dark = tone === 'dark'
  const sr = t('calendar.srCountdownTimed', { days: r.days, hours: r.hours, minutes: r.minutes, time: formatClock(day.startTime, lang) ?? '', date: formatDayLong(day, lang) })

  let message: string | null = null
  if (c.status === 'past') message = t('celebrations.celebrated')
  else if (c.status === 'today') message = r.totalMs > 0 ? t('celebrations.todayBegins', { hours: r.hours, minutes: r.minutes }) : t('celebrations.todayNow')

  return (
    <div ref={ref}>
      {message ? (
        <p className={`font-display text-[1.25rem] italic leading-snug ${dark ? 'text-gold-light' : 'text-burgundy'}`}>{message}</p>
      ) : layout === 'inline' ? (
        <>
          <p className="sr-only">{sr}</p>
          <p aria-hidden="true" className={`flex flex-wrap items-baseline gap-x-2 text-[0.82rem] ${dark ? 'text-ivory/85' : 'text-ink'}`}>
            {(
              [
                [r.days, r.days === 1 ? t('calendar.day') : t('calendar.days')],
                [pad(r.hours), t('calendar.hours')],
                [pad(r.minutes), t('calendar.minutes')],
                [pad(r.seconds), t('calendar.seconds')],
              ] as const
            ).map(([v, label], i) => (
              <span key={i} className="inline-flex items-baseline gap-1">
                {i > 0 && <span className={dark ? 'text-gold/50' : 'text-brass'}>·</span>}
                <b className={`font-display text-[1.45rem] font-medium leading-none lining-nums tabular-nums ${dark ? 'text-gold-light' : 'text-maroon'}`}>{v}</b>
                <span className="indic-boost">{label}</span>
              </span>
            ))}
            <span className={`ml-1 text-label font-semibold uppercase tracking-[0.2em] ${dark ? 'text-gold/80' : 'text-brass-deep'}`}>{t('calendar.toGo')}</span>
          </p>
        </>
      ) : (
        <>
          <p className="sr-only">{sr}</p>
          <div aria-hidden="true">
            <div className="flex justify-center gap-2 lg:justify-start">
              {(
                [
                  [r.days, r.days === 1 ? t('calendar.day') : t('calendar.days')],
                  [pad(r.hours), t('calendar.hours')],
                  [pad(r.minutes), t('calendar.minutes')],
                  [pad(r.seconds), t('calendar.seconds')],
                ] as const
              ).map(([v, label], i) => (
                <div
                  key={i}
                  className="flex w-[4.4rem] flex-col items-center rounded-[3px] bg-[rgba(255,252,244,.4)] pb-1.5 pt-2 shadow-[inset_0_1px_3px_rgba(80,50,20,.28),inset_0_-1px_0_rgba(255,255,255,.6),0_0_0_1px_rgba(122,90,40,.3)]"
                >
                  <b className="font-display text-[1.75rem] font-semibold leading-none lining-nums tabular-nums text-maroon">{v}</b>
                  <span className="indic-boost mt-0.5 text-[0.7rem] font-semibold text-ink-soft">{label}</span>
                </div>
              ))}
            </div>
            <p className="indic-boost mt-2 text-center text-label font-semibold uppercase tracking-[0.22em] text-brass-deep lg:text-left">{t('calendar.toGo')}</p>
          </div>
        </>
      )}
    </div>
  )
}
