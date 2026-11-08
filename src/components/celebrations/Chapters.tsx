import { Fragment, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, Copy, MapPin, Phone, Share2 } from 'lucide-react'
import { localized, wedding, type CelebrationDay } from '../../data/wedding'
import { SCENES, THAMBOOLA, type SceneArt } from '../../data/sceneArt'
import { copyText, shareInvitation, type ShareResult } from '../../lib/browser'
import { formatDayMonthShort, formatWeekday } from '../../lib/dates'
import { dayTimeText as eventTime, displayPhone } from '../../lib/eventTime'
import { shareContent } from '../../lib/shareContent'
import { useI18n } from '../../i18n/useI18n'
import { PetalField } from '../ui/Ambient'
import { SceneStage } from './SceneStage'
import { useOrientation } from '../../hooks/useOrientation'
import { actionClass, dawnGradient, duskGradient, sceneBackdrop, SKY } from './styles'

/* ---------------------------------------------------------------- helpers */

/** Title with *script* words and line breaks: "From *dusk*\nto *dawn*". */
function SceneTitle({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <span key={i} className="block">
          {line.split(/(\*[^*]+\*)/g).map((part, j) =>
            part.startsWith('*') && part.endsWith('*') ? (
              <span key={j} className="script mx-[0.04em] text-[1.08em] text-[#ffdcae]">
                {part.slice(1, -1)}
              </span>
            ) : (
              <Fragment key={j}>{part}</Fragment>
            ),
          )}
        </span>
      ))}
    </>
  )
}

/** Sets how far into a scene its top and bottom edges dissolve (see .scene-fade). */
const fades = (top: string, bottom: string) => ({ '--fade-top': top, '--fade-bottom': bottom }) as CSSProperties

/**
 * A full-bleed chapter over a rendered scene. The picture dissolves at its top
 * and bottom into a backdrop that runs from the colour of the part above
 * (`from`) to the colour of the part below (`to`), so chapters flow into each
 * other. On upright screens the chapter keeps the render's proportions (so
 * nothing important is cropped) and grows if its text needs more room.
 */
function SceneChapter({
  art,
  id,
  labelledBy,
  from,
  to,
  landscapeMin = 'min-h-[max(94svh,42rem)]',
  portraitAspect,
  focus,
  fadeTop = 14,
  fadeBottom = 14,
  className = '',
  overlay,
  children,
}: {
  art: SceneArt
  id?: string
  labelledBy?: string
  from: string
  to: string
  landscapeMin?: string
  /** a shorter frame than the picture on upright screens (CSS aspect-ratio), cropped around `focus` */
  portraitAspect?: string
  focus?: readonly [number, number]
  /** how far (percent of the chapter's height) the picture dissolves at the top and bottom */
  fadeTop?: number
  fadeBottom?: number
  className?: string
  overlay?: ReactNode
  children: ReactNode
}) {
  const o = useOrientation()
  const v = art[o]
  return (
    <article id={id} aria-labelledby={labelledBy} className={`relative isolate grid scroll-mt-0 ${className}`} style={{ background: sceneBackdrop(v.edges, from, to, fadeTop, fadeBottom) }}>
      <div aria-hidden="true" className="film-grain scene-fade pointer-events-none absolute inset-0" style={fades(`${fadeTop}%`, `${fadeBottom}%`)}>
        <SceneStage art={art} focus={focus} />
        {overlay}
      </div>
      <div aria-hidden="true" className={`col-start-1 row-start-1 ${o === 'landscape' ? landscapeMin : ''}`} style={o === 'portrait' ? { aspectRatio: portraitAspect ?? `${v.width} / ${v.height}` } : undefined} />
      <div className="relative z-10 col-start-1 row-start-1 flex flex-col">{children}</div>
    </article>
  )
}

/* ---------------------------------------------------------------- 1 · from dusk to dawn: both ceremonies */

const maskStyle = (m: string) => ({ WebkitMaskImage: m, maskImage: m }) as CSSProperties

/**
 * A temple-window arch with a gold double frame, holding one of the rendered
 * scenes. With `stack`, the top and the bottom of a tall picture are shown
 * together, blended through the sky between them (the night's strings of
 * lights and moon above, its lamps below).
 */
