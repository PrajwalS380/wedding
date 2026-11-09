import { useRef } from 'react'
import { useReveal } from '../../hooks/useReveal'
import { CeremoniesChapter, NightBand, NightfallBand, VenueChapter } from '../celebrations/Chapters'
import { SKY } from '../celebrations/styles'

/**
 * "From dusk to dawn" in two screens: the sunset over the temple tank with
 * both ceremonies in arched windows (the Aaratakshate's night of lights and
 * the Muhurta's kalasha), then — as the embers sink into night — the venue's
 * moonlit 3D map with its card and the guests' card, deepening into the night
 * green of the RSVP.
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
      {/* night over the venue: one deep blue behind the map, the venue's card and the guests' card */}
      <div className="relative" style={{ backgroundColor: SKY.midnight }}>
        <NightfallBand />
        <VenueChapter />
        <NightBand />
      </div>
    </section>
  )
}
