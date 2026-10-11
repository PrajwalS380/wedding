import { useCallback, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import { NAV_ITEMS } from '../../data/navigation'
import { useActiveSection, useScrollState } from '../../hooks/useActiveSection'
import { useMotion } from '../../hooks/motion'
import { scrollToSection } from '../../lib/browser'
import { Monogram } from '../ui/Monogram'
import { MobileMenu } from './MobileMenu'

const IDS = NAV_ITEMS.map((n) => n.id)

export function WeddingNavigation() {
  const active = useActiveSection(IDS)
  const { scrolled, hidden } = useScrollState()
  const { prefersReducedMotion } = useMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  const go = useCallback(
    (id: string) => {
      setMenuOpen(false)
      // allow the menu to unmount and unlock scrolling first
      requestAnimationFrame(() => scrollToSection(id, prefersReducedMotion))
    },
    [prefersReducedMotion],
  )

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    requestAnimationFrame(() => menuButton.current?.focus())
  }, [])

  return (
    <>
      {/* Desktop: discreet bar that recedes while reading and returns on scroll-up */}
      <header
        className={`fixed inset-x-0 top-0 z-40 hidden transition-[transform,background-color,border-color] duration-500 ease-[var(--ease-silk)] lg:block ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        } ${scrolled ? 'border-b border-gold/15 bg-night/80 backdrop-blur-md' : 'border-b border-transparent bg-transparent'}`}
      >
        <div className="container-wide flex h-[var(--nav-h)] items-center justify-between gap-8">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault()
              go('home')
            }}
            className="flex items-center"
          >
            <Monogram size="sm" bare />
            <span className="sr-only">Vathsala and Darshan — back to top</span>
          </a>
          <nav aria-label="Primary">
            <ul className="flex items-center gap-1 xl:gap-2">
              {NAV_ITEMS.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={active === item.id ? 'true' : undefined}
                    onClick={(e) => {
                      e.preventDefault()
                      go(item.id)
                    }}
                    className={`relative inline-flex min-h-11 items-center px-3 text-label font-semibold uppercase tracking-[0.2em] transition-colors after:absolute after:inset-x-3 after:bottom-2 after:h-px after:origin-center after:bg-gold after:transition-transform after:duration-500 ${
                      active === item.id
                        ? 'text-gold-light after:scale-x-100'
                        : 'text-ivory/75 after:scale-x-0 hover:text-ivory hover:after:scale-x-50'
                    } ${item.id === 'rsvp' ? 'ml-2 border border-gold/50 !px-5 after:hidden hover:bg-gold/10' : ''}`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Mobile: a single compact button, never a full sticky header */}
      <button
        ref={menuButton}
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        className={`fixed right-[calc(0.9rem+env(safe-area-inset-right,0px))] top-[calc(0.9rem+var(--safe-top))] z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/45 bg-night/65 text-gold-light shadow-[0_8px_30px_-10px_rgba(0,0,0,.8)] backdrop-blur-md transition-[transform,opacity] duration-500 ease-[var(--ease-silk)] lg:hidden ${
          hidden && !menuOpen ? 'pointer-events-none -translate-y-20 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Open menu</span>
      </button>

      <MobileMenu open={menuOpen} active={active} onClose={closeMenu} onNavigate={go} />
    </>
  )
}
