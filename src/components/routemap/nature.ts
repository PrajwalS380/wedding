/**
 * Trees and water: neem with clustered crowns, coconut palms with curved trunks and drooping fronds,
 * gulmohar in flame-red flower (all illustrative, placed by tools/routemap/build.py); the lake as moving water
 * that mirrors the evening sky, with rafts of water hyacinth along its banks.
 */
import * as THREE from 'three'
import { lump, mergeColored, pointInPolygon, rng, type XZ } from './geo'
import { patch, type Shared } from './shaders'

const leaf = (base: [number, number, number], top: [number, number, number]) => (p: THREE.Vector3, n: THREE.Vector3, i: number) => {
  const k = 0.62 + 0.42 * (n.y * 0.5 + 0.5)
  const j = Math.abs(Math.sin(i * 12.9898 + p.x * 3.1) * 43758.5453) % 1
  const t = Math.min(1, Math.max(0, n.y * 0.6 + 0.2 + j * 0.25))
  return base.map((b, c) => (b + (top[c] - b) * t) * k) as [number, number, number]
}

function trunk(h: number, r0: number, r1: number, lean: [number, number] = [0, 0]) {
  const g = new THREE.CylinderGeometry(r1, r0, h, 6, 2)
  g.translate(0, h / 2, 0)
  const P = g.attributes.position
  for (let i = 0; i < P.count; i++) {
    const t = P.getY(i) / h
    P.setXYZ(i, P.getX(i) + lean[0] * t * t, P.getY(i), P.getZ(i) + lean[1] * t * t)
  }
  g.computeVertexNormals()
  return g
}

function neem() {
  const parts: Parameters<typeof mergeColored>[0] = []
  const crown: [number, number, number, number][] = [
    [0, 6.6, 0, 3.1],
    [2.3, 5.8, 0.9, 2.3],
    [-2.1, 5.9, -0.9, 2.4],
    [0.7, 5.4, -2.3, 2.2],
    [-0.8, 5.6, 2.3, 2.2],
    [0.2, 8.2, 0.3, 2.1],
  ]
  crown.forEach(([x, y, z, r], k) => {
    const g = lump(r, 0, k + 1)
    g.translate(x, y, z)
    parts.push([g, leaf([0.24, 0.38, 0.15], [0.47, 0.58, 0.24])])
  })
  parts.push([trunk(5, 0.42, 0.26, [0.3, 0]), [0.36, 0.28, 0.2]])
  const b = trunk(2.6, 0.18, 0.1, [1.4, 0.4])
  b.translate(0, 3.6, 0)
  parts.push([b, [0.36, 0.28, 0.2]])
  return mergeColored(parts)
}

function palm() {
  const parts: Parameters<typeof mergeColored>[0] = []
  const H = 10.5,
    lean: [number, number] = [1.8, 0.4]
  const t = trunk(H, 0.3, 0.22, lean)
  parts.push([t, (p) => (Math.floor(p.y * 2.2) % 2 ? [0.5, 0.41, 0.3] : [0.43, 0.35, 0.26])])
  const top = new THREE.Vector3(lean[0], H, lean[1])
  const r = rng(5)
  const N = 10
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2 + r() * 0.4
    const L = 5 + r() * 1.2,
      droop = 2.6 + r() * 1.4
    const dry = k === 3 || k === 8
    const pos: number[] = [],
      idx: number[] = []
    const S = 6
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)),
      side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a))
    for (let i = 0; i <= S; i++) {
      const u = i / S
      const c = top.clone().addScaledVector(dir, u * L * 0.92)
      c.y += 1.1 * u - droop * u * u - (dry ? 1.5 * u : 0)
      const w = 1.35 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.05)), 0.7)
      const keel = 0.28 * w
      pos.push(...c.clone().addScaledVector(side, w / 2).setY(c.y - keel).toArray(), ...c.toArray(), ...c.clone().addScaledVector(side, -w / 2).setY(c.y - keel).toArray())
      if (i < S) {
        const o = i * 3
        idx.push(o, o + 3, o + 1, o + 1, o + 3, o + 4, o + 1, o + 4, o + 2, o + 2, o + 4, o + 5)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    parts.push([g, dry ? [0.56, 0.46, 0.27] : (p) => (p.y > H - 0.4 ? [0.36, 0.5, 0.18] : [0.3, 0.42, 0.16])])
  }
  const nuts = lump(0.7, 0, 9)
  nuts.translate(top.x, H - 0.5, top.z)
  parts.push([nuts, [0.42, 0.36, 0.16]])
  return mergeColored(parts)
}

