/**
 * The Celebrations section ("From dusk to dawn") is one scrolling story of
 * chapters. Each chapter has its own anchor; older Wedding Compass links keep
 * working through the aliases below.
 */
export const CHAPTERS = ['celebrations', 'aaratakshate', 'muhurta', 'venue', 'guest-services'] as const
export type ChapterId = (typeof CHAPTERS)[number]

/** Deep-link hashes that land on a chapter (including the retired Compass ones). */
export const HASH_ALIASES: Record<string, ChapterId> = {
  compass: 'celebrations',
  'compass-invitation': 'celebrations',
  schedule: 'aaratakshate',
  'compass-schedule': 'aaratakshate',
  reception: 'aaratakshate',
  wedding: 'muhurta',
  'compass-venue': 'venue',
  'compass-services': 'guest-services',
  services: 'guest-services',
}

/** Element id for a hash, following aliases ("#schedule" → "aaratakshate"). */
export const resolveHash = (hash: string): string => HASH_ALIASES[hash] ?? hash
