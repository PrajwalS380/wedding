/**
 * Evening traffic on the main roads (illustrative): autorickshaws, cars, buses, lorries and two-wheelers keeping
 * to the left, at town speeds — the city is alive while the camera flies over it.
 */
import * as THREE from 'three'
import { Path, rng, type XZ } from './geo'
import { glowPoints } from './lights'
import { patch, type Shared } from './shaders'

type Kind = { len: number; w: number; h: number; cab?: [number, number, number]; colors: string[]; cabColor?: string; speed: [number, number]; share: number }
const KINDS: Kind[] = [
  { len: 2.7, w: 1.4, h: 1.0, cab: [2.1, 0.62, 1.36], colors: ['#e7c21a', '#e7c21a', '#3c7f3a'], cabColor: '#1f1f1f', speed: [6.5, 9], share: 0.3 }, // auto
  { len: 4.2, w: 1.75, h: 0.85, cab: [2.2, 0.55, 1.58], colors: ['#f1f1ee', '#b9bcc1', '#8e1d22', '#3b3e44', '#284a7a', '#f1f1ee', '#7d7f84'], speed: [9, 13], share: 0.34 }, // car
  { len: 11, w: 2.5, h: 3.0, colors: ['#b8282a', '#c9562a', '#e2e0d8'], speed: [8, 10], share: 0.08 }, // bus
  { len: 7.5, w: 2.4, h: 2.8, colors: ['#e07a1f', '#d9b21c', '#2f6b9e', '#b23a2a'], speed: [7, 9], share: 0.08 }, // lorry
  { len: 1.9, w: 0.7, h: 1.25, colors: ['#26272a', '#7a1d1d', '#26272a', '#2a3e66'], speed: [8, 12], share: 0.2 }, // two-wheeler
]
const HALF: Record<number, number> = { 1: 3.25, 2: 5.5, 3: 7, 4: 9.5 }

export function buildTraffic(roads: { c: number; p: XZ[] }[], shared: Shared, near: XZ[], count = 340) {
  const r = rng(53)
  // main roads carry most of it; lanes near the station and the hall a little
  const lanes = roads
    .map((rd) => ({ path: new Path(rd.p), c: rd.c }))
    .filter(({ path, c }) => path.length > 40 && (c >= 2 || near.some(([x, z]) => path.pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 450))))
  const weight = lanes.map(({ path, c }) => path.length * (c === 4 ? 3 : c === 3 ? 2.2 : c === 2 ? 1.5 : 0.35))
  const total = weight.reduce((a, b) => a + b, 0)
  const pick = () => {
    let t = r() * total
    for (let i = 0; i < weight.length; i++) if ((t -= weight[i]) <= 0) return i
    return weight.length - 1
  }
  const box = new THREE.BoxGeometry(1, 1, 1)
  box.translate(0, 0.5, 0)
  const mat = patch(new THREE.MeshLambertMaterial({ color: 0xffffff }), shared, { key: 'traffic', clouds: true })
  const body = new THREE.InstancedMesh(box, mat, count)
  const cab = new THREE.InstancedMesh(box, mat, count)
  body.frustumCulled = cab.frustumCulled = false
  const col = new THREE.Color()
  const cars = Array.from({ length: count }, (_, i) => {
    let u = r(),
      k = 0
    while (k < KINDS.length - 1 && (u -= KINDS[k].share) > 0) k++
    const kind = KINDS[k]
    const lane = pick()
    body.setColorAt(i, col.set(kind.colors[Math.floor(r() * kind.colors.length)]))
    cab.setColorAt(i, kind.cab ? col.set(kind.cabColor ?? '#2a2f36') : col.setRGB(0, 0, 0))
    return { kind, lane, s: r() * lanes[lane].path.length, dir: r() < 0.5 ? 1 : -1, v: kind.speed[0] + r() * (kind.speed[1] - kind.speed[0]) }
  })
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    p = new THREE.Vector3(),
    sc = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0),
    hide = new THREE.Matrix4().makeScale(0, 0, 0)
  const at = [0, 0, 0, 0]
  // headlights ahead, tail-lights behind
  const lightCol = new Float32Array(count * 6)
  for (let i = 0; i < count; i++) lightCol.set([1, 0.9, 0.7, 1, 0.1, 0.06], i * 6)
  const lights = glowPoints(new Float32Array(count * 6), lightCol, { size: 1.1, min: 1, max: 9, intensity: 1 })
  const lp = lights.positions
  const place = () => {
    cars.forEach((c, i) => {
      const { path, c: cls } = lanes[c.lane]
      path.sample(c.s, at)
      const dx = at[2] * c.dir,
        dz = at[3] * c.dir
      const off = HALF[cls] * 0.45 // keep left
      const x = at[0] + dz * off,
        z = at[1] - dx * off
      q.setFromAxisAngle(up, Math.atan2(-dz, dx))
      const k = c.kind
      body.setMatrixAt(i, m4.compose(p.set(x, 0.55, z), q, sc.set(k.len, k.h, k.w)))
      if (k.cab) cab.setMatrixAt(i, m4.compose(p.set(x - dx * 0.25, 0.55 + k.h, z - dz * 0.25), q, sc.set(...k.cab)))
      else cab.setMatrixAt(i, hide)
      const half = k.len / 2 + 0.1
      lp.set([x + dx * half, 1.2, z + dz * half, x - dx * half, 1.2, z - dz * half], i * 6)
    })
    body.instanceMatrix.needsUpdate = cab.instanceMatrix.needsUpdate = true
    lights.points.geometry.attributes.position.needsUpdate = true
  }
  place()
  const group = new THREE.Group()
  group.add(body, cab, lights.points)
  return {
    group,
    lights,
    disposables: [box, mat, lights],
    /** move everything on by dt seconds */
    step(dt: number) {
      for (const c of cars) {
        const L = lanes[c.lane].path.length
        c.s += c.v * dt * c.dir
        if (c.s > L || c.s < 0) {
          c.dir = -c.dir // turn round at the end of the road
          c.s = Math.min(L, Math.max(0, c.s))
        }
      }
      place()
    },
  }
}
