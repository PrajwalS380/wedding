import { wedding, type CelebrationDay } from '../data/wedding'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/

export interface DateParts {
  year: number
  month: number
  day: number
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function ordinalSuffix(n: number): string {
  return ordinal(n).replace(String(n), '')
}

export function parseIsoDate(date: string | null): DateParts | null {
  if (!date) return null
  const m = ISO_DATE.exec(date)
  if (!m) return null
  const parts = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
  // reject impossible dates such as 2026-02-31
  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  if (check.getUTCMonth() !== parts.month - 1 || check.getUTCDate() !== parts.day) return null
  return parts
}

export function parseTime(time: string | null): { hour: number; minute: number } | null {
  if (!time) return null
  const m = HH_MM.exec(time)
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null
}

/**
 * Intl formatters are expensive to construct (tens of ms on a slow phone), so
 * each distinct locale + options combination is built once and reused.
 */
const formatters = new Map<string, Intl.DateTimeFormat>()
function formatter(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(opts)
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, opts)
    formatters.set(key, f)
  }
  return f
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function tzOffsetMs(instant: number, timeZone: string): number {
  const parts = formatter('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - (instant - (instant % 1000))
}

/** 'YYYY-MM-DD' calendar date of an instant in `timeZone` (default: the wedding's, IST). */
export function zonedDateKey(instant: Date, timeZone: string = wedding.timezone): string {
  const parts = formatter('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Converts a wall-clock time in `timeZone` to a UTC instant. */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, timeZone: string = wedding.timezone): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const first = guess - tzOffsetMs(guess, timeZone)
  const second = guess - tzOffsetMs(first, timeZone)
  return new Date(second)
}

/** Day of month for a configured celebration day. */
export function dayOfMonth(day: CelebrationDay): number {
  return parseIsoDate(day.date)?.day ?? NaN
}

/*
 * Calendar-date formatting. The wedding dates are fixed calendar days, so they
 * are spelled out from plain English tables: identical in every browser and
 * timezone, and free of Intl start-up cost on slow phones.
 */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const weekdayOf = (p: DateParts) => WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]

/** "Sunday, 15 November 2026" */
export function formatDayLong(day: CelebrationDay): string {
  const p = parseIsoDate(day.date)
  return p ? `${weekdayOf(p)}, ${p.day} ${MONTHS[p.month - 1]} ${p.year}` : ''
}

/** "Sunday" (or "Sun") */
export function formatWeekday(day: CelebrationDay, style: 'long' | 'short' = 'long'): string {
  const p = parseIsoDate(day.date)
  if (!p) return ''
  const w = weekdayOf(p)
  return style === 'short' ? w.slice(0, 3) : w
}

/** "15 Nov" */
export function formatDayMonthShort(day: CelebrationDay): string {
  const p = parseIsoDate(day.date)
  return p ? `${p.day} ${MONTHS[p.month - 1].slice(0, 3)}` : ''
}

/** "November 2026" */
export function formatDayMonthYear(day: CelebrationDay): string {
  const p = parseIsoDate(day.date)
  return p ? `${MONTHS[p.month - 1]} ${p.year}` : ''
}

/** "10:30 am IST" for a confirmed 'HH:mm' in the wedding timezone. */
export function formatClock(time: string | null): string | null {
  const t = parseTime(time)
  if (!t) return null
  const h12 = ((t.hour + 11) % 12) + 1
  return `${h12}:${String(t.minute).padStart(2, '0')} ${t.hour < 12 ? 'am' : 'pm'} ${wedding.timezoneLabel}`
}

export interface DaySchedule {
  timeConfirmed: boolean
  /** Exact instants (only when times are confirmed). */
  start: Date | null
  end: Date | null
  parts: DateParts | null
}

export function getDaySchedule(day: CelebrationDay): DaySchedule {
  const parts = parseIsoDate(day.date)
  const s = parseTime(day.startTime)
  const e = parseTime(day.endTime)
  if (!parts) return { timeConfirmed: false, start: null, end: null, parts: null }
  return {
    timeConfirmed: Boolean(s),
    start: s ? zonedToUtc(parts.year, parts.month, parts.day, s.hour, s.minute) : null,
    end: e ? zonedToUtc(parts.year, parts.month, parts.day, e.hour, e.minute) : null,
    parts,
  }
}

export interface WeddingTimeline {
  first: CelebrationDay
  last: CelebrationDay
  /** "15th & 16th" */
  daysLabel: string
  /** "November 2026" (or "November – December 2026" style when months differ) */
  monthYearLabel: string
  /** "15 & 16 November 2026" */
  datesLabel: string
}

export function getTimeline(): WeddingTimeline {
  const [first, last] = wedding.days
  const m1 = formatDayMonthYear(first)
  const m2 = formatDayMonthYear(last)
  const sameMonth = m1 === m2
  return {
    first,
    last,
    daysLabel: `${ordinal(dayOfMonth(first))} & ${ordinal(dayOfMonth(last))}`,
    monthYearLabel: sameMonth ? m1 : `${m1} – ${m2}`,
    datesLabel: sameMonth ? `${dayOfMonth(first)} & ${dayOfMonth(last)} ${m1}` : `${dayOfMonth(first)} ${m1} & ${dayOfMonth(last)} ${m2}`,
  }
}
