/** Geometry helpers for the route map. Units are metres: x east, z south, y up. */
import * as THREE from 'three'

export type XZ = [number, number]

/** A flat ribbon along a polyline, `w` wide at height y: uv = (distance along, -1…1 across), aLen = the line's length. */
function ribbon(points: XZ[], w: number, y: number, out: { pos: number[]; uv: number[]; len: number[]; idx: number[] }) {
  if (points.length < 2) return
  const n = points.length
  const base = out.pos.length / 3
  let total = 0
  for (let i = 1; i < n; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  let dist = 0
  for (let i = 0; i < n; i++) {
    const [x, z] = points[i]
    const [ax, az] = points[Math.max(0, i - 1)]
    const [bx, bz] = points[Math.min(n - 1, i + 1)]
    let tx = bx - ax,
      tz = bz - az
    const tl = Math.hypot(tx, tz) || 1
    tx /= tl
    tz /= tl
    // mitre, limited so sharp turns don't spike
    let nx = -tz,
      nz = tx
    if (i > 0 && i < n - 1) {
      const [px, pz] = points[i - 1]
      let ux = x - px,
        uz = z - pz
      const ul = Math.hypot(ux, uz) || 1
      ux /= ul
      uz /= ul
      const dot = Math.max(0.35, -uz * nx + ux * nz)
      nx /= dot
      nz /= dot
    }
    if (i > 0) dist += Math.hypot(x - points[i - 1][0], z - points[i - 1][1])
    out.pos.push(x + (nx * w) / 2, y, z + (nz * w) / 2, x - (nx * w) / 2, y, z - (nz * w) / 2)
    out.uv.push(dist, 1, dist, -1)
    out.len.push(total, total)
    if (i < n - 1) {
      const a = base + i * 2
      out.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) // wound to face up
    }
  }
}

export function ribbonGeometry(lines: XZ[][], w: number, y: number) {
  const out = { pos: [] as number[], uv: [] as number[], len: [] as number[], idx: [] as number[] }
  for (const l of lines) ribbon(l, w, y, out)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2))
  g.setAttribute('aLen', new THREE.Float32BufferAttribute(out.len, 1))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(out.pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3))
  g.setIndex(out.idx)
  return g
}

/** Resample a polyline every `step` metres along a smooth curve through it. */
export function smooth(points: XZ[], step: number): XZ[] {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  )
  const n = Math.max(2, Math.round(curve.getLength() / step))
  return curve.getSpacedPoints(n).map((v) => [v.x, v.z])
}

/** A polyline you can walk: point and direction at any distance along it. */
export class Path {
  readonly cum: number[] = [0]
  readonly length: number
  constructor(readonly pts: XZ[]) {
    let L = 0
    for (let i = 1; i < pts.length; i++) this.cum.push((L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])))
    this.length = L
  }
  /** writes x, z, dx, dz (unit direction) for distance d into `out` */
  sample(d: number, out: Float32Array | number[]) {
    const { pts, cum } = this
    d = Math.min(this.length, Math.max(0, d))
    let lo = 1,
      hi = cum.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid] < d) lo = mid + 1
      else hi = mid
    }
    const i = Math.max(1, lo)
    const seg = cum[i] - cum[i - 1] || 1
    const t = (d - cum[i - 1]) / seg
    const [ax, az] = pts[i - 1],
      [bx, bz] = pts[i]
    out[0] = ax + (bx - ax) * t
    out[1] = az + (bz - az) * t
    out[2] = (bx - ax) / seg
    out[3] = (bz - az) / seg
    return out
  }
}

type Shade = [number, number, number] | ((p: THREE.Vector3, n: THREE.Vector3, i: number) => [number, number, number])

/** Merge geometries into one with vertex colours: a fixed colour per part, or a function of position and normal. */
export function mergeColored(parts: [THREE.BufferGeometry, Shade][]) {
  const pos: number[] = [],
    nrm: number[] = [],
    col: number[] = []
  const p = new THREE.Vector3(),
    n = new THREE.Vector3()
  for (const [g0, c] of parts) {
    const g = g0.index ? g0.toNonIndexed() : g0
    if (!g.attributes.normal) g.computeVertexNormals()
    const P = g.attributes.position,
      N = g.attributes.normal
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i)
      n.fromBufferAttribute(N, i)
      pos.push(p.x, p.y, p.z)
      nrm.push(n.x, n.y, n.z)
      col.push(...(typeof c === 'function' ? c(p, n, i) : c))
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  return g
}

/** A smooth lump: an icosahedron with jittered vertices and normals pointing out from its centre. */
export function lump(r: number, detail: number, seed: number, squash = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail)
  const P = g.attributes.position
  const N = new Float32Array(P.count * 3)
  const v = new THREE.Vector3()
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i)
    const h = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719 + seed * 4.1) * 43758.5453
    const k = 0.84 + 0.3 * (h - Math.floor(h))
    v.multiplyScalar(k)
    v.y *= squash
    P.setXYZ(i, v.x, v.y, v.z)
    const nl = Math.hypot(v.x, v.y / (squash * squash), v.z) || 1
    N.set([v.x / nl, v.y / (squash * squash) / nl, v.z / nl], i * 3)
  }
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3))
  return g
}

/** The classic map-marker outline, height 1, tip at the origin. */
export function markerShape(R = 0.32, cy = 0.66) {
  const s = new THREE.Shape()
  const t = Math.PI / 2 - Math.asin(R / cy)
  s.moveTo(0, 0)
  s.lineTo(Math.cos(t) * R, cy - Math.sin(t) * R)
  s.absarc(0, cy, R, -t, Math.PI + t, false)
  s.lineTo(0, 0)
  const hole = new THREE.Path()
  hole.absarc(0, cy, R * 0.46, 0, Math.PI * 2, true)
  s.holes.push(hole)
  return s
}

/** Deterministic pseudo-random numbers. */
export function rng(seed: number) {
  let s = seed % 2147483647 || 1
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

export function pointInPolygon(x: number, z: number, poly: XZ[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i],
      [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

/** World transform of a point given in a frame at (x, z) turned by `ang` (as the buildings are). */
export function local(x: number, z: number, ang: number, lx: number, lz: number): XZ {
  const c = Math.cos(ang),
    s = Math.sin(ang)
  return [x + c * lx - s * lz, z + s * lx + c * lz]
}
