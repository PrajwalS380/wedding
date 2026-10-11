import { useId, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, ExternalLink, MapPin, MessageCircle, ShieldCheck } from 'lucide-react'
import { wedding } from '../../data/wedding'
import { useMotion } from '../../hooks/motion'
import { useReveal } from '../../hooks/useReveal'
import { scrollToSection } from '../../lib/browser'
import { getTimeline } from '../../lib/dates'
import { buildRsvpMessage, whatsappRsvpUrl, type Attendance } from '../../lib/rsvp'
import { useI18n } from '../../i18n/useI18n'
import { Rich } from '../../i18n/Rich'
import { FloralCorner, LotusDivider } from '../ui/Ornaments'
import { PetalField } from '../ui/Ambient'
import { NameJoiner } from '../ui/Amp'
import { withAmp } from '../ui/withAmp'

/** Sanity bound for the optional attendee count — a typo guard, not a guest limit. */
const MAX_ATTENDEES = 50

/** Validation results, kept as dictionary keys so the messages follow a language change. */
interface Errors {
  name?: 'rsvp.nameError'
  attending?: 'rsvp.attendError'
  guests?: 'rsvp.guestsError'
}

/** "+91 95914 20987" for display (Indian numbers grouped 5 + 5; others shown as +digits). */
function displayNumber(digits: string): string {
  return digits.length === 12 && digits.startsWith('91') ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}` : `+${digits}`
}

const field =
  'mt-2 block min-h-12 w-full rounded-[3px] border border-brass/50 bg-[#fffaf0]/80 px-4 text-[1rem] text-ink shadow-inner outline-none transition-[border-color,box-shadow] placeholder:text-ink-soft/50 focus:border-burgundy focus:shadow-[0_0_0_3px_rgba(125,37,53,.18)] aria-[invalid=true]:border-rose'

/**
 * RSVP through WhatsApp: the guest's reply is turned into a message and a chat
 * with the family opens with it prefilled. The guest reviews it and taps Send
 * in WhatsApp — the website itself never sends or stores anything.
 */
function RsvpForm() {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const opening = useRef(false)
  const [name, setName] = useState('')
  const [attending, setAttending] = useState<Attendance | ''>('')
  const [guests, setGuests] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  /** The prefilled chat link once prepared; `blocked` when the browser stopped the new tab. */
  const [prepared, setPrepared] = useState<{ url: string; blocked: boolean } | null>(null)
  const recipient = displayNumber(wedding.rsvp.whatsappNumber)
  const { t, lang } = useI18n()

  const validate = (): Errors => {
    const e: Errors = {}
    if (name.trim().length < 2) e.name = 'rsvp.nameError'
    if (!attending) e.attending = 'rsvp.attendError'
    if (attending === 'yes' && guests.trim()) {
      const n = Number(guests)
      if (!Number.isInteger(n) || n < 1 || n > MAX_ATTENDEES) e.guests = 'rsvp.guestsError'
    }
    return e
  }

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (opening.current) return // one WhatsApp tab per tap
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      // Focus the first invalid control (decided from the result, not the DOM,
      // because React has not re-rendered the aria-invalid flags yet).
      const selector = e.name ? 'input[name="name"]' : e.attending ? 'input[name="attending"]' : 'input[name="guests"]'
      formRef.current?.querySelector<HTMLElement>(selector)?.focus()
      return
    }
    const url = whatsappRsvpUrl(
      buildRsvpMessage({ name, attendance: attending as Attendance, guests: attending === 'yes' && guests.trim() ? Number(guests) : null }, lang),
    )
    opening.current = true
    setBusy(true)
    // Opened straight from the tap, so it is not treated as a pop-up. If the
    // browser still blocks it, a plain link to the same chat is offered below.
    const win = window.open(url, '_blank')
    if (win) {
      try {
        win.opener = null
      } catch {
        /* cross-origin already — nothing to detach */
      }
    }
    setPrepared({ url, blocked: !win })
    window.setTimeout(() => {
      opening.current = false
      setBusy(false)
    }, 1500)
  }

  const errorText = (key: NonNullable<Errors[keyof Errors]>) => t(key, { max: MAX_ATTENDEES })
  const errorList = Object.values(errors).filter((k): k is NonNullable<Errors[keyof Errors]> => Boolean(k)).map(errorText)

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-8 text-left" aria-describedby={`${id}-how`}>
      <p id={`${id}-how`} className="mb-6 flex gap-3 rounded-[3px] border border-brass/40 bg-parchment/60 p-4 text-[0.9rem] leading-relaxed text-ink">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" aria-hidden="true" />
        <span>
          <Rich text={t('rsvp.how')} parts={{ number: <span className="whitespace-nowrap">({recipient})</span> }} />
        </span>
      </p>

      {errorList.length > 0 && (
        <div role="alert" className="mb-6 rounded-[3px] border border-rose/50 bg-rose/5 p-4 text-[0.9rem] text-ink">
          <p className="font-semibold text-rose">{t('rsvp.checkForm')}</p>
          <ul className="mt-1 list-disc pl-5">
            {errorList.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label htmlFor={`${id}-name`} className="text-label font-bold uppercase tracking-[0.2em] text-burgundy">
          {t('rsvp.name')}
        </label>
        <input
          id={`${id}-name`}
          name="name"
          type="text"
          autoComplete="name"
          maxLength={80}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${id}-name-err` : undefined}
          className={field}
          placeholder={t('rsvp.namePlaceholder')}
        />
        {errors.name && (
          <p id={`${id}-name-err`} className="mt-1.5 text-[0.85rem] text-rose">
            {errorText(errors.name)}
          </p>
        )}
      </div>

      <fieldset className="mt-6" aria-describedby={errors.attending ? `${id}-att-err` : undefined}>
        <legend className="text-label font-bold uppercase tracking-[0.2em] text-burgundy">{t('rsvp.attendLegend')}</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(['yes', 'no'] as const).map((v) => (
            <label
              key={v}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[3px] border px-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-burgundy ${
                attending === v ? 'border-burgundy bg-burgundy/8 text-ink' : 'border-brass/50 bg-[#fffaf0]/60 text-ink hover:border-brass'
              }`}
            >
              <input
                type="radio"
                name="attending"
                value={v}
                checked={attending === v}
                onChange={() => setAttending(v)}
                aria-invalid={Boolean(errors.attending)}
                className="h-4 w-4 accent-[#7d2535]"
              />
              <span className="font-display text-[1.15rem]">{t(v === 'yes' ? 'rsvp.accepts' : 'rsvp.declines')}</span>
            </label>
          ))}
        </div>
        {errors.attending && (
          <p id={`${id}-att-err`} className="mt-1.5 text-[0.85rem] text-rose">
            {errorText(errors.attending)}
          </p>
        )}
      </fieldset>

      {attending === 'yes' && (
        <div className="mt-6">
          <label htmlFor={`${id}-guests`} className="text-label font-bold uppercase tracking-[0.2em] text-burgundy">
            {t('rsvp.guests')} <span className="font-semibold normal-case tracking-normal text-ink-soft">{t('rsvp.optional')}</span>
          </label>
          <input
            id={`${id}-guests`}
            name="guests"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={3}
            value={guests}
            onChange={(e) => setGuests(e.target.value.replace(/\D/g, ''))}
            aria-invalid={Boolean(errors.guests)}
            aria-describedby={errors.guests ? `${id}-guests-err` : undefined}
            className={`${field} max-w-[10rem]`}
            placeholder={t('rsvp.guestsPlaceholder')}
          />
          {errors.guests && (
            <p id={`${id}-guests-err`} className="mt-1.5 text-[0.85rem] text-rose">
              {errorText(errors.guests)}
            </p>
          )}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-[3px] bg-maroon px-6 text-button font-semibold uppercase tracking-[0.18em] text-ivory shadow-[0_12px_28px_-14px_rgba(90,21,36,.9)] transition-[background-color,transform] hover:bg-burgundy active:scale-[0.97] disabled:opacity-60 xs:px-8 xs:tracking-[0.22em] sm:w-auto"
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {busy ? t('rsvp.opening') : t('rsvp.send')}
        </button>
      </div>

      <div role="status" aria-live="polite">
        {prepared && (
          <div className="mt-6 rounded-[3px] border border-brass/50 bg-[#fffaf0]/70 p-5 text-center text-ink">
            <p className="font-display text-[1.25rem] leading-snug text-burgundy">
              {prepared.blocked ? t('rsvp.readyBlocked') : t('rsvp.ready')}
            </p>
            <p className="mt-2 text-[0.92rem] leading-relaxed">
              {prepared.blocked ? t('rsvp.blockedNote') : t('rsvp.readyNote')}
            </p>
            <a
              href={prepared.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 px-3 text-label font-semibold uppercase tracking-[0.2em] text-burgundy underline-offset-4 hover:underline"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {prepared.blocked ? t('rsvp.openWhatsApp') : t('rsvp.openAgain')}
            </a>
          </div>
        )}
      </div>

      <p className="mt-6 flex items-start justify-center gap-2 text-center text-caption text-ink-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t('rsvp.privacy')}</span>
      </p>
    </form>
  )
}

export function RSVPSection() {
  const section = useRef<HTMLElement>(null)
  const { prefersReducedMotion } = useMotion()
  const { t, lang } = useI18n()
  const timeline = getTimeline(lang)
  useReveal(section)

  const startRsvp = () => {
    const input = document.querySelector<HTMLInputElement>('#rsvp form input[name="name"]')
    input?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' })
    input?.focus({ preventScroll: true })
  }

  return (
    <section ref={section} id="rsvp" aria-label={t('nav.rsvp')} className="relative isolate overflow-hidden bg-night">
      {/* ── The final frame: a lamp-lit temple doorway that bookends the hero ── */}
      <div className="relative overflow-hidden pb-24 pt-[var(--section-pad)] sm:pb-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_50%_45%,rgba(240,169,74,.16),transparent_70%),radial-gradient(70%_50%_at_50%_100%,rgba(90,21,36,.5),transparent_70%),linear-gradient(180deg,#061914,#08120e)]" />
        <PetalField count={6} kinds={['rose', 'marigold', 'jasmine']} seed={57} intensity={0.6} />
        <svg
          viewBox="0 0 400 520"
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none absolute left-1/2 top-[calc(var(--section-pad)*0.45)] h-[min(54rem,96%)] w-auto -translate-x-1/2 text-gold"
          aria-hidden="true"
        >
          <path d="M40 520 V215 C40 110 110 40 200 22 C290 40 360 110 360 215 V520" fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
          <path d="M58 520 V218 C58 124 122 60 200 44 C278 60 342 124 342 218 V520" fill="none" stroke="currentColor" strokeOpacity=".22" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d="M200 6 l6 8 l-6 8 l-6 -8 Z" fill="currentColor" fillOpacity=".8" />
          {Array.from({ length: 17 }, (_, i) => {
            const t = (i / 16) * Math.PI
            const x = 200 - Math.cos(t) * 150
            const y = 205 - Math.sin(t) * 165
            return <circle key={i} cx={x} cy={y} r="3" fill={i % 4 === 2 ? '#fbf4e4' : '#e39a32'} fillOpacity=".85" />
          })}
        </svg>

        <div className="relative mx-auto max-w-2xl px-[var(--gutter)] pt-[min(8rem,14vw)] text-center" data-reveal="fade">
          <p className="script text-[length:var(--step-3)] text-gold-light">
            {withAmp(t('rsvp.closingScript'), 'text-[0.75em]')}
          </p>
          <h2 id="rsvp-title" className="mt-6 flex flex-col items-center font-display font-medium leading-[0.9]">
            <span className="text-gold-gradient text-[clamp(3rem,2rem+6vw,6.5rem)]">{t('couple.first')}</span>
            <NameJoiner className="my-1 text-[clamp(1.8rem,1.3rem+2vw,3rem)] text-gold" wordClassName="text-[clamp(1.3rem,1rem+1.4vw,2.1rem)]" />
            <span className="text-gold-gradient text-[clamp(3rem,2rem+6vw,6.5rem)]">{t('couple.second')}</span>
          </h2>
          <p className="mt-6 text-label font-semibold uppercase tracking-[0.3em] text-gold/85">
            {timeline.daysLabel}
            {` · ${timeline.monthYearLabel}`} · {t('venue.city')}
          </p>
          <p className="mx-auto mt-7 max-w-[30rem] font-display text-[length:var(--step-1)] italic leading-relaxed text-ivory/90">
            {t('rsvp.closing')}
          </p>

          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={startRsvp}
              className="inline-flex min-h-12 items-center justify-center gap-3 border border-gold/70 bg-gold/10 px-8 text-button font-semibold uppercase tracking-[0.26em] text-gold-light shadow-[0_0_40px_-12px_rgba(213,176,109,.6)] transition-[background-color,color,transform] hover:bg-gold/20 hover:text-ivory active:scale-[0.97]"
            >
              {t('rsvp.kindly')}
            </button>
            <a
              href={wedding.venue.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 px-6 text-label font-semibold uppercase tracking-[0.24em] text-ivory/85 underline-offset-[6px] transition-colors hover:text-ivory hover:underline"
            >
              <MapPin className="h-4 w-4 text-gold" aria-hidden="true" /> {t('rsvp.directions')}
              <span className="sr-only"> {t('common.mapsNewTab')}</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── The reply card ── */}
      <div className="grain relative bg-forest pb-[var(--section-pad)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(213,176,109,.10),transparent_70%)]" />
        <div className="relative mx-auto w-full max-w-[38rem] -translate-y-14 px-[var(--gutter)]">
          <div className="relative">
            {/* layered parchment sheets */}
            <div className="parchment absolute inset-x-2 inset-y-3 -rotate-[2deg] rounded-[3px] opacity-80 shadow-[0_30px_60px_-30px_rgba(0,0,0,.9)]" aria-hidden="true" />
            <div className="parchment absolute inset-x-1 inset-y-1 rotate-[1.3deg] rounded-[3px] opacity-90 shadow-[0_30px_60px_-30px_rgba(0,0,0,.9)]" aria-hidden="true" />

            <div className="parchment relative rounded-[3px] px-6 py-12 shadow-[0_40px_80px_-30px_rgba(0,0,0,.95)] sm:px-12 sm:py-14" data-reveal="up">
              <div className="pointer-events-none absolute inset-3 border border-brass/50" aria-hidden="true">
                <div className="absolute inset-1.5 border border-brass/20" />
              </div>
              <FloralCorner className="pointer-events-none absolute -left-4 -top-4 w-24 sm:w-32" />
              <FloralCorner className="pointer-events-none absolute -bottom-4 -right-4 w-24 rotate-180 sm:w-32" />

              <div className="relative text-center">
                <p className="text-label font-bold uppercase tracking-[0.3em] text-burgundy">{t('rsvp.cardEyebrow')}</p>
                <h3 className="mt-3 font-display text-[length:var(--step-3)] text-ink">{t('rsvp.cardTitle')}</h3>
                <LotusDivider className="mx-auto mt-4 h-5 w-40 text-brass" />
                {wedding.rsvp.respondBy && <p className="mt-2 text-sm text-ink-soft">{t('rsvp.respondBy', { date: wedding.rsvp.respondBy })}</p>}
              </div>
              <div className="relative mx-auto max-w-[28rem]">
                <RsvpForm />
              </div>
            </div>
          </div>

          <div className="mt-14 flex justify-center">
            <button
              type="button"
              onClick={() => scrollToSection('home', prefersReducedMotion)}
              className="group inline-flex min-h-11 flex-col items-center gap-2 text-label font-semibold uppercase tracking-[0.3em] text-gold-light/85 transition-colors hover:text-ivory"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/45 transition-transform duration-500 group-hover:-translate-y-1">
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </span>
              {t('rsvp.backToTop')}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
