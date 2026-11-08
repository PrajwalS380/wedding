import { THREE } from './common.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

/**
 * Physical (Preetham) sky with clouds, plus an "occlusion" mode that outputs only
 * the sun's glow behind the clouds, used to make crepuscular rays.
 */
export function makeSky({ elevation = 3, azimuth = 0, turbidity = 6, rayleigh = 2.5, mie = 0.006, mieG = 0.86, clouds = {}, warmClouds = 1, tintLow = [1, 1, 1], tintHigh = [1, 1, 1], tintRange = [0.02, 0.45], discScale = 1, cirrus = 0, cirrusColor = [1.0, 0.55, 0.45] } = {}) {
  const sky = new Sky()
  const m = sky.material
  m.uniforms.occMode = { value: 0 }
  m.uniforms.warmClouds = { value: warmClouds }
  m.uniforms.discScale = { value: discScale }
  m.uniforms.cirrus = { value: cirrus }
  m.uniforms.cirrusColor = { value: new THREE.Vector3(...cirrusColor) }
  m.uniforms.tintLow = { value: new THREE.Vector3(...tintLow) }
  m.uniforms.tintHigh = { value: new THREE.Vector3(...tintHigh) }
  m.uniforms.tintRange = { value: new THREE.Vector2(...tintRange) }
  let fs = m.fragmentShader
  fs = fs.replace('uniform float time;', 'uniform float time;\n uniform float occMode;\n uniform float warmClouds;\n uniform vec3 tintLow, tintHigh;\n uniform vec2 tintRange;\n uniform float discScale;\n uniform float cirrus;\n uniform vec3 cirrusColor;')
  fs = fs.replace('if ( direction.y > 0.0 && cloudCoverage > 0.0 ) {', 'float cloudA = 0.0;\n if ( direction.y > 0.0 && cloudCoverage > 0.0 ) {')
  // warmer, more cinematic sunset undersides
  fs = fs.replace('vec3 cloudColor = skyAmbient + sunColor * shade;',
    'vec3 cloudColor = skyAmbient + sunColor * shade;\n cloudColor += sunColor * warmClouds * 1.6 * (1.0 - shade) * vec3(1.0, 0.55, 0.32) * (1.0 - smoothstep(0.0, 0.35, direction.y));')
  fs = fs.replace('texColor = mix( texColor, cloudAerial, alpha );', 'texColor = mix( texColor, cloudAerial, alpha );\n cloudA = alpha;')
  fs = fs.replace('gl_FragColor = vec4( texColor, 1.0 );',
    `if ( occMode > 0.5 ) {
       float c = max( cosTheta, 0.0 );
       float g = pow( c, 6000.0 ) * 5.0 + pow( c, 700.0 ) * 0.9 + pow( c, 120.0 ) * 0.12;
       gl_FragColor = vec4( vec3( g * ( 1.0 - cloudA ) ), 1.0 );
       return;
     }
     if ( cirrus > 0.0 && direction.y > 0.0 ) {
       vec2 cu = direction.xz / ( direction.y + 0.12 );
       vec2 q = vec2( cu.x * 0.55 + cu.y * 0.25, cu.y * 3.2 - cu.x * 0.4 );
       float streak = fbm( q * 1.6 + vec2( 3.0, 11.0 ), 0.0 ) * 0.6 + fbm( q * 5.0, 0.0 ) * 0.25 + 0.5;
       float ci = smoothstep( 0.52, 0.86, streak ) * smoothstep( 0.02, 0.12, direction.y ) * ( 1.0 - smoothstep( 0.45, 0.9, direction.y ) );
       float lit = 0.35 + 0.65 * pow( max( cosTheta, 0.0 ), 3.0 );
       vec3 cc = cirrusColor * ( 0.0016 + 0.012 * lit ) * ( 1.0 - smoothstep( 0.0, 0.5, direction.y ) * 0.6 );
       texColor = mix( texColor, cc + texColor * 0.6, ci * cirrus * ( 1.0 - cloudA ) );
     }
     texColor *= mix( tintLow, tintHigh, smoothstep( tintRange.x, tintRange.y, direction.y ) );
     gl_FragColor = vec4( texColor, 1.0 );`)
  fs = fs.replace('vec3 sundiscColor = ( 760.0 * sundisc ) * min( vSunE * Fex, 80.0 );', 'vec3 sundiscColor = ( 760.0 * sundisc ) * min( vSunE * Fex, 80.0 ) * discScale;')
  m.fragmentShader = fs
  sky.scale.setScalar(4000)
  const u = m.uniforms
  u.turbidity.value = turbidity
  u.rayleigh.value = rayleigh
  u.mieCoefficient.value = mie
  u.mieDirectionalG.value = mieG
  const c = { coverage: 0.45, density: 0.5, scale: 0.00022, elevation: 0.5, time: 0, ...clouds }
  u.cloudCoverage.value = c.coverage
  u.cloudDensity.value = c.density
  u.cloudScale.value = c.scale
  u.cloudElevation.value = c.elevation
  u.time.value = c.time
  const phi = THREE.MathUtils.degToRad(90 - elevation)
  const theta = THREE.MathUtils.degToRad(azimuth)
  const sun = new THREE.Vector3().setFromSphericalCoords(1, phi, theta)
  u.sunPosition.value.copy(sun)
  sky.userData.sunDir = sun
  return sky
}

