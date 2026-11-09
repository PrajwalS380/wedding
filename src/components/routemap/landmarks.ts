/**
 * The two places the film dwells on, drawn illustratively (the page says the buildings are illustrative):
 *
 * - The hall, Bapuji Samudhaya Bhavan, dressed for the wedding: a two-storey hall behind a compound wall, its
 *   tall entrance front with a stepped crown and a gold kalasha, a marigold welcome arch at the gate, a striped
 *   shamiana with tables in the forecourt, guests' cars — and strings of lights cascading down every wall,
 *   swagged from the crown to the wall, outlining the arch and the tent, that glow up as the drive arrives.
 * - Davangere railway station: the main platform and an island platform under long canopies, a footbridge, the
 *   station building facing the road the route leaves by, overhead wires on their masts, a train at the platform.
 */
import * as THREE from 'three'
import { block, blockGeometry, houseMaterial, PLAIN } from './city'
import { rng, type XZ } from './geo'
import { patch, type Shared } from './shaders'
import { glowPoints } from './lights'
import { coachTexture, glowTexture, stripeTexture } from './textures'

export interface HallData {
  p: XZ
  along: XZ
  front: XZ
  plot: [number, number]
}
export interface StationData {
  p: XZ
  along: XZ
  side: XZ
  platform: XZ
  island: XZ
  building: XZ
  train: [number, number, number, number][]
  sizes: { platform: [number, number]; island: [number, number]; building: [number, number]; track: number; coach: number }
}

type D = { dispose: () => void }

/* ---------------------------------------------------------------- festive lights */

const BULB_VERT = /* glsl */ `
attribute vec3 aColor; attribute float aPhase; attribute float aKind;
uniform float uTime; uniform float uOn; uniform float uScale;
varying vec3 vColor; varying float vI;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  gl_Position = projectionMatrix * mv;
  float raw = 2. * uScale / -mv.z;
  float tw = .72 + .28 * sin(uTime * (2.3 + aKind * .8) + aPhase * 1.7);
  float chase = aKind > 1.5 ? .45 + .55 * step(.42, fract(aPhase * .12 - uTime * .9)) : 1.;
  vI = uOn * tw * chase * min(1., raw / 2.2);
  vColor = aColor;
  gl_PointSize = clamp(raw, 2., 15.);
}`
const BULB_FRAG = /* glsl */ `
varying vec3 vColor; varying float vI;
void main() {
  float d = length(gl_PointCoord - .5) * 2.;
  float core = exp(-d * d * 10.), halo = exp(-d * d * 2.4) * .5;
  gl_FragColor = vec4(vColor * (core * 1.05 + halo) * vI, 1.);
}`

export interface Bulbs {
  points: THREE.Points
  uniforms: { uTime: { value: number }; uOn: { value: number }; uScale: { value: number } }
}

class BulbBuilder {
  pos: number[] = []
  col: number[] = []
  phase: number[] = []
  kind: number[] = []
  r = rng(71)
  add(x: number, y: number, z: number, c: number[], kind: number, phase = this.r() * 6.28) {
    this.pos.push(x, y, z)
    this.col.push(...c)
    this.phase.push(phase)
    this.kind.push(kind)
  }
  /** bulbs every `step` metres from a to b, sagging by `sag` in the middle */
  line(a: THREE.Vector3, b: THREE.Vector3, step: number, colors: number[][], kind: number, sag = 0) {
    const n = Math.max(1, Math.round(a.distanceTo(b) / step))
    for (let i = 0; i <= n; i++) {
      const t = i / n
      this.add(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t), a.z + (b.z - a.z) * t, colors[i % colors.length], kind, kind === 2 ? i : undefined)
    }
  }
  build(time: { value: number }): Bulbs {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(this.col, 3))
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(this.phase, 1))
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(this.kind, 1))
    const uniforms = { uTime: time, uOn: { value: 0.35 }, uScale: { value: 800 } }
    const m = new THREE.ShaderMaterial({ uniforms, vertexShader: BULB_VERT, fragmentShader: BULB_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const points = new THREE.Points(g, m)
    points.renderOrder = 7
    points.frustumCulled = false
    return { points, uniforms }
  }
}

