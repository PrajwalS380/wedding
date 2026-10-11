/**
 * Plain (non-React) translation core, usable from components and from library
 * code alike (WhatsApp message, calendar file).
 */
import { en } from './dictionaries/en'
import { kn } from './dictionaries/kn'
import { hi } from './dictionaries/hi'
import type { Lang } from './languages'

/** The English shape, with every leaf a string — what each language must supply. */
type DeepStrings<T> = { readonly [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> }
export type Dictionary = DeepStrings<typeof en>

/** Every dotted key, e.g. 'calendar.toGo' or 'days.day-1'. */
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]
export type TranslationKey = Leaves<typeof en>

export type Vars = Record<string, string | number>

const DICTIONARIES: Record<Lang, Dictionary> = { en, kn, hi }

function lookup(dict: Dictionary, key: string): string | undefined {
  let node: unknown = dict
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part]
    else return undefined
  }
  return typeof node === 'string' ? node : undefined
}

const warned = new Set<string>()

/**
 * Translates `key` into `lang`. Missing translations fall back to English
 * (and are reported once in development) — a raw key is never shown.
 * `{pair}`, `{pairAnd}`, `{first}` and `{second}` are always available.
 */
export function translate(lang: Lang, key: TranslationKey, vars?: Vars): string {
  let text = lookup(DICTIONARIES[lang], key)
  if (text === undefined) {
    if (import.meta.env.DEV && !warned.has(`${lang}:${key}`)) {
      warned.add(`${lang}:${key}`)
      console.warn(`[i18n] missing "${key}" in ${lang}; using English`)
    }
    text = lookup(en, key) ?? ''
  }
  const couple = DICTIONARIES[lang].couple
  const all: Vars = { pair: couple.pair, pairAnd: couple.pairAnd, first: couple.first, second: couple.second, ...vars }
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in all ? String(all[name]) : m))
}

export type Translate = (key: TranslationKey, vars?: Vars) => string

/** A translator bound to one language (for library code). */
export const translator =
  (lang: Lang): Translate =>
  (key, vars) =>
    translate(lang, key, vars)
