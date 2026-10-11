import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nContext } from './context'
import { DEFAULT_LANG, LANGUAGES, isLang, type Lang } from './languages'
import { translate, type Translate } from './translate'

const STORAGE_KEY = 'wr:lang'

/** The guest's saved language (a simple local preference — nothing is sent anywhere). */
function savedLang(): Lang {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (isLang(value)) return value
  } catch {
    /* storage unavailable — fall back to the default */
  }
  return DEFAULT_LANG
}

/**
 * `<html lang>` plus plain classes for the script-specific CSS. The CSS keys off
 * the classes (`.indic …`, `.lang-hi`) rather than `:lang()` so the browser can
 * match those rules cheaply on every restyle.
 */
function markDocument(lang: Lang) {
  const root = document.documentElement
  root.lang = lang
  for (const l of LANGUAGES) root.classList.toggle(`lang-${l.code}`, l.code === lang)
  root.classList.toggle('indic', LANGUAGES.some((l) => l.code === lang && l.indic))
}

function applyDocumentLanguage(lang: Lang) {
  markDocument(lang)
  document.title = translate(lang, 'meta.title')
  document.querySelector('meta[name="description"]')?.setAttribute('content', translate(lang, 'meta.description'))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const initial = savedLang()
    // set before the first paint so script-specific fonts and spacing apply at once
    markDocument(initial)
    return initial
  })

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* not persisted — the choice still applies for this visit */
    }
  }, [])

  // layout effect: the new language's fonts and spacing land in the same frame as its text
  useLayoutEffect(() => applyDocumentLanguage(lang), [lang])

  const t = useCallback<Translate>((key, vars) => translate(lang, key, vars), [lang])
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
