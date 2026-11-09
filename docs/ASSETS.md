# Asset manifest & provenance

All imagery on the site falls into exactly two categories. Nothing is stock
photography and no image is AI-generated.

## 1. The couple's photographs (family-supplied, real)

Originals are kept **byte-for-byte unchanged** in `source-images/originals/`
(SHA-256 verified against the files supplied). The whole `source-images/` folder
stays on the family's computer and is **git-ignored**: the repository is public,
and two originals carry the phone's GPS location in their metadata. The website
only serves the optimised copies in `public/images`, which contain no camera
metadata.

| Original file supplied | Stored as | Size |
| --- | --- | --- |
| `1000380152.jpg` | `couple-traditional-original.jpg` | 1064 × 832 |
| `1000368389.jpg` | `couple-forest-original.jpg` | 3072 × 4096 |
| `1000369931.jpg` | `couple-beach-original.jpg` | 3072 × 4096 |

### Processing (tools/process_photos.py — reproducible, local, free)

- **Subject extraction:** BiRefNet-portrait segmentation model (via `rembg`,
  ONNX Runtime, CPU). The forest and beach photos were cropped around the couple
  first so the model works at higher effective resolution.
- **Edge refinement:** small-speckle removal, suppression of faint alpha haze,
  and **pymatting multilevel foreground estimation** to remove background
  colour bleed (light halos) from hair edges.
- **Targeted clean-ups** (verified at 100–200 % zoom):
  - forest: a thin smear of light ground beside the groom's right shoe removed;
  - beach: wet-sand reflection captured under the groom's rear foot removed with
    a feathered erase. (A colour-based filter was tried first and **rejected**
    because it damaged the toes.)
- **Grading:** gentle global warmth, highlight roll-off and contrast; skin
  tones kept natural. No face or body reshaping, no retouching of features, no
  generative fill of the people.
- **Background plate (forest only):** for the (since retired) Our Story parallax,
  the couple's area and a distracting foreground tree stump were removed from the
  *background layer* with OpenCV inpainting and then softened; this plate sat
  *behind* the real cut-out and its inpainted area was hidden by it.
- All cut-outs were inspected on both dark and light backgrounds.

### Where each photograph is used

Since Phase 7 the website shows **no couple photographs** on the page: the
Magical Moments journey ("A Journey Through Forever") was removed, following
the creative direction of no relationship story or couple-photo gallery. The
optimised copies it used (`public/images/portraits|gallery|story/…`) were
deleted from the site; they remain in the Git history and can be regenerated
locally with `tools/process_photos.py` from `source-images/`.

The traditional portrait still appears in the **link-preview image**
(`public/og/og-image.jpg`) that WhatsApp and social apps show when the
invitation is shared.

**Limitation:** the traditional portrait source is only 1064 × 832 px, so it is
never shown larger than its native size. A higher-resolution original from the
photographer would allow a bigger presentation.

## 2. Conceptual artwork (made for this site — never presented as photographs)

