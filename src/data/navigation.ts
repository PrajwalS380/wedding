export const NAV_ITEMS = [
  { id: 'home', labelKey: 'nav.home' },
  { id: 'invitation', labelKey: 'nav.invitation' },
  { id: 'calendar', labelKey: 'nav.calendar' },
  { id: 'compass', labelKey: 'nav.compass' },
  { id: 'rsvp', labelKey: 'nav.rsvp' },
] as const

export type SectionId = (typeof NAV_ITEMS)[number]['id']
