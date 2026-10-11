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

Since Phase 2.1 the couple's photographs are gathered in **one place** —
Magical Moments — instead of being scattered across sections.

| Asset (public/images/…) | Treatment | Section |
| --- | --- | --- |
| `portraits/couple-traditional-cutout-{640,1000}.webp` | Cut-out on a warm champagne stage beneath a marigold-and-jasmine torana, in a temple-arch window under a spotlight — the emotional highlight | **Magical Moments** (opens on it) and the social-share image |
| `gallery/couple-forest-moment-{600,960}.webp` | Original environment kept whole, warm grade, mounted as an ivory print | **Magical Moments** |
| `gallery/couple-beach-moment-{600,960}.webp` | Original seascape and reflection kept whole, mounted as an oval cameo | **Magical Moments** |

**Retained but not displayed** (still in `public/images/`, marked
`notDisplayed` in `src/data/assets.ts`; never downloaded because nothing
references them, and kept so they can return without re-running the pipeline):

| Asset | Was used in |
| --- | --- |
| `story/forest-plate-{640,1000}.webp` + `story/couple-forest-cutout-{640,1000}.webp` | the 2.5D Our Story portrait (section replaced by the Wedding Compass) |
| `portraits/couple-beach-cutout-{460,760}.webp` | the arched seashore window in the Invitation (removed to avoid repeating the beach photo) |

**Limitation:** the traditional portrait source is only 1064 × 832 px, so it is
never shown larger than its native size. A higher-resolution original from the
photographer would allow a bigger presentation.

## 2. Conceptual artwork (made for this site — never presented as photographs)

| Asset | What it is |
| --- | --- |
| 3D mandap (`src/components/three/*`) | Real-time Three.js scene built from custom geometry: lathe-turned gold pillars with spiral garlands, a curved velvet temple roof with kalasha finials, a jasmine/marigold/rose flower curtain, a mango-leaf thoranam, banana stems at the entrance, brass bells and kuthuvilakku lamps, diyas, petals, a Dravidian temple colonnade (square–octagonal–square pillars with pot capitals and corbel brackets), ground mist, and a foreground cusped torana doorway that frames the shot. On portrait screens (phones, tablets) the camera pulls back so the complete mandap — roof, canopy, pillars, platform, steps and both lamps — is shown as on desktop, with its interior framed behind the couple's names (`three/stage.ts`, `MandapScene.tsx`). |
| `public/images/hero/mandap-still-{landscape,portrait}.webp` | Renders of that same 3D scene (`?still` mode) used as the instant poster and WebGL fallback |
| Venue illustration (`VenueIllustration.tsx`) | Imagined illuminated hall in gold line-art, shown in the Wedding Compass venue panel and **captioned on the page as "Conceptual illustration — not a photograph of the venue"** |
| Magical Moments panels "A Moment of Blessings" and "Two Families, One Bond" (`MomentArt.tsx`) | Illustrated brass lamp panel, and a pair of kalash sharing one lamp flame |
| Calendar dial and compass rose (`CalendarDial.tsx`, `CompassRose.tsx`) | Decorative SVG drawn in code |
| Ornaments, monogram, icons, OG image layout | Drawn in code (SVG) / generated by `tools/make_brand_assets.py` |

Fonts: Cormorant Garamond, Pinyon Script and Manrope (SIL Open Font License),
self-hosted via Fontsource.

## Family-provided content still needed

Confirmed so far: the dates (**Sunday 15 & Monday 16 November 2026**), the
couple's names and the venue address / Maps link.

- [ ] **Ceremony timings** for each day (set `startTime` / `endTime` in `wedding.days`; enables exact countdowns and timed calendar entries)
- [ ] **Ceremony names** and descriptions for each day (`wedding.days[].events`) — none are shown until verified
- [ ] **Dress code / attire** notes (optional)
- [ ] **RSVP** decision: endpoint URL (see README) and an optional reply-by date
- [ ] **Contact details** for guests (`wedding.contact`) — the Guest Services card says "to be shared" until set
- [ ] A real **venue photograph** (set `wedding.venue.photo`) to replace the illustration
- [ ] A higher-resolution original of the traditional portrait (optional)
- [ ] Licensed **background music** (optional; it will never autoplay)
- [ ] The final **website address** (`VITE_SITE_URL`) for link previews
