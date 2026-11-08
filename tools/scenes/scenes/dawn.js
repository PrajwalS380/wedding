// DAWN · flooded paddy fields before sunrise (interlude, Monday).
// Pink-gold pre-dawn sky with lit clouds and cirrus · plots of still water mirroring it, divided by grassy bunds
// · transplanted young rice, hill by hill and blade by blade, its rows running away from the camera · banks of
// mist lying in front of three receding tree lines · coconut groves and a far gopuram in haze · egrets wading
// in the flooded plot and a flock crossing the sky.
import { THREE, rng, makeNoise, canvasTex, makeRenderer, makeComposer, mergeGeometries, exportLights } from '../lib/common.js'
import { makeSky, gopuramGeometry, palmGeometry, treeGeometry } from '../lib/sky.js'
import { makeWater } from '../lib/water.js'
import { birdGeo } from '../lib/props.js'

function egretGeo({ stoop = 0 } = {}) {
  const clean = (g) => { const x = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(x.attributes)) if (!['position', 'normal'].includes(k)) x.deleteAttribute(k); return x }
  const white = [], dark = [], bill = []
  // body: a slim teardrop, breast forward, tapering into the tail plumes
  const prof = []
  for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(Math.max(0.002, Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.085 * (1 - 0.35 * t)), t * 0.5)) }
  const body = new THREE.LatheGeometry(prof, 14); body.rotateZ(Math.PI / 2 + 0.32); body.translate(0.17, 0.62, 0); white.push(clean(body))
  // folded wing over the back
  const wing = new THREE.SphereGeometry(1, 12, 8); wing.scale(0.2, 0.05, 0.075); wing.rotateZ(0.32); wing.translate(-0.02, 0.69, 0); white.push(clean(wing))
  // S-curved neck, long and thin, head and dagger bill
  const top = new THREE.Vector3(0.24 + stoop * 0.18, 0.98 - stoop * 0.38, 0)
  const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(0.15, 0.68, 0), new THREE.Vector3(0.24, 0.8, 0), new THREE.Vector3(0.17, 0.9 - stoop * 0.2, 0), top])
  white.push(clean(new THREE.TubeGeometry(neck, 24, 0.018, 6)))
  const head = new THREE.SphereGeometry(0.028, 10, 8); head.scale(1.35, 1, 0.9); head.translate(top.x + 0.012, top.y + 0.008, 0); white.push(clean(head))
  const b = new THREE.ConeGeometry(0.009, 0.12, 6); b.rotateZ(-Math.PI / 2 - stoop * 0.6); b.translate(top.x + 0.09, top.y + 0.004 - stoop * 0.03, 0); bill.push(clean(b))
  // long black legs with a backward knee
  for (const sz of [-0.03, 0.03]) {
    const leg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 0.6, sz), new THREE.Vector3(0.03, 0.34, sz), new THREE.Vector3(0.06, 0.0, sz * 1.4)]), 8, 0.007, 4)
    dark.push(clean(leg))
  }
  return { white: mergeGeometries(white), dark: mergeGeometries(dark), bill: mergeGeometries(bill) }
}

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const land = (q.get('o') || 'portrait') === 'landscape'
  const r = rng(91)
  const renderer = makeRenderer(W, H, { exposure: +(q.get('exp') || 0.6) })
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(land ? 36 : 54, W / H, 0.1, 9000)
  camera.position.set(0, 1.7, 0)
  camera.lookAt(0, 1.7 + Math.tan(THREE.MathUtils.degToRad(land ? 1.5 : 4)) * 100, -100)
  camera.updateMatrixWorld()

  const sky = makeSky({ elevation: +(q.get('elev') || -0.4), azimuth: land ? 168 : 176, turbidity: 3.2, rayleigh: 2.2, mie: 0.004, mieG: 0.82,
    clouds: { coverage: 0.5, density: 0.55, scale: 0.00028, elevation: 0.66, time: 900 }, warmClouds: 1.3,
    tintLow: [1.24, 0.9, 0.86], tintHigh: [0.96, 0.72, 1.16], tintRange: [0.0, 0.32], discScale: 0, cirrus: 0.7, cirrusColor: [1.0, 0.6, 0.62] })
  scene.add(sky)
  const sunDir = sky.userData.sunDir
  scene.fog = new THREE.FogExp2(new THREE.Color(q.get('fc') || '#5a3a44'), +(q.get('fd') || 0.0015))
  scene.add(new THREE.HemisphereLight(0xc6c2e0, 0x3a3028, 1.0))
  const sunL = new THREE.DirectionalLight(0xffc9a0, 1.6); sunL.position.copy(sunDir).setY(0.08).multiplyScalar(100); scene.add(sunL)

  // still water across the fields
  const water = makeWater({ W: W >> 1, H: H >> 1, sunDir, tint: 0xc0bcc4, ripple: 0.004, glitter: 0.6, minReflect: 0.35 })
  scene.add(water)

  // bunds: grassy earthen ridges dividing the plots
  const N = makeNoise(5)
  const grassTex = canvasTex(0, (ctx, w, h) => { const img = ctx.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = N.fbm(x / 12, y / 12), s = N.n2(x / 1.4, y / 1.4); const i = (y * w + x) * 4; const v = 0.55 + 0.4 * n + (s > 0.8 ? 0.15 : 0); img.data[i] = 70 * v; img.data[i + 1] = 105 * v; img.data[i + 2] = 50 * v; img.data[i + 3] = 255 } ctx.putImageData(img, 0, 0) }, { w: 256, h: 256, repeat: true })
  grassTex.repeat.set(20, 1)
  const bundMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95, color: 0x7a8a56, emissive: 0x2c2a20, emissiveIntensity: 0.6 })
  const bunds = []
  const addBund = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1)
    const g = new THREE.CylinderGeometry(0.26, 0.26, len, 8, 1, false, 0, Math.PI)
    g.rotateZ(Math.PI / 2); g.rotateY(-Math.atan2(z2 - z1, x2 - x1)); g.scale(1, 0.55, 1)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.04 * Math.sin(p.getX(i) * 0.8 + p.getZ(i) * 0.6))
    g.translate((x1 + x2) / 2, -0.02, (z1 + z2) / 2)
    bunds.push(g)
  }
  // plots get longer and wider into the distance
  const rows = [-9, -16, -26, -40, -60, -88, -128, -180, -250]
  rows.forEach((z, i) => {
    addBund(-400, z + (r() - 0.5) * 2, 400, z + (r() - 0.5) * 2)
    const step = 18 + i * 9
    if (i < 2) return
    for (let x = -360 + r() * step; x < 360; x += step * (0.8 + r() * 0.5)) {
      const zn = rows[i + 1] ?? z - 60
      addBund(x, z, x + (r() - 0.5) * 4, zn)
    }
  })
  scene.add(new THREE.Mesh(mergeGeometries(bunds.map((g) => g.toNonIndexed())), bundMat))

  // young rice: tufts of blades in rows in the nearer plots
  const blade = (h, lean, a) => {
    const g = new THREE.PlaneGeometry(0.012, h, 1, 4)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + h / 2; p.setY(i, y); p.setX(i, p.getX(i) * (1 - y / h * 0.8)); p.setZ(i, lean * y * y) }
    g.rotateY(a)
    return g
  }
  const tuftParts = []
  for (let k = 0; k < 9; k++) tuftParts.push(blade(0.32 + (k % 3) * 0.06, 0.6 + (k % 4) * 0.25, (k / 9) * Math.PI * 2))
  const tuft = mergeGeometries(tuftParts)
  tuft.computeVertexNormals()
  const riceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x1a2a08, emissiveIntensity: 0.3 })
  const count = 60000
  const rice = new THREE.InstancedMesh(tuft, riceMat, count)
  const m = new THREE.Matrix4()
  const col = new THREE.Color()
  const spread = land ? 0.62 : 0.33 // half-width of the view per metre of distance, plus a margin
  let n = 0
  const plant = (x, z, s, tilt) => {
    m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * tilt, r() * 6.28, (r() - 0.5) * tilt)), new THREE.Vector3(s, s * (0.9 + r() * 0.25), s))
    rice.setMatrixAt(n, m)
    // young rice: mostly fresh green, some hills yellower or bluer
    col.setHSL(0.24 + (r() - 0.5) * 0.05, 0.55 + r() * 0.2, 0.3 + r() * 0.1)
    rice.setColorAt(n++, col)
  }
  // nearest plot: rows of hills running away from the camera, water showing between them
  for (let x0 = -12; x0 <= 12; x0 += 0.34) {
    for (let z = -3.4; z > -8.7 && n < count; z -= 0.21) {
      const x = x0 + (land ? 0.3 : 0.1) + (r() - 0.5) * 0.05
      if (Math.abs(x) > Math.abs(z) * spread + 0.8 || r() < 0.05) continue
      plant(x, z + (r() - 0.5) * 0.04, 0.72 + r() * 0.3, 0.25)
    }
  }
  const plots = [[-9, -16, 0.3, 0.3], [-16, -26, 0.3, 0.3]]
  for (const [z0, z1, dx, dz] of plots) {
    for (let z = z0 - 0.35; z > z1 + 0.35 && n < count; z -= dz) {
      const xr = Math.abs(z) * spread + 2
      for (let x = -xr; x < xr && n < count; x += dx) {
        if (r() < 0.08) continue
        plant(x + (r() - 0.5) * 0.06, z + (r() - 0.5) * 0.06, 0.62 + r() * 0.3, 0.2)
      }
    }
  }
  rice.count = n
  rice.instanceColor.needsUpdate = true
  scene.add(rice)

  // mist: soft banks lying low in front of each tree line
  const mistTex = canvasTex(0, (ctx, w, h) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = y / h // 0 at the top, 1 at the water
      const body = Math.pow(Math.max(0, Math.min(1, (v - 0.08) / 0.75)), 1.6)
      const wisps = Math.min(1, 0.72 + 0.4 * N.fbm(x / 70, y / 14, 4))
      const i = (y * w + x) * 4
      img.data[i] = 255; img.data[i + 1] = 232; img.data[i + 2] = 226
      img.data[i + 3] = Math.max(0, Math.min(255, body * wisps * 255))
    }
    ctx.putImageData(img, 0, 0)
  }, { w: 1024, h: 128 })
  mistTex.wrapS = THREE.RepeatWrapping
  for (const [z, h, o, rep, c] of [[-75, 3.2, 0.26, 2, 0xf6d6cc], [-150, 6, 0.32, 3, 0xf0cfc6], [-235, 7, 0.3, 3, 0xe8c4bc], [-400, 12, 0.34, 2, 0xdcb8b2]]) {
    const w = Math.abs(z) * (land ? 1.5 : 0.9) + 60
    const t = mistTex.clone(); t.needsUpdate = true; t.repeat.set(rep, 1); t.offset.x = r()
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: o, depthWrite: false, color: c, fog: false }))
    mist.position.set(0, h / 2 - 0.3, z)
    scene.add(mist)
  }

  // coconut groves, a far gopuram, tree lines — silhouettes softened by the haze
  const hazeMat = new THREE.MeshBasicMaterial({ color: 0x1a161e })
  const grove = (cx, cz, n2, seed) => { const gr = rng(seed); for (let i = 0; i < n2; i++) { const x = cx + (gr() - 0.5) * 50, z = cz + (gr() - 0.5) * 30; const mm = new THREE.Mesh(mergeGeometries(palmGeometry(rng(seed * 10 + i), { height: 11 + gr() * 6, lean: (gr() - 0.5) * 6, fronds: 22 })), hazeMat); mm.position.set(x, 0, z); scene.add(mm) } }
  grove(land ? -70 : -26, -95, 9, 3); grove(land ? 60 : 30, -120, 8, 4); grove(-150, -170, 10, 5); grove(140, -190, 10, 6); grove(0, -230, 8, 7)
  const gop = new THREE.Mesh(mergeGeometries(gopuramGeometry(rng(11)).geo), hazeMat); gop.position.set(land ? 110 : 34, 0, -420); gop.scale.setScalar(1.1); scene.add(gop)
  const treeRow = (zc, depth, step, hMin, hVar, seed, detail) => {
    const tr = rng(seed), parts = []
    const xr = Math.abs(zc) * (land ? 0.66 : 0.36) + 40
    for (let x = -xr; x < xr; x += step * (0.6 + tr() * 0.7)) {
      const h = hMin + tr() * hVar, z = zc - tr() * depth
      for (const g of treeGeometry(tr, { h, w: h * (0.9 + tr() * 0.6), detail })) { g.translate(x, -h * 0.18, z); parts.push(g) }
      // scrub at the foot of the trees
      for (const g of treeGeometry(tr, { h: 2.6 + tr() * 1.8, w: 4 + tr() * 4, detail: 1 })) { g.translate(x + step * 0.5, -1.2, z + 6); parts.push(g) }
    }
    scene.add(new THREE.Mesh(mergeGeometries(parts), hazeMat))
  }
  treeRow(-250, 40, 8, 10, 9, 950, 1)
  treeRow(-420, 60, 11, 13, 10, 960, 1)
  treeRow(-700, 90, 15, 16, 12, 970, 1)
  const hills = new THREE.Mesh(new THREE.PlaneGeometry(9000, 120, 200, 1), new THREE.MeshBasicMaterial({ color: 0x8c7c90 }))
  const hp = hills.geometry.attributes.position
  for (let i = 0; i < hp.count; i++) if (hp.getY(i) > 0) hp.setY(i, 20 + 40 * N.fbm(hp.getX(i) / 600, 3) + 25 * Math.sin(hp.getX(i) / 900))
  hills.position.set(0, -40, -2600); scene.add(hills)

  // a flock of egrets crossing high in the dawn light, and three wading in the flooded plot beyond the rice
  const flockMat = new THREE.MeshBasicMaterial({ color: 0x241a20 })
  const fr = rng(17)
  const bx = land ? 16 : 4
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(birdGeo((fr() - 0.3) * 2.2, 1.5), flockMat)
    b.position.set(bx + i * 2.6 + fr() * 1.4, 19 + fr() * 2 + i * 0.7, -70 - i * 1.5 - fr() * 4)
    b.rotation.set(0.5 + (fr() - 0.5) * 0.3, Math.PI / 2 + 0.35 + (fr() - 0.5) * 0.3, (fr() - 0.5) * 0.25)
    scene.add(b)
  }
  const plume = new THREE.MeshStandardMaterial({ color: 0xfbf6f0, roughness: 0.8, emissive: 0x6a4a44, emissiveIntensity: 0.35 })
  const legMat = new THREE.MeshBasicMaterial({ color: 0x15100f })
  const billMat = new THREE.MeshStandardMaterial({ color: 0xe0a826, roughness: 0.5, emissive: 0x3a2400 })
  const wading = land ? [[-7.5, -29, 0.4, 0], [-5.4, -31.5, -0.5, 1], [9, -34, 2.6, 0]] : [[-2.6, -28, 0.4, 0], [-1.3, -30.5, -0.6, 1], [2.4, -33, 2.7, 0]]
  for (const [x, z, ry, stoop] of wading) {
    const g = egretGeo({ stoop })
    const e = new THREE.Group()
    e.add(new THREE.Mesh(g.white, plume), new THREE.Mesh(g.dark, legMat), new THREE.Mesh(g.bill, billMat))
    e.position.set(x, -0.12, z); e.rotation.y = ry; e.scale.setScalar(1.05)
    scene.add(e)
  }

  exportLights(camera, W, H, [{ pos: camera.position.clone().add(sunDir.clone().setY(0.01).normalize().multiplyScalar(1000)), radius: 1000 * 0.08, kind: 'glow' }])

  const comp = makeComposer(renderer, scene, camera, W, H, {
    bloom: [0.35, 0.45, 2.2],
    grade: { vignette: 0.32, lift: [0.03, 0.025, 0.035], gain: [1.02, 0.99, 0.98], ca: 0.0006 },
  })
  comp.render()
}
