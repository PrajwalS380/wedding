import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowUpRight, CalendarPlus, Check, Copy, Download, Mail, MapPin, MessageCircle, Phone, Send, Share2 } from 'lucide-react'
import { hasContact, rsvpIsLive, wedding, type DayId } from '../../data/wedding'
import { copyText, scrollToSection, shareInvitation, type ShareResult } from '../../lib/browser'
import { calendarEntryForDay, downloadIcs, googleCalendarUrl, weddingCalendarEntries } from '../../lib/calendar'
import { formatClock, formatDayLong, formatDayMonthShort, formatWeekday, getTimeline } from '../../lib/dates'
import { defaultDayId, getPhase } from '../../lib/weddingClock'
import { currentTime } from '../../hooks/useNow'
import { useMotion } from '../../hooks/motion'
import { LinkButton } from '../ui/Button'
import { VenueIllustration } from '../sections/VenueIllustration'

/* ------------------------------------------------------------------ shell */

interface ShellProps {
  eyebrow: string
  title: ReactNode
  onBack: () => void
  children: ReactNode
}

export function PanelShell({ eyebrow, title, onBack, children }: ShellProps) {
  const headingId = useId()
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
        Back to the compass
      </button>
    </article>
  )
}

const textLink =
  'inline-flex min-h-11 items-center gap-2 text-label font-semibold uppercase tracking-[0.22em] text-gold-light underline-offset-[6px] transition-colors hover:text-ivory hover:underline'

/* ---------------------------------------------------------------- welcome */

/** Shown before a direction is chosen: the essentials at a glance (no repeat of the compass labels). */
export function WelcomePanel() {
  const timeline = getTimeline()
  const [first, second] = wedding.days
  const timings = wedding.days.every((d) => !d.startTime)
    ? 'To be announced'
    : wedding.days.map((d) => `${formatWeekday(d, 'short')} · ${formatClock(d.startTime) ?? 'to be announced'}`).join('\n')
  const rows: [string, ReactNode][] = [
    [
      'When',
      <>
        {formatWeekday(first)} &amp; {formatWeekday(second)}
        <span className="block text-ivory/75">{timeline.datesLabel}</span>
      </>,
    ],
    [
      'Where',
      <>
        {wedding.venue.name}
        <span className="block text-ivory/75">{wedding.venue.city}</span>
      </>,
    ],
    ['Timings', <span className="whitespace-pre-line">{timings}</span>],
  ]
  return (
    <div>
      <p className="eyebrow text-gold">At a glance</p>
      <dl className="mt-5 divide-y divide-gold/15 border-y border-gold/15">
        {rows.map(([term, value]) => (
          <div key={term} className="grid gap-1 py-4 xs:grid-cols-[5.25rem_minmax(0,1fr)] xs:items-baseline xs:gap-4">
            <dt className="text-label font-semibold uppercase tracking-[0.26em] text-gold/85">{term}</dt>
            <dd className="font-display text-[1.2rem] leading-snug text-ivory">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 hidden text-caption text-ivory/60 lg:block">Tip: with a keyboard, the arrow keys move around the compass.</p>
    </div>
  )
}

/* ------------------------------------------------------------------ north */

export function InvitationPanel({ onBack }: { onBack: () => void }) {
  const { prefersReducedMotion } = useMotion()
  const timeline = getTimeline()
  const [first, second] = wedding.days
  return (
    <PanelShell eyebrow="North · The Invitation" title={wedding.couple.pair} onBack={onBack}>
      <p className="font-display text-[1.45rem] text-gold-light">{timeline.datesLabel}</p>
      <p className="mt-0.5 text-[0.86rem] text-ivory/70">
        {formatWeekday(first)} &amp; {formatWeekday(second)}
      </p>
      <p className="mt-5 max-w-md font-display text-[1.15rem] italic leading-relaxed text-ivory/90">{wedding.copy.compassInvitation}</p>
      <address className="mt-5 border-l border-gold/40 pl-4 not-italic">
        <span className="block font-display text-[1.2rem] text-ivory">{wedding.venue.name}</span>
        {wedding.venue.addressLines.map((l) => (
          <span key={l} className="block text-[0.92rem] text-ivory/75">
            {l}
          </span>
        ))}
      </address>
      <button type="button" onClick={() => scrollToSection('invitation', prefersReducedMotion)} className={`${textLink} mt-5`}>
        Read the full invitation <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </PanelShell>
  )
}

/* ------------------------------------------------------------------- east */

export function SchedulePanel({ onBack }: { onBack: () => void }) {
  const { prefersReducedMotion } = useMotion()
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
    <PanelShell eyebrow="East · The Schedule" title="Two days of celebration" onBack={onBack}>
      <div role="tablist" aria-label="Choose a wedding day" className="inline-flex rounded-[3px] border border-gold/35 p-1">
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
              <span className="block text-tag font-semibold uppercase tracking-[0.24em] text-gold/80">{d.label}</span>
              <span className="block font-display text-[1.1rem] leading-tight">
                {formatWeekday(d, 'short')} {formatDayMonthShort(d)}
              </span>
            </button>
          )
        })}
      </div>

      <div id="schedule-panel" role="tabpanel" aria-labelledby={`schedule-tab-${dayId}`} className="mt-6">
        <p className="text-[0.92rem] text-gold-light">{formatDayLong(day)}</p>
        <ol className="relative mt-4 border-l border-gold/35 pl-6">
          {day.events.length ? (
            day.events.map((ev) => {
              const time = [formatClock(ev.startTime), formatClock(ev.endTime)].filter(Boolean).join(' – ')
              return (
                <li key={ev.name} className="relative pb-5 last:pb-0">
                  <span className="absolute -left-[1.86rem] top-1.5 h-2.5 w-2.5 rotate-45 border border-gold bg-night" aria-hidden="true" />
                  <p className="text-label font-semibold uppercase tracking-[0.18em] text-gold/85">{time || 'Time to be announced'}</p>
                  <p className="font-display text-[1.25rem] text-ivory">{ev.name}</p>
                  {ev.description && <p className="mt-1 text-[0.9rem] text-ivory/70">{ev.description}</p>}
                </li>
              )
            })
          ) : (
            <li className="relative">
              <span className="absolute -left-[1.86rem] top-1.5 h-2.5 w-2.5 rotate-45 border border-gold bg-night" aria-hidden="true" />
              <p className="font-display text-[1.3rem] text-ivory">Schedule to be announced</p>
              <p className="mt-1 max-w-sm text-[0.9rem] leading-relaxed text-ivory/70">{wedding.copy.schedulePendingNote}</p>
            </li>
          )}
        </ol>
        {day.dressCode && <p className="mt-5 text-[0.9rem] text-ivory/80">Attire: {day.dressCode}</p>}
        <button type="button" onClick={() => scrollToSection('calendar', prefersReducedMotion)} className={`${textLink} mt-5`}>
          Open the Living Calendar <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </PanelShell>
  )
}

