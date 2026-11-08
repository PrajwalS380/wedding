// DAWN · flooded paddy fields before sunrise (interlude, Monday).
// Pink-gold pre-dawn sky with lit clouds and cirrus · plots of still water mirroring it, divided by grassy bunds
// · rows of young rice, blade by blade · layered ground mist · coconut groves and a far gopuram in haze ·
// egrets flying low and two standing in the water.
import { THREE, rng, makeNoise, canvasTex, makeRenderer, makeComposer, mergeGeometries, exportLights } from '../lib/common.js'
import { makeSky, gopuramGeometry, palmGeometry, treeGeometry } from '../lib/sky.js'
import { makeWater } from '../lib/water.js'
import { birdGeo } from '../lib/props.js'

function egretGeo() {
  const parts = []
  const body = new THREE.SphereGeometry(1, 16, 12); body.scale(0.32, 0.17, 0.15); body.rotateZ(0.35); body.translate(0, 0.85, 0); parts.push(body)
  const neck = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.22, 0.95, 0), new THREE.Vector3(0.3, 1.2, 0), new THREE.Vector3(0.22, 1.38, 0), new THREE.Vector3(0.3, 1.5, 0)]), 16, 0.035, 6); parts.push(neck)
  const head = new THREE.SphereGeometry(0.06, 10, 8); head.scale(1.3, 1, 1); head.translate(0.33, 1.52, 0); parts.push(head)
  for (const s of [-1, 1]) { const leg = new THREE.CylinderGeometry(0.012, 0.012, 0.75, 5); leg.translate(-0.02, 0.4, s * 0.05); parts.push(leg) }
  return mergeGeometries(parts.map((g) => { const x = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(x.attributes)) if (!['position', 'normal'].includes(k)) x.deleteAttribute(k); return x }))
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
  scene.fog = new THREE.FogExp2(new THREE.Color(q.get('fc') || '#8a7480'), +(q.get('fd') || 0.0021))
  scene.add(new THREE.HemisphereLight(0xc6c2e0, 0x3a3028, 1.0))
  const sunL = new THREE.DirectionalLight(0xffc9a0, 1.6); sunL.position.copy(sunDir).setY(0.08).multiplyScalar(100); scene.add(sunL)

  // still water across the fields
  const water = makeWater({ W: W >> 1, H: H >> 1, sunDir, tint: 0xc0bcc4, ripple: 0.004, glitter: 0.6, minReflect: 0.35 })
  scene.add(water)

  // bunds: grassy earthen ridges dividing the plots
  const N = makeNoise(5)
  const grassTex = canvasTex(0, (ctx, w, h) => { const img = ctx.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = N.fbm(x / 12, y / 12), s = N.n2(x / 1.4, y / 1.4); const i = (y * w + x) * 4; const v = 0.55 + 0.4 * n + (s > 0.8 ? 0.15 : 0); img.data[i] = 70 * v; img.data[i + 1] = 105 * v; img.data[i + 2] = 50 * v; img.data[i + 3] = 255 } ctx.putImageData(img, 0, 0) }, { w: 256, h: 256, repeat: true })
  grassTex.repeat.set(20, 1)
  const bundMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95, color: 0x6a7a4a })
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
  const riceMat = new THREE.MeshStandardMaterial({ color: 0x6f9a3a, roughness: 0.65, side: THREE.DoubleSide, emissive: 0x1a2a08, emissiveIntensity: 0.35 })
  const count = 26000
  const rice = new THREE.InstancedMesh(tuft, riceMat, count)
  const m = new THREE.Matrix4()
  let n = 0
  const plots = [[-9, -16, land ? 6 : 1.2], [-16, -26, land ? -14 : -0.5]]
  for (const [z0, z1, xoff] of plots) {
    for (let z = z0 - 0.4; z > z1 + 0.4 && n < count; z -= 0.28) {
      for (let x = -60 + xoff; x < 60 + xoff && n < count; x += 0.24) {
        if (r() < 0.12) continue
        const s = 0.8 + r() * 0.5
        m.compose(new THREE.Vector3(x + (r() - 0.5) * 0.06, 0, z + (r() - 0.5) * 0.06), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6, (r() - 0.5) * 0.2)), new THREE.Vector3(s, s, s))
        rice.setMatrixAt(n++, m)
      }
    }
  }
  rice.count = n
  scene.add(rice)

  // ground mist in layers
  const mistTex = canvasTex(0, (ctx, w, h) => { const img = ctx.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = N.fbm(x / 90, y / 26); const i = (y * w + x) * 4; img.data[i] = 255; img.data[i + 1] = 236; img.data[i + 2] = 228; img.data[i + 3] = Math.max(0, Math.min(255, (v - 0.35) * 520)) } ctx.putImageData(img, 0, 0) }, { w: 512, h: 512, repeat: true })
  mistTex.repeat.set(5, 5)
  for (const [y, z, o, sz] of [[1.6, -140, 0.22, 700], [3.5, -260, 0.28, 1100]]) {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(sz * 2, sz * 0.6), new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: o, depthWrite: false, color: 0xf2dcd6 }))
    mist.rotation.x = -Math.PI / 2; mist.position.set(0, y, z); scene.add(mist)
  }

  // coconut groves, a far gopuram, tree lines — silhouettes softened by the haze
  const hazeMat = new THREE.MeshBasicMaterial({ color: 0x1a161e })
  const grove = (cx, cz, n2, seed) => { const gr = rng(seed); for (let i = 0; i < n2; i++) { const x = cx + (gr() - 0.5) * 50, z = cz + (gr() - 0.5) * 30; const mm = new THREE.Mesh(mergeGeometries(palmGeometry(rng(seed * 10 + i), { height: 11 + gr() * 6, lean: (gr() - 0.5) * 6, fronds: 22 })), hazeMat); mm.position.set(x, 0, z); scene.add(mm) } }
  grove(land ? -70 : -26, -95, 9, 3); grove(land ? 60 : 30, -120, 8, 4); grove(-150, -170, 10, 5); grove(140, -190, 10, 6); grove(0, -230, 8, 7)
  const gop = new THREE.Mesh(mergeGeometries(gopuramGeometry(rng(11)).geo), hazeMat); gop.position.set(land ? 110 : 34, 0, -420); gop.scale.setScalar(1.1); scene.add(gop)
  for (let i = 0; i < 120; i++) { const tr = rng(950 + i); const mm = new THREE.Mesh(mergeGeometries(treeGeometry(tr, { h: 7 + tr() * 8, w: 12 + tr() * 10 })), hazeMat); mm.position.set(-520 + i * 8.6, 0, -330 - tr() * 160); scene.add(mm) }
  const hills = new THREE.Mesh(new THREE.PlaneGeometry(9000, 120, 200, 1), new THREE.MeshBasicMaterial({ color: 0x8c7c90 }))
  const hp = hills.geometry.attributes.position
  for (let i = 0; i < hp.count; i++) if (hp.getY(i) > 0) hp.setY(i, 20 + 40 * N.fbm(hp.getX(i) / 600, 3) + 25 * Math.sin(hp.getX(i) / 900))
  hills.position.set(0, -40, -2600); scene.add(hills)

  // egrets: a few flying low, two standing in the water
  const white = new THREE.MeshStandardMaterial({ color: 0xf6f2ee, roughness: 0.7, emissive: 0x2a2220, emissiveIntensity: 0.3 })
  const fr = rng(17)
  const bx = land ? 9 : 2.5
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(birdGeo((fr() - 0.5) * 2, 1.6), white)
    b.position.set(bx + i * 2.2 + fr() * 1.2, 6 + fr() * 2.5 + i * 0.3, -34 - i * 2 - fr() * 3)
    b.rotation.set((fr() - 0.5) * 0.3, -0.4 + (fr() - 0.5) * 0.3, (fr() - 0.5) * 0.2)
    scene.add(b)
  }
  const eg = egretGeo()
  ;[[land ? -6 : -2.4, -21, 0.6], [land ? -4.6 : -1.3, -23.5, -0.9]].forEach(([x, z, ry]) => { const e = new THREE.Mesh(eg, white); e.position.set(x, -0.25, z); e.rotation.y = ry; scene.add(e) })

  exportLights(camera, W, H, [{ pos: camera.position.clone().add(sunDir.clone().setY(0.01).normalize().multiplyScalar(1000)), radius: 1000 * 0.08, kind: 'glow' }])

  const comp = makeComposer(renderer, scene, camera, W, H, {
    bloom: [0.35, 0.45, 2.2],
    grade: { vignette: 0.32, lift: [0.03, 0.025, 0.035], gain: [1.02, 0.99, 0.98], ca: 0.0006 },
  })
  comp.render()
}
