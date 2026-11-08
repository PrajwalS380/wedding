import { THREE, rng, makeNoise, canvasTex, mergeGeometries, GLSL_NOISE } from './common.js'

/* ---------------------------------------------------------------- generic parametric sheet */
/** Builds a sheet from f(u,v) -> Vector3 with u in [0,1] (length) and v in [-1,1] (across). */
export function sheet(f, nu = 24, nv = 8) {
  const pos = [], uv = [], idx = []
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const u = i / nu, v = (j / nv) * 2 - 1
      const p = f(u, v)
      pos.push(p.x, p.y, p.z)
      uv.push(v * 0.5 + 0.5, u)
    }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/* ---------------------------------------------------------------- petals & marigolds */
export function petalGeo({ ruffle = 0.14, cup = 0.35 } = {}) {
  return sheet((u, v) => {
    const w = 0.42 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.95 + 0.05)), 0.55) * (0.6 + 0.4 * u)
    const x = v * w
    const z = -cup * v * v * w + ruffle * Math.sin(v * 9 + u * 5) * u * u + 0.12 * u * u
    return new THREE.Vector3(x, u, z)
  }, 8, 8)
}

const MARIGOLD_ORANGE = ['#ff7a00', '#ff8a00', '#ff9500', '#f57200', '#ff9f1c', '#e86400']
const MARIGOLD_YELLOW = ['#ffc000', '#ffb300', '#ffcb1f', '#f5a800', '#ffd23a']

/** Base-to-tip shading baked into a petal: deeper at the base where petals crowd, lighter at the frilled edge. */
function shadeAlong(g, { base = 0.5, tip = 1.0, edge = 0.08 } = {}) {
  const uv = g.attributes.uv, n = uv.count, col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const u = uv.getY(i), v = Math.abs(uv.getX(i) * 2 - 1)
    const k = base + (tip - base) * Math.pow(u, 0.7) + edge * v * u
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = Math.min(1.1, k)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

/** A marigold petal: fan-shaped, cupped, its broad tip ruffled and notched. Length 1 along +y. */
export function marigoldPetalGeo(phase = 0) {
  return shadeAlong(sheet((u, v) => {
    // narrow at the base, broad and rounded at the frilled tip
    const w = 0.62 * (0.25 + 0.75 * Math.sqrt(Math.min(1, u * 1.25))) * (1 - 0.35 * Math.pow(Math.max(0, u - 0.82) / 0.18, 2))
    const x = v * w
    const y = u - 0.07 * Math.abs(Math.sin(v * 6 + phase)) * Math.pow(u, 5)
    const z = -0.5 * v * v * w + 0.12 * Math.sin(v * 9 + phase) * Math.pow(u, 2) + 0.03 * Math.sin(v * 17 + phase * 2) * Math.pow(u, 3.5) + 0.1 * u * u
    return new THREE.Vector3(x, y, z)
  }, 12, 18), { base: 0.42, tip: 1.02, edge: 0.1 })
}

/**
 * Marigold heads: hundreds of ruffled petals packed into a pompom — small and upright at the crown, larger and
 * splayed towards the rim — each shaded deeper at its base. Returns one InstancedMesh for all the flowers.
 */
export function marigolds(flowers, { petals = 260, seed = 3, size = 1, envMap = null } = {}) {
  const r = rng(seed)
  const n = Math.max(petals * 2, 640)
  const geos = [marigoldPetalGeo(0), marigoldPetalGeo(1.7), marigoldPetalGeo(3.1)]
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.58, metalness: 0, side: THREE.DoubleSide, envMap, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffb04a), emissive: 0x3a1000, emissiveIntensity: 0.1 })
  const group = new THREE.Group()
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color()
  geos.forEach((geo, gi) => {
    const mesh = new THREE.InstancedMesh(geo, mat, Math.ceil((flowers.length * n) / 3) + 3)
    let k = 0
    for (const f of flowers) {
      const pal = f.yellow ? MARIGOLD_YELLOW : MARIGOLD_ORANGE
      const R = (f.size || 1) * size
      for (let i = gi; i < n; i += 3) {
        const t = i / n
        const phi = Math.acos(1 - t * 1.72)
        const theta = i * 2.39996 + r() * 0.35
        const nrm = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
        if (f.up) nrm.applyQuaternion(f.up)
        p.copy(f.pos).addScaledVector(nrm, R * (0.5 + 0.06 * r()))
        // petals overlap like scales: face outward, pointing down the dome from the crown, tips lifted
        const around = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta))
        const down = new THREE.Vector3(Math.cos(phi) * Math.cos(theta), -Math.sin(phi), Math.cos(phi) * Math.sin(theta))
        if (f.up) { around.applyQuaternion(f.up); down.applyQuaternion(f.up) }
        const tilt = 0.35 + r() * 0.45 + (phi < 0.5 ? 0.4 : 0) // crown petals stand up more
        const yAxis = down.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(nrm, Math.sin(tilt)).addScaledVector(around, (r() - 0.5) * 0.5).normalize()
        const zAxis = new THREE.Vector3().crossVectors(around, yAxis).normalize()
        const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize()
        q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis))
        const sc = R * (0.34 + 0.12 * Math.min(1, phi / 1.3) + r() * 0.06)
        s.set(sc * (1.0 + r() * 0.3), sc, sc * (0.8 + r() * 0.5))
        m.compose(p, q, s)
        mesh.setMatrixAt(k, m)
        c.set(pal[Math.floor(r() * pal.length)])
        c.multiplyScalar(0.82 + 0.25 * Math.min(1, phi / 1.4) + r() * 0.08)
        mesh.setColorAt(k, c)
        k++
      }
    }
    mesh.count = k
    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor.needsUpdate = true
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  })
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x8a3a06, roughness: 0.9 })
  for (const f of flowers) {
    const R = (f.size || 1) * size
    const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.5, 24, 16), f.yellow ? new THREE.MeshStandardMaterial({ color: 0x9a6a08, roughness: 0.9 }) : coreMat)
    core.position.copy(f.pos); core.scale.y = 0.9; group.add(core)
  }
  return group
}

