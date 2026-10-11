/**
 * Builders that merge many identical SVG marks (ticks, dots, petals) into a
 * single `d` string. One <path> renders the same pixels as dozens of <line>
 * or <circle> elements, but costs one DOM node instead of many — which keeps
 * style and layout cheap on phones.
 */

type Pt = [number, number]

const r2 = (n: number) => Math.round(n * 100) / 100

/** Point on a circle around (cx, cy); 0 rad points up and angles run clockwise. */
export function polar(cx: number, cy: number, r: number, a: number): Pt {
  return [r2(cx + Math.sin(a) * r), r2(cy - Math.cos(a) * r)]
}

/** Radial tick marks: for each index `i` of `count`, a segment from radius `inner(i)` to `outer`. */
export function radialTicks(cx: number, cy: number, count: number, indices: number[], inner: (i: number) => number, outer: number): string {
  return indices
    .map((i) => {
      const a = (i / count) * Math.PI * 2
      const [x1, y1] = polar(cx, cy, inner(i), a)
      const [x2, y2] = polar(cx, cy, outer, a)
      return `M${x1} ${y1}L${x2} ${y2}`
    })
    .join('')
}

/** Filled circles as one path (two arcs each). */
export function circles(list: [x: number, y: number, r: number][]): string {
  return list.map(([x, y, r]) => `M${r2(x - r)} ${y}a${r} ${r} 0 1 0 ${r2(2 * r)} 0a${r} ${r} 0 1 0 ${r2(-2 * r)} 0Z`).join('')
}

/**
 * A closed cubic shape (start point + groups of three control points), placed
 * by rotating `deg` around (ox, oy) and then translating by (tx, ty).
 */
export function placedCubic(points: Pt[], deg: number, ox = 0, oy = 0, tx = 0, ty = 0): string {
  const a = (deg * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const p = points.map(([x, y]): Pt => {
    const dx = x - ox
    const dy = y - oy
    return [r2(ox + dx * cos - dy * sin + tx), r2(oy + dx * sin + dy * cos + ty)]
  })
  let d = `M${p[0][0]} ${p[0][1]}`
  for (let i = 1; i + 2 < p.length; i += 3) d += `C${p[i][0]} ${p[i][1]} ${p[i + 1][0]} ${p[i + 1][1]} ${p[i + 2][0]} ${p[i + 2][1]}`
  return d + 'Z'
}

/** Indices 0…n-1 that satisfy `keep`. */
export const range = (n: number, keep: (i: number) => boolean = () => true) => Array.from({ length: n }, (_, i) => i).filter(keep)
