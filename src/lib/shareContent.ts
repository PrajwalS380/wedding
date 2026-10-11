import type { Lang } from '../i18n/languages'
import type { Translate } from '../i18n/translate'
import { getTimeline } from './dates'

/** Title and text for sharing the invitation, in the guest's language, for the given public URL. */
export function shareContent(t: Translate, lang: Lang, url: string): { title: string; text: string; url: string } {
  return {
    title: t('share.title'),
    text: t('share.text', { dates: getTimeline(lang).datesLabel, venue: t('venue.name'), city: t('venue.city') }),
    url,
  }
}
