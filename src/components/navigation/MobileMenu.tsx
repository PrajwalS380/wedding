import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { NAV_ITEMS } from '../../data/navigation'
import { Monogram } from '../ui/Monogram'
import { LotusDivider } from '../ui/Ornaments'
import { useI18n } from '../../i18n/useI18n'
import { LanguageSelector } from '../ui/LanguageSelector'

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
  const { t } = useI18n()

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
      aria-label={t('nav.siteNavigation')}
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
          <span className="sr-only">{t('nav.closeMenu')}</span>
        </button>
      </div>

      <nav aria-label={t('nav.primary')} className="relative mt-8 flex-1">
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
                {t(item.labelKey)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="relative mt-6 flex justify-center">
        <LanguageSelector variant="header" align="left" />
      </div>
      <div className="relative mt-8 text-center">
        <LotusDivider className="mx-auto h-5 w-44 text-gold/80" />
      </div>
    </div>
  )
}