const GOLD = [1, 0.7, 0.24],
  AMBER = [1, 0.46, 0.12],
  WARM = [1, 0.82, 0.5]
const FESTIVE = [GOLD, [1, 0.36, 0.6], GOLD, [0.42, 1, 0.62], GOLD, [0.45, 0.66, 1], AMBER]

/* ---------------------------------------------------------------- helpers */

function kit(group: THREE.Group, shared: Shared, prefix: string) {
  const disposables: D[] = []
  const unit = blockGeometry()
  disposables.push(unit)
  const mats = new Map<string, THREE.MeshLambertMaterial>()
  const lam = (color: string, opts: THREE.MeshLambertMaterialParameters = {}) => {
    const k = color + JSON.stringify(Object.keys(opts))
    if (!mats.has(k)) {
      const m = patch(new THREE.MeshLambertMaterial({ color, ...opts }), shared, { key: `${prefix}-lam`, clouds: true })
      mats.set(k, m)
      disposables.push(m)
    }
    return mats.get(k)!
  }
  /** a box `sx` × `sy` × `sz`, its foot at (x, y, z) */
  const box = (sx: number, sy: number, sz: number, x: number, y: number, z: number, mat: THREE.Material, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(unit, mat)
    m.scale.set(sx, sy, sz)
    m.position.set(x, y, z)
    m.rotation.set(0, ry, rz)
    group.add(m)
    return m
  }
  const geo = <G extends THREE.BufferGeometry>(g: G) => (disposables.push(g), g)
  const mesh = (g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(g, mat)
    m.position.set(x, y, z)
    group.add(m)
    return m
  }
  return { disposables, lam, box, geo, mesh }
}

/* ---------------------------------------------------------------- the hall */

