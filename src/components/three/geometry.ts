import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useEffect, useMemo } from 'react'

/** useMemo + automatic dispose() on unmount for GPU resources created imperatively. */
export function useDisposable<T extends { dispose: () => void }>(factory: () => T, deps: unknown[] = []): T {
  // A deps-forwarding wrapper (like drei's helpers): callers pass literal deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  const value = useMemo(factory, deps)
  useEffect(() => () => value.dispose(), [value])
  return value
}

export function lathe(profile: [number, number][], segments: number, smooth = true) {
  let pts = profile.map(([r, y]) => new THREE.Vector2(r, y))
  if (smooth) {
    const curve = new THREE.SplineCurve(pts)
    pts = curve.getPoints(profile.length * 6)
  }
  return new THREE.LatheGeometry(pts, segments)
}

/** Carved mandap pillar (radius, height) — kalasha bulbs, rings and a flared capital. */
export const PILLAR_PROFILE: [number, number][] = [
  [0.001, 0],
  [0.27, 0],
  [0.27, 0.08],
  [0.2, 0.16],
  [0.155, 0.3],
  [0.15, 0.85],
  [0.205, 0.93],
  [0.205, 1.0],
  [0.15, 1.08],
  [0.2, 1.32],
  [0.25, 1.55],
  [0.2, 1.78],
  [0.14, 1.92],
  [0.13, 2.1],
  [0.13, 3.15],
  [0.18, 3.22],
  [0.18, 3.3],
  [0.13, 3.38],
  [0.17, 3.6],
  [0.21, 3.8],
  [0.16, 4.0],
  [0.12, 4.12],
  [0.12, 4.38],
  [0.19, 4.55],
  [0.27, 4.74],
  [0.3, 4.86],
  [0.3, 4.95],
  [0.001, 4.95],
]

/** Kuthuvilakku — tall South Indian brass oil lamp. Height ≈ 1.95 */
export const LAMP_PROFILE: [number, number][] = [
  [0.001, 0],
  [0.4, 0],
  [0.4, 0.05],
  [0.3, 0.1],
  [0.14, 0.24],
  [0.06, 0.36],
  [0.05, 0.55],
  [0.1, 0.62],
  [0.05, 0.69],
  [0.05, 0.92],
  [0.11, 1.0],
  [0.05, 1.08],
  [0.05, 1.3],
  [0.1, 1.37],
  [0.3, 1.45],
  [0.36, 1.5],
  [0.33, 1.53],
  [0.08, 1.5],
  [0.035, 1.56],
  [0.035, 1.76],
  [0.075, 1.83],
  [0.05, 1.9],
  [0.001, 1.96],
]

/** Kalasha — ceremonial pot with coconut, used as canopy finials. */
export const KALASHA_PROFILE: [number, number][] = [
  [0.001, 0],
  [0.1, 0],
  [0.12, 0.04],
  [0.2, 0.12],
  [0.23, 0.22],
  [0.19, 0.33],
  [0.09, 0.4],
  [0.08, 0.44],
  [0.12, 0.47],
  [0.12, 0.5],
  [0.15, 0.55],
  [0.13, 0.66],
  [0.06, 0.74],
  [0.001, 0.78],
]

/** Clay diya bowl. */
export const DIYA_PROFILE: [number, number][] = [
  [0.001, 0],
  [0.06, 0],
  [0.1, 0.025],
  [0.12, 0.06],
  [0.105, 0.065],
  [0.08, 0.04],
  [0.001, 0.035],
]

/** Brass bell. Height ≈ 0.26 (hangs from y = 0.26 down to 0). */
export const BELL_PROFILE: [number, number][] = [
  [0.001, 0.26],
  [0.03, 0.255],
  [0.04, 0.22],
  [0.05, 0.16],
  [0.07, 0.08],
  [0.1, 0.02],
  [0.105, 0],
  [0.09, 0.0],
]

/** Slightly cupped petal for instanced petals. */
export function petalGeometry() {
  const g = new THREE.PlaneGeometry(1, 1.25, 3, 3)
  const pos = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    // taper toward the base and cup the surface
    const taper = 0.55 + 0.45 * (y + 0.625) / 1.25
    pos.setX(i, x * taper)
    pos.setZ(i, -0.28 * x * x - 0.08 * y * y)
  }
  g.computeVertexNormals()
  return g
}

/** Scalloped valance strip (fabric hanging under the front canopy beam). */
export function scallopGeometry(width: number, height: number, scallops: number) {
  const shape = new THREE.Shape()
  const half = width / 2
  shape.moveTo(-half, 0)
  shape.lineTo(half, 0)
  shape.lineTo(half, -height * 0.55)
  const step = width / scallops
  for (let i = 0; i < scallops; i++) {
    const x0 = half - i * step
    const x1 = x0 - step
    shape.quadraticCurveTo((x0 + x1) / 2, -height * 1.35, x1, -height * 0.55)
  }
  shape.lineTo(-half, 0)
  return new THREE.ShapeGeometry(shape, 6)
}

