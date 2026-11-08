import { THREE, rng, makeNoise, canvasTex } from './common.js'
import { mangoLeafGeo, leafTexture, marigolds } from './flora.js'

/** Brass kalasha with turmeric & kumkum marks, sacred thread, mango leaves, husked coconut, on a plate of rice ringed by marigolds. */
export function makeKalasha({ envMap = null, seed = 2 } = {}) {
  const r = rng(seed)
  const N = makeNoise(seed)
  const grp = new THREE.Group()
  const prof = [[0.0, 0.0], [0.05, 0.0], [0.064, 0.004], [0.058, 0.012], [0.07, 0.022], [0.098, 0.05], [0.118, 0.085], [0.125, 0.115], [0.12, 0.145], [0.104, 0.172], [0.078, 0.193], [0.056, 0.206], [0.047, 0.214], [0.048, 0.224], [0.058, 0.234], [0.072, 0.242], [0.079, 0.247], [0.075, 0.251], [0.062, 0.247]]
  const geo = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 96)
  geo.translate(0, 0.045, 0)
  // paint: brass base + haldi stripes and kumkum dots on the front (u≈0/1 faces +z)
  const paint = (ctx, w, h, mode) => {
    // mode 'map' | 'metal' | 'rough'
    ctx.fillStyle = mode === 'map' ? '#d9a650' : mode === 'metal' ? '#ffffff' : '#3a3a3a'
    ctx.fillRect(0, 0, w, h)
    if (mode === 'map') {
      const img = ctx.getImageData(0, 0, w, h)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = N.fbm(x / 18, y / 18) - 0.5; const i = (y * w + x) * 4; img.data[i] *= 1 + n * 0.12; img.data[i + 1] *= 1 + n * 0.12; img.data[i + 2] *= 1 + n * 0.15 }
      ctx.putImageData(img, 0, 0)
    }
    if (mode === 'rough') {
      const img = ctx.getImageData(0, 0, w, h)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = N.fbm(x / 9, y / 9); const i = (y * w + x) * 4; const v = 40 + n * 70; img.data[i] = img.data[i + 1] = img.data[i + 2] = v }
      ctx.putImageData(img, 0, 0)
    }
    const fill = (c) => (mode === 'map' ? c : mode === 'metal' ? '#000000' : '#f0f0f0')
    const stripes = (x0) => {
      const R = rng(41)
      for (let k = 0; k < 3; k++) {
        const y = h * (0.43 + k * 0.05)
        // hand-applied turmeric paste: many overlapping soft dabs
        for (let d = 0; d < 60; d++) {
          const t = (d / 59) * 2 - 1
          const xx = x0 + t * w * 0.085 + (R() - 0.5) * w * 0.006
          const yy = y + (R() - 0.5) * h * 0.006 + Math.sin(t * 3 + k) * h * 0.002
          const rad = w * (0.0075 + R() * 0.004) * (1 - 0.35 * t * t)
          ctx.globalAlpha = mode === 'map' ? 0.32 + R() * 0.3 : 0.75
          ctx.fillStyle = fill(R() > 0.5 ? '#c98a22' : '#d9a03a')
          ctx.beginPath(); ctx.arc(xx, yy, rad, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.globalAlpha = mode === 'map' ? 0.92 : 1
      ctx.fillStyle = fill('#9e1420')
      for (const [dx, dy, rr] of [[0, 0.405, 0.0085], [0, 0.585, 0.0075], [-0.05, 0.53, 0.006], [0.05, 0.53, 0.006]]) {
        for (let d = 0; d < 6; d++) { ctx.beginPath(); ctx.arc(x0 + dx * w + (R() - 0.5) * w * 0.002, h * dy + (R() - 0.5) * h * 0.003, w * rr * (0.8 + R() * 0.3), 0, Math.PI * 2); ctx.fill() }
      }
      ctx.globalAlpha = 1
    }
    stripes(0); stripes(w)
  }
  const mk = (mode) => canvasTex(0, (ctx, w, h) => paint(ctx, w, h, mode), { w: 1024, h: 512, srgb: mode === 'map' })
  const pot = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, map: mk('map'), metalnessMap: mk('metal'), roughnessMap: mk('rough'), metalness: 1, roughness: 1, envMap, envMapIntensity: 1.1 }))
  grp.add(pot)
  // sacred thread wound round the neck
  for (let k = 0; k < 7; k++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.0485 + k * 0.0003, 0.0017, 6, 64), new THREE.MeshStandardMaterial({ color: k % 3 === 1 ? 0xf0b31a : 0xb3121e, roughness: 0.8 }))
    t.rotation.x = Math.PI / 2; t.position.y = 0.045 + 0.2 + k * 0.0026
    grp.add(t)
  }
  // mango leaves in the mouth
  const leafMap = leafTexture({ base: '#1f4417', light: '#3d7228', vein: 'rgba(170,210,120,0.55)', lateral: 16, seed: 3 })
  const leafMat = new THREE.MeshStandardMaterial({ map: leafMap, roughness: 0.32, side: THREE.DoubleSide, envMap, envMapIntensity: 0.6, emissive: 0x22330a, emissiveIntensity: 0.3 })
  const mouthY = 0.045 + 0.248
  const nLeaves = 11
  for (let i = 0; i < nLeaves; i++) {
    const az = (i / nLeaves) * Math.PI * 2 + 0.2
    const g = mangoLeafGeo({ width: 0.2, fold: 0.22, bend: 0.55 + r() * 0.2, twist: (r() - 0.5) * 0.6 })
    g.scale(0.15, 0.15, 0.15)
    const leaf = new THREE.Mesh(g, leafMat)
    leaf.position.set(Math.sin(az) * 0.05, mouthY - 0.004, Math.cos(az) * 0.05)
    leaf.rotation.order = 'YXZ'
    leaf.rotation.y = az
    leaf.rotation.x = 1.05 + r() * 0.25 // tilt outward; the leaf's own curve droops the tip over the rim
    grp.add(leaf)
  }
  // husked coconut with fibre texture, tuft, turmeric smear and kumkum dot
  const cocoTex = canvasTex(0, (ctx, w, h) => {
    ctx.fillStyle = '#9a6234'; ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, l = 8 + r() * 40
      ctx.strokeStyle = ['#5a3216', '#9a6434', '#6b3f1c', '#b07a44', '#4a2810'][Math.floor(r() * 5)]
      ctx.globalAlpha = 0.35 + r() * 0.4
      ctx.lineWidth = 0.6 + r() * 1.4
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 3, y + l); ctx.stroke()
    }
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#e8a817'
    ctx.beginPath(); ctx.ellipse(w * 0.0, h * 0.55, w * 0.06, h * 0.16, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(w * 1.0, h * 0.55, w * 0.06, h * 0.16, 0, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1; ctx.fillStyle = '#b10f1e'
    ctx.beginPath(); ctx.arc(0, h * 0.55, w * 0.018, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(w, h * 0.55, w * 0.018, 0, Math.PI * 2); ctx.fill()
  }, { w: 512, h: 512 })
  const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.064, 48, 32), new THREE.MeshStandardMaterial({ map: cocoTex, bumpMap: cocoTex, bumpScale: 0.002, roughness: 0.9, envMap, envMapIntensity: 0.8 }))
  coconut.scale.set(1, 1.22, 1)
  coconut.position.set(0, mouthY + 0.07, 0)
  coconut.rotation.y = 0 // seam faces camera
  grp.add(coconut)
  const fibreMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2c, roughness: 1 })
  for (let i = 0; i < 70; i++) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0012, 0.03 + r() * 0.02, 3), fibreMat)
    const a = r() * Math.PI * 2, tilt = 0.2 + r() * 0.6
    f.position.set(Math.cos(a) * 0.006, mouthY + 0.07 + 0.078 + 0.01, Math.sin(a) * 0.006)
    f.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt)
    grp.add(f)
  }
  // brass plate with a mound of rice and a ring of marigolds
  const plateProf = [[0, 0], [0.16, 0], [0.19, 0.006], [0.205, 0.022], [0.21, 0.026], [0.2, 0.026], [0.185, 0.014], [0.0, 0.01]]
  const plate = new THREE.Mesh(new THREE.LatheGeometry(plateProf.map(([a, b]) => new THREE.Vector2(a, b)), 96), new THREE.MeshStandardMaterial({ color: 0xd2a04a, metalness: 1, roughness: 0.28, envMap, side: THREE.DoubleSide }))
  grp.add(plate)
  const grain = new THREE.CapsuleGeometry(0.0013, 0.0045, 2, 5)
  const grains = new THREE.InstancedMesh(grain, new THREE.MeshStandardMaterial({ color: 0xf2ead6, roughness: 0.7, envMap, envMapIntensity: 0.4 }), 2600)
  const m = new THREE.Matrix4()
  for (let i = 0; i < 2600; i++) {
    const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 0.165
    const y = 0.012 + 0.04 * Math.pow(Math.max(0, 1 - rad / 0.165), 0.8) * (0.9 + r() * 0.2)
    m.compose(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(1, 1, 1))
    grains.setMatrixAt(i, m)
  }
  grp.add(grains)
  const ring = []
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    ring.push({ pos: new THREE.Vector3(Math.cos(a) * 0.15, 0.045, Math.sin(a) * 0.15), size: 0.026, yellow: i % 2 === 1 })
  }
  grp.add(marigolds(ring, { petals: 240, seed: 12, envMap }))
  return grp
}
