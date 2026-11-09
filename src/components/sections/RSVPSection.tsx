import { useId, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { ArrowUp, ExternalLink, Flower2, MessageCircle, ShieldCheck } from 'lucide-react'
import { SCENES } from '../../data/sceneArt'
import { SCROLL_ART } from '../../data/scrollArt.generated'
import { wedding } from '../../data/wedding'
import { useMotion } from '../../hooks/motion'
import { useReveal } from '../../hooks/useReveal'
import { scrollToSection } from '../../lib/browser'
import { buildRsvpMessage, whatsappRsvpUrl, type Attendance } from '../../lib/rsvp'
import { useI18n } from '../../i18n/useI18n'
import { Rich } from '../../i18n/Rich'
import { SceneStage } from '../celebrations/SceneStage'
import { PetalShower } from '../invitation/parts'
import { useDeckle } from '../invitation/paper'
import { CornerFlourish, LotusDivider } from '../ui/Ornaments'
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

const label = 'inv-caps indic-boost text-[0.72rem] font-semibold tracking-[0.22em] text-burgundy'

/** A lamp, lit — for "joyfully accepts". */
function Diya({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <path d="M20 6 C16.5 11 17.5 15.5 20 18 C22.5 15.5 23.5 11 20 6 Z" fill="currentColor" opacity=".9" />
      <path d="M20 10.5 C18.8 12.6 19.1 14.6 20 15.6 C20.9 14.6 21.2 12.6 20 10.5 Z" fill="#fff4d6" opacity=".9" />
      <path d="M6 22 H34 C33 28.5 27.5 32 20 32 C12.5 32 7 28.5 6 22 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M31 22 C33.5 20.5 35.5 20.8 36.5 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 35 H26" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

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
  const [prepared, setPrepared] = useState<{ url: string; blocked: boolean; n: number } | null>(null)
  const recipient = displayNumber(wedding.rsvp.whatsappNumber)
  const { t, lang } = useI18n()
  const { ambientMotion } = useMotion()

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
    setPrepared((p) => ({ url, blocked: !win, n: (p?.n ?? 0) + 1 }))
    window.setTimeout(() => {
      opening.current = false
      setBusy(false)
    }, 1500)
  }

  const errorText = (key: NonNullable<Errors[keyof Errors]>) => t(key, { max: MAX_ATTENDEES })
  const errorList = Object.values(errors).filter((k): k is NonNullable<Errors[keyof Errors]> => Boolean(k)).map(errorText)

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-8 text-left" aria-describedby={`${id}-how`}>
      <p id={`${id}-how`} className="mb-7 flex gap-3.5 rounded-[3px] border border-[#a9844b]/40 bg-[rgba(255,250,236,.5)] p-4 text-[0.92rem] leading-relaxed text-ink shadow-[inset_0_1px_0_rgba(255,255,255,.6)]">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_28%,#fff3cf_0%,#f0cf86_22%,#c9963f_55%,#8d6324_82%,#6a4716_100%)] text-[#3e2508] shadow-[inset_0_0_0_2px_rgba(255,240,200,.5),0_3px_8px_-3px_rgba(70,40,5,.6)]" aria-hidden="true">
          <MessageCircle className="h-4 w-4" />
        </span>
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
        <label htmlFor={`${id}-name`} className={label}>
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
          className="line-field"
          placeholder={t('rsvp.namePlaceholder')}
        />
        {errors.name && (
          <p id={`${id}-name-err`} className="mt-1.5 text-[0.85rem] text-rose">
            {errorText(errors.name)}
          </p>
        )}
      </div>

      <fieldset className="mt-8" aria-describedby={errors.attending ? `${id}-att-err` : undefined}>
        <legend className={label}>{t('rsvp.attendLegend')}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(['yes', 'no'] as const).map((v) => {
            const on = attending === v
            return (
              <label
                key={v}
                className={`group relative flex min-h-[4.25rem] cursor-pointer items-center gap-3.5 rounded-[4px] border px-4 py-3 transition-[border-color,background-color,box-shadow,transform] duration-300 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-burgundy ${
                  on
                    ? 'border-burgundy/70 bg-[linear-gradient(180deg,rgba(255,248,232,.85),rgba(246,230,200,.75))] shadow-[0_10px_22px_-14px_rgba(90,21,36,.7),inset_0_0_0_1px_rgba(169,132,75,.45)]'
                    : 'border-[#a9844b]/45 bg-[rgba(255,250,238,.4)] hover:border-[#a9844b] hover:bg-[rgba(255,250,238,.65)]'
                }`}
              >
                <input type="radio" name="attending" value={v} checked={on} onChange={() => setAttending(v)} aria-invalid={Boolean(errors.attending)} className="peer sr-only" />
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${on ? 'border-[#b48a44] bg-[radial-gradient(circle_at_35%_30%,#fff6dd,#f3dca6_60%,#e2c07c)] text-[#9a5a10]' : 'border-[#a9844b]/45 text-[#a9844b]'}`}
                  aria-hidden="true"
                >
                  {v === 'yes' ? <Diya className="h-7 w-7" /> : <Flower2 className="h-5 w-5" strokeWidth={1.4} />}
                </span>
                <span className="font-display text-[1.22rem] leading-tight text-ink">{t(v === 'yes' ? 'rsvp.accepts' : 'rsvp.declines')}</span>
                {/* the choice, marked with a gold dot */}
                <span className={`ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${on ? 'border-burgundy' : 'border-[#a9844b]/60'}`} aria-hidden="true">
                  <span className={`h-2.5 w-2.5 rounded-full bg-burgundy transition-transform duration-300 ${on ? 'scale-100' : 'scale-0'}`} />
                </span>
              </label>
            )
          })}
        </div>
        {errors.attending && (
          <p id={`${id}-att-err`} className="mt-1.5 text-[0.85rem] text-rose">
            {errorText(errors.attending)}
          </p>
        )}
      </fieldset>

      {attending === 'yes' && (
        <div className="mt-8">
          <label htmlFor={`${id}-guests`} className={label}>
            {t('rsvp.guests')} <span className="font-display normal-case italic tracking-normal text-ink-soft">{t('rsvp.optional')}</span>
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
            className="line-field max-w-[10rem]"
            placeholder={t('rsvp.guestsPlaceholder')}
          />
          {errors.guests && (
            <p id={`${id}-guests-err`} className="mt-1.5 text-[0.85rem] text-rose">
              {errorText(errors.guests)}
            </p>
          )}
        </div>
      )}

      <div className="mt-9 flex justify-center">
        <button
          type="submit"
          disabled={busy}
          className="group relative inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[3px] bg-[linear-gradient(180deg,#7a1f2e,#5a1222)] px-6 text-button font-semibold uppercase tracking-[0.18em] text-ivory shadow-[0_14px_30px_-14px_rgba(90,21,36,.95),inset_0_0_0_1px_rgba(232,196,120,.45),inset_0_1px_0_rgba(255,220,220,.18)] transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:opacity-60 xs:px-8 xs:tracking-[0.22em] sm:w-auto"
        >
          {/* a sheen crossing the button on hover */}
          <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,236,200,.28),transparent)] transition-transform duration-700 group-hover:translate-x-[320%]" aria-hidden="true" />
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {busy ? t('rsvp.opening') : t('rsvp.send')}
        </button>
      </div>

      <div role="status" aria-live="polite">
        {prepared && (
          <div key={prepared.n} className="relative mt-8 rounded-[4px] border border-[#a9844b]/50 bg-[rgba(255,250,238,.6)] px-5 pb-5 pt-12 text-center text-ink shadow-[inset_0_1px_0_rgba(255,255,255,.6)]">
            {/* the reply, sealed */}
            <span className="pointer-events-none absolute left-1/2 top-0 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center" aria-hidden="true">
              {ambientMotion && <span className="absolute inset-2 rounded-full border-2 border-[#a3283a]/50" style={{ animation: 'seal-ring 1s ease-out .45s both' }} />}
              <img
                src={SCROLL_ART.src.stamp}
                alt=""
                width={80}
                height={80}
                className="h-20 w-20 -rotate-6 drop-shadow-[0_6px_8px_rgba(60,20,10,.4)]"
                style={ambientMotion ? ({ animation: 'seal-press .75s cubic-bezier(.3,1.4,.5,1) both' } as CSSProperties) : undefined}
              />
            </span>
            {ambientMotion && (
              <div className="pointer-events-none absolute inset-x-0 -top-40 h-80 overflow-hidden">
                <PetalShower count={16} seed={prepared.n + 3} />
              </div>
            )}
            <p className="font-display text-[1.3rem] leading-snug text-burgundy">{prepared.blocked ? t('rsvp.readyBlocked') : t('rsvp.ready')}</p>
            <p className="mt-2 text-[0.92rem] leading-relaxed">{prepared.blocked ? t('rsvp.blockedNote') : t('rsvp.readyNote')}</p>
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

      <p className="mt-7 flex items-start justify-center gap-2 text-center text-caption text-ink-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6326]" aria-hidden="true" />
        <span>{t('rsvp.privacy')}</span>
      </p>
    </form>
  )
}

export function RSVPSection() {
  const section = useRef<HTMLElement>(null)
  const { prefersReducedMotion } = useMotion()
  const { t } = useI18n()
  const deckle = useDeckle()
  useReveal(section)

  return (
    <section ref={section} id="rsvp" aria-label={t('nav.rsvp')} className="relative isolate overflow-hidden bg-night">
      {/* ── The final frame: a doorway dressed for the wedding, lamps burning at its foot, that bookends the hero ── */}
      <div className="relative isolate flex min-h-[min(182vw,66rem)] items-center justify-center overflow-hidden pb-24 pt-10 landscape:min-h-[max(100svh,46rem)]">
        <div className="scene-fade pointer-events-none absolute inset-0" style={{ '--fade-top': '16%', '--fade-bottom': '24%' } as CSSProperties}>
          <SceneStage art={SCENES.doorway} />
        </div>
        {/* a little shade behind the words, so they read over the lit doorway */}
        <div className="pointer-events-none absolute left-1/2 top-[54%] h-[46%] w-[min(34rem,92%)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(4,3,6,.55),transparent)]" aria-hidden="true" />
        <PetalField count={6} kinds={['rose', 'marigold', 'jasmine']} seed={57} intensity={0.6} />

        <div className="relative mx-auto max-w-[min(15rem,60vw)] translate-y-[8%] text-center landscape:max-w-[23rem] landscape:translate-y-[11%]" data-reveal="fade">
          <p className="script text-[1.75rem] text-gold-light [text-shadow:0_2px_12px_rgba(0,0,0,.8)] landscape:-mx-8 landscape:whitespace-nowrap landscape:text-[2.4rem]">{withAmp(t('rsvp.closingScript'), 'text-[0.75em]')}</p>
          <h2 id="rsvp-title" className="mt-4 flex flex-col items-center font-display font-medium leading-[0.92]">
            <span className="foil-night px-2 text-[clamp(3rem,2.2rem+5vw,6rem)]">{t('couple.first')}</span>
            <NameJoiner className="my-1 text-[clamp(1.7rem,1.3rem+1.6vw,2.6rem)] text-gold [text-shadow:0_2px_10px_rgba(0,0,0,.8)]" wordClassName="text-[clamp(1.25rem,1rem+1.2vw,1.9rem)]" />
            <span className="foil-night px-2 text-[clamp(3rem,2.2rem+5vw,6rem)]">{t('couple.second')}</span>
          </h2>
          <LotusDivider className="foil-svg mx-auto mt-5 h-5 w-40 text-gold" />
          <p className="mx-auto mt-4 font-display text-[1.04rem] italic leading-[1.6] text-ivory/90 [text-shadow:0_2px_10px_rgba(0,0,0,.9)] landscape:text-[length:var(--step-1)]">{t('rsvp.closing')}</p>
        </div>
      </div>

      {/* ── The reply card ── */}
      <div className="grain relative bg-forest pb-[var(--section-pad)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(213,176,109,.10),transparent_70%)]" />
        {/* no seams: fade in from the closing frame above and out into the footer below */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,var(--color-night),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(0deg,var(--color-night),transparent)]" />
        <div className="relative mx-auto w-full max-w-[38rem] -translate-y-20 px-[var(--gutter)]">
          <div className="relative">
            {/* sheets beneath, slightly askew */}
            <div className="rsvp-card absolute inset-x-2 inset-y-3 -rotate-[2deg] opacity-75 shadow-[0_30px_60px_-30px_rgba(0,0,0,.9)]" style={deckle} aria-hidden="true" />
            <div className="rsvp-card absolute inset-x-1 inset-y-1 rotate-[1.3deg] opacity-90 shadow-[0_30px_60px_-30px_rgba(0,0,0,.9)]" style={deckle} aria-hidden="true" />

            <div className="relative" data-reveal="up">
              {/* the family's seal at the head of the card */}
              <img
                src={SCROLL_ART.src.stamp}
                alt=""
                width={88}
                height={88}
                loading="lazy"
                decoding="async"
                className="pointer-events-none absolute left-1/2 top-0 z-10 h-[5.5rem] w-[5.5rem] -translate-x-1/2 -translate-y-[45%] rotate-[-4deg] drop-shadow-[0_8px_10px_rgba(0,0,0,.5)]"
              />
              <div className="rsvp-card relative px-6 pb-12 pt-16 shadow-[0_40px_80px_-30px_rgba(0,0,0,.95)] sm:px-12 sm:pb-14" style={deckle}>
                <div className="pointer-events-none absolute inset-x-5 inset-y-4 border border-[#a9844b]/55" aria-hidden="true">
                  <div className="absolute inset-1.5 border border-[#a9844b]/22" />
                  <CornerFlourish className="foil-svg absolute -left-px -top-px h-9 w-9 text-brass" />
                  <CornerFlourish className="foil-svg absolute -right-px -top-px h-9 w-9 rotate-90 text-brass" />
                  <CornerFlourish className="foil-svg absolute -bottom-px -right-px h-9 w-9 rotate-180 text-brass" />
                  <CornerFlourish className="foil-svg absolute -bottom-px -left-px h-9 w-9 -rotate-90 text-brass" />
                </div>

                <div className="relative text-center">
                  <p className="inv-caps inv-flank indic-boost text-[0.74rem] font-semibold tracking-[0.34em] text-burgundy">
                    <span>{t('rsvp.cardEyebrow')}</span>
                  </p>
                  <h3 className="foil mx-auto mt-3 px-2 pb-1 font-display text-[length:var(--step-3)] italic leading-tight">{t('rsvp.cardTitle')}</h3>
                  <LotusDivider className="foil-svg mx-auto mt-3 h-5 w-40 text-brass" />
                  {wedding.rsvp.respondBy && <p className="mt-2 text-sm text-ink-soft">{t('rsvp.respondBy', { date: wedding.rsvp.respondBy })}</p>}
                </div>
                <div className="relative mx-auto max-w-[28rem]">
                  <RsvpForm />
                </div>
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
