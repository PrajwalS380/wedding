/**
 * Asset manifest — every image the site displays, its provenance and status.
 *
 * status:
 *  - 'family-photo'        Real photograph of Darshan & Vathsala supplied by the
 *                          family, processed by tools/process_photos.py. Originals
 *                          are kept untouched in source-images/originals/.
 *  - 'conceptual-artwork'  Original illustration / render made for this site.
 *                          Never presented as a photograph of a real place.
 *
 * Regenerate photo variants with:  python tools/process_photos.py
 */

export interface ImageVariant {
  src: string
  width: number
  height: number
}

export interface ImageAsset {
  /** Intrinsic dimensions of the largest variant (used for aspect-ratio). */
  width: number
  height: number
  variants: ImageVariant[]
  alt: string
  status: 'family-photo' | 'conceptual-artwork'
  source: string
  treatment: string
  /**
   * Set when an asset is kept (processed and in public/) but no longer shown,
   * so it can be brought back without re-running the photo pipeline.
   * Unreferenced files are never downloaded by visitors.
   */
  notDisplayed?: string
}

const v = (base: string, sizes: [number, number][]): ImageVariant[] =>
  sizes.map(([width, height]) => ({ src: `${base}-${width}.webp`, width, height }))

export const photos = {
  /** (Not displayed) OUR STORY — layer 1: forest "clean plate" (couple + foreground stump removed, softened). */
  storyBackground: {
    width: 1000,
    height: 1250,
    variants: v('/images/story/forest-plate', [
      [640, 800],
      [1000, 1250],
    ]),
    alt: '',
    status: 'family-photo',
    source: 'couple-forest-original.jpg',
    treatment: 'Background plate: subject area inpainted (hidden behind the cut-out), soft blur, emerald grade, vignette.',
    notDisplayed: 'Retired in Phase 2.1: the Our Story section was replaced by the Wedding Compass, and couple photos now appear only in Magical Moments (plus the share image).',
  },
  /** (Not displayed) OUR STORY — layer 2: the couple, extracted with BiRefNet-portrait. Same canvas as the plate. */
  storySubject: {
    width: 1000,
    height: 1250,
    variants: v('/images/story/couple-forest-cutout', [
      [640, 800],
      [1000, 1250],
    ]),
    alt: 'Vathsala and Darshan smiling at each other among tall pine trees, her pale yellow dress swirling as they embrace.',
    status: 'family-photo',
    source: 'couple-forest-original.jpg',
    treatment: 'Subject cut-out (BiRefNet-portrait + pymatting edge decontamination), warm natural grade, soft contact shadow.',
    notDisplayed: 'Retired in Phase 2.1: the Our Story section was replaced by the Wedding Compass, and couple photos now appear only in Magical Moments (plus the share image).',
  },
  /** (Not displayed) INVITATION — the beach embrace, extracted for a luminous arched composition. */
  invitationSubject: {
    width: 760,
    height: 1573,
    variants: v('/images/portraits/couple-beach-cutout', [
      [460, 952],
      [760, 1573],
    ]),
    alt: 'Vathsala resting her head on Darshan’s shoulder, both dressed in white, eyes closed in a quiet embrace.',
    status: 'family-photo',
    source: 'couple-beach-original.jpg',
    treatment: 'Full-length cut-out (BiRefNet-portrait), wet-sand reflection removed beside the feet, edge decontamination, gentle warm grade.',
    notDisplayed: 'Retired in Phase 2.1: removed from the invitation so each photograph appears in one place (Magical Moments), not scattered across sections.',
  },
  /** MAGICAL MOMENTS — traditional portrait, the emotional highlight. */
  traditionalCutout: {
    width: 1000,
    height: 832,
    variants: v('/images/portraits/couple-traditional-cutout', [
      [640, 532],
      [1000, 832],
    ]),
    alt: 'Vathsala in a lilac and gold silk saree with temple jewellery and jasmine in her hair, smiling up at Darshan, who embraces her from behind.',
    status: 'family-photo',
    source: 'couple-traditional-original.jpg',
    treatment: 'Cut-out from the striped wall (BiRefNet-portrait), hair-edge halo removal, warm champagne grade. Source is 1064×832, so it is never upscaled.',
  },
  /** MAGICAL MOMENTS — the forest scene kept whole, warm environmental crop. */
  momentsForest: {
    width: 960,
    height: 1200,
    variants: v('/images/gallery/couple-forest-moment', [
      [600, 750],
      [960, 1200],
    ]),
    alt: 'Vathsala and Darshan embracing on a sun-dappled path between towering pine trees.',
    status: 'family-photo',
    source: 'couple-forest-original.jpg',
    treatment: 'Environmental 4:5 crop, warm golden grade, light vignette. No cut-out.',
  },
  /** MAGICAL MOMENTS — the seascape kept whole, with its natural reflection. */
  momentsBeach: {
    width: 960,
    height: 1200,
    variants: v('/images/gallery/couple-beach-moment', [
      [600, 750],
      [960, 1200],
    ]),
    alt: 'Vathsala and Darshan standing together at the water’s edge under a soft sky, their reflection on the wet sand.',
    status: 'family-photo',
    source: 'couple-beach-original.jpg',
    treatment: 'Environmental 4:5 crop with sea, sky and reflection intact; soft warm grade.',
  },
} satisfies Record<string, ImageAsset>

/** Conceptual artwork drawn in code (SVG / WebGL) — replace with real imagery when available. */
export const artwork = {
  mandapScene: {
    status: 'conceptual-artwork' as const,
    note: 'Real-time Three.js mandap built from custom geometry (src/components/three). Static stills in /images/hero are renders of the same scene, used as poster/fallback.',
  },
  venueIllustration: {
    status: 'conceptual-artwork' as const,
    note: 'Gold line-art illustration (src/components/sections/VenueIllustration.tsx). It is NOT the real venue — set wedding.venue.photo to a family-supplied photograph to replace it.',
  },
  momentsArt: {
    status: 'conceptual-artwork' as const,
    note: 'Two Magical Moments panels (Blessings, Two Families) are illustrated, not photographs.',
  },
}
