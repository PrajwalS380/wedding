import { useState } from 'react'
import { MapPin, Share2 } from 'lucide-react'
import { wedding } from '../../data/wedding'
import { useMotion } from '../../hooks/motion'
import { scrollToSection, shareInvitation, type ShareResult } from '../../lib/browser'
import { getTimeline } from '../../lib/dates'
import { MotionToggle } from '../ui/Ambient'
import { Monogram } from '../ui/Monogram'
import { MandapMotif } from '../ui/Ornaments'
import { NameJoiner } from '../ui/Amp'
import { useI18n } from '../../i18n/useI18n'
import { shareContent } from '../../lib/shareContent'


export function WeddingFooter() {
  const { prefersReducedMotion } = useMotion()
  const { t, lang } = useI18n()
  const timeline = getTimeline(lang)
  // kept as a code and translated at render, so it follows a language change
  const [shareStatus, setShareStatus] = useState<ShareResult | null>(null)
  const share = async () => {
    const url = wedding.share.siteUrl ?? window.location.href.split('#')[0]
    setShareStatus(await shareInvitation(shareContent(t, lang, url)))
  }

  const linkCls =
    'inline-flex min-h-11 items-center gap-2 px-2 text-label font-semibold uppercase tracking-[0.22em] text-ivory/75 transition-colors hover:text-gold-light'

  return (
    <footer className="relative overflow-hidden border-t border-gold/15 bg-night pb-[calc(2.5rem+var(--safe-bottom))] pt-16 text-center">
      <MandapMotif className="pointer-events-none absolute left-1/2 top-6 w-[min(90vw,34rem)] -translate-x-1/2 text-gold/[0.06]" />
      <div className="container-wide relative flex flex-col items-center">
        <Monogram size="md" />
        <p className="mt-5 font-display text-[length:var(--step-3)] text-ivory">
          {t('couple.first')} <NameJoiner className="text-gold" wordClassName="text-[0.6em]" /> {t('couple.second')}
        </p>
        <p className="mt-2 text-sm tracking-wide text-ivory/65">
          {timeline.daysLabel}
          {` ${timeline.monthYearLabel}`} · {t('venue.city')}
        </p>

        <nav aria-label={t('nav.footer')} className="mt-8">
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <li>
              <a href={wedding.venue.mapsUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
                <MapPin className="h-3.5 w-3.5 text-gold" aria-hidden="true" /> {t('footer.directions')}
                <span className="sr-only"> {t('common.mapsNewTab')}</span>
              </a>
            </li>
            <li>
              <a
                href="#rsvp"
                onClick={(e) => {
                  e.preventDefault()
                  scrollToSection('rsvp', prefersReducedMotion)
                }}
                className={linkCls}
              >
                {t('nav.rsvp')}
              </a>
            </li>
            <li>
              <button type="button" onClick={share} className={linkCls}>
                <Share2 className="h-3.5 w-3.5 text-gold" aria-hidden="true" /> {t('footer.share')}
              </button>
            </li>
          </ul>
        </nav>
        <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-gold-light/85">
          {shareStatus && shareStatus !== 'cancelled' ? t(`share.${shareStatus}`) : ''}
        </p>

        <MotionToggle className="mt-6" />

        <p className="mt-10 max-w-xl text-caption leading-relaxed text-ivory/65">
          {t('footer.credit')}
        </p>
      </div>
    </footer>
  )
}
