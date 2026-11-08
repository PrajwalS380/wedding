import { THREE, rng, mergeGeometries } from './common.js'

const clean = (g) => {
  const x = g.index ? g.toNonIndexed() : g
  for (const k of Object.keys(x.attributes)) if (!['position', 'normal'].includes(k)) x.deleteAttribute(k)
  return x
}
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); return clean(g) }

/** Lotus pad: a slightly cupped disc with its characteristic notch and wavy rim. */
export function lotusPadGeo(r, radius = 0.5) {
  const notch = 0.22 + r() * 0.12
  const start = r() * Math.PI * 2
  const g = new THREE.CircleGeometry(radius, 56, start + notch / 2, Math.PI * 2 - notch)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i)
    const d = Math.hypot(x, y) / radius
    const a = Math.atan2(y, x)
    p.setZ(i, 0.06 * radius * d * d + 0.02 * radius * Math.sin(a * 9) * d * d)
  }
  g.rotateX(-Math.PI / 2)
  g.computeVertexNormals()
  return g
}

/** Lotus flower: two rings of cupped, pointed petals around a yellow seed head. */
export function lotusFlower(r, { size = 0.16, open = 0.6 } = {}) {
  const grp = new THREE.Group()
  const petal = new THREE.SphereGeometry(1, 16, 12, 0, Math.PI, 0, Math.PI)
  petal.scale(0.45, 1, 0.22)
  const pp = petal.attributes.position
  for (let i = 0; i < pp.count; i++) { const y = pp.getY(i); pp.setX(i, pp.getX(i) * (1 - 0.65 * Math.max(0, y))); }
  petal.translate(0, 1, 0)
  petal.computeVertexNormals()
  const mat = new THREE.MeshStandardMaterial({ color: 0xf2a0b4, roughness: 0.55, emissive: 0x4a1020, emissiveIntensity: 0.6, side: THREE.DoubleSide })
  const rings = [[8, open * 0.9, 1], [7, open * 0.45, 0.82]]
  rings.forEach(([n, tilt, sc], ri) => {
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(petal, mat)
      m.scale.setScalar(size * 0.5 * sc)
      m.rotation.order = 'YXZ'
      m.rotation.y = (k / n) * Math.PI * 2 + ri * 0.4
      m.rotation.x = tilt + (r() - 0.5) * 0.15
      grp.add(m)
    }
  })
  const seed = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.12, size * 0.09, size * 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xd9b23a, roughness: 0.6 }))
  seed.position.y = size * 0.08
  grp.add(seed)
  return grp
}

/** Wooden country boat (silhouette-grade detail): curved hull with raised prow and stern, thwarts and an oar. */
export function boatGeo() {
  const parts = []
  const L = 6.2, B = 1.05, D = 0.55
  const hull = new THREE.BufferGeometry()
  const pos = []
  const seg = 30
  const section = (t) => {
    const x = (t - 0.5) * L
    const k = Math.pow(Math.abs(2 * t - 1), 2.2)
    const half = (B / 2) * (1 - k)
    const sheer = D + 0.55 * Math.pow(Math.abs(2 * t - 1), 3)
    return { x, half, sheer }
  }
  for (let i = 0; i < seg; i++) {
    const a = section(i / seg), b = section((i + 1) / seg)
    for (const s of [-1, 1]) {
      const p1 = [a.x, 0, 0], p2 = [b.x, 0, 0], p3 = [b.x, b.sheer, s * b.half], p4 = [a.x, a.sheer, s * a.half]
      const q1 = [a.x, 0.12, s * a.half * 0.8], q2 = [b.x, 0.12, s * b.half * 0.8]
      pos.push(...p1, ...p2, ...q2, ...p1, ...q2, ...q1)
      pos.push(...q1, ...q2, ...p3, ...q1, ...p3, ...p4)
    }
  }
  hull.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  hull.computeVertexNormals()
  parts.push(hull)
  for (const t of [0.32, 0.5, 0.68]) { const sx = section(t); parts.push(box(0.12, 0.05, sx.half * 2, sx.x, sx.sheer - 0.18, 0)) }
  const oar = new THREE.CylinderGeometry(0.03, 0.03, 3.2, 5); oar.rotateZ(1.25); oar.rotateY(0.25); oar.translate(0.6, 0.7, 0.3); parts.push(clean(oar))
  const blade = box(0.5, 0.04, 0.18, 2.0, 0.2, 0.62); parts.push(blade)
  return mergeGeometries(parts.map(clean))
}

