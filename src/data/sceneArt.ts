/**
 * Rendered scenery for the Celebrations section. The images are artistic 3D
 * renders made for this site (tools/scenes) — never photographs. Live light
 * (flickering flames, twinkling bulbs, glints on water) is drawn over them at
 * the positions the renderer exported, so it lines up with the picture.
 */
export type LightKind = 'flame' | 'bulb' | 'sparkle' | 'star' | 'glow'

/** A live light: centre and radius as fractions of the image's width (x, r) and height (y). */
export interface LightPoint {
  x: number
  y: number
  r: number
  kind: LightKind
  /** 0–1, varies each light's rhythm so they never pulse in unison. */
  seed: number
}

export interface SceneVariant {
  src: string
  srcSet: string
  width: number
  height: number
  /** Which point of the image stays in view when it has to be cropped (0–1, like object-position). */
  focus: readonly [number, number]
  lights: readonly LightPoint[]
}

/** Portrait art for phones and tablets held upright, landscape art for wider screens. */
export interface SceneArt {
  portrait: SceneVariant
  landscape: SceneVariant
}

export type SceneKey = 'sunset' | 'twilight' | 'night' | 'dawn' | 'sunrise' | 'daylight'

export { SCENES, THAMBOOLA, PAPER } from './sceneArt.generated'
