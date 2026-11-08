export const NAV_ITEMS = [
  { id: 'home', labelKey: 'nav.home' },
  { id: 'invitation', labelKey: 'nav.invitation' },
  { id: 'calendar', labelKey: 'nav.calendar' },
  { id: 'celebrations', labelKey: 'nav.celebrations' },
  { id: 'rsvp', labelKey: 'nav.rsvp' },
] as const

export type SectionId = (typeof NAV_ITEMS)[number]['id']