/** Loose petals scattered on a surface (rose petals round and curled, marigold petals ruffled). */
export function scatteredPetals(spots, { seed = 9, envMap = null } = {}) {
  const r = rng(seed)
  const geo = shadeAlong(petalGeo({ ruffle: 0.06, cup: 0.5 }), { base: 0.62, tip: 1.0, edge: 0.06 })
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide, envMap, sheen: 0.5, sheenColor: new THREE.Color(0xffd0c0), sheenRoughness: 0.45 })
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length)
  const m = new THREE.Matrix4(), c = new THREE.Color()
  spots.forEach((sp, i) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + (r() - 0.5) * 0.5, r() * Math.PI * 2, (r() - 0.5) * 0.5, 'YXZ'))
    m.compose(sp.pos, q, new THREE.Vector3(sp.size, sp.size * (1 + r() * 0.3), sp.size))
    mesh.setMatrixAt(i, m)
    c.set(sp.color)
    c.multiplyScalar(0.8 + r() * 0.35)
    mesh.setColorAt(i, c)
  })
  mesh.castShadow = true
  return mesh
}

/* ---------------------------------------------------------------- jasmine */

/** A jasmine bud, length 1 along +y: green calyx with five sepals, a slim neck, a plump white bud twisted to a point. */
export function jasmineBudGeo() {
  const prof = [[0, 0], [0.05, 0.0], [0.065, 0.06], [0.085, 0.14], [0.06, 0.2], [0.07, 0.26], [0.11, 0.36], [0.16, 0.48], [0.19, 0.6], [0.19, 0.7], [0.16, 0.8], [0.11, 0.89], [0.05, 0.96], [0, 1]]
  const g = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 28)
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const th = Math.atan2(z, x)
    const twist = 1 + 0.08 * Math.sin(5 * th + y * 8) * Math.max(0, Math.min(1, (y - 0.3) / 0.4))
    pos.setX(i, x * twist); pos.setZ(i, z * twist)
    const green = y < 0.2 ? 1 : y < 0.3 ? 1 - (y - 0.2) / 0.1 : 0
    const tip = Math.max(0, (y - 0.86) / 0.14)
    col[i * 3] = 0.42 * green + (1 - green) * (0.98 - 0.02 * tip)
    col[i * 3 + 1] = 0.58 * green + (1 - green) * (0.97 - 0.1 * tip)
    col[i * 3 + 2] = 0.26 * green + (1 - green) * (0.92 - 0.06 * tip)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const parts = [g.toNonIndexed()]
  for (let k = 0; k < 5; k++) { // sepals
    const sp = new THREE.ConeGeometry(0.018, 0.16, 4)
    sp.translate(0, 0.08, 0); sp.rotateZ(0.6); sp.rotateY((k / 5) * Math.PI * 2); sp.translate(0, 0.1, 0)
    const sc = new Float32Array(sp.toNonIndexed().attributes.position.count * 3).fill(0)
    const spn = sp.toNonIndexed()
    for (let i = 0; i < sc.length; i += 3) { sc[i] = 0.36; sc[i + 1] = 0.52; sc[i + 2] = 0.22 }
    spn.setAttribute('color', new THREE.BufferAttribute(sc, 3))
    spn.deleteAttribute('uv'); parts.push(spn)
  }
  parts[0].deleteAttribute('uv')
  const merged = mergeGeometries(parts)
  merged.computeVertexNormals()
  return merged
}

