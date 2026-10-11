import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { COMPASS_EVENT, HASH_TO_DIRECTION, type Direction } from '../../lib/compass'
import { useMotion } from '../../hooks/motion'
import { useReveal } from '../../hooks/useReveal'
import { CompassRose } from '../ui/CompassRose'
import { InvitationPanel, SchedulePanel, ServicesPanel, VenuePanel, WelcomePanel } from '../compass/CompassPanels'

const DIRECTIONS: { id: Direction; cardinal: string; title: string; hint: string; area: string }[] = [
  { id: 'north', cardinal: 'North', title: 'The Invitation', hint: 'Names, dates & venue', area: '[grid-area:n]' },
  { id: 'east', cardinal: 'East', title: 'The Schedule', hint: 'The two wedding days', area: '[grid-area:e]' },
  { id: 'south', cardinal: 'South', title: 'The Venue', hint: 'Address & directions', area: '[grid-area:s]' },
  { id: 'west', cardinal: 'West', title: 'Guest Services', hint: 'RSVP, share & calendar', area: '[grid-area:w]' },
]

const ARROW_TO_DIRECTION: Record<string, Direction> = { ArrowUp: 'north', ArrowRight: 'east', ArrowDown: 'south', ArrowLeft: 'west' }

export function WeddingCompass() {
  const section = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttons = useRef<Partial<Record<Direction, HTMLButtonElement | null>>>({})
  // Deep links such as #venue open their direction from the first render; App's deep-link handler scrolls.
  const [direction, setDirection] = useState<Direction | null>(() => HASH_TO_DIRECTION[decodeURIComponent(window.location.hash.slice(1))] ?? null)
  const lastDirection = useRef<Direction | null>(direction)
  const { prefersReducedMotion, ambientMotion } = useMotion()
  useReveal(section)

  const select = useCallback((d: Direction) => {
    lastDirection.current = d
    setDirection(d)
  }, [])

  /** Bring the panel into view only if it is off-screen (no surprise jumps). */
  const revealPanel = useCallback(
    (behavior: ScrollBehavior) => {
      requestAnimationFrame(() => {
        const el = panelRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        if (r.top < 0 || r.top > window.innerHeight * 0.7) el.scrollIntoView({ behavior, block: 'start' })
      })
    },
    [],
  )

  // Requests from other sections (e.g. the Living Calendar) and deep links like #venue.
  useEffect(() => {
    const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth'
    const open = (d: Direction) => {
      select(d)
      const wide = window.matchMedia('(min-width: 1024px)').matches
      requestAnimationFrame(() => {
        if (wide) section.current?.scrollIntoView({ behavior, block: 'start' })
        else panelRef.current?.scrollIntoView({ behavior, block: 'start' })
      })
    }
    const onEvent = (e: Event) => open((e as CustomEvent<Direction>).detail)
    // in-page hash changes to an alias (e.g. #venue) open that direction; App handles the scroll
    const onHash = () => {
      const d = HASH_TO_DIRECTION[decodeURIComponent(window.location.hash.slice(1))]
      if (d) select(d)
    }
    window.addEventListener(COMPASS_EVENT, onEvent)
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener(COMPASS_EVENT, onEvent)
      window.removeEventListener('hashchange', onHash)
    }
  }, [prefersReducedMotion, select])

  const choose = (d: Direction) => {
    if (direction === d) return
    select(d)
    if (!window.matchMedia('(min-width: 1024px)').matches) revealPanel(prefersReducedMotion ? 'auto' : 'smooth')
  }

  const back = () => {
    const prev = lastDirection.current
    setDirection(null)
    requestAnimationFrame(() => (prev ? buttons.current[prev] : section.current?.querySelector<HTMLElement>('h2'))?.focus())
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const d = ARROW_TO_DIRECTION[e.key]
    if (!d) return
    e.preventDefault()
    choose(d)
    buttons.current[d]?.focus()
  }

  const active = DIRECTIONS.find((d) => d.id === direction)

  return (
    <section ref={section} id="compass" aria-labelledby="compass-title" className="relative isolate overflow-hidden bg-night section-pad">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_28%_52%,rgba(213,176,109,.10),transparent_70%),radial-gradient(60%_50%_at_90%_10%,rgba(28,75,60,.55),transparent_70%)]" />

      <div className="container-wide relative">
        <header className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-gold" data-reveal="fade">
            Guest Information
          </p>
          <h2 id="compass-title" tabIndex={-1} className="mt-4 text-[length:var(--step-4)] text-ivory" data-reveal="up">
            The Wedding <span className="script text-[1.1em] text-gold-light">Compass</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[1rem] leading-relaxed text-ivory/75" data-reveal="fade">
            Choose a direction to explore your wedding details.
          </p>
        </header>

        <div className="mt-10 grid items-start gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
          {/* Compass: one set of direction buttons, arranged around the rose on desktop, 2×2 on phones */}
          <div
            className="mx-auto grid w-full max-w-[26rem] grid-cols-2 gap-3 [grid-template-areas:'rose_rose'_'n_e'_'w_s'] lg:max-w-[44rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center lg:gap-4 lg:[grid-template-areas:'._n_.'_'w_rose_e'_'._s_.']"
            role="group"
            aria-label="Compass directions"
          >
            <div className="mx-auto w-[min(56vw,13rem)] [grid-area:rose] lg:w-full" data-reveal="scale">
              <CompassRose direction={direction} className="h-auto w-full drop-shadow-[0_24px_40px_rgba(0,0,0,.6)]" />
            </div>
            {DIRECTIONS.map((d) => {
              const isActive = direction === d.id
              return (
                <button
                  key={d.id}
                  ref={(el) => void (buttons.current[d.id] = el)}
                  type="button"
                  onClick={() => choose(d.id)}
                  onKeyDown={onKeyDown}
                  aria-pressed={isActive}
                  aria-controls="compass-panel"
                  className={`${d.area} group relative flex min-h-[4.5rem] flex-col items-center justify-center rounded-[3px] border px-3 py-3 text-center transition-[border-color,background-color,transform] duration-500 ease-[var(--ease-silk)] active:scale-[0.98] ${
                    isActive ? 'border-gold bg-gold/12 shadow-[0_0_30px_-10px_rgba(213,176,109,.6)]' : 'border-gold/30 bg-night/40 hover:border-gold/60 hover:bg-gold/5'
                  }`}
                >
                  <span className="flex items-center gap-2 text-label font-semibold uppercase tracking-[0.3em] text-gold">
                    <span className={`h-1.5 w-1.5 rotate-45 transition-colors ${isActive ? 'bg-gold' : 'border border-gold/70'}`} aria-hidden="true" />
                    {d.cardinal}
                  </span>
                  <span className={`mt-1 font-display text-[1.15rem] leading-tight ${isActive ? 'text-ivory' : 'text-ivory/85'}`}>{d.title}</span>
                  <span className="mt-0.5 hidden text-caption text-ivory/60 lg:block">{d.hint}</span>
                </button>
              )
            })}
          </div>

          {/* Panel */}
          <div ref={panelRef} id="compass-panel" className="relative scroll-mt-6 rounded-[3px] border border-gold/20 bg-[rgba(6,20,16,.6)] p-6 sm:p-9 lg:min-h-[30rem]">
            <span className="pointer-events-none absolute -left-px -top-px h-6 w-6 border-l border-t border-gold/60" aria-hidden="true" />
            <span className="pointer-events-none absolute -bottom-px -right-px h-6 w-6 border-b border-r border-gold/60" aria-hidden="true" />
            <p className="sr-only" role="status" aria-live="polite">
              {active ? `Showing ${active.cardinal}: ${active.title}` : ''}
            </p>
            <div key={direction ?? 'welcome'} className={ambientMotion ? 'animate-[caption-in_.7s_var(--ease-silk)_both]' : ''}>
              {direction === 'north' && <InvitationPanel onBack={back} />}
              {direction === 'east' && <SchedulePanel onBack={back} />}
              {direction === 'south' && <VenuePanel onBack={back} />}
              {direction === 'west' && <ServicesPanel onBack={back} />}
              {direction === null && <WelcomePanel />}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