function gulmohar() {
  const parts: Parameters<typeof mergeColored>[0] = []
  const flame = (p: THREE.Vector3, n: THREE.Vector3, i: number): [number, number, number] => {
    const h = Math.abs(Math.sin(i * 7.13 + p.x * 1.7 + p.z * 2.3) * 43758.5453) % 1
    const k = 0.66 + 0.4 * (n.y * 0.5 + 0.5)
    const c: [number, number, number] = h < 0.6 ? (h < 0.3 ? [0.86, 0.26, 0.09] : [0.95, 0.44, 0.12]) : [0.33, 0.46, 0.18]
    return c.map((v) => v * k) as [number, number, number]
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    const g = lump(2.7, 0, 20 + k, 0.55)
    g.translate(Math.cos(a) * 3, 6.3 + (k % 2) * 0.5, Math.sin(a) * 3)
    parts.push([g, flame])
  }
  const c = lump(3, 0, 31, 0.6)
  c.translate(0, 7.2, 0)
  parts.push([c, flame])
  parts.push([trunk(5, 0.45, 0.3), [0.38, 0.3, 0.24]])
  for (let k = 0; k < 3; k++) {
    const b = trunk(3, 0.2, 0.12, [Math.cos(k * 2.1) * 2.2, Math.sin(k * 2.1) * 2.2])
    b.translate(0, 4, 0)
    parts.push([b, [0.38, 0.3, 0.24]])
  }
  return mergeColored(parts)
}

export function buildTrees(view: DataView, at: number, shared: Shared) {
  const nT = view.getUint32(4, true)
  const geos = [neem(), palm(), gulmohar()]
  const mat = patch(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), shared, { key: 'tree', clouds: true })
  const meshes = geos.map((g) => new THREE.InstancedMesh(g, mat, nT))
  const counts = [0, 0, 0]
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    s = new THREE.Vector3(),
    v = new THREE.Vector3(),
    col = new THREE.Color()
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0, o = at; i < nT; i++, o += 6) {
    const x = view.getInt16(o, true) / 10,
      z = view.getInt16(o + 2, true) / 10
    const kind = Math.min(2, view.getUint8(o + 4)),
      size = view.getUint8(o + 5) / 100
    q.setFromAxisAngle(up, (i * 2.399) % (Math.PI * 2))
    m4.compose(v.set(x, 0, z), q, s.set(size, size * (0.9 + ((i * 17) % 20) / 100), size))
    const tint = 0.86 + ((i * 37) % 28) / 100
    const m = meshes[kind]
    m.setMatrixAt(counts[kind], m4)
    m.setColorAt(counts[kind]++, col.setRGB(tint, tint * 1.02, tint * 0.97))
  }
  meshes.forEach((m, k) => (m.count = counts[k]))
  const group = new THREE.Group()
  group.add(...meshes)
  return { group, disposables: [...geos, mat] }
}

export function buildLakes(lakes: XZ[][], shared: Shared, env: THREE.Texture, normal: THREE.Texture) {
  const group = new THREE.Group()
  const disposables: { dispose: () => void }[] = []
  normal.repeat.set(1 / 55, 1 / 55)
  const water = patch(
    new THREE.MeshStandardMaterial({
      color: '#1a3038',
      roughness: 0.1,
      metalness: 0,
      envMap: env,
      envMapIntensity: 1.15,
      normalMap: normal,
      normalScale: new THREE.Vector2(0.32, 0.32),
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
    shared,
    { key: 'lake', clouds: true, edge: true, edgeTint: 'vec3(.86, .8, .69)', color: 'diffuseColor.rgb *= .85 + .3 * rmNoise(vWorld.xz * .004);' },
  )
  disposables.push(water)
  const hyacinthGeo = lump(1, 0, 3, 0.18)
  const hyacinthMat = patch(new THREE.MeshLambertMaterial({ color: '#4d6e2c' }), shared, { key: 'hyacinth', clouds: true, edge: true, edgeTint: 'vec3(.86, .8, .69)', color: 'diffuseColor.rgb *= .8 + .4 * rmNoise(vWorld.xz * .7);' })
  disposables.push(hyacinthGeo, hyacinthMat)
  const r = rng(13)
  for (const lake of lakes) {
    const shape = new THREE.Shape(lake.map(([x, z]) => new THREE.Vector2(x, -z)))
    const g = new THREE.ShapeGeometry(shape)
    g.rotateX(-Math.PI / 2)
    disposables.push(g)
    const m = new THREE.Mesh(g, water)
    m.position.y = 0.4
    m.renderOrder = 1
    group.add(m)
    // water hyacinth gathers in the shallows along the banks
    const spots: THREE.Matrix4[] = []
    for (let i = 0; i < lake.length; i++) {
      const [ax, az] = lake[i],
        [bx, bz] = lake[(i + 1) % lake.length]
      const L = Math.hypot(bx - ax, bz - az)
      for (let d = 0; d < L; d += 16) {
        if (r() > 0.55) continue
        const t = d / L
        let px = ax + (bx - ax) * t,
          pz = az + (bz - az) * t
        const nx = -(bz - az) / L,
          nz = (bx - ax) / L
        const inset = 5 + r() * 14
        const side = pointInPolygon(px + nx * inset, pz + nz * inset, lake) ? 1 : -1
        px += nx * inset * side
        pz += nz * inset * side
        if (!pointInPolygon(px, pz, lake)) continue
        const sc = 3 + r() * 7
        spots.push(new THREE.Matrix4().compose(new THREE.Vector3(px, 0.55, pz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), new THREE.Vector3(sc * (1 + r()), sc, sc)))
      }
    }
    const h = new THREE.InstancedMesh(hyacinthGeo, hyacinthMat, Math.max(1, spots.length))
    spots.forEach((m4, i) => h.setMatrixAt(i, m4))
    h.count = spots.length
    group.add(h)
  }
  return { group, disposables, water: normal }
}
