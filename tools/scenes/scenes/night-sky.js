// A2 · Night sky over the reception: stars, faint Milky Way, town-glow at the horizon, a textured waxing moon,
// strands of warm wedding lights at several depths (near ones as out-of-focus bokeh) and neem branches framing the top.
import { THREE, rng, makeNoise, canvasTex, makeRenderer, makeComposer, GLSL_NOISE, mergeGeometries, exportLights } from '../lib/common.js'
import { haloMaterial, bokehMaterial, mangoLeafGeo } from '../lib/flora.js'

export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const renderer = makeRenderer(W, H, { exposure: +(q.get('exp') || 1.0) })
  const scene = new THREE.Scene()
  const land = (q.get('o') || 'portrait') === 'landscape'
  const pitch = THREE.MathUtils.degToRad(+(q.get('pitch') || (land ? 16 : 24)))
  const vfov = land ? 36 : 50
  const camera = new THREE.PerspectiveCamera(vfov, W / H, 0.05, 5000)
  camera.position.set(0, 0, 0)
  camera.rotation.set(pitch, 0, 0)
  camera.updateMatrixWorld()
  const tanV = Math.tan(THREE.MathUtils.degToRad(vfov / 2)), tanH = tanV * (W / H)
  const local = (xn, yn, D) => camera.localToWorld(new THREE.Vector3(xn * D * tanH, yn * D * tanV, -D))

  /* sky dome */
  const moonDir = local(+(q.get('mx') || (land ? 0.62 : 0.5)), +(q.get('my') || (land ? 0.3 : 0.33)), 1).normalize()
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { moonDir: { value: moonDir } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); gl_Position.z=gl_Position.w; }`,
    fragmentShader: /* glsl */ `uniform vec3 moonDir; varying vec3 vDir; ${GLSL_NOISE}
      vec3 hash33(vec3 p){ p=fract(p*vec3(.1031,.1030,.0973)); p+=dot(p,p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
      vec3 stars(vec3 d, float scale, float thr, float size, float gain){
        vec3 p=d*scale; vec3 c=floor(p); vec3 h=hash33(c); vec3 sp=c+0.25+0.5*h; float dist=length(p-sp);
        if(h.y<thr) return vec3(0.);
        float br=(h.y-thr)/(1.-thr); br=br*br*br;
        float s=smoothstep(size,0.,dist);
        vec3 tint=mix(vec3(0.72,0.8,1.0), vec3(1.0,0.85,0.68), h.z);
        return tint*s*br*gain; }
      void main(){
        vec3 d=normalize(vDir); float el=d.y;
        vec3 col=mix(vec3(0.018,0.02,0.045), vec3(0.0025,0.0045,0.016), smoothstep(-0.02,0.75,el));
        col+=vec3(0.16,0.075,0.035)*exp(-max(el,0.)*9.0)*0.55;
        // milky way band with dust lanes
        vec3 N=normalize(vec3(0.75,0.35,0.55)); float b=dot(d,N);
        vec2 sp2=d.xy/(1.0-d.z*0.0+1.2); vec2 mp=sp2*vec2(5.0,6.0);
        float band=exp(-b*b*18.0)*(0.35+0.9*fbm2(mp*2.0));
        float lanes=smoothstep(0.45,0.7,fbm2(mp*4.5+7.0));
        col+=vec3(0.05,0.048,0.06)*band*(1.0-0.75*lanes)*smoothstep(0.05,0.35,el);
        col+=stars(d,300.0,0.88,0.12,4.0)+stars(d,140.0,0.965,0.09,7.0)+stars(d,620.0,0.74,0.16,1.6);
        col+=band*stars(d,900.0,0.6,0.18,0.9);
        // thin moonlit cloud wisps
        float cl=fbm2(sp2*vec2(4.5,14.0)+3.0);
        float wisps=smoothstep(0.6,0.85,cl)*smoothstep(0.1,0.4,el)*0.35*smoothstep(0.85,0.97,max(dot(d,moonDir),0.));
        float mc=max(dot(d,moonDir),0.);
        col=mix(col, vec3(0.05,0.055,0.075)+vec3(0.25,0.27,0.32)*pow(mc,30.0), wisps*0.35);
        col+=vec3(0.62,0.66,0.78)*(pow(mc,60.)*0.02+pow(mc,10.)*0.01);
        gl_FragColor=vec4(col,1.);
      }`,
  })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 64, 32), skyMat)
  scene.add(sky)

  /* moon */
  const N = makeNoise(21)
  const r = rng(4)
  const craters = Array.from({ length: 160 }, () => ({ x: r(), y: 0.15 + r() * 0.7, s: Math.pow(r(), 3) * 0.05 + 0.004 }))
  const moonTex = canvasTex(0, (ctx, w, h) => {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h
      const maria = N.fbm(u * 5, v * 3, 5)
      let a = 0.68 - 0.32 * Math.max(0, Math.min(1, (0.5 - maria) * 5)) + (N.fbm(u * 40, v * 20, 3) - 0.5) * 0.12
      for (const c of craters) {
        const dx = (u - c.x) * 2, dy = v - c.y
        const d = Math.sqrt(dx * dx + dy * dy) / c.s
        if (d < 1.25) a += d < 0.85 ? -0.05 : 0.09 * (1.25 - d) / 0.4
      }
      const i = (y * w + x) * 4
      const g = Math.max(0, Math.min(1, a)) * 255
      img.data[i] = g; img.data[i + 1] = g * 0.98; img.data[i + 2] = g * 0.94; img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, { w: 512, h: 256 })
  const moonDist = 900
  const moonR = moonDist * Math.tan(THREE.MathUtils.degToRad(land ? 0.95 : 1.3))
  const moon = new THREE.Mesh(new THREE.SphereGeometry(moonR, 64, 32), new THREE.MeshStandardMaterial({ map: moonTex, bumpMap: moonTex, bumpScale: 0.04, roughness: 1, emissive: 0x0d0f18, emissiveIntensity: 1 }))
  moon.position.copy(moonDir).multiplyScalar(moonDist)
  moon.lookAt(0, 0, 0)
  moon.rotateY(Math.PI)
  scene.add(moon)
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  const toMoon = moonDir.clone()
  const phase = THREE.MathUtils.degToRad(+(q.get('phase') || 100))
  const L = toMoon.clone().multiplyScalar(-Math.cos(phase)).addScaledVector(right, Math.sin(phase)).normalize()
  const moonLight = new THREE.DirectionalLight(0xfff4e6, +(q.get('ml') || 30))
  moonLight.position.copy(moon.position).addScaledVector(L, 100)
  moonLight.target = moon
  scene.add(moonLight, moonLight.target)
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(0xb8c4e0, 0.16, 3.2))
  halo.position.copy(moon.position).multiplyScalar(0.9); halo.scale.setScalar(moonR * 0.9 * 8)
  scene.add(halo)

  /* strands of wedding lights */
  const F = +(q.get('focus') || 9)
  const A = +(q.get('ap') || 0.07)
  const bulbGeo = new THREE.SphereGeometry(1, 10, 8)
  const strands = [
    { D: 2.4, ends: [1.08, 0.86], sag: 0.3, spacing: 0.13, phase: 0, x0: -1.6, x1: 1.4, c: 0.35 },
    { D: 4.6, ends: [0.98, 1.06], sag: 0.36, spacing: 0.15, phase: 1, x0: -1.5, x1: 1.6, c: -0.2 },
    { D: 8.5, ends: [0.95, 0.78], sag: 0.34, spacing: 0.17, phase: 2, x0: -1.5, x1: 1.5, c: 0.1 },
    { D: 9.5, ends: [0.62, 1.02], sag: 0.22, spacing: 0.17, phase: 3, x0: -1.6, x1: 1.3, c: 0.4 },
    { D: 14, ends: [0.86, 0.72], sag: 0.26, spacing: 0.22, phase: 1, x0: -1.5, x1: 1.5, c: -0.3 },
    { D: 24, ends: [0.7, 0.66], sag: 0.22, spacing: 0.3, phase: 4, x0: -1.4, x1: 1.4, c: 0.0 },
  ]
  const warm = [0xffd9a0, 0xffc47a, 0xffe2b8, 0xffb35c]
  const live = []
  strands.forEach((st) => {
    const pts = []
    for (let i = 0; i <= 80; i++) {
      const t = i / 80
      const xn = st.x0 + (st.x1 - st.x0) * t
      const tc = Math.min(0.999, Math.max(0.001, 0.5 + st.c * 0.5))
      const sagShape = t < tc ? 1 - Math.pow(1 - t / tc, 2) : 1 - Math.pow((t - tc) / (1 - tc), 2)
      const yn = st.ends[0] * (1 - t) + st.ends[1] * t - st.sag * sagShape
      pts.push(local(xn, yn, st.D))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const len = curve.getLength()
    const blur = A * Math.abs(1 - st.D / F) // world-space circle of confusion radius
    if (blur < 0.012) {
      const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.0025 * (st.D / 9), 4), new THREE.MeshBasicMaterial({ color: 0x0c0a0a }))
      scene.add(wire)
    }
    const n = Math.floor(len / st.spacing)
    for (let k = 0; k < n; k++) {
      const p = curve.getPointAt((k + 0.5) / n)
      const col = new THREE.Color(warm[(k + st.phase) % warm.length])
      if (blur > 0.012) {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bokehMaterial(col, 0.75 * Math.min(1, 0.025 / blur + 0.3)))
        b.position.copy(p); b.scale.setScalar(blur * 2.2 * (0.85 + 0.3 * r()))
        scene.add(b)
        if (k % 3 === 0) live.push({ pos: p.clone(), radius: blur * 1.3, kind: 'bulb' })
      } else {
        const bulb = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(9) }))
        bulb.position.copy(p).add(new THREE.Vector3(0, -0.02 * (st.D / 9), 0)); bulb.scale.setScalar(0.011 * (st.D / 9) + 0.004)
        scene.add(bulb)
        const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(col, 0.5, 2.0))
        h.position.copy(bulb.position); h.scale.setScalar(0.09 * (st.D / 9) + 0.02)
        scene.add(h)
        if (k % 2 === 0) live.push({ pos: bulb.position.clone(), radius: 0.05 * (st.D / 9) + 0.012, kind: 'bulb' })
      }
    }
  })

  /* neem branches framing the top corners (dark, slightly rim-lit by the lights) */
  const leafGeo = mangoLeafGeo({ width: 0.16, fold: 0.1, bend: 0.12 })
  leafGeo.scale(0.05, 0.05, 0.05)
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x0d140c, roughness: 0.6, side: THREE.DoubleSide })
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x0a0807, roughness: 0.9 })
  const rimLight = new THREE.PointLight(0xffb060, 6, 6, 2); rimLight.position.copy(local(0, 0.8, 3.5)); scene.add(rimLight)
  const branch = (from, to, side, seedB) => {
    const br = rng(seedB)
    const D = 2.0
    const a = local(from[0], from[1], D), b = local(to[0], to[1], D)
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.12, 0))
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.006, 6), barkMat))
    const leaves = []
    const count = 64
    const m = new THREE.Matrix4()
    const inst = new THREE.InstancedMesh(leafGeo, leafMat, count * 9)
    let k = 0
    for (let i = 0; i < count; i++) {
      const t = 0.15 + 0.85 * (i / count)
      const p = curve.getPoint(t)
      // compound neem leaf: twig with paired leaflets
      const twigDir = new THREE.Vector3((br() - 0.5) * 0.6, -0.6 - br() * 0.4, (br() - 0.5) * 0.4).normalize()
      for (let j = 0; j < 9; j++) {
        const tt = j / 9
        const pos = p.clone().addScaledVector(twigDir, 0.03 + tt * 0.16)
        const sideV = new THREE.Vector3().crossVectors(twigDir, new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(j % 2 ? 1 : -1)
        const dir = sideV.clone().multiplyScalar(0.8).addScaledVector(twigDir, 0.6).normalize()
        const qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
        qq.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), br() * 1.2))
        m.compose(pos, qq, new THREE.Vector3(1, 1, 1).multiplyScalar(0.8 + br() * 0.5))
        inst.setMatrixAt(k++, m)
      }
    }
    inst.count = k
    scene.add(inst)
  }
  branch([-1.25, 1.12], [-0.35, 1.0], -1, 7)
  branch([1.3, 1.14], [0.82, 1.06], 1, 8)

  live.push({ pos: moon.position.clone(), radius: moonR * 2.6, kind: 'glow' })
  exportLights(camera, W, H, live)
  const comp = makeComposer(renderer, scene, camera, W, H, {
    bloom: [+(q.get('bs') || 0.75), 0.45, +(q.get('bt') || 0.9)],
    grade: { vignette: 0.45, lift: [0.01, 0.012, 0.03], gain: [1.0, 0.98, 1.02], ca: 0.0008 },
  })
  comp.render()
}
