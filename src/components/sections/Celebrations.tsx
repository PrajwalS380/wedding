import { useRef } from 'react'
import { wedding } from '../../data/wedding'
import { useReveal } from '../../hooks/useReveal'
import { DuskBand, GlanceChapter, MuhurtaChapter, ReceptionChapter, VenueChapter } from '../celebrations/Chapters'

/**
 * "From dusk to dawn" — the two wedding days told as one continuous sky:
 * sunset (the title), the night of the Aaratakshate, dawn breaking into the
 * morning of the Vivaha Muhurta, daylight for the venue and guest services,
 * and evening again as the page closes into the RSVP. Every scene dissolves
 * into the next; there are no hard edges between chapters.
 *
 * Each fact has one home on the page: dates, the countdown and "add to
 * calendar" are in the Living Calendar; each event's time is in its chapter;
 * the address, map and directions are in the venue chapter; replies go
 * through the RSVP card.
 */
export function Celebrations() {
  const section = useRef<HTMLElement>(null)
  const [d1, d2] = wedding.days
  useReveal(section)

  return (
    <section ref={section} id="celebrations" aria-labelledby="celebrations-title" className="relative isolate bg-night">
      <GlanceChapter />
      <ReceptionChapter day={d1} />
      {/* morning: one sheet of handmade paper behind the Muhurta, the venue and the dusk */}
      <div className="paper-sheet relative">
        <MuhurtaChapter day={d2} />
        <VenueChapter />
        <DuskBand />
      </div>
    </section>
  )
}
