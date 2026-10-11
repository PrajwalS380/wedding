import { wedding, type CelebrationDay } from '../data/wedding'
import type { Lang } from '../i18n/languages'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/

export interface DateParts {
  year: number
  month: number
  day: number
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

/**
 * Zones with a single UTC offset for every date this site deals with. India has
 * been +05:30 with no daylight saving since 1945, so the wedding's own zone is
 * reckoned arithmetically — Intl's first time-zone lookup costs hundreds of ms
 * on a mid-range phone. Any other zone still goes through Intl.
 */
const FIXED_OFFSET_MS: Readonly<Record<string, number>> = {
  'Asia/Kolkata': 330 * 60_000,
  'Asia/Calcutta': 330 * 60_000,
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function tzOffsetMs(instant: number, timeZone: string): number {
  const fixed = FIXED_OFFSET_MS[timeZone]
  if (fixed !== undefined) return fixed
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
  const fixed = FIXED_OFFSET_MS[timeZone]
  if (fixed !== undefined) {
    const local = new Date(instant.getTime() + fixed)
    return `${local.getUTCFullYear()}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}`
  }
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
 * are spelled out from explicit tables per language: identical in every
 * browser and timezone, and free of Intl start-up cost on slow phones.
 * Numerals stay in the familiar 0–9 form in every language for legibility.
 */
interface LocaleDates {
  weekdays: readonly string[]
  weekdaysShort: readonly string[]
  months: readonly string[]
  monthsShort: readonly string[]
  /** Word joining two dates: "15 & 16", "15 ಮತ್ತು 16", "15 और 16". */
  and: string
  ordinal: (n: number) => string
  am: string
  pm: string
  /** Order of the clock label: "10:30 am" vs "ಪೂರ್ವಾಹ್ನ 10:30". */
  periodFirst: boolean
}

const englishOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

const LOCALE_DATES: Record<Lang, LocaleDates> = {
  en: {
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    and: '&',
    ordinal: englishOrdinal,
    am: 'am',
    pm: 'pm',
    periodFirst: false,
  },
  kn: {
    weekdays: ['ಭಾನುವಾರ', 'ಸೋಮವಾರ', 'ಮಂಗಳವಾರ', 'ಬುಧವಾರ', 'ಗುರುವಾರ', 'ಶುಕ್ರವಾರ', 'ಶನಿವಾರ'],
    weekdaysShort: ['ಭಾನು', 'ಸೋಮ', 'ಮಂಗಳ', 'ಬುಧ', 'ಗುರು', 'ಶುಕ್ರ', 'ಶನಿ'],
    months: ['ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್', 'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್'],
    monthsShort: ['ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್', 'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್'],
    and: 'ಮತ್ತು',
    ordinal: () => '',
    am: 'ಪೂರ್ವಾಹ್ನ',
    pm: 'ಅಪರಾಹ್ನ',
    periodFirst: true,
  },
  hi: {
    weekdays: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
    weekdaysShort: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
    months: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
    monthsShort: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
    and: 'और',
    ordinal: () => '',
    am: 'पूर्वाह्न',
    pm: 'अपराह्न',
    periodFirst: true,
  },
}

const weekdayIndex = (p: DateParts) => new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()

/** "15th" (English) or "15" (Kannada, Hindi). */
export function ordinal(n: number, lang: Lang = 'en'): string {
  return `${n}${LOCALE_DATES[lang].ordinal(n)}`
}

/** "th" for 15 in English; empty in Kannada and Hindi (dates are written without ordinals). */
export function ordinalSuffix(n: number, lang: Lang = 'en'): string {
  return LOCALE_DATES[lang].ordinal(n)
}

/** "Sunday, 15 November 2026" · "ಭಾನುವಾರ, 15 ನವೆಂಬರ್ 2026" · "रविवार, 15 नवंबर 2026" */
export function formatDayLong(day: CelebrationDay, lang: Lang = 'en'): string {
  const p = parseIsoDate(day.date)
  const L = LOCALE_DATES[lang]
  return p ? `${L.weekdays[weekdayIndex(p)]}, ${p.day} ${L.months[p.month - 1]} ${p.year}` : ''
}

/** "Sunday" / "Sun" in the given language. */
export function formatWeekday(day: CelebrationDay, style: 'long' | 'short' = 'long', lang: Lang = 'en'): string {
  const p = parseIsoDate(day.date)
  if (!p) return ''
  const L = LOCALE_DATES[lang]
  return (style === 'short' ? L.weekdaysShort : L.weekdays)[weekdayIndex(p)]
}

/** "15 Nov" · "15 ನವೆಂಬರ್" · "15 नवंबर" */
export function formatDayMonthShort(day: CelebrationDay, lang: Lang = 'en'): string {
  const p = parseIsoDate(day.date)
  return p ? `${p.day} ${LOCALE_DATES[lang].monthsShort[p.month - 1]}` : ''
}

/** "November 2026" in the given language. */
export function formatDayMonthYear(day: CelebrationDay, lang: Lang = 'en'): string {
  const p = parseIsoDate(day.date)
  return p ? `${LOCALE_DATES[lang].months[p.month - 1]} ${p.year}` : ''
}

/** "15 November 2026" in the given language (no weekday). */
export function formatDayMonthYearFull(day: CelebrationDay, lang: Lang = 'en'): string {
  const p = parseIsoDate(day.date)
  return p ? `${p.day} ${LOCALE_DATES[lang].months[p.month - 1]} ${p.year}` : ''
}

/** "10:30 am IST" · "ಪೂರ್ವಾಹ್ನ 10:30 IST" for a confirmed 'HH:mm' in the wedding timezone. */
export function formatClock(time: string | null, lang: Lang = 'en'): string | null {
  const t = parseTime(time)
  if (!t) return null
  const L = LOCALE_DATES[lang]
  const h12 = ((t.hour + 11) % 12) + 1
  const clock = `${h12}:${String(t.minute).padStart(2, '0')}`
  const period = t.hour < 12 ? L.am : L.pm
  return `${L.periodFirst ? `${period} ${clock}` : `${clock} ${period}`} ${wedding.timezoneLabel}`
}

/** The word joining two dates or names in a language ("&", "ಮತ್ತು", "और"). */
export const dateJoiner = (lang: Lang = 'en'): string => LOCALE_DATES[lang].and

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
  /** "15th & 16th" · "15 ಮತ್ತು 16" · "15 और 16" */
  daysLabel: string
  /** "November 2026" (or "November – December 2026" style when months differ) */
  monthYearLabel: string
  /** "15 & 16 November 2026" · "15 ಮತ್ತು 16 ನವೆಂಬರ್ 2026" · "15 और 16 नवंबर 2026" */
  datesLabel: string
}

export function getTimeline(lang: Lang = 'en'): WeddingTimeline {
  const [first, last] = wedding.days
  const and = dateJoiner(lang)
  const m1 = formatDayMonthYear(first, lang)
  const m2 = formatDayMonthYear(last, lang)
  const sameMonth = m1 === m2
  const d1 = dayOfMonth(first)
  const d2 = dayOfMonth(last)
  return {
    first,
    last,
    daysLabel: `${ordinal(d1, lang)} ${and} ${ordinal(d2, lang)}`,
    monthYearLabel: sameMonth ? m1 : `${m1} – ${m2}`,
    datesLabel: sameMonth ? `${d1} ${and} ${d2} ${m1}` : `${d1} ${m1} ${and} ${d2} ${m2}`,
  }
}
