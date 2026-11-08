/**
 * The 3D route map of Davangere — streets traced from OpenStreetMap (tools/routemap), illustrative houses and
 * trees, the lake, and the drive from the railway station to Bapuji Samudhaya Bhavan played as a short film:
 * the camera starts high over the city, follows a glowing route as it draws itself along the real roads, then
 * comes down to the hall as the brass pin drops; afterwards it circles the hall slowly.
 *
 * Plain three.js (no React) so the page only pays for it when the venue comes near; it shares the 3D chunk
 * with the mandap. Units are metres: x east, z south of the venue, y up.
 */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export interface RouteStep {
  at: number
  name: string
}
export interface MapData {
  bounds: [[number, number], [number, number]]
  station: [number, number]
  sun: { azimuth: number; elevation: number }
  route: { points: [number, number][]; length: number; km: number; minutes: number; steps: RouteStep[] }
  roads: { c: 1 | 2 | 3 | 4; p: [number, number][] }[]
  lakes: [number, number][][]
  canals: [number, number][][]
  rail: [number, number][]
  labels: { name: string; p: [number, number] }[]
  colors: [number, number, number][]
}

export interface MapEvents {
  /** the road the route is on as it draws (null before it starts and once it has arrived) */
  onStep?: (step: RouteStep | null, metres: number) => void
  /** 'intro' → 'drive' → 'arrive' → 'idle' */
  onPhase?: (phase: Phase) => void
  /** where the subject sits in the frame, as fractions of the width and height (default the centre) — so it
   * stays clear of whatever the page lays over the map */
  focus?: [number, number]
}
export type Phase = 'intro' | 'drive' | 'arrive' | 'idle'

export interface RouteMapController {
  /** start (or restart) the film */
  play: () => void
  /** jump to the finished frame without motion */
  still: () => void
  setActive: (on: boolean) => void
  resize: () => void
  /** screen positions of the named places, for the HTML labels (null when off screen) */
  project: (id: 'station' | 'venue' | number) => { x: number; y: number } | null
  dispose: () => void
}

const HAZE = new THREE.Color('#eadcc2')
const T_INTRO = 2.6
const T_DRIVE = 9
const T_ARRIVE = 3.4
/** how far the city fades out at the edge of the traced area (metres) — tools/routemap/build.py uses the same */
const EDGE = 240

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
/** Distance along the drive for time 0…1: pulls away, cruises, slows into the hall. */
function cruise(t: number, a = 0.12, b = 0.2) {
  const v = 1 / (1 - a / 2 - b / 2)
  if (t <= 0) return 0
  if (t >= 1) return 1
  if (t < a) return (v * t * t) / (2 * a)
  if (t < 1 - b) return v * (a / 2 + t - a)
  return v * (a / 2 + 1 - a - b + (b * b - (1 - t) * (1 - t)) / (2 * b))
}

/* ---------------------------------------------------------------- geometry helpers */

/** A flat ribbon along a polyline (x, z), `w` wide, at height y; uv.x = distance along, uv.y = -1…1 across. */
function ribbon(points: [number, number][], w: number, y: number, out: { pos: number[]; uv: number[]; idx: number[] }) {
  if (points.length < 2) return
  const n = points.length
  const base = out.pos.length / 3
  let dist = 0
  for (let i = 0; i < n; i++) {
    const [x, z] = points[i]
    const [ax, az] = points[Math.max(0, i - 1)]
    const [bx, bz] = points[Math.min(n - 1, i + 1)]
    let tx = bx - ax,
      tz = bz - az
    const tl = Math.hypot(tx, tz) || 1
    tx /= tl
    tz /= tl
    // mitre, limited so sharp turns don't spike
    let nx = -tz,
      nz = tx
    if (i > 0 && i < n - 1) {
      const [px, pz] = points[i - 1]
      let ux = x - px,
        uz = z - pz
      const ul = Math.hypot(ux, uz) || 1
      ux /= ul
      uz /= ul
      const dot = Math.max(0.35, -uz * nx + ux * nz)
      nx /= dot
      nz /= dot
    }
    if (i > 0) dist += Math.hypot(x - points[i - 1][0], z - points[i - 1][1])
    out.pos.push(x + (nx * w) / 2, y, z + (nz * w) / 2, x - (nx * w) / 2, y, z - (nz * w) / 2)
    out.uv.push(dist, 1, dist, -1)
    if (i < n - 1) {
      const a = base + i * 2
      out.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) // wound to face up
    }
  }
}