export function buildHall(h: HallData, shared: Shared, metalEnv: THREE.Texture) {
  const g = new THREE.Group()
  g.position.set(h.p[0], 0, h.p[1])
  g.rotation.y = Math.atan2(h.front[0], h.front[1]) // local +z faces the road
  const { disposables, lam, box, geo, mesh } = kit(g, shared, 'hall')
  const house = houseMaterial(shared)
  const unit = blockGeometry()
  disposables.push(house, unit)
  const [PL, PD] = h.plot
  const HZ = -8,
    HW = 46,
    HD = 26,
    HH = 10.5
  const front = HZ + HD / 2 // the hall's front wall
  const TF = front + 3 // the entrance front's face
  const r = rng(29)

  // the hall, and its tall entrance front with a stepped crown
  const blocks = [
    block(unit, house, [HD, HH, HW], '#f2e5c6', 8, new THREE.Vector3(0, 0, HZ), -Math.PI / 2),
    block(unit, house, [3, 15.5, 16], '#f7ecd4', PLAIN + 8, new THREE.Vector3(0, 0, front + 1.5), -Math.PI / 2),
  ]
  blocks.forEach((b) => (g.add(b), disposables.push(b.geometry)))
  const cream = lam('#f4e8cf'),
    maroon = lam('#7a1f26')
  box(16.4, 0.7, 3.4, 0, 12.4, front + 1.5, maroon)
  box(14.4, 1.4, 2.8, 0, 15.5, front + 1.5, cream)
  box(14.8, 0.35, 3.2, 0, 16.9, front + 1.5, maroon)
  box(10, 1.4, 2.2, 0, 17.25, front + 1.5, cream)
  box(10.4, 0.35, 2.6, 0, 18.65, front + 1.5, maroon)
  box(5.4, 1.3, 1.8, 0, 19, front + 1.5, cream)
  // a gold kalasha on top
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b052', metalness: 1, roughness: 0.28, envMap: metalEnv })
  disposables.push(gold)
  const kalasha = geo(new THREE.LatheGeometry([0, 0.9, 1.05, 0.9, 0.5, 0.55, 0.25, 0.12, 0].map((rr, i) => new THREE.Vector2(rr, i * 0.28)), 16))
  mesh(kalasha, gold, 0, 20.3, front + 1.5)
  // the arched entrance: a maroon frame round a dark doorway
  const halfDisc = (rad: number) => {
    const c = geo(new THREE.CylinderGeometry(rad, rad, 0.3, 20, 1, false, Math.PI / 2, Math.PI))
    c.rotateX(Math.PI / 2)
    return c
  }
  box(7.4, 6.2, 0.3, 0, 0, TF + 0.05, maroon)
  mesh(halfDisc(3.7), maroon, 0, 6.2, TF + 0.2)
  const doorway = lam('#2d1b12')
  box(6, 6.2, 0.3, 0, 0, TF + 0.15, doorway)
  mesh(halfDisc(3), doorway, 0, 6.2, TF + 0.3)
  box(10, 0.3, 2.2, 0, 0, TF + 1.1, lam('#d9d2c4'))
  box(10, 0.3, 1.2, 0, 0.3, TF + 0.6, lam('#d9d2c4'))

  // the compound wall with its gate
  const wall = lam('#e6d8bd')
  const W = 0.3,
    WH = 1.8,
    gate = 6.3
  box((PL / 2 - gate), WH, W, -(PL / 2 + gate) / 2, 0, PD / 2, wall)
  box((PL / 2 - gate), WH, W, (PL / 2 + gate) / 2, 0, PD / 2, wall)
  box(W, WH, PD, -PL / 2, 0, 0, wall)
  box(W, WH, PD, PL / 2, 0, 0, wall)
  box(PL, WH, W, 0, 0, -PD / 2, wall)
  for (const s of [-1, 1]) {
    box(0.9, 3, 0.9, s * gate, 0, PD / 2, cream)
    box(1.1, 0.3, 1.1, s * gate, 3, PD / 2, maroon)
    box(3, 1.8, 0.08, s * (gate - 1.6), 0, PD / 2 - 1.3, lam('#3a3430'), s * 0.9) // the gates, swung open
  }

  // the marigold welcome arch at the gate
  const marigold = (p: THREE.Vector3): [number, number, number] => {
    const band = Math.floor((Math.atan2(p.y, p.x) + 4) * 7 + p.y * 1.8) % 5
    return band === 4 ? [0.78, 0.12, 0.12] : band % 2 ? [0.98, 0.72, 0.12] : [0.95, 0.45, 0.06]
  }
  const archMat = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), shared, { key: 'hall-arch', clouds: true })
  disposables.push(archMat)
  const AR = 7.2,
    AZ = PD / 2 + 1.2,
    AY = 6.8
  const colorize = (gg: THREE.BufferGeometry, f: (p: THREE.Vector3) => [number, number, number]) => {
    const P = gg.attributes.position,
      c = new Float32Array(P.count * 3),
      v = new THREE.Vector3()
    for (let i = 0; i < P.count; i++) c.set(f(v.fromBufferAttribute(P, i)), i * 3)
    gg.setAttribute('color', new THREE.BufferAttribute(c, 3))
    return gg
  }
  mesh(colorize(geo(new THREE.TorusGeometry(AR, 0.55, 8, 40, Math.PI)), marigold), archMat, 0, AY, AZ)
  for (const s of [-1, 1]) {
    const post = colorize(geo(new THREE.CylinderGeometry(0.55, 0.6, AY, 10, 12)), (p) => marigold(new THREE.Vector3(1, p.y * 3, 0)))
    post.translate(0, AY / 2, 0)
    mesh(post, archMat, s * AR, 0, AZ)
  }
  box(6.4, 1.8, 0.16, 0, AY + 3.6, AZ + 0.1, gold)
  box(6, 1.4, 0.2, 0, AY + 3.8, AZ + 0.2, maroon)

  // a striped shamiana in the forecourt, tables laid under it
  const SX = -15,
    SZ = 12
  const cloth = new THREE.MeshLambertMaterial({ map: stripeTexture(), side: THREE.DoubleSide })
  disposables.push(cloth, cloth.map!)
  const roof = geo(new THREE.CylinderGeometry(0.15, 1, 1, 4, 1, true))
  roof.rotateY(Math.PI / 4)
  const tent = mesh(roof, patch(cloth, shared, { key: 'hall-tent', clouds: true }), SX, 5.8, SZ)
  tent.scale.set(11.3, 2.4, 8.5)
  const valance = geo(new THREE.CylinderGeometry(1, 1, 1, 4, 1, true))
  valance.rotateY(Math.PI / 4)
  const vm = mesh(valance, lam('#8a1c22', { side: THREE.DoubleSide }), SX, 4.2, SZ)
  vm.scale.set(11.3, 0.8, 8.5)
  for (const [dx, dz] of [
    [-8, -6],
    [8, -6],
    [-8, 6],
    [8, 6],
  ])
    box(0.22, 4.6, 0.22, SX + dx, 0, SZ + dz, lam('#c9b48a'))
  const tableGeo = geo(new THREE.CylinderGeometry(0.85, 0.85, 0.78, 10))
  tableGeo.translate(0, 0.39, 0)
  const tables = new THREE.InstancedMesh(tableGeo, lam('#f6f1e6'), 8)
  for (let i = 0; i < 8; i++) tables.setMatrixAt(i, new THREE.Matrix4().makeTranslation(SX - 4.5 + (i % 4) * 3, 0, SZ - 2 + Math.floor(i / 4) * 4))
  g.add(tables)

  // guests' cars in the forecourt, a couple of autos waiting at the gate
  const cars: [number, number, number, string][] = []
  ;[9, 12.2, 15.4, 18.6, 21.8, 25].forEach((x, i) => cars.push([x, 0, 4, ['#f2f2ef', '#b9bcc1', '#8e1d22', '#3b3e44', '#f2f2ef', '#284a7a'][i]]))
  ;[12.2, 15.4, 18.6, 21.8].forEach((x, i) => cars.push([x, 0, 14, ['#c8c9cc', '#f2f2ef', '#5c5f66', '#a33a1f'][i]]))
  const body = new THREE.InstancedMesh(unit, lam('#ffffff'), cars.length + 2)
  const cabin = new THREE.InstancedMesh(unit, lam('#ffffff'), cars.length + 2)
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    v = new THREE.Vector3(),
    sc = new THREE.Vector3(),
    col = new THREE.Color()
  cars.forEach(([x, , z, c], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2 + (r() - 0.5) * 0.08)
    body.setMatrixAt(i, m4.compose(v.set(x, 0.25, z), q, sc.set(4.3, 0.85, 1.78)))
    body.setColorAt(i, col.set(c))
    cabin.setMatrixAt(i, m4.compose(v.set(x, 1.1, z), q, sc.set(2.3, 0.55, 1.6)))
    cabin.setColorAt(i, col.set(c).multiplyScalar(0.55))
  })
  ;[0, 1].forEach((k) => {
    const i = cars.length + k
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.05)
    body.setMatrixAt(i, m4.compose(v.set(11 + k * 3.4, 0.2, PD / 2 + 3.6), q, sc.set(2.7, 1.1, 1.4)))
    body.setColorAt(i, col.set(k ? '#3a7d3a' : '#e9c21c'))
    cabin.setMatrixAt(i, m4.compose(v.set(11 + k * 3.4, 1.3, PD / 2 + 3.6), q, sc.set(2.1, 0.55, 1.36)))
    cabin.setColorAt(i, col.set('#1f1f1f'))
  })
  g.add(body, cabin)

  // a warm pool of light on the forecourt, brightening with the lights
  const poolMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#ffb25e', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  disposables.push(poolMat, poolMat.map!)
  const pool = mesh(geo(new THREE.PlaneGeometry(1, 1)), poolMat, 0, 0.6, 4)
  pool.rotation.x = -Math.PI / 2
  pool.scale.set(120, 100, 1)
  pool.renderOrder = 2

  // the lights
  const B = new BulbBuilder()
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
  const x0 = -HW / 2,
    x1 = HW / 2,
    z0 = HZ - HD / 2,
    z1 = front
  // cascades down every wall of the hall (not behind the entrance front)
  const cascade = (ax: number, az: number, bx: number, bz: number, step: number) => {
    const L = Math.hypot(bx - ax, bz - az),
      n = Math.round(L / step)
    for (let i = 0; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n,
        z = az + ((bz - az) * i) / n
      if (Math.abs(z - z1) < 0.2 && Math.abs(x) < 8.6) continue
      const len = 4 + r() * 5.6
      const c = r() < 0.8 ? GOLD : AMBER
      for (let y = HH - 0.2, k = 0; y > HH - len; y -= 0.55, k++) B.add(x, y, z, c, 2, k + i * 0.7)
    }
  }
  cascade(x0, z1 + 0.08, x1, z1 + 0.08, 1.05)
  cascade(x0 - 0.08, z0, x0 - 0.08, z1, 1.15)
  cascade(x1 + 0.08, z0, x1 + 0.08, z1, 1.15)
  cascade(x0, z0 - 0.08, x1, z0 - 0.08, 1.4)
  // the parapet outlined
  B.line(V(x0, HH + 0.15, z0), V(x1, HH + 0.15, z0), 0.9, [WARM], 0)
  B.line(V(x0, HH + 0.15, z1), V(x1, HH + 0.15, z1), 0.9, [WARM], 0)
  B.line(V(x0, HH + 0.15, z0), V(x0, HH + 0.15, z1), 0.9, [WARM], 0)
  B.line(V(x1, HH + 0.15, z0), V(x1, HH + 0.15, z1), 0.9, [WARM], 0)
  // the entrance front and its crown outlined
  for (const s of [-1, 1]) B.line(V(s * 8.05, 0.4, TF + 0.1), V(s * 8.05, 15.5, TF + 0.1), 0.6, [GOLD], 0)
  for (const [hw, y] of [
    [8.05, 15.5],
    [7.3, 16.9],
    [5.1, 18.65],
    [2.8, 20.2],
  ])
    B.line(V(-hw, y, TF + 0.1), V(hw, y, TF + 0.1), 0.6, [GOLD], 0)
  for (let a = 0; a <= 24; a++) {
    const t = Math.PI * (a / 24)
    B.add(Math.cos(t) * 3.9, 6.2 + Math.sin(t) * 3.9, TF + 0.4, GOLD, 0)
  }
  // swags from the crown to the compound wall
  for (const s of [-1, 1]) {
    B.line(V(s * 8, 15.4, TF), V(s * (PL / 2), 1.9, PD / 2), 0.75, FESTIVE, 1, 2.6)
    B.line(V(s * 8, 15.4, TF), V(s * 18, 1.9, PD / 2), 0.75, FESTIVE, 1, 2.2)
    B.line(V(s * x1, HH, z1), V(s * (PL / 2), 1.9, 12), 0.75, FESTIVE, 1, 1.4)
  }
  // the welcome arch and the shamiana
  for (let a = 0; a <= 30; a++) {
    const t = Math.PI * (a / 30)
    B.add(Math.cos(t) * (AR + 0.7), AY + Math.sin(t) * (AR + 0.7), AZ + 0.3, a % 3 ? GOLD : AMBER, 0)
  }
  for (const s of [-1, 1]) B.line(V(s * (AR + 0.7), 0.4, AZ + 0.3), V(s * (AR + 0.7), AY, AZ + 0.3), 0.6, [GOLD], 0)
  const tc = [
    [-8, -6],
    [8, -6],
    [8, 6],
    [-8, 6],
  ]
  tc.forEach(([ax, az], i) => {
    const [bx, bz] = tc[(i + 1) % 4]
    B.line(V(SX + ax, 4.6, SZ + az), V(SX + bx, 4.6, SZ + bz), 0.8, [GOLD, AMBER], 1, 0.3)
    B.line(V(SX + ax, 4.6, SZ + az), V(SX, 7, SZ), 0.8, [WARM], 0)
  })
  for (const s of [-1, 1]) B.add(s * gate, 3.6, PD / 2, WARM, 0)
  const bulbs = B.build(shared.time)
  disposables.push(bulbs.points.geometry, bulbs.points.material as THREE.Material)
  g.add(bulbs.points)

  return {
    group: g,
    disposables,
    bulbs,
    /** world position of the hall's centre */
    centre: new THREE.Vector3(h.p[0], 0, h.p[1]).add(new THREE.Vector3(0, 0, HZ).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y)),
    height: HH,
    setGlow(on: number) {
      bulbs.uniforms.uOn.value = on
      poolMat.opacity = 0.5 * Math.max(0, on - 0.2)
    },
  }
}

