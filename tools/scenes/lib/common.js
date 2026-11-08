import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export { THREE, mergeGeometries }

/* ---------------------------------------------------------------- random */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/* JS value noise (for canvas textures) */
export function makeNoise(seed = 7) {
  const r = rng(seed)
  const P = new Uint8Array(512)
  const perm = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[perm[i], perm[j]] = [perm[j], perm[i]]
  }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255]
  const V = Float32Array.from({ length: 256 }, () => r())
  const fade = (t) => t * t * (3 - 2 * t)
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y)
    const xf = x - xi, yf = y - yi
    const X = xi & 255, Y = yi & 255
    const a = V[P[P[X] + Y]], b = V[P[P[X + 1] + Y]], c = V[P[P[X] + Y + 1]], d = V[P[P[X + 1] + Y + 1]]
    const u = fade(xf), v = fade(yf)
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v
  }
  const fbm = (x, y, oct = 5) => {
    let s = 0, a = 0.5, f = 1, n = 0
    for (let i = 0; i < oct; i++) { s += a * n2(x * f, y * f); n += a; a *= 0.5; f *= 2.02 }
    return s / n
  }
  return { n2, fbm }
}

export function canvasTex(size, draw, { srgb = true, repeat = false, w, h } = {}) {
  const c = document.createElement('canvas')
  c.width = w || size
  c.height = h || size
  const ctx = c.getContext('2d')
  draw(ctx, c.width, c.height)
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

/* pixel-level texture from a function (x,y in 0..1) -> [r,g,b,a] 0..255 */
export function pixelTex(w, h, fn, opts = {}) {
  return canvasTex(0, (ctx) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const [r, g, b, a = 255] = fn(x / w, y / h, x, y)
        const i = (y * w + x) * 4
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a
      }
    ctx.putImageData(img, 0, 0)
  }, { ...opts, w, h })
}

/* ---------------------------------------------------------------- GLSL noise */
export const GLSL_NOISE = /* glsl */ `
  float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
  vec2 hash22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
  float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
    return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x), u.y); }
  float fbm2(vec2 p){ float s=0., a=.5; for(int i=0;i<6;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.1,9.3); a*=.5; } return s; }
`

/* ---------------------------------------------------------------- renderer */
export function makeRenderer(W, H, { alpha = false, shadows = false, exposure = 1 } = {}) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
  r.setPixelRatio(1)
  r.setSize(W, H, false)
  r.toneMapping = THREE.ACESFilmicToneMapping
  r.toneMappingExposure = exposure
  r.outputColorSpace = THREE.SRGBColorSpace
  if (alpha) r.setClearColor(0x000000, 0)
  if (shadows) {
    r.shadowMap.enabled = true
    r.shadowMap.type = THREE.PCFSoftShadowMap
  }
  document.body.appendChild(r.domElement)
  return r
}

/* ---------------------------------------------------------------- god rays (screen-space light scattering) */
const RadialBlur = {
  uniforms: { tInput: { value: null }, center: { value: new THREE.Vector2(0.5, 0.5) }, density: { value: 0.96 }, decay: { value: 0.972 }, weight: { value: 0.06 }, exposure: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tInput; uniform vec2 center; uniform float density, decay, weight, exposure; varying vec2 vUv;
    void main(){ const int N=110; vec2 uv=vUv; vec2 d=(vUv-center)*density/float(N); float illum=1.; vec3 sum=vec3(0.);
      for(int i=0;i<N;i++){ uv-=d; sum+=texture2D(tInput,clamp(uv,0.,1.)).rgb*illum*weight; illum*=decay; }
      gl_FragColor=vec4(sum*exposure,1.); }`,
}

export function makeRays(renderer, W, H) {
  const rtA = new THREE.WebGLRenderTarget(W >> 1, H >> 1, { type: THREE.HalfFloatType })
  const rtB = new THREE.WebGLRenderTarget(W >> 1, H >> 1, { type: THREE.HalfFloatType })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ ...RadialBlur, uniforms: THREE.UniformsUtils.clone(RadialBlur.uniforms), depthTest: false }))
  const qs = new THREE.Scene(); qs.add(quad)
  const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  return {
    target: rtA,
    /** occlusionRender(rt) must draw the bright source (sun) with occluders black into rt. */
    run(occlusionRender, center, { passes = 2, weight = 0.06, decay = 0.972 } = {}) {
      occlusionRender(rtA)
      const u = quad.material.uniforms
      u.center.value.copy(center)
      let src = rtA, dst = rtB
      for (let i = 0; i < passes; i++) {
        u.tInput.value = src.texture
        u.weight.value = i === 0 ? weight : 1 / 110 * 2.2
        u.decay.value = i === 0 ? decay : 0.985
        u.density.value = i === 0 ? 0.97 : 0.35
        renderer.setRenderTarget(dst); renderer.render(qs, qc)
        ;[src, dst] = [dst, src]
      }
      renderer.setRenderTarget(null)
      return src.texture
    },
  }
}

/* ---------------------------------------------------------------- composer */
const AddTex = {
  uniforms: { tDiffuse: { value: null }, tAdd: { value: null }, tint: { value: new THREE.Color(1, 0.8, 0.55) }, amount: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse,tAdd; uniform vec3 tint; uniform float amount; varying vec2 vUv;
    void main(){ vec4 c=texture2D(tDiffuse,vUv); if(amount>0.) c.rgb+=texture2D(tAdd,vUv).rgb*tint*amount; gl_FragColor=c; }`,
}

const Grade = {
  uniforms: {
    tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.35 }, grain: { value: 0.0 },
    lift: { value: new THREE.Vector3(0, 0, 0) }, gain: { value: new THREE.Vector3(1, 1, 1) }, ca: { value: 0.0012 }, res: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; uniform float vignette, grain, ca, time; uniform vec3 lift, gain; uniform vec2 res; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 d=vUv-.5;
      vec3 c; c.r=texture2D(tDiffuse,vUv+d*ca).r; c.g=texture2D(tDiffuse,vUv).g; c.b=texture2D(tDiffuse,vUv-d*ca).b;
      c = c*gain + lift*(1.-c);
      float v = 1. - vignette*smoothstep(.25,.95,length(d*vec2(1.,res.y/res.x*.62)));
      c *= v;
      float g = h(vUv*res + time) - .5; c += g*grain*(1.-c*.6);
      gl_FragColor=vec4(clamp(c,0.,1.),1.);
    }`,
}

/* anamorphic lens streak: bright highlights smeared horizontally, tinted cool-warm like cinema glass */
const Streak = {
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(1, 1) }, threshold: { value: 3.0 }, amount: { value: 0.35 }, tint: { value: new THREE.Color(1.0, 0.72, 0.5) }, len: { value: 0.22 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; uniform vec2 res; uniform float threshold, amount, len; uniform vec3 tint; varying vec2 vUv;
    void main(){ vec4 c=texture2D(tDiffuse,vUv); vec3 s=vec3(0.); float tot=0.;
      for(int i=-40;i<=40;i++){ float f=float(i)/40.; vec3 t=texture2D(tDiffuse, vUv+vec2(f*len,0.)).rgb; float l=dot(t,vec3(.2126,.7152,.0722));
        float w=exp(-abs(f)*4.0); s+=max(t*(1.0-threshold/max(l,1e-3)),0.)*w; tot+=w; }
      c.rgb+=s/tot*tint*amount*6.0; gl_FragColor=c; }`,
}

