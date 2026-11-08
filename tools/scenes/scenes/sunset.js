// SUNSET over the temple lake (chapter "at a glance").
// Physical sky with lit clouds and pink cirrus · Dravidian gopuram with its flag mast and compound wall ·
// coconut palms · a moored country boat · a flock of birds · mist on the water · lotus pads and flowers in the
// foreground · rippled mirror lake with a glitter path · crepuscular rays · lens bloom and an anamorphic streak.
import { THREE, rng, makeRenderer, makeComposer, makeRays, screenPos, mergeGeometries, makeNoise, canvasTex, exportLights } from '../lib/common.js'
import { makeSky, gopuramGeometry, palmGeometry, treeGeometry } from '../lib/sky.js'
import { makeWater } from '../lib/water.js'
import { lotusPadGeo, lotusFlower, boatGeo, birdGeo, dhvajaGeo, prakaraGeo, vimanaGeo } from '../lib/props.js'

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const land = (q.get('o') || 'portrait') === 'landscape'
  const r = rng(11)
  const renderer = makeRenderer(W, H, { exposure: +(q.get('exp') || 0.55) })
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(land ? 34 : 50, W / H, 0.3, 9000)
  camera.position.set(0, land ? 1.6 : 1.3, 0)
  camera.lookAt(0, camera.position.y + Math.tan(THREE.MathUtils.degToRad(land ? 2.2 : 1.5)) * 100, -100)
  camera.updateMatrixWorld()
  const ang = (deg, z) => Math.tan(THREE.MathUtils.degToRad(deg)) * -z // x for an angle right of centre at depth z (<0)

  const sunAz = land ? 180 - 13 : 176.5
  const sky = makeSky({ elevation: 1.2, azimuth: sunAz, turbidity: 4, rayleigh: 3.2, mie: 0.005, mieG: 0.8,
    clouds: { coverage: 0.6, density: 0.75, scale: 0.0003, elevation: 0.72, time: 140 }, warmClouds: 1.4,
    tintLow: [1.35, 0.8, 0.66], tintHigh: [0.55, 0.52, 1.05], tintRange: [0.0, 0.42], discScale: 0.06, cirrus: 0.85, cirrusColor: [1.0, 0.5, 0.42] })
  sky.layers.enable(1)
  scene.add(sky)
  const sunDir = sky.userData.sunDir

  scene.fog = new THREE.FogExp2(new THREE.Color('#5a2026'), 0.0016)
  const dark = new THREE.MeshBasicMaterial({ color: 0x040203 })
  const sil = new THREE.Group()

  // gopuram, flag mast, compound wall and a shrine
  const gx = land ? ang(7.5, -215) : -15
  const gop = new THREE.Mesh(mergeGeometries(gopuramGeometry(r).geo), dark)
  gop.position.set(gx, 0, -215); gop.rotation.y = 0.18; sil.add(gop)
  const dh = new THREE.Mesh(dhvajaGeo(15), dark); dh.position.set(gx + 22, 0, -190); sil.add(dh)
  const wall = new THREE.Mesh(prakaraGeo(rng(5), 140), dark); wall.position.set(gx + 10, 0, -205); wall.rotation.y = 0.18; sil.add(wall)
  const vim = new THREE.Mesh(vimanaGeo(1.15), dark); vim.position.set(gx - 34, 0, -255); sil.add(vim)
  const vim2 = new THREE.Mesh(vimanaGeo(0.8), dark); vim2.position.set(gx + 46, 0, -300); sil.add(vim2)

  // palms
  const palmsP = [[11, -92, 15, 3.2], [16.5, -122, 13.5, -2.4], [-17.5, -78, 14.5, 2.8], [25, -160, 12, 1.5], [-31, -150, 13, -2], [5, -260, 12, 2], [-38, -240, 14, 1.8], [33, -230, 13, -1.6], [21, -300, 12, 1]]
  const palmsL = [[ang(19, -92), -92, 15, 3.2], [ang(23, -122), -122, 13.5, -2.4], [ang(27.5, -150), -150, 14, 2], [ang(30, -110), -110, 15.5, -3], [ang(-4, -260), -260, 12, 2], [ang(-12, -240), -240, 14, 1.8], [ang(-20, -200), -200, 13, -1.5], [ang(-24, -170), -170, 12.5, 2.2], [ang(12, -300), -300, 12, 1]]
  ;(land ? palmsL : palmsP).forEach(([x, z, h, lean], i) => {
    const m = new THREE.Mesh(mergeGeometries(palmGeometry(rng(100 + i), { height: h, lean, fronds: 26 })), dark)
    m.position.set(x, 0, z); sil.add(m)
  })
  for (let i = 0; i < 110; i++) {
    const tr = rng(300 + i)
    const m = new THREE.Mesh(mergeGeometries(treeGeometry(tr, { h: 6 + tr() * 9, w: 7 + tr() * 9 })), dark)
    m.scale.y = 0.75 + tr() * 0.4
    m.position.set(-420 + i * 7.6 + (tr() - 0.5) * 6, 0, -420 - tr() * 260); sil.add(m)
  }
  const landPlane = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), dark)
  landPlane.rotation.x = -Math.PI / 2; landPlane.position.set(0, 0.35, -2058); sil.add(landPlane)
  for (let i = 0; i < 90; i++) {
    const tr = rng(500 + i)
    const g = new THREE.IcosahedronGeometry(1, 1); const s = 1.2 + tr() * 2.8; g.scale(s * 1.6, s * 0.8, s)
    const m = new THREE.Mesh(g, dark); m.position.set(-120 + i * 2.7 + (tr() - 0.5) * 2, 0.3, -60 - tr() * 10); sil.add(m)
  }
  const bank = new THREE.Mesh(new THREE.BoxGeometry(800, 0.9, 3), dark); bank.position.set(0, 0.2, -58); sil.add(bank)

  // a moored country boat near the far shore
  const boat = new THREE.Mesh(boatGeo(), dark)
  boat.position.set(land ? ang(-9, -42) : ang(-6.5, -40), 0.05, land ? -42 : -40); boat.rotation.set(0.02, 0.5, 0.015); sil.add(boat)

  // birds heading home
  const flock = new THREE.Group()
  const fr = rng(9)
  const bx = land ? ang(13, -70) : ang(4, -70)
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(birdGeo((fr() - 0.5) * 2, 1.25), dark)
    const row = Math.floor(i / 2), side = i % 2 ? 1 : -1
    b.position.set(bx - row * 1.8 + (fr() - 0.5) * 0.8, 13.5 + row * 0.5 * side + fr() * 0.6, -70 + side * row * 1.4)
    b.rotation.set((fr() - 0.5) * 0.3, Math.PI * 0.95 + (fr() - 0.5) * 0.3, (fr() - 0.5) * 0.25)
    flock.add(b)
  }
  sil.add(flock)
  sil.traverse((o) => o.isMesh && o.layers.set(2))
  scene.add(sil)

  // low mist lying on the water near the far shore
  const N = makeNoise(13)
  const mistTex = canvasTex(0, (ctx, w, h) => { const img = ctx.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = N.fbm(x / 60, y / 14); const i = (y * w + x) * 4; img.data[i] = 255; img.data[i + 1] = 196; img.data[i + 2] = 160; img.data[i + 3] = Math.max(0, Math.min(255, (n - 0.42) * 420)) } ctx.putImageData(img, 0, 0) }, { w: 512, h: 256, repeat: true })
  mistTex.repeat.set(3, 3)
  for (const [y, z, o] of [[0.6, -70, 0.22], [1.4, -90, 0.16]]) {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(900, 60), new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: o, depthWrite: false, color: 0xd88a70 }))
    mist.rotation.x = -Math.PI / 2; mist.position.set(0, y, z); scene.add(mist)
  }

  // lake
  const water = makeWater({ W: W >> 1, H: H >> 1, sunDir, tint: 0xb0a8a8, ripple: 0.018, glitter: 3.2 })
  water.layers.set(2)
  scene.add(water)

  // foreground lotus pads, buds and flowers — backlit, with sun glints on wet leaves
  const padMat = new THREE.MeshStandardMaterial({ color: 0x0f1d0e, roughness: 0.55, metalness: 0.0, side: THREE.DoubleSide })
  scene.add(new THREE.HemisphereLight(0x8a5a70, 0x120808, 0.5))
  const sunL = new THREE.DirectionalLight(0xffb070, 2.2); sunL.position.copy(sunDir).multiplyScalar(100); scene.add(sunL)
  const lr = rng(61)
  const pads = land
    ? [[16, -7, 0.8], [21, -9.5, 0.6], [12.5, -11, 0.55], [25, -6.2, 0.7], [18.5, -13, 0.5], [29, -8, 0.6], [8, -15, 0.45], [33, -10.5, 0.5], [-30, -6.5, 0.7], [-35, -9, 0.6]]
    : [[-14, -6, 0.6], [-9, -8.5, 0.5], [13, -6.8, 0.65], [9, -9.5, 0.5], [16, -11, 0.45], [-17, -10.5, 0.45], [4, -13, 0.4], [-4, -14.5, 0.38]]
  pads.forEach(([deg, z, rad]) => {
    const pad = new THREE.Mesh(lotusPadGeo(lr, rad), padMat)
    pad.position.set(ang(deg, z), 0.015, z)
    pad.rotation.y = lr() * 6
    scene.add(pad)
  })
  const flowers = land ? [[19, -8.6, 0.55], [26.5, -7.4, 0.42], [-33, -8.2, 0.4]] : [[11.5, -7.8, 0.5], [-12.5, -7.6, 0.42]]
  flowers.forEach(([deg, z, hgt], i) => {
    const f = lotusFlower(lr, { size: 0.2, open: i ? 0.35 : 0.75 })
    f.position.set(ang(deg, z), hgt, z)
    scene.add(f)
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, hgt, 5), padMat)
    stem.position.set(ang(deg, z), hgt / 2, z); scene.add(stem)
  })

  camera.layers.enableAll()

  const rays = makeRays(renderer, W, H)
  const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const raysTex = rays.run((rt) => {
    sky.material.uniforms.occMode.value = 1
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear()
    camera.layers.set(1)
    const fog = scene.fog; scene.fog = null
    renderer.render(scene, camera)
    sky.material.uniforms.occMode.value = 0
    renderer.autoClear = false
    camera.layers.set(2)
    scene.overrideMaterial = blackMat
    water.visible = false
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), blackMat); plane.rotation.x = -Math.PI / 2; plane.layers.set(2); scene.add(plane)
    renderer.render(scene, camera)
    scene.remove(plane)
    water.visible = true
    scene.overrideMaterial = null
    renderer.autoClear = true
    scene.fog = fog
    camera.layers.enableAll()
  }, screenPos(camera.position.clone().add(sunDir.clone().multiplyScalar(1000)), camera), { weight: 0.03, decay: 0.972 })

  // live light: the sun's glow and glints along the glitter path
  const sunPt = camera.position.clone().add(sunDir.clone().multiplyScalar(1000))
  const pts = [{ pos: sunPt, radius: 1000 * 0.05, kind: 'glow' }]
  const gr = rng(4)
  for (let i = 0; i < 26; i++) {
    const z = -(8 + Math.pow(gr(), 1.6) * 60)
    const x = sunDir.x / -sunDir.z * -z + (gr() - 0.5) * (0.5 + -z * 0.02)
    pts.push({ pos: new THREE.Vector3(x, 0.02, z), radius: 0.12 + -z * 0.004, kind: 'sparkle' })
  }
  exportLights(camera, W, H, pts)

  const comp = makeComposer(renderer, scene, camera, W, H, {
    bloom: [0.28, 0.22, 7.0], rays: true,
    streak: q.get('nostreak') ? null : { threshold: 40, amount: 0.12, len: 0.2, tint: 0xffd2b0 },
    grade: { vignette: 0.42, lift: [0.035, 0.015, 0.03], gain: [1.03, 0.98, 0.95], ca: 0.0015 },
  })
  comp.setRays(raysTex, 0.32, 0xffc890)
  comp.render()
}
