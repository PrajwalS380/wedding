// A4 · Wedding-hall entrance in daylight: banana plants with torn, backlit leaves, a curtain of marigold & jasmine
// strands, a lit brass kuthuvilakku, a powder rangoli on polished stone, warm out-of-focus hall lights.
import { THREE, rng, makeNoise, canvasTex, makeRenderer, makeComposer, exportLights } from '../lib/common.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { marigolds, bananaLeafGeo, leafTexture, flameMaterial, haloMaterial, bokehMaterial, mangoLeafGeo } from '../lib/flora.js'
import { makeGlossFloor } from '../lib/water.js'

export function lampGeometry() {
  const prof = [[0, 0], [0.16, 0], [0.17, 0.01], [0.15, 0.03], [0.1, 0.06], [0.06, 0.1], [0.04, 0.13], [0.05, 0.15], [0.03, 0.17], [0.022, 0.2], [0.022, 0.42], [0.045, 0.45], [0.05, 0.48], [0.03, 0.5], [0.022, 0.53], [0.022, 0.72], [0.04, 0.75], [0.026, 0.78], [0.03, 0.8], [0.13, 0.82], [0.145, 0.85], [0.13, 0.86], [0.05, 0.86], [0.02, 0.88], [0.012, 0.92], [0.03, 0.96], [0.02, 1.0], [0.004, 1.06], [0, 1.08]]
  return new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 64)
}

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const r = rng(31)
  const renderer = makeRenderer(W, H, { exposure: +(q.get('exp') || 0.95) })
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env
  scene.environmentIntensity = 0.55
  scene.background = new THREE.Color(0x2a1a10)
  const land = (q.get('o') || 'portrait') === 'landscape'
  const camera = new THREE.PerspectiveCamera(+(q.get('fov') || (land ? 46 : 40)), W / H, 0.05, 60)
  if (land) { camera.position.set(0.05, 1.05, 3.6); camera.lookAt(0.05, 1.18, 0) }
  else { camera.position.set(0, +(q.get('cy')||0.98), +(q.get('cz')||3.25)); camera.lookAt(0, +(q.get('ly')||1.22), 0) }

  // warm interior behind: soft wall gradient + out-of-focus lights
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: canvasTex(0, (ctx, w, h) => { const g = ctx.createRadialGradient(w * 0.5, h * 0.55, 10, w * 0.5, h * 0.55, w * 0.6); g.addColorStop(0, '#d39a5a'); g.addColorStop(0.5, '#7a4a28'); g.addColorStop(1, '#2a160c'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h) }, { w: 512, h: 256 }) }))
  wall.position.set(0, 2.2, -5); scene.add(wall)
  for (let i = 0; i < 30; i++) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bokehMaterial(i % 3 ? 0xffc070 : 0xffe0b0, 0.5 + r() * 0.4))
    b.position.set(-2.8 + r() * 5.6, 1.2 + r() * 2.4, -4.6 + r() * 0.4); b.scale.setScalar(0.18 + r() * 0.28); scene.add(b)
  }

  const drapeTex = canvasTex(0, (ctx, w, h) => {
    for (let x = 0; x < w; x++) { const f = 0.55 + 0.45 * Math.pow(Math.abs(Math.sin(x / w * Math.PI * 9)), 0.7); const c = [150 * f, 22 * f, 38 * f]; ctx.fillStyle = `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`; ctx.fillRect(x, 0, 1, h) }
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.12); g.addColorStop(0, '#e9c26a'); g.addColorStop(1, 'rgba(233,194,106,0)')
    ctx.fillStyle = '#d4a548'; ctx.fillRect(0, h * 0.86, w, h * 0.04); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h * 0.12)
    for (let x = 0; x < w; x += 18) { ctx.fillStyle = '#f2d48a'; ctx.beginPath(); ctx.arc(x + 9, h * 0.88, 3, 0, Math.PI * 2); ctx.fill() }
  }, { w: 1024, h: 512 })
  const drapeGeo = new THREE.PlaneGeometry(4.2, 3.2, 120, 1)
  const dp = drapeGeo.attributes.position
  for (let i = 0; i < dp.count; i++) dp.setZ(i, Math.sin(dp.getX(i) * 6.7) * 0.06)
  drapeGeo.computeVertexNormals()
  const drape = new THREE.Mesh(drapeGeo, new THREE.MeshStandardMaterial({ map: drapeTex, roughness: 0.35, metalness: 0.1, sheen: 1 }))
  drape.position.set(0, 1.6, -1.7); scene.add(drape)
  // floor + powder rangoli
  const floor = makeGlossFloor({ size: 30, W: W >> 1, H: H >> 1, base: 0x241c18, reflect: 0.32, blur: 0.006, speckle: 0.6 })
  scene.add(floor)
  const N = makeNoise(13)
  const rangoliTex = canvasTex(0, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    const ring = (rad, n, col, len, wid) => { for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; ctx.save(); ctx.translate(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, wid, len, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() } }
    ctx.fillStyle = '#f2ece0'; ctx.beginPath(); ctx.arc(cx, cy, w * 0.49, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#b3121f'; ctx.beginPath(); ctx.arc(cx, cy, w * 0.46, 0, Math.PI * 2); ctx.fill()
    ring(w * 0.4, 16, '#f0a20f', w * 0.07, w * 0.035)
    ring(w * 0.4, 16, '#ffffff', w * 0.03, w * 0.012)
    ctx.fillStyle = '#1f6b3a'; ctx.beginPath(); ctx.arc(cx, cy, w * 0.3, 0, Math.PI * 2); ctx.fill()
    ring(w * 0.22, 8, '#f6c21a', w * 0.08, w * 0.045)
    ring(w * 0.22, 8, '#e05a10', w * 0.05, w * 0.025)
    ctx.fillStyle = '#7a1630'; ctx.beginPath(); ctx.arc(cx, cy, w * 0.1, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ffffff'; for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * w * 0.475, cy + Math.sin(a) * w * 0.475, w * 0.008, 0, Math.PI * 2); ctx.fill() }
    // powder grain
    const img = ctx.getImageData(0, 0, w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; const g = 0.82 + 0.3 * N.n2(x / 1.3, y / 1.3); for (let k = 0; k < 3; k++) img.data[i + k] *= g; const d = Math.hypot(x - cx, y - cy) / (w * 0.5); img.data[i + 3] = d > 0.995 ? 0 : 255 }
    ctx.putImageData(img, 0, 0)
  }, { w: 1024, h: 1024 })
  const rangoli = new THREE.Mesh(new THREE.CircleGeometry(0.55, 96), new THREE.MeshStandardMaterial({ map: rangoliTex, roughness: 1, transparent: true }))
  rangoli.rotation.x = -Math.PI / 2; rangoli.position.set(-0.2, 0.002, 0.55); scene.add(rangoli)

  // curtain of marigold and jasmine strands
  const flowers = []
  const jas = []
  const strands = 15
  for (let i = 0; i < strands; i++) {
    const x = -0.95 + (i / (strands - 1)) * 1.9
    const len = 1.15 + 0.75 * Math.pow(Math.abs(x) / 0.95, 1.6) + r() * 0.08
    const n = Math.floor(len / 0.052)
    for (let k = 0; k < n; k++) {
      const y = 2.55 - k * 0.052
      const z = -0.55 + (i % 2) * 0.05
      if (k % 7 === 6) jas.push(new THREE.Vector3(x, y, z))
      else flowers.push({ pos: new THREE.Vector3(x + (r() - 0.5) * 0.006, y, z), size: 0.03, yellow: (k + i) % 3 === 0 })
    }
    flowers.push({ pos: new THREE.Vector3(x, 2.55 - n * 0.052 - 0.01, -0.55), size: 0.036, yellow: false })
  }
  scene.add(marigolds(flowers, { petals: 200, seed: 21 }))
  const budGeo = new THREE.SphereGeometry(1, 10, 8); budGeo.scale(0.006, 0.016, 0.006)
  const buds = new THREE.InstancedMesh(budGeo, new THREE.MeshStandardMaterial({ color: 0xf8f4ea, roughness: 0.5, emissive: 0x2a2620, emissiveIntensity: 0.2 }), jas.length * 14)
  const m = new THREE.Matrix4()
  let bi = 0
  jas.forEach((p) => { for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; m.compose(p.clone().add(new THREE.Vector3(Math.cos(a) * 0.016, (r() - 0.5) * 0.01, Math.sin(a) * 0.016)), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2)), new THREE.Vector3(1, 1, 1)); buds.setMatrixAt(bi++, m) } })
  scene.add(buds)
  // top valance: a thick marigold swag across the doorway
  const swag = []
  for (let k = 0; k <= 60; k++) { const t = k / 60; swag.push({ pos: new THREE.Vector3(-1.05 + 2.1 * t, 2.62 - 0.18 * Math.sin(Math.PI * t), -0.48), size: 0.045, yellow: k % 4 === 0 }) }
  scene.add(marigolds(swag, { petals: 220, seed: 22 }))

  // mango-leaf thoranam with marigolds across the doorway
  const tLeaf = new THREE.MeshStandardMaterial({ map: leafTexture({ base: '#24501a', light: '#4a8a2e', lateral: 16, seed: 9 }), roughness: 0.4, side: THREE.DoubleSide, emissive: 0x16300a, emissiveIntensity: 0.3 })
  const tFlowers = []
  for (let k = 0; k <= 46; k++) {
    const t = k / 46, x = -1.25 + 2.5 * t, y = 2.86 - 0.12 * Math.sin(Math.PI * t)
    if (k % 3 !== 1) {
      const g = mangoLeafGeo({ width: 0.22, fold: 0.18, bend: 0.1, twist: (r() - 0.5) * 0.6 }); g.scale(0.17, 0.17, 0.17); g.rotateZ(Math.PI)
      const leaf = new THREE.Mesh(g, tLeaf); leaf.position.set(x, y, -0.3); leaf.rotation.set((r() - 0.5) * 0.4, (r() - 0.5) * 0.8, (r() - 0.5) * 0.25); scene.add(leaf)
    } else { tFlowers.push({ pos: new THREE.Vector3(x, y - 0.03, -0.27), size: 0.034, yellow: k % 2 === 0 }, { pos: new THREE.Vector3(x, y - 0.09, -0.27), size: 0.03, yellow: k % 2 === 1 }) }
  }
  scene.add(marigolds(tFlowers, { petals: 220, seed: 23 }))

  // banana plants framing the entrance
  const bananaTex = leafTexture({ base: '#3f7a26', light: '#78b24a', vein: 'rgba(210,240,170,0.35)', lateral: 70, seed: 17, edgeBrown: 0.6 })
  const bananaMat = new THREE.MeshStandardMaterial({ map: bananaTex, roughness: 0.55, side: THREE.DoubleSide, emissive: 0x2f4a12, emissiveIntensity: 0.35 })
  const stemTex = canvasTex(0, (ctx, w, h) => { ctx.fillStyle = '#9fb46a'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { ctx.fillStyle = ['#7f9650', '#b7c787', '#8a7444', '#6f8a42'][i % 4]; ctx.globalAlpha = 0.4; ctx.fillRect(r() * w, 0, 1 + r() * 4, h) } }, { w: 256, h: 64 })
  for (const s of [-1, 1]) {
    const plant = new THREE.Group()
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.085, 1.75, 16), new THREE.MeshStandardMaterial({ map: stemTex, roughness: 0.6 }))
    stem.position.y = 0.875; plant.add(stem)
    for (let k = 0; k < 6; k++) {
      const g = bananaLeafGeo(rng(60 + k + (s > 0 ? 10 : 0)), { width: 0.17, droop: 0.42 + r() * 0.2, splits: 10 })
      g.scale(1.25, 1.25, 1.25)
      const leaf = new THREE.Mesh(g, bananaMat)
      leaf.position.y = 1.62 + r() * 0.12
      leaf.rotation.order = 'YXZ'
      leaf.rotation.y = (k / 6) * Math.PI * 2 + (s > 0 ? 0.4 : 0)
      leaf.rotation.x = -0.45 - r() * 0.45
      plant.add(leaf)
    }
    // a bunch of green bananas in tiers and the purple banana flower below
    const bunch = new THREE.Group()
    const banMat = new THREE.MeshStandardMaterial({ color: 0x7a9a32, roughness: 0.45 })
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.75, 8), new THREE.MeshStandardMaterial({ color: 0x5f6e2c, roughness: 0.8 })); stalk.position.y = -0.3; bunch.add(stalk)
    for (let tier = 0; tier < 5; tier++) {
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 1.4 - 0.7
        const g = new THREE.CapsuleGeometry(0.016, 0.12, 4, 8); g.translate(0, 0.07, 0)
        const p2 = g.attributes.position; for (let i = 0; i < p2.count; i++) { const y = p2.getY(i); p2.setX(i, p2.getX(i) + 0.08 * y * y) } g.computeVertexNormals()
        const b = new THREE.Mesh(g, banMat)
        b.position.set(Math.sin(a) * 0.05, -0.05 - tier * 0.095, Math.cos(a) * 0.05)
        b.rotation.set(-0.5 + Math.cos(a) * -0.4, a, 0.9)
        bunch.add(b)
      }
    }
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), new THREE.MeshStandardMaterial({ color: 0x5a1a2e, roughness: 0.45 })); heart.scale.set(1, 2.1, 1); heart.position.y = -0.82; bunch.add(heart)
    for (let k = 0; k < 6; k++) { const br = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10, 0, Math.PI, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x6a1f38, roughness: 0.5, side: THREE.DoubleSide })); br.scale.set(1, 1.8, 0.5); br.position.y = -0.74; br.rotation.y = k * 1.05; br.rotation.x = 0.35; bunch.add(br) }
    bunch.position.set(-s * 0.16, 1.55, 0.12)
    bunch.rotation.z = s * 0.25
    plant.add(bunch)
    plant.position.set(s * 1.12, 0, 0.75)
    scene.add(plant)
  }

  // brass kuthuvilakku, lit
  const brass = new THREE.MeshStandardMaterial({ color: 0xd6a347, metalness: 1, roughness: 0.22 })
  const lamp = new THREE.Mesh(lampGeometry(), brass)
  lamp.position.set(0.62, 0, 0.95); scene.add(lamp)
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.6
    const p = new THREE.Vector3(0.62 + Math.cos(a) * 0.138, 0.872, 0.95 + Math.sin(a) * 0.138)
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flameMaterial(k * 1.3)); f.position.copy(p); f.scale.set(0.022, 0.06, 1); scene.add(f)
    const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(0xffa040, 0.12, 2.4)); h.position.copy(p).add(new THREE.Vector3(0, 0.02, 0)); h.scale.setScalar(0.22); scene.add(h)
  }
  const flameLight = new THREE.PointLight(0xff9a40, 0.9, 0, 2); flameLight.position.set(0.62, 0.92, 0.95); scene.add(flameLight)
  const live = []
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.6; live.push({ pos: new THREE.Vector3(0.62 + Math.cos(a) * 0.138, 0.9, 0.95 + Math.sin(a) * 0.138), radius: 0.06, kind: 'flame' }) }
  exportLights(camera, W, H, live)

  // soft sunbeams slanting in, with dust motes
  const beamTex = canvasTex(0, (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(0.5, 'rgba(255,236,200,1)'); g.addColorStop(1, 'rgba(255,240,210,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); const v = ctx.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.2, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = v; ctx.fillRect(0, 0, w, h) }, { w: 64, h: 256 })
  for (const [x, w2, o] of [[-0.7, 0.5, 0.16], [-0.2, 0.32, 0.12], [0.35, 0.6, 0.1]]) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(w2, 4.2), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false }))
    beam.position.set(x, 1.6, 0.3); beam.rotation.z = -0.42; scene.add(beam)
  }
  for (let i = 0; i < 70; i++) { const m2 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(0xfff0d0, 0.5, 2)); m2.position.set(-1 + r() * 2, 0.4 + r() * 2.3, 0.2 + r() * 0.8); m2.scale.setScalar(0.006 + r() * 0.01); scene.add(m2) }

  // daylight from the entrance (behind camera, upper left) + warm fill
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.4); sun.position.set(-2, 4, 4); scene.add(sun)
  const back = new THREE.DirectionalLight(0xffc890, 1.6); back.position.set(0.5, 3, -4); scene.add(back)

  const comp = makeComposer(renderer, scene, camera, W, H, {
    bloom: [0.45, 0.4, +(q.get('bt') || 1.4)],
    dof: q.get('nodof') ? null : { focus: +(q.get('focus') || 2.4), aperture: +(q.get('ap') || 0.008), maxblur: +(q.get('mb') || 0.01) },
    grade: { vignette: 0.38, lift: [0.015, 0.01, 0.006], gain: [1.03, 1.0, 0.95], ca: 0.0008 },
  })
  comp.render()
}
