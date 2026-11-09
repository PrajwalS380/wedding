/** The letter's paper: its torn edges and the paisley border printed down its sides. */
import { useMemo, type CSSProperties } from 'react'
import { rng } from '../../lib/random'

/** Data URIs for the letter's torn left and right edges (a 14 × 220 tile each, repeated down the edge). */
export function useDeckle() {
  return useMemo(() => {
    const r = rng(41)
    const pts: [number, number][] = []
    // a soft, fibrous tear: a slow wander with fine irregularity and the odd tuft
    let x = 6
    for (let y = 0; y <= 220; y += 2.5) {
      x += (r() - 0.5) * 1.6 + (6 - x) * 0.08
      pts.push([Math.min(12, Math.max(1.5, x + (r() - 0.5) * 1.2 + (r() < 0.05 ? -r() * 2.5 : 0))), y])
    }
    pts[pts.length - 1][0] = pts[0][0] // so the tile repeats seamlessly
    const poly = (flip: boolean) => [...pts.map(([x, y]) => `${flip ? 14 - x : x},${y}`), flip ? '0,220 0,0' : '14,220 14,0'].join(' ')
    const svg = (flip: boolean) =>
      `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='14' height='220'><filter id='b'><feGaussianBlur stdDeviation='.6'/></filter><polygon points='${poly(flip)}' fill='#000' filter='url(#b)'/></svg>`)}")`
    return { '--deckle-l': svg(false), '--deckle-r': svg(true) } as CSSProperties
  }, [])
}

/** A column of small paisleys and dots, printed in gold down each side of the letter. */
export const PAISLEY_BORDER = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='44' viewBox='0 0 16 44'><g fill='none' stroke='#a17a3c' stroke-width='.8'><path d='M8 4 C13 6 13 14 8 16 C5 17 4 14 6 12.5 C7 11.6 8.4 12 8.2 13.2'/><circle cx='8' cy='25' r='1.1' fill='#a17a3c' stroke='none'/><path d='M8 30 C3 32 3 40 8 42 C11 43 12 40 10 38.5 C9 37.6 7.6 38 7.8 39.2'/></g></svg>`,
)}")`