| Asset | What it is |
| --- | --- |
| 3D mandap (`src/components/three/*`) | Real-time Three.js scene built from custom geometry: lathe-turned gold pillars with spiral garlands, a curved velvet temple roof with kalasha finials, a jasmine/marigold/rose flower curtain, a mango-leaf thoranam, banana stems at the entrance, brass bells and kuthuvilakku lamps, diyas, petals, a Dravidian temple colonnade (square–octagonal–square pillars with pot capitals and corbel brackets), ground mist, and a foreground cusped torana doorway that frames the shot. On portrait screens (phones, tablets) the camera pulls back so the complete mandap — roof, canopy, pillars, platform, steps and both lamps — is shown as on desktop, with its interior framed behind the couple's names (`three/stage.ts`, `MandapScene.tsx`). |
| `public/images/hero/mandap-still-{landscape,portrait}.webp` | Renders of that same 3D scene (`?still` mode) used as the instant poster and WebGL fallback |
| `public/images/celebrations/*.webp` | The Celebrations scenes — sunset over a temple tank; for the Aaratakshate, a brass aarati plate with a lit five-wick lamp, akshate, kumkum, haldi and flowers before out-of-focus reception lights; for the Vivaha Muhurta, the mangalasutra on a turmeric-marked coconut on a plate of akshate before the sacred fire; for the venue, a brass location pin on an old hand-drawn paper map (decorative, no real streets or names; now the poster and no-WebGL fallback of the 3D route map); for the RSVP's closing frame, a doorway dressed for the wedding — marigold garlands, jasmine, mango leaves, bells, bulbs, two brass lamps and a rangoli (`doorway-*.webp`) — plus the thamboola plate and the handmade-paper texture. **Artistic 3D renders made for this site** with `tools/scenes/` (three.js scenes built from code: procedural geometry, textures, sky and water; rendered headless with Playwright's Chromium, exported by `tools/scenes/export.py`). No photographs, stock images or third-party models. The map is **captioned on the page as decorative**, with the real route behind "Get directions". |
| `public/map/{davangere.json,city.bin,ground.webp}` (3D route map, `src/components/routemap/`) | Streets, the lake, parks, canals, the railway and the route from the railway station to the venue, **traced from OpenStreetMap** (map data © OpenStreetMap contributors, Open Database License; credited with a link on the map and in the caption below it) by `tools/routemap/trace.py` from a screenshot of openstreetmap.org/directions (the screenshot is not stored), georeferenced on the venue's coordinates. The houses (with their windows, stair rooms, water tanks and shops), trees, traffic, and the drawings of the hall (dressed with wedding lights, a marigold arch and a shamiana) and of the station (platforms, canopies, footbridge, overhead wires, a train) are **illustrative** — generated by `tools/routemap/build.py` and `src/components/routemap/*` along the real streets; the page says so. They are not the real buildings. Ground colours, baked shadows and all textures are generated in code. |
| `public/images/invitation/*.webp` | The invitation scroll's parts — the rolled parchment on its brass-finialled rod, the tied scroll, the gold-bordered silk ribbon, the bow with tucked marigolds, the wax seal with the couple's monogram (and the seal alone for the letter's closing) — **3D renders made for this site** with `tools/scenes/scenes/scroll.js`, exported by `tools/scenes/export_scroll.py`, plus a seamless parchment tile generated by the same script. No photographs, stock images or third-party models. The letter's thorana, paisley border, date tiles and medallion are SVG/CSS drawn in code. |
| Calendar dial (`CalendarDial.tsx`) | Decorative SVG drawn in code |
| Ornaments, monogram, icons, OG image layout | Drawn in code (SVG) / generated by `tools/make_brand_assets.py` |

Fonts: Cormorant Garamond, Pinyon Script, Cinzel and Manrope (SIL Open Font License),
self-hosted via Fontsource.

## 3. Soundtrack and fonts

| Asset | Provenance |
| --- | --- |
| `public/audio/mangala-dhwani.mp3` | Original instrumental composed and synthesised for this site by `tools/compose_soundtrack.py` (raga Mohanam; additive / modal synthesis, no samples or recordings). Created for Darshan & Vathsala's invitation. |
| Kannada / Devanagari fonts | Tiro Kannada, Tiro Devanagari Hindi, Noto Sans Kannada, Noto Sans Devanagari — SIL Open Font License 1.1, via Fontsource npm packages. |

## Family-provided content still needed

Confirmed so far: the dates (**Sunday 15 & Monday 16 November 2026**), the
couple's names, the venue address / Maps link, and — from the printed
invitation — the timings (Aaratakshate from 7:30 pm on Sunday; Vivaha Muhurta
9:20–10:30 am on Monday) and the two family phone numbers.

- [x] **Ceremony timings** for each day (`startTime` / `endTime` in `wedding.days`)
- [x] **Ceremony names** for each day (`wedding.days[].events`)
- [ ] An **end time** for the Aaratakshate (optional — with it, its calendar entry becomes a timed one)
- [ ] **Dress code / attire** notes (optional)
- [ ] **RSVP** decision: endpoint URL (see README) and an optional reply-by date
- [x] **Contact details** for guests (`wedding.contact.phones`)
- [ ] A real **venue photograph** (optional — set `wedding.venue.photo` to show it instead of the rendered map)
- [ ] A higher-resolution original of the traditional portrait (optional)
- [ ] Licensed **background music** (optional; it will never autoplay)
- [ ] The final **website address** (`VITE_SITE_URL`) for link previews
