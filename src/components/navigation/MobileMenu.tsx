import { useEffect, useRef } from 'react'
import { MapPin, X } from 'lucide-react'
import { NAV_ITEMS } from '../../data/navigation'
import { wedding } from '../../data/wedding'
import { getTimeline } from '../../lib/dates'
import { Monogram } from '../ui/Monogram'
import { LotusDivider } from '../ui/Ornaments'

interface MobileMenuProps {
  open: boolean
  active: string
  onClose: () => void
  onNavigate: (id: string) => void
}

/** Full-screen, focus-trapped navigation sheet for small screens. */
export function MobileMenu({ open, active, onClose, onNavigate }: MobileMenuProps) {
  const panel = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const timeline = getTimeline()

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    root.classList.add('is-locked')
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Tab' && panel.current) {
        const focusables = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      root.classList.remove('is-locked')
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={panel}
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-night/97 px-[var(--gutter)] pb-[calc(2rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] backdrop-blur-md lg:hidden"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_50%_at_50%_0%,rgba(213,176,109,.14),transparent_70%)]" />
      <div className="relative flex items-center justify-between">
        <Monogram size="sm" bare />
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 text-gold-light transition-colors hover:border-gold hover:text-ivory"
        >
          <X className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Close menu</span>
        </button>
      </div>

      <nav aria-label="Primary" className="relative mt-8 flex-1">
        <ul className="flex flex-col">
          {NAV_ITEMS.map((item, i) => (
            <li key={item.id} className="border-b border-gold/12">
              <a
                href={`#${item.id}`}
                aria-current={active === item.id ? 'true' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  onNavigate(item.id)
                }}
                className={`flex min-h-14 items-baseline gap-4 py-3 font-display text-[1.9rem] leading-none transition-colors ${
                  active === item.id ? 'text-gold-light' : 'text-ivory/90 hover:text-gold-light'
                }`}
              >
                <span className="w-7 font-sans text-tag font-semibold tracking-[0.2em] text-gold/70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="relative mt-8 text-center">
        <LotusDivider className="mx-auto h-5 w-44 text-gold/80" />
        <p className="mt-4 font-display text-xl text-ivory">
          {wedding.couple.pair}
        </p>
        <p className="mt-1 text-sm text-ivory/70">
          {timeline.daysLabel}
          {` · ${timeline.monthYearLabel}`}
        </p>
        <a
          href={wedding.venue.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-label font-semibold uppercase tracking-[0.22em] text-gold-light underline-offset-4 hover:underline"
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {wedding.venue.name}
          <span className="sr-only"> — open in Google Maps (new tab)</span>
        </a>
      </div>
    </div>
  )
}