/* ---------------------------------------------------------------- skyline pieces */
function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y + h / 2, z)
  return g
}

/** A Dravidian gopuram: base storeys, seven tapering tiers lined with pavilions, sculptures and a barrel-vault crown with kalashas. */
export function gopuramGeometry(r) {
  const parts = []
  parts.push(box(27, 1.6, 15, 0, 0, 0))
  parts.push(box(25, 8.4, 13, 0, 1.6, 0))
  parts.push(box(26.4, 0.7, 14, 0, 10, 0))
  let y = 10.7
  const tiers = 7
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1)
    const w = 23 - t * 12.5
    const d = 12 - t * 5.2
    const h = 3.7 - t * 0.5
    parts.push(box(w, h * 0.72, d, 0, y, 0))
    parts.push(box(w + 0.9, 0.45, d + 0.7, 0, y + h * 0.72, 0)) // cornice
    const ly = y + h * 0.72 + 0.45
    // pavilions along the front/back edges and the two sides
    const n = Math.max(3, Math.round(w / 2.4))
    for (let k = 0; k < n; k++) {
      const x = -w / 2 + 0.6 + (k / (n - 1)) * (w - 1.2)
      const kind = k === 0 || k === n - 1 ? 'kuta' : k % 2 ? 'shala' : 'panjara'
      for (const z of [d / 2 - 0.4, -d / 2 + 0.4]) {
        if (kind === 'kuta') {
          parts.push(box(1.25, 0.9, 1.25, x, ly, z))
          const dome = new THREE.SphereGeometry(0.72, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)
          dome.translate(x, ly + 0.9, z); parts.push(dome)
          parts.push(box(0.12, 0.45, 0.12, x, ly + 1.55, z))
        } else if (kind === 'shala') {
          parts.push(box(1.6, 0.75, 1.1, x, ly, z))
          const v = new THREE.CylinderGeometry(0.62, 0.62, 1.6, 10, 1, false, 0, Math.PI)
          v.rotateZ(Math.PI / 2); v.rotateX(Math.PI / 2); v.translate(x, ly + 0.75, z); parts.push(v)
        } else {
          parts.push(box(0.9, 0.6, 1, x, ly, z))
          const a = new THREE.TorusGeometry(0.42, 0.12, 5, 10, Math.PI)
          a.translate(x, ly + 0.6, z); parts.push(a)
        }
      }
      // sculpted figures between pavilions (only bumps in silhouette)
      if (k < n - 1 && r() > 0.25) {
        const fx = x + (w - 1.2) / (n - 1) / 2
        const cap = new THREE.CapsuleGeometry(0.2 + r() * 0.08, 0.55 + r() * 0.35, 3, 6)
        cap.translate(fx, ly + 0.55, d / 2 - 0.2); parts.push(cap)
      }
    }
    // side pavilions jutting out (makes the stepped, jagged outline)
    for (const s of [-1, 1]) {
      const x = s * (w / 2 + 0.2)
      parts.push(box(1.1, 1.0, 1.1, x, ly, 0))
      const dome = new THREE.SphereGeometry(0.66, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)
      dome.translate(x, ly + 1.0, 0); parts.push(dome)
      parts.push(box(0.1, 0.5, 0.1, x, ly + 1.6, 0))
      const cap = new THREE.CapsuleGeometry(0.22, 0.7, 3, 6)
      cap.translate(x + s * 0.6, ly + 0.6, d / 4); parts.push(cap)
    }
    y += h
  }
  // crown: shala barrel vault with gable horseshoe ends, ridge of kalashas
  parts.push(box(10.5, 1.8, 6.2, 0, y, 0))
  const vault = new THREE.CylinderGeometry(3.1, 3.1, 10.5, 24, 1, false, 0, Math.PI)
  vault.rotateZ(Math.PI / 2); vault.rotateX(Math.PI / 2); vault.translate(0, y + 1.8, 0); parts.push(vault)
  for (const s of [-1, 1]) {
    const gable = new THREE.TorusGeometry(3.25, 0.35, 6, 24, Math.PI)
    gable.rotateY(Math.PI / 2); gable.translate(s * 5.3, y + 1.8, 0); parts.push(gable)
    const k = new THREE.SphereGeometry(0.7, 10, 8); k.scale(1, 1.2, 1); k.translate(s * 5.6, y + 5.4, 0); parts.push(k)
  }
  const kp = [[0.001, 0], [0.32, 0.05], [0.42, 0.35], [0.3, 0.7], [0.18, 0.85], [0.28, 0.95], [0.12, 1.25], [0.05, 1.7], [0.001, 1.9]].map(([a, b]) => new THREE.Vector2(a * 1.25, b * 1.25))
  for (let i = 0; i < 7; i++) {
    const x = -4.2 + i * 1.4
    const k = new THREE.LatheGeometry(kp, 10)
    k.translate(x, y + 1.8 + 3.0, 0); parts.push(k)
  }
  const nonIndexed = parts.map((g) => (g.index ? g.toNonIndexed() : g))
  nonIndexed.forEach((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k) })
  return { geo: nonIndexed, height: y + 1.8 + 3 + 2.4 }
}