/* ------------------------------------------------------------------ south */

export function VenuePanel({ onBack }: { onBack: () => void }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [showMap, setShowMap] = useState(false)
  const { venue } = wedding
  const copy = async () => {
    const ok = await copyText(venue.fullAddress)
    setCopyState(ok ? 'copied' : 'failed')
    window.setTimeout(() => setCopyState('idle'), 3500)
  }
  return (
    <PanelShell eyebrow="South · The Venue" title={venue.name} onBack={onBack}>
      <figure className="overflow-hidden rounded-[3px] border border-gold/25">
        {venue.photo ? (
          <img src={venue.photo.src} width={venue.photo.width} height={venue.photo.height} alt={venue.photo.alt} loading="lazy" decoding="async" className="aspect-[16/7] w-full object-cover" />
        ) : (
          <VenueIllustration className="block aspect-[16/7] h-auto w-full" />
        )}
        {!venue.photo && <figcaption className="bg-night/80 px-3 py-1.5 text-caption italic text-ivory/65">Conceptual illustration — not a photograph of the venue.</figcaption>}
      </figure>

      <address className="mt-5 border-l border-gold/40 pl-4 not-italic">
        <span className="sr-only">Address: </span>
        {venue.addressLines.map((l) => (
          <span key={l} className="block font-display text-[1.15rem] leading-snug text-ivory/90">
            {l}
          </span>
        ))}
      </address>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <LinkButton href={venue.mapsUrl} external icon={<MapPin className="h-4 w-4" aria-hidden="true" />} className="w-full sm:w-auto">
          Get Directions
        </LinkButton>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-[3px] border border-gold/60 px-6 text-button font-semibold uppercase tracking-[0.22em] text-gold-light transition-colors hover:bg-gold/10 hover:text-ivory sm:w-auto"
        >
          {copyState === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copyState === 'copied' ? 'Address copied' : 'Copy address'}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-gold-light/90">
        {copyState === 'copied' && 'The full address is on your clipboard.'}
        {copyState === 'failed' && 'Copying is not available here — please select the address above.'}
      </p>

      <button type="button" onClick={() => setShowMap((v) => !v)} aria-expanded={showMap} aria-controls="compass-map" className={textLink}>
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {showMap ? 'Hide the map preview' : 'Show map preview'}
      </button>
      <p className="text-[0.8rem] text-ivory/55">The map preview loads from Google only if you choose to show it.</p>
      {showMap && (
        <div id="compass-map" className="mt-3 overflow-hidden rounded-[3px] border border-gold/25">
          <iframe
            title={`Google Map showing ${venue.name}, ${venue.city}`}
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

const shareMessages: Record<ShareResult, string> = {
  shared: 'Thank you for sharing the invitation.',
  copied: 'Invitation link copied to your clipboard.',
  cancelled: '',
  failed: 'Sharing isn’t available here — please copy the link from the address bar.',
}

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
  const [shareStatus, setShareStatus] = useState('')
  const [icsStatus, setIcsStatus] = useState('')
  const { contact } = wedding

  const share = async () => {
    const url = wedding.share.siteUrl ?? window.location.href.split('#')[0]
    setShareStatus(shareMessages[await shareInvitation({ title: wedding.share.title, text: wedding.share.text, url })])
  }

  const goToRsvp = () => {
    const input = document.querySelector<HTMLInputElement>('#rsvp form input[name="name"]')
    input?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' })
    input?.focus({ preventScroll: true })
  }

  return (
    <PanelShell eyebrow="West · Guest Services" title="At your service" onBack={onBack}>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <ServiceCard icon={<Send className="h-4 w-4" />} title="RSVP">
          {rsvpIsLive() ? (
            <button type="button" onClick={goToRsvp} className={textLink}>
              Reply online
            </button>
          ) : (
            <p>RSVP details will be shared soon.</p>
          )}
        </ServiceCard>

        <ServiceCard icon={<Phone className="h-4 w-4" />} title="Contact">
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
            <p>Contact details will be shared soon.</p>
          )}
        </ServiceCard>

        <ServiceCard icon={<Share2 className="h-4 w-4" />} title="Share the invitation">
          <button type="button" onClick={share} className={textLink}>
            <Share2 className="h-4 w-4" aria-hidden="true" /> Share invitation
          </button>
          <p role="status" aria-live="polite" className="min-h-5 text-sm text-gold-light/90">
            {shareStatus}
          </p>
        </ServiceCard>

        <ServiceCard icon={<CalendarPlus className="h-4 w-4" />} title="Add to calendar">
          <button
            type="button"
            onClick={() => {
              downloadIcs(weddingCalendarEntries(), wedding.calendarExport.fileName)
              setIcsStatus('Calendar file downloaded — open it to add both days.')
            }}
            className={textLink}
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Both days (.ics)
          </button>
          <ul className="flex flex-wrap gap-x-4">
            {wedding.days.map((d) => {
              const entry = calendarEntryForDay(d)
              return entry ? (
                <li key={d.id}>
                  <a href={googleCalendarUrl(entry)} target="_blank" rel="noopener noreferrer" className={textLink}>
                    Google · {formatDayMonthShort(d)}
                    <span className="sr-only"> ({d.label}, opens in a new tab)</span>
                  </a>
                </li>
              ) : null
            })}
          </ul>
          <p role="status" aria-live="polite" className="min-h-5 text-sm text-gold-light/90">
            {icsStatus}
          </p>
          <p className="text-caption text-ivory/60">
            {weddingCalendarEntries().every((e) => e.allDay)
              ? `All-day entries for ${getTimeline().datesLabel} — ceremony times will be added once confirmed.`
              : `Days with confirmed timings are added at those times (${wedding.timezoneLabel}); any others as all-day entries.`}
          </p>
        </ServiceCard>
      </div>

      <button type="button" onClick={() => scrollToSection('invitation', prefersReducedMotion)} className={`${textLink} mt-6`}>
        Return to the invitation <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </PanelShell>
  )
}
