import { Fragment, useState, type CSSProperties, type ReactNode } from 'react'
import { CalendarHeart, Check, Copy, MapPin, MessageCircle, Phone, Share2 } from 'lucide-react'
import { localized, wedding, type CelebrationDay } from '../../data/wedding'
import { SCENES, THAMBOOLA, type SceneArt } from '../../data/sceneArt'
import { copyText, shareInvitation, type ShareResult } from '../../lib/browser'
import { dateJoiner, formatDayLong, formatWeekday, getTimeline } from '../../lib/dates'
import { dayTimeText as eventTime, displayPhone } from '../../lib/eventTime'
import { shareContent } from '../../lib/shareContent'
import { useMotion } from '../../hooks/motion'
import { useI18n } from '../../i18n/useI18n'
import { PetalField } from '../ui/Ambient'
import { SceneStage } from './SceneStage'
import { useOrientation } from '../../hooks/useOrientation'
import { EventCountdown } from './EventCountdown'
import { CalendarMenu } from './CalendarMenu'
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
  clock,
  labelledBy,
  from,
  to,
  landscapeMin = 'min-h-[max(94svh,42rem)]',
  fadeTop = 14,
  fadeBottom = 14,
  className = '',
  overlay,
  children,
}: {
  art: SceneArt
  id?: string
  clock: string
  labelledBy?: string
  from: string
  to: string
  landscapeMin?: string
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
    <article id={id} data-clock={clock} aria-labelledby={labelledBy} className={`relative isolate grid scroll-mt-0 ${className}`} style={{ background: sceneBackdrop(v.edges, from, to, fadeTop, fadeBottom) }}>
      <div aria-hidden="true" className="film-grain scene-fade pointer-events-none absolute inset-0" style={fades(`${fadeTop}%`, `${fadeBottom}%`)}>
        <SceneStage art={art} />
        {overlay}
      </div>
      <div aria-hidden="true" className={`col-start-1 row-start-1 ${o === 'landscape' ? landscapeMin : ''}`} style={o === 'portrait' ? { aspectRatio: `${v.width} / ${v.height}` } : undefined} />
      <div className="relative z-10 col-start-1 row-start-1 flex flex-col">{children}</div>
    </article>
  )
}

const glassCard =
  'rounded-[6px] border border-gold-light/25 bg-[linear-gradient(180deg,rgba(22,12,24,.42),rgba(10,6,14,.58))] shadow-[0_24px_50px_-20px_rgba(0,0,0,.75)] backdrop-blur-[16px] backdrop-saturate-[1.2]'

/* ---------------------------------------------------------------- 1 · sunset: at a glance */

