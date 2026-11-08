# The Wedding Realm — Darshan & Vathsala

A cinematic, mobile-first wedding invitation website for the celebrations on
**15 & 16 November 2026** at Bapuji Samudhaya Bhavan, Davangere: a real-time 3D
South Indian mandap, an unfurling invitation scroll, **The Living Wedding
Calendar** (live countdowns for both days), **The Celebrations** — a scroll
"from dusk to dawn" through rendered scenes for the Aaratakshate (Sunday evening)
and the Vivaha Muhurta (Monday morning), the venue and guest services — and an RSVP card that
prepares each guest's reply as a WhatsApp message to the family. The whole
invitation can be read in **English, ಕನ್ನಡ (Kannada) or हिन्दी (Hindi)**, and an
optional original instrumental, *Mangala Dhwani*, can accompany it.

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
| `#calendar`, `#celebrations`, `#rsvp`, … | Deep link to a section (also skips the intro) |
| `#aaratakshate`, `#muhurta`, `#venue`, `#guest-services` | Deep link straight to a part of the Celebrations (`#aaratakshate` / `#muhurta` land on the pair of ceremony arches). Old links keep working: `#compass` and `#compass-invitation` open the Celebrations, `#schedule` / `#reception` the Aaratakshate, `#wedding` the Muhurta, `#compass-venue` the venue and `#compass-services` / `#services` the guest services. |
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
| `days` | The two dates with their confirmed timings and ceremonies (from the printed invitation): **Aaratakshate**, Sun 15 Nov from 7:30 pm, and **Vivaha Muhurta**, Mon 16 Nov 9:20–10:30 am (IST). Also `dressCode`, `note`. |
| `venue` | Name, address, the exact Google Maps link and the opt-in map embed. |
| `rsvp` | WhatsApp RSVP (see below); the number itself lives in `src/data/site.ts`. |
| `contact` | Verified contact details only. `phones` holds the two numbers from the printed invitation (+91 90356 15991, +91 95914 20987), shown as tap-to-call links under "Call the family". |
| `calendarExport` | `.ics` file name and calendar entry title. |

**Changing a timing** — edit the day (and its event):

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
- shows the ceremony and its time in that day's Celebrations chapter
  (times are written naturally per language, e.g. "7:30 pm onwards", "ಸಂಜೆ 7:30 ರಿಂದ", "शाम 7:30 बजे से");
- turns that day's calendar export (`.ics` and Google Calendar) from an all-day
  entry into a timed one — only when **both** `startTime` and `endTime` are set
  (the Aaratakshate has no end time on the card, so none is invented and its
  calendar entry stays all-day).

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

## Languages (English · ಕನ್ನಡ · हिन्दी)

Every guest-facing string — including screen-reader labels, validation
messages, the WhatsApp RSVP message and the downloadable calendar file — comes
from one dictionary per language in `src/i18n/dictionaries/` (`en.ts`, `kn.ts`,
`hi.ts`), looked up by stable keys such as `rsvp.send` with `t('rsvp.send')`.

- **Type-checked completeness:** `kn.ts` and `hi.ts` must have exactly the keys of
  `en.ts`; the build fails if one is missing. At runtime a missing key falls back
  to English (with a development warning) — a raw key is never shown.
- **Selector:** in the desktop header, in the phone capsule (next to music and the
  menu), inside the phone menu, and on the intro screen. The choice is kept in
  `localStorage` (`wr:lang`); first-time visitors get English. `<html lang>`, the
  page title and the description follow the language.
- **Names and places:** the couple's names are written in the language's script
  (ದರ್ಶನ್ / दर्शन …). The venue shows a localized name and address, and in
  Kannada and Hindi also the **official** address exactly as Google Maps lists
  it; "Get Directions", "Copy address" and the calendar file always use the
  official address and the exact Maps link.
- **Dates:** weekday and month names come from explicit tables in
  `src/lib/dates.ts` (no ordinals in Kannada/Hindi; 0–9 numerals everywhere for
  legibility). Only the display changes — the dates and countdown target are the
  same in every language.
- **Typography:** Kannada and Devanagari use Tiro Kannada / Tiro Devanagari Hindi
  (serif) and Noto Sans Kannada / Devanagari (sans), loaded only when that script
  is on screen; letter-spacing is removed and small text is set slightly larger
  for those scripts (`src/styles/indic-fonts.css`, `src/styles/index.css`).
- **Deliberately not translated:** the "D & V" monogram, the engraved English
  inscription around the calendar dial (decorative, hidden from screen readers),
  the brand name in link previews
  (Open Graph tags are static, so previews stay English), and the word "Send" in
  the RSVP hint, which matches WhatsApp's button.