/** An open jasmine flower: six white petals round a slender tube. Radius ≈ 1, facing +y. */
export function jasmineFlowerGeo() {
  const parts = []
  for (let k = 0; k < 6; k++) {
    const pg = sheet((u, v) => {
      const w = 0.32 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1)), 0.7)
      return new THREE.Vector3(v * w, u, 0.12 * u * u - 0.08 * v * v * w)
    }, 8, 6)
    pg.rotateX(-Math.PI / 2 + 0.25); pg.rotateY((k / 6) * Math.PI * 2)
    pg.deleteAttribute('uv'); parts.push(pg.toNonIndexed())
  }
  const tube = new THREE.CylinderGeometry(0.05, 0.035, 0.7, 8); tube.translate(0, -0.35, 0); tube.deleteAttribute('uv'); parts.push(tube.toNonIndexed())
  const g = mergeGeometries(parts)
  const col = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < col.length; i += 3) { const y = g.attributes.position.getY(i / 3); const c = y < -0.05 ? [0.75, 0.82, 0.55] : [0.99, 0.98, 0.95]; col.set(c, i) }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

/**
 * A string of jasmine laid along `path` (a Curve3): buds tied in pairs on a thread, pointing out to either side
 * and a little forward, with an occasional flower already open. Returns a Group.
 */
