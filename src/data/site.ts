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

/**
 * The optional background soundtrack (off until a guest presses Play; never
 * autoplays). Replace the file in public/audio — or point this at another
 * properly licensed track — to change the music.
 */
export const SOUNDTRACK_SRC = '/audio/mangala-dhwani.mp3'
