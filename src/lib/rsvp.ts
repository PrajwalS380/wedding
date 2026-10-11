/**
 * WhatsApp RSVP — builds the guest's reply as a readable message and a
 * `wa.me` link that opens a chat with the family, message prefilled.
 *
 * Nothing is sent or stored by the website: WhatsApp opens with the text
 * ready, and the guest reviews it and taps Send themselves.
 */
import { wedding } from '../data/wedding'
import { formatDayMonthYear, dayOfMonth } from './dates'

export type Attendance = 'yes' | 'no'

export interface RsvpReply {
  name: string
  attendance: Attendance
  /** Number of attendees including the guest; only for acceptances, optional. */
  guests?: number | null
}

export const ATTENDANCE_LABEL: Record<Attendance, string> = {
  yes: 'Joyfully accepts',
  no: 'Regretfully declines',
}

/** "15 November 2026 and 16 November 2026" — from the configured wedding days. */
function weddingDatesLine(): string {
  return wedding.days.map((d) => `${dayOfMonth(d)} ${formatDayMonthYear(d)}`).join(' and ')
}

/** The message the guest will see (and send) in WhatsApp. */
export function buildRsvpMessage(reply: RsvpReply): string {
  const { pair } = wedding.couple
  const lines = [
    `Wedding RSVP — ${pair}`,
    '',
    `Hello! I would like to share my RSVP for the wedding of ${pair}.`,
    '',
    `Name: ${reply.name.trim().replace(/\s+/g, ' ')}`,
    `Attendance: ${ATTENDANCE_LABEL[reply.attendance]}`,
  ]
  if (reply.attendance === 'yes' && reply.guests) lines.push(`Number of attendees: ${reply.guests}`)
  lines.push(`Wedding dates: ${weddingDatesLine()}`, `Venue: ${wedding.venue.name}, ${wedding.venue.city}`, '')
  if (reply.attendance === 'no') lines.push(`With warm wishes to ${pair} for their celebrations.`)
  lines.push('Thank you.')
  return lines.join('\n')
}

/**
 * `https://wa.me/<number>?text=<message>` with the message percent-encoded
 * (encodeURIComponent: spaces → %20, new lines → %0A, '&', '#', '+' escaped),
 * so guest input can never alter the URL.
 */
export function whatsappRsvpUrl(message: string, number = wedding.rsvp.whatsappNumber): string {
  const digits = number.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
