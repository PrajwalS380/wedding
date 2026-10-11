import { createContext, useContext } from 'react'

/**
 * Orientation-aware staging. Portrait screens use a camera that pulls back far
 * enough to show the whole mandap (roof to steps, both lamps) — the same
 * composition as on desktop — so the fog is thinned to match the distance.
 */
export interface StageLayout {
  portrait: boolean
  aspect: number
  /** FogExp2 density, scaled so the mandap is as clear as it is on desktop. */
  fogDensity: number
}

export const FOG_DENSITY = 0.04

/**
 * Portrait screens: default position of the couple's names (fraction of the
 * hero's height from the top). The camera frames the mandap's interior there;
 * the portrait poster still is rendered with this value.
 */
export const PORTRAIT_ANCHOR = 0.42

/** Aspect ratio (width / height) of the portrait poster still. */
export const PORTRAIT_POSTER_ASPECT = 900 / 2000

export const StageContext = createContext<StageLayout>({ portrait: false, aspect: 1.6, fogDensity: FOG_DENSITY })

export const useStage = () => useContext(StageContext)

/** Brass standing lamps [x, z, baseY], flanking the mandap on the floor (every screen shape). */
export function lampPositions(): [number, number, number][] {
  return [
    [-3.95, 2.75, 0],
    [3.95, 2.75, 0],
  ]
}