export function jasmineStrand(path, { seed = 5, spacing = 0.0044, budLen = 0.019, open = 0.05, lift = 0.35 } = {}) {
  const r = rng(seed)
  const group = new THREE.Group()
  const len = path.getLength()
  const n = Math.floor(len / spacing)
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, sheen: 0.8, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffffff), emissive: 0x2a2a24, emissiveIntensity: 0.25 })
  const buds = new THREE.InstancedMesh(jasmineBudGeo(), mat, n * 2)
  const flowers = new THREE.InstancedMesh(jasmineFlowerGeo(), mat, Math.ceil(n * 2 * open) + 2)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color()
  const up = new THREE.Vector3(0, 1, 0)
  let nb = 0, nf = 0
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const p = path.getPointAt(t), tan = path.getTangentAt(t)
    const side = new THREE.Vector3().crossVectors(tan, up).normalize()
    for (const s of [-1, 1]) {
      const roll = (r() - 0.5) * 1.6 // buds turn about the thread: some up, some down
      const dir = side.clone().multiplyScalar(s * (0.7 + r() * 0.35) * Math.cos(roll)).addScaledVector(tan, 0.3 + (r() - 0.5) * 0.45).addScaledVector(up, lift + Math.sin(roll) * 0.5).normalize()
      const L = budLen * (0.85 + r() * 0.3)
      const base = p.clone().addScaledVector(side, s * 0.0015).addScaledVector(up, 0.001)
      if (r() < open) {
        q.setFromUnitVectors(up, dir.clone().lerp(up, 0.6).normalize())
        m.compose(base.clone().addScaledVector(dir, L * 0.6), q, new THREE.Vector3(L * 0.55, L * 0.55, L * 0.55))
        flowers.setMatrixAt(nf, m); c.setRGB(1, 1, 1); flowers.setColorAt(nf++, c)
      } else {
        q.setFromUnitVectors(up, dir)
        m.compose(base, q, new THREE.Vector3(L * (0.9 + r() * 0.2), L, L * (0.9 + r() * 0.2)))
        buds.setMatrixAt(nb, m)
        c.setRGB(0.95 + r() * 0.05, 0.94 + r() * 0.06, 0.9 + r() * 0.08)
        buds.setColorAt(nb++, c)
      }
    }
  }
  buds.count = nb; flowers.count = nf
  for (const im of [buds, flowers]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; group.add(im) }
  const thread = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(40, n * 2), 0.0007, 5), new THREE.MeshStandardMaterial({ color: 0x8a9a5a, roughness: 0.9 }))
  thread.castShadow = true
  group.add(thread)
  return group
}

/* ---------------------------------------------------------------- rice & powders */

/** A grain of rice ~6 mm long along +z: tapered at both ends, one side a little flatter. */
export function riceGeo() {
  const prof = []
  for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(0.21 * Math.pow(Math.sin(Math.PI * t), 0.62) + 0.002, t - 0.5)) }
  const g = new THREE.LatheGeometry(prof, 10)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setX(i, x * (x > 0 ? 0.82 : 1)) }
  g.rotateX(Math.PI / 2)
  g.scale(0.0062, 0.0062, 0.0062)
  g.computeVertexNormals()
  return g
}

/** Material for rice: slightly translucent-looking (soft sheen, faint glow). */
export function riceMaterial() {
  return new THREE.MeshPhysicalMaterial({ roughness: 0.42, sheen: 0.4, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.5, emissive: 0x1a1406, emissiveIntensity: 0.25 })
}

/**
 * A heaped mound of powder (kumkum, haldi): a lumpy dome with a soft peak, grains loose on its surface and a
 * little spilled round its foot. Returns a Group; place it at the bottom of the bowl.
 */
