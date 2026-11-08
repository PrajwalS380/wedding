import { useRef } from 'react'
import { useReveal } from '../../hooks/useReveal'
import { CeremoniesChapter, DawnBand, DuskBand, VenueChapter } from '../celebrations/Chapters'

/**
 * "From dusk to dawn" in two screens: the sunset over the temple tank with
 * both ceremonies in arched windows (the Aaratakshate's night of lights and
 * the Muhurta's kalasha), then — after a short band of dawn — the venue and
 * the guests' card on handmade paper, closing into the evening of the RSVP.
 * Every scene dissolves into the next; there are no hard edges.
 *
 * Each fact has one home on the page: dates, the countdown and "add to
 * calendar" are in the Living Calendar; each event's time is in its chapter;
 * the address, map and directions are in the venue chapter; replies go
 * through the RSVP card.
 */
export function Celebrations() {
  const section = useRef<HTMLElement>(null)
  useReveal(section)

  return (
    <section ref={section} id="celebrations" aria-labelledby="celebrations-title" className="relative isolate bg-night">
      <CeremoniesChapter />
      {/* morning: one sheet of handmade paper behind the venue, the guests' card and the dusk */}
      <div className="paper-sheet relative">
        <DawnBand />
        <VenueChapter />
        <DuskBand />
      </div>
    </section>
  )
}