function ribbonGeometry(lines: [number, number][][], w: number, y: number) {
  const out = { pos: [] as number[], uv: [] as number[], idx: [] as number[] }
  for (const l of lines) ribbon(l, w, y, out)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2))
  g.setIndex(out.idx)
  g.computeVertexNormals()
  return g
}

/** Resample a polyline every `step` metres along a smooth curve through it. */
function smooth(points: [number, number][], step: number): [number, number][] {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  )
  const n = Math.max(2, Math.round(curve.getLength() / step))
  return curve.getSpacedPoints(n).map((v) => [v.x, v.z])
}

/** The classic map-marker outline, height 1, tip at the origin. */
function markerShape(R = 0.32, cy = 0.66) {
  const s = new THREE.Shape()
  const t = Math.PI / 2 - Math.asin(R / cy)
  s.moveTo(0, 0)
  s.lineTo(Math.cos(t) * R, cy - Math.sin(t) * R)
  s.absarc(0, cy, R, -t, Math.PI + t, false)
  s.lineTo(0, 0)
  const hole = new THREE.Path()
  hole.absarc(0, cy, R * 0.46, 0, Math.PI * 2, true)
  s.holes.push(hole)
  return s
}

/* ---------------------------------------------------------------- the scene */

export async function createRouteMap(canvas: HTMLCanvasElement, base: string, events: MapEvents = {}): Promise<RouteMapController> {
  const [data, bin, groundTex] = await Promise.all([
    fetch(`${base}map/davangere.json`).then((r) => r.json() as Promise<MapData>),
    fetch(`${base}map/city.bin`).then((r) => r.arrayBuffer()),
    new THREE.TextureLoader().loadAsync(`${base}map/ground.webp`),
  ])

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(HAZE, 2200, 7200)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  const camera = new THREE.PerspectiveCamera(34, 1, 8, 9000)

  // light: a low late-afternoon sun from the west-south-west, warm sky, earthy bounce
  const az = THREE.MathUtils.degToRad(data.sun.azimuth)
  const el = THREE.MathUtils.degToRad(data.sun.elevation)
  const sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el))
  const sun = new THREE.DirectionalLight(0xffd7a8, 2.4)
  sun.position.copy(sunDir).multiplyScalar(1000)
  scene.add(sun, new THREE.HemisphereLight(0xfff1dc, 0x8a6a48, 1.15))

  const [[x0, z0], [x1, z1]] = data.bounds
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2
  const disposables: { dispose: () => void }[] = [renderer, pmrem, env, groundTex]
  const track = <T extends { dispose: () => void }>(o: T) => (disposables.push(o), o)

  // ground: land, parks and the baked shadows, fading out at the edges
  groundTex.colorSpace = THREE.SRGBColorSpace
  groundTex.anisotropy = renderer.capabilities.getMaxAnisotropy()
  const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(x1 - x0, z1 - z0)), track(new THREE.MeshLambertMaterial({ map: groundTex, transparent: true })))
  ground.rotation.x = -Math.PI / 2
  ground.position.set(cx, 0, cz)
  ground.renderOrder = 0
  scene.add(ground)

  // streets: a darker kerb under a pale carriageway, wider for main roads
  const ROAD: Record<number, { w: number; fill: string; kerb: string }> = {
    1: { w: 6.5, fill: '#f8f1e2', kerb: '#b8a684' },
    2: { w: 11, fill: '#f5e3a8', kerb: '#b49a62' },
    3: { w: 14, fill: '#f2c98c', kerb: '#a8814e' },
    4: { w: 19, fill: '#eaa685', kerb: '#9a6a52' },
  }
  // streets fade out at the edge of the traced area, as the ground does
  const bounds = { value: new THREE.Vector4(x0, z0, x1, z1) }
  const fadeAtEdges = (m: THREE.MeshLambertMaterial) => {
    m.transparent = true
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uBounds = bounds
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vWorldXZ;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorldXZ = (modelMatrix * vec4(transformed, 1.)).xz;')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vWorldXZ;\nuniform vec4 uBounds;')
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          float edgeD = min(min(vWorldXZ.x - uBounds.x, uBounds.z - vWorldXZ.x), min(vWorldXZ.y - uBounds.y, uBounds.w - vWorldXZ.y));
          gl_FragColor.a *= pow(clamp(edgeD / ${EDGE}., 0., 1.), 1.5);`,
        )
    }
    return m
  }
  const roadMat = (color: string, offset: number) =>
    track(fadeAtEdges(new THREE.MeshLambertMaterial({ color, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset })))
  for (const c of [1, 2, 3, 4] as const) {
    const lines = data.roads.filter((r) => r.c === c).map((r) => r.p)
    const kerb = new THREE.Mesh(track(ribbonGeometry(lines, ROAD[c].w + 2.4, 0.2 + c * 0.05)), roadMat(ROAD[c].kerb, -1 - c))
    const fill = new THREE.Mesh(track(ribbonGeometry(lines, ROAD[c].w, 0.3 + c * 0.05)), roadMat(ROAD[c].fill, -2 - c * 2))
    kerb.renderOrder = fill.renderOrder = 1
    scene.add(kerb, fill)
  }
  // railway and canals
  if (data.rail.length > 1) {
    const rail = new THREE.Mesh(track(ribbonGeometry([data.rail], 7, 0.5)), roadMat('#6e655c', -8))
    scene.add(rail)
  }
  const canals = new THREE.Mesh(track(ribbonGeometry(data.canals, 5, 0.25)), roadMat('#7fa7a8', -3))
  scene.add(canals)

  // the lake: still water catching the low sun
  for (const lake of data.lakes) {
    const shape = new THREE.Shape(lake.map(([x, z]) => new THREE.Vector2(x, -z)))
    const g = track(new THREE.ShapeGeometry(shape))
    g.rotateX(-Math.PI / 2)
    const m = new THREE.Mesh(g, track(new THREE.MeshPhongMaterial({ color: '#557f86', specular: '#ffe2b0', shininess: 60, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })))
    m.position.y = 0.4
    scene.add(m)
  }

  // houses: boxes shaded darker towards the ground, a black water tank on many roofs
  const view = new DataView(bin)
  const nB = view.getUint32(0, true),
    nT = view.getUint32(4, true)
  const box = new THREE.BoxGeometry(1, 1, 1)
  box.translate(0, 0.5, 0)
  {
    const p = box.attributes.position
    const col = new Float32Array(p.count * 3)
    for (let i = 0; i < p.count; i++) {
      const k = 0.66 + 0.34 * p.getY(i)
      col.set([k, k, k * 0.98], i * 3)
    }
    box.setAttribute('color', new THREE.BufferAttribute(col, 3))
  }
  track(box)
  const houses = new THREE.InstancedMesh(box, track(new THREE.MeshLambertMaterial({ vertexColors: true })), nB)
  const tankGeo = track(new THREE.CylinderGeometry(0.85, 0.85, 1.6, 7))
  tankGeo.translate(0, 0.8, 0)
  const tanks = new THREE.InstancedMesh(tankGeo, track(new THREE.MeshLambertMaterial({ color: '#232326' })), nB)
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    s = new THREE.Vector3(),
    v = new THREE.Vector3(),
    col = new THREE.Color()
  const up = new THREE.Vector3(0, 1, 0)
  let nTank = 0
  let o = 8
  for (let i = 0; i < nB; i++, o += 10) {
    const x = view.getInt16(o, true) / 10,
      z = view.getInt16(o + 2, true) / 10
    const w = view.getUint8(o + 4) / 10,
      d = view.getUint8(o + 5) / 10,
      h = view.getUint8(o + 6) / 5
    const ang = (view.getUint8(o + 7) / 255) * Math.PI
    const c = data.colors[view.getUint8(o + 8)] ?? [230, 225, 215]
    q.setFromAxisAngle(up, -ang)
    m4.compose(v.set(x, 0, z), q, s.set(d, h, w))
    houses.setMatrixAt(i, m4)
    houses.setColorAt(i, col.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace))
    if (view.getUint8(o + 9)) {
      const ox = d * 0.22,
        oz = w * 0.22
      m4.compose(v.set(x + Math.cos(ang) * ox - Math.sin(ang) * oz, h, z + Math.sin(ang) * ox + Math.cos(ang) * oz), q, s.set(1, 1, 1))
      tanks.setMatrixAt(nTank++, m4)
    }
  }
  tanks.count = nTank
  scene.add(houses, tanks)

  // trees: neem (round crown) and coconut palms
  const neemGeo = (() => {
    const crown = new THREE.IcosahedronGeometry(1, 1)
    crown.scale(4.2, 3.4, 4.2)
    crown.translate(0, 6.2, 0)
    const trunk = new THREE.CylinderGeometry(0.35, 0.5, 4, 5)
    trunk.translate(0, 2, 0)
    return mergeColored([
      [crown, [0.36, 0.5, 0.25]],
      [trunk, [0.4, 0.3, 0.2]],
    ])
  })()
  const palmGeo = (() => {
    const parts: [THREE.BufferGeometry, [number, number, number]][] = []
    const trunk = new THREE.CylinderGeometry(0.22, 0.32, 10, 5)
    trunk.translate(0, 5, 0)
    parts.push([trunk, [0.45, 0.36, 0.26]])
    for (let k = 0; k < 7; k++) {
      const leaf = new THREE.ConeGeometry(0.7, 5.2, 3)
      leaf.rotateZ(Math.PI / 2 + 0.55)
      leaf.translate(2.4, 9.4, 0)
      leaf.rotateY((k / 7) * Math.PI * 2)
      parts.push([leaf, [0.32, 0.48, 0.2]])
    }
    return mergeColored(parts)
  })()
  track(neemGeo)
  track(palmGeo)
  const treeMat = track(new THREE.MeshLambertMaterial({ vertexColors: true }))
  const neem = new THREE.InstancedMesh(neemGeo, treeMat, nT)
  const palms = new THREE.InstancedMesh(palmGeo, treeMat, nT)
  let nN = 0,
    nP = 0
  for (let i = 0; i < nT; i++, o += 6) {
    const x = view.getInt16(o, true) / 10,
      z = view.getInt16(o + 2, true) / 10
    const kind = view.getUint8(o + 4),
      size = view.getUint8(o + 5) / 100
    q.setFromAxisAngle(up, (i * 2.399) % (Math.PI * 2))
    m4.compose(v.set(x, 0, z), q, s.set(size, size, size))
    const tint = 0.85 + ((i * 37) % 30) / 100
    if (kind) {
      palms.setMatrixAt(nP, m4)
      palms.setColorAt(nP++, col.setRGB(tint, tint, tint))
    } else {
      neem.setMatrixAt(nN, m4)
      neem.setColorAt(nN++, col.setRGB(tint, tint * 1.02, tint))
    }
  }
  neem.count = nN
  palms.count = nP
  scene.add(neem, palms)

  /* ---------------- the route: a glowing ribbon that draws itself, with a curtain of light above it */
  const routePts = smooth(data.route.points, 6)
  let routeLen = 0
  const cum = [0]
  for (let i = 1; i < routePts.length; i++) cum.push((routeLen += Math.hypot(routePts[i][0] - routePts[i - 1][0], routePts[i][1] - routePts[i - 1][1])))
  const at = (d: number) => {
    d = Math.min(routeLen, Math.max(0, d))
    let i = 1
    while (i < cum.length - 1 && cum[i] < d) i++
    const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)
    const [ax, az] = routePts[i - 1],
      [bx, bz] = routePts[i]
    return new THREE.Vector3(ax + (bx - ax) * t, 0, az + (bz - az) * t)
  }
  const uniforms = { uProgress: { value: 0 }, uTime: { value: 0 }, uLength: { value: routeLen } }
  const routeMat = track(
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -12,
      polygonOffsetUnits: -12,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float uProgress,uTime,uLength; varying vec2 vUv;
        void main(){
          float head=uProgress*uLength; if(vUv.x>head) discard;
          float core=1.-abs(vUv.y);
          vec3 maroon=vec3(.48,.06,.13), gold=vec3(1.,.8,.42), white=vec3(1.,.97,.88);
          vec3 c=mix(maroon,gold,smoothstep(.15,.85,core));
          float pulse=smoothstep(.0,.08,fract((vUv.x-uTime*140.)/420.))*(1.-smoothstep(.08,.22,fract((vUv.x-uTime*140.)/420.)));
          float tip=exp(-(head-vUv.x)/60.);
          c=mix(c,white,clamp(pulse*.7*core+tip*.8*core,0.,1.));
          gl_FragColor=vec4(c*1.25,smoothstep(0.,.25,core)*.98);
        }`,
    }),
  )
  const routeMesh = new THREE.Mesh(track(ribbonGeometry([routePts], 13, 1.4)), routeMat)
  routeMesh.renderOrder = 3
  const glowMat = track(
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float uProgress,uLength; varying vec2 vUv;
        void main(){ if(vUv.x>uProgress*uLength) discard; float a=pow(1.-abs(vUv.y),2.2)*.55; gl_FragColor=vec4(vec3(1.,.66,.3)*a,1.); }`,
    }),
  )
  const glow = new THREE.Mesh(track(ribbonGeometry([routePts], 70, 1.6)), glowMat)
  glow.renderOrder = 2
  // the curtain: a soft wall of light standing on the route, brightest at the drawing head
  const wall = (() => {
    const pos: number[] = [],
      uv: number[] = [],
      idx: number[] = []
    const H = 34
    routePts.forEach(([x, z], i) => {
      pos.push(x, 1.5, z, x, H, z)
      uv.push(cum[i], 0, cum[i], 1)
      if (i < routePts.length - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    return g
  })()
  const wallMat = track(
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float uProgress,uLength; varying vec2 vUv;
        void main(){ float head=uProgress*uLength; if(vUv.x>head) discard;
          float a=pow(1.-vUv.y,2.4)*(.16+.5*exp(-(head-vUv.x)/180.));
          gl_FragColor=vec4(vec3(1.,.72,.38)*a,1.); }`,
    }),
  )
  const curtain = new THREE.Mesh(track(wall), wallMat)
  curtain.renderOrder = 4
  scene.add(glow, routeMesh, curtain)

  // the drawing head: a bright point travelling the route
  const headTex = track(radialTexture())
  const headMat = track(new THREE.SpriteMaterial({ map: headTex, color: 0xffd9a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))
  const head = new THREE.Sprite(headMat)
  head.scale.set(90, 90, 1)
  head.renderOrder = 5
  scene.add(head)

  /* ---------------- markers: a beacon at the station, the brass pin at the hall */
  const beacon = (x: number, z: number, color: number, height: number) => {
    const g = track(new THREE.CylinderGeometry(9, 9, height, 24, 1, true))
    g.translate(0, height / 2, 0)
    const m = new THREE.Mesh(
      g,
      track(
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          uniforms: { uColor: { value: new THREE.Color(color) } },
          vertexShader: `varying float vY; void main(){ vY=uv.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
          fragmentShader: `uniform vec3 uColor; varying float vY; void main(){ gl_FragColor=vec4(uColor*pow(1.-vY,1.6)*.75,1.); }`,
        }),
      ),
    )
    m.position.set(x, 0, z)
    m.renderOrder = 6
    scene.add(m)
    return m
  }
  const [sx, sz] = data.station
  beacon(sx, sz, 0x9fd0ff, 160)
  const venueBeacon = beacon(0, 0, 0xffc56a, 420)
  venueBeacon.scale.set(1, 0.001, 1)

  const brass = track(new THREE.MeshStandardMaterial({ color: '#e2b65c', metalness: 1, roughness: 0.25, envMap: env, envMapIntensity: 1.1 }))
  const pinGeo = track(new THREE.ExtrudeGeometry(markerShape(), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 5, curveSegments: 40 }))
  pinGeo.translate(0, 0, -0.06)
  const pin = new THREE.Group()
  const pinBody = new THREE.Mesh(pinGeo, brass)
  const enamel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.147, 0.147, 0.08, 40)), track(new THREE.MeshStandardMaterial({ color: '#6e1022', roughness: 0.2, envMap: env })))
  enamel.rotation.x = Math.PI / 2
  enamel.position.y = 0.66
  pin.add(pinBody, enamel)
  const PIN = 95
  pin.scale.setScalar(PIN)
  scene.add(pin)
  // ripples where the pin lands
  const ripples = [0, 1, 2].map(() => {
    const r = new THREE.Mesh(track(new THREE.RingGeometry(0.92, 1, 64)), track(new THREE.MeshBasicMaterial({ color: 0xffc56a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })))
    r.rotation.x = -Math.PI / 2
    r.position.y = 2
    scene.add(r)
    return r
  })

  /* ---------------- camera choreography */
  const venue = new THREE.Vector3(0, 0, 0)
  const station = new THREE.Vector3(sx, 0, sz)
  const overall = venue.clone().sub(station).setY(0).normalize()
  type Shot = { pos: THREE.Vector3; look: THREE.Vector3 }
  const camPos = new THREE.Vector3()
  // the establishing shot: high over the city, looking down the whole way from the station to the hall
  const wide = (k: number): Shot => {
    const look = station.clone().lerp(venue, 0.26)
    const D = 3200 - 400 * k,
      p = THREE.MathUtils.degToRad(60)
    return { pos: look.clone().addScaledVector(overall, -D * Math.cos(p)).setY(D * Math.sin(p)), look }
  }
  // the drive: behind and above the head, a little to one side, turning smoothly with the road
  const heading = (d: number) => {
    const h = at(d + 380).sub(at(d - 620)).setY(0)
    return h.lengthSq() < 1 ? overall.clone() : h.normalize()
  }
  const chase = (d: number): Shot => {
    const h = at(d),
      dir = heading(d)
    return { pos: h.clone().addScaledVector(dir, -470).add(new THREE.Vector3(-dir.z * 110, 650, dir.x * 110)), look: h.clone().addScaledVector(dir, 60) }
  }
  // the hall: the camera swings round to look back along the way the drive came, then circles slowly
  const from = chase(routeLen)
  const endAngle = Math.atan2(from.pos.x, from.pos.z),
    endR = Math.hypot(from.pos.x, from.pos.z)
  const idleAngle = endAngle + 2.5
  const R = 640,
    ALT = 430,
    hall = new THREE.Vector3(0, 30, 0)
  const orbit = (angle: number): Shot => ({ pos: new THREE.Vector3(Math.sin(angle) * R, ALT, Math.cos(angle) * R), look: hall.clone() })
  const swing = (ta: number): Shot => {
    const k = ease(clamp01(ta / T_ARRIVE))
    const a = endAngle + (idleAngle - endAngle) * k,
      r = endR + (R - endR) * k
    return { pos: new THREE.Vector3(Math.sin(a) * r, from.pos.y + (ALT - from.pos.y) * k, Math.cos(a) * r), look: from.look.clone().lerp(hall, k) }
  }

  let phase: Phase = 'intro'
  let t0 = performance.now()
  let active = false
  let raf = 0
  let lastStep: RouteStep | null = null
  let still = false

  const setPhase = (p: Phase) => {
    if (p !== phase) {
      phase = p
      events.onPhase?.(p)
    }
  }
  const setStep = (step: RouteStep | null, metres: number) => {
    if (step !== lastStep) {
      lastStep = step
      events.onStep?.(step, metres)
    }
  }

  const fog = scene.fog as THREE.Fog
  const frame = (now: number) => {
    const t = (now - t0) / 1000
    uniforms.uTime.value = t
    let shot: Shot
    let ta = -1 // seconds since the drive reached the hall
    head.visible = false
    if (still) {
      ta = 99
      uniforms.uProgress.value = 1
      shot = orbit(idleAngle)
    } else if (t < T_INTRO) {
      setPhase('intro')
      uniforms.uProgress.value = 0
      // hold the wide shot, easing in, then dive down to the station
      const k = t / T_INTRO
      const w = wide(ease(clamp01(k / 0.6)))
      const c = chase(0)
      const m = ease(clamp01((k - 0.3) / 0.7))
      shot = { pos: w.pos.lerp(c.pos, m), look: w.look.lerp(c.look, m) }
    } else if (t < T_INTRO + T_DRIVE) {
      setPhase('drive')
      const k = cruise((t - T_INTRO) / T_DRIVE)
      uniforms.uProgress.value = k
      const d = k * routeLen
      shot = chase(d)
      head.visible = true
      head.position.copy(at(d)).setY(8)
      head.scale.set(90, 90, 1)
      headMat.opacity = 1
      const scaled = (d / routeLen) * data.route.length
      setStep([...data.route.steps].reverse().find((s) => s.at <= scaled) ?? null, scaled)
    } else {
      ta = t - T_INTRO - T_DRIVE
      uniforms.uProgress.value = 1
      setStep(null, data.route.length)
      if (ta < T_ARRIVE) {
        setPhase('arrive')
        shot = swing(ta)
      } else {
        setPhase('idle')
        shot = orbit(idleAngle + (ta - T_ARRIVE) * 0.045)
      }
      // the head flares as it reaches the hall
      if (ta < 0.7) {
        head.visible = true
        head.position.set(0, 8, 0)
        head.scale.setScalar(90 + ta * 420)
        headMat.opacity = 1 - ta / 0.7
      }
    }
    // the brass pin falls in and lands with a little squash; the beacon rises and rings spread from it
    const fall = clamp01((ta - 0.25) / 0.7)
    pin.visible = ta >= 0.25
    pin.position.y = (1 - fall * fall) * 340
    const squash = ta > 0.95 ? Math.sin(clamp01((ta - 0.95) / 0.45) * Math.PI) : 0
    pin.scale.set(PIN * (1 + 0.1 * squash), PIN * (1 - 0.15 * squash), PIN * (1 + 0.1 * squash))
    venueBeacon.scale.y = Math.max(0.001, ease(clamp01((ta - 0.95) / 1.4)))
    ripples.forEach((r, i) => {
      const rt = (((ta - 0.95 - i * 0.7) % 2.8) + 2.8) % 2.8
      r.scale.setScalar(20 + rt * 70)
      ;(r.material as THREE.MeshBasicMaterial).opacity = ta > 0.95 ? Math.max(0, 0.6 * (1 - rt / 2.8)) : 0
    })

    camPos.copy(shot.pos)
    camera.position.copy(shot.pos)
    camera.lookAt(shot.look)
    // keep what the camera looks at crisp; let the distance go hazy
    const dist = shot.pos.distanceTo(shot.look)
    fog.near = dist * 1.05
    fog.far = dist * 4.6
    pin.rotation.y = Math.atan2(camPos.x, camPos.z) // the pin's face turns to the camera
    renderer.render(scene, camera)
  }

  const loop = (now: number) => {
    frame(now)
    if (active && !still) raf = requestAnimationFrame(loop)
  }

  const [fx, fy] = events.focus ?? [0.5, 0.5]
  const resize = () => {
    const w = canvas.clientWidth,
      h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // a wider lens for tall frames, so a phone sees about as much of the city across as a laptop does
    camera.fov = 46 - 10 * clamp01((w / h - 0.85) / 0.6)
    // shift the lens so the subject sits at the focus point
    camera.setViewOffset(w, h, (0.5 - fx) * w, (0.5 - fy) * h, w, h)
    if (still || !active) frame(performance.now())
  }
  resize()

  const projectV = new THREE.Vector3()
  return {
    play() {
      still = false
      t0 = performance.now()
      phase = 'intro'
      events.onPhase?.('intro')
      lastStep = null
      events.onStep?.(null, 0)
      cancelAnimationFrame(raf)
      if (active) raf = requestAnimationFrame(loop)
    },
    still() {
      still = true
      cancelAnimationFrame(raf)
      phase = 'idle'
      events.onPhase?.('idle')
      lastStep = null
      events.onStep?.(null, data.route.length)
      frame(performance.now())
    },
    setActive(on) {
      if (on === active) return
      active = on
      cancelAnimationFrame(raf)
      if (on && !still) raf = requestAnimationFrame(loop)
    },
    resize,
    project(id) {
      if (id === 'station') projectV.set(sx, 60, sz)
      else if (id === 'venue') projectV.set(0, PIN * 1.15 + pin.position.y, 0)
      else projectV.set(data.labels[id].p[0], 20, data.labels[id].p[1])
      projectV.project(camera)
      if (projectV.z > 1 || Math.abs(projectV.x) > 1.1 || Math.abs(projectV.y) > 1.1) return null
      return { x: (projectV.x * 0.5 + 0.5) * canvas.clientWidth, y: (0.5 - projectV.y * 0.5) * canvas.clientHeight }
    },
    dispose() {
      active = false
      cancelAnimationFrame(raf)
      disposables.forEach((d) => d.dispose())
    },
  }
}

/** Merge geometries, painting each with one vertex colour. */
function mergeColored(parts: [THREE.BufferGeometry, [number, number, number]][]) {
  const pos: number[] = [],
    nrm: number[] = [],
    col: number[] = []
  for (const [g0, c] of parts) {
    const g = g0.index ? g0.toNonIndexed() : g0
    g.computeVertexNormals()
    const p = g.attributes.position,
      n = g.attributes.normal
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i))
      nrm.push(n.getX(i), n.getY(i), n.getZ(i))
      col.push(...c)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  return g
}

/** A soft round glow for sprites. */
function radialTexture() {
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
