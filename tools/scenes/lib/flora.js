import { THREE, rng, makeNoise, canvasTex, mergeGeometries, GLSL_NOISE } from './common.js'

/* ---------------------------------------------------------------- generic parametric sheet */
/** Builds a sheet from f(u,v) -> Vector3 with u in [0,1] (length) and v in [-1,1] (across). */
export function sheet(f, nu = 24, nv = 8) {
  const pos = [], uv = [], idx = []
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const u = i / nu, v = (j / nv) * 2 - 1
      const p = f(u, v)
      pos.push(p.x, p.y, p.z)
      uv.push(v * 0.5 + 0.5, u)
    }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/* ---------------------------------------------------------------- petals & marigolds */
export function petalGeo({ ruffle = 0.14, cup = 0.35 } = {}) {
  return sheet((u, v) => {
    const w = 0.42 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.95 + 0.05)), 0.55) * (0.6 + 0.4 * u)
    const x = v * w
    const z = -cup * v * v * w + ruffle * Math.sin(v * 9 + u * 5) * u * u + 0.12 * u * u
    return new THREE.Vector3(x, u, z)
  }, 8, 8)
}

const MARIGOLD_ORANGE = ['#ff7a00', '#ff8a00', '#ff9500', '#f57200', '#ff9f1c', '#e86400']
const MARIGOLD_YELLOW = ['#ffc000', '#ffb300', '#ffcb1f', '#f5a800', '#ffd23a']

/** A ruffled marigold head made of many instanced petals. Returns an InstancedMesh (unit flower radius = size). */
export function marigolds(flowers, { petals = 260, seed = 3, size = 1, envMap = null } = {}) {
  const r = rng(seed)
  const geo = petalGeo()
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0, side: THREE.DoubleSide, envMap, emissive: 0x2a0d00, emissiveIntensity: 0.12 })
  const total = flowers.length * petals
  const mesh = new THREE.InstancedMesh(geo, mat, total)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color()
  let k = 0
  for (const f of flowers) {
    const pal = f.yellow ? MARIGOLD_YELLOW : MARIGOLD_ORANGE
    const R = (f.size || 1) * size
    for (let i = 0; i < petals; i++) {
      const t = i / petals
      const phi = Math.acos(1 - t * 1.75) // dome, a little below the equator
      const theta = i * 2.39996 + r() * 0.3
      const n = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
      if (f.up) n.applyQuaternion(f.up)
      p.copy(f.pos).addScaledVector(n, R * (0.42 + 0.12 * r()))
      // petal lies along the surface, tip pointing outward-up, frilled edge out
      const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta))
      if (f.up) tangent.applyQuaternion(f.up)
      const outDir = n.clone().multiplyScalar(0.55).add(tangent.clone().multiplyScalar((r() - 0.5) * 0.5)).normalize()
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outDir)
      q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2))
      const sc = R * (0.36 + 0.14 * (1 - t) + r() * 0.08)
      s.set(sc * (1.1 + r() * 0.4), sc, sc)
      m.compose(p, q, s)
      mesh.setMatrixAt(k, m)
      c.set(pal[Math.floor(r() * pal.length)])
      c.multiplyScalar(0.75 + 0.35 * (1 - t) + r() * 0.1)
      mesh.setColorAt(k, c)
      k++
    }
  }
  mesh.instanceMatrix.needsUpdate = true
  mesh.instanceColor.needsUpdate = true
  return mesh
}

/** Loose petals scattered on a surface. */
export function scatteredPetals(spots, { seed = 9, envMap = null } = {}) {
  const r = rng(seed)
  const geo = petalGeo({ ruffle: 0.06, cup: 0.5 })
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, side: THREE.DoubleSide, envMap })
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length)
  const m = new THREE.Matrix4(), c = new THREE.Color()
  spots.forEach((sp, i) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + (r() - 0.5) * 0.5, r() * Math.PI * 2, (r() - 0.5) * 0.5, 'YXZ'))
    m.compose(sp.pos, q, new THREE.Vector3(sp.size, sp.size * (1 + r() * 0.3), sp.size))
    mesh.setMatrixAt(i, m)
    c.set(sp.color)
    c.multiplyScalar(0.8 + r() * 0.35)
    mesh.setColorAt(i, c)
  })
  return mesh
}

