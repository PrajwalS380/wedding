export const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'invitation', label: 'Invitation' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'compass', label: 'Compass' },
  { id: 'moments', label: 'Moments' },
  { id: 'rsvp', label: 'RSVP' },
] as const

export type SectionId = (typeof NAV_ITEMS)[number]['id']
