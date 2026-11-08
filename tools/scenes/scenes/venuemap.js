// VENUE MAP · for the venue & guests page: a brass location pin standing on an old, hand-drawn paper map
// (decorative — no real streets or names), folded into panels and laid on a teak table. A dotted maroon
// route leads to the pin; a string of jasmine and a few marigold and rose petals lie across the map.
// Portrait (pin high in the frame, above the venue card) and landscape (pin left of centre).
import { THREE, rng, makeNoise, canvasTex, makeRenderer, makeComposer } from '../lib/common.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { marigolds, scatteredPetals, jasmineStrand } from '../lib/flora.js'
import { brassMaterial } from '../lib/materials.js'

const MAP_W = 1.0, MAP_D = 0.7
const PIN_UV = [0.56, 0.42] // where the venue is on the map (u across, v down the sheet)

function drawMap(ctx, w, h, r, N) {
  // aged paper
  const img = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = N.fbm(x / 140, y / 140), f = N.fbm(x / 9, y / 9)
    const ex = Math.min(x, w - x) / w, ey = Math.min(y, h - y) / h
    const edge = Math.min(1, Math.min(ex, ey) * 9)
    const v = (0.9 + 0.08 * n + 0.03 * f) * (0.86 + 0.14 * edge)
    const i = (y * w + x) * 4
    img.data[i] = 240 * v; img.data[i + 1] = 226 * v; img.data[i + 2] = 196 * v; img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const ink = (a) => `rgba(92,62,36,${a})`
  const curve = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0] * w, pts[0][1] * h); for (let i = 1; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; ctx.quadraticCurveTo(x1 * w, y1 * h, ((x1 + x2) / 2) * w, ((y1 + y2) / 2) * h) } const l = pts[pts.length - 1]; ctx.lineTo(l[0] * w, l[1] * h) }
  // town districts: little rotated grids of streets, some blocks washed in
  const districts = [[0.3, 0.3, 0.26, 0.2, 0.2], [0.62, 0.36, 0.24, 0.2, -0.15], [0.42, 0.66, 0.3, 0.2, 0.08], [0.78, 0.7, 0.2, 0.18, 0.35], [0.16, 0.7, 0.16, 0.2, -0.3]]
  for (const [cx, cy, dw, dh, rot] of districts) {
    ctx.save(); ctx.translate(cx * w, cy * h); ctx.rotate(rot)
    ctx.beginPath(); ctx.rect(-dw * w / 2, -dh * h / 2, dw * w, dh * h); ctx.clip()
    const step = 34 + r() * 18
    for (let x = -dw * w / 2; x < dw * w / 2; x += step * (0.7 + r() * 0.6)) for (let y = -dh * h / 2; y < dh * h / 2; y += step * (0.7 + r() * 0.6)) {
      if (r() < 0.32) { ctx.fillStyle = r() < 0.2 ? 'rgba(160,150,100,0.18)' : 'rgba(150,110,70,0.12)'; ctx.fillRect(x + 4, y + 4, step * 0.75, step * 0.7) }
    }
    ctx.strokeStyle = ink(0.45); ctx.lineWidth = 2.2
    for (let x = -dw * w / 2; x < dw * w / 2; x += step * (0.8 + r() * 0.5)) { ctx.beginPath(); ctx.moveTo(x + (r() - 0.5) * 4, -dh * h / 2); ctx.lineTo(x + (r() - 0.5) * 8, dh * h / 2); ctx.stroke() }
    for (let y = -dh * h / 2; y < dh * h / 2; y += step * (0.8 + r() * 0.5)) { ctx.beginPath(); ctx.moveTo(-dw * w / 2, y + (r() - 0.5) * 4); ctx.lineTo(dw * w / 2, y + (r() - 0.5) * 8); ctx.stroke() }
    ctx.restore()
  }
  // a lake and a canal
  ctx.fillStyle = 'rgba(120,160,160,0.35)'; ctx.beginPath(); ctx.ellipse(w * 0.2, h * 0.36, w * 0.07, h * 0.05, 0.4, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = ink(0.5); ctx.lineWidth = 2; ctx.stroke()
  const canal = [[-0.02, 0.86], [0.2, 0.8], [0.35, 0.86], [0.55, 0.8], [0.7, 0.88], [0.9, 0.82], [1.02, 0.86]]
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(120,160,160,0.45)'; ctx.lineWidth = 26; curve(canal); ctx.stroke()
  ctx.strokeStyle = ink(0.5); ctx.lineWidth = 2; ctx.save(); ctx.translate(0, -13); curve(canal); ctx.stroke(); ctx.translate(0, 26); curve(canal); ctx.stroke(); ctx.restore()
  // parks with tiny trees
  for (const [px, py, pr] of [[0.47, 0.18, 0.06], [0.86, 0.46, 0.05], [0.3, 0.52, 0.04]]) {
    ctx.fillStyle = 'rgba(120,150,90,0.22)'; ctx.beginPath(); ctx.ellipse(px * w, py * h, pr * w, pr * h * 1.2, r(), 0, Math.PI * 2); ctx.fill()
    for (let k = 0; k < 24; k++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * pr * 0.85; ctx.fillStyle = 'rgba(80,100,60,0.5)'; ctx.beginPath(); ctx.arc(px * w + Math.cos(a) * rr * w, py * h + Math.sin(a) * rr * h, 3 + r() * 3, 0, Math.PI * 2); ctx.fill() }
  }
  // railway
  const rail = [[0.0, 0.12], [0.3, 0.1], [0.6, 0.14], [1.0, 0.08]]
  ctx.strokeStyle = ink(0.6); ctx.lineWidth = 3; curve(rail); ctx.stroke()
  ctx.lineWidth = 2
  for (let t = 0; t < 1; t += 0.012) { const x = t * w, y = (0.12 - 0.04 * Math.sin(t * 3)) * h; ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.stroke() }
  // main roads: double lines
  const roads = [
    [[-0.02, 0.5], [0.25, 0.46], [0.5, 0.42], [0.75, 0.4], [1.02, 0.36]],
    [[0.56, -0.02], [0.58, 0.2], [0.55, 0.42], [0.5, 0.7], [0.46, 1.02]],
    [[0.0, 0.95], [0.25, 0.75], [0.4, 0.6], [0.55, 0.42]],
    [[0.98, 0.98], [0.8, 0.6], [0.7, 0.45], [0.75, 0.2], [0.9, -0.02]],
  ]
  for (const rd of roads) { ctx.strokeStyle = ink(0.75); ctx.lineWidth = 18; curve(rd); ctx.stroke(); ctx.strokeStyle = 'rgb(238,224,192)'; ctx.lineWidth = 12; curve(rd); ctx.stroke() }
  // the route to the venue: maroon dashes along the roads
  ctx.setLineDash([16, 12]); ctx.strokeStyle = 'rgba(122,24,40,0.85)'; ctx.lineWidth = 6; curve(roads[2]); ctx.stroke(); ctx.setLineDash([])
  // the venue: a ring and a dot
  const [ux, vy] = PIN_UV
  ctx.strokeStyle = 'rgba(122,24,40,0.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(ux * w, vy * h, 44, 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ux * w, vy * h, 58, 0, Math.PI * 2); ctx.stroke()
  // compass rose
  ctx.save(); ctx.translate(w * 0.88, h * 0.2); ctx.strokeStyle = ink(0.7); ctx.fillStyle = ink(0.55); ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.stroke()
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, L = k % 2 ? 46 : 84; ctx.beginPath(); ctx.moveTo(Math.cos(a) * L, Math.sin(a) * L); ctx.lineTo(Math.cos(a + 0.35) * 12, Math.sin(a + 0.35) * 12); ctx.lineTo(Math.cos(a - 0.35) * 12, Math.sin(a - 0.35) * 12); ctx.closePath(); ctx.fill() }
  ctx.restore()
  // decorative double border with corner flourishes
  ctx.strokeStyle = ink(0.7); ctx.lineWidth = 4; ctx.strokeRect(36, 36, w - 72, h - 72); ctx.lineWidth = 1.5; ctx.strokeRect(50, 50, w - 100, h - 100)
  for (const [cx, cy] of [[50, 50], [w - 50, 50], [50, h - 50], [w - 50, h - 50]]) { ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fillStyle = ink(0.6); ctx.fill() }
  // fold lines and wear
  for (const fx of [0.25, 0.5, 0.75]) { const g = ctx.createLinearGradient(fx * w - 10, 0, fx * w + 10, 0); g.addColorStop(0, 'rgba(90,60,30,0)'); g.addColorStop(0.5, 'rgba(90,60,30,0.16)'); g.addColorStop(1, 'rgba(90,60,30,0)'); ctx.fillStyle = g; ctx.fillRect(fx * w - 10, 0, 20, h) }
  { const g = ctx.createLinearGradient(0, h / 2 - 10, 0, h / 2 + 10); g.addColorStop(0, 'rgba(90,60,30,0)'); g.addColorStop(0.5, 'rgba(90,60,30,0.16)'); g.addColorStop(1, 'rgba(90,60,30,0)'); ctx.fillStyle = g; ctx.fillRect(0, h / 2 - 10, w, 20) }
  for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(150,100,50,0.06)'; ctx.beginPath(); ctx.arc(r() * w, r() * h, 60 + r() * 90, 0, Math.PI * 2); ctx.fill() }
  // the hall, drawn small beside the ring: a pillared front under a curved roof
  ctx.save(); ctx.translate(ux * w + 74, vy * h - 66); ctx.strokeStyle = ink(0.75); ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(0, -26, 26, 0); ctx.stroke()
  ctx.strokeRect(-22, 0, 44, 26); for (const px of [-12, 0, 12]) { ctx.beginPath(); ctx.moveTo(px, 4); ctx.lineTo(px, 26); ctx.stroke() }
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, -28); ctx.stroke(); ctx.restore()
  // faint contour lines in the open land
  ctx.strokeStyle = 'rgba(120,90,50,0.16)'; ctx.lineWidth = 1.5
  for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(w * 0.14, h * 0.18, 60 + k * 26, 36 + k * 16, 0.3, 0, Math.PI * 2); ctx.stroke() }
  // foxing: small brown age spots, and the ink softened where it bled into the fibres
  for (let k = 0; k < 140; k++) { ctx.fillStyle = `rgba(140,90,40,${0.04 + r() * 0.1})`; ctx.beginPath(); ctx.arc(r() * w, r() * h, 1 + r() * 5, 0, Math.PI * 2); ctx.fill() }
  ctx.filter = 'blur(0.6px)'; ctx.drawImage(ctx.canvas, 0, 0); ctx.filter = 'none'
}