function SceneArch({ art, focus, stack = false }: { art: SceneArt; focus: readonly [number, number]; stack?: boolean }) {
  return (
    <div className="mx-auto w-full rounded-t-[999px] bg-[linear-gradient(180deg,#f3d99a,#b98a43_45%,#6e4a1c)] p-[3px] shadow-[0_22px_40px_-18px_rgba(0,0,0,.85),0_0_30px_-8px_rgba(240,180,90,.35)] landscape:h-[min(22rem,42svh)] landscape:w-auto" style={{ aspectRatio: '62 / 100' }}>
      <div className="relative h-full w-full overflow-hidden rounded-t-[999px] bg-night">
        {stack ? (
          <>
            <div className="absolute inset-0" style={maskStyle('linear-gradient(180deg, #000 0, #000 46%, transparent 66%)')}>
              <SceneStage art={art} variant="portrait" focus={[focus[0], 0]} />
            </div>
            <div className="absolute inset-0" style={maskStyle('linear-gradient(180deg, transparent 36%, #000 58%)')}>
              <SceneStage art={art} variant="portrait" focus={[focus[0], 1]} />
            </div>
          </>
        ) : (
          <SceneStage art={art} variant="portrait" focus={focus} />
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-[5px] rounded-t-[999px] border border-[rgba(243,217,154,.45)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-[linear-gradient(0deg,rgba(6,5,12,.45),transparent)]" />
      </div>
    </div>
  )
}

/** One ceremony: its scene in an arch, then the day, name and time. */
function Ceremony({ id, day, art, focus, stack }: { id: string; day: CelebrationDay; art: SceneArt; focus: readonly [number, number]; stack?: boolean }) {
  const { t, lang } = useI18n()
  const ev = day.events[0]
  return (
    <article id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 text-center" data-reveal="up">
      <SceneArch art={art} focus={focus} stack={stack} />
      <p className="eyebrow mt-4 text-gold-light [text-shadow:0_1px_6px_rgba(0,0,0,.8)]">
        {formatWeekday(day, 'short', lang)} · {formatDayMonthShort(day, lang)}
      </p>
      <h3 id={`${id}-title`} className="mt-1.5 font-display text-[clamp(1.45rem,1.2rem+1.1vw,2.1rem)] font-medium leading-[1.05] text-gold-gradient [filter:drop-shadow(0_2px_8px_rgba(0,0,0,.7))]">
        {localized(ev?.name ?? null, lang)}
      </h3>
      {ev?.description && <p className="mt-0.5 font-display text-[0.98rem] italic leading-snug text-ivory/85 [text-shadow:0_1px_6px_rgba(0,0,0,.8)]">{localized(ev.description, lang)}</p>}
      <p className="mt-1.5 font-display text-[clamp(1.05rem,0.95rem+0.5vw,1.3rem)] leading-snug text-ivory [text-shadow:0_1px_8px_rgba(0,0,0,.8)]">
        {eventTime(day, t, lang)} <span className="font-sans text-[0.62rem] font-semibold tracking-[0.2em] text-gold-light/80">{wedding.timezoneLabel}</span>
      </p>
    </article>
  )
}

/**
 * The section's one scene of its own: the title in the sunset sky over the
 * temple tank, and the two ceremonies side by side in arched windows on the
 * water — the Aaratakshate's night of lights and the Muhurta's kalasha at dawn.
 */
export function CeremoniesChapter() {
  const { t } = useI18n()
  const o = useOrientation()
  const portrait = o === 'portrait'
  const [d1, d2] = wedding.days
  return (
    <SceneChapter
      art={SCENES.sunset}
      labelledBy="celebrations-title"
      from={SKY.dusk}
      to={SKY.embers}
      fadeTop={portrait ? 10 : 18}
      fadeBottom={8}
      portraitAspect="41 / 100"
      focus={portrait ? [0.42, 0.5] : undefined}
      landscapeMin="min-h-[max(100svh,42rem)]"
      overlay={
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]">
          {portrait ? (
            <>
              <div className="absolute inset-x-0 top-0 h-[34%] bg-[linear-gradient(180deg,rgba(8,8,26,.5),transparent)]" />
              <div className="absolute inset-x-0 bottom-0 h-[50%] bg-[linear-gradient(0deg,rgba(6,5,12,.7),rgba(6,5,12,.35)_55%,transparent)]" />
            </>
          ) : (
            <div className="absolute inset-y-0 left-0 w-[62%] bg-[linear-gradient(90deg,rgba(8,6,18,.68),rgba(8,6,18,.38)_62%,transparent)]" />
          )}
        </div>
      }
    >
      <div className={`container-wide flex flex-1 flex-col ${portrait ? 'justify-between pb-[9%] pt-[calc(var(--safe-top)+4.25rem)]' : 'justify-center gap-10 py-20'}`}>
        <header className={portrait ? 'text-center' : 'max-w-[34rem]'} data-reveal="fade">
          <p className="eyebrow text-gold-light [text-shadow:0_1px_8px_rgba(0,0,0,.6)]">{t('celebrations.eyebrow')}</p>
          <h2
            id="celebrations-title"
            className="mt-3 font-display text-[clamp(3rem,2.4rem+3vw,5rem)] font-medium leading-[0.95] text-ivory [text-shadow:0_2px_18px_rgba(0,0,0,.55),0_1px_3px_rgba(0,0,0,.45)]"
          >
            <SceneTitle text={t('celebrations.title')} />
          </h2>
        </header>
        <div className={`grid grid-cols-2 items-start ${portrait ? 'gap-4' : 'w-max gap-10'}`}>
          <Ceremony id="aaratakshate" day={d1} art={SCENES.night} focus={[0.5, 0.5]} stack />
          <Ceremony id="muhurta" day={d2} art={SCENES.sunrise} focus={[0.52, 0.5]} />
        </div>
      </div>
    </SceneChapter>
  )
}

/* ---------------------------------------------------------------- dawn: night turning to morning */

/** A short band of sky between the evening scene and the morning paper: no page of its own, just the light changing. */
export function DawnBand() {
  return <div aria-hidden="true" className="h-[clamp(5.5rem,13svh,8rem)]" style={{ background: dawnGradient('transparent') }} />
}

/* ---------------------------------------------------------------- 4 · daylight: venue & guests */

function VenueBlock() {
  const { t, lang } = useI18n()
  const { venue } = wedding
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [showMap, setShowMap] = useState(false)
  const copy = async () => {
    setCopyState((await copyText(venue.fullAddress)) ? 'copied' : 'failed')
    window.setTimeout(() => setCopyState('idle'), 3500)
  }
  return (
    <div className="text-center lg:text-left" data-reveal="up">
      <h3 id="venue-title" className="eyebrow !text-label font-bold text-burgundy">
        {t('celebrations.venueTitle')}
      </h3>
      <p className="mt-3 font-display text-[clamp(1.9rem,1.7rem+1vw,2.5rem)] font-semibold leading-[1.05] text-maroon">{t('venue.name')}</p>
      <address className="mt-2 text-[0.92rem] not-italic leading-relaxed text-ink-soft">
        <span className="sr-only">{t('celebrations.address')} </span>
        {t('venue.line1')}, {t('venue.line2')}
        <br />
        {t('venue.line3')}
      </address>
      {lang !== 'en' && (
        <p lang="en" className="mt-2 text-caption text-ink-soft/90">
          <span className="font-semibold">{t('celebrations.asOnMaps')}</span> {venue.fullAddress}
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-2.5 lg:justify-start">
        <a href={venue.mapsUrl} target="_blank" rel="noopener noreferrer" className={actionClass.lightFill}>
          <MapPin className="h-4 w-4" aria-hidden="true" /> {t('celebrations.getDirections')}
          <span className="sr-only"> {t('common.mapsNewTab')}</span>
        </a>
        <button type="button" onClick={copy} className={actionClass.light}>
          {copyState === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copyState === 'copied' ? t('celebrations.addressCopied') : t('celebrations.copyAddress')}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-1 min-h-4 text-caption text-burgundy">
        {copyState === 'copied' && t('celebrations.copiedNote')}
        {copyState === 'failed' && t('celebrations.copyFailed')}
      </p>
      <button
        type="button"
        onClick={() => setShowMap((v) => !v)}
        aria-expanded={showMap}
        aria-controls="celebrations-map"
        className="inline-flex min-h-11 items-center gap-2 text-label font-semibold uppercase tracking-[0.2em] text-maroon underline-offset-[6px] hover:underline"
      >
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {showMap ? t('celebrations.hideMap') : t('celebrations.showMap')}
      </button>
      <p className="text-caption text-ink-soft/85">{t('celebrations.mapNote')}</p>
      {showMap && (
        <div id="celebrations-map" className="mt-3 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(122,90,40,.35)]">
          <iframe
            title={t('celebrations.mapTitle', { venue: t('venue.name'), city: t('venue.city') })}
            src={venue.mapEmbedUrl}
            className="block h-[min(50svh,16rem)] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}
    </div>
  )
}

/** For our guests, in one card: the thamboola plate beside the family's numbers and a share button. */
function GuestServices() {
  const { t, lang } = useI18n()
  const [shareStatus, setShareStatus] = useState<ShareResult | null>(null)
  const share = async () => setShareStatus(await shareInvitation(shareContent(t, lang, wedding.share.siteUrl)))
  return (
    <div id="guest-services" className="mt-7 scroll-mt-6" data-reveal="up">
      <div className="flex items-center gap-4 rounded-[4px] bg-[rgba(255,252,244,.5)] p-4 text-left shadow-[0_0_0_1px_rgba(122,90,40,.28),0_6px_14px_-10px_rgba(80,50,20,.45)]">
        <img src={THAMBOOLA.src} width={THAMBOOLA.width} height={THAMBOOLA.height} alt="" loading="lazy" decoding="async" className="h-auto w-[min(10rem,38%)] shrink-0" />
        <div className="min-w-0">
          <h3 className="eyebrow !text-label font-bold text-burgundy">{t('celebrations.guestsTitle')}</h3>
          <p className="mt-2 flex items-center gap-1.5 font-display text-[1.1rem] font-semibold leading-tight text-ink">
            <Phone className="h-3.5 w-3.5 text-brass-deep" aria-hidden="true" />
            {t('celebrations.call')}
          </p>
          {wedding.contact.phones.map((p) => (
            <a key={p} href={`tel:+${p}`} className="block min-h-7 whitespace-nowrap text-[0.95rem] font-semibold leading-7 text-maroon underline-offset-4 hover:underline">
              <span className="sr-only">{t('celebrations.callSr')} </span>
              {displayPhone(p)}
            </a>
          ))}
          <button
            type="button"
            onClick={share}
            className="mt-1 inline-flex min-h-11 items-center gap-2 text-label font-semibold uppercase tracking-[0.18em] text-maroon underline-offset-[6px] hover:underline"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" /> {t('celebrations.share')}
          </button>
          <p role="status" aria-live="polite" className="text-caption text-ink-soft empty:hidden">
            {shareStatus && shareStatus !== 'cancelled' ? t(`share.${shareStatus}`) : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

export function VenueChapter() {
  const { t } = useI18n()
  const o = useOrientation()
  const art = SCENES.daylight
  // A real photograph of the hall, once the family supplies one, replaces the rendered entrance.
  const photo = wedding.venue.photo
  const picture = photo ? (
    <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
  ) : (
    <>
      <SceneStage art={art} focus={o === 'portrait' ? [0.5, 0.45] : undefined} />
      <PetalField count={o === 'portrait' ? 5 : 6} kinds={['marigold', 'jasmine', 'marigold']} seed={41} intensity={0.7} />
    </>
  )
  // the note sits where the picture has already faded into the paper
  const caption = !photo && <p className="absolute bottom-1 right-[var(--gutter)] z-[2] text-[0.7rem] italic text-ink-soft/85 lg:left-8 lg:right-auto">{t('celebrations.artNote')}</p>
  // a wide band on phones, so the venue's details start within the same screen
  const portraitRatio = '16 / 10'
  const body = (
    <>
      <VenueBlock />
      <GuestServices />
    </>
  )
  if (o === 'portrait') {
    return (
      <article id="venue" aria-labelledby="venue-title" className="relative isolate scroll-mt-0">
        <div className="relative" style={{ aspectRatio: portraitRatio }}>
          <div className={`scene-fade pointer-events-none absolute inset-0 ${photo ? '' : 'film-grain'}`} style={fades('16%', '22%')}>
            {picture}
          </div>
          {caption}
        </div>
        <div className="relative z-10 px-[var(--gutter)] pb-4 pt-3">
          <div className="mx-auto max-w-[32rem]">{body}</div>
        </div>
      </article>
    )
  }
  return (
    <article id="venue" aria-labelledby="venue-title" className="relative isolate grid min-h-[max(86svh,40rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
      <div className="relative min-h-[60svh]">
        <div className={`scene-fade scene-fade-right pointer-events-none absolute inset-0 ${photo ? '' : 'film-grain'}`} style={fades('16%', '16%')}>
          {picture}
        </div>
        {caption}
      </div>
      <div className="relative z-10 flex flex-col justify-center px-[var(--gutter)] py-12 lg:px-12">{body}</div>
    </article>
  )
}

/** The end of the day: the paper warms and darkens into the night of the RSVP below. */
export function DuskBand() {
  return <div aria-hidden="true" className="h-[clamp(8rem,22svh,13rem)]" style={{ background: duskGradient }} />
}