**Adding a language (e.g. Telugu):** add it to `src/i18n/languages.ts` (with
`indic: true`, which switches on the Indic spacing rules), copy `en.ts` to
`te.ts` and translate every value (the types list anything missing), register it
in `src/i18n/translate.ts`, add its weekday/month names to `LOCALE_DATES` in
`src/lib/dates.ts`, and add a Telugu font face (like `indic-fonts.css`).

---

## Soundtrack — *Mangala Dhwani*

An **original** instrumental in raga Mohanam (tanpura drone, bansuri-style
flute, santoor-like melody, string pad and soft mridangam-style percussion),
composed and synthesised for this invitation by `tools/compose_soundtrack.py` —
no samples or third-party recordings, so there is no licence to clear. It is
2 min 30 s, loops, and is `public/audio/mangala-dhwani.mp3` (128 kbps, 2.3 MB).

- **Off by default and never autoplays.** Nothing is downloaded until a guest
  presses Play (on the intro screen, in the header, or in the phone capsule).
- One shared player for the whole page: it keeps playing while guests scroll,
  change language or close the intro, and is never duplicated. Play / Pause,
  Mute and Volume (iPhones use the device buttons — the page cannot set volume
  there); loading, "blocked by the browser" and "could not be loaded" states are
  shown honestly, and the rest of the site works if the audio fails.
- Only the guest's volume / mute choice is remembered (`wr:music`), never playback.

**Using different music:** place a properly licensed MP3 in `public/audio/` and
point `SOUNDTRACK_SRC` in `src/data/site.ts` at it (update `music.trackTitle` in
the dictionaries too). To regenerate or alter the original:
`python tools/compose_soundtrack.py` (needs `numpy`, `scipy`, `lameenc`).

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
  app/App.tsx                 page shell, intro gate, deep links (incl. old Compass links)
  data/wedding.ts             ← all wedding facts & copy
  data/site.ts                production URL, RSVP WhatsApp number, soundtrack path
  i18n/                       languages, dictionaries (en / kn / hi), provider, t()
  audio/                      the single soundtrack player (provider + hook)
  data/navigation.ts
  components/
    navigation/               desktop bar + accessible mobile menu
    sections/                 CinematicIntro, WeddingHero, InvitationScroll, LivingCalendar,
                              Celebrations, RSVPSection, WeddingFooter
    celebrations/             Chapters (ceremonies over the sunset, venue + guest
                              services), SceneStage (cover-fitted render + parallax), LiveLights,
                              CalendarMenu (used by the Living Calendar)
    three/                    MandapScene (Canvas, camera rig, foreground torana), stage (portrait
                              recomposition), TempleArchitecture, Garlands, OilLamps, FloatingPetals,
                              AtmosphericLighting, GlowField, geometry, textures, layout, quality
    ui/                       Button, CalendarDial, LanguageSelector, MusicControl, Picture, Ornaments, Ambient,
                              Monogram, Amp / withAmp, ErrorBoundary, LoadingState
  hooks/                      motion preferences, reveals, in-view, active section, useNow (live clock),
                              useOrientation (portrait / landscape scene art)
  lib/                        dates/timezone, rsvp (WhatsApp message + link), weddingClock (countdown/phase logic), calendar (.ics),
                              celebrations (chapter ids + deep-link aliases), eventTime (localized
                              times, phone formatting), browser helpers
  data/sceneArt*.ts           scene image sizes, crop focus and light positions (generated)
  styles/index.css            design tokens & utilities
public/                       optimised images (incl. images/celebrations), icons, manifest, OG image
source-images/originals/      the family's untouched photographs (local only — git-ignored)
source-images/processed/      lossless masters, masks, manifest (local only — git-ignored)
tools/                        photo pipeline + brand asset generator (Python), scenes/ (3D renders
                              for the Celebrations — see below)
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
  focus, keyboard-operable menu/scroll/forms, Escape closes overlays,
  live regions for status messages, 44 px touch targets.
- **Privacy**: the Google map loads only when the guest asks for it; the only
  storage is a per-tab flag that the intro was seen (no personal data).
- **Calendar & Celebrations accessibility**: the two date buttons are a tab list
  (arrow keys, Home/End); countdowns have a screen-reader summary and only tick
  while on screen; every chapter is a labelled `article` with real headings, the
  scene images are decorative (`alt=""`), and the "Add to calendar" menu closes on
  Escape and returns focus.

## The Celebrations section and its scenes

