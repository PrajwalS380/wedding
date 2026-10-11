/**
 * THE WEDDING REALM — single source of truth.
 *
 * Every fact shown on the site lives here. Anything the family has not yet
 * confirmed is `null` (or an empty list), and the UI renders a tasteful
 * "to be announced" state instead of inventing a value.
 *
 * CONFIRMED: the celebrations take place on 15 and 16 November 2026.
 *
 * WHEN TIMINGS ARE CONFIRMED: set `startTime` / `endTime` ('HH:mm', 24-hour,
 * in `timezone`) on a day, and add verified ceremonies to its `events` list.
 * The Living Calendar, the Compass schedule and the calendar export all read
 * from here — never hard-code dates in components.
 */

import { photos } from './assets'

export type DayId = 'day-1' | 'day-2'

/** A verified ceremony or function on one of the wedding days. */
export interface ScheduledEvent {
  name: string
  /** 'HH:mm' (24h) in `wedding.timezone`, or null if not yet confirmed. */
  startTime: string | null
  endTime: string | null
  description: string | null
}

export interface CelebrationDay {
  id: DayId
  /** Short neutral label, e.g. "Day One". */
  label: string
  /** Confirmed calendar date, 'YYYY-MM-DD'. */
  date: string
  /**
   * Optional start / end of the day's celebrations ('HH:mm' in `timezone`).
   * While unset, countdowns are *date-based*: they count to the start of the
   * calendar date in the visitor's local time and say so.
   */
  startTime: string | null
  endTime: string | null
  /** Verified ceremonies only. Empty until the family confirms the schedule. */
  events: ScheduledEvent[]
  dressCode: string | null
  note: string | null
}

export interface RsvpConfig {
  /**
   * 'demo'     — form validates but does NOT send anything (honest preview).
   * 'endpoint' — POSTs JSON to `endpoint` (e.g. a Formspree / Google Apps
   *              Script / serverless URL). Never put secret keys here.
   */
  mode: 'demo' | 'endpoint'
  endpoint: string | null
  /** 'YYYY-MM-DD' or null when no deadline has been set. */
  respondBy: string | null
  maxGuestsPerResponse: number
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

  tagline: 'Two Families. One Beautiful Journey.',

  /** Explicitly chosen timezone for any confirmed times: the venue is in Karnataka, India (IST, UTC+05:30). */
  timezone: 'Asia/Kolkata',
  timezoneLabel: 'IST',

  /** The two confirmed wedding days. */
  days: [
    {
      id: 'day-1',
      label: 'Day One',
      date: '2026-11-15',
      startTime: null, // set 'HH:mm' once the family confirms
      endTime: null,
      events: [],
      dressCode: null,
      note: null,
    },
    {
      id: 'day-2',
      label: 'Day Two',
      date: '2026-11-16',
      startTime: null,
      endTime: null,
      events: [],
      dressCode: null,
      note: null,
    },
  ] satisfies CelebrationDay[] as CelebrationDay[],

  copy: {
    heroEyebrow: 'The Wedding of',
    invitationHeading: 'You Are Cordially Invited',
    invitationMessage: `With joyful hearts and the blessings of our families, we warmly invite you to join us as we celebrate the wedding of ${pairAnd}. Your presence will make our special days even more meaningful.`,
    compassInvitation: 'With the blessings of our families, we warmly invite you to celebrate our wedding with us across two joyful days.',
    calendarIntro: 'Our wedding celebrations unfold across two days.',
    schedulePending: 'Event schedule to be announced',
    schedulePendingNote: 'Ceremony details and timings will be shared here as soon as they are confirmed.',
    closing:
      'We would be delighted to celebrate these special moments with you. Your blessings, love, and presence will make our celebration complete.',
    postEvent: 'With love and gratitude, thank you for celebrating with us.',
  },

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
    mode: import.meta.env.VITE_RSVP_ENDPOINT ? 'endpoint' : 'demo',
    endpoint: (import.meta.env.VITE_RSVP_ENDPOINT as string | undefined) ?? null,
    respondBy: null,
    maxGuestsPerResponse: 6,
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
    title: `${pair}'s Wedding Celebrations`,
  },

  /** Background music is off until the family supplies a licensed track. Never autoplays. */
  music: {
    enabled: false,
    src: null as string | null,
    title: null as string | null,
  },

  photos,

  share: {
    title: `${pair} — You Are Invited`,
    text: `You are warmly invited to celebrate the wedding of ${pair} on 15 & 16 November 2026 at Bapuji Samudhaya Bhavan, Davangere.`,
    /** Public deployment URL; injected from VITE_SITE_URL at build time when available. */
    siteUrl: (import.meta.env.VITE_SITE_URL as string | undefined) || null,
    ogImage: '/og/og-image.jpg',
  },
} as const

export type Wedding = typeof wedding

/** RSVP is only "open" when a real endpoint is configured. */
export const rsvpIsLive = (): boolean => wedding.rsvp.mode === 'endpoint' && Boolean(wedding.rsvp.endpoint)

/** True when at least one verified contact detail exists. */
export const hasContact = (): boolean => Boolean(wedding.contact.phone || wedding.contact.email || wedding.contact.whatsapp)