export function powderMound({ radius = 0.022, height = 0.012, color = '#9a0a18', seed = 3, spill = 0.004 } = {}) {
  const r = rng(seed)
  const N = makeNoise(seed + 9)
  const g = new THREE.SphereGeometry(radius, 72, 36, 0, Math.PI * 2, 0, Math.PI / 2)
  const pos = g.attributes.position
  const peak = new THREE.Vector2((r() - 0.5) * radius * 0.4, (r() - 0.5) * radius * 0.4)
  const cols = new Float32Array(pos.count * 3), base = new THREE.Color(color)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i)
    const d = Math.hypot(x - peak.x, z - peak.y) / radius
    const h = height * Math.pow(Math.max(0, 1 - d * 0.9), 1.3) * (y / radius > 0.001 ? 1 : 0)
    const lump = (N.fbm(x * 900, z * 900, 3) - 0.5) * 0.0016 + (N.n2(x * 4000, z * 4000) - 0.5) * 0.0005
    pos.setY(i, Math.max(0, h + (h > 0 ? lump : 0)))
    const k = 0.85 + 0.25 * N.fbm(x * 600, z * 600, 2)
    cols[i * 3] = base.r * k; cols[i * 3 + 1] = base.g * k; cols[i * 3 + 2] = base.b * k
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3))
  g.computeVertexNormals()
  const group = new THREE.Group()
  const mound = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))
  mound.receiveShadow = true; mound.castShadow = true
  group.add(mound)
  const grain = new THREE.IcosahedronGeometry(1, 0)
  const grains = new THREE.InstancedMesh(grain, new THREE.MeshStandardMaterial({ roughness: 0.95 }), 260)
  const m = new THREE.Matrix4(), c = new THREE.Color()
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2
    const onTop = i < 170
    const rr = onTop ? Math.sqrt(r()) * radius * 0.95 : radius * (0.95 + r() * 0.5) + r() * spill
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr
    const d = Math.hypot(x - peak.x, z - peak.y) / radius
    const y = onTop ? height * Math.pow(Math.max(0, 1 - d * 0.9), 1.3) : 0
    const sz = 0.00018 + r() * 0.0003
    m.compose(new THREE.Vector3(x, y + sz * 0.5, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(sz, sz, sz))
    grains.setMatrixAt(i, m)
    c.copy(base).multiplyScalar(1.0 + r() * 0.35); grains.setColorAt(i, c)
  }
  grains.instanceColor.needsUpdate = true
  group.add(grains)
  return group
}

/* ---------------------------------------------------------------- leaves */
/** Leaf texture: base colour gradient, midrib, lateral veins, slight mottling. */
export function leafTexture({ base = '#2f5d24', light = '#5d8f3a', vein = 'rgba(200,230,150,0.55)', lateral = 14, edgeBrown = 0, seed = 5, w = 256, h = 1024, palmate = false } = {}) {
  const N = makeNoise(seed)
  return canvasTex(0, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, W, 0)
    g.addColorStop(0, base); g.addColorStop(0.5, light); g.addColorStop(1, base)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    const img = ctx.getImageData(0, 0, W, H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = N.fbm(x / 40, y / 40) - 0.5
      const i = (y * W + x) * 4
      for (let k = 0; k < 3; k++) img.data[i + k] = Math.max(0, Math.min(255, img.data[i + k] * (1 + n * 0.35)))
      const ex = Math.abs(x / W - 0.5) * 2
      if (edgeBrown && ex > 0.88) { img.data[i] += 40 * edgeBrown; img.data[i + 1] -= 10 * edgeBrown }
    }
    ctx.putImageData(img, 0, 0)
    ctx.strokeStyle = vein
    ctx.lineWidth = W * 0.022
    ctx.beginPath(); ctx.moveTo(W / 2, H); ctx.lineTo(W / 2, 0); ctx.stroke()
    ctx.lineWidth = W * 0.006
    if (palmate) {
      for (const s of [-1, 1]) for (const k of [0.18, 0.32]) {
        ctx.beginPath(); ctx.moveTo(W / 2, H * 0.98)
        ctx.bezierCurveTo(W / 2 + s * W * k * 2.2, H * 0.75, W / 2 + s * W * k * 1.6, H * 0.35, W / 2 + s * W * 0.04, H * 0.05)
        ctx.stroke()
      }
    }
    for (let i = 1; i < lateral; i++) {
      const y = H * (i / lateral)
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(W / 2, y)
        ctx.quadraticCurveTo(W / 2 + s * W * 0.25, y - H * 0.04, W / 2 + s * W * 0.48, y - H * 0.09)
        ctx.stroke()
      }
    }
  }, { w, h })
}

