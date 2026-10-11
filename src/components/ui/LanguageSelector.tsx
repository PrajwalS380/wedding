import { useEffect, useId, type KeyboardEvent } from 'react'
import { Check, ChevronDown, Languages } from 'lucide-react'
import { LANGUAGES, type Lang } from '../../i18n/languages'
import { useI18n } from '../../i18n/useI18n'
import { usePopover } from '../../hooks/usePopover'

type Variant = 'header' | 'capsule' | 'intro'

const TRIGGER: Record<Variant, string> = {
  header:
    'min-h-11 gap-2 rounded-full border border-gold/40 px-3.5 text-label font-semibold text-gold-light hover:border-gold/80 hover:text-ivory',
  capsule: 'h-11 min-w-11 gap-1.5 rounded-full px-2.5 text-label font-semibold text-gold-light hover:text-ivory',
  intro: 'min-h-11 gap-2 rounded-full border border-gold/35 bg-night/40 px-3.5 text-label font-semibold text-ivory/80 hover:text-ivory',
}

/**
 * Language switcher: the current language in its own script, a short list of
 * English · ಕನ್ನಡ · हिन्दी (each also labelled in English), the active one
 * marked by a tick and `aria-current`. Works with touch, mouse, keyboard
 * (arrow keys, Home/End, Escape) and screen readers.
 */
export function LanguageSelector({ variant = 'header', align = 'right', className = '' }: { variant?: Variant; align?: 'left' | 'right'; className?: string }) {
  const { lang, setLang, t } = useI18n()
  const { open, setOpen, close, root, trigger } = usePopover()
  const listId = useId()
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]
  // compact on phones: "EN" for English; Kannada and Hindi names are already short
  const compact = variant === 'capsule' || variant === 'intro'
  const shortLabel = compact && current.code === 'en' ? 'EN' : current.native

  useEffect(() => {
    if (open) root.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus()
  }, [open, root])

  const choose = (code: Lang) => {
    setLang(code)
    close(true)
  }

  const onListKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const items = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-lang-option]') ?? [])
    const i = items.indexOf(e.currentTarget)
    const to = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null
    if (to === null) return
    e.preventDefault()
    items[(to + items.length) % items.length]?.focus()
  }

  return (
    // in the phone capsule the list anchors to the capsule (a `fixed` element), so it never leaves the screen
    <div ref={root} className={`${variant === 'capsule' ? '' : 'relative'} ${className}`}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t('language.current', { name: current.native })}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-center whitespace-nowrap transition-colors ${TRIGGER[variant]}`}
      >
        <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
        {variant === 'intro' ? (
          <>
            <span lang={current.code} className="sm:hidden">
              {shortLabel}
            </span>
            <span lang={current.code} className="hidden sm:inline">
              {current.native}
            </span>
          </>
        ) : (
          <span lang={current.code}>{shortLabel}</span>
        )}
        {variant !== 'capsule' && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />}
      </button>
      {open && (
        <div
          id={listId}
          role="group"
          aria-label={t('language.choose')}
          className={`absolute top-[calc(100%+0.5rem)] z-50 w-48 overflow-hidden rounded-[4px] border border-gold/40 bg-night/95 p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,.85)] backdrop-blur-md ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <p className="px-3 pb-1.5 pt-1 text-tag font-semibold uppercase tracking-[0.2em] text-gold/80">{t('language.label')}</p>
          {LANGUAGES.map((l) => {
            const active = l.code === lang
            return (
              <button
                key={l.code}
                type="button"
                data-lang-option
                lang={l.code}
                aria-current={active ? 'true' : undefined}
                onClick={() => choose(l.code)}
                onKeyDown={onListKey}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-[3px] px-3 text-left transition-colors ${
                  active ? 'bg-gold/15 text-ivory' : 'text-ivory/85 hover:bg-gold/10 hover:text-ivory'
                }`}
              >
                <span className="flex flex-col leading-tight">
                  <span className="font-display text-[1.1rem]">{l.native}</span>
                  {l.code !== 'en' && (
                    <span lang="en" className="text-tag text-ivory/55">
                      {l.english}
                    </span>
                  )}
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-gold-light" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
