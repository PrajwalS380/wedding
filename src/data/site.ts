/**
 * Deployment-level settings shared by the app and the build (vite.config.ts).
 * Plain constants only — no `import.meta.env`, so the build config can import it.
 */

/** The live invitation. Used for the canonical link, link previews and the link guests share. */
export const PRODUCTION_URL = 'https://thedarshanandvathsala.vercel.app'

/**
 * WhatsApp number that receives RSVPs, in international format with digits
 * only (country code 91, no '+', spaces or punctuation). Change it here only.
 */
export const RSVP_WHATSAPP_NUMBER = '919591420987'
