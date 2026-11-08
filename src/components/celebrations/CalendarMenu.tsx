import { useId, useState } from 'react'
import { CalendarPlus, Download, ExternalLink } from 'lucide-react'
import { wedding, type CelebrationDay } from '../../data/wedding'
import { calendarEntryForDay, downloadIcs, googleCalendarUrl, type CalendarEntry } from '../../lib/calendar'
import { formatDayMonthShort } from '../../lib/dates'
import { usePopover } from '../../hooks/usePopover'
import { useI18n } from '../../i18n/useI18n'
import { actionClass } from './styles'

/**
 * "Add to calendar": a small menu with Google Calendar and a downloadable
 * .ics file (Apple Calendar, Outlook…). Timed entries for confirmed times;
 * the location is always the official address.
 */
export function CalendarMenu({
  days,
  tone,
  fill = false,
  align = 'start',
  className = '',
}: {
  days: CelebrationDay[]
  tone: 'dark' | 'light'
  fill?: boolean
  /** which edge of the button the menu lines up with */
  align?: 'start' | 'end'
  className?: string
}) {
  const { t, lang } = useI18n()
  const { open, setOpen, close, root, trigger } = usePopover()
  const [done, setDone] = useState(false)
  const id = useId()
  const entries = days.map((d) => [d, calendarEntryForDay(d, lang)] as const).filter((e): e is readonly [CelebrationDay, CalendarEntry] => e[1] !== null)
  const ics = (list: CalendarEntry[], suffix: string) => {
    downloadIcs(list, `${wedding.calendarExport.fileName}${suffix}`)
    setDone(true)
    close()
  }
  const item =
    tone === 'dark'
      ? 'flex min-h-11 w-full items-center gap-2.5 rounded-[3px] px-3 text-left text-[0.92rem] text-ivory/90 transition-colors hover:bg-gold/10 hover:text-ivory'
      : 'flex min-h-11 w-full items-center gap-2.5 rounded-[3px] px-3 text-left text-[0.92rem] text-ink transition-colors hover:bg-maroon/8'
  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={tone === 'dark' ? actionClass.dark : fill ? actionClass.lightFill : actionClass.light}
      >
        <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('celebrations.addToCalendar')}
      </button>
      {open && (
        <div
          id={id}
          role="group"
          aria-label={t('celebrations.addToCalendar')}
          className={`absolute bottom-[calc(100%+0.5rem)] ${align === 'end' ? 'right-0' : 'left-0'} z-40 w-[min(17rem,calc(100vw-2.5rem))] rounded-[4px] p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,.6)] ${
            tone === 'dark' ? 'border border-gold/40 bg-night/95 backdrop-blur-md' : 'border border-brass/50 bg-[#fbf3e3]'
          }`}
        >
          {entries.length > 1 && (
            <button type="button" className={item} onClick={() => ics(entries.map((e) => e[1]), '')}>
              <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('celebrations.icsBoth')}
            </button>
          )}
          {entries.map(([d, e]) => (
            <a key={d.id} href={googleCalendarUrl(e)} target="_blank" rel="noopener noreferrer" className={item} onClick={() => close()}>
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              {entries.length > 1 ? t('celebrations.google', { date: formatDayMonthShort(d, lang) }) : t('celebrations.googleCalendar')}
              <span className="sr-only"> {t('common.newTab')}</span>
            </a>
          ))}
          {entries.length === 1 && (
            <button type="button" className={item} onClick={() => ics([entries[0][1]], `-${entries[0][0].id}`)}>
              <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('celebrations.icsFile')}
            </button>
          )}
        </div>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {done ? t('celebrations.icsDone') : ''}
      </p>
    </div>
  )
}
