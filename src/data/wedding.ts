/**
 * THE WEDDING REALM — single source of truth.
 *
 * Every fact shown on the site lives here. Anything the family has not yet
 * confirmed is `null` (or an empty list), and the UI renders a tasteful
 * "to be announced" state instead of inventing a value.
 *
 * CONFIRMED: the celebrations take place on 15 and 16 November 2026.
 *
 * Wording shown to guests (in English, Kannada and Hindi) lives in
 * src/i18n/dictionaries — this file holds the facts.
 *
 * WHEN TIMINGS ARE CONFIRMED: set `startTime` / `endTime` ('HH:mm', 24-hour,
 * in `timezone`) on a day, and add verified ceremonies to its `events` list.
 * The Living Calendar, the Compass schedule and the calendar export all read
 * from here — never hard-code dates in components.
 */

import { PRODUCTION_URL, RSVP_WHATSAPP_NUMBER } from './site'
import type { Lang } from '../i18n/languages'

export type DayId = 'day-1' | 'day-2'

/** Text given per language; English is required, other languages fall back to it. */
export type LocalizedText = { en: string } & Partial<Record<Lang, string>>

/** The text for `lang`, falling back to English. */
export const localized = (text: LocalizedText | null, lang: Lang): string | null => (text ? (text[lang] ?? text.en) : null)

/** A verified ceremony or function on one of the wedding days. */
export interface ScheduledEvent {
  /** e.g. { en: 'Muhurtham', kn: 'ಮುಹೂರ್ತ', hi: 'मुहूर्त' } — only once the family confirms it. */
  name: LocalizedText
  /** 'HH:mm' (24h) in `wedding.timezone`, or null if not yet confirmed. */
  startTime: string | null
  endTime: string | null
  description: LocalizedText | null
}

export interface CelebrationDay {
  /** Its label ("Day One", "ಮೊದಲ ದಿನ", …) comes from the `days` dictionary entry. */
  id: DayId
  /** Confirmed calendar date, 'YYYY-MM-DD'. */
  date: string
  /**
   * Optional start / end of the day's celebrations ('HH:mm' in `timezone`).
   * While unset, countdowns are *date-based*: they count to the start of the
   * calendar date in India Standard Time and say so.
   */
  startTime: string | null
  endTime: string | null
  /** Verified ceremonies only. Empty until the family confirms the schedule. */
  events: ScheduledEvent[]
  dressCode: LocalizedText | null
  note: LocalizedText | null
}

export interface RsvpConfig {
  /**
   * Guests reply through WhatsApp: the form builds their message and opens a
   * chat with this number (international format, digits only). Nothing is
   * sent or stored by the website itself — the guest reviews and taps Send.
   */
  whatsappNumber: string
  /** 'YYYY-MM-DD' or null when no deadline has been set. */
  respondBy: string | null
}

/** Only verified contact details — all null until the family provides them. */
export interface ContactConfig {
  name: string | null
  phone: string | null
  email: string | null
  whatsapp: string | null
}

const COUPLE = {
  bride: 'Vathsala',
  groom: 'Darshan',
  /**
   * Order used everywhere the two names appear together (titles, monogram,
   * invitation, sharing). Switch to ['Vathsala', 'Darshan'] to reverse it.
   */
  displayNames: ['Darshan', 'Vathsala'] as const,
}

const pair = `${COUPLE.displayNames[0]} & ${COUPLE.displayNames[1]}`
const pairAnd = `${COUPLE.displayNames[0]} and ${COUPLE.displayNames[1]}`

export const wedding = {
  projectName: 'The Wedding Realm',

  couple: {
    ...COUPLE,
    monogram: { first: COUPLE.displayNames[0][0], second: COUPLE.displayNames[1][0] },
    /** "Darshan & Vathsala" */
    pair,
    /** "Darshan and Vathsala" */
    pairAnd,
  },

  /** Explicitly chosen timezone for any confirmed times: the venue is in Karnataka, India (IST, UTC+05:30). */
  timezone: 'Asia/Kolkata',
  timezoneLabel: 'IST',

  /** The two confirmed wedding days. */
  days: [
    {
      id: 'day-1',
      date: '2026-11-15',
      startTime: null, // set 'HH:mm' once the family confirms
      endTime: null,
      events: [],
      dressCode: null,
      note: null,
    },
    {
      id: 'day-2',
      date: '2026-11-16',
      startTime: null,
      endTime: null,
      events: [],
      dressCode: null,
      note: null,
    },
  ] satisfies CelebrationDay[] as CelebrationDay[],

  /**
   * The venue's official name and address (as on Google Maps). Guests see a
   * localized form from the dictionaries; maps, the copied address and the
   * calendar file always use these official values.
   */
  venue: {
    name: 'Bapuji Samudhaya Bhavan',
    addressLines: ['Shamanur Road, Siddaveerappa Layout', 'Shamanur, Davangere', 'Karnataka 577004, India'],
    fullAddress:
      'Bapuji Samudhaya Bhavan, Shamanur Road, Siddaveerappa Layout, Shamanur, Davangere, Karnataka 577004, India',
    city: 'Davangere',
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=Bapuji+Samudhaya+Bhavan%2C+Shamanur+Road%2C+Siddaveerappa+Layout%2C+Shamanur%2C+Davangere%2C+Karnataka+577004',
    /** Keyless Google Maps embed, loaded only after the guest asks for it. */
    mapEmbedUrl:
      'https://www.google.com/maps?q=Bapuji+Samudhaya+Bhavan%2C+Shamanur+Road%2C+Siddaveerappa+Layout%2C+Shamanur%2C+Davangere%2C+Karnataka+577004&output=embed',
    /** Set to a real, family-supplied venue photograph to replace the conceptual illustration. */
    photo: null as null | { src: string; width: number; height: number; alt: string },
  },

  rsvp: {
    whatsappNumber: RSVP_WHATSAPP_NUMBER,
    respondBy: null,
  } satisfies RsvpConfig as RsvpConfig,

  contact: {
    name: null,
    phone: null,
    email: null,
    whatsapp: null,
  } satisfies ContactConfig as ContactConfig,

  /** Add-to-calendar export: all-day entries while timings are unconfirmed. */
  calendarExport: {
    fileName: 'darshan-vathsala-wedding',
  },

  share: {
    /** The link guests share: VITE_SITE_URL when set at build time, otherwise the production site. */
    siteUrl: (import.meta.env.VITE_SITE_URL as string | undefined) || PRODUCTION_URL,
    ogImage: '/og/og-image.jpg',
  },
} as const

export type Wedding = typeof wedding

/** RSVP is open when a WhatsApp number is configured. */
export const rsvpIsLive = (): boolean => /^\d{8,15}$/.test(wedding.rsvp.whatsappNumber)

/** True when at least one verified contact detail exists. */
export const hasContact = (): boolean => Boolean(wedding.contact.phone || wedding.contact.email || wedding.contact.whatsapp)
