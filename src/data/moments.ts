import { photos, type ImageAsset } from './assets'

/**
 * MAGICAL MOMENTS — "A Journey Through Forever".
 * Titles and captions are thematic, not claims about events that happened.
 * Three moments use the couple's real photographs (each with a treatment
 * distinct from elsewhere on the site); two are illustrated panels.
 */
export type MomentVisual =
  | { kind: 'cutout'; asset: ImageAsset }
  | { kind: 'photo'; asset: ImageAsset; position?: string }
  | { kind: 'art'; art: 'blessings' | 'families' }

/** How the memory is framed in the installation. */
export type MomentFrame = 'arch' | 'print' | 'oval'

export interface Moment {
  id: string
  frame: MomentFrame
  title: string
  caption: string
  description: string
  visual: MomentVisual
  /** Ambient light colour of the stage while this moment is active. */
  mood: string
}

export const moments: Moment[] = [
  {
    id: 'blessings',
    frame: 'arch',
    title: 'A Moment of Blessings',
    caption: 'Every beginning, blessed',
    description: 'A lamp is lit, and the blessings of our elders light the way to every new beginning.',
    visual: { kind: 'art', art: 'blessings' },
    mood: 'rgba(240,169,74,.28)',
  },
  {
    id: 'tradition',
    frame: 'arch',
    title: 'The Beauty of Tradition',
    caption: 'Tradition, Love & Forever',
    description: 'Silk, jasmine and gold — the timeless grace of the traditions that bring us together.',
    visual: { kind: 'cutout', asset: photos.traditionalCutout },
    mood: 'rgba(213,176,109,.3)',
  },
  {
    id: 'families',
    frame: 'arch',
    title: 'Two Families, One Bond',
    caption: 'Bound by love and blessings',
    description: 'Two families come together, joined by love, respect and the blessings we share.',
    visual: { kind: 'art', art: 'families' },
    mood: 'rgba(168,50,63,.28)',
  },
  {
    id: 'chapter',
    frame: 'print',
    title: 'A New Chapter Begins',
    caption: 'Where Our Story Blossoms',
    description: 'Among tall trees and dappled light, a new chapter quietly begins.',
    visual: { kind: 'photo', asset: photos.momentsForest, position: '50% 60%' },
    mood: 'rgba(120,160,90,.24)',
  },
  {
    id: 'forever',
    frame: 'oval',
    title: 'Forever Starts Here',
    caption: 'In Every Moment, Together',
    description: 'Hand in hand, wherever the tide may lead — together, always.',
    visual: { kind: 'photo', asset: photos.momentsBeach, position: '52% 44%' },
    mood: 'rgba(190,200,220,.22)',
  },
]

/** The traditional portrait is the emotional highlight, so the journey opens on it. */
export const INITIAL_MOMENT = 1
