import { localized, wedding, type CelebrationDay } from '../data/wedding'
import type { Lang } from '../i18n/languages'
import { translator } from '../i18n/translate'
import { formatClock, getDaySchedule, type DateParts } from './dates'

const pad = (n: number) => String(n).padStart(2, '0')

function toIcsUtc(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function toIcsDate(p: DateParts): string {
  return `${p.year}${pad(p.month)}${pad(p.day)}`
}

function nextDay(p: DateParts): DateParts {
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + 1))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

/** RFC 5545 text escaping. */
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

/** Folds content lines to 75 octets (UTF-8 aware) as RFC 5545 requires. */
function fold(line: string): string {
  const enc = new TextEncoder()
  const out: string[] = []
  let current = ''
  let bytes = 0
  for (const ch of line) {
    const b = enc.encode(ch).length
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(current)
      current = ''
      bytes = 0
    }
    current += ch
    bytes += b
  }
  out.push(current)
  return out.join('\r\n ')
}

export interface CalendarEntry {
  uid: string
  title: string
  description: string
  location: string
  /** Timed events (only when both start and end times are confirmed) */
  start?: Date
  end?: Date
  /** All-day events (the default while timings are unconfirmed) */
  allDay?: DateParts
}

/**
 * One calendar entry per wedding day, written in the guest's language. All-day
 * unless BOTH start and end times are confirmed — no ceremony time or duration
 * is ever invented. The location stays the official address so map apps find it.
 */
export function calendarEntryForDay(day: CelebrationDay, lang: Lang = 'en'): CalendarEntry | null {
  const s = getDaySchedule(day)
  if (!s.parts) return null
  const t = translator(lang)
  const dayLabel = t(`days.${day.id}`)
  const lines: string[] = [t('calendarFile.description', { day: dayLabel })]
  if (day.events.length) {
    for (const ev of day.events) {
      const time = [formatClock(ev.startTime, lang), formatClock(ev.endTime, lang)].filter(Boolean).join(' – ')
      lines.push(`• ${localized(ev.name, lang)}${time ? ` (${time})` : ''}`)
    }
  } else {
    lines.push(t('calendarFile.schedulePending'))
  }
  if (s.timeConfirmed && !day.endTime) lines.push(t('calendarFile.beginsAt', { time: formatClock(day.startTime, lang) ?? '' }))
  lines.push('', t('calendarFile.venue', { address: wedding.venue.fullAddress }), t('calendarFile.directions', { url: wedding.venue.mapsUrl }))
  const base = {
    uid: `${wedding.calendarExport.fileName}-${day.id}@the-wedding-realm`,
    title: t('calendarFile.summary', { day: dayLabel }),
    description: lines.join('\n'),
    location: wedding.venue.fullAddress,
  }
  if (s.start && s.end && s.end > s.start) return { ...base, start: s.start, end: s.end }
  return { ...base, allDay: s.parts }
}

export function weddingCalendarEntries(lang: Lang = 'en'): CalendarEntry[] {
  return wedding.days.map((d) => calendarEntryForDay(d, lang)).filter((e): e is CalendarEntry => e !== null)
}

export function buildIcs(entries: CalendarEntry[]): string {
  const stamp = toIcsUtc(new Date())
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Wedding Realm//Wedding Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const entry of entries) {
    lines.push('BEGIN:VEVENT', `UID:${entry.uid}`, `DTSTAMP:${stamp}`)
    if (entry.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(entry.allDay)}`, `DTEND;VALUE=DATE:${toIcsDate(nextDay(entry.allDay))}`, 'TRANSP:TRANSPARENT')
    } else if (entry.start && entry.end) {
      lines.push(`DTSTART:${toIcsUtc(entry.start)}`, `DTEND:${toIcsUtc(entry.end)}`)
    }
    lines.push(`SUMMARY:${esc(entry.title)}`, `DESCRIPTION:${esc(entry.description)}`, `LOCATION:${esc(entry.location)}`, 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function googleCalendarUrl(entry: CalendarEntry): string {
  const dates = entry.allDay ? `${toIcsDate(entry.allDay)}/${toIcsDate(nextDay(entry.allDay))}` : `${toIcsUtc(entry.start!)}/${toIcsUtc(entry.end!)}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: entry.title,
    dates,
    details: entry.description,
    location: entry.location,
    ctz: wedding.timezone,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function downloadIcs(entries: CalendarEntry[], fileBase: string): void {
  const blob = new Blob([buildIcs(entries)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileBase}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