/** Large arched gateway wall with a doorway cut-out. */
export function gatewayGeometry(w: number, h: number, doorW: number, doorH: number) {
  const shape = new THREE.Shape()
  shape.moveTo(-w / 2, 0)
  shape.lineTo(w / 2, 0)
  shape.lineTo(w / 2, h)
  shape.lineTo(-w / 2, h)
  shape.closePath()
  const door = new THREE.Path()
  const r = doorW / 2
  door.moveTo(-r, 0)
  door.lineTo(-r, doorH - r * 1.15)
  door.quadraticCurveTo(-r, doorH, 0, doorH + r * 0.15)
  door.quadraticCurveTo(r, doorH, r, doorH - r * 1.15)
  door.lineTo(r, 0)
  door.closePath()
  shape.holes.push(door)
  return new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: false })
}

/** Catenary-like swag points between two anchors. */
export function swagPoints(a: THREE.Vector3, b: THREE.Vector3, sag: number, count: number) {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= count; i++) {
    const t = i / count
    const p = a.clone().lerp(b, t)
    p.y -= sag * 4 * t * (1 - t)
    pts.push(p)
  }
  return pts
}

/**
 * South Indian (Dravidian) temple pillar: square base block, octagonal band,
 * square block, neck, pot capital (kumbha), abacus and cross-shaped corbel
 * bracket (potika). Merged into one geometry so a colonnade is one draw call.
 */
export function templePillarGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  let y = 0
  const add = (g: THREE.BufferGeometry, h: number) => {
    g.translate(0, y + h / 2, 0)
    parts.push(g)
    y += h
  }
  const box = (w: number, h: number, d: number) => add(new THREE.BoxGeometry(w, h, d), h)
  const oct = (rt: number, rb: number, h: number) => add(new THREE.CylinderGeometry(rt, rb, h, 8).rotateY(Math.PI / 8), h)
  box(1.25, 0.34, 1.25) // plinth
  box(1.06, 0.16, 1.06)
  box(0.86, 1.2, 0.86) // lower square block
  box(0.96, 0.07, 0.96)
  oct(0.44, 0.47, 0.2)
  oct(0.39, 0.39, 1.3) // octagonal band
  oct(0.47, 0.44, 0.2)
  box(0.96, 0.07, 0.96)
  box(0.86, 1.05, 0.86) // upper square block
  oct(0.3, 0.36, 0.42) // neck
  add(new THREE.SphereGeometry(0.5, 12, 8).scale(1, 0.5, 1), 0.4) // kumbha
  box(1.12, 0.13, 1.12) // abacus
  const corbelY = y
  add(new THREE.BoxGeometry(2.2, 0.3, 0.56), 0.3) // cross-shaped corbel bracket
  y = corbelY
  add(new THREE.BoxGeometry(0.56, 0.3, 2.2), 0.3)
  const merged = mergeGeometries(parts, false)!
  parts.forEach((p) => p.dispose())
  merged.userData.height = y
  return merged
}

/** Concave temple roof profile (lathed with 4 segments → square pyramid). */
export const ROOF_PROFILE: [number, number][] = [
  [3.55, 0],
  [3.98, 0.06],
  [3.94, 0.16],
  [3.35, 0.3],
  [2.65, 0.55],
  [2.05, 0.86],
  [1.5, 1.17],
  [1.02, 1.45],
  [0.66, 1.66],
  [0.42, 1.8],
  [0.001, 1.84],
]

export function roofGeometry(width: number, depth: number, height: number) {
  const g = lathe(ROOF_PROFILE, 4)
  g.rotateY(Math.PI / 4)
  const half = 3.98 * Math.SQRT1_2
  g.scale(width / (2 * half), height / 1.84, depth / (2 * half))
  g.computeVertexNormals()
  return g
}

/** Almond leaf outline (mango leaf for thoranam festoons), tip pointing down. */
export function leafGeometry(w = 1, h = 1) {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(w * 0.55, -h * 0.18, w * 0.5, -h * 0.72, 0, -h)
  s.bezierCurveTo(-w * 0.5, -h * 0.72, -w * 0.55, -h * 0.18, 0, 0)
  return new THREE.ShapeGeometry(s, 5)
}

/** Long banana leaf: bent plane with a folded midrib and a drooping tip. */
export function bananaLeafGeometry(width = 0.62, length = 1.75) {
  const g = new THREE.PlaneGeometry(width, length, 2, 12)
  g.translate(0, length / 2, 0)
  const pos = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const yy = pos.getY(i)
    const t = yy / length
    const taper = 1 - Math.pow(Math.max(0, t - 0.7) / 0.3, 2) * 0.7
    pos.setX(i, x * taper * (0.55 + 0.45 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5)))
    pos.setZ(i, Math.abs(x) * 0.28 + 0.9 * t * t)
  }
  g.computeVertexNormals()
  return g
}

/**
 * Multi-foil (cusped) arch outline from the right springing point to the
 * left one — the silhouette of a South Indian temple doorway (torana).
 */
export function cuspedArchPoints(halfW: number, springY: number, apexY: number, lobes = 7, depth = 0.045, steps = 140) {
  const pts: THREE.Vector2[] = []
  const b = apexY - springY
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI
    const k = 1 - depth * Math.pow(Math.abs(Math.sin(lobes * t)), 0.45)
    pts.push(new THREE.Vector2(halfW * Math.cos(t) * k, springY + b * Math.sin(t) * k))
  }
  return pts
}