The section is two screens. **First:** the title in the sunset sky over a temple
tank, and both ceremonies side by side in arched temple windows on the water,
each with its day, name and time — the **Aaratakshate** (a brass aarati plate on
red silk: a five-wick lamp burning, akshate, kumkum and haldi, marigolds, with
rice and petals in the air and the reception's strings of lights behind) and the
**Vivaha Muhurta** (the mangalasutra draped on a turmeric-marked coconut on a
silver plate of akshate, the sacred fire of the homa glowing behind). **Second**,
after a short band of dawn: a **live 3D map of Davangere** that plays the drive
from the railway station to the hall (below), with the **venue** card over its
foot, and the **guests'** card under the thamboola plate — the family's numbers as
call tiles and a share button. Wide screens put the map left and the cards right.

**Each fact has one place on the page** — nothing is repeated section after section:

| What | Where it lives |
| --- | --- |
| Names and dates | Hero, the invitation letter, and the closing frame above the RSVP card |
| Countdown and "Add to calendar" (both days) | The Living Calendar |
| Each ceremony's name and time | Its arch in the Celebrations |
| Address, the 3D route map, directions, copy address | The venue chapter (the letter names the hall, as an invitation does) |
| Replies | The RSVP card |
| Phone numbers, sharing | Guest services |

The footer is only the monogram and the credit, and the phone menu only
navigation and language.

**One continuous page:** every scene dissolves into the next instead of ending
in a hard edge. Each picture fades at its top and bottom (`.scene-fade`) into a
backdrop that runs from the colour of the part above to the colour of the part
below; neighbouring parts meet in the shared colours in `SKY`
(`src/components/celebrations/styles.ts`) — night green → dusk → the sunset
scene → embers, a short dawn gradient onto the handmade paper of the venue and
guests, and a dusk gradient back into the night green of the RSVP. The
calendar above and the RSVP card and footer below fade into the same colours.

The scenes are **artistic 3D renders made for this site** (captioned as such where
the venue is shown), not photographs. Each has a portrait and a landscape version
(WebP, two widths each) chosen by screen orientation. Flames, bulbs and stars
are softly animated on top of the still image (`LiveLights`), only while the scene
is on screen and never when reduced motion is requested.

To change or re-render a scene (`tools/scenes/`, three.js + Playwright's Chromium):

```bash
npx vite --config tools/scenes/vite.config.mjs   # scene workbench on :5199 — keep it running
node tools/scenes/render-all.cjs [scene …]       # → tools/scenes/out/*.png (+ light positions)
python tools/scenes/export.py                    # → public/images/celebrations/*.webp
                                                 #   + src/data/sceneArt.generated.ts
```

Preview one scene in a browser with `http://localhost:5199/?s=sunset&w=1280&h=720&o=landscape`.

Shared detail lives in `tools/scenes/lib/`: `flora.js` (marigold heads of ruffled,
scale-like petals; jasmine strands of calyxed buds on a thread with the odd open
flower; rice grains; heaped kumkum/haldi with loose grains; leaves, flames, smoke),
`materials.js` (brass, gold and silver with turning marks, scratches and handled
patches; plate engraving; silk weave) and `common.js` (renderer, bloom, depth of
field, and contact shadows — ambient occlusion that skips flames and glows). Note
that in this three.js version `bumpScale` is per-pixel: values around 0.1–1 are
visible; tiny values like 0.001 do nothing.
`tools/scenes/out/` is git-ignored; the exported WebP files (≈0.9 MB for all
scenes) are what ships.

### The 3D route map (venue)

When the venue comes into view, a short film plays (`src/components/routemap/`,
plain three.js, loaded only when the venue is near): a wide shot over the city,
a dive down to the railway station, then a glowing route that draws itself
along the real roads — Hadadi Road, Vidhyanagar Road, BIET Road, Shamanur Road,
named in the caption as it goes (6.1 km, about 8 minutes) — the camera following
it, until a brass pin drops on Bapuji Samudhaya Bhavan and the camera circles the
hall. "Replay" plays it again. With reduced motion (or animations paused) it shows
the finished map as a still; without WebGL, the rendered paper-map pin shows
instead. "Get directions" stays the way to navigate.

The streets, lake, parks, canals and railway were **traced from OpenStreetMap**
(© OpenStreetMap contributors, ODbL — credited on the map). The houses and trees
are **illustrative**: placed along the real streets, but not real buildings — the
caption says so. The data is built offline (`tools/routemap/`, needs
`pip install numpy pillow opencv-python-headless scikit-image sknw networkx`):

```bash
python tools/routemap/trace.py <screenshot.jpg>  # streets from an openstreetmap.org/directions screenshot
python tools/routemap/build.py                   # → public/map/davangere.json, city.bin, ground.webp
```

The screenshot itself is not stored (it showed a phone's status bar); `trace.py`'s
constants (`CROP`, the zoom-14 / device-pixel-ratio-3 scale) belong to it, and the
venue's coordinates in `wedding.ts` anchor the map. `build.py` is deterministic.
The three files are ≈0.55 MB and are fetched only when the venue is near.

## Content still needed from the family

See the checklist at the end of [`docs/ASSETS.md`](docs/ASSETS.md).
