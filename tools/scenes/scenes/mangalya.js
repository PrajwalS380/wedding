// MANGALYA · the Vivaha Muhurta, for its arch: the mangalasutra draped on a husked coconut (turmeric
// smear, kumkum dot) that sits on a silver plate heaped with akshate, as it is carried round for the
// elders' blessings — black and gold beads, two domed gold discs at the front. Betel leaves, jasmine,
// rose petals, kumkum and haldi on green silk; the sacred fire of the homa burns out of focus behind.
import { THREE, rng, makeNoise, canvasTex, makeRenderer, makeComposer, exportLights } from '../lib/common.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { marigolds, scatteredPetals, flameMaterial, haloMaterial, smokeMaterial, betelLeafGeo, leafTexture, jasmineStrand, riceGeo, riceMaterial, powderMound } from '../lib/flora.js'
import { goldMaterial, silverMaterial } from '../lib/materials.js'

const lathe = (prof, seg = 96) => new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), seg)
const softBokeh = (color, strength) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { color: { value: new THREE.Color(color) }, strength: { value: strength } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); vec2 sc=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)); mv.xy+=(uv-.5)*sc; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 color; uniform float strength; varying vec2 vUv;
    void main(){ float r=length(vUv-.5)*2.; float disc=smoothstep(1.0,0.72,r); float rim=smoothstep(0.55,0.92,r)*disc*0.35;
      gl_FragColor=vec4(color*(disc*(0.42+0.12*(1.-r))+rim)*strength,1.); }`,
})

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const r = rng(23)
  const N = makeNoise(29)
  const renderer = makeRenderer(W, H, { shadows: true, exposure: +(q.get('exp') || 0.95) })
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x120805)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = +(q.get('env') || 0.55)

  const camera = new THREE.PerspectiveCamera(+(q.get('fov') || 30), W / H, 0.02, 40)
  const dist = +(q.get('d') || 0.8), el = THREE.MathUtils.degToRad(+(q.get('el') || 14))
  const target = new THREE.Vector3(0, +(q.get('ty') || 0.105), 0)
  camera.position.set(0, target.y + Math.sin(el) * dist, Math.cos(el) * dist)
  camera.lookAt(target)
  camera.updateMatrixWorld()

  /* ---------------- green silk with a gold border */
  const silk = canvasTex(0, (ctx, w, h) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const weave = 0.92 + 0.08 * Math.sin(x * 1.9) * Math.sin(y * 1.7)
      const n = N.fbm(x / 60, y / 60)
      const band = y > h * 0.36 && y < h * 0.4
      const i = (y * w + x) * 4
      if (band) {
        const mx = (x % 40) / 40, my = (y - h * 0.36) / (h * 0.04)
        const motif = Math.exp(-((mx - 0.5) ** 2 + (my - 0.5) ** 2) * 40)
        const g = (0.72 + 0.28 * weave) * (0.8 + 0.2 * n) * (1 - 0.4 * motif)
        img.data[i] = 214 * g; img.data[i + 1] = 166 * g; img.data[i + 2] = 78 * g
      } else {
        const v = weave * (0.8 + 0.28 * n)
        img.data[i] = 10 * v; img.data[i + 1] = 72 * v; img.data[i + 2] = 40 * v
      }
      img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, { w: 1024, h: 1024, repeat: true })
  silk.repeat.set(3, 1)
  const zari = canvasTex(0, (ctx, w, h) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fff'; ctx.fillRect(0, h * 0.36, w, h * 0.04) }, { w: 64, h: 1024, srgb: false, repeat: true })
  const clothGeo = new THREE.PlaneGeometry(3, 3, 160, 160)
  clothGeo.translate(0, -0.85, 0)
  const cp = clothGeo.attributes.position
  for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), y = cp.getY(i) + 0.85, d = Math.hypot(x, y); cp.setZ(i, d > 0.28 ? (0.006 * Math.sin(x * 8 + Math.sin(y * 4) * 2) + 0.004 * (N.fbm(x * 3, y * 3 + 7) - 0.5)) * Math.min(1, (d - 0.28) * 3) : 0) }
  clothGeo.computeVertexNormals()
  const cloth = new THREE.Mesh(clothGeo, new THREE.MeshPhysicalMaterial({ map: silk, roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(0x5ac08a), sheenRoughness: 0.4, metalnessMap: zari, metalness: 0.7 }))
  cloth.rotation.x = -Math.PI / 2; cloth.receiveShadow = true; scene.add(cloth)

  /* ---------------- silver plate heaped with akshate */
  const silver = silverMaterial({ seed: 13, roughness: 0.2 })
  const plate = new THREE.Mesh(lathe([[0, 0], [0.18, 0], [0.205, 0.004], [0.22, 0.016], [0.227, 0.024], [0.225, 0.028], [0.216, 0.026], [0.202, 0.012], [0.18, 0.006], [0, 0.006]], 160), silver)
  plate.castShadow = true; plate.receiveShadow = true; scene.add(plate)
  const rimBeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.004, 16, 12), silver, 140)
  const m = new THREE.Matrix4()
  for (let i = 0; i < 140; i++) { const a = (i / 140) * Math.PI * 2; m.makeTranslation(Math.cos(a) * 0.226, 0.028, Math.sin(a) * 0.226); rimBeads.setMatrixAt(i, m) }
  scene.add(rimBeads)
  // betel leaves fanned under the coconut
  const betelTex = leafTexture({ base: '#1a4a12', light: '#357a20', vein: 'rgba(190,230,140,0.45)', lateral: 0, palmate: true, seed: 11, w: 1024, h: 1024 })
  const betelMat = new THREE.MeshPhysicalMaterial({ map: betelTex, bumpMap: betelTex, bumpScale: 0.5, roughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.4, side: THREE.DoubleSide, envMapIntensity: 0.25, color: 0xc8e0b8 })
  ;[[-0.7, 0.0], [0.7, 0.004], [2.3, 0.002], [-2.4, 0.006], [3.14, 0.003]].forEach(([rot, lift]) => {
    const g = betelLeafGeo({ cup: 0.05 }); g.scale(0.13, 0.13, 0.13)
    const leaf = new THREE.Mesh(g, betelMat)
    leaf.rotation.order = 'YXZ'; leaf.rotation.y = rot + Math.PI; leaf.rotation.x = -Math.PI / 2 + 0.12
    leaf.position.set(Math.sin(rot) * 0.03, 0.03 + lift, Math.cos(rot) * 0.03)
    leaf.castShadow = true; leaf.receiveShadow = true; scene.add(leaf)
  })
  // the rice: turmeric-yellow, a gentle heap
  const rice = riceGeo()
  const grains = new THREE.InstancedMesh(rice, riceMaterial(), 4200)
  const col = new THREE.Color()
  let gi = 0
  for (let i = 0; i < 4200; i++) {
    const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 0.195
    const y = 0.008 + 0.028 * Math.pow(Math.max(0, 1 - rad / 0.2), 0.7) * (0.85 + r() * 0.3)
    m.compose(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(1, 1, 1))
    grains.setMatrixAt(gi, m)
    col.setHSL(0.115 + r() * 0.03, 0.82, 0.5 + r() * 0.12); if (r() < 0.06) col.setHSL(0.0, 0.75, 0.38)
    grains.setColorAt(gi++, col)
  }
  grains.instanceColor.needsUpdate = true; grains.receiveShadow = true; grains.castShadow = true; scene.add(grains)

  /* ---------------- the coconut */
  const cocoTex = canvasTex(0, (ctx, w, h) => {
    ctx.fillStyle = '#9a6234'; ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 3200; i++) {
      const x = r() * w, y = r() * h, l = 8 + r() * 40
      ctx.strokeStyle = ['#5a3216', '#9a6434', '#6b3f1c', '#b07a44', '#4a2810'][Math.floor(r() * 5)]
      ctx.globalAlpha = 0.35 + r() * 0.4; ctx.lineWidth = 0.6 + r() * 1.4
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 3, y + l); ctx.stroke()
    }
    // turmeric paste smeared on by hand over the front, fibre showing through, and a kumkum dot
    for (const cx of [w / 2]) {
      for (let d = 0; d < 420; d++) { // thin, streaky paste: the husk shows through
        const t = r(), sx = cx + (r() - 0.5) * w * 0.07 * (1 - Math.abs(t - 0.5)), sy = h * (0.37 + t * 0.24)
        ctx.globalAlpha = 0.07 + r() * 0.2
        ctx.fillStyle = ['#cf9418', '#c2860e', '#dca526', '#b87a12'][Math.floor(r() * 4)]
        ctx.beginPath(); ctx.ellipse(sx, sy, w * (0.003 + r() * 0.008), h * (0.006 + r() * 0.016), (r() - 0.5) * 0.3, 0, Math.PI * 2); ctx.fill()
      }
      for (let d = 0; d < 40; d++) { // kumkum pressed on with a fingertip: dense centre, grainy edge
        const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * w * 0.011
        ctx.globalAlpha = 0.45 + r() * 0.5; ctx.fillStyle = r() > 0.3 ? '#a50d1c' : '#c4182a'
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, h * 0.46 + Math.sin(a) * rr * 1.3, w * (0.003 + r() * 0.004), 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }, { w: 1024, h: 1024 })
  const R = 0.066, SY = 1.2, cocoY = 0.04 + R * SY
  const cocoGeo = new THREE.SphereGeometry(R, 96, 64)
  { // the husked nut's three faint ridges and a slightly pointed crown
    const cp2 = cocoGeo.attributes.position
    for (let i = 0; i < cp2.count; i++) {
      const v3 = new THREE.Vector3().fromBufferAttribute(cp2, i)
      const th = Math.atan2(v3.z, v3.x), ny = v3.y / R
      const k = 1 + 0.035 * Math.pow(Math.max(0, Math.cos(3 * th)), 4) * (1 - ny * ny) + 0.06 * Math.max(0, ny - 0.6)
      cp2.setXYZ(i, v3.x * k, v3.y * (1 + 0.04 * Math.max(0, ny - 0.5)), v3.z * k)
    }
    cocoGeo.computeVertexNormals()
  }
  const coconut = new THREE.Mesh(cocoGeo, new THREE.MeshStandardMaterial({ map: cocoTex, bumpMap: cocoTex, bumpScale: 1.0, roughness: 0.92 }))
  coconut.scale.set(1, SY, 1); coconut.position.set(0, cocoY, 0); coconut.rotation.y = -Math.PI / 2 // the turmeric smear and kumkum dot face the camera
  { // loose husk fibres lying along the nut, a few springing free; stained yellow where the turmeric is
    const strand = new THREE.CylinderGeometry(0.00028, 0.00036, 1, 4, 4)
    strand.translate(0, 0.5, 0)
    const sp = strand.attributes.position
    for (let i = 0; i < sp.count; i++) { const y = sp.getY(i); sp.setZ(i, sp.getZ(i) + 0.0012 * y * y) } // a gentle curl (absolute, not scaled with length)
    strand.computeVertexNormals()
    const n = 2600
    const fib = new THREE.InstancedMesh(strand, new THREE.MeshStandardMaterial({ roughness: 1 }), n)
    const fc = new THREE.Color()
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, phi = 0.15 + Math.acos(1 - 2 * r()) * 0.9
      const sinp = Math.sin(phi), cosp = Math.cos(phi)
      const p = new THREE.Vector3(Math.sin(a) * R * sinp * 1.005, cocoY + R * SY * cosp * 1.005, Math.cos(a) * R * sinp * 1.005)
      const nrm = new THREE.Vector3(Math.sin(a) * sinp, cosp / SY, Math.cos(a) * sinp).normalize()
      const merid = new THREE.Vector3(Math.sin(a) * cosp, -sinp * SY, Math.cos(a) * cosp).normalize()
      const lift = r() < 0.06 ? 0.25 + r() * 0.35 : r() * 0.06
      const dir = merid.clone().multiplyScalar(r() < 0.5 ? 1 : -1).addScaledVector(nrm, lift).addScaledVector(new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)), (r() - 0.5) * 0.5).normalize()
      const q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
      const L = 0.005 + r() * 0.011
      m.compose(p, q2, new THREE.Vector3(1, L, 1)); fib.setMatrixAt(i, m)
      const front = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.32 && cosp > -0.25 && cosp < 0.3
      fc.set(['#6a3c1a', '#8a5428', '#a46a36', '#5a3216', '#b8804a'][Math.floor(r() * 5)])
      if (front) fc.lerp(new THREE.Color('#c88e1a'), 0.55)
      fib.setColorAt(i, fc)
    }
    fib.instanceColor.needsUpdate = true; fib.castShadow = true; scene.add(fib)
  }
  coconut.castShadow = true; coconut.receiveShadow = true; scene.add(coconut)
  const fibreMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2c, roughness: 1 })
  for (let i = 0; i < 80; i++) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0012, 0.03 + r() * 0.025, 3), fibreMat)
    const a = r() * Math.PI * 2, tilt = 0.2 + r() * 0.7
    f.position.set(Math.cos(a) * 0.006, cocoY + R * SY + 0.008, Math.sin(a) * 0.006)
    f.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt); scene.add(f)
  }

  /* ---------------- the mangalasutra: black and gold beads, two domed gold discs */
  const gold = goldMaterial({ seed: 17 })
  const emboss = canvasTex(0, (ctx, w, h) => { // uv: x round the disc, y from the centre out to the rim
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h)
    for (let k = 0; k < 8; k++) { // lotus petals
      const cx = (k + 0.5) * (w / 8)
      const g2 = ctx.createRadialGradient(cx, h * 0.5, 2, cx, h * 0.5, w / 16)
      g2.addColorStop(0, '#d8d8d8'); g2.addColorStop(1, '#808080')
      ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(cx, h * 0.52, w / 22, h * 0.17, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2; ctx.stroke()
    }
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(0, h * 0.74, w, 3); ctx.fillRect(0, h * 0.3, w, 3)
    for (let k = 0; k < 36; k++) { ctx.fillStyle = '#e0e0e0'; ctx.beginPath(); ctx.arc((k + 0.5) * (w / 36), h * 0.82, 5, 0, Math.PI * 2); ctx.fill() }
  }, { w: 512, h: 256, srgb: false })
  const discGold = goldMaterial({ seed: 19 }); discGold.bumpMap = emboss; discGold.bumpScale = 1.0
  const blackGlass = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, ior: 1.6 })
  // a loop around the coconut's waist that dips at the front where the discs hang
  const surf = (a, drop) => {
    const yy = cocoY - 0.012 - drop
    const ry = (yy - cocoY) / (R * SY)
    const rad = R * Math.sqrt(Math.max(0.02, 1 - ry * ry)) + 0.0032
    return new THREE.Vector3(Math.sin(a) * rad, yy, Math.cos(a) * rad)
  }
  const pts = []
  for (let i = 0; i <= 400; i++) { const a = (i / 400) * Math.PI * 2; const d = Math.atan2(Math.sin(a), Math.cos(a)); pts.push(surf(a, 0.05 * Math.exp(-d * d * 2.2))) }
  const loop = new THREE.CatmullRomCurve3(pts, true)
  const len = loop.getLength()
  const step = 0.0058
  const nBeads = Math.floor(len / step)
  const blackB = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0027, 20, 14), blackGlass, nBeads)
  const goldB = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0031, 20, 14), gold, nBeads)
  const wire = new THREE.Mesh(new THREE.TubeGeometry(loop, 900, 0.0005, 6, true), gold); wire.castShadow = true; scene.add(wire)
  let nb = 0, ng = 0
  for (let i = 0; i < nBeads; i++) {
    const t = i / nBeads
    const p = loop.getPointAt(t)
    const a = Math.atan2(p.x, p.z), d = Math.atan2(Math.sin(a), Math.cos(a))
    if (Math.abs(d) < 0.16) continue // the clasp of the discs
    m.makeTranslation(p.x, p.y, p.z)
    if (i % 7 === 0 || (i % 7 === 1 && Math.abs(d) < 0.8)) goldB.setMatrixAt(ng++, m)
    else blackB.setMatrixAt(nb++, m)
  }
  blackB.count = nb; goldB.count = ng
  blackB.castShadow = goldB.castShadow = true
  scene.add(blackB, goldB)
  // the two discs (mangalya), with a beaded rim and a raised centre, hanging side by side
  const front = surf(0, 0.05)
  const discProf = [[0, 0.0032], [0.004, 0.0034], [0.0075, 0.0026], [0.0105, 0.0016], [0.0118, 0.0008], [0.0122, 0], [0.0112, -0.0004], [0, -0.0004]]
  ;[-1, 1].forEach((sgn) => {
    const g = new THREE.Group()
    const disc = new THREE.Mesh(lathe(discProf, 96), discGold); disc.rotation.x = Math.PI / 2; g.add(disc)
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 20, 14), gold); boss.position.z = 0.0034; boss.scale.z = 0.6; g.add(boss)
    for (let k = 0; k < 22; k++) { const a = (k / 22) * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.0009, 12, 8), gold); b.position.set(Math.cos(a) * 0.0094, Math.sin(a) * 0.0094, 0.0018); g.add(b) }
    const bail = new THREE.Mesh(new THREE.TorusGeometry(0.0028, 0.0009, 8, 20), gold); bail.position.y = 0.0145; bail.rotation.y = Math.PI / 2; g.add(bail)
    g.scale.setScalar(1.3)
    g.position.set(sgn * 0.0165, front.y - 0.017, front.z + 0.004)
    g.rotation.set(-0.32, sgn * 0.2, sgn * 0.05)
    g.traverse((o) => { if (o.isMesh) o.castShadow = true })
    scene.add(g)
  })
  // gold spacer beads at the clasp
  ;[-0.024, -0.008, 0.008, 0.024].forEach((x) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.0036, 16, 12), gold); b.position.set(x, front.y + 0.001, front.z - 0.001 + Math.abs(x) * -0.1); scene.add(b) })

  /* ---------------- kumkum, haldi, flowers */
  const bowlGeo = lathe([[0, 0], [0.016, 0], [0.024, 0.005], [0.029, 0.016], [0.03, 0.019], [0.027, 0.018], [0.022, 0.01], [0, 0.008]], 64)
  ;[[-0.15, 0.08, '#9a0a18'], [0.155, 0.075, '#e3a00e']].forEach(([x, z, c]) => {
    const bowl = new THREE.Mesh(bowlGeo, silver); bowl.position.set(x, 0.02, z); bowl.castShadow = true; bowl.receiveShadow = true; scene.add(bowl)
    const powder = powderMound({ radius: 0.0205, height: 0.012, color: c, seed: x > 0 ? 5 : 8 }); powder.position.set(x, 0.0275, z); scene.add(powder)
  })
  const jPts = []
  for (let i = 0; i <= 22; i++) { const a = 1.3 + (i / 22) * Math.PI * 1.25; const rad = 0.168 + 0.004 * Math.sin(i * 1.3); jPts.push(new THREE.Vector3(Math.cos(a) * rad, 0.008 + 0.028 * Math.pow(Math.max(0, 1 - rad / 0.2), 0.7) + 0.003, Math.sin(a) * rad)) }
  scene.add(jasmineStrand(new THREE.CatmullRomCurve3(jPts), { seed: 12, lift: 0.3 }))
  scene.add(marigolds([
    { pos: new THREE.Vector3(-0.1, 0.035, -0.12), size: 0.04 },
    { pos: new THREE.Vector3(0.11, 0.035, -0.11), size: 0.038, yellow: true },
  ], { petals: 240, seed: 8 }))
  const spots = []
  for (let k = 0; k < 24; k++) { const a = r() * Math.PI * 2, rr = 0.09 + r() * 0.28; spots.push({ pos: new THREE.Vector3(Math.cos(a) * rr, rr > 0.23 ? 0.004 : 0.03, Math.sin(a) * rr * 0.9 + 0.04), size: 0.012 + r() * 0.007, color: k % 4 ? '#b01028' : '#f5f0e6' }) }
  scene.add(scatteredPetals(spots, { seed: 6 }))

  /* ---------------- the homa: sacred fire in a brick kunda, out of focus behind */
  const lights = []
  const kunda = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.3), new THREE.MeshStandardMaterial({ color: 0x4a2414, roughness: 1 }))
  kunda.position.set(-0.04, 0.035, -1.05); scene.add(kunda)
  const embers = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.2), new THREE.MeshBasicMaterial({ color: 0x9a2a08 }))
  embers.rotation.x = -Math.PI / 2; embers.position.set(-0.04, 0.071, -1.05); scene.add(embers)
  const fire = []
  for (let i = 0; i < 16; i++) {
    const u = r() - 0.5
    const p = new THREE.Vector3(-0.04 + u * 0.3, 0.07 + r() * 0.02, -1.05 + (r() - 0.5) * 0.14)
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flameMaterial(i * 2.3 + 0.7)); f.material.uniforms.intensity.value = 0.5 + r() * 0.3
    const tall = (0.07 + r() * 0.12) * (1.3 - Math.abs(u) * 1.6)
    f.position.copy(p); f.scale.set(0.07 + r() * 0.07, tall, 1); scene.add(f)
    fire.push(p)
    lights.push({ pos: p.clone().add(new THREE.Vector3(0, tall * 0.35, 0)), radius: 0.06, kind: 'flame' })
  }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(0xff6a1a, 0.3, 1.5)); glow.position.set(-0.04, 0.13, -1.05); glow.scale.setScalar(0.85); scene.add(glow)
  const smoke = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), smokeMaterial(1.7, 0.3)); smoke.position.set(-0.03, 0.17, -1.08); smoke.scale.set(0.4, 0.7, 1); scene.add(smoke)
  for (let i = 0; i < 26; i++) { // sparks and embers rising
    const p = new THREE.Vector3(-0.04 + (r() - 0.5) * 0.45, 0.14 + r() * 0.45, -1.05 + (r() - 0.5) * 0.3)
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softBokeh(0xff9a4a, 0.5 + r() * 0.5)); b.position.copy(p); b.scale.setScalar(0.012 + r() * 0.02); scene.add(b)
    if (i % 3 === 0) lights.push({ pos: p, radius: 0.012, kind: 'sparkle' })
  }
  const fireLight = new THREE.PointLight(0xff8a3a, +(q.get('fl') || 0.9), 4, 2); fireLight.position.set(-0.04, 0.22, -0.9); scene.add(fireLight)
  // the hall behind the fire: warm, dark
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshStandardMaterial({ color: 0x160a06, roughness: 1 })); wall.position.set(0, 1, -2.6); scene.add(wall)
  // morning light through a window, front-left
  const key = new THREE.DirectionalLight(0xfff0dc, +(q.get('kl') || 1.35))
  key.position.set(-0.7, 1.1, 0.8); key.castShadow = true
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -0.0004
  Object.assign(key.shadow.camera, { left: -0.4, right: 0.4, top: 0.4, bottom: -0.4, near: 0.1, far: 4 })
  scene.add(key)
  scene.add(new THREE.HemisphereLight(0xffe6c8, 0x3a2414, 0.35))

  exportLights(camera, W, H, lights)
  const comp = makeComposer(renderer, scene, camera, W, H, {
    bloom: q.get('nobloom') ? null : [+(q.get('bs') || 0.2), 0.45, +(q.get('bt') || 1.8)],
    ao: q.get('noao') ? null : { radius: 0.016, thickness: 0.01, intensity: 0.9 },
    dof: q.get('nodof') ? null : { focus: dist, aperture: +(q.get('ap') || 0.03), maxblur: +(q.get('mb') || 0.028) },
    grade: { vignette: 0.4, lift: [0.02, 0.012, 0.008], gain: [1.03, 1.0, 0.96], ca: 0.0008 },
  })
  comp.render()
}
