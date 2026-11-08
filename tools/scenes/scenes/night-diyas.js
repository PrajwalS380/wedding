// A2 · Diyas on polished granite: clay lamps with pinched spouts, oil, cotton wicks and live flames that light the floor,
// marigold and rose petals, whole marigold heads, warm background bokeh and a shallow depth of field.
import { THREE, rng, makeNoise, canvasTex, makeRenderer, makeComposer, exportLights } from '../lib/common.js'
import { flameMaterial, haloMaterial, bokehMaterial, marigolds, scatteredPetals } from '../lib/flora.js'
import { makeGlossFloor } from '../lib/water.js'

export function diyaGeometry() {
  const prof = [[0, 0], [0.02, 0], [0.028, 0.0015], [0.037, 0.0065], [0.0445, 0.0145], [0.0465, 0.0205], [0.045, 0.0228], [0.0418, 0.0226], [0.0385, 0.0195], [0.03, 0.0148], [0.016, 0.0122], [0, 0.0116]]
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 64)
  const p = g.attributes.position
  const col = []
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const r = Math.hypot(x, z), a = Math.atan2(z, x)
    const f = Math.exp(-(a * a) / (2 * 0.3 * 0.3))
    const k = Math.pow(r / 0.0465, 2)
    const s = 1 + 0.42 * f * k
    x *= s; z *= s * (1 - 0.35 * f * k)
    y += 0.0045 * f * Math.pow(r / 0.0465, 3)
    p.setXYZ(i, x, y, z)
    const soot = f * k * 0.65
    col.push(1 - soot, 1 - soot * 1.05, 1 - soot * 1.1)
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

export function terracottaTex(seed = 3) {
  const N = makeNoise(seed)
  return canvasTex(0, (ctx, w, h) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = N.fbm(x / 30, y / 30), s = N.n2(x / 2.2, y / 2.2)
      const i = (y * w + x) * 4
      const v = 0.8 + 0.35 * (n - 0.5) - (s > 0.82 ? 0.25 : 0) + (s < 0.1 ? 0.12 : 0)
      img.data[i] = 165 * v; img.data[i + 1] = 82 * v; img.data[i + 2] = 46 * v; img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, { w: 512, h: 256 })
}