export function GlanceChapter() {
  const { t, lang } = useI18n()
  const o = useOrientation()
  const [d1, d2] = wedding.days
  const tl = getTimeline(lang)
  const rows: [string, ReactNode][] = [
    [
      t('celebrations.when'),
      <>
        {formatWeekday(d1, 'long', lang)} {dateJoiner(lang)} {formatWeekday(d2, 'long', lang)}
        <small className="block text-[0.86em] text-ivory/70">{tl.datesLabel}</small>
      </>,
    ],
    [
      t('celebrations.where'),
      <>
        {t('venue.name')}
        <small className="block text-[0.86em] text-ivory/70">{t('venue.city')}</small>
      </>,
    ],
    [
      t('celebrations.timings'),
      <>
        {wedding.days.map((d, i) => (
          <span key={d.id} className={i ? 'block text-[0.86em] text-ivory/75' : 'block'}>
            {localized(d.events[0]?.name ?? null, lang) ?? t(`days.${d.id}`)} · {formatWeekday(d, 'short', lang)}, {eventTime(d, t, lang)}
          </span>
        ))}
      </>,
    ],
  ]
  const portrait = o === 'portrait'
  return (
    <SceneChapter
      art={SCENES.sunset}
      clock="glance"
      labelledBy="celebrations-title"
      from={SKY.dusk}
      to={SKY.nightfall}
      fadeTop={portrait ? 14 : 22}
      overlay={
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]">
          {portrait ? (
            <div className="absolute inset-x-0 top-0 h-[38%] bg-[linear-gradient(180deg,rgba(8,8,26,.5),transparent)]" />
          ) : (
            <div className="absolute inset-y-0 left-0 w-[58%] bg-[linear-gradient(90deg,rgba(8,6,18,.62),rgba(8,6,18,.3)_60%,transparent)]" />
          )}
        </div>
      }
    >
      <div
        className={`container-wide flex flex-1 flex-col ${
          portrait ? 'justify-between pb-[7%] pt-[calc(var(--safe-top)+4.25rem)] text-center' : 'justify-center gap-10 py-28'
        }`}
      >
        <header className={portrait ? '' : 'max-w-[31rem]'} data-reveal="fade">
          <p className="eyebrow text-gold-light [text-shadow:0_1px_8px_rgba(0,0,0,.6)]">{t('celebrations.eyebrow')}</p>
          <h2
            id="celebrations-title"
            className="mt-3 font-display text-[clamp(3rem,2.4rem+3vw,5rem)] font-medium leading-[0.95] text-ivory [text-shadow:0_2px_18px_rgba(0,0,0,.55),0_1px_3px_rgba(0,0,0,.45)]"
          >
            <SceneTitle text={t('celebrations.title')} />
          </h2>
          <p className="mt-3 text-[0.95rem] text-[rgba(255,240,220,.95)] [text-shadow:0_1px_3px_rgba(0,0,0,.7),0_0_14px_rgba(8,8,26,.9)]">{t('celebrations.sub')}</p>
        </header>
        <div className={`${glassCard} px-5 pb-2 pt-5 text-left ${portrait ? 'mx-auto w-full max-w-[26rem]' : 'max-w-[31rem]'}`} data-reveal="up">
          <p className="eyebrow text-gold">{t('celebrations.glance')}</p>
          <dl className="mt-3">
            {rows.map(([term, value]) => (
              <div key={term} className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-3 border-t border-gold-light/15 py-3">
                <dt className="pt-1 text-label font-semibold uppercase tracking-[0.24em] text-gold-light/85">{term}</dt>
                <dd className="font-display text-[1.18rem] leading-snug text-ivory">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </SceneChapter>
  )
}

/* ---------------------------------------------------------------- 2 · night: Aaratakshate */

export function ReceptionChapter({ day }: { day: CelebrationDay }) {
  const { t, lang } = useI18n()
  const o = useOrientation()
  const portrait = o === 'portrait'
  const ev = day.events[0]
  return (
    <SceneChapter
      art={SCENES.night}
      id="aaratakshate"
      clock="aaratakshate"
      labelledBy="aaratakshate-title"
      from={SKY.nightfall}
      to={SKY.embers}
      overlay={
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]">
          {portrait ? (
            <div className="absolute inset-x-0 top-[34%] h-[46%] bg-[radial-gradient(75%_55%_at_35%_50%,rgba(2,3,10,.55),transparent_75%)]" />
          ) : (
            <div className="absolute inset-y-0 left-0 w-[55%] bg-[linear-gradient(90deg,rgba(2,3,10,.62),rgba(2,3,10,.25)_65%,transparent)]" />
          )}
        </div>
      }
    >
      <div className={`container-wide flex flex-1 flex-col ${portrait ? 'pt-[76%]' : 'justify-center py-28'}`}>
        <div className="max-w-[30rem]" data-reveal="up">
          <p className="eyebrow text-gold-light [text-shadow:0_1px_8px_rgba(0,0,0,.6)]">
            {t(`days.${day.id}`)} · {formatDayLong(day, lang)}
          </p>
          <h3 id="aaratakshate-title" className="mt-3 font-display text-[clamp(3rem,2.5rem+2.6vw,4.6rem)] font-medium leading-[0.95] text-gold-gradient [filter:drop-shadow(0_4px_18px_rgba(0,0,0,.6))]">
            {localized(ev?.name ?? null, lang)}
          </h3>
          <p className="mt-1 font-display text-[1.3rem] italic text-ivory/90 [text-shadow:0_1px_8px_rgba(0,0,0,.6)]">{localized(ev?.description ?? null, lang)}</p>
          <p className="mt-5 font-display text-[clamp(2.2rem,1.9rem+1.6vw,3rem)] font-medium leading-tight text-ivory [text-shadow:0_2px_14px_rgba(0,0,0,.6)]">
            {eventTime(day, t, lang)}
            <span className="ml-2 align-middle font-sans text-label font-semibold tracking-[0.2em] text-gold-light/80">{wedding.timezoneLabel}</span>
          </p>
          <div className="mt-4">
            <EventCountdown day={day} tone="dark" layout="inline" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <CalendarMenu days={[day]} tone="dark" />
            <a href={wedding.venue.mapsUrl} target="_blank" rel="noopener noreferrer" className={actionClass.dark}>
              <MapPin className="h-4 w-4" aria-hidden="true" /> {t('celebrations.directions')}
              <span className="sr-only"> {t('common.mapsNewTab')}</span>
            </a>
          </div>
        </div>
      </div>
    </SceneChapter>
  )
}

/* ---------------------------------------------------------------- dawn: night turning to morning */

/** A short band of sky between the night and the morning scene: no page of its own, just the light changing. */
function DawnBand({ to }: { to: string }) {
  return <div aria-hidden="true" className="h-[clamp(6.5rem,16svh,10rem)]" style={{ background: dawnGradient(to) }} />
}

/** Behind a scene's top edge: the dawn's last colour, then the paper shows through below the fade. */
const underTop = (colour: string, fade: string) => `linear-gradient(180deg, ${colour} 0, ${colour} ${fade}, transparent ${fade})`

/* ---------------------------------------------------------------- 3 · sunrise: Muhurta */

export function MuhurtaChapter({ day }: { day: CelebrationDay }) {
  const { t, lang } = useI18n()
  const o = useOrientation()
  const portrait = o === 'portrait'
  const ev = day.events[0]
  const art = SCENES.sunrise
  const content = (
    <div className="text-center lg:text-left">
      <p className="indic-boost text-label font-bold uppercase tracking-[0.24em] text-burgundy">
        {t(`days.${day.id}`)} · {formatDayLong(day, lang)}
      </p>
      <h3 id="muhurta-title" className="mt-3 font-display text-[clamp(2.6rem,2.2rem+2vw,3.8rem)] font-semibold leading-[1] text-maroon">
        {localized(ev?.name ?? null, lang)}
      </h3>
      <p className="mt-3 font-display text-[clamp(1.5rem,1.35rem+0.8vw,1.95rem)] leading-snug text-ink">
        {eventTime(day, t, lang)} <span className="font-sans text-label font-semibold tracking-[0.2em] text-brass-deep">{wedding.timezoneLabel}</span>
      </p>
      <div className="mt-5">
        <EventCountdown day={day} tone="light" layout="boxes" />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5 lg:justify-start">
        <CalendarMenu days={[day]} tone="light" fill />
        <a href={wedding.venue.mapsUrl} target="_blank" rel="noopener noreferrer" className={actionClass.light}>
          <MapPin className="h-4 w-4" aria-hidden="true" /> {t('celebrations.directions')}
          <span className="sr-only"> {t('common.mapsNewTab')}</span>
        </a>
      </div>
    </div>
  )
  if (portrait) {
    return (
      <article id="muhurta" aria-labelledby="muhurta-title" className="relative isolate">
        <DawnBand to={art.portrait.edges[0]} />
        <div data-clock="muhurta" className="relative" style={{ aspectRatio: `${art.portrait.width} / ${art.portrait.height}`, background: underTop(art.portrait.edges[0], '12%') }}>
          <div aria-hidden="true" className="film-grain scene-fade pointer-events-none absolute inset-0" style={fades('12%', '24%')}>
            <SceneStage art={art} />
          </div>
          <PetalField count={6} kinds={['marigold', 'rose', 'marigold']} seed={33} intensity={0.75} />
        </div>
        <div className="relative z-10 px-[var(--gutter)] pb-12 pt-2">
          <div className="mx-auto max-w-[30rem]" data-reveal="up">
            {content}
          </div>
        </div>
      </article>
    )
  }
  return (
    <article id="muhurta" aria-labelledby="muhurta-title" className="relative isolate">
      <DawnBand to={art.landscape.edges[0]} />
      <div data-clock="muhurta" className="relative flex min-h-[max(94svh,42rem)] items-center" style={{ background: underTop(art.landscape.edges[0], '12%') }}>
        <div aria-hidden="true" className="film-grain scene-fade pointer-events-none absolute inset-0" style={fades('12%', '26%')}>
          <SceneStage art={art} />
        </div>
        <PetalField count={8} kinds={['marigold', 'rose', 'marigold']} seed={33} intensity={0.75} />
        <div className="container-wide relative z-10 py-24">
          <div className="paper-sheet paper-card max-w-[31rem] rounded-[3px] px-9 py-10" data-reveal="up">
            {content}
          </div>
        </div>
      </div>
    </article>
  )
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
      <div className="mt-5 flex flex-wrap justify-center gap-2.5 lg:justify-start">
        <a href={venue.mapsUrl} target="_blank" rel="noopener noreferrer" className={actionClass.lightFill}>
          <MapPin className="h-4 w-4" aria-hidden="true" /> {t('celebrations.getDirections')}
          <span className="sr-only"> {t('common.mapsNewTab')}</span>
        </a>
        <button type="button" onClick={copy} className={actionClass.light}>
          {copyState === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copyState === 'copied' ? t('celebrations.addressCopied') : t('celebrations.copyAddress')}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-caption text-burgundy">
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

const brassDisc =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#3e2508] bg-[radial-gradient(circle_at_35%_28%,#fff3cf_0%,#f0cf86_22%,#c9963f_55%,#8d6324_82%,#6a4716_100%)] shadow-[inset_0_0_0_2px_rgba(255,240,200,.5),inset_0_0_0_3.5px_rgba(110,72,22,.55),0_3px_8px_-3px_rgba(70,40,5,.7)]'
const serviceCard = 'flex min-h-[4.75rem] items-center gap-3 rounded-[4px] bg-[rgba(255,252,244,.5)] p-3 text-left shadow-[0_0_0_1px_rgba(122,90,40,.28),0_6px_14px_-10px_rgba(80,50,20,.45)]'

function GuestServices() {
  const { t, lang } = useI18n()
  const { prefersReducedMotion } = useMotion()
  const [shareStatus, setShareStatus] = useState<ShareResult | null>(null)
  const goToRsvp = () => {
    const input = document.querySelector<HTMLInputElement>('#rsvp form input[name="name"]')
    input?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' })
    input?.focus({ preventScroll: true })
  }
  const share = async () => setShareStatus(await shareInvitation(shareContent(t, lang, wedding.share.siteUrl)))
  return (
    <div id="guest-services" className="scroll-mt-6" data-reveal="up">
      <h3 className="eyebrow !text-label text-center font-bold text-burgundy lg:text-left">{t('celebrations.guestsTitle')}</h3>
      <img
        src={THAMBOOLA.src}
        width={THAMBOOLA.width}
        height={THAMBOOLA.height}
        alt=""
        loading="lazy"
        decoding="async"
        className="mx-auto mt-2 h-auto w-[min(19rem,80%)] lg:mx-0"
      />
      <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
        <button type="button" onClick={goToRsvp} className={`${serviceCard} transition-colors hover:bg-[rgba(255,252,244,.75)]`}>
          <span className={brassDisc} aria-hidden="true">
            <MessageCircle className="h-[18px] w-[18px]" />
          </span>
          <span>
            <span className="block font-display text-[1.15rem] font-semibold leading-tight text-ink">{t('celebrations.rsvp')}</span>
            <span className="block text-caption text-ink-soft">{t('celebrations.rsvpHint')}</span>
          </span>
        </button>
        <div className={serviceCard}>
          <span className={brassDisc} aria-hidden="true">
            <Phone className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-[1.15rem] font-semibold leading-tight text-ink">{t('celebrations.call')}</span>
            {wedding.contact.phones.map((p) => (
              <a key={p} href={`tel:+${p}`} className="block min-h-6 whitespace-nowrap text-[0.9rem] font-semibold text-maroon underline-offset-4 hover:underline">
                <span className="sr-only">{t('celebrations.callSr')} </span>
                {displayPhone(p)}
              </a>
            ))}
          </span>
        </div>
        <div className={serviceCard}>
          <span className={brassDisc} aria-hidden="true">
            <Share2 className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <button type="button" onClick={share} className="block text-left font-display text-[1.15rem] font-semibold leading-tight text-ink underline-offset-4 hover:underline">
              {t('celebrations.share')}
            </button>
            <span role="status" aria-live="polite" className="block text-caption text-ink-soft">
              {shareStatus && shareStatus !== 'cancelled' ? t(`share.${shareStatus}`) : t('celebrations.shareHint')}
            </span>
          </span>
        </div>
        <div className={`${serviceCard} flex-wrap sm:col-span-2`}>
          <span className={brassDisc} aria-hidden="true">
            <CalendarHeart className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 basis-40">
            <span className="block font-display text-[1.15rem] font-semibold leading-tight text-ink">{t('celebrations.saveDates')}</span>
            <span className="block text-caption text-ink-soft">{t('celebrations.calendarHint')}</span>
          </span>
          <CalendarMenu days={wedding.days} tone="light" align="end" className="ml-auto shrink-0" />
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
      <SceneStage art={art} />
      <PetalField count={o === 'portrait' ? 5 : 6} kinds={['marigold', 'jasmine', 'marigold']} seed={41} intensity={0.7} />
    </>
  )
  // the note sits where the picture has already faded into the paper
  const caption = !photo && <p className="absolute bottom-1 right-[var(--gutter)] z-[2] text-[0.7rem] italic text-ink-soft/85 lg:left-8 lg:right-auto">{t('celebrations.artNote')}</p>
  const portraitRatio = photo ? `${photo.width} / ${photo.height}` : `${art.portrait.width} / ${art.portrait.height}`
  const body = (
    <>
      <VenueBlock />
      <div className="my-8 flex items-center gap-3 text-brass" aria-hidden="true">
        <span className="h-px flex-1 bg-[linear-gradient(90deg,transparent,rgba(169,132,75,.65))]" />✦
        <span className="h-px flex-1 bg-[linear-gradient(270deg,transparent,rgba(169,132,75,.65))]" />
      </div>
      <GuestServices />
    </>
  )
  if (o === 'portrait') {
    return (
      <article id="venue" aria-labelledby="venue-title" className="relative isolate scroll-mt-0">
        <div data-clock="venue" className="relative" style={{ aspectRatio: portraitRatio }}>
          <div className={`scene-fade pointer-events-none absolute inset-0 ${photo ? '' : 'film-grain'}`} style={fades('18%', '18%')}>
            {picture}
          </div>
          {caption}
        </div>
        <div className="relative z-10 px-[var(--gutter)] pb-6 pt-6">
          <div className="mx-auto max-w-[32rem]">{body}</div>
        </div>
      </article>
    )
  }
  return (
    <article id="venue" aria-labelledby="venue-title" className="relative isolate grid min-h-[max(94svh,44rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
      <div data-clock="venue" className="relative min-h-[60svh]">
        <div className={`scene-fade scene-fade-right pointer-events-none absolute inset-0 ${photo ? '' : 'film-grain'}`} style={fades('16%', '16%')}>
          {picture}
        </div>
        {caption}
      </div>
      <div className="relative z-10 px-[var(--gutter)] pb-10 pt-16 lg:px-12">{body}</div>
    </article>
  )
}

/** The end of the day: the paper warms and darkens into the night of the RSVP below. */
export function DuskBand() {
  return <div aria-hidden="true" className="h-[clamp(8rem,22svh,13rem)]" style={{ background: duskGradient }} />
}
