import { createContext } from 'react'
import type { Lang } from './languages'
import type { Translate } from './translate'

export interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translate
}

export const I18nContext = createContext<I18nValue | null>(null)