/** Mango leaf: lanceolate, folded along the midrib, gently arched. Length 1 along +y. */
export function mangoLeafGeo({ width = 0.21, fold = 0.18, bend = 0.18, twist = 0 } = {}) {
  return sheet((u, v) => {
    const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.98 + 0.02)), 0.75) * (1.05 - 0.35 * u) * (u < 0.06 ? u / 0.06 * 0.6 + 0.4 : 1)
    let x = v * w
    let z = -fold * Math.abs(v) * w + bend * u * u + 0.012 * Math.sin(v * 3 + u * 9)
    const a = twist * u
    const xr = x * Math.cos(a) - z * Math.sin(a), zr = x * Math.sin(a) + z * Math.cos(a)
    return new THREE.Vector3(xr, u, zr)
  }, 28, 8)
}

/** Betel leaf: heart-shaped with a pointed tip and lobed base. Length 1 along +y. */
export function betelLeafGeo({ cup = 0.03 } = {}) {
  return sheet((u, v) => {
    const uu = u * 1.12 - 0.12 // the two basal lobes reach below the stalk
    let w
    if (uu < 0) w = 0.36 * Math.sqrt(Math.max(0, 1 - Math.pow(uu / 0.12, 2)))
    else w = 0.47 * Math.pow(1 - uu, 0.9) * Math.sqrt(0.55 + 1.5 * uu)
    w = Math.max(w, 0.003)
    const notch = uu < 0 ? 0.08 * Math.exp(-v * v * 30) * (1 + uu / 0.12) : 0
    const x = v * w
    const z = cup * v * v * w * 2 - 0.012 * Math.sin(u * Math.PI) + 0.006 * Math.sin(v * 5 + u * 7)
    return new THREE.Vector3(x, uu + notch, z)
  }, 30, 14)
}

/** Banana leaf: long blade with midrib and splits (tears) along the veins. Length 1 along +y. */
export function bananaLeafGeo(r, { width = 0.2, droop = 0.35, splits = 9 } = {}) {
  const parts = []
  for (const side of [-1, 1]) {
    // split each half-blade into strips separated by tears
    const cuts = [0]
    for (let i = 0; i < splits; i++) cuts.push(0.12 + r() * 0.86)
    cuts.push(1)
    cuts.sort((a, b) => a - b)
    for (let s = 0; s < cuts.length - 1; s++) {
      const u0 = cuts[s], u1 = cuts[s + 1]
      if (u1 - u0 < 0.02) continue
      const gap = 0.004 + r() * 0.01
      parts.push(sheet((t, v) => {
        const u = u0 + (u1 - u0 - gap) * t
        const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.96 + 0.04)), 0.35)
        const across = (v * 0.5 + 0.5) // 0 at midrib, 1 at edge
        const x = side * (0.006 + across * w)
        const y = u - across * w * 0.35 // veins slant toward the tip
        const z = -droop * u * u - 0.05 * across * across + 0.01 * Math.sin(u * 40 + across * 3) * across
        return new THREE.Vector3(x, y, z)
      }, 6, 4))
    }
  }
  const midrib = new THREE.CylinderGeometry(0.004, 0.009, 1, 6, 12, false)
  midrib.translate(0, 0.5, 0)
  const pos = midrib.attributes.position
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setZ(i, pos.getZ(i) - droop * y * y) }
  midrib.computeVertexNormals()
  parts.push(midrib.toNonIndexed ? midrib : midrib)
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))
}