/* ---------------------------------------------------------------- the station */

export function buildStation(st: StationData, shared: Shared) {
  const g = new THREE.Group()
  g.position.set(st.p[0], 0, st.p[1])
  g.rotation.y = Math.atan2(st.side[0], st.side[1]) // local +x along the tracks, +z towards the town
  const { disposables, lam, box, geo } = kit(g, shared, 'station')
  const house = houseMaterial(shared)
  const unit = blockGeometry()
  disposables.push(house, unit)
  const [ux, uz] = st.along,
    [nx, nz] = st.side
  const toLocal = ([x, z]: XZ): XZ => [(x - st.p[0]) * ux + (z - st.p[1]) * uz, (x - st.p[0]) * nx + (z - st.p[1]) * nz]
  const T = st.sizes.track
  const concrete = lam('#bdb5a8'),
    canopy = lam('#8d978c'),
    steel = lam('#4f6b5c'),
    yellow = lam('#e0b43a')

  // platforms with their yellow edge lines and canopies on green steel columns
  const [plx, plz] = toLocal(st.platform)
  const [PL, PW] = st.sizes.platform
  box(PL, 1, PW, plx, 0, plz, concrete)
  box(PL, 0.02, 0.35, plx, 1, plz - PW / 2 + 0.35, yellow)
  const [ilx, ilz] = toLocal(st.island)
  const [IL, IW] = st.sizes.island
  box(IL, 1, IW, ilx, 0, ilz, concrete)
  box(IL, 0.02, 0.3, ilx, 1, ilz + IW / 2 - 0.3, yellow)
  box(IL, 0.02, 0.3, ilx, 1, ilz - IW / 2 + 0.3, yellow)
  const lampPos: number[] = [],
    lampCol: number[] = []
  const roofSpan = (a: number, b: number, z: number, w: number) => {
    box(b - a, 0.35, w, (a + b) / 2, 5.4, z, canopy)
    for (let x = a + 4; x < b - 2; x += 12) box(0.3, 4.4, 0.3, x, 1, z, steel)
    // tube lights under the canopy
    for (let x = a + 6; x < b - 2; x += 9) {
      lampPos.push(x, 5.1, z)
      lampCol.push(0.85, 0.93, 1)
    }
  }
  roofSpan(-150, -10, plz + 0.6, 7) // a gap where the route leaves the platform
  roofSpan(10, 130, plz + 0.6, 7)
  roofSpan(ilx - 100, ilx + 100, ilz, 6)

  const platformLamps = glowPoints(new Float32Array(lampPos), new Float32Array(lampCol), { size: 1.3, min: 1.2, max: 12, intensity: 1.1 })
  disposables.push(platformLamps)
  g.add(platformLamps.points)

  // the footbridge over the tracks
  const fob = lam('#9aa39c')
  const bx = 52
  box(3.2, 0.9, ilz - plz + 6, bx, 7.2, (ilz + plz) / 2, fob)
  box(3.8, 0.25, ilz - plz + 6, bx, 10.1, (ilz + plz) / 2, canopy)
  for (const z of [plz + 0.5, ilz]) {
    box(14, 0.4, 2.4, bx + 7, 3.9, z, fob, 0, -Math.atan2(6.4, 13))
  }

  // the station building facing the road, a taller entrance hall and its porch
  const [blx, blz] = toLocal(st.building)
  const [BL, BD] = st.sizes.building
  const b1 = block(unit, house, [BD, 8, BL], '#ecd6a2', 0, new THREE.Vector3(blx, 0, blz), -Math.PI / 2)
  const b2 = block(unit, house, [BD + 4, 11.5, 22], '#f1e0b4', 8, new THREE.Vector3(blx, 0, blz + 2), -Math.PI / 2)
  g.add(b1, b2)
  disposables.push(b1.geometry, b2.geometry)
  const maroon = lam('#7c2b22')
  // maroon cornices round the roofs
  const cornice = (w: number, d: number, y: number, x: number, z: number) => {
    box(w, 0.6, 0.5, x, y, z - d / 2, maroon)
    box(w, 0.6, 0.5, x, y, z + d / 2, maroon)
    box(0.5, 0.6, d, x - w / 2, y, z, maroon)
    box(0.5, 0.6, d, x + w / 2, y, z, maroon)
  }
  cornice(BL + 0.4, BD + 0.4, 7.4, blx, blz)
  cornice(22.4, BD + 4.4, 10.9, blx, blz + 2)
  box(20, 0.5, 6, blx, 4.8, blz + BD / 2 + 7, lam('#efe6d2'))
  for (const s of [-8.5, -3, 3, 8.5]) box(0.5, 4.8, 0.5, blx + s, 0, blz + BD / 2 + 9.5, lam('#efe6d2'))

  // overhead wires on their masts
  const masts: THREE.Matrix4[] = []
  const arm: THREE.Matrix4[] = []
  for (let x = -560; x <= 600; x += 55) {
    const onPlatform = x > -195 && x < 195
    for (const s of [-1, 1]) {
      const z = onPlatform ? (s > 0 ? plz + PW / 2 - 1 : ilz - IW / 2 + 1) : s * (T + 3.4)
      const y0 = onPlatform ? 1 : 0
      masts.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y0, z), new THREE.Quaternion(), new THREE.Vector3(0.3, 8.2 - y0, 0.3)))
      const reach = Math.abs(z) - T + 1.2
      arm.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 7.4, z - (s * reach) / 2), new THREE.Quaternion(), new THREE.Vector3(0.14, 0.14, reach)))
    }
  }
  const mastMesh = new THREE.InstancedMesh(unit, lam('#5a5f5c'), masts.length + arm.length)
  ;[...masts, ...arm].forEach((m, i) => mastMesh.setMatrixAt(i, m))
  g.add(mastMesh)
  const wires: number[] = []
  for (const z of [-T, T]) for (const y of [6.7, 7.7]) wires.push(-560, y, z, 600, y, z)
  const wg = geo(new THREE.BufferGeometry())
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3))
  const wm = new THREE.LineBasicMaterial({ color: '#2a2a2a', transparent: true, opacity: 0.55 })
  disposables.push(wm)
  g.add(new THREE.LineSegments(wg, wm))

  // the train at the island platform, in world coordinates
  const train = new THREE.Group()
  const coachTex = coachTexture(false),
    locoTex = coachTexture(true),
    coachGlow = coachTexture(false, true),
    locoGlow = coachTexture(true, true)
  const coachMat = patch(new THREE.MeshLambertMaterial({ map: coachTex, emissiveMap: coachGlow, emissive: '#ffffff', emissiveIntensity: 0.95 }), shared, { key: 'coach', clouds: true })
  const locoMat = patch(new THREE.MeshLambertMaterial({ map: locoTex, emissiveMap: locoGlow, emissive: '#ffffff', emissiveIntensity: 0.95 }), shared, { key: 'loco', clouds: true })
  disposables.push(coachTex, locoTex, coachGlow, locoGlow, coachMat, locoMat)
  const n = st.train.length
  const bodies = new THREE.InstancedMesh(unit, coachMat, n - 1)
  const loco = new THREE.InstancedMesh(unit, locoMat, 1)
  const roofs = new THREE.InstancedMesh(unit, lam('#8b8f94'), n)
  const frames = new THREE.InstancedMesh(unit, lam('#26282a'), n)
  const q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0),
    v = new THREE.Vector3(),
    sc = new THREE.Vector3(),
    m4 = new THREE.Matrix4()
  const L = st.sizes.coach - 1.2
  st.train.forEach(([x, z, dx, dz], i) => {
    q.setFromAxisAngle(up, Math.atan2(-dz, dx))
    const len = i === 0 ? L - 4 : L
    ;(i === 0 ? loco : bodies).setMatrixAt(i === 0 ? 0 : i - 1, m4.compose(v.set(x, 1.15, z), q, sc.set(len, 3.05, 3.05)))
    roofs.setMatrixAt(i, m4.compose(v.set(x, 4.2, z), q, sc.set(len - 0.4, 0.35, 2.75)))
    frames.setMatrixAt(i, m4.compose(v.set(x, 0.45, z), q, sc.set(len - 2, 0.75, 2.5)))
  })
  train.add(bodies, loco, roofs, frames)

  return { group: g, train, disposables, lamps: platformLamps }
}
