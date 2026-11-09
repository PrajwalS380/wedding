/** Shared button looks for the Celebrations chapters (dark scenes and paper). */
export const actionClass = {
  dark: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] border border-gold/60 bg-[rgba(12,10,22,.35)] px-4 text-label font-semibold uppercase tracking-[0.18em] text-gold-light backdrop-blur-[6px] transition-colors hover:border-gold hover:bg-gold/15 hover:text-ivory',
  light: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] border border-maroon/50 bg-[rgba(255,252,244,.35)] px-4 text-label font-semibold uppercase tracking-[0.18em] text-maroon transition-colors hover:bg-maroon/10',
  lightFill: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] bg-[linear-gradient(180deg,#6a1a2a,#521220)] px-4 text-label font-semibold uppercase tracking-[0.18em] text-ivory shadow-[0_8px_18px_-10px_rgba(80,10,20,.8),inset_0_1px_0_rgba(255,255,255,.12)] transition-[filter] hover:brightness-110',
} as const

/**
 * Where neighbouring parts of the page meet, both fade into the same colour, so
 * the page reads as one sky — evening, night, dawn, morning and evening again.
 */
export const SKY = {
  /** the page's night green: hero, invitation, RSVP and footer */
  night: '#061914',
  /** calendar → sunset */
  dusk: '#0a1424',
  /** the sunset scene → the night over the venue */
  embers: '#1c0c12',
  /** the venue's night: the map's haze and the ground of the venue and guests' cards */
  midnight: '#0c1020',
} as const

/** The last of the sunset's embers sinking into the deep blue night over the venue. */
export const nightfallGradient = `linear-gradient(180deg, ${SKY.embers} 0%, #180e1b 30%, #120f1f 62%, ${SKY.midnight} 100%)`

/** The venue's night deepening into the night green of the RSVP. */
export const nightGreenGradient = `linear-gradient(180deg, ${SKY.midnight} 0%, #0b1320 38%, #08171b 72%, ${SKY.night} 100%)`

/** Mixes two #rrggbb colours (t = 0 gives a, 1 gives b). */
export function mix(a: string, b: string, t: number) {
  const ch = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join('')}`
}

/**
 * A scene's backdrop: from the colour above, eased into the picture's own edge
 * colours, and eased out to the colour below (fades are percentages of the height).
 */
export function sceneBackdrop(edges: readonly [string, string], from: string, to: string, fadeTop = 14, fadeBottom = 14) {
  const ease = [0.25, 0.5, 0.75].map((k) => [k, k * k * (3 - 2 * k)] as const)
  const top = ease.map(([k, e]) => `${mix(from, edges[0], e)} ${fadeTop * k}%`)
  const bottom = ease.map(([k, e]) => `${mix(edges[1], to, e)} ${100 - fadeBottom + fadeBottom * k}%`)
  return `linear-gradient(180deg, ${from} 0%, ${top.join(', ')}, ${edges[0]} ${fadeTop}%, ${edges[1]} ${100 - fadeBottom}%, ${bottom.join(', ')}, ${to} 100%)`
}
