// A4 · Thamboola plate (transparent background): engraved brass plate with beaded rim, glossy betel leaves,
// areca nuts (whole and halved), two bananas, kumkum & haldi in small bowls, a coiled jasmine string, rose petals.
import { THREE, rng, makeNoise, canvasTex, makeRenderer, makeComposer } from '../lib/common.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { betelLeafGeo, leafTexture, scatteredPetals, jasmineStrand, powderMound } from '../lib/flora.js'
import { brassMaterial, plateEngraving } from '../lib/materials.js'

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const r = rng(41)
  const N = makeNoise(43)
  const renderer = makeRenderer(W, H, { alpha: true, shadows: true, exposure: +(q.get('exp') || 0.85) })
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.9
  const camera = new THREE.PerspectiveCamera(+(q.get('fov')||21), W / H, 0.05, 20)
  camera.position.set(0, 0.62, 0.78)
  camera.lookAt(0, 0.0, 0.0)

  const key = new THREE.DirectionalLight(0xfff2e0, 2.6)
  key.position.set(-0.6, 1.4, 0.5); key.castShadow = true
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004
  Object.assign(key.shadow.camera, { left: -0.4, right: 0.4, top: 0.4, bottom: -0.4, near: 0.1, far: 4 })
  scene.add(key)
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a6a4a, 0.5))

  // shadow catcher
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.ShadowMaterial({ opacity: 0.32 }))
  catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; scene.add(catcher)

  // brass plate: engraved rings via roughness map, beaded rim
  const engr = canvasTex(0, (ctx, w, h) => {
    ctx.fillStyle = '#5a5a5a'; ctx.fillRect(0, 0, w, h)
    const cx = w / 2
    for (let rr = 20; rr < w / 2; rr += 3) { ctx.strokeStyle = `rgba(${rr % 9 ? 90 : 30},${rr % 9 ? 90 : 30},${rr % 9 ? 90 : 30},0.5)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cx, rr, 0, Math.PI * 2); ctx.stroke() }
    ctx.strokeStyle = 'rgba(20,20,20,0.8)'; ctx.lineWidth = 3
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * w * 0.3, cx + Math.sin(a) * w * 0.3, w * 0.05, w * 0.018, a, 0, Math.PI * 2); ctx.stroke() }
    for (const rr of [0.2, 0.38, 0.44]) { ctx.beginPath(); ctx.arc(cx, cx, w * rr, 0, Math.PI * 2); ctx.stroke() }
  }, { w: 1024, h: 1024, srgb: false })
  const plateProf = [[0, 0], [0.2, 0], [0.225, 0.004], [0.24, 0.016], [0.247, 0.024], [0.245, 0.028], [0.236, 0.026], [0.222, 0.012], [0.2, 0.006], [0, 0.006]]
  const plateGeo = new THREE.LatheGeometry(plateProf.map(([a, b]) => new THREE.Vector2(a, b)), 128)
  const brass = brassMaterial({ seed: 31, color: 0xd8a64c, roughness: 0.26 })
  const plate = new THREE.Mesh(plateGeo, brass); plate.castShadow = true; plate.receiveShadow = true; scene.add(plate)
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.2, 160), brassMaterial({ seed: 33, color: 0xd2a048, roughness: 0.28 }))
  inner.material.bumpMap = plateEngraving(); inner.material.bumpScale = 0.8
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.0065; inner.receiveShadow = true; scene.add(inner)
  const bead = new THREE.SphereGeometry(0.0045, 16, 12)
  const beads = new THREE.InstancedMesh(bead, brass, 140)
  const m = new THREE.Matrix4()
  for (let i = 0; i < 140; i++) { const a = (i / 140) * Math.PI * 2; m.makeTranslation(Math.cos(a) * 0.246, 0.028, Math.sin(a) * 0.246); beads.setMatrixAt(i, m) }
  beads.castShadow = true; scene.add(beads)

  // betel leaves fanned on the left
  const betelTex = leafTexture({ base: '#1f5214', light: '#3f8424', vein: 'rgba(190,230,140,0.55)', lateral: 0, palmate: true, seed: 11, w: 1024, h: 1024 })
  const betelMat = new THREE.MeshPhysicalMaterial({ map: betelTex, bumpMap: betelTex, bumpScale: 0.5, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.22, side: THREE.DoubleSide })
  ;[[-0.09, 0.03, 0.9, 0.0], [-0.06, -0.03, 0.4, 0.004], [-0.12, -0.05, 1.35, 0.008], [-0.03, 0.06, 0.05, 0.012]].forEach(([x, z, rot, lift], i) => {
    const g = betelLeafGeo({ cup: 0.04 }); g.scale(0.15, 0.15, 0.15)
    const leaf = new THREE.Mesh(g, betelMat)
    leaf.rotation.order = 'YXZ'; leaf.rotation.x = -Math.PI / 2; leaf.rotation.y = rot
    leaf.position.set(x, 0.012 + lift, z); leaf.castShadow = true; leaf.receiveShadow = true
    scene.add(leaf)
  })

  // areca nuts: whole (mottled, fibrous) and halved (marbled cut face)
  const nutTex = canvasTex(0, (ctx, w, h) => { ctx.fillStyle = '#8a4e26'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { ctx.fillStyle = ['#6a3818', '#a3683a', '#5a2e12', '#b4794a'][i % 4]; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 2 + r() * 6, 1 + r() * 2, r() * 3, 0, Math.PI * 2); ctx.fill() } }, { w: 256, h: 256 })
  const nutMat = new THREE.MeshStandardMaterial({ map: nutTex, bumpMap: nutTex, bumpScale: 0.8, roughness: 0.75 })
  const cutTex = canvasTex(0, (ctx, w, h) => { const img = ctx.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x - w / 2, y - h / 2) / (w / 2); const n = N.fbm(x / 9, y / 9); const swirl = Math.sin((n * 9 + d * 5)) * 0.5 + 0.5; const i = (y * w + x) * 4; const rim = d > 0.86 ? 0.55 : 1; img.data[i] = (205 - swirl * 90) * rim; img.data[i + 1] = (160 - swirl * 85) * rim; img.data[i + 2] = (115 - swirl * 70) * rim; img.data[i + 3] = 255 } ctx.putImageData(img, 0, 0) }, { w: 256, h: 256 })
  ;[[0.03, -0.06], [0.06, -0.04], [0.045, -0.095], [0.085, -0.075], [0.015, -0.1]].forEach(([x, z]) => {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.017, 48, 32), nutMat)
    nut.scale.set(1, 0.85, 1.05); nut.position.set(x, 0.021, z); nut.rotation.set(r(), r() * 3, r()); nut.castShadow = true; scene.add(nut)
  })
  ;[[0.1, -0.02, 0.3], [0.072, 0.0, -0.4]].forEach(([x, z, rot]) => {
    const half = new THREE.Group()
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.017, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), nutMat); shell.rotation.x = Math.PI; half.add(shell)
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.0168, 40), new THREE.MeshStandardMaterial({ map: cutTex, roughness: 0.8 })); face.rotation.x = -Math.PI / 2; face.position.y = 0.0002; half.add(face)
    half.position.set(x, 0.024, z); half.rotation.y = rot; half.castShadow = true; scene.add(half)
  })

  // bananas: curved, five-sided, yellow with brown tips and freckles
  const banTex = canvasTex(0, (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#3a2a12'); g.addColorStop(0.06, '#b8a232'); g.addColorStop(0.14, '#e8b81a'); g.addColorStop(0.9, '#eebf22'); g.addColorStop(0.96, '#9a8a2a'); g.addColorStop(1, '#2a1e0e'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 120; i++) { ctx.fillStyle = 'rgba(110,70,20,0.5)'; ctx.beginPath(); ctx.arc(r() * w, r() * h, 0.6 + r() * 1.6, 0, Math.PI * 2); ctx.fill() } }, { w: 512, h: 64 })
  const bananaGeo = () => {
    const pos = [], uv = [], idx = []
    const seg = 40, sides = 5
    for (let i = 0; i <= seg; i++) {
      const t = i / seg
      const a = (t - 0.5) * 1.6
      const c = new THREE.Vector3(Math.sin(a) * 0.1, 0, (1 - Math.cos(a)) * 0.1)
      const tan = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
      const nrm = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a))
      const rad = 0.017 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t * 1.04 - 0.02))), 0.45) + 0.002
      for (let k = 0; k <= sides; k++) {
        const ang = (k / sides) * Math.PI * 2
        const rr = rad * (1 - 0.06 * Math.cos(ang * sides))
        const p = c.clone().addScaledVector(nrm, Math.cos(ang) * rr).add(new THREE.Vector3(0, Math.sin(ang) * rr, 0))
        pos.push(p.x, p.y, p.z); uv.push(t, k / sides)
      }
    }
    for (let i = 0; i < seg; i++) for (let k = 0; k < sides; k++) { const a = i * (sides + 1) + k, b = a + 1, c2 = a + sides + 1, d = c2 + 1; idx.push(a, c2, b, b, c2, d) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g
  }
  const banMat = new THREE.MeshPhysicalMaterial({ map: banTex, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.5 })
  ;[[0.08, 0.075, -0.6], [0.105, 0.11, -0.45]].forEach(([x, z, rot], i) => { const b = new THREE.Mesh(bananaGeo(), banMat); b.position.set(x, 0.026 + i * 0.012, z); b.rotation.y = rot; b.castShadow = true; scene.add(b) })

  // kumkum and haldi in small brass bowls
  const bowlProf = [[0, 0], [0.018, 0], [0.026, 0.006], [0.031, 0.018], [0.032, 0.021], [0.029, 0.02], [0.024, 0.01], [0, 0.008]]
  ;[[-0.02, -0.12, '#8a0a16'], [0.035, 0.135, '#e09a0c']].forEach(([x, z, col]) => {
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlProf.map(([a, b]) => new THREE.Vector2(a, b)), 48), brass); bowl.position.set(x, 0.006, z); bowl.castShadow = true; scene.add(bowl)
    bowl.receiveShadow = true
    const powder = powderMound({ radius: 0.024, height: 0.013, color: col, seed: x > 0 ? 3 : 6 }); powder.position.set(x, 0.0135, z); scene.add(powder)
  })

  // a string of jasmine coiled round the inside of the rim
  const coil = []
  for (let i = 0; i <= 26; i++) { const a = 3.45 + (i / 26) * Math.PI * 1.45; const rad = 0.203 + 0.004 * Math.sin(i * 1.9); coil.push(new THREE.Vector3(Math.cos(a) * rad, 0.0105, Math.sin(a) * rad)) }
  scene.add(jasmineStrand(new THREE.CatmullRomCurve3(coil), { seed: 22, lift: 0.3 }))

  const spots = []
  for (let k = 0; k < 14; k++) { const a = r() * Math.PI * 2, rr = 0.06 + r() * 0.12; spots.push({ pos: new THREE.Vector3(Math.cos(a) * rr, 0.009, Math.sin(a) * rr), size: 0.014 + r() * 0.006, color: k % 3 ? '#b0122a' : '#ff8a00' }) }
  scene.add(scatteredPetals(spots, { seed: 3 }))

  const comp = makeComposer(renderer, scene, camera, W, H, { bloom: null, alpha: true })
  renderer.setClearColor(0x000000, 0)
  // render directly (keeps transparency)
  renderer.render(scene, camera)
}
