// AARATI · the Aaratakshate, for its arch: a brass aarati plate on red silk with a gold zari border.
// A panchaarati (five-wick lamp on a turned stand) burns at the centre; around it a bowl of akshate
// (turmeric rice), kumkum and haldi, marigolds, rose petals and a string of jasmine. Behind, out of
// focus, the strings of lights of the evening reception. Upright (arch-shaped) frame.
import { THREE, rng, makeNoise, canvasTex, makeRenderer, makeComposer, exportLights } from '../lib/common.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { marigolds, scatteredPetals, flameMaterial, haloMaterial, smokeMaterial, jasmineStrand, riceGeo, riceMaterial, powderMound } from '../lib/flora.js'
import { brassMaterial, plateEngraving, silkWeave } from '../lib/materials.js'

/** Out-of-focus light: a soft round disc, a little brighter at the rim (no polygon edges). */
const softBokeh = (color, strength) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { color: { value: new THREE.Color(color) }, strength: { value: strength } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); vec2 sc=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)); mv.xy+=(uv-.5)*sc; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 color; uniform float strength; varying vec2 vUv;
    void main(){ float r=length(vUv-.5)*2.; float disc=smoothstep(1.0,0.72,r); float rim=smoothstep(0.55,0.92,r)*disc*0.35;
      gl_FragColor=vec4(color*(disc*(0.42+0.12*(1.-r))+rim)*strength,1.); }`,
})

const lathe = (prof, seg = 96) => new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), seg)

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const r = rng(5)
  const N = makeNoise(9)
  const renderer = makeRenderer(W, H, { shadows: true, exposure: +(q.get('exp') || 0.9) })
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0507)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.42

  const camera = new THREE.PerspectiveCamera(+(q.get('fov') || 30), W / H, 0.02, 40)
  const dist = +(q.get('d') || 1.3), el = THREE.MathUtils.degToRad(+(q.get('el') || 15))
  const target = new THREE.Vector3(0, +(q.get('ty') || 0.15), 0)
  camera.position.set(0, target.y + Math.sin(el) * dist, Math.cos(el) * dist)
  camera.lookAt(target)
  camera.updateMatrixWorld()

  /* ---------------- red silk with a gold zari border */
  const silk = canvasTex(0, (ctx, w, h) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const weave = 0.92 + 0.08 * Math.sin(x * 1.9) * Math.sin(y * 1.7)
      const n = N.fbm(x / 60, y / 60)
      const band = y > h * 0.343 && y < h * 0.383
      const edge = (y > h * 0.337 && y <= h * 0.343) || (y >= h * 0.383 && y < h * 0.389)
      const i = (y * w + x) * 4
      if (band) {
        // zari: woven gold with a repeating mango (paisley) motif
        const mx = (x % 48) / 48, my = (y - h * 0.343) / (h * 0.04)
        const motif = Math.exp(-((mx - 0.5) ** 2 + (my - 0.5) ** 2) * 30) + Math.exp(-((mx - 0.62) ** 2 + (my - 0.32) ** 2) * 120) * 0.6
        const g = (0.72 + 0.28 * weave) * (0.8 + 0.2 * n) * (1 - 0.35 * motif)
        img.data[i] = 214 * g; img.data[i + 1] = 162 * g; img.data[i + 2] = 72 * g
      } else if (edge) {
        img.data[i] = 120; img.data[i + 1] = 10; img.data[i + 2] = 22
      } else {
        const v = weave * (0.82 + 0.25 * n)
        img.data[i] = 112 * v; img.data[i + 1] = 6 * v; img.data[i + 2] = 16 * v
      }
      img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, { w: 1024, h: 1024, repeat: true })
  const zariMetal = canvasTex(0, (ctx, w, h) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fff'; ctx.fillRect(0, h * 0.343, w, h * 0.04) }, { w: 64, h: 1024, srgb: false, repeat: true })
  const weave = silkWeave({ seed: 4 }); weave.repeat.set(220, 220)
  const clothGeo = new THREE.PlaneGeometry(3, 3, 160, 160)
  clothGeo.translate(0, -0.85, 0) // far edge at z = -0.65
  const cp = clothGeo.attributes.position
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), y = cp.getY(i)
    const d = Math.hypot(x, y)
    // soft folds radiating away from under the plate
    cp.setZ(i, d > 0.32 ? (0.007 * Math.sin(x * 7 + Math.sin(y * 4) * 2.5) + 0.004 * (N.fbm(x * 3 + 5, y * 3) - 0.5)) * Math.min(1, (d - 0.32) * 3) : 0)
  }
  clothGeo.computeVertexNormals()
  silk.repeat.set(3, 1)
  zariMetal.repeat.set(1, 1)
  const cloth = new THREE.Mesh(clothGeo, new THREE.MeshPhysicalMaterial({ map: silk, roughness: 0.55, sheen: 0.55, sheenColor: new THREE.Color(0xa8303c), sheenRoughness: 0.4, metalnessMap: zariMetal, metalness: 0.7, bumpMap: weave, bumpScale: 0.3 }))
  cloth.rotation.x = -Math.PI / 2
  cloth.receiveShadow = true
  scene.add(cloth)

  /* ---------------- brass plate */
  const brass = brassMaterial({ seed: 2, roughness: 0.24 })
  const brassDark = brassMaterial({ seed: 5, color: 0xb98633, roughness: 0.32 })
  const engr = canvasTex(0, (ctx, w, h) => {
    ctx.fillStyle = '#5a5a5a'; ctx.fillRect(0, 0, w, h)
    const cx = w / 2
    for (let rr = 20; rr < w / 2; rr += 3) { ctx.strokeStyle = `rgba(${rr % 9 ? 90 : 30},${rr % 9 ? 90 : 30},${rr % 9 ? 90 : 30},0.5)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cx, rr, 0, Math.PI * 2); ctx.stroke() }
    ctx.strokeStyle = 'rgba(20,20,20,0.8)'; ctx.lineWidth = 3
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * w * 0.4, cx + Math.sin(a) * w * 0.4, w * 0.035, w * 0.012, a, 0, Math.PI * 2); ctx.stroke() }
    for (const rr of [0.28, 0.36, 0.44]) { ctx.beginPath(); ctx.arc(cx, cx, w * rr, 0, Math.PI * 2); ctx.stroke() }
  }, { w: 1024, h: 1024, srgb: false })
  const plate = new THREE.Mesh(lathe([[0, 0], [0.2, 0], [0.225, 0.004], [0.24, 0.016], [0.247, 0.024], [0.245, 0.028], [0.236, 0.026], [0.222, 0.012], [0.2, 0.006], [0, 0.006]], 160), brass)
  plate.castShadow = true; plate.receiveShadow = true; scene.add(plate)
  const engraving = plateEngraving()
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.2, 160), brassMaterial({ seed: 9, color: 0xd2a048, roughness: 0.28 }))
  inner.material.bumpMap = engraving; inner.material.bumpScale = 0.8
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.0065; inner.receiveShadow = true; scene.add(inner)
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0045, 16, 12), brass, 150)
  const m = new THREE.Matrix4()
  for (let i = 0; i < 150; i++) { const a = (i / 150) * Math.PI * 2; m.makeTranslation(Math.cos(a) * 0.246, 0.028, Math.sin(a) * 0.246); beads.setMatrixAt(i, m) }
  beads.castShadow = true; scene.add(beads)

  /* ---------------- panchaarati: turned stand with a lotus tray of five lamps */
  const stand = new THREE.Group()
  const standProf = [[0, 0], [0.055, 0], [0.058, 0.004], [0.05, 0.01], [0.034, 0.016], [0.02, 0.026], [0.014, 0.04], [0.022, 0.048], [0.013, 0.056], [0.011, 0.085], [0.019, 0.092], [0.012, 0.1], [0.012, 0.118], [0.02, 0.124], [0.016, 0.13], [0.0, 0.13]]
  const sGeo = lathe(standProf, 128); const sMesh = new THREE.Mesh(sGeo, brass); sMesh.castShadow = true; stand.add(sMesh)
  // lotus tray: eight petals around a shallow dish
  const tray = new THREE.Mesh(lathe([[0, 0], [0.03, 0], [0.052, 0.006], [0.07, 0.016], [0.074, 0.022], [0.068, 0.02], [0.05, 0.012], [0.0, 0.008]], 64), brass)
  tray.position.y = 0.128; tray.castShadow = true; stand.add(tray)
  for (let k = 0; k < 8; k++) {
    const pg = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    pg.scale(0.022, 0.006, 0.042); pg.rotateX(-0.5); pg.translate(0, 0, 0.056)
    const petal = new THREE.Mesh(pg, brassDark)
    petal.rotation.y = (k / 8) * Math.PI * 2 + Math.PI / 8
    petal.position.y = 0.133
    petal.castShadow = true
    stand.add(petal)
  }
  // five oval lamp cups with ghee and cotton wicks
  const flames = []
  const cupGeo = lathe([[0, 0], [0.008, 0], [0.016, 0.004], [0.019, 0.011], [0.018, 0.013], [0.0, 0.009]], 32)
  cupGeo.scale(1, 1, 1.25)
  const ghee = new THREE.MeshStandardMaterial({ color: 0xf2c46a, roughness: 0.15, metalness: 0, emissive: 0x6a3a08, emissiveIntensity: 0.6 })
  const wickMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 })
  const cups = [[0, 0]]
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; cups.push([Math.cos(a) * 0.048, Math.sin(a) * 0.048]) }
  cups.forEach(([x, z], k) => {
    const lift = k === 0 ? 0.016 : 0.0
    const cup = new THREE.Mesh(cupGeo, brass); cup.position.set(x, 0.138 + lift, z); cup.rotation.y = Math.atan2(x, z); cup.castShadow = true; stand.add(cup)
    if (k === 0) { const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.01, 0.016, 16), brass); neck.position.set(0, 0.138, 0); stand.add(neck) }
    const oil = new THREE.Mesh(new THREE.CircleGeometry(0.015, 24), ghee); oil.rotation.x = -Math.PI / 2; oil.scale.y = 1.2; oil.position.set(x, 0.148 + lift, z); stand.add(oil)
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0026, 0.01, 10), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 1 })); wick.position.set(x, 0.151 + lift, z); stand.add(wick)
    const char = new THREE.Mesh(new THREE.ConeGeometry(0.0018, 0.004, 10), wickMat); char.position.set(x, 0.1575 + lift, z); stand.add(char)
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.0009, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff7a20 })); ember.position.set(x, 0.159 + lift, z); stand.add(ember)
    flames.push(new THREE.Vector3(x, 0.157 + lift, z))
  })
  scene.add(stand)
  flames.forEach((p, i) => {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flameMaterial(i * 1.7 + 0.4))
    f.material.uniforms.intensity.value = 1.1
    f.position.copy(p); f.scale.set(0.02 + r() * 0.003, 0.062 + r() * 0.01, 1)
    scene.add(f)
    const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(0xff9a3a, 0.12, 2.6))
    h.position.copy(p).add(new THREE.Vector3(0, 0.022, 0)); h.scale.setScalar(0.11)
    scene.add(h)
  })
  // the five flames light everything around them
  const flameLight = new THREE.PointLight(0xffa24a, +(q.get('fl') || 0.3), 3, 2)
  flameLight.position.set(0, 0.19, 0); flameLight.castShadow = true
  flameLight.shadow.mapSize.set(1024, 1024); flameLight.shadow.radius = 8; flameLight.shadow.bias = -0.002
  scene.add(flameLight)
  const flameFill = new THREE.PointLight(0xffb066, 0.12, 2, 2); flameFill.position.set(0.0, 0.24, 0.12); scene.add(flameFill)
  // a thread of smoke from the camphor
  const smoke = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), smokeMaterial(3.1, 0.22)); smoke.position.set(0.004, 0.2, 0); smoke.scale.set(0.06, 0.26, 1); scene.add(smoke)

  /* ---------------- akshate, kumkum, haldi */
  const bowlGeo = lathe([[0, 0], [0.02, 0], [0.03, 0.006], [0.036, 0.02], [0.037, 0.024], [0.034, 0.023], [0.028, 0.012], [0, 0.01]], 64)
  const rice = riceGeo()
  const riceMat = riceMaterial()
  const grains = new THREE.InstancedMesh(rice, riceMat, 1400)
  const col = new THREE.Color()
  let gi = 0
  const addGrain = (p) => {
    m.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(1, 1, 1))
    grains.setMatrixAt(gi, m)
    col.setHSL(0.11 + r() * 0.03, 0.8, 0.5 + r() * 0.12) // turmeric-yellow rice
    if (r() < 0.12) col.setHSL(0.0, 0.75, 0.38) // a few kumkum-red grains
    grains.setColorAt(gi++, col)
  }
  const akX = -0.1, akZ = 0.085
  const ak = new THREE.Mesh(bowlGeo, brass); ak.position.set(akX, 0.006, akZ); ak.scale.setScalar(1.15); ak.castShadow = true; scene.add(ak)
  for (let i = 0; i < 1100; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.036; const hh = 0.026 * (1 - (rr / 0.036) ** 2) + 0.018; addGrain(new THREE.Vector3(akX + Math.cos(a) * rr, 0.006 + hh + r() * 0.002, akZ + Math.sin(a) * rr)) }
  for (let i = 0; i < 300; i++) { const a = r() * Math.PI * 2, rr = 0.06 + r() * 0.13; addGrain(new THREE.Vector3(Math.cos(a) * rr, 0.0085, Math.sin(a) * rr)) }
  grains.count = gi; grains.instanceColor.needsUpdate = true; grains.castShadow = true; grains.receiveShadow = true; scene.add(grains)
  ;[[0.105, 0.09, '#9a0a18'], [0.13, -0.02, '#e3a00e']].forEach(([x, z, c]) => {
    const bowl = new THREE.Mesh(bowlGeo, brass); bowl.position.set(x, 0.006, z); bowl.scale.setScalar(0.8); bowl.castShadow = true; scene.add(bowl)
    bowl.receiveShadow = true
    const powder = powderMound({ radius: 0.0235, height: 0.014, color: c, seed: x > 0.11 ? 4 : 7 })
    powder.position.set(x, 0.006 + 0.0075, z); scene.add(powder)
  })

  /* ---------------- flowers */
  scene.add(marigolds([
    { pos: new THREE.Vector3(-0.14, 0.03, -0.06), size: 0.045 },
    { pos: new THREE.Vector3(-0.08, 0.028, -0.12), size: 0.04, yellow: true },
    { pos: new THREE.Vector3(0.06, 0.028, -0.13), size: 0.042 },
    { pos: new THREE.Vector3(0.16, 0.028, 0.06), size: 0.036, yellow: true },
  ], { petals: 240, seed: 6, size: 1 }))
  const rimPts = []
  for (let i = 0; i <= 24; i++) { const a = 2.0 + (i / 24) * Math.PI * 1.3; const rad = 0.211 + 0.004 * Math.sin(i * 1.7); rimPts.push(new THREE.Vector3(Math.cos(a) * rad, 0.0105, Math.sin(a) * rad)) }
  scene.add(jasmineStrand(new THREE.CatmullRomCurve3(rimPts), { seed: 8, lift: 0.3 }))
  const spots = []
  for (let k = 0; k < 26; k++) { const a = r() * Math.PI * 2, rr = 0.07 + r() * 0.3; spots.push({ pos: new THREE.Vector3(Math.cos(a) * rr, rr > 0.25 ? 0.004 : 0.009, Math.sin(a) * rr * 0.9 + 0.03), size: 0.013 + r() * 0.007, color: k % 4 ? '#a80f26' : '#ff8a00' }) }
  scene.add(scatteredPetals(spots, { seed: 4 }))

  /* ---------------- akshate and petals in the air, as if just showered */
  const airGrains = new THREE.InstancedMesh(rice, riceMat, 44)
  for (let i = 0; i < 44; i++) {
    const p = new THREE.Vector3((r() - 0.5) * 0.4, 0.09 + Math.pow(r(), 1.4) * 0.3, 0.02 + r() * 0.3)
    m.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(1.1, 1.1, 1.1))
    airGrains.setMatrixAt(i, m)
    col.setHSL(0.11 + r() * 0.03, 0.85, 0.52 + r() * 0.1); if (r() < 0.15) col.setHSL(0.0, 0.75, 0.4)
    airGrains.setColorAt(i, col)
  }
  airGrains.instanceColor.needsUpdate = true
  scene.add(airGrains)
  const airPetals = []
  for (let k = 0; k < 7; k++) airPetals.push({ pos: new THREE.Vector3((r() - 0.5) * 0.46, 0.12 + r() * 0.3, 0.0 + r() * 0.36), size: 0.014 + r() * 0.006, color: k % 3 ? '#b01028' : '#ff8a00' })
  const petalsUp = scatteredPetals(airPetals, { seed: 12 })
  for (let i = 0; i < airPetals.length; i++) { petalsUp.getMatrixAt(i, m); const pp = new THREE.Vector3(), qq = new THREE.Quaternion(), ss = new THREE.Vector3(); m.decompose(pp, qq, ss); qq.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3))); m.compose(pp, qq, ss); petalsUp.setMatrixAt(i, m) }
  scene.add(petalsUp)

  /* ---------------- the reception behind: strings of lights, out of focus */
  const lights = []
  const bulbs = new THREE.Group()
  const strings = [[-1.4, 0.44, 1.0, 0.2], [-1.8, 0.66, 1.4, 0.26], [-2.3, 0.36, 1.3, 0.14], [-2.9, 0.86, 1.9, 0.3], [-3.3, 0.52, 2.1, 0.18]]
  strings.forEach(([z, y, half, sag], si) => {
    const n = 34 + si * 8
    const wave = r() * 6
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * 2 - 1
      const p = new THREE.Vector3(t * half * (1 - z * 0.22) + (r() - 0.5) * 0.02, y - sag * (1 - t * t) + 0.02 * Math.sin(t * 5 + wave), z + (r() - 0.5) * 0.15)
      const warm = r()
      const c = warm > 0.3 ? 0xffc27a : warm > 0.12 ? 0xfff0d8 : 0xff9a5a
      const size = (0.022 + r() * 0.03) * (-z / 1.5)
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softBokeh(c, 0.3 + r() * 0.4))
      b.position.copy(p); b.scale.setScalar(size); bulbs.add(b)
      if (i % 4 === 0) lights.push({ pos: p, radius: size * 0.45, kind: 'bulb' })
    }
  })
  // a few large soft lights much further back (stage, lamps)
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Vector3((r() - 0.5) * 3.2, 0.15 + r() * 0.8, -3.4 - r())
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softBokeh(r() > 0.5 ? 0xff8a4a : 0xffb56a, 0.12))
    b.position.copy(p); b.scale.setScalar(0.22 + r() * 0.16); bulbs.add(b)
  }
  scene.add(bulbs)
  // a deep maroon drape far behind, barely lit
  const drape = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ color: 0x1a060b }))
  drape.position.set(0, 1, -4.5); scene.add(drape)
  scene.add(new THREE.HemisphereLight(0x4a2a40, 0x200808, 0.35))
  const rim = new THREE.DirectionalLight(0xffc89a, 0.5); rim.position.set(-0.4, 0.6, -1); scene.add(rim)

  flames.forEach((p) => lights.push({ pos: p.clone().add(new THREE.Vector3(0, 0.02, 0)), radius: 0.03, kind: 'flame' }))
  exportLights(camera, W, H, lights)

  const comp = makeComposer(renderer, scene, camera, W, H, {
    bloom: q.get('nobloom') ? null : [+(q.get('bs') || 0.2), 0.4, +(q.get('bt') || 1.6)],
    ao: q.get('noao') ? null : { radius: 0.02, thickness: 0.012, intensity: 0.9 },
    dof: q.get('nodof') ? null : { focus: dist, aperture: +(q.get('ap') || 0.006), maxblur: 0.012 },
    grade: { vignette: 0.42, lift: [0.02, 0.008, 0.012], gain: [1.03, 0.99, 0.95], ca: 0.0008 },
  })
  comp.render()
}
