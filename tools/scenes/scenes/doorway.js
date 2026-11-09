// DOORWAY · the RSVP's closing frame: a carved teak doorway in a night-dark wall, dressed for the wedding —
// a thick rope of marigolds round the arch in orange and yellow bands with crimson roses, a jasmine border
// inside it, mango leaves hanging along the top, strands of marigold and jasmine with little bells in the
// upper corners, brass bells at the crown, an outline of warm bulbs, two tall brass lamps (kuthuvilakku)
// burning at its foot, a rangoli on the polished floor before it, and the soft lights of the hall within.
// The middle of the doorway stays dark for the names. ?o=portrait|landscape
import { THREE, rng, makeNoise, canvasTex, makeRenderer, makeComposer, exportLights } from '../lib/common.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { flameMaterial, haloMaterial, bokehMaterial, jasmineStrand, mangoLeafGeo, leafTexture, scatteredPetals } from '../lib/flora.js'
import { brassMaterial } from '../lib/materials.js'

const lathe = (prof, seg = 64) => new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), seg)
const R_IN = 0.78, // the doorway's inner arch
  SPRING = 1.62 // where the arch springs from the jambs

/** A point on the arch (radius r) at distance-fraction t from bottom left (0) over the top to bottom right (1). */
function archCurve(r, z) {
  const pts = []
  for (let y = 0; y <= SPRING; y += 0.1) pts.push(new THREE.Vector3(-r, y, z))
  for (let k = 1; k < 40; k++) {
    const a = Math.PI - (k / 40) * Math.PI
    pts.push(new THREE.Vector3(Math.cos(a) * r, SPRING + Math.sin(a) * r, z))
  }
  for (let y = SPRING; y >= 0; y -= 0.1) pts.push(new THREE.Vector3(r, y, z))
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal')
}