/* ---------------------------------------------------------------- leaves */
/** Leaf texture: base colour gradient, midrib, lateral veins, slight mottling. */
export function leafTexture({ base = '#2f5d24', light = '#5d8f3a', vein = 'rgba(200,230,150,0.55)', lateral = 14, edgeBrown = 0, seed = 5, w = 256, h = 1024, palmate = false } = {}) {
  const N = makeNoise(seed)
  return canvasTex(0, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, W, 0)
    g.addColorStop(0, base); g.addColorStop(0.5, light); g.addColorStop(1, base)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    const img = ctx.getImageData(0, 0, W, H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = N.fbm(x / 40, y / 40) - 0.5
      const i = (y * W + x) * 4
      for (let k = 0; k < 3; k++) img.data[i + k] = Math.max(0, Math.min(255, img.data[i + k] * (1 + n * 0.35)))
      const ex = Math.abs(x / W - 0.5) * 2
      if (edgeBrown && ex > 0.88) { img.data[i] += 40 * edgeBrown; img.data[i + 1] -= 10 * edgeBrown }
    }
    ctx.putImageData(img, 0, 0)
    ctx.strokeStyle = vein
    ctx.lineWidth = W * 0.022
    ctx.beginPath(); ctx.moveTo(W / 2, H); ctx.lineTo(W / 2, 0); ctx.stroke()
    ctx.lineWidth = W * 0.006
    if (palmate) {
      for (const s of [-1, 1]) for (const k of [0.18, 0.32]) {
        ctx.beginPath(); ctx.moveTo(W / 2, H * 0.98)
        ctx.bezierCurveTo(W / 2 + s * W * k * 2.2, H * 0.75, W / 2 + s * W * k * 1.6, H * 0.35, W / 2 + s * W * 0.04, H * 0.05)
        ctx.stroke()
      }
    }
    for (let i = 1; i < lateral; i++) {
      const y = H * (i / lateral)
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(W / 2, y)
        ctx.quadraticCurveTo(W / 2 + s * W * 0.25, y - H * 0.04, W / 2 + s * W * 0.48, y - H * 0.09)
        ctx.stroke()
      }
    }
  }, { w, h })
}

/** Mango leaf: lanceolate, folded along the midrib, gently arched. Length 1 along +y. */
export function mangoLeafGeo({ width = 0.21, fold = 0.18, bend = 0.18, twist = 0 } = {}) {
  return sheet((u, v) => {
    const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.98 + 0.02)), 0.75) * (1.05 - 0.35 * u) * (u < 0.06 ? u / 0.06 * 0.6 + 0.4 : 1)
    let x = v * w
    let z = -fold * Math.abs(v) * w + bend * u * u + 0.012 * Math.sin(v * 3 + u * 9)
    const a = twist * u
    const xr = x * Math.cos(a) - z * Math.sin(a), zr = x * Math.sin(a) + z * Math.cos(a)
    return new THREE.Vector3(xr, u, zr)
  }, 28, 8)
}

/** Betel leaf: heart-shaped with a pointed tip and lobed base. Length 1 along +y. */
export function betelLeafGeo({ cup = 0.03 } = {}) {
  return sheet((u, v) => {
    const uu = u * 1.12 - 0.12 // the two basal lobes reach below the stalk
    let w
    if (uu < 0) w = 0.36 * Math.sqrt(Math.max(0, 1 - Math.pow(uu / 0.12, 2)))
    else w = 0.47 * Math.pow(1 - uu, 0.9) * Math.sqrt(0.55 + 1.5 * uu)
    w = Math.max(w, 0.003)
    const notch = uu < 0 ? 0.08 * Math.exp(-v * v * 30) * (1 + uu / 0.12) : 0
    const x = v * w
    const z = cup * v * v * w * 2 - 0.012 * Math.sin(u * Math.PI) + 0.006 * Math.sin(v * 5 + u * 7)
    return new THREE.Vector3(x, uu + notch, z)
  }, 30, 14)
}

/** Banana leaf: long blade with midrib and splits (tears) along the veins. Length 1 along +y. */
export function bananaLeafGeo(r, { width = 0.2, droop = 0.35, splits = 9 } = {}) {
  const parts = []
  for (const side of [-1, 1]) {
    // split each half-blade into strips separated by tears
    const cuts = [0]
    for (let i = 0; i < splits; i++) cuts.push(0.12 + r() * 0.86)
    cuts.push(1)
    cuts.sort((a, b) => a - b)
    for (let s = 0; s < cuts.length - 1; s++) {
      const u0 = cuts[s], u1 = cuts[s + 1]
      if (u1 - u0 < 0.02) continue
      const gap = 0.004 + r() * 0.01
      parts.push(sheet((t, v) => {
        const u = u0 + (u1 - u0 - gap) * t
        const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.96 + 0.04)), 0.35)
        const across = (v * 0.5 + 0.5) // 0 at midrib, 1 at edge
        const x = side * (0.006 + across * w)
        const y = u - across * w * 0.35 // veins slant toward the tip
        const z = -droop * u * u - 0.05 * across * across + 0.01 * Math.sin(u * 40 + across * 3) * across
        return new THREE.Vector3(x, y, z)
      }, 6, 4))
    }
  }
  const midrib = new THREE.CylinderGeometry(0.004, 0.009, 1, 6, 12, false)
  midrib.translate(0, 0.5, 0)
  const pos = midrib.attributes.position
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setZ(i, pos.getZ(i) - droop * y * y) }
  midrib.computeVertexNormals()
  parts.push(midrib.toNonIndexed ? midrib : midrib)
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))
}

