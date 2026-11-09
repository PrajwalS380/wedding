// The invitation scroll's parts, for the site to assemble and animate (transparent, straight-on, orthographic —
// so every layer lines up exactly with every other):
//
//   part=roll    one rolled length of parchment on a brass rod, turned brass finials at both ends
//   part=closed  both rolls tied together, with the ribbon's and the bow's soft shadows on them (not the ribbon)
//   part=band    the silk ribbon — maroon satin with woven gold borders — wrapped round both rolls
//   part=bow     the bow: a knot, two loops pinched where they're tied, two tails with forked ends
//   part=seal    the wax seal pressed over the knot, its monogram embossed, a rim of squeezed-out wax
//
// Units: the paper is 2 wide; x right, y up, z towards the viewer. window.__meta tells the exporter where
// things are, so the page can place the rolls exactly over the tied picture.
import { THREE, rng, makeNoise, canvasTex, makeRenderer } from '../lib/common.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { brassMaterial } from '../lib/materials.js'
import { marigolds } from '../lib/flora.js'
import serif600 from '../../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2?url'
import serif500i from '../../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2?url'

const R = 0.1 // the roll's radius
const HALF = 1 // half the paper's width
const FRAME = { roll: [-1.3, 1.3, -0.14, 0.14], tied: [-1.3, 1.3, -0.76, 0.3] }
const SEAL_R = 0.165

/* ---------------------------------------------------------------- textures */

function paperTexture(N, r) {
  // u runs round the roll, v along it
  return canvasTex(0, (ctx, w, h) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = N.fbm(x / 90, y / 40, 4),
          f = N.n2(x / 2.2, y / 7)
        const end = Math.min(y, h - 1 - y) / h // towards the ends the paper is darker, handled
        const age = 1 - 0.1 * Math.max(0, 1 - end * 14)
        const streak = N.n2(x / 1.5, y / 60) // fine striations along the roll
        const k = (0.86 + 0.2 * n + 0.07 * (f - 0.5) + 0.05 * (streak - 0.5)) * age
        const i = (y * w + x) * 4
        img.data[i] = 228 * k
        img.data[i + 1] = 202 * k
        img.data[i + 2] = 156 * k
        img.data[i + 3] = 255
      }
    ctx.putImageData(img, 0, 0)
    // fibres
    for (let k = 0; k < 2600; k++) {
      ctx.globalAlpha = 0.06 + r() * 0.1
      ctx.strokeStyle = r() > 0.5 ? '#b89a6a' : '#fff6e2'
      ctx.lineWidth = 0.6
      const x = r() * w,
        y = r() * h,
        a = r() * Math.PI,
        L = 4 + r() * 16
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (r() - 0.5) * 3, y + Math.sin(a) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L)
      ctx.stroke()
    }
    // foxing: a few faint age spots
    for (let k = 0; k < 40; k++) {
      ctx.globalAlpha = 0.04 + r() * 0.06
      ctx.fillStyle = '#9a6a3a'
      ctx.beginPath()
      ctx.arc(r() * w, r() * h, 1 + r() * 4, 0, Math.PI * 2)
      ctx.fill()
    }
    // where the outer layers end: faint lines along the roll
    for (const u of [0.31, 0.58, 0.77]) {
      ctx.globalAlpha = 0.22
      ctx.fillStyle = '#8a6a44'
      ctx.fillRect(u * w, 0, 1.5, h)
      ctx.globalAlpha = 0.18
      ctx.fillStyle = '#fff4dc'
      ctx.fillRect(u * w + 1.5, 0, 1, h)
    }
    ctx.globalAlpha = 1
  }, { w: 1024, h: 512 })
}