/** Coconut palm: tapered ringed trunk on a gentle curve and a crown of arching fronds with individual leaflets. */
export function palmGeometry(r, { height = 14, lean = 2.5, fronds = 20 } = {}) {
  const pos = []
  const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d) }
  const leanDir = new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize()
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(leanDir.x * lean * 0.15, height * 0.35, leanDir.z * lean * 0.15),
    new THREE.Vector3(leanDir.x * lean * 0.55, height * 0.7, leanDir.z * lean * 0.55),
    new THREE.Vector3(leanDir.x * lean, height, leanDir.z * lean),
  ])
  const seg = 48, rad = 8
  const rings = []
  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const p = curve.getPoint(t)
    const tan = curve.getTangent(t)
    const n = new THREE.Vector3(0, 0, 1).cross(tan).normalize()
    const b = tan.clone().cross(n).normalize()
    const radius = (0.3 - 0.13 * t) * (1 + 0.05 * Math.sin(t * 160)) * (i === 0 ? 1.4 : 1)
    rings.push(Array.from({ length: rad }, (_, k) => {
      const a = (k / rad) * Math.PI * 2
      return p.clone().addScaledVector(n, Math.cos(a) * radius).addScaledVector(b, Math.sin(a) * radius)
    }))
  }
  for (let i = 0; i < seg; i++) for (let k = 0; k < rad; k++) quad(rings[i][k], rings[i][(k + 1) % rad], rings[i + 1][(k + 1) % rad], rings[i + 1][k])
  const top = curve.getPoint(1)
  // coconuts
  const nuts = []
  for (let k = 0; k < 7; k++) {
    const g = new THREE.SphereGeometry(0.17 + r() * 0.04, 8, 6)
    const a = r() * Math.PI * 2
    g.translate(top.x + Math.cos(a) * 0.35, top.y - 0.35 - r() * 0.3, top.z + Math.sin(a) * 0.35)
    nuts.push(g)
  }
  // fronds
  for (let f = 0; f < fronds; f++) {
    const az = f * 2.39996 + r() * 0.3
    const age = f / fronds
    const el = THREE.MathUtils.degToRad(55 - age * 105 + (r() - 0.5) * 12)
    const L = 4.6 + r() * 1.4 - (age < 0.15 ? 1.2 : 0)
    const dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el))
    const droop = 1.8 + age * 2.6
    const P = (t) => top.clone().addScaledVector(dir, L * t).add(new THREE.Vector3(0, -droop * t * t, 0))
    const steps = 42
    let prev = P(0)
    for (let s = 1; s <= steps; s++) {
      const t = s / steps
      const p = P(t)
      const tan = p.clone().sub(prev).normalize()
      const side = tan.clone().cross(new THREE.Vector3(0, 1, 0)).normalize()
      if (side.lengthSq() < 0.01) side.set(1, 0, 0)
      // rachis
      const up = new THREE.Vector3(0, 0.05 * (1 - t * 0.7), 0)
      quad(prev.clone().add(up), p.clone().add(up), p.clone().sub(up), prev.clone().sub(up))
      if (t > 0.08) {
        const ll = (1.15 - 0.7 * t) * (0.85 + r() * 0.3)
        const w = 0.075 * (1 - t * 0.45)
        for (const sd of [-1, 1]) {
          const droopL = 0.35 + t * 0.5 + r() * 0.15
          const tipDir = side.clone().multiplyScalar(sd).add(new THREE.Vector3(0, -droopL, 0)).add(tan.clone().multiplyScalar(0.35)).normalize()
          const tip = p.clone().addScaledVector(tipDir, ll)
          const mid = p.clone().addScaledVector(tipDir, ll * 0.5).add(new THREE.Vector3(0, -ll * 0.08, 0))
          const wv = tan.clone().multiplyScalar(w)
          quad(p.clone().sub(wv), p.clone().add(wv), mid.clone().add(wv), mid.clone().sub(wv))
          tri(mid.clone().sub(wv), mid.clone().add(wv), tip)
        }
      }
      prev = p
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  const nonIndexed = nuts.map((n) => { const x = n.toNonIndexed(); x.deleteAttribute('uv'); return x })
  return [g, ...nonIndexed]
}

