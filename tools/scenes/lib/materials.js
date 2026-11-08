import { THREE, rng, makeNoise, canvasTex } from './common.js'

/**
 * Surface maps for worn metal, laid out for lathe-turned objects (u runs round the piece, v along its profile):
 * fine turning marks around the piece, a scatter of light scratches in all directions, and soft patches where
 * hands have polished it brighter. `rough` is a roughness map (grey = base roughness), `bump` the scratches.
 */
export function metalMaps({ seed = 1, size = 1024, turning = true, scratches = 900, wear = 0.5 } = {}) {
  const r = rng(seed)
  const N = makeNoise(seed + 3)
  const draw = (mode) => (ctx, w, h) => {
    // base: polished where it is handled (soft patches), duller elsewhere
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = N.fbm(x / 120, y / 120, 4)
      const fine = N.n2(x / 3, y / 3)
      const i = (y * w + x) * 4
      const v = mode === 'rough' ? 120 + (n - 0.5) * 120 * wear + (fine - 0.5) * 18 : 128 + (fine - 0.5) * 6
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v)); img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    // turning marks: thin rings round the piece (horizontal lines in uv)
    if (turning) {
      for (let y = 0; y < h; y += 1 + r() * 2) {
        ctx.globalAlpha = 0.05 + r() * 0.08
        ctx.fillStyle = mode === 'rough' ? (r() > 0.5 ? '#a0a0a0' : '#606060') : (r() > 0.5 ? '#8a8a8a' : '#767676')
        ctx.fillRect(0, y, w, 1)
      }
    }
    // scratches
    for (let k = 0; k < scratches; k++) {
      const x = r() * w, y = r() * h, a = r() * Math.PI, L = 6 + Math.pow(r(), 2) * 70
      ctx.globalAlpha = 0.08 + r() * 0.22
      ctx.strokeStyle = mode === 'rough' ? '#d0d0d0' : '#5a5a5a'
      ctx.lineWidth = 0.6 + r() * 0.8
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (r() - 0.5) * 6, y + Math.sin(a) * L * 0.5 + (r() - 0.5) * 6, x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  const rough = canvasTex(0, draw('rough'), { w: size, h: size, srgb: false, repeat: true })
  const bump = canvasTex(0, draw('bump'), { w: size, h: size, srgb: false, repeat: true })
  return { rough, bump }
}

/** Polished brass with turning marks, scratches and handled patches. */
export function brassMaterial({ seed = 1, color = 0xd9a54a, roughness = 0.3, repeat = [1, 1], bumpScale = 0.12, turning = true, ...rest } = {}) {
  const { rough, bump } = metalMaps({ seed, turning })
  rough.repeat.set(...repeat); bump.repeat.set(...repeat)
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: roughness * 1.6, roughnessMap: rough, bumpMap: bump, bumpScale, ...rest })
}

/** High-carat gold: warmer, smoother, lightly scratched. */
export function goldMaterial({ seed = 7, color = 0xf3c45c, roughness = 0.16, bumpScale = 0.06, ...rest } = {}) {
  const { rough, bump } = metalMaps({ seed, turning: false, scratches: 500, wear: 0.35 })
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: roughness * 1.6, roughnessMap: rough, bumpMap: bump, bumpScale, ...rest })
}

/** Silver with a faint warm tarnish in the duller patches. */
export function silverMaterial({ seed = 11, color = 0xe4e1da, roughness = 0.22, repeat = [1, 1], bumpScale = 0.1, ...rest } = {}) {
  const { rough, bump } = metalMaps({ seed, wear: 0.6 })
  rough.repeat.set(...repeat); bump.repeat.set(...repeat)
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: roughness * 1.6, roughnessMap: rough, bumpMap: bump, bumpScale, ...rest })
}

/**
 * Engraving for a round plate (uv = the plate's lathe/circle uv): concentric bands, a ring of mango (paisley)
 * motifs, beaded rings and a lotus at the centre. Returns a bump map (dark = cut into the metal).
 */
export function plateEngraving({ size = 2048, polar = false } = {}) {
  return canvasTex(0, (ctx, w, h) => {
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h)
    const cx = w / 2, cy = h / 2, R = w / 2
    ctx.strokeStyle = '#3a3a3a'
    const ring = (rr, lw) => { ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, rr * R, 0, Math.PI * 2); ctx.stroke() }
    ;[0.22, 0.235, 0.5, 0.515, 0.78, 0.8, 0.94].forEach((rr, i) => ring(rr, i % 2 ? 2 : 4))
    // beaded rings
    for (const [rr, n, br] of [[0.26, 64, 0.008], [0.54, 120, 0.007], [0.83, 180, 0.0065]]) {
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr * R, cy + Math.sin(a) * rr * R, br * R, 0, Math.PI * 2); ctx.fill() }
    }
    // mango motifs between 0.56 and 0.76
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2
      ctx.save(); ctx.translate(cx + Math.cos(a) * 0.66 * R, cy + Math.sin(a) * 0.66 * R); ctx.rotate(a + Math.PI / 2)
      ctx.lineWidth = 3; ctx.beginPath()
      ctx.moveTo(0, -0.07 * R); ctx.bezierCurveTo(0.06 * R, -0.05 * R, 0.05 * R, 0.06 * R, 0, 0.06 * R); ctx.bezierCurveTo(-0.05 * R, 0.06 * R, -0.04 * R, -0.01 * R, 0.0, -0.02 * R)
      ctx.stroke()
      ctx.beginPath(); ctx.arc(0.008 * R, 0.025 * R, 0.012 * R, 0, Math.PI * 2); ctx.stroke()
      ctx.restore()
    }
    // lotus at the centre
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(0, 0.04 * R); ctx.quadraticCurveTo(0.05 * R, 0.12 * R, 0, 0.19 * R); ctx.quadraticCurveTo(-0.05 * R, 0.12 * R, 0, 0.04 * R); ctx.stroke()
      ctx.restore()
    }
    ring(0.035, 3)
  }, { w: size, h: size, srgb: false })
}

/** A woven-silk bump map: fine warp and weft with a slight slub. */
export function silkWeave({ size = 1024, seed = 3 } = {}) {
  const N = makeNoise(seed)
  return canvasTex(0, (ctx, w, h) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const warp = Math.sin(x * 1.6) * 0.5 + 0.5, weft = Math.sin(y * 1.6 + Math.sin(x * 0.8)) * 0.5 + 0.5
      const over = ((x >> 1) + (y >> 1)) % 2 ? warp : weft
      const slub = N.n2(x / 40, y / 3)
      const v = 110 + over * 60 + (slub - 0.5) * 40
      const i = (y * w + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, { w: size, h: size, srgb: false, repeat: true })
}
