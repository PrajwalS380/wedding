// A3 · Sunrise for the muhurta: soft morning sky and mist, gopuram & palms in haze, a brass kalasha
// backlit on a granite ledge, a mango-leaf & marigold thoranam across the top, sunbeams and shallow focus.
import { THREE, rng, makeNoise, canvasTex, makeRenderer, makeComposer, makeRays, screenPos, mergeGeometries, exportLights } from '../lib/common.js'
import { makeSky, gopuramGeometry, palmGeometry, treeGeometry } from '../lib/sky.js'
import { mangoLeafGeo, leafTexture, marigolds, scatteredPetals, flameMaterial, haloMaterial, smokeMaterial } from '../lib/flora.js'
import { lampGeometry } from './daylight.js'
import { makeKalasha } from '../lib/kalasha.js'

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const r = rng(23)
  const renderer = makeRenderer(W, H, { exposure: +(q.get('exp') || 0.42) })
  const scene = new THREE.Scene()
  const land = (q.get('o') || 'portrait') === 'landscape'
  const camera = new THREE.PerspectiveCamera(+(q.get('fov') || (land ? 30 : 38)), W / H, 0.02, 9000)
  if (land) { camera.position.set(-0.5, 1.13, 0.62); camera.lookAt(-0.26, 1.06, -1.0) }
  else { camera.position.set(0, +(q.get('cy')||1.12), +(q.get('cz')||0.18)); camera.lookAt(0, +(q.get('ly')||1.07), -1.0) }

  const sky = makeSky({ elevation: +(q.get('elev') || 5), azimuth: +(q.get('az') || (land ? 196 : 186.5)), turbidity: 3.0, rayleigh: 1.7, mie: 0.0035, mieG: +(q.get('mg')||0.74),
    clouds: { coverage: 0.42, density: 0.45, scale: 0.0003, elevation: 0.6, time: 520 }, warmClouds: 0.6,
    tintLow: [1.12, 0.92, 0.8], tintHigh: [0.9, 0.96, 1.12], tintRange: [0.0, 0.5], discScale: 0.08 })
  sky.layers.enable(1)
  scene.add(sky)
  const sunDir = sky.userData.sunDir

  // environment for brass & leaves from the sky itself
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene(); envScene.add(sky)
  const env = pmrem.fromScene(envScene, 0, 1, 9000).texture
  scene.add(sky)

  scene.fog = new THREE.FogExp2(new THREE.Color(q.get('haze') || '#d9b9a0'), +(q.get('fd') || 0.0026))
  const sunL = new THREE.DirectionalLight(0xffd8a8, 3.2); sunL.position.copy(sunDir).multiplyScalar(50); scene.add(sunL)
  const fill = new THREE.DirectionalLight(0xffe2c4, +(q.get('fl')||1.8)); fill.position.set(1.2, 1.6, 3); scene.add(fill)
  scene.add(new THREE.HemisphereLight(0xcfd8ea, 0x6a5040, 0.6))

  // far silhouettes in morning haze
  const hazeMat = new THREE.MeshBasicMaterial({ color: 0x4a3832 })
  const sil = new THREE.Group()
  const gp = gopuramGeometry(rng(11))
  const gop = new THREE.Mesh(mergeGeometries(gp.geo), hazeMat)
  gop.position.set(+(q.get('gx') || (land ? 70 : 44)), -2, -235); gop.rotation.y = -0.2; sil.add(gop)
  ;[[-30, -150, 14, 2.5], [-24, -175, 12, -2], [-50, -190, 13, 2], [70, -170, 13, -2.2], [12, -260, 12, 1.4]].forEach(([x, z, h, lean], i) => {
    const m = new THREE.Mesh(mergeGeometries(palmGeometry(rng(140 + i), { height: h, lean, fronds: 24 })), hazeMat)
    m.position.set(x, -2, z); sil.add(m)
  })
  for (let i = 0; i < 80; i++) {
    const tr = rng(400 + i)
    const m = new THREE.Mesh(mergeGeometries(treeGeometry(tr, { h: 6 + tr() * 8, w: 7 + tr() * 8 })), hazeMat)
    m.position.set(-300 + i * 7.5, -2, -380 - tr() * 220); sil.add(m)
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshBasicMaterial({ color: 0x8c7464 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -2; sil.add(ground)
  // low morning mist drifting over the fields
  const mistTex = canvasTex(0, (ctx, w, h) => { const N2 = makeNoise(77); const img = ctx.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = N2.fbm(x / 70, y / 30); const i = (y * w + x) * 4; img.data[i] = 255; img.data[i + 1] = 236; img.data[i + 2] = 214; img.data[i + 3] = Math.max(0, Math.min(255, (n - 0.35) * 600)) } ctx.putImageData(img, 0, 0) }, { w: 512, h: 512, repeat: true })
  mistTex.repeat.set(6, 6)
  for (const [y, o] of [[-1.4, 0.5], [-0.4, 0.35], [0.6, 0.22]]) {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: o, depthWrite: false, fog: true }))
    mist.rotation.x = -Math.PI / 2; mist.position.set(0, y, -560); sil.add(mist)
  }
  sil.traverse((o) => o.isMesh && o.layers.set(2))
  scene.add(sil)

  // granite ledge with petals
  const N = makeNoise(31)
  const graniteTex = canvasTex(0, (ctx, w, h) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = N.fbm(x / 60, y / 60), s = N.n2(x / 1.6, y / 1.6)
      let v = 0.42 + 0.25 * (n - 0.5)
      if (s > 0.8) v -= 0.22; else if (s < 0.12) v += 0.18
      const i = (y * w + x) * 4
      img.data[i] = 150 * v + 20; img.data[i + 1] = 138 * v + 18; img.data[i + 2] = 130 * v + 18; img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, { w: 1024, h: 512, repeat: true })
  graniteTex.repeat.set(2, 1)
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(4, 0.12, 1.8), new THREE.MeshStandardMaterial({ map: graniteTex, roughness: 0.38, envMap: env, envMapIntensity: 0.5 }))
  ledge.position.set(0, 0.86, -0.45)
  ledge.layers.enable(2)
  scene.add(ledge)
  const top = 0.92
  const kalasha = makeKalasha({ envMap: env, seed: 5 })
  kalasha.position.set(+(q.get('kx') || 0.02), top, -1.0)
  kalasha.rotation.y = 0.12
  scene.add(kalasha)
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xd6a347, metalness: 1, roughness: 0.22, envMap: env })
  const live = []
  for (const sx of [-1, 1]) {
    const lamp = new THREE.Mesh(lampGeometry(), lampMat)
    lamp.scale.setScalar(0.3)
    lamp.position.set(kalasha.position.x + sx * (land ? 0.34 : 0.255), top, -1.06)
    scene.add(lamp)
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.6
      const p = new THREE.Vector3(lamp.position.x + Math.cos(a) * 0.138 * 0.3, top + 0.872 * 0.3, lamp.position.z + Math.sin(a) * 0.138 * 0.3)
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flameMaterial(k * 1.3 + sx)); f.position.copy(p); f.scale.set(0.009, 0.026, 1); f.material.uniforms.intensity.value = 0.8; scene.add(f)
      const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(0xffa040, 0.1, 2.4)); h.position.copy(p).add(new THREE.Vector3(0, 0.01, 0)); h.scale.setScalar(0.08); scene.add(h)
      live.push({ pos: p.clone().add(new THREE.Vector3(0, 0.012, 0)), radius: 0.03, kind: 'flame' })
    }
  }
  // incense: three sticks in a small brass holder, smoke curling up through the sunlight
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.03, 16), lampMat)
  const hx = kalasha.position.x + (land ? -0.6 : -0.19)
  holder.position.set(hx, top + 0.015, land ? -0.92 : -0.78); scene.add(holder)
  for (let k = 0; k < 3; k++) {
    const tilt = (k - 1) * 0.16
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.22, 5), new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.9 }))
    stick.position.set(hx + Math.sin(tilt) * 0.11, top + 0.03 + 0.11, land ? -0.92 : -0.78); stick.rotation.z = -tilt; scene.add(stick)
    const tip = new THREE.Vector3(hx + Math.sin(tilt) * 0.22, top + 0.03 + Math.cos(tilt) * 0.22, land ? -0.92 : -0.78)
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 6, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.2, 0.3) })); ember.position.copy(tip); scene.add(ember)
    const smoke = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), smokeMaterial(k * 2.7 + 1, 3.2)); smoke.position.copy(tip); smoke.scale.set(0.22, 0.6, 1); scene.add(smoke)
  }
  // a string of jasmine buds around the plate
  const bud = new THREE.SphereGeometry(1, 10, 8); bud.scale(0.0045, 0.0045, 0.012)
  const jas = new THREE.InstancedMesh(bud, new THREE.MeshPhysicalMaterial({ color: 0xfbf8f0, roughness: 0.45, envMap: env }), 220)
  const jm = new THREE.Matrix4()
  for (let i = 0; i < 220; i++) { const a = (i / 220) * Math.PI * 2, side = i % 2 ? 1 : -1, rr = 0.235 + side * 0.006; jm.compose(new THREE.Vector3(kalasha.position.x + Math.cos(a) * rr, top + 0.008, kalasha.position.z + Math.sin(a) * rr), new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.8, -a + side * 0.9, side * 0.4)), new THREE.Vector3(1, 1, 1)); jas.setMatrixAt(i, jm) }
  scene.add(jas)

  const spots = []
  const pal = ['#ff8a00', '#ffb000', '#e86a00', '#b3122a', '#f4ede0']
  for (let k = 0; k < 120; k++) {
    const x = (r() - 0.5) * 1.2, z = -0.2 - r() * 1.0
    if (Math.hypot(x, z + 1.0) < 0.2) continue
    spots.push({ pos: new THREE.Vector3(x, top + 0.001, z), size: 0.012 + r() * 0.01, color: pal[Math.floor(r() * pal.length)] })
  }
  scene.add(scatteredPetals(spots, { seed: 6, envMap: env }))

  // thoranam: mango leaves and marigolds on a string across the top, close to the lens
  const D = 0.75
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanH = tanV * camera.aspect
  const toWorld = (xn, yn) => camera.localToWorld(new THREE.Vector3(xn * D * tanH, yn * D * tanV, -D))
  camera.updateMatrixWorld()
  const strPts = []
  for (let i = 0; i <= 40; i++) { const t = i / 40; strPts.push(toWorld(-1.3 + 2.6 * t, 1.03 - 0.08 * (1 - Math.pow(2 * t - 1, 2)))) }
  const str = new THREE.CatmullRomCurve3(strPts)
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(str, 120, 0.0015, 5), new THREE.MeshStandardMaterial({ color: 0xc9a050, roughness: 0.5, metalness: 0.4 })))
  const tLeafMat = new THREE.MeshStandardMaterial({ map: leafTexture({ base: '#24501a', light: '#4a8a2e', lateral: 16, seed: 9 }), roughness: 0.35, side: THREE.DoubleSide, envMap: env, emissive: 0x3a5a10, emissiveIntensity: 0.25 })
  const flowers = []
  const len = str.getLength()
  const step = 0.024
  for (let k = 0; k * step < len; k++) {
    const p = str.getPointAt(Math.min(1, (k * step) / len))
    if (k % 3 !== 2) {
      const g = mangoLeafGeo({ width: 0.22, fold: 0.18, bend: 0.12, twist: (r() - 0.5) * 0.6 })
      g.scale(0.07, 0.07, 0.07); g.rotateZ(Math.PI)
      const leaf = new THREE.Mesh(g, tLeafMat)
      leaf.position.copy(p)
      leaf.quaternion.copy(camera.quaternion)
      leaf.rotateY((r() - 0.5) * 1.2); leaf.rotateX((r() - 0.5) * 0.5); leaf.rotateZ((r() - 0.5) * 0.25)
      scene.add(leaf)
    } else {
      flowers.push({ pos: p.clone().add(new THREE.Vector3(0, -0.012, 0)), size: 0.019, yellow: k % 2 === 0 })
      flowers.push({ pos: p.clone().add(new THREE.Vector3(0, -0.036, 0)), size: 0.016, yellow: k % 2 === 1 })
    }
  }
  scene.add(marigolds(flowers, { petals: 240, seed: 15, envMap: env }))
  camera.layers.enableAll()

  // sunbeams through the haze, palms, leaves and kalasha
  const rays = makeRays(renderer, W, H)
  const black = new THREE.MeshBasicMaterial({ color: 0 })
  const raysTex = rays.run((rt) => {
    const fog = scene.fog; scene.fog = null
    sky.material.uniforms.occMode.value = 1
    renderer.setRenderTarget(rt); renderer.setClearColor(0, 1); renderer.clear()
    renderer.autoClear = false
    renderer.render(scene, camera) // sky draws first (big), others overwrite below with black
    scene.overrideMaterial = black
    sky.visible = false
    renderer.render(scene, camera)
    sky.visible = true
    scene.overrideMaterial = null
    renderer.autoClear = true
    sky.material.uniforms.occMode.value = 0
    scene.fog = fog
  }, screenPos(camera.position.clone().add(sunDir.clone().multiplyScalar(1000)), camera), { weight: 0.034, decay: 0.975 })

  live.push({ pos: camera.position.clone().add(sunDir.clone().multiplyScalar(1000)), radius: 1000 * 0.06, kind: 'glow' })
  exportLights(camera, W, H, live)
  const comp = makeComposer(renderer, scene, camera, W, H, {
    bloom: [0.22, 0.3, +(q.get('bt') || 8)], rays: true,
    dof: q.get('nodof') ? null : { focus: +(q.get('focus') || 1.45), aperture: +(q.get('ap') || 0.006), maxblur: +(q.get('mb') || 0.008) },
    grade: { vignette: 0.32, lift: [0.012, 0.01, 0.016], gain: [1.03, 1.0, 0.97], ca: 0.0008 },
  })
  comp.setRays(raysTex, +(q.get('rays') || 0.3), 0xffe0b0)
  comp.render()
}