/** A marigold head as one ruffled ball: petal frills as fine radial noise, deeper colour in the folds. */
function marigoldBall(N, seed) {
  const g = new THREE.IcosahedronGeometry(1, 4)
  const P = g.attributes.position
  const col = new Float32Array(P.count * 3)
  const v = new THREE.Vector3()
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i)
    const frill = N.n3 ? N.n3(v.x * 9 + seed, v.y * 9, v.z * 9) : N.fbm(v.x * 6 + v.z * 3 + seed, v.y * 6 + v.z * 2, 3)
    const ruffle = 0.86 + 0.2 * frill + 0.05 * Math.sin(v.x * 40 + v.y * 37 + v.z * 31)
    v.multiplyScalar(ruffle)
    v.y *= 0.92
    P.setXYZ(i, v.x, v.y, v.z)
    const k = Math.min(1, Math.max(0, (ruffle - 0.84) / 0.24))
    col.set([0.55 + 0.45 * k, 0.5 + 0.5 * k, 0.5 + 0.5 * k], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

/** Rangoli: concentric bands of petals and dots in coloured powder, with a lotus at the heart. */
function rangoliTexture(r) {
  return canvasTex(0, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const c = w / 2
    const ring = (rad, n, draw) => {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2
        ctx.save()
        ctx.translate(c + Math.cos(a) * rad, c + Math.sin(a) * rad)
        ctx.rotate(a + Math.PI / 2)
        draw(k)
        ctx.restore()
      }
    }
    const grain = (fill, alpha = 0.92) => {
      ctx.globalAlpha = alpha
      ctx.fillStyle = fill
      ctx.fill()
      ctx.globalAlpha = 1
    }
    // outer band of petals
    ring(w * 0.42, 24, (k) => {
      ctx.beginPath()
      ctx.ellipse(0, 0, w * 0.03, w * 0.06, 0, 0, Math.PI * 2)
      grain(k % 2 ? '#e8b018' : '#c42a5a')
    })
    ring(w * 0.47, 48, () => {
      ctx.beginPath()
      ctx.arc(0, 0, w * 0.008, 0, Math.PI * 2)
      grain('#f4f0e6')
    })
    ctx.lineWidth = w * 0.012
    ctx.strokeStyle = '#f2ede2'
    ctx.beginPath()
    ctx.arc(c, c, w * 0.36, 0, Math.PI * 2)
    ctx.stroke()
    ring(w * 0.3, 16, (k) => {
      ctx.beginPath()
      ctx.moveTo(0, -w * 0.06)
      ctx.quadraticCurveTo(w * 0.05, 0, 0, w * 0.06)
      ctx.quadraticCurveTo(-w * 0.05, 0, 0, -w * 0.06)
      grain(k % 2 ? '#2f8f4a' : '#e66a1a')
    })
    ctx.strokeStyle = '#f2ede2'
    ctx.beginPath()
    ctx.arc(c, c, w * 0.22, 0, Math.PI * 2)
    ctx.stroke()
    ring(w * 0.15, 8, () => {
      ctx.beginPath()
      ctx.ellipse(0, 0, w * 0.035, w * 0.075, 0, 0, Math.PI * 2)
      grain('#d0204a')
    })
    ctx.beginPath()
    ctx.arc(c, c, w * 0.06, 0, Math.PI * 2)
    grain('#f0c020')
    ctx.beginPath()
    ctx.arc(c, c, w * 0.025, 0, Math.PI * 2)
    grain('#f4f0e6')
    // powder is never crisp: speckle the edges
    const img = ctx.getImageData(0, 0, w, h)
    for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3] > 0) img.data[i + 3] *= 0.75 + r() * 0.25
    ctx.putImageData(img, 0, 0)
  }, { w: 1024, h: 1024 })
}

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const landscape = (q.get('o') || 'portrait') === 'landscape'
  const r = rng(31)
  const N = makeNoise(17)
  const renderer = makeRenderer(W, H, { shadows: true, exposure: +(q.get('exp') || 1.0) })
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x060a08)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.16

  const camera = new THREE.PerspectiveCamera(landscape ? 30 : 37, W / H, 0.05, 60)
  camera.position.set(0, landscape ? 1.4 : 1.32, landscape ? 6.3 : 6.5)
  camera.lookAt(0, landscape ? 1.5 : 1.36, 0)
  camera.updateMatrixWorld()

  /* ---------------- the wall and the carved teak doorway */
  const arch = (rad, close = true) => {
    const s = new THREE.Shape()
    s.moveTo(-rad, 0)
    s.lineTo(-rad, SPRING)
    s.absarc(0, SPRING, rad, Math.PI, 0, true)
    s.lineTo(rad, 0)
    if (close) s.lineTo(-rad, 0)
    return s
  }
  const plaster = canvasTex(0, (ctx, w, h) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = N.fbm(x / 70, y / 70, 4),
          f = N.n2(x / 3, y / 3)
        const k = 0.8 + 0.3 * n + 0.06 * (f - 0.5)
        const i = (y * w + x) * 4
        img.data[i] = 70 * k
        img.data[i + 1] = 52 * k
        img.data[i + 2] = 42 * k
        img.data[i + 3] = 255
      }
    ctx.putImageData(img, 0, 0)
  }, { w: 512, h: 512, repeat: true })
  plaster.repeat.set(4, 4)
  const wallShape = new THREE.Shape()
  wallShape.moveTo(-9, -1)
  wallShape.lineTo(9, -1)
  wallShape.lineTo(9, 7)
  wallShape.lineTo(-9, 7)
  wallShape.lineTo(-9, -1)
  wallShape.holes.push(arch(R_IN + 0.02))
  const wall = new THREE.Mesh(new THREE.ShapeGeometry(wallShape, 48), new THREE.MeshStandardMaterial({ map: plaster, bumpMap: plaster, bumpScale: 0.6, roughness: 0.92 }))
  wall.receiveShadow = wall.castShadow = true
  scene.add(wall)
  // the doorway's frame: teak, carved with a running vine, edged in brass
  const carving = canvasTex(0, (ctx, w, h) => {
    ctx.fillStyle = '#7a7a7a'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#3a3a3a'
    ctx.lineWidth = 6
    for (let y = 0; y < h; y += 64) {
      ctx.beginPath()
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y + 32 + Math.sin(x / 20) * 16)
      ctx.stroke()
      for (let x = 20; x < w; x += 62.8) {
        ctx.beginPath()
        ctx.ellipse(x, y + 16, 10, 5, 0.6, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }, { w: 256, h: 256, srgb: false, repeat: true })
  carving.repeat.set(6, 6)
  const frameShape = arch(R_IN + 0.26)
  frameShape.holes.push(arch(R_IN))
  const teak = new THREE.MeshStandardMaterial({ color: 0x3a2212, roughness: 0.5, bumpMap: carving, bumpScale: 1.2 })
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 64 }), teak)
  frame.castShadow = frame.receiveShadow = true
  scene.add(frame)
  const brass = brassMaterial({ seed: 41, color: 0xd9a54a, roughness: 0.28 })
  for (const rad of [R_IN + 0.005, R_IN + 0.255]) {
    const trim = new THREE.Mesh(new THREE.TubeGeometry(archCurve(rad, 0.185), 260, 0.009, 8), brass)
    scene.add(trim)
  }
  // the hall within: a dark floor running back, warm lights far inside, out of focus
  const inside = new THREE.Group()
  for (let i = 0; i < 16; i++) {
    const p = new THREE.Vector3((r() - 0.5) * 1.3, 0.12 + Math.pow(r(), 1.8) * 0.8, -3 - r() * 4)
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bokehMaterial(r() > 0.3 ? 0xffb35a : 0xffe0b0, 0.1 + r() * 0.12))
    b.position.copy(p)
    b.scale.setScalar(0.12 + r() * 0.16)
    inside.add(b)
  }
  scene.add(inside)
  // the far wall of the hall: a maroon drape, barely lit
  const drape = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({ color: 0x1c0a0e, roughness: 0.9 }))
  drape.position.set(0, 2.5, -7.5)
  scene.add(drape)

  /* ---------------- the floor, polished, with a rangoli before the door (it reflects the lamps, not the studio light the brass uses) */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x0d0907, roughness: 0.38, envMap: pmrem.fromScene(new THREE.Scene()).texture }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  const rangoli = new THREE.Mesh(new THREE.CircleGeometry(0.62, 96), new THREE.MeshStandardMaterial({ map: rangoliTexture(r), transparent: true, roughness: 0.95 }))
  rangoli.rotation.x = -Math.PI / 2
  rangoli.position.set(0, 0.003, 1.05)
  rangoli.receiveShadow = true
  scene.add(rangoli)

  /* ---------------- the marigold rope round the arch: orange and yellow bands, a crimson rose now and then */
  const ball = marigoldBall(N, 3)
  const flowerMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.7, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffa040) })
  const flowers = []
  const ORANGE = [0xf28a10, 0xe8760c, 0xf59a1c],
    YELLOW = [0xf6c21c, 0xf2b414, 0xf8cc30],
    ROSE = 0x8a0a1e
  const rope = (rad, z, size, step, phase) => {
    const c = archCurve(rad, z)
    const L = c.getLength()
    for (let d = phase; d < L; d += step) {
      const t = d / L
      const p = c.getPointAt(t)
      const band = Math.floor(d / (step * 3)) % 2
      const rose = Math.floor(d / step) % 11 === 5
      const pal = band ? YELLOW : ORANGE
      flowers.push({ pos: p.clone().add(new THREE.Vector3((r() - 0.5) * 0.012, (r() - 0.5) * 0.012, (r() - 0.5) * 0.02)), size: size * (rose ? 0.8 : 0.9 + r() * 0.2), color: rose ? ROSE : pal[Math.floor(r() * 3)] })
    }
  }
  rope(R_IN + 0.13, 0.26, 0.05, 0.072, 0)
  rope(R_IN + 0.06, 0.24, 0.042, 0.072, 0.036)
  rope(R_IN + 0.2, 0.22, 0.04, 0.072, 0.02)

  /* ---------------- strands of marigold and jasmine hanging in the upper corners, a bell at each end */
  const bellGeo = lathe([[0, 0.07], [0.008, 0.07], [0.012, 0.064], [0.016, 0.05], [0.02, 0.026], [0.03, 0.006], [0.034, 0], [0.03, -0.004], [0, -0.002]], 32)
  const bells = []
  const strands = [-0.6, -0.48, -0.34, 0.34, 0.48, 0.6]
  strands.forEach((x, i) => {
    const top = SPRING + Math.sqrt(Math.max(0, R_IN * R_IN - x * x)) - 0.02
    const len = 0.42 + ((i * 37) % 10) / 22 + (Math.abs(x) > 0.55 ? 0.25 : 0)
    for (let d = 0.03; d < len; d += 0.052) flowers.push({ pos: new THREE.Vector3(x + Math.sin(d * 7 + i) * 0.006, top - d, 0.2), size: 0.026, color: (Math.floor(d / 0.052) % 4 === 3 ? YELLOW : ORANGE)[i % 3] })
    flowers.push({ pos: new THREE.Vector3(x, top - len - 0.02, 0.2), size: 0.03, color: ROSE })
    bells.push(new THREE.Vector3(x, top - len - 0.1, 0.2))
    // a few jasmine buds between the marigolds
    scene.add(jasmineStrand(new THREE.CatmullRomCurve3([new THREE.Vector3(x + 0.016, top, 0.215), new THREE.Vector3(x + 0.018, top - len * 0.5, 0.22), new THREE.Vector3(x + 0.015, top - len, 0.215)]), { seed: 40 + i, spacing: 0.02, budLen: 0.02, lift: 0 }))
  })

  // all the flowers: one instanced mesh
  const fm = new THREE.InstancedMesh(ball, flowerMat, flowers.length)
  const m4 = new THREE.Matrix4(),
    qq = new THREE.Quaternion(),
    col = new THREE.Color()
  flowers.forEach((f, i) => {
    qq.setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6))
    m4.compose(f.pos, qq, new THREE.Vector3(f.size, f.size, f.size))
    fm.setMatrixAt(i, m4)
    fm.setColorAt(i, col.setHex(f.color, THREE.SRGBColorSpace))
  })
  fm.castShadow = fm.receiveShadow = true
  scene.add(fm)

  // the jasmine border just inside the marigolds
  scene.add(jasmineStrand(archCurve(R_IN - 0.012, 0.21), { seed: 9, spacing: 0.012, budLen: 0.024, open: 0.08, lift: 0.1 }))

  /* ---------------- mango leaves hanging along the crown */
  const leafTex = leafTexture({ base: '#1d4a16', light: '#3d7a26', vein: 'rgba(170,220,120,0.5)', seed: 13 })
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.48, side: THREE.DoubleSide })
  const leafGeo = mangoLeafGeo({ width: 0.2, fold: 0.2, bend: 0.12 })
  for (let k = 0; k <= 22; k++) {
    const a = Math.PI * (0.1 + (0.8 * k) / 22)
    const p = new THREE.Vector3(Math.cos(a) * (R_IN - 0.02), SPRING + Math.sin(a) * (R_IN - 0.02), 0.19)
    const leaf = new THREE.Mesh(leafGeo, leafMat)
    leaf.scale.setScalar(0.17 + r() * 0.03)
    leaf.position.copy(p)
    leaf.rotation.set((r() - 0.5) * 0.4, (r() - 0.5) * 0.8, Math.PI + (r() - 0.5) * 0.3) // hanging tip-down
    leaf.castShadow = true
    scene.add(leaf)
  }

  /* ---------------- brass bells at the crown */
  const bellMat = brassMaterial({ seed: 7, color: 0xe0ac4c, roughness: 0.2 })
  const crown = SPRING + R_IN
  for (const [x, y, s] of [
    [0, crown - 0.16, 1.4],
    [-0.22, crown - 0.2, 1],
    [0.22, crown - 0.2, 1],
  ]) {
    const v = new THREE.Vector3(x, y, 0.21)
    v.s = s
    bells.push(v)
  }
  for (const b of bells) {
    const s = b.s || 0.7
    const bell = new THREE.Mesh(bellGeo, bellMat)
    bell.scale.setScalar(s * 0.9)
    bell.position.copy(b)
    bell.castShadow = true
    scene.add(bell)
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.08 * s, 6), bellMat)
    chain.position.copy(b).add(new THREE.Vector3(0, 0.1 * s, 0))
    scene.add(chain)
  }

  /* ---------------- an outline of warm bulbs round the frame */
  const lights = []
  const bulbGeo = new THREE.SphereGeometry(0.011, 12, 8)
  const outline = archCurve(R_IN + 0.3, 0.2)
  const nb = 64
  for (let i = 0; i <= nb; i++) {
    const p = outline.getPointAt(i / nb)
    const warm = i % 5 === 2 ? 0xffe6c0 : 0xffb24a
    const b = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(warm).multiplyScalar(3) }))
    b.position.copy(p)
    scene.add(b)
    const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(warm, 0.3, 2.4))
    h.position.copy(p).add(new THREE.Vector3(0, 0, 0.01))
    h.scale.setScalar(0.09)
    scene.add(h)
    if (i % 2 === 0) lights.push({ pos: p, radius: 0.03, kind: 'bulb' })
  }
  // and cascades down the wall either side (seen on wide screens)
  for (const side of [-1, 1])
    for (let s = 0; s < 6; s++) {
      const x = side * (1.45 + s * 0.32)
      const len = 1.2 + ((s * 13) % 7) / 6
      for (let y = 2.9; y > 2.9 - len; y -= 0.11) {
        const p = new THREE.Vector3(x, y, 0.03)
        const b = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc060).multiplyScalar(2.6) }))
        b.position.copy(p)
        b.scale.setScalar(0.8)
        scene.add(b)
        const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(0xffb050, 0.22, 2.4))
        h.position.copy(p).add(new THREE.Vector3(0, 0, 0.01))
        h.scale.setScalar(0.07)
        scene.add(h)
        if (r() < 0.3) lights.push({ pos: p, radius: 0.025, kind: 'bulb' })
      }
    }

  /* ---------------- two tall brass lamps burning at the foot of the doorway */
  const lampProf = [[0, 0], [0.16, 0], [0.17, 0.018], [0.15, 0.036], [0.1, 0.05], [0.058, 0.09], [0.04, 0.15], [0.05, 0.19], [0.03, 0.23], [0.024, 0.48], [0.036, 0.5], [0.024, 0.52], [0.021, 0.8], [0.03, 0.82], [0.021, 0.84], [0.02, 0.88], [0.07, 0.9], [0.12, 0.925], [0.135, 0.945], [0.115, 0.95], [0.06, 0.935], [0.02, 0.93], [0.018, 1.0], [0.034, 1.02], [0.018, 1.06], [0.008, 1.1], [0, 1.12]]
  const lampGeo = lathe(lampProf, 96)
  const lampBrass = brassMaterial({ seed: 19, color: 0xd8a248, roughness: 0.22 })
  const flames = []
  const lampX = landscape ? 1.22 : 1.02
  for (const side of [-1, 1]) {
    const base = new THREE.Vector3(side * lampX, 0, 0.62)
    const lamp = new THREE.Mesh(lampGeo, lampBrass)
    lamp.position.copy(base)
    lamp.castShadow = lamp.receiveShadow = true
    scene.add(lamp)
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3
      const p = base.clone().add(new THREE.Vector3(Math.cos(a) * 0.112, 0.962, Math.sin(a) * 0.112))
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.016, 8), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 1 }))
      wick.position.copy(p)
      scene.add(wick)
      flames.push(p.clone().add(new THREE.Vector3(0, 0.006, 0)))
    }
    const light = new THREE.PointLight(0xffa04a, 1.9, 7, 1.6)
    light.position.copy(base).add(new THREE.Vector3(0, 1.04, 0.05))
    light.castShadow = true
    light.shadow.mapSize.set(1024, 1024)
    light.shadow.radius = 6
    light.shadow.bias = -0.002
    scene.add(light)
  }
  flames.forEach((p, i) => {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flameMaterial(i * 1.3 + 0.2))
    f.material.uniforms.intensity.value = 1.15
    f.position.copy(p)
    f.scale.set(0.03, 0.09 + r() * 0.015, 1)
    scene.add(f)
    const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(0xff9a3a, 0.16, 2.6))
    h.position.copy(p).add(new THREE.Vector3(0, 0.03, 0.02))
    h.scale.setScalar(0.24)
    scene.add(h)
    lights.push({ pos: p.clone().add(new THREE.Vector3(0, 0.03, 0)), radius: 0.035, kind: 'flame' })
  })

  // petals strewn on the floor round the rangoli
  const spots = []
  for (let k = 0; k < 40; k++) {
    const a = r() * Math.PI * 2,
      rr = 0.65 + r() * 0.9
    spots.push({ pos: new THREE.Vector3(Math.cos(a) * rr, 0.004, 1.05 + Math.sin(a) * rr * 0.6), size: 0.022 + r() * 0.012, color: k % 3 ? '#9a0c22' : '#ff8a00' })
  }
  scene.add(scatteredPetals(spots, { seed: 21 }))

  // a little night: deep blue from above, the warmth of the lamps below
  scene.add(new THREE.HemisphereLight(0x2a3450, 0x1a0e08, 0.28))
  // moonlight on the outside of the wall only (the hall within is lit by its own lamps)
  const moon = new THREE.DirectionalLight(0x8a9ac8, 0.18)
  moon.position.set(-2, 4, 3)
  moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)
  Object.assign(moon.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.1, far: 20 })
  scene.add(moon)
  const fill = new THREE.PointLight(0xffb070, 0.6, 5, 2)
  fill.position.set(0, 2.9, 1.2)
  scene.add(fill)

  exportLights(camera, W, H, lights)
  const comp = makeComposer(renderer, scene, camera, W, H, {
    bloom: q.get('nobloom') ? null : [+(q.get('bs') || 0.3), 0.42, +(q.get('bt') || 1.7)],
    ao: q.get('noao') ? null : { radius: 0.05, thickness: 0.03, intensity: 0.8 },
    grade: { vignette: 0.38, lift: [0.004, 0.008, 0.006], gain: [1.03, 1.0, 0.96], ca: 0.0006 },
  })
  comp.render()
}
