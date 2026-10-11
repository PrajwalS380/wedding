/**
 * The Living Wedding Calendar's clock — pure functions, no React.
 *
 * Interpretation rules (consistent everywhere, for every visitor):
 *  • Everything is reckoned in the wedding's timezone, India Standard Time
 *    (`wedding.timezone`), so a guest abroad sees the same day and countdown
 *    as a guest in Davangere.
 *  • "Today" is the current calendar date in IST.
 *  • A day with no confirmed start time is counted down *date-based*: to
 *    00:00 IST on that date — and the UI says so, rather than implying a
 *    ceremony start time.
 *  • A day with a confirmed `startTime` counts down to that exact IST instant.
 *  • Wedding dates are parsed field by field (never `new Date('YYYY-MM-DD')`,
 *    which browsers read as UTC midnight).
 *  • Remaining time is clamped at zero: a negative countdown is impossible.
 */
import { wedding, type CelebrationDay, type DayId } from '../data/wedding'
import { getDaySchedule, parseIsoDate, zonedDateKey, zonedToUtc } from './dates'

export type DayStatus = 'upcoming' | 'today' | 'past'
export type CelebrationPhase = 'before' | 'day-1' | 'day-2' | 'after'

export interface Remaining {
  totalMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export interface DayClock {
  day: CelebrationDay
  status: DayStatus
  /** The instant being counted down to. */
  target: Date
  /** True when counting to the start of the calendar date (no confirmed time). */
  dateBased: boolean
  remaining: Remaining
}

/** 'YYYY-MM-DD' of an instant in the wedding's timezone (IST). */
export const weddingDateKey = (d: Date): string => zonedDateKey(d, wedding.timezone)

/** The instant a day's countdown targets, and whether it is date-based. */
export function dayTarget(day: CelebrationDay): { target: Date; dateBased: boolean } {
  const schedule = getDaySchedule(day)
  if (schedule.timeConfirmed && schedule.start) return { target: schedule.start, dateBased: false }
  const p = parseIsoDate(day.date)
  if (!p) throw new Error(`Invalid wedding date: ${day.date}`)
  return { target: zonedToUtc(p.year, p.month, p.day, 0, 0, wedding.timezone), dateBased: true }
}

export function splitRemaining(ms: number): Remaining {
  const totalMs = Math.max(0, Number.isFinite(ms) ? ms : 0)
  const total = Math.floor(totalMs / 1000)
  return {
    totalMs,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

export function getDayClock(day: CelebrationDay, now: Date): DayClock {
  const { target, dateBased } = dayTarget(day)
  const today = weddingDateKey(now)
  const status: DayStatus = today === day.date ? 'today' : today < day.date ? 'upcoming' : 'past'
  return { day, status, target, dateBased, remaining: splitRemaining(target.getTime() - now.getTime()) }
}

export function getPhase(now: Date): CelebrationPhase {
  const [first, second] = wedding.days
  const today = weddingDateKey(now)
  if (today < first.date) return 'before'
  if (today === first.date) return 'day-1'
  if (today <= second.date) return 'day-2'
  return 'after'
}

/** The day the calendar opens on: the current or next celebration day. */
export function defaultDayId(phase: CelebrationPhase): DayId {
  return phase === 'day-2' ? 'day-2' : 'day-1'
}
