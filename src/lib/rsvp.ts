/**
 * WhatsApp RSVP — builds the guest's reply as a readable message (in the
 * language they are viewing the invitation in) and a `wa.me` link that opens
 * a chat with the family, message prefilled.
 *
 * Nothing is sent or stored by the website: WhatsApp opens with the text
 * ready, and the guest reviews it and taps Send themselves.
 */
import { wedding } from '../data/wedding'
import type { Lang } from '../i18n/languages'
import { translator } from '../i18n/translate'
import { formatDayMonthYearFull } from './dates'

export type Attendance = 'yes' | 'no'

export interface RsvpReply {
  name: string
  attendance: Attendance
  /** Number of attendees including the guest; only for acceptances, optional. */
  guests?: number | null
}

/** "15 November 2026 and 16 November 2026" — from the configured wedding days, in `lang`. */
function weddingDatesLine(lang: Lang): string {
  const t = translator(lang)
  return wedding.days.map((d) => formatDayMonthYearFull(d, lang)).join(` ${t('rsvpMessage.and')} `)
}

/** The message the guest will see (and send) in WhatsApp. */
export function buildRsvpMessage(reply: RsvpReply, lang: Lang = 'en'): string {
  const t = translator(lang)
  const lines = [
    t('rsvpMessage.heading'),
    '',
    t('rsvpMessage.greeting'),
    '',
    t('rsvpMessage.name', { name: reply.name.trim().replace(/\s+/g, ' ') }),
    t('rsvpMessage.attendance', { value: t(reply.attendance === 'yes' ? 'rsvp.accepts' : 'rsvp.declines') }),
  ]
  if (reply.attendance === 'yes' && reply.guests) lines.push(t('rsvpMessage.attendees', { count: reply.guests }))
  lines.push(
    t('rsvpMessage.dates', { dates: weddingDatesLine(lang) }),
    t('rsvpMessage.venue', { venue: t('venue.name'), city: t('venue.city') }),
    '',
  )
  if (reply.attendance === 'no') lines.push(t('rsvpMessage.wishes'))
  lines.push(t('rsvpMessage.thanks'))
  return lines.join('\n')
}

/**
 * `https://wa.me/<number>?text=<message>` with the message percent-encoded
 * (encodeURIComponent: spaces → %20, new lines → %0A, '&', '#', '+' and every
 * non-ASCII letter escaped), so guest input can never alter the URL.
 */
export function whatsappRsvpUrl(message: string, number = wedding.rsvp.whatsappNumber): string {
  const digits = number.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