/** Irregular tree canopy (neem / rain-tree look) made of displaced blobs. */
export function treeGeometry(r, { h = 9, w = 8, detail = 2 } = {}) {
  const parts = []
  const trunk = new THREE.CylinderGeometry(0.25, 0.4, h * 0.35, 6)
  trunk.translate(0, h * 0.175, 0)
  parts.push(trunk.toNonIndexed())
  const blobs = 24 + Math.floor(r() * 10)
  for (let i = 0; i < blobs; i++) {
    const g = new THREE.IcosahedronGeometry(1, detail)
    const p = g.attributes.position
    for (let k = 0; k < p.count; k++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, k)
      const d = 1 + 0.35 * Math.sin(v.x * 9 + i) * Math.sin(v.y * 8 + i * 2) * Math.sin(v.z * 7 + i) + 0.15 * Math.sin(v.x * 23 + v.z * 17)
      v.multiplyScalar(d)
      p.setXYZ(k, v.x, v.y, v.z)
    }
    const s = (w / 6.5) * (0.45 + r() * 0.7)
    g.scale(s, s * 0.7, s)
    const ox = (r() - 0.5) * w * 1.3
    g.translate(ox, h * 0.35 + r() * h * 0.5 * (1 - Math.abs(ox) / w), (r() - 0.5) * w * 0.6)
    const x = g.toNonIndexed(); x.deleteAttribute('uv')
    parts.push(x)
  }
  parts.forEach((g) => { if (g.attributes.uv) g.deleteAttribute('uv') })
  return parts
}
