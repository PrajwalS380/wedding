/** Procedural textures for the route map, made at load time (nothing extra to download). */
import * as THREE from 'three'

/** Tileable value-noise fbm, 0…1, `size`² samples; `cells` lists the lattice size of each octave. */
export function tileNoise(size: number, cells: number[], seed: number, gain = 0.5): Float32Array {
  const out = new Float32Array(size * size)
  let s = seed % 2147483647 || 1
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  let amp = 1
  for (const c of cells) {
    const g = new Float32Array(c * c).map(rnd)
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * c,
        iy = Math.floor(fy),
        ty = fy - iy,
        sy = ty * ty * (3 - 2 * ty)
      const r0 = (iy % c) * c,
        r1 = ((iy + 1) % c) * c
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * c,
          ix = Math.floor(fx),
          tx = fx - ix,
          sx = tx * tx * (3 - 2 * tx)
        const i0 = ix % c,
          i1 = (ix + 1) % c
        const a = g[r0 + i0],
          b = g[r0 + i1],
          cc = g[r1 + i0],
          d = g[r1 + i1]
        out[y * size + x] += (a + (b - a) * sx + (cc - a) * sy + (a - b - cc + d) * sx * sy) * amp
      }
    }
    amp *= gain
  }
  let lo = Infinity,
    hi = -Infinity
  for (const v of out) {
    lo = Math.min(lo, v)
    hi = Math.max(hi, v)
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / (hi - lo || 1)
  return out
}

function dataTexture(size: number, rgba: Uint8Array, srgb = false) {
  const t = new THREE.DataTexture(rgba, size, size, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}

function grey(size: number, n: Float32Array) {
  const px = new Uint8Array(size * size * 4)
  for (let i = 0; i < n.length; i++) {
    const v = Math.round(n[i] * 255)
    px.set([v, v, v, 255], i * 4)
  }
  return dataTexture(size, px)
}

/** Large soft cloud shapes; their shadows drift over the city. */
export const cloudsTexture = () => grey(256, tileNoise(256, [4, 8, 16, 32, 64], 7, 0.55))

/** Fine grit for the ground up close. */
export const detailTexture = () => grey(256, tileNoise(256, [16, 32, 64, 128], 23, 0.62))

/** Wind ripples on the lake, as a normal map. */
export function waterNormalTexture() {
  const N = 256
  const h = tileNoise(N, [8, 16, 32, 64], 41, 0.6)
  const px = new Uint8Array(N * N * 4)
  const at = (x: number, y: number) => h[((y + N) % N) * N + ((x + N) % N)]
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 6,
        dy = (at(x, y + 1) - at(x, y - 1)) * 6
      const l = Math.hypot(dx, dy, 1)
      px.set([((-dx / l) * 0.5 + 0.5) * 255, ((-dy / l) * 0.5 + 0.5) * 255, ((1 / l) * 0.5 + 0.5) * 255, 255], (y * N + x) * 4)
    }
  return dataTexture(N, px)
}

/** A night sky to reflect: deep blue overhead, the town's faint warm glow at the horizon, the moon's halo. */
export function skyTexture(sunDir: THREE.Vector3) {
  const W = 256,
    H = 128
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const zen = [10, 16, 40],
    hor = [58, 50, 66],
    gnd = [14, 12, 16]
  const d = new THREE.Vector3()
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const el = (0.5 - y / H) * Math.PI,
        az = (x / W - 0.5) * 2 * Math.PI
      d.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el))
      const t = el > 0 ? Math.pow(el / (Math.PI / 2), 0.55) : 0
      let col = el > 0 ? hor.map((h, i) => h + (zen[i] - h) * t) : gnd.map((g, i) => g + (hor[i] - g) * Math.exp(el * 8))
      const glow = Math.exp((d.dot(sunDir) - 1) * 14) * 0.35 + Math.exp((d.dot(sunDir) - 1) * 400) * 3
      col = col.map((v, i) => v + [190, 205, 255][i] * glow)
      img.data.set([...col.map((v) => Math.min(255, v)), 255], (y * W + x) * 4)
    }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.mapping = THREE.EquirectangularReflectionMapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** A soft round glow for sprites. */
export function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,230,180,.85)')
  g.addColorStop(0.5, 'rgba(255,170,90,.25)')
  g.addColorStop(1, 'rgba(255,140,60,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** A cumulus puff lit from the low sun: bright crowns, a soft greyer belly, feathered edges. */
export function puffTexture(seed: number) {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  let s = seed
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2,
      r = Math.pow(rnd(), 0.7) * S * 0.26
    const x = S / 2 + Math.cos(a) * r * 1.25,
      y = S / 2 + Math.sin(a) * r * 0.7
    const rad = S * (0.1 + rnd() * 0.13)
    const lit = Math.max(0, Math.min(1, 0.55 - (y - S / 2) / (S * 0.5) + (rnd() - 0.5) * 0.2))
    const col = [Math.round(214 + 41 * lit), Math.round(208 + 40 * lit), Math.round(206 + 26 * lit)]
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    g.addColorStop(0, `rgba(${col},.55)`)
    g.addColorStop(0.6, `rgba(${col},.32)`)
    g.addColorStop(1, `rgba(${col},0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** The side of a passenger coach (or the locomotive): livery, a band, a row of windows, doors at the ends.
 * With `glow`, only the windows — lit — on black, for the coach's emissive map at night. */
export function coachTexture(loco: boolean, glow = false) {
  const W = 512,
    H = 64
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = glow ? '#000' : loco ? '#b8432c' : '#2c4c84'
  ctx.fillRect(0, 0, W, H)
  if (glow) {
    ctx.fillStyle = '#ffd9a0'
    if (loco) {
      ctx.fillRect(6, H * 0.18, 34, H * 0.3)
      ctx.fillRect(W - 40, H * 0.18, 34, H * 0.3)
    } else for (let x = 40; x < W - 40; x += 22) if ((x * 7) % 5 !== 1) ctx.fillRect(x, H * 0.22, 15, H * 0.3)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }
  ctx.fillStyle = loco ? '#efe2c4' : '#d9d6cc'
  ctx.fillRect(0, H * 0.62, W, H * 0.08)
  if (loco) {
    ctx.fillStyle = '#1d2228'
    ctx.fillRect(6, H * 0.18, 34, H * 0.3)
    ctx.fillRect(W - 40, H * 0.18, 34, H * 0.3)
    ctx.fillStyle = '#7e2e20'
    for (let x = 70; x < W - 70; x += 26) ctx.fillRect(x, H * 0.2, 14, H * 0.32)
  } else {
    ctx.fillStyle = '#1b2230'
    for (let x = 40; x < W - 40; x += 22) ctx.fillRect(x, H * 0.22, 15, H * 0.3)
    ctx.fillStyle = '#20283a'
    ctx.fillRect(8, H * 0.12, 20, H * 0.78)
    ctx.fillRect(W - 28, H * 0.12, 20, H * 0.78)
  }
  ctx.fillStyle = 'rgba(0,0,0,.22)'
  ctx.fillRect(0, H * 0.9, W, H * 0.1)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Shamiana cloth: broad red, saffron and cream stripes. */
export function stripeTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 8
  const ctx = c.getContext('2d')!
  const cols = ['#b5242c', '#f2e6cf', '#e8902a', '#f2e6cf']
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = cols[i % 4]
    ctx.fillRect(i * 16, 0, 16, 8)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
