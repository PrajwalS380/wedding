import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowUpRight, CalendarPlus, Check, Copy, Download, Mail, MapPin, MessageCircle, Phone, Share2 } from 'lucide-react'
import { hasContact, localized, rsvpIsLive, wedding, type DayId } from '../../data/wedding'
import { copyText, scrollToSection, shareInvitation, type ShareResult } from '../../lib/browser'
import { calendarEntryForDay, downloadIcs, googleCalendarUrl, weddingCalendarEntries } from '../../lib/calendar'
import { dateJoiner, formatClock, formatDayLong, formatDayMonthShort, formatWeekday, getTimeline } from '../../lib/dates'
import { shareContent } from '../../lib/shareContent'
import { defaultDayId, getPhase } from '../../lib/weddingClock'
import { currentTime } from '../../hooks/useNow'
import { useMotion } from '../../hooks/motion'
import { LinkButton } from '../ui/Button'
import { VenueIllustration } from '../sections/VenueIllustration'
import { useI18n } from '../../i18n/useI18n'

/* ------------------------------------------------------------------ shell */

interface ShellProps {
  eyebrow: string
  title: ReactNode
  onBack: () => void
  children: ReactNode
}

export function PanelShell({ eyebrow, title, onBack, children }: ShellProps) {
  const headingId = useId()
  const { t } = useI18n()
  return (
    <article aria-labelledby={headingId} className="relative">
      <p className="eyebrow text-gold">{eyebrow}</p>
      <h3 id={headingId} className="mt-3 font-display text-[clamp(1.9rem,1.5rem+1.5vw,2.6rem)] leading-tight text-ivory">
        {title}
      </h3>
      <div className="mt-6">{children}</div>
      <button
        type="button"
        onClick={onBack}
        className="mt-8 inline-flex min-h-11 items-center gap-2 text-label font-semibold uppercase tracking-[0.22em] text-gold-light/85 underline-offset-[6px] transition-colors hover:text-ivory hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('compass.back')}
      </button>
    </article>
  )
}

const textLink =
  'inline-flex min-h-11 items-center gap-2 text-label font-semibold uppercase tracking-[0.22em] text-gold-light underline-offset-[6px] transition-colors hover:text-ivory hover:underline'

/* ---------------------------------------------------------------- welcome */