/**
 * Ground-truth ambient occlusion: the soft contact shadow where things touch or nest (a bowl on a plate, rice
 * between rice). Glows, flames, smoke and other see-through sprites are left out of its depth/normal pass, so
 * they never darken what is behind them.
 */
class ContactShadowPass extends GTAOPass {
  _overrideVisibility() {
    super._overrideVisibility()
    const cache = this._visibilityCache
    this.scene.traverse((o) => {
      if (o.isMesh && o.visible && (o.userData.noAO || (o.material && o.material.transparent))) { o.visible = false; cache.push(o) }
    })
  }
}

export function makeComposer(renderer, scene, camera, W, H, opts = {}) {
  const { bloom = [0.6, 0.55, 0.85], rays = null, dof = null, grade = {}, alpha = false, streak = null, ao = null } = opts
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 })
  const composer = new EffectComposer(renderer, rt)
  composer.setPixelRatio(1)
  composer.setSize(W, H)
  composer.addPass(new RenderPass(scene, camera))
  if (ao) {
    const p = new ContactShadowPass(scene, camera, W, H)
    p.updateGtaoMaterial({ radius: ao.radius ?? 0.04, distanceExponent: ao.distanceExponent ?? 1.5, thickness: ao.thickness ?? 0.02, distanceFallOff: ao.falloff ?? 1, scale: ao.scale ?? 1.2, samples: ao.samples ?? 16 })
    p.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: ao.denoise ?? 6, rings: 2, samples: 16 })
    p.blendIntensity = ao.intensity ?? 1
    composer.addPass(p)
  }
  let add = null
  if (rays) {
    add = new ShaderPass(AddTex)
    composer.addPass(add)
  }
  if (dof) composer.addPass(new BokehPass(scene, camera, dof))
  if (streak) {
    const st = new ShaderPass(Streak)
    st.uniforms.res.value.set(W, H)
    for (const [k, v] of Object.entries(streak)) { if (k === 'tint') st.uniforms.tint.value.set(v); else st.uniforms[k].value = v }
    composer.addPass(st)
  }
  if (bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), bloom[0], bloom[1], bloom[2]))
  composer.addPass(new OutputPass())
  if (!alpha) {
    const g = new ShaderPass(Grade)
    g.uniforms.res.value.set(W, H)
    for (const [k, v] of Object.entries(grade)) {
      if (g.uniforms[k].value?.set && Array.isArray(v)) g.uniforms[k].value.set(...v)
      else g.uniforms[k].value = v
    }
    composer.addPass(g)
  }
  return {
    composer,
    setRays(tex, amount, tint) {
      if (!add) return
      add.uniforms.tAdd.value = tex
      add.uniforms.amount.value = amount
      if (tint) add.uniforms.tint.value.set(tint)
    },
    render() { composer.render() },
  }
}

/**
 * Live-light points for the site: world positions projected to the image as
 * fractions of width (x, r) and height (y). Points outside the frame are dropped.
 */
export function exportLights(camera, W, H, points) {
  const out = []
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const r = rng(77)
  for (const p of points) {
    const v = p.pos.clone().project(camera)
    if (v.z > 1 || v.x < -1.05 || v.x > 1.05 || v.y < -1.05 || v.y > 1.05) continue
    const dist = p.pos.distanceTo(camera.position)
    const rh = p.radius / (dist * tanV * 2) // fraction of image height
    out.push({ x: +(v.x * 0.5 + 0.5).toFixed(4), y: +(0.5 - v.y * 0.5).toFixed(4), r: +((rh * H) / W).toFixed(4), kind: p.kind, seed: +r().toFixed(3) })
  }
  window.__lights = (window.__lights || []).concat(out)
  return out
}

export function screenPos(vec3, camera) {
  const v = vec3.clone().project(camera)
  return new THREE.Vector2(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5)
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms))
