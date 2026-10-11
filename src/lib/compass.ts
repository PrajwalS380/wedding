/** The four Wedding Compass destinations and a tiny cross-section link. */
export type Direction = 'north' | 'east' | 'south' | 'west'

export const COMPASS_EVENT = 'wedding:compass'

/** Ask the Wedding Compass to open a direction (it scrolls itself into view). */
export function openCompass(direction: Direction): void {
  window.dispatchEvent(new CustomEvent<Direction>(COMPASS_EVENT, { detail: direction }))
}

/** Deep-link hashes that land on a compass direction. */
export const HASH_TO_DIRECTION: Record<string, Direction> = {
  'compass-invitation': 'north',
  schedule: 'east',
  'compass-schedule': 'east',
  venue: 'south',
  'compass-venue': 'south',
  'guest-services': 'west',
  'compass-services': 'west',
}