export function makeDiya(r, tex, { seed = 0, lightIntensity = 0.35 } = {}) {
  const grp = new THREE.Group()
  const clay = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, vertexColors: true, bumpMap: tex, bumpScale: 0.0006 })
  const body = new THREE.Mesh(diyaGeometry(), clay)
  grp.add(body)
  const oil = new THREE.Mesh(new THREE.CircleGeometry(0.0352, 40), new THREE.MeshPhysicalMaterial({ color: 0x4a2606, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 }))
  oil.rotation.x = -Math.PI / 2; oil.position.y = 0.0168; oil.scale.x = 1.12
  grp.add(oil)
  const wickCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.012, 0.0172, 0.003), new THREE.Vector3(0.04, 0.019, 0), new THREE.Vector3(0.0575, 0.0258, 0), new THREE.Vector3(0.0625, 0.0322, 0)])
  grp.add(new THREE.Mesh(new THREE.TubeGeometry(wickCurve, 20, 0.0019, 6), new THREE.MeshStandardMaterial({ color: 0xece2c8, roughness: 0.95 })))
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0024, 8, 6), new THREE.MeshStandardMaterial({ color: 0x1a120c, emissive: 0xff5a10, emissiveIntensity: 2.5 }))
  tip.position.set(0.0628, 0.0328, 0)
  grp.add(tip)
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flameMaterial(seed))
  flame.position.set(0.0628, 0.0318, 0)
  flame.scale.set(0.0175 * (0.9 + r() * 0.2), 0.05 * (0.88 + r() * 0.25), 1)
  grp.add(flame)
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(0xff9a3a, 0.22, 2.4))
  halo.position.set(0.0628, 0.05, 0); halo.scale.setScalar(0.2)
  grp.add(halo)
  const light = new THREE.PointLight(0xff9440, lightIntensity, 0, 2)
  light.position.set(0.0628, 0.05, 0)
  grp.add(light)
  return grp
}

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const r = rng(17)
  const renderer = makeRenderer(W, H, { exposure: +(q.get('exp') || 1.1) })
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020203)
  const land = (q.get('o') || 'portrait') === 'landscape'
  const camera = new THREE.PerspectiveCamera(+(q.get('fov') || (land ? 24 : 30)), W / H, 0.01, 50)
  if (land) { camera.position.set(0.2, 0.15, 0.75); camera.lookAt(-0.14, 0.045, -0.4) }
  else { camera.position.set(0.05, 0.14, 0.62); camera.lookAt(-0.18, 0.045, -0.35) }

  const floor = makeGlossFloor({ size: 30, W: W >> 1, H: H >> 1, base: 0x070606, reflect: 0.85, blur: 0.0035 })
  scene.add(floor)
  scene.add(new THREE.HemisphereLight(0x2a2440, 0x050403, 0.25))

  const tex = terracottaTex(5)
  const row = new THREE.CatmullRomCurve3([new THREE.Vector3(0.24, 0, 0.3), new THREE.Vector3(0.02, 0, 0.0), new THREE.Vector3(-0.32, 0, -0.55), new THREE.Vector3(-0.7, 0, -1.4), new THREE.Vector3(-1.0, 0, -2.6)])
  const n = 11
  const diyaPos = []
  const flames = []
  for (let i = 0; i < n; i++) {
    const t = Math.pow(i / (n - 1), 1.25)
    const p = row.getPointAt(t)
    const d = makeDiya(r, tex, { seed: i * 1.7, lightIntensity: +(q.get('li') || 0.32) })
    d.position.copy(p)
    d.rotation.y = -0.9 + (r() - 0.5) * 0.5 + (i % 2 ? 0.3 : 0)
    d.scale.setScalar(1 + (r() - 0.5) * 0.08)
    scene.add(d)
    diyaPos.push(p)
    d.updateMatrixWorld()
    flames.push({ pos: d.localToWorld(new THREE.Vector3(0.0628, 0.058, 0)), radius: 0.035, kind: 'flame' })
  }
  exportLights(camera, W, H, flames)
  // petals and marigold heads around the lamps
  const spots = []
  const palette = ['#ff8a00', '#ff9a12', '#ffb000', '#ffc21a', '#b3122a', '#c8203a', '#f4ede0', '#e87400']
  for (let k = 0; k < 520; k++) {
    const base = diyaPos[Math.floor(Math.pow(r(), 1.6) * diyaPos.length)]
    const a = r() * Math.PI * 2, rad = 0.05 + Math.pow(r(), 0.7) * 0.22
    spots.push({ pos: new THREE.Vector3(base.x + Math.cos(a) * rad, 0.0012 + r() * 0.002, base.z + Math.sin(a) * rad), size: 0.009 + r() * 0.008, color: palette[Math.floor(r() * palette.length)] })
  }
  scene.add(scatteredPetals(spots, { seed: 4 }))
  const heads = []
  ;[[0.17, 0.12], [-0.08, -0.12], [0.11, -0.2], [-0.32, -0.35], [-0.5, -0.82], [0.3, 0.18], [-0.12, 0.12]].forEach(([x, z], i) => {
    heads.push({ pos: new THREE.Vector3(x, 0.018, z), size: 0.026 + r() * 0.008, yellow: i % 3 === 1 })
  })
  scene.add(marigolds(heads, { petals: 300, seed: 8 }))

  // distant warm bokeh (the hall behind)
  for (let i = 0; i < 16; i++) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bokehMaterial(i % 3 ? 0xffa850 : 0xffd0a0, 0.16 + r() * 0.14))
    b.position.set(-2.4 + r() * 4.2, 0.1 + r() * 0.55, -4 - r() * 3)
    b.scale.setScalar(0.1 + r() * 0.12)
    scene.add(b)
  }

  const comp = makeComposer(renderer, scene, camera, W, H, {
    bloom: [+(q.get('bs') || 0.7), 0.5, +(q.get('bt') || 1.6)],
    dof: q.get('nodof') ? null : { focus: +(q.get('focus') || 0.72), aperture: +(q.get('ap') || 0.012), maxblur: +(q.get('mb') || 0.012) },
    grade: { vignette: 0.5, lift: [0.012, 0.008, 0.012], gain: [1.02, 0.98, 0.94], ca: 0.0008 },
  })
  comp.render()
}
