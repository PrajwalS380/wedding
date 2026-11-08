import { THREE, rng, makeNoise, canvasTex } from './common.js'
import { flameMaterial, haloMaterial } from './flora.js'

/** Moon with maria, craters and earthshine, lit for a given phase; a soft glow sits in front of it. */
export function makeMoon(scene, camera, { dir, dist = 900, diameterDeg = 2.4, phaseDeg = 100, light = 22 }) {
  const N = makeNoise(21)
  const r = rng(4)
  const craters = Array.from({ length: 160 }, () => ({ x: r(), y: 0.15 + r() * 0.7, s: Math.pow(r(), 3) * 0.05 + 0.004 }))
  const tex = canvasTex(0, (ctx, w, h) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h
      const maria = N.fbm(u * 5, v * 3, 5)
      let a = 0.68 - 0.32 * Math.max(0, Math.min(1, (0.5 - maria) * 5)) + (N.fbm(u * 40, v * 20, 3) - 0.5) * 0.12
      for (const c of craters) { const dx = (u - c.x) * 2, dy = v - c.y; const d = Math.sqrt(dx * dx + dy * dy) / c.s; if (d < 1.25) a += d < 0.85 ? -0.05 : (0.09 * (1.25 - d)) / 0.4 }
      const i = (y * w + x) * 4, g = Math.max(0, Math.min(1, a)) * 255
      img.data[i] = g; img.data[i + 1] = g * 0.98; img.data[i + 2] = g * 0.94; img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, { w: 512, h: 256 })
  const R = dist * Math.tan(THREE.MathUtils.degToRad(diameterDeg / 2))
  const moon = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 32), new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.04, roughness: 1, emissive: 0x0d0f18 }))
  moon.position.copy(dir).multiplyScalar(dist)
  moon.lookAt(camera.position); moon.rotateY(Math.PI)
  scene.add(moon)
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  const ph = THREE.MathUtils.degToRad(phaseDeg)
  const L = dir.clone().multiplyScalar(-Math.cos(ph)).addScaledVector(right, Math.sin(ph)).normalize()
  const ml = new THREE.DirectionalLight(0xfff4e6, light)
  ml.position.copy(moon.position).addScaledVector(L, 100)
  ml.target = moon
  ml.layers.set(3)
  moon.layers.enable(3)
  scene.add(ml, ml.target)
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(0xb8c4e0, 0.16, 3.2))
  halo.position.copy(moon.position).multiplyScalar(0.9); halo.scale.setScalar(R * 0.9 * 8)
  scene.add(halo)
  return { moon, radius: R }
}

/** Star field on the upper sky (points), brighter near the zenith, fading into the horizon haze. */
export function makeStars(scene, { count = 2200, seed = 3, brightness = 1, minEl = 0.02 } = {}) {
  const r = rng(seed)
  const pos = [], col = []
  for (let i = 0; i < count; i++) {
    const u = r(), v = r()
    const el = Math.asin(minEl + (1 - minEl) * Math.pow(u, 0.8))
    const az = v * Math.PI * 2
    const d = 3500
    pos.push(Math.cos(el) * Math.sin(az) * d, Math.sin(el) * d, -Math.cos(el) * Math.cos(az) * d)
    const b = Math.pow(r(), 6) * 2.2 + 0.12
    const warm = r()
    const fade = Math.min(1, Math.sin(el) * 6)
    const c = new THREE.Color().setRGB(0.75 + 0.25 * warm, 0.8 + 0.12 * warm, 1 - 0.25 * warm).multiplyScalar(b * fade * brightness)
    col.push(c.r, c.g, c.b)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  const m = new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  const pts = new THREE.Points(g, m)
  scene.add(pts)
  return pts
}

/** Lightweight lit diya for crowds of lamps (no per-lamp light source). */
export function makeLamp(geo, clayMat, oilMat, r, { flameScale = 1, seed = 0, halo = 0.18, intensity = 1 } = {}) {
  const grp = new THREE.Group()
  grp.add(new THREE.Mesh(geo, clayMat))
  const oil = new THREE.Mesh(new THREE.CircleGeometry(0.0352, 24), oilMat)
  oil.rotation.x = -Math.PI / 2; oil.position.y = 0.0168; oil.scale.x = 1.12
  grp.add(oil)
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flameMaterial(seed))
  flame.material.uniforms.intensity.value = intensity
  flame.position.set(0.0628, 0.031, 0)
  flame.scale.set(0.017 * flameScale * (0.9 + r() * 0.2), 0.05 * flameScale * (0.85 + r() * 0.3), 1)
  grp.add(flame)
  if (halo) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(0xff9a3a, halo, 2.4))
    h.position.set(0.0628, 0.05, 0); h.scale.setScalar(0.22 * flameScale)
    grp.add(h)
  }
  grp.userData.flameLocal = new THREE.Vector3(0.0628, 0.055, 0)
  return grp
}
