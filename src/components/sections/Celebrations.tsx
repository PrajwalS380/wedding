import { useEffect, useRef, useState } from 'react'
import { Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import { wedding } from '../../data/wedding'
import { SCENES } from '../../data/sceneArt'
import { dayOfMonth, formatTimeWords, formatWeekday } from '../../lib/dates'
import { useReveal } from '../../hooks/useReveal'
import { useI18n } from '../../i18n/useI18n'
import { GlanceChapter, Interlude, MuhurtaChapter, ReceptionChapter, VenueChapter } from '../celebrations/Chapters'

/**
 * "From dusk to dawn" — the two wedding days told as one scroll: sunset (at a
 * glance), twilight, the night of the Aaratakshate, the misty dawn, the sunrise
 * of the Vivaha Muhurta, and daylight for the venue and guest services.
 */
export function Celebrations() {
  const section = useRef<HTMLElement>(null)
  const { t, lang } = useI18n()
  const [active, setActive] = useState('glance')
  const [shown, setShown] = useState(false)
  const [d1, d2] = wedding.days
  useReveal(section)

  // the sky clock follows whichever chapter crosses the middle of the screen
  useEffect(() => {
    const root = section.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    // only over scenery: the chip hides while paper (venue, guest services…) passes beneath it
    const over = new Set<Element>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            over.add(e.target)
            setActive((e.target as HTMLElement).dataset.clock ?? 'glance')
          } else over.delete(e.target)
        }
        setShown(over.size > 0)
      },
      { rootMargin: '-6% 0px -88% 0px' },
    )
    root.querySelectorAll('[data-clock]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const clock: Record<string, [typeof Sun, string]> = {
    glance: [Sunset, `${formatWeekday(d1, 'long', lang)} · ${t('celebrations.evening')}`],
    twilight: [Moon, `${formatWeekday(d1, 'long', lang)} · ${t('celebrations.dusk')}`],
    aaratakshate: [Moon, `${formatWeekday(d1, 'short', lang)} ${dayOfMonth(d1)} · ${formatTimeWords(d1.startTime, lang) ?? ''}`],
    dawn: [Sunrise, `${formatWeekday(d2, 'long', lang)} · ${t('celebrations.dawn')}`],
    muhurta: [Sun, `${formatWeekday(d2, 'short', lang)} ${dayOfMonth(d2)} · ${formatTimeWords(d2.startTime, lang) ?? ''}`],
    venue: [Sun, `${t('celebrations.bothDays')} · ${t('venue.city')}`],
  }
  const [Icon, label] = clock[active] ?? clock.glance

  return (
    <section ref={section} id="celebrations" aria-labelledby="celebrations-title" className="relative isolate bg-night">
      {/* the sky clock: which part of the two days the scenery shows */}
      <div aria-hidden="true" className="pointer-events-none sticky top-[calc(var(--safe-top)+0.75rem)] z-30 h-0 lg:top-[calc(var(--nav-h)+0.75rem)]">
        <div className="container-wide">
          <span
            key={active}
            className={`inline-flex h-9 items-center gap-2 rounded-full border border-gold-light/35 bg-[rgba(8,8,18,.42)] px-3.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-gold-light backdrop-blur-md transition-opacity duration-500 indic-boost ${
              shown ? 'animate-[caption-in_.5s_var(--ease-silk)_both] opacity-100' : 'opacity-0'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </span>
        </div>
      </div>

      <GlanceChapter />
      <Interlude art={SCENES.twilight} day={d1} clock="twilight" />
      <ReceptionChapter day={d1} />
      <Interlude art={SCENES.dawn} day={d2} clock="dawn" />
      <MuhurtaChapter day={d2} />
      <VenueChapter />
    </section>
  )
}
