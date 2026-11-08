// TWILIGHT · temple tank at blue hour (interlude, Sunday).
// Granite kalyani steps descending into still water, a stone mandapa in the centre, two deepastambha lamp
// towers, hundreds of lit diyas on the steps and floating on the water, all mirrored; the gopuram against a
// deep blue sky with the last warm band at the horizon, the first stars and a waxing crescent moon.
import { THREE, rng, makeNoise, canvasTex, makeRenderer, makeComposer, mergeGeometries, exportLights } from '../lib/common.js'
import { makeSky, gopuramGeometry, palmGeometry, treeGeometry } from '../lib/sky.js'
import { makeWater } from '../lib/water.js'
import { diyaGeometry, terracottaTex } from './night-diyas.js'
import { makeMoon, makeStars, makeLamp } from '../lib/night.js'
import { scatteredPetals } from '../lib/flora.js'

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const land = (q.get('o') || 'portrait') === 'landscape'
  const r = rng(71)
  const renderer = makeRenderer(W, H, { exposure: +(q.get('exp') || 0.85) })
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(land ? 38 : 54, W / H, 0.05, 9000)
  camera.position.set(0, 1.25, 18.5)
  camera.lookAt(0, land ? -0.6 : 0.4, -10)
  camera.updateMatrixWorld()

  const sky = makeSky({ elevation: -1.4, azimuth: 200, turbidity: 3, rayleigh: 2.4, mie: 0.004, mieG: 0.8,
    clouds: { coverage: 0.35, density: 0.4, scale: 0.0003, elevation: 0.6, time: 60 }, warmClouds: 0.8,
    tintLow: [1.3, 0.92, 0.82], tintHigh: [0.45, 0.62, 1.55], tintRange: [0.0, 0.3], discScale: 0, cirrus: 0.5, cirrusColor: [0.9, 0.45, 0.55] })
  scene.add(sky)
  makeStars(scene, { count: 1600, brightness: 0.55, minEl: 0.12 })
  const moonDir = new THREE.Vector3(land ? -0.42 : -0.18, 0.36, -1).normalize()
  makeMoon(scene, camera, { dir: moonDir, diameterDeg: land ? 1.8 : 2.4, phaseDeg: 120, light: 26 })
  scene.fog = new THREE.FogExp2(new THREE.Color('#1c2440'), 0.0016)

  scene.add(new THREE.HemisphereLight(0x5a6ea8, 0x1a1210, 0.9))

  // granite with wet darkening near the water and moss in the joints
  const N = makeNoise(7)
  const granite = canvasTex(0, (ctx, w, h) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = N.fbm(x / 40, y / 40), s = N.n2(x / 1.7, y / 1.7)
      let v = 0.5 + 0.28 * (n - 0.5); if (s > 0.82) v -= 0.18; else if (s < 0.1) v += 0.14
      const i = (y * w + x) * 4
      img.data[i] = 152 * v + 22; img.data[i + 1] = 140 * v + 20; img.data[i + 2] = 128 * v + 20; img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, { w: 512, h: 512, repeat: true })
  granite.repeat.set(6, 1)
  const stoneMat = new THREE.MeshStandardMaterial({ map: granite, roughness: 0.75, color: 0xb8aca0 })
  const wetMat = new THREE.MeshStandardMaterial({ map: granite, roughness: 0.25, color: 0x5a5650 })

  // the tank: concentric steps from ground level (0) down to the water (-4.2)
  const half = 21, steps = 16, rise = 0.3, tread = 0.5
  const WATER_Y = -3.9
  const stepGeos = [], wetGeos = []
  for (let i = 0; i < steps; i++) {
    const y = -i * rise
    const inner = half - (i + 1) * tread
    const outer = half - i * tread
    for (const side of ['far', 'left', 'right', 'near']) {
      const len = outer * 2
      const g = new THREE.BoxGeometry(side === 'far' || side === 'near' ? len : tread, rise, side === 'far' || side === 'near' ? tread : len)
      const c = (outer + inner) / 2
      if (side === 'far') g.translate(0, y - rise / 2, -c)
      if (side === 'near') g.translate(0, y - rise / 2, c)
      if (side === 'left') g.translate(-c, y - rise / 2, 0)
      if (side === 'right') g.translate(c, y - rise / 2, 0)
      ;(y - rise < WATER_Y + 0.5 ? wetGeos : stepGeos).push(g)
    }
  }
  scene.add(new THREE.Mesh(mergeGeometries(stepGeos), stoneMat))
  scene.add(new THREE.Mesh(mergeGeometries(wetGeos), wetMat))
  // ground around the tank and a low parapet
  const gShape = new THREE.Shape([new THREE.Vector2(-300, -300), new THREE.Vector2(300, -300), new THREE.Vector2(300, 300), new THREE.Vector2(-300, 300)])
  gShape.holes.push(new THREE.Path([new THREE.Vector2(-half, -half), new THREE.Vector2(-half, half), new THREE.Vector2(half, half), new THREE.Vector2(half, -half)]))
  const ground = new THREE.Mesh(new THREE.ShapeGeometry(gShape), new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.9 }))
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0.001
  scene.add(ground)
  for (const s of [-1, 1]) {
    const pw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, half * 2), stoneMat); pw.position.set(s * (half + 0.25), 0.35, 0); scene.add(pw)
  }
  const pf = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 1, 0.7, 0.5), stoneMat); pf.position.set(0, 0.35, -half - 0.25); scene.add(pf)

  // central mandapa standing in the water
  const mand = new THREE.Group()
  const plat = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 6), stoneMat); plat.position.y = WATER_Y + 0.5; mand.add(plat)
  for (const [x, z] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) {
    const col = new THREE.Group()
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.1, 0.55), stoneMat); a.position.y = 0.55; col.add(a)
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.1, 8), stoneMat); b.position.y = 1.65; col.add(b)
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.55), stoneMat); c.position.y = 2.6; col.add(c)
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.22, 0.35, 8), stoneMat); d.position.y = 3.17; col.add(d)
    col.position.set(x, WATER_Y + 1.2, z); mand.add(col)
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.45, 6.6), stoneMat); roof.position.y = WATER_Y + 1.2 + 3.55; mand.add(roof)
  const eave = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.9, 0.4, 4), stoneMat); eave.rotation.y = Math.PI / 4; eave.position.y = WATER_Y + 1.2 + 3.95; mand.add(eave)
  let ty = WATER_Y + 1.2 + 4.15
  for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(3.4 - i * 0.8, 0.7, 3.4 - i * 0.8), stoneMat); t.position.y = ty + 0.35; mand.add(t); ty += 0.7 }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), stoneMat); dome.scale.y = 1.2; dome.position.y = ty; mand.add(dome)
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 1, roughness: 0.3 })); fin.position.y = ty + 1.7; mand.add(fin)
  mand.scale.setScalar(0.58); mand.position.set(0, WATER_Y * 0.42, -7)
  scene.add(mand)

  // gopuram and the temple town beyond, against the blue sky
  const dark = new THREE.MeshBasicMaterial({ color: 0x0a0c16 })
  const gop = new THREE.Mesh(mergeGeometries(gopuramGeometry(rng(11)).geo), dark)
  gop.position.set(land ? 16 : 6, 0, -150); scene.add(gop)
  ;[[-24, -60, 14, 2], [-30, -75, 12, -2], [28, -58, 13, -2], [36, -80, 15, 2.4], [-46, -90, 13, 1], [48, -100, 14, -1.5]].forEach(([x, z, h, l], i) => {
    const m = new THREE.Mesh(mergeGeometries(palmGeometry(rng(700 + i), { height: h, lean: l, fronds: 24 })), dark); m.position.set(x, 0, z); scene.add(m)
  })
  for (let i = 0; i < 40; i++) { const tr = rng(900 + i); const m = new THREE.Mesh(mergeGeometries(treeGeometry(tr, { h: 8 + tr() * 6, w: 8 + tr() * 6 })), dark); m.position.set(-160 + i * 8, 0, -130 - tr() * 80); scene.add(m) }

  // water
  const water = makeWater({ W: W >> 1, H: H >> 1, sunDir: new THREE.Vector3(0, -1, 0), tint: 0xb4b2c0, ripple: 0.006, glitter: 0, minReflect: 0.55 })
  water.position.y = WATER_Y
  scene.add(water)

  // lamps: rows on the steps, on the mandapa, floating on the water, and the two deepastambhas
  const lampGeo = diyaGeometry()
  const clay = new THREE.MeshStandardMaterial({ map: terracottaTex(5), roughness: 0.82, vertexColors: true })
  const oil = new THREE.MeshPhysicalMaterial({ color: 0x4a2606, roughness: 0.05, clearcoat: 1 })
  const flamePts = []
  const addLamp = (x, y, z, s = 1, fs = 1) => {
    const l = makeLamp(lampGeo, clay, oil, r, { flameScale: fs, seed: r() * 10, halo: 0.26, intensity: 0.42 })
    l.position.set(x, y, z); l.scale.setScalar(s); l.rotation.y = r() * 6
    scene.add(l)
    l.updateMatrixWorld()
    flamePts.push(l.localToWorld(l.userData.flameLocal.clone()))
    return l
  }
  const S = 3.2 // lamps are scaled up so they read at this distance
  for (let i = 1; i < steps; i += 2) {
    const y = -i * rise, edge = half - i * tread - 0.15
    if (y < WATER_Y + 0.2) continue
    const n = Math.floor(edge * 2 / 1.25)
    for (let k = 0; k <= n; k++) {
      const t = -edge + (k / n) * edge * 2
      addLamp(t, y + 0.001, -edge, S)
      if (k % 2 === 0) { addLamp(-edge, y + 0.001, t, S); addLamp(edge, y + 0.001, t, S) }
    }
  }
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; addLamp(Math.cos(a) * 1.6, WATER_Y + 0.7 + 0.001, -7 + Math.sin(a) * 1.6, S * 0.7) }
  for (let k = 0; k < 230; k++) {
    let x, z
    do { x = (r() - 0.5) * 31; z = -15 + Math.pow(r(), 0.8) * 27 } while (Math.abs(x) < 2.4 && Math.abs(z + 7) < 2.4)
    addLamp(x, WATER_Y + 0.01, z, S * (0.85 + r() * 0.3) * (z > 4 ? 0.8 : 1))
  }
  // deepastambhas at the far corners
  for (const sx of [-1, 1]) {
    const x = sx * (land ? half - 2.5 : 9.5), z = land ? -half + 2.5 : -half + 1.6
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 8, 10), stoneMat); col.position.set(x, 4, z); scene.add(col)
    for (let t = 0; t < 9; t++) {
      const y = 1.2 + t * 0.78, rad = 1.05 - t * 0.085
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.9, 0.12, 20), stoneMat); ring.position.set(x, y, z); scene.add(ring)
      const n = Math.max(6, Math.round(rad * 9))
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + t; addLamp(x + Math.cos(a) * rad * 0.92, y + 0.06, z + Math.sin(a) * rad * 0.92, 2.4) }
    }
  }
  // marigold petals floating among the lamps
  const spots = []
  for (let k = 0; k < 500; k++) spots.push({ pos: new THREE.Vector3((r() - 0.5) * 34, WATER_Y + 0.004, -16 + r() * 30), size: 0.05 + r() * 0.04, color: ['#ff8a00', '#ffb000', '#c8203a', '#f4ede0'][Math.floor(r() * 4)] })
  scene.add(scatteredPetals(spots, { seed: 12 }))
  // a few warm light sources so the stone actually catches the lamplight
  for (const [x, y, z, i] of [[0, WATER_Y + 1.6, -3, 3], [-12, -1.5, -14, 5], [12, -1.5, -14, 5], [-15, -2, 0, 4], [15, -2, 0, 4], [0, -2.2, -16, 5], [land ? -half + 2.5 : -9.5, 5, -half + 2.5, 6], [land ? half - 2.5 : 9.5, 5, -half + 2.5, 6], [0, WATER_Y + 0.6, 6, 4]]) {
    const pl = new THREE.PointLight(0xff9a48, i * 9, 0, 1.6); pl.position.set(x, y, z); scene.add(pl)
  }

  // live light: a sample of the flames
  const pts = flamePts.filter((_, i) => i % 3 === 0).map((p) => ({ pos: p, radius: 0.32, kind: 'flame' }))
  exportLights(camera, W, H, pts.slice(0, 90))

  const comp = makeComposer(renderer, scene, camera, W, H, {
    bloom: [0.85, 0.42, 0.9],
    grade: { vignette: 0.45, lift: [0.012, 0.014, 0.03], gain: [1.02, 0.99, 1.0], ca: 0.0008 },
  })
  comp.render()
}