/* ---------------------------------------------------------------- flames */
export function flameMaterial(seed = 0) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { seed: { value: seed }, intensity: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv;
      vec4 mv = modelViewMatrix * vec4(0.,0.,0.,1.);
      vec2 scale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
      mv.xy += (uv - vec2(0.5,0.0)) * scale; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform float seed, intensity; varying vec2 vUv; ${GLSL_NOISE}
      void main(){
        float y = vUv.y; float x = (vUv.x-0.5)*2.0;
        x += (sin(y*5.0+seed*3.0)*0.06 + (vnoise(vec2(seed*7.0, y*3.0))-0.5)*0.12) * y*y;
        float w = 0.55*pow(max(y,0.0),0.42)*pow(max(1.0-y,0.0),0.85)*1.9;
        float d = abs(x)/max(w,1e-3);
        float body = smoothstep(1.0, 0.55, d) * smoothstep(0.0, 0.06, y);
        float core = smoothstep(0.75, 0.0, d) * smoothstep(0.02,0.18,y) * smoothstep(0.75,0.25,y);
        float blue = smoothstep(0.9,0.2,d) * smoothstep(0.22,0.02,y);
        vec3 col = vec3(1.0,0.42,0.06)*body*1.6 + vec3(1.0,0.78,0.38)*core*5.0 + vec3(1.0,0.95,0.85)*pow(core,2.5)*6.0 + vec3(0.25,0.35,1.0)*blue*0.9;
        float glow = exp(-length(vec2(x*0.9, (y-0.35)*1.6))*3.2)*0.35;
        col += vec3(1.0,0.5,0.15)*glow;
        gl_FragColor = vec4(col*intensity, 1.0);
      }`,
  })
}

/** Soft additive halo sprite (glow around a light). */
export function haloMaterial(color = 0xffa040, strength = 1, falloff = 2.2) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color(color) }, strength: { value: strength }, falloff: { value: falloff } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); vec2 sc=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)); mv.xy+=(uv-.5)*sc; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 color; uniform float strength, falloff; varying vec2 vUv; void main(){ float d=length(vUv-.5)*2.; float a=pow(max(1.-d,0.),falloff); gl_FragColor=vec4(color*a*strength,1.); }`,
  })
}

/** Bokeh disc sprite (out-of-focus light): flat disc with soft edge and a slightly brighter rim. */
export function bokehMaterial(color = 0xffb060, strength = 1) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color(color) }, strength: { value: strength } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); vec2 sc=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)); mv.xy+=(uv-.5)*sc; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 color; uniform float strength; varying vec2 vUv;
      void main(){ vec2 p=(vUv-.5)*2.; float ang=atan(p.y,p.x); float r=length(p)*(1.0+0.035*cos(ang*7.0));
        float disc=smoothstep(1.0,0.86,r); float rim=smoothstep(0.62,0.96,r)*disc*0.5; float inner=0.32+0.18*(1.0-r);
        gl_FragColor=vec4(color*(disc*inner+rim)*strength,1.); }`,
  })
}

/** Curling incense smoke on a camera-facing ribbon: thin at the stick, widening and fading as it rises. */
export function smokeMaterial(seed = 0, strength = 1) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { seed: { value: seed }, strength: { value: strength }, tint: { value: new THREE.Color(1.0, 0.94, 0.86) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); vec2 sc=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)); mv.xy+=(uv-vec2(0.5,0.0))*sc; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `uniform float seed, strength; uniform vec3 tint; varying vec2 vUv; ${GLSL_NOISE}
      void main(){
        float y=vUv.y; float x=(vUv.x-0.5)*2.0;
        float sway = sin(y*7.0+seed)*0.18*y + (fbm2(vec2(y*3.0+seed, seed))-0.5)*0.9*y*y;
        float w = 0.025 + 0.55*pow(y,1.4);
        float d = abs(x - sway)/w;
        float body = exp(-d*d*2.2);
        float tex = fbm2(vec2(x*3.0+seed, y*9.0 - seed*2.0));
        float wisps = smoothstep(0.35, 0.8, tex*(1.0+y));
        float a = body * mix(1.0, wisps, smoothstep(0.08, 0.5, y)) * smoothstep(0.0, 0.03, y) * (1.0 - smoothstep(0.55, 1.0, y));
        gl_FragColor = vec4(tint*3.2, min(a*0.55*strength, 0.85));
      }`,
  })
}