/* ---------------------------------------------------------------- flames */
export function flameMaterial(seed = 0) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { seed: { value: seed }, intensity: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv;
      vec4 mv = modelViewMatrix * vec4(0.,0.,0.,1.);
      vec2 scale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
      mv.xy += (uv - vec2(0.5,0.0)) * scale; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform float seed, intensity; varying vec2 vUv; ${GLSL_NOISE}
      void main(){
        float y = vUv.y; float x = (vUv.x-0.5)*2.0;
        x += (sin(y*5.0+seed*3.0)*0.06 + (vnoise(vec2(seed*7.0, y*3.0))-0.5)*0.12) * y*y;
        float w = 0.55*pow(max(y,0.0),0.42)*pow(max(1.0-y,0.0),0.85)*1.9;
        float d = abs(x)/max(w,1e-3);
        float body = smoothstep(1.0, 0.55, d) * smoothstep(0.0, 0.06, y);
        float core = smoothstep(0.75, 0.0, d) * smoothstep(0.02,0.18,y) * smoothstep(0.75,0.25,y);
        float blue = smoothstep(0.9,0.2,d) * smoothstep(0.22,0.02,y);
        vec3 col = vec3(1.0,0.42,0.06)*body*1.6 + vec3(1.0,0.78,0.38)*core*5.0 + vec3(1.0,0.95,0.85)*pow(core,2.5)*6.0 + vec3(0.25,0.35,1.0)*blue*0.9;
        float glow = exp(-length(vec2(x*0.9, (y-0.35)*1.6))*3.2)*0.35;
        col += vec3(1.0,0.5,0.15)*glow;
        gl_FragColor = vec4(col*intensity, 1.0);
      }`,
  })
}

/** Soft additive halo sprite (glow around a light). */
export function haloMaterial(color = 0xffa040, strength = 1, falloff = 2.2) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color(color) }, strength: { value: strength }, falloff: { value: falloff } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); vec2 sc=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)); mv.xy+=(uv-.5)*sc; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 color; uniform float strength, falloff; varying vec2 vUv; void main(){ float d=length(vUv-.5)*2.; float a=pow(max(1.-d,0.),falloff); gl_FragColor=vec4(color*a*strength,1.); }`,
  })
}

/** Bokeh disc sprite (out-of-focus light): flat disc with soft edge and a slightly brighter rim. */
export function bokehMaterial(color = 0xffb060, strength = 1) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color(color) }, strength: { value: strength } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); vec2 sc=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)); mv.xy+=(uv-.5)*sc; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 color; uniform float strength; varying vec2 vUv;
      void main(){ vec2 p=(vUv-.5)*2.; float ang=atan(p.y,p.x); float r=length(p)*(1.0+0.035*cos(ang*7.0));
        float disc=smoothstep(1.0,0.86,r); float rim=smoothstep(0.62,0.96,r)*disc*0.5; float inner=0.32+0.18*(1.0-r);
        gl_FragColor=vec4(color*(disc*inner+rim)*strength,1.); }`,
  })
}

/** Curling incense smoke on a camera-facing ribbon: thin at the stick, widening and fading as it rises. */
export function smokeMaterial(seed = 0, strength = 1) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { seed: { value: seed }, strength: { value: strength }, tint: { value: new THREE.Color(1.0, 0.94, 0.86) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); vec2 sc=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)); mv.xy+=(uv-vec2(0.5,0.0))*sc; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `uniform float seed, strength; uniform vec3 tint; varying vec2 vUv; ${GLSL_NOISE}
      void main(){
        float y=vUv.y; float x=(vUv.x-0.5)*2.0;
        float sway = sin(y*7.0+seed)*0.18*y + (fbm2(vec2(y*3.0+seed, seed))-0.5)*0.9*y*y;
        float w = 0.025 + 0.55*pow(y,1.4);
        float d = abs(x - sway)/w;
        float body = exp(-d*d*2.2);
        float tex = fbm2(vec2(x*3.0+seed, y*9.0 - seed*2.0));
        float wisps = smoothstep(0.35, 0.8, tex*(1.0+y));
        float a = body * mix(1.0, wisps, smoothstep(0.08, 0.5, y)) * smoothstep(0.0, 0.03, y) * (1.0 - smoothstep(0.55, 1.0, y));
        gl_FragColor = vec4(tint*3.2, min(a*0.55*strength, 0.85));
      }`,
  })
}
