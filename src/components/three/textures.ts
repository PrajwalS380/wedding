import * as THREE from 'three'

/**
 * Procedural canvas textures — generated once at runtime, no network assets.
 */

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

function toTexture(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  t.needsUpdate = true
  return t
}

/** Soft radial glow sprite (white → transparent). */
export function createGlowTexture(size = 128) {
  const { c, ctx } = makeCanvas(size, size)
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.14)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return toTexture(c, false)
}

/** Gold kolam / rangoli medallion for the mandap floor (transparent). */
export function createRangoliTexture(size = 1024) {
  const { c, ctx } = makeCanvas(size, size)
  const cx = size / 2
  ctx.translate(cx, cx)
  ctx.strokeStyle = 'rgba(236, 205, 140, 0.95)'
  ctx.lineCap = 'round'

  const ring = (r: number, w: number, alpha = 1) => {
    ctx.globalAlpha = alpha
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ring(size * 0.47, 3)
  ring(size * 0.455, 1.2, 0.7)
  ring(size * 0.16, 2)
  ring(size * 0.06, 2)

  // Lotus petal rings
  const petals = (count: number, rIn: number, rOut: number, width: number, lw: number) => {
    ctx.lineWidth = lw
    for (let i = 0; i < count; i++) {
      ctx.save()
      ctx.rotate((i / count) * Math.PI * 2)
      ctx.beginPath()
      ctx.moveTo(0, -rIn)
      ctx.bezierCurveTo(width, -rIn - (rOut - rIn) * 0.35, width * 0.6, -rOut + 6, 0, -rOut)
      ctx.bezierCurveTo(-width * 0.6, -rOut + 6, -width, -rIn - (rOut - rIn) * 0.35, 0, -rIn)
      ctx.stroke()
      ctx.restore()
    }
  }
  ctx.globalAlpha = 1
  petals(8, size * 0.06, size * 0.16, size * 0.05, 2.2)
  petals(16, size * 0.17, size * 0.3, size * 0.045, 2)
  petals(32, size * 0.31, size * 0.44, size * 0.03, 1.6)

  // Kolam dots
  ctx.fillStyle = 'rgba(246, 226, 180, 0.95)'
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(Math.cos(a) * size * 0.465, Math.sin(a) * size * 0.465, 3.2, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16
    ctx.beginPath()
    ctx.arc(Math.cos(a) * size * 0.235, Math.sin(a) * size * 0.235, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  const t = toTexture(c)
  return t
}

/** Deep maroon velvet backdrop with a faint gold mandala and drape folds. */
export function createBackdropTexture(w = 512, h = 512) {
  const { c, ctx } = makeCanvas(w, h)
  const base = ctx.createLinearGradient(0, 0, 0, h)
  base.addColorStop(0, '#2a0811')
  base.addColorStop(0.55, '#4a1020')
  base.addColorStop(1, '#2c0912')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  // Drape folds
  for (let x = 0; x < w; x += 18) {
    const g = ctx.createLinearGradient(x, 0, x + 18, 0)
    g.addColorStop(0, 'rgba(0,0,0,0.22)')
    g.addColorStop(0.5, 'rgba(255,140,150,0.05)')
    g.addColorStop(1, 'rgba(0,0,0,0.22)')
    ctx.fillStyle = g
    ctx.fillRect(x, 0, 18, h)
  }

  // Faint mandala
  ctx.save()
  ctx.translate(w / 2, h * 0.42)
  ctx.strokeStyle = 'rgba(213, 176, 109, 0.28)'
  ctx.lineWidth = 1.4
  for (const r of [150, 140, 96, 54, 24]) {
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (let i = 0; i < 24; i++) {
    ctx.save()
    ctx.rotate((i / 24) * Math.PI * 2)
    ctx.beginPath()
    ctx.moveTo(0, -56)
    ctx.quadraticCurveTo(16, -96, 0, -136)
    ctx.quadraticCurveTo(-16, -96, 0, -56)
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()

  // Vignette
  const v = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.15, w / 2, h * 0.45, h * 0.75)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, w, h)
  return toTexture(c)
}

/** Polished dark stone with subtle veining. */
export function createStoneTexture(size = 512) {
  const { c, ctx } = makeCanvas(size, size)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  const img = ctx.getImageData(0, 0, size, size)
  // cheap value noise
  let seed = 11
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 225 + rand() * 30
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  ctx.strokeStyle = 'rgba(120,110,95,0.25)'
  for (let i = 0; i < 26; i++) {
    ctx.lineWidth = 0.5 + rand() * 1.5
    ctx.beginPath()
    let x = rand() * size
    let y = rand() * size
    ctx.moveTo(x, y)
    for (let k = 0; k < 6; k++) {
      x += (rand() - 0.5) * 120
      y += (rand() - 0.3) * 90
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  const t = toTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}
