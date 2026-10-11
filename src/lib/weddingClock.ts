/**
 * The Living Wedding Calendar's clock — pure functions, no React.
 *
 * Interpretation rules (consistent everywhere):
 *  • "Today" is decided by the visitor's *local* calendar date.
 *  • A day with no confirmed start time is counted down *date-based*: to
 *    00:00 on that calendar date in the visitor's local time — and the UI says
 *    so, rather than implying a ceremony start time.
 *  • A day with a confirmed `startTime` counts down to that exact instant
 *    (interpreted in the wedding timezone, IST).
 *  • Remaining time is clamped at zero: a negative countdown is impossible.
 */
import { wedding, type CelebrationDay, type DayId } from '../data/wedding'
import { getDaySchedule, parseIsoDate } from './dates'

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

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' of an instant in the visitor's local timezone. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** The instant a day's countdown targets, and whether it is date-based. */
export function dayTarget(day: CelebrationDay): { target: Date; dateBased: boolean } {
  const schedule = getDaySchedule(day)
  if (schedule.timeConfirmed && schedule.start) return { target: schedule.start, dateBased: false }
  const p = parseIsoDate(day.date)
  if (!p) throw new Error(`Invalid wedding date: ${day.date}`)
  return { target: new Date(p.year, p.month - 1, p.day, 0, 0, 0, 0), dateBased: true }
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
  const today = localDateKey(now)
  const status: DayStatus = today === day.date ? 'today' : today < day.date ? 'upcoming' : 'past'
  return { day, status, target, dateBased, remaining: splitRemaining(target.getTime() - now.getTime()) }
}

export function getPhase(now: Date): CelebrationPhase {
  const [first, second] = wedding.days
  const today = localDateKey(now)
  if (today < first.date) return 'before'
  if (today === first.date) return 'day-1'
  if (today <= second.date) return 'day-2'
  return 'after'
}

/** The day the calendar opens on: the current or next celebration day. */
export function defaultDayId(phase: CelebrationPhase): DayId {
  return phase === 'day-2' ? 'day-2' : 'day-1'
}