/** Paper relief: fibres and fine tooth, for a bump map. */
function paperBump(ctx, w, h, r, N) {
  const img = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 128 + (N.n2(x / 2.2, y / 2.2) - 0.5) * 40 + (N.fbm(x / 30, y / 30, 3) - 0.5) * 30; const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255 }
  ctx.putImageData(img, 0, 0)
  for (let k = 0; k < 9000; k++) { const x = r() * w, y = r() * h, a = r() * Math.PI, L = 4 + r() * 18; ctx.strokeStyle = r() > 0.5 ? 'rgba(200,200,200,0.35)' : 'rgba(70,70,70,0.3)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke() }
}

/** The classic map-marker outline: a round head tapering to a point at (0,0); height 1. */
function markerShape(R = 0.32, cy = 0.66) {
  const s = new THREE.Shape()
  const a = Math.asin(R / cy) // tangent angle from the tip
  const t = Math.PI / 2 - a
  s.moveTo(0, 0)
  s.lineTo(Math.cos(t) * R, cy - Math.sin(t) * R)
  s.absarc(0, cy, R, -t, Math.PI + t, false)
  s.lineTo(0, 0)
  const hole = new THREE.Path(); hole.absarc(0, cy, R * 0.46, 0, Math.PI * 2, true)
  s.holes.push(hole)
  return s
}

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const land = (q.get('o') || 'portrait') === 'landscape'
  const r = rng(61)
  const N = makeNoise(67)
  const renderer = makeRenderer(W, H, { shadows: true, exposure: +(q.get('exp') || 0.95) })
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x24170e)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.5

  // map placement: pin world position
  const pinX = (PIN_UV[0] - 0.5) * MAP_W, pinZ = (PIN_UV[1] - 0.5) * MAP_D
  const camera = new THREE.PerspectiveCamera(land ? 26 : 30, W / H, 0.02, 30)
  const dist = +(q.get('d') || (land ? 1.2 : 1.05)), el = THREE.MathUtils.degToRad(+(q.get('el') || (land ? 30 : 34)))
  const az = THREE.MathUtils.degToRad(land ? -14 : -8)
  const target = new THREE.Vector3(pinX + (land ? 0.16 : 0.0), 0.05, pinZ + (land ? 0.02 : 0.1))
  camera.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist)
  camera.lookAt(target)
  camera.updateMatrixWorld()

  /* ---------------- teak table */
  const wood = canvasTex(0, (ctx, w, h) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const g = N.fbm(x / 400, y / 18, 4)
      const ring = 0.5 + 0.5 * Math.sin((y / 7 + g * 22))
      const v = 0.55 + 0.25 * ring + 0.12 * N.fbm(x / 30, y / 4, 3)
      const i = (y * w + x) * 4
      img.data[i] = 118 * v; img.data[i + 1] = 70 * v; img.data[i + 2] = 38 * v; img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, { w: 2048, h: 1024 })
  const pores = canvasTex(0, (ctx, w, h) => {
    ctx.fillStyle = '#909090'; ctx.fillRect(0, 0, w, h)
    for (let k = 0; k < 26000; k++) { const x = r() * w, y = r() * h; ctx.fillStyle = 'rgba(40,40,40,0.5)'; ctx.fillRect(x, y, 2 + r() * 7, 1) }
  }, { w: 2048, h: 1024, srgb: false })
  const table = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.5, bumpMap: pores, bumpScale: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.22 }))
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table)

  /* ---------------- the map, folded in panels */
  const mapTex = canvasTex(0, (ctx, w, h) => drawMap(ctx, w, h, r, N), { w: 2048, h: 1434 })
  const mg = new THREE.PlaneGeometry(MAP_W, MAP_D, 200, 140)
  const mp = mg.attributes.position
  for (let i = 0; i < mp.count; i++) {
    const x = mp.getX(i), y = mp.getY(i)
    const u = x / MAP_W + 0.5, v = 0.5 - y / MAP_D
    // mountain/valley creases at the folds, a slight lift at the corners
    let z = 0
    ;[[0.25, 1], [0.5, -1], [0.75, 1]].forEach(([fu, s]) => { z += s * 0.006 * Math.max(0, 1 - Math.abs(u - fu) / 0.25) })
    z += -0.004 * Math.max(0, 1 - Math.abs(v - 0.5) / 0.5)
    z += 0.012 * Math.pow(Math.max(Math.abs(u - 0.5) * 2, Math.abs(v - 0.5) * 2), 6)
    mp.setZ(i, z + 0.0125) // the deepest valley fold still sits above the table
  }
  mg.computeVertexNormals()
  const paperRelief = canvasTex(0, (ctx, w, h) => paperBump(ctx, w, h, r, N), { w: 2048, h: 1434, srgb: false })
  const paper = new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.88, bumpMap: paperRelief, bumpScale: 0.3, side: THREE.DoubleSide }))
  paper.rotation.x = -Math.PI / 2; paper.castShadow = !q.get("nopcs"); paper.receiveShadow = !q.get("noprs")
  scene.add(paper)

  /* ---------------- the brass pin, maroon enamel inside the ring */
  const pinH = 0.17
  const geo = new THREE.ExtrudeGeometry(markerShape(), { depth: 0.11, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 8, curveSegments: 64 })
  geo.translate(0, 0, -0.055)
  geo.scale(pinH, pinH, pinH)
  const brass = brassMaterial({ seed: 21, color: 0xe0b158, roughness: 0.2, turning: false })
  // the face: a beaded border following the outline and scrolls of filigree (uv = the shape's own units)
  const face = canvasTex(0, (ctx, w, h) => {
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h)
    const X = (x) => (x / 0.8 + 0.5) * w, Y = (y) => (1 - y / 1.05) * h
    ctx.fillStyle = '#d8d8d8'
    for (let k = 0; k < 64; k++) { const a = (k / 64) * Math.PI * 2; const x = Math.cos(a) * 0.27, y = 0.66 + Math.sin(a) * 0.27; if (y < 0.48 && Math.abs(x) > 0.18) continue; ctx.beginPath(); ctx.arc(X(x), Y(y), 5, 0, Math.PI * 2); ctx.fill() }
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 3
    for (const sgn of [-1, 1]) for (let k = 0; k < 3; k++) { // scrolls down each side toward the point
      const cx = sgn * (0.12 - k * 0.035), cy = 0.38 - k * 0.1
      ctx.beginPath(); for (let t = 0; t < 1; t += 0.02) { const a = t * Math.PI * 3.2, rr = 0.035 * (1 - t * 0.8); ctx.lineTo(X(cx + sgn * Math.cos(a) * rr), Y(cy + Math.sin(a) * rr)) } ctx.stroke()
    }
  }, { w: 512, h: 672, srgb: false })
  face.repeat.set(1 / 0.8, 1 / 1.05); face.offset.set(0.5, 0)
  const faceBrass = brass.clone(); faceBrass.bumpMap = face; faceBrass.bumpScale = +(q.get("fbs") || 1.0)
  if (q.get("dbgface")) faceBrass.map = face
  const pin = new THREE.Group()
  const body = new THREE.Mesh(geo, [faceBrass, brass]); body.castShadow = true; pin.add(body)
  const enamel = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * 0.46 * pinH, 0.32 * 0.46 * pinH, 0.07 * pinH, 64), new THREE.MeshPhysicalMaterial({ color: 0x6e1022, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }))
  enamel.rotation.x = Math.PI / 2; enamel.position.y = 0.66 * pinH; pin.add(enamel)
  // a small gold lotus on the enamel
  for (let k = 0; k < 7; k++) {
    const pg = new THREE.SphereGeometry(1, 16, 10); pg.scale(0.0042, 0.0115, 0.002)
    const petal = new THREE.Mesh(pg, brass)
    const a = (k - 3) * 0.42
    petal.position.set(Math.sin(a) * 0.009, 0.66 * pinH - 0.004 + Math.cos(a) * 0.009, 0.038 * pinH + 0.001)
    petal.rotation.z = -a
    pin.add(petal)
  }
  pin.position.set(pinX, 0.01, pinZ)
  pin.rotation.y = land ? -0.25 : -0.12
  scene.add(pin)

  /* ---------------- jasmine and petals across the map */
  const m = new THREE.Matrix4()
  const jPath = new THREE.CatmullRomCurve3([[-0.34, 0.2], [-0.22, 0.02], [-0.06, -0.12], [0.14, -0.2], [0.34, -0.18], [0.46, -0.06]].map(([x, z]) => new THREE.Vector3(pinX + x, 0.0145, pinZ + z)))
  scene.add(jasmineStrand(jPath, { seed: 19, budLen: 0.022, spacing: 0.005, lift: 0.25 }))
  scene.add(marigolds([{ pos: new THREE.Vector3(pinX - 0.2, 0.04, pinZ + 0.08), size: 0.05 }, { pos: new THREE.Vector3(pinX + 0.27, 0.035, pinZ + 0.16), size: 0.042, yellow: true }, { pos: new THREE.Vector3(pinX + 0.36, 0.035, pinZ - 0.2), size: 0.04 }], { petals: 240, seed: 14 }))
  const spots = []
  for (let k = 0; k < 30; k++) { const a = r() * Math.PI * 2, rr = 0.12 + r() * 0.42; const p = new THREE.Vector3(pinX + Math.cos(a) * rr * 1.2, 0.0085, pinZ + Math.sin(a) * rr * 0.8 + 0.08); spots.push({ pos: p, size: 0.016 + r() * 0.008, color: k % 3 ? '#ff8a00' : '#a80f26' }) }
  scene.add(scatteredPetals(spots, { seed: 15 }))

  /* ---------------- daylight */
  const key = new THREE.DirectionalLight(0xfff0d8, +(q.get('kl') || 2.6))
  key.position.set(pinX - 0.9, 1.1, pinZ + 0.55); key.target.position.set(pinX, 0, pinZ); scene.add(key.target); key.castShadow = true
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 4; key.shadow.bias = -0.0003
  Object.assign(key.shadow.camera, { left: -0.7, right: 0.7, top: 0.7, bottom: -0.7, near: 0.1, far: 4 })
  scene.add(key)
  scene.add(new THREE.HemisphereLight(0xfff4e4, 0x4a3018, 0.35))

  const comp = makeComposer(renderer, scene, camera, W, H, {
    bloom: [0.12, 0.4, 2.0],
    ao: q.get('noao') ? null : { radius: 0.03, thickness: 0.015, intensity: 0.85 },
    dof: q.get('nodof') ? null : { focus: camera.position.distanceTo(pin.position) + 0.02, aperture: +(q.get('ap') || 0.02), maxblur: 0.014 },
    grade: { vignette: 0.38, lift: [0.015, 0.01, 0.005], gain: [1.02, 1.0, 0.96], ca: 0.0006 },
  })
  comp.render()
  window.__lights = []
}