function ribbonMaps(r) {
  // u across the ribbon, v along it: maroon satin, a woven gold border near each edge
  const draw = (mode) => (ctx, w, h) => {
    const satin = mode === 'map' ? '#4c0915' : mode === 'metal' ? '#000' : '#6a6a6a'
    ctx.fillStyle = satin
    ctx.fillRect(0, 0, w, h)
    if (mode === 'map')
      for (let x = 0; x < w; x++) {
        ctx.globalAlpha = 0.05 + r() * 0.07
        ctx.fillStyle = r() > 0.5 ? '#8f2235' : '#4a0915'
        ctx.fillRect(x, 0, 1, h)
      }
    ctx.globalAlpha = 1
    for (const [a, b] of [
      [0.05, 0.15],
      [0.85, 0.95],
    ]) {
      const x0 = a * w,
        x1 = b * w
      ctx.fillStyle = mode === 'map' ? '#c8953c' : mode === 'metal' ? '#fff' : '#555'
      ctx.fillRect(x0, 0, x1 - x0, h)
      // zari weave: tiny diagonal ticks and a darker line either side
      if (mode !== 'metal') {
        ctx.fillStyle = mode === 'map' ? '#e7c071' : '#3c3c3c'
        for (let y = 0; y < h; y += 4) for (let x = x0 + ((y / 4) % 2) * 2; x < x1; x += 4) ctx.fillRect(x, y, 2, 2)
      }
      ctx.fillStyle = mode === 'map' ? '#3d0610' : mode === 'metal' ? '#000' : '#9a9a9a'
      ctx.fillRect(x0 - 2, 0, 2, h)
      ctx.fillRect(x1, 0, 2, h)
    }
  }
  return {
    map: canvasTex(0, draw('map'), { w: 256, h: 256, repeat: true }),
    metal: canvasTex(0, draw('metal'), { w: 256, h: 256, srgb: false, repeat: true }),
    rough: canvasTex(0, draw('rough'), { w: 256, h: 256, srgb: false, repeat: true }),
  }
}

/* ---------------------------------------------------------------- geometry */

/** A ribbon swept along a curve: `across(t)` is the direction its width lies in, `width(t)` its width. */
function strip(points, { across, width, cup = 0.06, seg = 140, vcut = 0, texLen = 1 }) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  const len = curve.getLength()
  const COLS = 7
  const pos = [],
    uv = [],
    idx = []
  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const c = curve.getPointAt(t),
      T = curve.getTangentAt(t)
    const up = across(t).clone()
    const B = up.sub(T.clone().multiplyScalar(up.dot(T))).normalize()
    const N = new THREE.Vector3().crossVectors(T, B).normalize()
    const w = width(t)
    for (let j = 0; j < COLS; j++) {
      const s = (j / (COLS - 1)) * 2 - 1
      const p = c.clone().addScaledVector(B, (s * w) / 2).addScaledVector(N, cup * w * (1 - s * s))
      if (vcut && i === seg) p.addScaledVector(T, vcut * (Math.abs(s) - 1)) // a forked end
      pos.push(p.x, p.y, p.z)
      uv.push(j / (COLS - 1), ((t * len) / texLen) % 1e6)
    }
  }
  for (let i = 0; i < seg; i++)
    for (let j = 0; j < COLS - 1; j++) {
      const a = i * COLS + j,
        b = a + 1,
        c = a + COLS,
        d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function roll(N, r, paperMat, brass, rod) {
  const g = new THREE.Group()
  // the paper: a cylinder along x, not quite even, its torn ends a little ragged
  const cyl = new THREE.CylinderGeometry(R, R, HALF * 2, 160, 40, true)
  const P = cyl.attributes.position
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i),
      y = P.getY(i),
      z = P.getZ(i)
    const a = Math.atan2(z, x)
    const along = y / HALF
    const k = 1 + 0.012 * (N.n2(along * 6, 0.3) - 0.5) + 0.006 * Math.sin(a * 3 + along * 2)
    const endy = Math.abs(along) > 0.99 ? y + Math.sign(y) * 0.006 * (N.n2(a * 4, 2.1) - 0.5) : y
    P.setXYZ(i, x * k, endy, z * k)
  }
  cyl.computeVertexNormals()
  cyl.rotateZ(-Math.PI / 2)
  const paper = new THREE.Mesh(cyl, paperMat)
  // the rolled layers seen at each end
  const spiral = canvasTex(0, (ctx, w, h) => {
    ctx.fillStyle = '#d9c296'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#8c6a3e'
    for (let k = 0; k < 900; k++) {
      const th = (k / 900) * Math.PI * 2 * 24
      const rr = (0.24 + (0.76 * k) / 900) * (w / 2)
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, rr, th, th + 0.2)
      ctx.stroke()
    }
  }, { w: 256, h: 256 })
  const capMat = new THREE.MeshStandardMaterial({ map: spiral, roughness: 0.95 })
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.RingGeometry(0.024, R * 0.99, 64), capMat)
    cap.rotation.y = (s * Math.PI) / 2
    cap.position.x = s * HALF * 0.999
    g.add(cap)
  }
  paper.castShadow = paper.receiveShadow = true
  g.add(paper)
  // the rod and its finials
  const rodGeo = new THREE.CylinderGeometry(0.022, 0.022, 2.12, 32)
  rodGeo.rotateZ(Math.PI / 2)
  g.add(new THREE.Mesh(rodGeo, rod))
  const prof = [
    [0.0, 0.0],
    [0.034, 0.0],
    [0.064, 0.004],
    [0.066, 0.012],
    [0.06, 0.016],
    [0.03, 0.019],
    [0.026, 0.03],
    [0.05, 0.038],
    [0.052, 0.044],
    [0.05, 0.05],
    [0.034, 0.056],
    [0.05, 0.068],
    [0.082, 0.088],
    [0.094, 0.108],
    [0.088, 0.128],
    [0.066, 0.142],
    [0.036, 0.152],
    [0.046, 0.16],
    [0.046, 0.168],
    [0.03, 0.176],
    [0.012, 0.188],
    [0.004, 0.196],
    [0, 0.198],
  ]
  const lathe = new THREE.LatheGeometry(
    prof.map(([a, b]) => new THREE.Vector2(a, b)),
    96,
  )
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(lathe, brass)
    f.rotation.z = (-s * Math.PI) / 2
    f.position.x = s * (HALF + 0.008)
    f.castShadow = f.receiveShadow = true
    g.add(f)
  }
  return g
}