/** A bird in flight (kite / egret silhouette). flap: -1 (wings down) … 1 (wings up). */
export function birdGeo(flap = 0, span = 1.2) {
  const pos = []
  const body = (a, b, c) => pos.push(...a, ...b, ...c)
  const lift = flap * 0.35 * span
  for (const s of [-1, 1]) {
    const root = [0, 0, s * 0.05], elbow = [0.05, lift * 0.6, s * span * 0.28], tip = [-0.18, lift + 0.05, s * span * 0.5], back = [-0.14, 0, s * 0.06]
    body(root, elbow, back); body(elbow, tip, back)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  const b = new THREE.SphereGeometry(1, 8, 6); b.scale(0.2 * span, 0.04 * span, 0.04 * span)
  const tail = new THREE.ConeGeometry(0.03 * span, 0.16 * span, 4); tail.rotateZ(Math.PI / 2); tail.translate(-0.22 * span, 0, 0)
  const merged = mergeGeometries([clean(g), clean(b), clean(tail)])
  merged.computeVertexNormals()
  return merged
}

/** Dhvajastambha: the temple's tall flag mast with tiered brass bands and a crowning finial. */
export function dhvajaGeo(h = 15) {
  const parts = [box(2.2, 1.2, 2.2, 0, 0, 0), box(1.5, 0.8, 1.5, 0, 1.2, 0)]
  const mast = new THREE.CylinderGeometry(0.16, 0.24, h, 10); mast.translate(0, 2 + h / 2, 0); parts.push(clean(mast))
  for (let i = 0; i < 9; i++) { const d = new THREE.CylinderGeometry(0.34 - i * 0.012, 0.34 - i * 0.012, 0.12, 12); d.translate(0, 2 + h * 0.18 + i * h * 0.075, 0); parts.push(clean(d)) }
  for (let k = 0; k < 3; k++) { const t = new THREE.CylinderGeometry(0.9 - k * 0.22, 1.1 - k * 0.22, 0.22, 12); t.translate(0, 2 + h + k * 0.32, 0); parts.push(clean(t)) }
  const fin = new THREE.ConeGeometry(0.18, 1.0, 8); fin.translate(0, 2 + h + 1.4, 0); parts.push(clean(fin))
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; const bell = new THREE.SphereGeometry(0.12, 6, 5); bell.translate(Math.cos(a) * 0.85, 2 + h - 0.15, Math.sin(a) * 0.85); parts.push(clean(bell)) }
  return mergeGeometries(parts)
}

/** Temple compound wall (prakara) with a parapet of small pavilions. */
export function prakaraGeo(r, len = 90) {
  const parts = [box(len, 4.5, 1.6, 0, 0, 0), box(len + 0.6, 0.4, 2.0, 0, 4.5, 0)]
  for (let x = -len / 2 + 2; x < len / 2 - 1; x += 3.2) {
    if (r() < 0.35) { const d = new THREE.SphereGeometry(0.55, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(x, 5.4, 0); parts.push(clean(d)); parts.push(box(0.9, 0.5, 0.9, x, 4.9, 0)) }
    else parts.push(box(1.0, 0.45, 0.9, x, 4.9, 0))
  }
  return mergeGeometries(parts)
}

/** A small shrine vimana (stepped tower with a domed crown). */
export function vimanaGeo(scale = 1) {
  const parts = [box(9, 6, 9, 0, 0, 0)]
  let y = 6
  for (let i = 0; i < 4; i++) { const w = 8 - i * 1.6; parts.push(box(w, 1.7, w, 0, y, 0)); y += 1.7 }
  const dome = new THREE.SphereGeometry(2.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 1.2, 1); dome.translate(0, y, 0); parts.push(clean(dome))
  const k = new THREE.ConeGeometry(0.3, 1.8, 8); k.translate(0, y + 3.2, 0); parts.push(clean(k))
  const g = mergeGeometries(parts)
  g.scale(scale, scale, scale)
  return g
}
