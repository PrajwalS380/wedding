# The Wedding Realm — Darshan & Vathsala

A cinematic, mobile-first wedding invitation website for the celebrations on
**15 & 16 November 2026** at Bapuji Samudhaya Bhavan, Davangere: a real-time 3D
South Indian mandap, an unfurling invitation scroll, **The Living Wedding
Calendar** (live countdowns for both days), **The Wedding Compass** (invitation,
schedule, venue and guest services in one place), and an RSVP card that
prepares each guest's reply as a WhatsApp message to the family.

Live: https://thedarshanandvathsala.vercel.app/

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS 4 · Three.js / React Three
Fiber / drei · GSAP + ScrollTrigger · Lucide icons · self-hosted Fontsource fonts.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # TypeScript, no emit
npm run lint       # ESLint
npm run build      # production build → dist/
npm run preview    # serve the production build locally
```

Useful URL flags while developing:

| Flag | Effect |
| --- | --- |
| `?nointro` | Skip the cinematic intro |
| `#calendar`, `#compass`, `#rsvp`, … | Deep link to a section (also skips the intro) |
| `#compass-invitation`, `#schedule`, `#venue`, `#guest-services` | Deep link straight to a Compass direction (N / E / S / W) |
| `?now=2026-11-15T09:30` | **Development builds only** — start the page clock at that local time to preview the calendar's "today", day-two and after-the-wedding states. Ignored in production builds. |
| `?still` | Bare 3D stage with no UI — used to capture the poster images (re-capture them whenever the 3D scene changes, so the poster and WebGL fallback match the live scene) |

---

## Editing the wedding details (single source of truth)

Everything shown on the site lives in **`src/data/wedding.ts`** — components
never hard-code names, dates or venue facts.

Facts not yet supplied by the family are `null` (or an empty list), and the site
shows a tasteful "to be announced" state for them — nothing is invented.

| Setting | What it controls |
| --- | --- |
| `couple.displayNames` | Name order used everywhere the names appear together (title, monogram, invitation, sharing). Currently `['Darshan', 'Vathsala']`. |
| `days` | The two confirmed dates (`2026-11-15`, `2026-11-16`), optional `startTime` / `endTime`, verified `events`, `dressCode`, `note`. |
| `venue` | Name, address, the exact Google Maps link and the opt-in map embed. |
| `rsvp` | WhatsApp RSVP (see below); the number itself lives in `src/data/site.ts`. |
| `contact` | Verified contact details only — the Guest Services card stays "to be shared" until one is set. |
| `calendarExport` | `.ics` file name and calendar entry title. |
| `copy` | Invitation, calendar and compass wording. |

**When timings are confirmed**, edit a day:

```ts
{
  id: 'day-1',
  label: 'Day One',
  date: '2026-11-15',
  startTime: '10:30',   // 'HH:mm', 24-hour, India Standard Time
  endTime: '14:00',
  events: [{ name: '…verified ceremony name…', startTime: '10:30', endTime: null, description: null }],
  dressCode: null,
  note: null,
}
```

That change automatically:

- switches that day's countdown from **date-based** (counting to the start of the
  date in the visitor's local time) to the exact start instant, computed in `Asia/Kolkata`;
- lists the verified ceremonies in the Living Calendar and the Compass schedule;
- turns that day's calendar export (`.ics` and Google Calendar) from an all-day
  entry into a timed one — only when **both** `startTime` and `endTime` are set.

The calendar never shows negative numbers: on a wedding day it says the
celebrations are today, and after 16 November it shows a thank-you message.

Deployment-level settings (production URL, RSVP WhatsApp number) are in
`src/data/site.ts`.

---

## RSVP (WhatsApp)

Guests reply through WhatsApp — no backend, database or secret is involved:

1. The form checks the guest's name and attendance (attendee count is optional).
2. It builds a readable message and opens `https://wa.me/<number>?text=<message>`
   (the message is percent-encoded, so guest input cannot change the link).
3. WhatsApp opens with the message ready; **the guest reviews it and taps Send**.

The site never claims a reply was received — it tells the guest the message is
ready and that it reaches the family once they send it. Nothing is stored in the
browser or anywhere else. If a browser blocks the new tab, a plain "Open WhatsApp"
link to the same prefilled chat is shown.

The recipient is `RSVP_WHATSAPP_NUMBER` in `src/data/site.ts` (international
format, digits only, e.g. `919591420987`); the message text is built in
`src/lib/rsvp.ts`.

