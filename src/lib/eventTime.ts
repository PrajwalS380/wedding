import type { CelebrationDay } from '../data/wedding'
import type { Lang } from '../i18n/languages'
import type { Translate } from '../i18n/translate'
import { formatTimeRangeWords, formatTimeWords } from './dates'

/** "+91 90356 15991" for display; `tel:` links use the plain digits. */
export const displayPhone = (digits: string) => (digits.length === 12 && digits.startsWith('91') ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}` : `+${digits}`)

/** "7:30 pm onwards" · "ಸಂಜೆ 7:30 ರಿಂದ" · "9:20 – 10:30 am" · "ಬೆಳಗ್ಗೆ 9:20 ರಿಂದ 10:30 ರವರೆಗೆ" · "सुबह 9:20 से 10:30 बजे तक" */
export function timeText(start: string | null, end: string | null, t: Translate, lang: Lang): string {
  const range = formatTimeRangeWords(start, end, lang)
  if (range) return t('celebrations.timeRange', range)
  const one = formatTimeWords(start, lang)
  return one ? t('celebrations.fromTime', { time: one }) : t('common.timeToBeAnnounced')
}

/** The time of a day's (first) ceremony, falling back to the day's own times. */
export function dayTimeText(day: CelebrationDay, t: Translate, lang: Lang): string {
  const ev = day.events[0]
  return timeText(ev?.startTime ?? day.startTime, ev?.endTime ?? day.endTime, t, lang)
}
