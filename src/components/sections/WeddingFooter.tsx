import { Monogram } from '../ui/Monogram'
import { MandapMotif } from '../ui/Ornaments'
import { useI18n } from '../../i18n/useI18n'

/**
 * The closing signature: the monogram and the credit. Names, dates, directions,
 * the RSVP and sharing each already have their own place higher up the page.
 */
export function WeddingFooter() {
  const { t } = useI18n()
  return (
    <footer className="relative overflow-hidden bg-night pb-[calc(2.5rem+var(--safe-bottom))] pt-16 text-center">
      <MandapMotif className="pointer-events-none absolute left-1/2 top-6 w-[min(90vw,34rem)] -translate-x-1/2 text-gold/[0.06]" />
      <div className="container-wide relative flex flex-col items-center">
        <Monogram size="md" />
        <p className="mt-10 max-w-xl text-caption leading-relaxed text-ivory/65">{t('footer.credit')}</p>
      </div>
    </footer>
  )
}