---

## Deploying (Vercel)

The site is fully static: `npm run build` writes it to `dist/`. It is set up for
Vercel through `vercel.json` (framework **Vite**, build `npm run build`, output
`dist`, long-lived caching for the hashed files in `/assets`). No server code,
database or secret is needed.

**Environment variables** — all optional, all public (`VITE_*` values are baked
into the JavaScript every visitor downloads, so never put secrets in them).
Changing one only takes effect after a **redeploy**.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_SITE_URL` | `PRODUCTION_URL` in `src/data/site.ts` | Canonical link, absolute `og:image` / `og:url`, `sitemap.xml`, and the link guests share. Set it if you add a custom domain. |
| `VITE_ALLOW_INDEXING` | `false` | `true` lets search engines index the site; default is `noindex` for the family's privacy. |

When `VITE_SITE_URL` is not set, the build uses `PRODUCTION_URL`
(https://thedarshanandvathsala.vercel.app) — so link previews (WhatsApp,
Instagram, Facebook…) get absolute image URLs and shared links point at the
production site, even from preview deployments.

Every push to `main` deploys to production; other branches get preview URLs.
Earlier deployments stay available in the Vercel dashboard for instant rollback.

---

## Project structure

```
src/
  app/App.tsx                 page shell, intro gate, deep links (incl. Compass aliases)
  data/wedding.ts             ← all wedding facts & copy
  data/site.ts                production URL + RSVP WhatsApp number
  data/navigation.ts
  components/
    navigation/               desktop bar + accessible mobile menu
    sections/                 CinematicIntro, WeddingHero, InvitationScroll, LivingCalendar,
                              WeddingCompass, RSVPSection,
                              WeddingFooter, VenueIllustration (used in the Compass venue panel)
    compass/                  CompassPanels — Invitation (N), Schedule (E), Venue (S), Guest Services (W)
    three/                    MandapScene (Canvas, camera rig, foreground torana), stage (portrait
                              recomposition), TempleArchitecture, Garlands, OilLamps, FloatingPetals,
                              AtmosphericLighting, GlowField, geometry, textures, layout, quality
    ui/                       Button, CalendarDial, CompassRose, Picture, Ornaments, Ambient,
                              Monogram, Amp / withAmp, ErrorBoundary, LoadingState
  hooks/                      motion preferences, reveals, in-view, active section, useNow (live clock)
  lib/                        dates/timezone, rsvp (WhatsApp message + link), weddingClock (countdown/phase logic), calendar (.ics),
                              compass (direction events + deep-link aliases), browser helpers
  styles/index.css            design tokens & utilities
public/                       optimised images, icons, manifest, OG image
source-images/originals/      the family's untouched photographs (local only — git-ignored)
source-images/processed/      lossless masters, masks, manifest (local only — git-ignored)
tools/                        photo pipeline + brand asset generator (Python)
docs/ASSETS.md                asset provenance and what to replace later
```

---

## Design & behaviour notes

- **Mobile-first**: designed at 360 px, checked at 320 / 360 / 390 / 430 px,
  768 and 1024 tablet, 1440 and 1920 desktop — no horizontal overflow.
- **3D is an enhancement**: names, dates, venue, map link and RSVP are always
  real HTML. The hero first paints a render of the 3D scene (also the fallback
  when WebGL is unavailable or fails); the 3D chunk (~260 KB gzipped) loads
  lazily after the intro and title animation, compiles shaders asynchronously,
  idles off-screen and while the intro covers it, and scales detail to the device.
- **Motion**: respects `prefers-reduced-motion` (static, complete content — the
  invitation shows open), and offers a *Pause animations* control.
- **Accessibility**: landmarks, one `h1`, logical headings, skip link, visible
  focus, keyboard-operable menu/scroll/compass/forms, Escape closes overlays,
  live regions for status messages, 44 px touch targets.
- **Privacy**: the Google map loads only when the guest asks for it; the only
  storage is a per-tab flag that the intro was seen (no personal data).
- **Calendar & Compass accessibility**: the two date buttons are a tab list
  (arrow keys, Home/End); the countdown has a screen-reader summary and only
  ticks while the calendar is on screen; Compass directions are toggle buttons
  (arrow keys map to N/E/S/W) and "Back to the compass" returns focus to the
  direction you came from.

## Content still needed from the family

See the checklist at the end of [`docs/ASSETS.md`](docs/ASSETS.md).
