import { useI18n } from '../../i18n/useI18n'

/**
 * Elegant italic ampersand. Pinyon Script's own "&" is tiny and hard to read,
 * so ampersands are always set in Cormorant Garamond italic.
 */
export function Amp({ className = '' }: { className?: string }) {
  return <span className={`mx-[0.12em] font-display italic font-normal ${className}`}>&amp;</span>
}

/**
 * The joiner between the couple's names: the italic ampersand in English, the
 * language's own word in Kannada ("ಮತ್ತು") and Hindi ("संग"), at a size that
 * suits a word rather than a glyph.
 */
export function NameJoiner({ className = '', wordClassName = '' }: { className?: string; wordClassName?: string }) {
  const { t } = useI18n()
  const joiner = t('couple.joiner')
  if (joiner === '&') return <Amp className={className} />
  return <span className={`mx-[0.2em] font-display font-normal ${className} ${wordClassName}`}>{joiner}</span>
}