/** Shown before a direction is chosen: the essentials at a glance (no repeat of the compass labels). */
export function WelcomePanel() {
  const { t, lang } = useI18n()
  const timeline = getTimeline(lang)
  const [first, second] = wedding.days
  const timings = wedding.days.every((d) => !d.startTime)
    ? t('common.toBeAnnounced')
    : wedding.days.map((d) => `${formatWeekday(d, 'short', lang)} · ${formatClock(d.startTime, lang) ?? t('common.toBeAnnounced')}`).join('\n')
  const rows: [string, ReactNode][] = [
    [
      t('compass.when'),
      <>
        {formatWeekday(first, 'long', lang)} {dateJoiner(lang)} {formatWeekday(second, 'long', lang)}
        <span className="block text-ivory/75">{timeline.datesLabel}</span>
      </>,
    ],
    [
      t('compass.where'),
      <>
        {t('venue.name')}
        <span className="block text-ivory/75">{t('venue.city')}</span>
      </>,
    ],
    [t('compass.timings'), <span className="whitespace-pre-line">{timings}</span>],
  ]
  return (
    <div>
      <p className="eyebrow text-gold">{t('compass.glance')}</p>
      <dl className="mt-5 divide-y divide-gold/15 border-y border-gold/15">
        {rows.map(([term, value]) => (
          <div key={term} className="grid gap-1 py-4 xs:grid-cols-[5.25rem_minmax(0,1fr)] xs:items-baseline xs:gap-4">
            <dt className="text-label font-semibold uppercase tracking-[0.26em] text-gold/85">{term}</dt>
            <dd className="font-display text-[1.2rem] leading-snug text-ivory">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 hidden text-caption text-ivory/60 lg:block">{t('compass.keyboardTip')}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ north */

export function InvitationPanel({ onBack }: { onBack: () => void }) {
  const { prefersReducedMotion } = useMotion()
  const { t, lang } = useI18n()
  const timeline = getTimeline(lang)
  const [first, second] = wedding.days
  return (
    <PanelShell eyebrow={`${t('compass.north')} · ${t('compass.invitation')}`} title={t('couple.pair')} onBack={onBack}>
      <p className="font-display text-[1.45rem] text-gold-light">{timeline.datesLabel}</p>
      <p className="mt-0.5 text-[0.86rem] text-ivory/70">
        {formatWeekday(first, 'long', lang)} {dateJoiner(lang)} {formatWeekday(second, 'long', lang)}
      </p>
      <p className="mt-5 max-w-md font-display text-[1.15rem] italic leading-relaxed text-ivory/90">{t('compass.invitationText')}</p>
      <address className="mt-5 border-l border-gold/40 pl-4 not-italic">
        <span className="block font-display text-[1.2rem] text-ivory">{t('venue.name')}</span>
        {(['venue.line1', 'venue.line2', 'venue.line3'] as const).map((k) => (
          <span key={k} className="block text-[0.92rem] text-ivory/75">
            {t(k)}
          </span>
        ))}
      </address>
      <button type="button" onClick={() => scrollToSection('invitation', prefersReducedMotion)} className={`${textLink} mt-5`}>
        {t('compass.readInvitation')} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </PanelShell>
  )
}

/* ------------------------------------------------------------------- east */

export function SchedulePanel({ onBack }: { onBack: () => void }) {
  const { prefersReducedMotion } = useMotion()
  const { t, lang } = useI18n()
  const [dayId, setDayId] = useState<DayId>(() => defaultDayId(getPhase(currentTime())))
  const day = wedding.days.find((d) => d.id === dayId) ?? wedding.days[0]

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const next: DayId = e.key === 'ArrowLeft' ? 'day-1' : 'day-2'
    setDayId(next)
    document.getElementById(`schedule-tab-${next}`)?.focus()
  }

  return (
    <PanelShell eyebrow={`${t('compass.east')} · ${t('compass.schedule')}`} title={t('compass.scheduleTitle')} onBack={onBack}>
      <div role="tablist" aria-label={t('compass.chooseDay')} className="inline-flex rounded-[3px] border border-gold/35 p-1">
        {wedding.days.map((d) => {
          const active = d.id === dayId
          return (
            <button
              key={d.id}
              id={`schedule-tab-${d.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="schedule-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => setDayId(d.id)}
              onKeyDown={onKey}
              className={`min-h-11 rounded-[2px] px-4 text-left transition-colors ${active ? 'bg-gold/15 text-ivory' : 'text-ivory/65 hover:text-ivory'}`}
            >
              <span className="block text-tag font-semibold uppercase tracking-[0.24em] text-gold/80">{t(`days.${d.id}`)}</span>
              <span className="block font-display text-[1.1rem] leading-tight">
                {formatWeekday(d, 'short', lang)} {formatDayMonthShort(d, lang)}
              </span>
            </button>
          )
        })}
      </div>

      <div id="schedule-panel" role="tabpanel" aria-labelledby={`schedule-tab-${dayId}`} className="mt-6">
        <p className="text-[0.92rem] text-gold-light">{formatDayLong(day, lang)}</p>
        <ol className="relative mt-4 border-l border-gold/35 pl-6">
          {day.events.length ? (
            day.events.map((ev) => {
              const time = [formatClock(ev.startTime, lang), formatClock(ev.endTime, lang)].filter(Boolean).join(' – ')
              return (
                <li key={ev.name.en} className="relative pb-5 last:pb-0">
                  <span className="absolute -left-[1.86rem] top-1.5 h-2.5 w-2.5 rotate-45 border border-gold bg-night" aria-hidden="true" />
                  <p className="text-label font-semibold uppercase tracking-[0.18em] text-gold/85">{time || t('common.timeToBeAnnounced')}</p>
                  <p className="font-display text-[1.25rem] text-ivory">{localized(ev.name, lang)}</p>
                  {ev.description && <p className="mt-1 text-[0.9rem] text-ivory/70">{localized(ev.description, lang)}</p>}
                </li>
              )
            })
          ) : (
            <li className="relative">
              <span className="absolute -left-[1.86rem] top-1.5 h-2.5 w-2.5 rotate-45 border border-gold bg-night" aria-hidden="true" />
              <p className="font-display text-[1.3rem] text-ivory">{t('compass.scheduleTba')}</p>
              <p className="mt-1 max-w-sm text-[0.9rem] leading-relaxed text-ivory/70">{t('calendar.schedulePendingNote')}</p>
            </li>
          )}
        </ol>
        {day.dressCode && <p className="mt-5 text-[0.9rem] text-ivory/80">{t('compass.attire', { dress: localized(day.dressCode, lang) ?? '' })}</p>}
        <button type="button" onClick={() => scrollToSection('calendar', prefersReducedMotion)} className={`${textLink} mt-5`}>
          {t('compass.openCalendar')} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </PanelShell>
  )
}

/* ------------------------------------------------------------------ south */

export function VenuePanel({ onBack }: { onBack: () => void }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [showMap, setShowMap] = useState(false)
  const { t, lang } = useI18n()
  const { venue } = wedding
  const copy = async () => {
    const ok = await copyText(venue.fullAddress)
    setCopyState(ok ? 'copied' : 'failed')
    window.setTimeout(() => setCopyState('idle'), 3500)
  }
  return (
    <PanelShell eyebrow={`${t('compass.south')} · ${t('compass.venue')}`} title={t('venue.name')} onBack={onBack}>
      <figure className="overflow-hidden rounded-[3px] border border-gold/25">
        {venue.photo ? (
          <img src={venue.photo.src} width={venue.photo.width} height={venue.photo.height} alt={venue.photo.alt} loading="lazy" decoding="async" className="aspect-[16/7] w-full object-cover" />
        ) : (
          <VenueIllustration className="block aspect-[16/7] h-auto w-full" />
        )}
        {!venue.photo && <figcaption className="bg-night/80 px-3 py-1.5 text-caption italic text-ivory/65">{t('compass.conceptual')}</figcaption>}
      </figure>

      <address className="mt-5 border-l border-gold/40 pl-4 not-italic">
        <span className="sr-only">{t('compass.address')} </span>
        {(['venue.line1', 'venue.line2', 'venue.line3'] as const).map((k) => (
          <span key={k} className="block font-display text-[1.15rem] leading-snug text-ivory/90">
            {t(k)}
          </span>
        ))}
      </address>
      {/* other languages: the official address too, exactly as Google Maps and the copy button use it */}
      {lang !== 'en' && (
        <p lang="en" className="mt-3 border-l border-gold/20 pl-4 text-caption text-ivory/65">
          <span className="block text-ivory/80">{t('compass.asOnMaps')}</span>
          {venue.fullAddress}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <LinkButton href={venue.mapsUrl} external icon={<MapPin className="h-4 w-4" aria-hidden="true" />} className="w-full sm:w-auto">
          {t('compass.directions')}
        </LinkButton>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-[3px] border border-gold/60 px-6 text-button font-semibold uppercase tracking-[0.22em] text-gold-light transition-colors hover:bg-gold/10 hover:text-ivory sm:w-auto"
        >
          {copyState === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copyState === 'copied' ? t('compass.addressCopied') : t('compass.copyAddress')}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-gold-light/90">
        {copyState === 'copied' && t('compass.copiedNote')}
        {copyState === 'failed' && t('compass.copyFailed')}
      </p>

      <button type="button" onClick={() => setShowMap((v) => !v)} aria-expanded={showMap} aria-controls="compass-map" className={textLink}>
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {showMap ? t('compass.hideMap') : t('compass.showMap')}
      </button>
      <p className="text-[0.8rem] text-ivory/55">{t('compass.mapNote')}</p>
      {showMap && (
        <div id="compass-map" className="mt-3 overflow-hidden rounded-[3px] border border-gold/25">
          <iframe
            title={t('compass.mapTitle', { venue: t('venue.name'), city: t('venue.city') })}
            src={venue.mapEmbedUrl}
            className="block h-[min(50svh,16rem)] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}
    </PanelShell>
  )
}

/* ------------------------------------------------------------------- west */

function ServiceCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="border-t border-gold/20 pt-4">
      <h4 className="flex items-center gap-2 font-sans text-label font-semibold uppercase tracking-[0.26em] text-gold">
        <span className="text-gold-light" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h4>
      <div className="mt-2 text-[0.94rem] leading-relaxed text-ivory/80">{children}</div>
    </div>
  )
}

export function ServicesPanel({ onBack }: { onBack: () => void }) {
  const { prefersReducedMotion } = useMotion()
  const { t, lang } = useI18n()
  // statuses are kept as codes and translated at render, so they follow a language change
  const [shareStatus, setShareStatus] = useState<ShareResult | null>(null)
  const [icsDone, setIcsDone] = useState(false)
  const { contact } = wedding

  const share = async () => {
    const url = wedding.share.siteUrl ?? window.location.href.split('#')[0]
    setShareStatus(await shareInvitation(shareContent(t, lang, url)))
  }

  const goToRsvp = () => {
    const input = document.querySelector<HTMLInputElement>('#rsvp form input[name="name"]')
    input?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' })
    input?.focus({ preventScroll: true })
  }

  return (
    <PanelShell eyebrow={`${t('compass.west')} · ${t('compass.services')}`} title={t('compass.servicesTitle')} onBack={onBack}>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <ServiceCard icon={<MessageCircle className="h-4 w-4" />} title={t('compass.rsvpTitle')}>
          {rsvpIsLive() ? (
            <>
              <p>{t('compass.rsvpText')}</p>
              <button type="button" onClick={goToRsvp} className={textLink}>
                {t('compass.rsvpCta')}
              </button>
            </>
          ) : (
            <p>{t('compass.rsvpSoon')}</p>
          )}
        </ServiceCard>

        <ServiceCard icon={<Phone className="h-4 w-4" />} title={t('compass.contactTitle')}>
          {hasContact() ? (
            <ul className="space-y-1">
              {contact.name && <li className="text-ivory">{contact.name}</li>}
              {contact.phone && (
                <li>
                  <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} className={textLink}>
                    <Phone className="h-4 w-4" aria-hidden="true" /> {contact.phone}
                  </a>
                </li>
              )}
              {contact.whatsapp && (
                <li>
                  <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={textLink}>
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
                  </a>
                </li>
              )}
              {contact.email && (
                <li>
                  <a href={`mailto:${contact.email}`} className={textLink}>
                    <Mail className="h-4 w-4" aria-hidden="true" /> {contact.email}
                  </a>
                </li>
              )}
            </ul>
          ) : (
            <p>{t('compass.contactSoon')}</p>
          )}
        </ServiceCard>

        <ServiceCard icon={<Share2 className="h-4 w-4" />} title={t('compass.shareTitle')}>
          <button type="button" onClick={share} className={textLink}>
            <Share2 className="h-4 w-4" aria-hidden="true" /> {t('compass.share')}
          </button>
          <p role="status" aria-live="polite" className="min-h-5 text-sm text-gold-light/90">
            {shareStatus && shareStatus !== 'cancelled' ? t(`share.${shareStatus}`) : ''}
          </p>
        </ServiceCard>

        <ServiceCard icon={<CalendarPlus className="h-4 w-4" />} title={t('compass.calendarTitle')}>
          <button
            type="button"
            onClick={() => {
              downloadIcs(weddingCalendarEntries(lang), wedding.calendarExport.fileName)
              setIcsDone(true)
            }}
            className={textLink}
          >
            <Download className="h-4 w-4" aria-hidden="true" /> {t('compass.icsBoth')}
          </button>
          <ul className="flex flex-wrap gap-x-4">
            {wedding.days.map((d) => {
              const entry = calendarEntryForDay(d, lang)
              return entry ? (
                <li key={d.id}>
                  <a href={googleCalendarUrl(entry)} target="_blank" rel="noopener noreferrer" className={textLink}>
                    {t('compass.google', { date: formatDayMonthShort(d, lang) })}
                    <span className="sr-only"> {t('compass.googleSr', { day: t(`days.${d.id}`) })}</span>
                  </a>
                </li>
              ) : null
            })}
          </ul>
          <p role="status" aria-live="polite" className="min-h-5 text-sm text-gold-light/90">
            {icsDone ? t('compass.icsDone') : ''}
          </p>
          <p className="text-caption text-ivory/60">
            {weddingCalendarEntries(lang).every((e) => e.allDay)
              ? t('compass.allDayNote', { dates: getTimeline(lang).datesLabel })
              : t('compass.timedCalendarNote', { tz: wedding.timezoneLabel })}
          </p>
        </ServiceCard>
      </div>

      <button type="button" onClick={() => scrollToSection('invitation', prefersReducedMotion)} className={`${textLink} mt-6`}>
        {t('compass.returnInvitation')} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </PanelShell>
  )
}
