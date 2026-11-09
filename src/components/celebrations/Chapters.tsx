import { Fragment, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, Copy, MapPin, Phone, Share2 } from 'lucide-react'
import { localized, wedding, type CelebrationDay } from '../../data/wedding'
import { SCENES, THAMBOOLA, type SceneArt } from '../../data/sceneArt'
import { copyText, shareInvitation, type ShareResult } from '../../lib/browser'
import { formatDayMonthShort, formatWeekday } from '../../lib/dates'
import { dayTimeText as eventTime, displayPhone } from '../../lib/eventTime'
import { shareContent } from '../../lib/shareContent'
import { useI18n } from '../../i18n/useI18n'
import { SceneStage } from './SceneStage'
import { RouteMap } from '../routemap/RouteMap'
import { useOrientation } from '../../hooks/useOrientation'
import { actionClass, nightfallGradient, nightGreenGradient, sceneBackdrop, SKY } from './styles'

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

/** A temple-window arch with a gold double frame, holding a scene rendered for it. */
function SceneArch({ art }: { art: SceneArt }) {
  return (
    <div className="mx-auto w-full rounded-t-[999px] bg-[linear-gradient(180deg,#f3d99a,#b98a43_45%,#6e4a1c)] p-[3px] shadow-[0_22px_40px_-18px_rgba(0,0,0,.85),0_0_30px_-8px_rgba(240,180,90,.35)] landscape:h-[min(22rem,42svh)] landscape:w-auto" style={{ aspectRatio: '62 / 100' }}>
      <div className="relative h-full w-full overflow-hidden rounded-t-[999px] bg-night">
        <SceneStage art={art} variant="portrait" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-[5px] rounded-t-[999px] border border-[rgba(243,217,154,.45)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/5 bg-[linear-gradient(0deg,rgba(6,5,12,.35),transparent)]" />
      </div>
    </div>
  )
}

/** One ceremony: its scene in an arch, then the day, name and time. */
function Ceremony({ id, day, art }: { id: string; day: CelebrationDay; art: SceneArt }) {
  const { t, lang } = useI18n()
  const ev = day.events[0]
  return (
    <article id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 text-center" data-reveal="up">
      <SceneArch art={art} />
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
 * water — the Aaratakshate's aarati plate with its five flames and akshate in
 * the air, and the Muhurta's mangalasutra on a coconut before the sacred fire.
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
          <Ceremony id="aaratakshate" day={d1} art={SCENES.aarati} />
          <Ceremony id="muhurta" day={d2} art={SCENES.mangalya} />
        </div>
      </div>
    </SceneChapter>
  )
}

/* ---------------------------------------------------------------- dawn: night turning to morning */

/** A short band of sky between the sunset and the venue's night: no page of its own, just the light going. */
export function NightfallBand() {
  return <div aria-hidden="true" className="h-[clamp(5.5rem,13svh,8rem)]" style={{ background: nightfallGradient }} />
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
    <div className="text-center">
      <h3 id="venue-title" className="eyebrow !text-label font-bold text-gold">
        {t('celebrations.venueTitle')}
      </h3>
      <p className="mt-3 font-display text-[clamp(1.9rem,1.7rem+1vw,2.5rem)] font-semibold leading-[1.05] text-ivory">{t('venue.name')}</p>
      <address className="mt-2 text-[0.92rem] not-italic leading-relaxed text-ivory/70">
        <span className="sr-only">{t('celebrations.address')} </span>
        {t('venue.line1')}, {t('venue.line2')}
        <br />
        {t('venue.line3')}
      </address>
      {lang !== 'en' && (
        <p lang="en" className="mt-2 text-caption text-ivory/65">
          <span className="font-semibold">{t('celebrations.asOnMaps')}</span> {venue.fullAddress}
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-2.5">
        <a href={venue.directionsUrl} target="_blank" rel="noopener noreferrer" className={actionClass.lightFill}>
          <MapPin className="h-4 w-4" aria-hidden="true" /> {t('celebrations.getDirections')}
          <span className="sr-only"> {t('common.mapsNewTab')}</span>
        </a>
        <button type="button" onClick={copy} className={actionClass.dark}>
          {copyState === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copyState === 'copied' ? t('celebrations.addressCopied') : t('celebrations.copyAddress')}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-1 min-h-4 text-caption text-gold-light">
        {copyState === 'copied' && t('celebrations.copiedNote')}
        {copyState === 'failed' && t('celebrations.copyFailed')}
      </p>
      <button
        type="button"
        onClick={() => setShowMap((v) => !v)}
        aria-expanded={showMap}
        aria-controls="celebrations-map"
        className="inline-flex min-h-11 items-center gap-2 text-label font-semibold uppercase tracking-[0.2em] text-gold-light underline-offset-[6px] hover:text-ivory hover:underline"
      >
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {showMap ? t('celebrations.hideMap') : t('celebrations.showMap')}
      </button>
      <p className="text-caption text-ivory/55">{t('celebrations.mapNote')}</p>
      {showMap && (
        <div id="celebrations-map" className="mt-3 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(213,176,109,.35)]">
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

const card = 'relative rounded-[4px] bg-[linear-gradient(180deg,rgba(26,22,40,.9),rgba(14,13,26,.94))] shadow-[0_30px_60px_-30px_rgba(0,0,0,.95),0_0_0_1px_rgba(213,176,109,.3),inset_0_1px_0_rgba(255,236,200,.06)] backdrop-blur-md'
const brassDisc =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#3e2508] bg-[radial-gradient(circle_at_35%_28%,#fff3cf_0%,#f0cf86_22%,#c9963f_55%,#8d6324_82%,#6a4716_100%)] shadow-[inset_0_0_0_2px_rgba(255,240,200,.5),inset_0_0_0_3.5px_rgba(110,72,22,.55),0_3px_8px_-3px_rgba(70,40,5,.7)]'

/** A thin brass double rule just inside a card. */
function CardRule() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-[2px] border border-gold/30">
      <div className="absolute inset-1 rounded-[1px] border border-gold/12" />
    </div>
  )
}

/** For our guests: the thamboola plate resting on the card's top edge, the family's numbers as call tiles, and sharing. */
function GuestServices() {
  const { t, lang } = useI18n()
  const [shareStatus, setShareStatus] = useState<ShareResult | null>(null)
  const share = async () => setShareStatus(await shareInvitation(shareContent(t, lang, wedding.share.siteUrl)))
  return (
    <div id="guest-services" className="relative mt-8 scroll-mt-6 text-center" data-reveal="up">
      <img
        src={THAMBOOLA.src}
        width={THAMBOOLA.width}
        height={THAMBOOLA.height}
        alt=""
        loading="lazy"
        decoding="async"
        className="relative z-10 mx-auto -mb-12 h-auto w-[min(15rem,68%)] drop-shadow-[0_14px_14px_rgba(60,30,10,.3)]"
      />
      <div className={`${card} px-5 pb-5 pt-14`}>
        <CardRule />
        <h3 className="eyebrow !text-label font-bold text-gold">{t('celebrations.guestsTitle')}</h3>
        <p className="mt-3 font-display text-[1.15rem] font-semibold text-ivory">{t('celebrations.call')}</p>
        <div className="relative mt-2 grid grid-cols-2 gap-2.5">
          {wedding.contact.phones.map((p) => (
            <a
              key={p}
              href={`tel:+${p}`}
              className="flex min-h-[4.6rem] flex-col items-center justify-center gap-1.5 rounded-[3px] border border-gold/30 bg-[rgba(255,255,255,.04)] px-1 py-2 text-gold-light transition-colors hover:bg-[rgba(255,255,255,.09)] hover:text-ivory"
            >
              <span className={brassDisc} aria-hidden="true">
                <Phone className="h-4 w-4" />
              </span>
              <span className="whitespace-nowrap text-[0.86rem] font-semibold tracking-wide">
                <span className="sr-only">{t('celebrations.callSr')} </span>
                {displayPhone(p)}
              </span>
            </a>
          ))}
        </div>
        <button type="button" onClick={share} className={`${actionClass.dark} relative mt-2.5 w-full`}>
          <Share2 className="h-4 w-4" aria-hidden="true" /> {t('celebrations.share')}
        </button>
        <p role="status" aria-live="polite" className="mt-1 text-caption text-ivory/70 empty:hidden">
          {shareStatus && shareStatus !== 'cancelled' ? t(`share.${shareStatus}`) : ''}
        </p>
      </div>
    </div>
  )
}

/**
 * The venue: a brass pin standing on an old paper map (a decorative render —
 * the route itself is one tap away), with the hall's details on a card over
 * the foot of the picture, and the guests' card below. Wide screens put the
 * map on the left and the cards on the right.
 */
export function VenueChapter() {
  const { t } = useI18n()
  const o = useOrientation()
  const art = SCENES.venuemap
  // A real photograph of the hall, once the family supplies one, replaces the rendered map.
  const photo = wedding.venue.photo
  const picture = photo ? (
    <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
  ) : (
    <SceneStage art={art} />
  )
  // while the night map loads (or where WebGL is missing) the rendered pin on its map stands in, dimmed to the night
  const nightPicture = (
    <div className="absolute inset-0 [filter:brightness(.5)_saturate(.75)_contrast(1.05)]">
      {picture}
      <div className="absolute inset-0 bg-[#1a2450] opacity-55 mix-blend-multiply" />
    </div>
  )
  const note = !photo && <p className="text-center text-[0.72rem] italic leading-snug text-ivory/55">{t('celebrations.artNote')}</p>
  const cards = (
    <>
      <div className={`${card} px-6 pb-5 pt-7`} data-reveal="up">
        <CardRule />
        <div className="relative">
          <VenueBlock />
        </div>
      </div>
      <GuestServices />
    </>
  )
  if (o === 'portrait') {
    return (
      <article id="venue" aria-labelledby="venue-title" className="relative isolate scroll-mt-0">
        <div className="relative" style={{ aspectRatio: photo ? `${photo.width} / ${photo.height}` : '4 / 5' }}>
          {photo ? (
            <div className="scene-fade pointer-events-none absolute inset-0" style={fades('12%', '34%')}>
              {picture}
            </div>
          ) : (
            // the live 3D drive from the railway station; the rendered pin is its poster and fallback
            <RouteMap fallback={nightPicture} focus={[0.5, 0.44]} maskClass="scene-fade film-grain" maskStyle={fades('10%', '30%')} />
          )}
        </div>
        <div className="relative z-10 -mt-[24%] px-[var(--gutter)] pb-4">
          <div className="mx-auto max-w-[30rem]">
            {cards}
            <div className="mt-4">{note}</div>
          </div>
        </div>
      </article>
    )
  }
  return (
    <article id="venue" aria-labelledby="venue-title" className="relative isolate grid min-h-[max(90svh,42rem)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,31rem)]">
      <div className="relative min-h-[56svh]">
        {photo ? (
          <div className="scene-fade scene-fade-right pointer-events-none absolute inset-0" style={fades('14%', '14%')}>
            {picture}
          </div>
        ) : (
          <RouteMap fallback={nightPicture} focus={[0.46, 0.5]} maskClass="scene-fade scene-fade-right film-grain" maskStyle={fades('10%', '10%')} />
        )}
        <div className="absolute inset-x-6 bottom-2 lg:right-auto">{note}</div>
      </div>
      <div className="relative z-10 flex flex-col justify-center px-[var(--gutter)] py-12 lg:-ml-20 lg:pl-0 lg:pr-12">{cards}</div>
    </article>
  )
}

/** The venue's deep blue night turning into the night green of the RSVP below. */
export function NightBand() {
  return <div aria-hidden="true" className="h-[clamp(6rem,16svh,10rem)]" style={{ background: nightGreenGradient }} />
}