/** The wax seal's height (0…1) and outline, drawn on a canvas: squeezed-out rim, pressed field, monogram. */
async function sealCanvas(N, r) {
  const S = 1024
  const font = new FontFace('SealSerif', `url(${serif600})`)
  const fontI = new FontFace('SealSerifI', `url(${serif500i})`)
  try {
    await Promise.all([font.load(), fontI.load()])
    document.fonts.add(font)
    document.fonts.add(fontI)
  } catch {
    /* falls back to a system serif */
  }
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, S, S)
  const C = S / 2
  // the blob of wax: an uneven round with a couple of runs
  ctx.beginPath()
  for (let k = 0; k <= 200; k++) {
    const a = (k / 200) * Math.PI * 2
    const run = Math.max(0, Math.cos(a - 2.2)) ** 18 * 0.07 + Math.max(0, Math.cos(a + 0.6)) ** 24 * 0.05
    const rr = (0.9 + 0.045 * (N.n2(Math.cos(a) * 2 + 3, Math.sin(a) * 2) - 0.5) * 2 + run) * C * 0.96
    const x = C + Math.cos(a) * rr,
      y = C + Math.sin(a) * rr
    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = '#9a9a9a'
  ctx.fill()
  ctx.filter = 'blur(10px)'
  ctx.drawImage(c, 0, 0)
  ctx.filter = 'none'
  // a thick lip round the stamp where the wax was pushed out
  const g1 = ctx.createRadialGradient(C, C, C * 0.6, C, C, C * 0.86)
  g1.addColorStop(0, 'rgba(210,210,210,0)')
  g1.addColorStop(0.35, 'rgba(210,210,210,1)')
  g1.addColorStop(1, 'rgba(160,160,160,0)')
  ctx.fillStyle = g1
  ctx.beginPath()
  ctx.arc(C, C, C * 0.86, 0, Math.PI * 2)
  ctx.fill()
  // the pressed field
  ctx.fillStyle = '#6a6a6a'
  ctx.beginPath()
  ctx.arc(C, C, C * 0.66, 0, Math.PI * 2)
  ctx.fill()
  ctx.filter = 'blur(3px)'
  ctx.drawImage(c, 0, 0)
  ctx.filter = 'none'
  // the stamp's rings, a ring of tiny dots, little leaves
  ctx.strokeStyle = '#a8a8a8'
  ctx.lineWidth = C * 0.022
  ctx.beginPath()
  ctx.arc(C, C, C * 0.6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = C * 0.008
  ctx.beginPath()
  ctx.arc(C, C, C * 0.54, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#a4a4a4'
  for (let k = 0; k < 44; k++) {
    const a = (k / 44) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(C + Math.cos(a) * C * 0.572, C + Math.sin(a) * C * 0.572, C * 0.008, 0, Math.PI * 2)
    ctx.fill()
  }
  for (const s of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 2 + s * (0.42 + k * 0.17)
      ctx.save()
      ctx.translate(C + Math.cos(a) * C * 0.47, C + Math.sin(a) * C * 0.47)
      ctx.rotate(a + (s * Math.PI) / 2)
      ctx.beginPath()
      ctx.ellipse(0, 0, C * 0.034, C * 0.013, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  // the monogram
  ctx.fillStyle = '#b4b4b4'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const [a, b] = (new URLSearchParams(location.search).get('mono') || 'DV').split('')
  ctx.font = `600 ${C * 0.58}px SealSerif, Georgia, serif`
  ctx.fillText(a, C - C * 0.2, C + C * 0.2)
  ctx.fillText(b, C + C * 0.22, C + C * 0.2)
  ctx.font = `italic 500 ${C * 0.3}px SealSerifI, Georgia, serif`
  ctx.fillText('&', C + C * 0.005, C + C * 0.12)
  ctx.filter = 'blur(1.6px)'
  ctx.drawImage(c, 0, 0)
  ctx.filter = 'none'
  return ctx.getImageData(0, 0, S, S)
}

function sealGeometry(data) {
  const S = data.width
  const SEG = 320
  const g = new THREE.PlaneGeometry(SEAL_R * 2, SEAL_R * 2, SEG, SEG)
  const P = g.attributes.position
  const hAt = (u, v) => {
    const x = Math.min(S - 1, Math.max(0, Math.round(u * (S - 1)))),
      y = Math.min(S - 1, Math.max(0, Math.round((1 - v) * (S - 1))))
    return data.data[(y * S + x) * 4] / 255
  }
  const keep = new Uint8Array(P.count)
  const col = new Float32Array(P.count * 3)
  for (let i = 0; i < P.count; i++) {
    const u = P.getX(i) / (SEAL_R * 2) + 0.5,
      v = P.getY(i) / (SEAL_R * 2) + 0.5
    const h = hAt(u, v)
    keep[i] = h > 0.12 ? 1 : 0
    P.setZ(i, Math.max(0, h - 0.12) * 0.07)
    // wax is darker in the hollows, a touch lighter and warmer on the high spots
    const k = Math.min(1, Math.max(0, (h - 0.3) / 0.55))
    col.set([0.085 + 0.12 * k, 0.006 + 0.01 * k, 0.012 + 0.012 * k], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const idx = g.index.array
  const out = []
  for (let i = 0; i < idx.length; i += 3) if (keep[idx[i]] && keep[idx[i + 1]] && keep[idx[i + 2]]) out.push(idx[i], idx[i + 1], idx[i + 2])
  g.setIndex(out)
  g.computeVertexNormals()
  return g
}

/* ---------------------------------------------------------------- the scene */

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const part = q.get('part') || 'closed'
  const r = rng(11)
  const N = makeNoise(5)
  const renderer = makeRenderer(W, H, { alpha: true, shadows: true, exposure: +(q.get('exp') || 1.0) })
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.55

  const [x0, x1, y0, y1] = part === 'roll' ? FRAME.roll : FRAME.tied
  const camera = new THREE.OrthographicCamera(x0, x1, y1, y0, 0.1, 10)
  camera.position.set(0, 0, 4)
  camera.lookAt(0, 0, 0)

  // warm candle-like key from the upper left, a soft fill, a cool-ish rim from behind
  const key = new THREE.DirectionalLight(0xffe2bc, 2.5)
  key.position.set(-1.1, 2.6, 1.3)
  key.castShadow = true
  key.shadow.mapSize.set(4096, 4096)
  key.shadow.radius = 5
  key.shadow.bias = -0.0003
  key.shadow.normalBias = 0.002
  Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1, bottom: -1, near: 0.1, far: 8 })
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xffd6a8, 0.32)
  fill.position.set(1.6, -0.4, 2)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xfff0e0, 0.7)
  rim.position.set(0.3, 2, -1.5)
  scene.add(rim)
  scene.add(new THREE.HemisphereLight(0xfff3e2, 0x2a160c, 0.28))

  const paperMap = paperTexture(N, r)
  const paperMat = new THREE.MeshStandardMaterial({ map: paperMap, bumpMap: paperMap, bumpScale: 0.9, roughness: 0.86, envMapIntensity: 0.18 })
  const brass = brassMaterial({ seed: 21, color: 0xd6a24a, roughness: 0.24, bumpScale: 0.25 })
  const rod = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.5 })

  const hidden = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }) // casts shadows only
  const occluder = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }) // hides what's behind it only
  const groups = { rolls: new THREE.Group(), band: new THREE.Group(), bow: new THREE.Group(), seal: new THREE.Group() }
  Object.values(groups).forEach((g) => scene.add(g))

  if (part === 'roll') {
    groups.rolls.add(roll(N, r, paperMat, brass, rod))
  } else {
    const top = roll(N, r, paperMat, brass, rod)
    top.position.y = R
    const bottom = roll(N, r, paperMat, brass, rod)
    bottom.position.y = -R
    bottom.rotation.x = 1.3 // its layers' edges elsewhere
    groups.rolls.add(top, bottom)

    // the ribbon
    const maps = ribbonMaps(r)
    const silk = new THREE.MeshPhysicalMaterial({
      map: maps.map,
      metalnessMap: maps.metal,
      metalness: 1,
      roughnessMap: maps.rough,
      roughness: 0.6,
      sheen: 0.45,
      sheenColor: new THREE.Color('#a33244'),
      sheenRoughness: 0.32,
      envMapIntensity: 0.6,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
      side: THREE.DoubleSide,
    })
    const X = new THREE.Vector3(1, 0, 0)
    const e = 0.006,
      BW = 0.115
    // round the top of the upper roll, straight down the front, under the lower roll
    const path = []
    for (let k = 0; k <= 24; k++) {
      const p = Math.PI * 0.94 * (1 - k / 24)
      path.push(new THREE.Vector3(0, R + (R + e) * Math.sin(p), (R + e) * Math.cos(p)))
    }
    for (let k = 1; k < 8; k++) path.push(new THREE.Vector3(0, R - (2 * R * k) / 8, R + e))
    for (let k = 0; k <= 24; k++) {
      const p = Math.PI * 0.94 * (k / 24)
      path.push(new THREE.Vector3(0, -R - (R + e) * Math.sin(p), (R + e) * Math.cos(p)))
    }
    const band = new THREE.Mesh(strip(path, { across: () => X, width: () => BW, cup: 0, seg: 220, texLen: BW }), silk)
    band.castShadow = true
    groups.band.add(band)

    // the bow: a knot, two loops, two tails
    const zk = R + 0.045
    const knotPts = []
    for (let k = 0; k <= 30; k++) {
      const a = (k / 30) * Math.PI * 2 * 0.98 - Math.PI / 2
      knotPts.push(new THREE.Vector3(0, Math.sin(a) * 0.034, zk + Math.cos(a) * 0.03))
    }
    const knot = new THREE.Mesh(strip(knotPts, { across: () => X, width: () => 0.07, cup: -0.05, seg: 60, texLen: 0.07 }), silk)
    const loop = (s, lift) => {
      const pts = [
        [0.015, 0.0, zk + 0.02],
        [0.1, 0.03 + lift * 0.4, zk + 0.035],
        [0.2, 0.055 + lift, zk + 0.03],
        [0.275, 0.065 + lift, zk + 0.012],
        [0.305, 0.052 + lift, zk - 0.012],
        [0.28, 0.034 + lift, zk - 0.036],
        [0.19, 0.018 + lift * 0.6, zk - 0.042],
        [0.09, 0.006, zk - 0.03],
        [0.015, -0.002, zk - 0.012],
      ].map(([x, y, z]) => new THREE.Vector3(s * x, y, z))
      const up = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), s * -0.18)
      return new THREE.Mesh(strip(pts, { across: () => up, width: (t) => 0.13 * (0.32 + 0.68 * Math.pow(Math.sin(Math.PI * t), 0.55)), cup: 0.1, seg: 120, texLen: 0.13 }), silk)
    }
    const tail = (s, len, sway) => {
      const pts = [
        [0.012, -0.012, zk + 0.008],
        [0.045, -0.09, zk + 0.02],
        [0.075, -0.18, zk + 0.016],
        [0.09 + sway, -0.3, zk - 0.004],
        [0.1 + sway * 1.6, -0.42, zk - 0.03],
        [0.11 + sway * 2, -len, zk - 0.05],
      ].map(([x, y, z]) => new THREE.Vector3(s * x, y, z))
      return new THREE.Mesh(
        strip(pts, {
          across: (t) => X.clone().applyAxisAngle(new THREE.Vector3(0, -1, 0).normalize(), s * (0.15 + 0.55 * t * t)).applyAxisAngle(new THREE.Vector3(0, 0, 1), s * 0.2),
          width: (t) => 0.11 * (0.55 + 0.45 * Math.min(1, t * 4)),
          cup: 0.05,
          seg: 160,
          vcut: 0.04,
          texLen: 0.11,
        }),
        silk,
      )
    }
    // two small marigolds tucked in where the loops are tied
    const tucked = marigolds(
      [
        { pos: new THREE.Vector3(-0.155, 0.058, zk + 0.032), size: 0.075 },
        { pos: new THREE.Vector3(0.16, -0.048, zk + 0.028), size: 0.066, yellow: true },
      ],
      { petals: 220, seed: 9 },
    )
    tucked.traverse((o) => (o.castShadow = o.receiveShadow = true))
    groups.bow.add(tucked)
    for (const m of [knot, loop(-1, 0.01), loop(1, -0.012), tail(-1, 0.6, 0.0), tail(1, 0.54, 0.015)]) {
      m.castShadow = m.receiveShadow = true
      groups.bow.add(m)
    }

    // the wax seal over the knot
    const seal = new THREE.Mesh(
      sealGeometry(await sealCanvas(N, r)),
      new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.18, envMapIntensity: 0.28, sheen: 0.2, sheenColor: new THREE.Color('#8a2030') }),
    )
    seal.position.set(0, -0.004, zk + 0.034)
    seal.rotation.z = -0.08
    seal.castShadow = seal.receiveShadow = true
    groups.seal.add(seal)
    band.receiveShadow = true

    // what each layer shows: the rest only hides what is behind it, or only casts its shadow
    const role = { closed: { rolls: 'show', band: 'shadow', bow: 'shadow', seal: 'shadow' }, band: { rolls: 'occlude', band: 'show', bow: 'shadow', seal: 'shadow' }, bow: { rolls: 'occlude', band: 'occlude', bow: 'show', seal: 'shadow' }, seal: { rolls: 'occlude', band: 'occlude', bow: 'occlude', seal: 'show' } }[part]
    for (const [name, g] of Object.entries(groups)) {
      if (role[name] === 'show') continue
      g.traverse((o) => {
        if (o.isMesh) o.material = role[name] === 'shadow' ? hidden : occluder
      })
    }
  }

  renderer.render(scene, camera)
  // where things are, as fractions of the picture (from the top left)
  const fx = (x) => (x - x0) / (x1 - x0),
    fy = (y) => (y1 - y) / (y1 - y0)
  window.__meta = {
    frame: { x0, x1, y0, y1, aspect: (x1 - x0) / (y1 - y0) },
    paper: { left: fx(-HALF), right: fx(HALF) },
    rollRadius: R / (y1 - y0),
    rolls: part === 'roll' ? { centre: fy(0) } : { top: fy(R), bottom: fy(-R) },
    seal: { x: fx(0), y: fy(-0.004), r: SEAL_R / (x1 - x0) },
  }
}
