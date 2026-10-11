/**
 * Languages the invitation is available in. To add one (e.g. Telugu):
 * add an entry here, add a complete dictionary in ./dictionaries, register it
 * in ./translate.ts, and add its weekday/month names in lib/dates.ts — the
 * TypeScript types refuse to build until every key is translated.
 * `indic` turns on the Indic typography rules in styles/index.css (no
 * letter-spacing, roomier line-heights, a larger small-text scale).
 */
export const LANGUAGES = [
  { code: 'en', native: 'English', english: 'English', indic: false },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada', indic: true },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', indic: true },
] as const

export type Lang = (typeof LANGUAGES)[number]['code']

export const DEFAULT_LANG: Lang = 'en'

export const isLang = (value: unknown): value is Lang => LANGUAGES.some((l) => l.code === value)
