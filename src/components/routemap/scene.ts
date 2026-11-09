/**
 * The 3D route map of Davangere — streets traced from OpenStreetMap (tools/routemap); houses, trees, traffic,
 * the hall and the station drawn illustratively — and the drive from the railway station to Bapuji Samudhaya
 * Bhavan played as a short film: a wide shot high over the city through scattered cloud, a dive down to the
 * station, a glowing route that draws itself along the real roads with the camera following, then a swing round
 * to the hall as the brass pin drops and the wedding lights glow up; afterwards a slow circle round the hall.
 *
 * Plain three.js (no React) so the page only pays for it when the venue comes near; it shares the 3D chunk
 * with the mandap. Units are metres: x east, z south of the venue, y up. The pieces live beside this file:
 * city (houses), streets, nature (trees, the lake), landmarks (hall, station), traffic, sky (clouds).
 */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildCity } from './city'
import { markerShape, ribbonGeometry, smooth, type XZ } from './geo'
import { buildHall, buildStation, type HallData, type StationData } from './landmarks'
import { buildLakes, buildTrees } from './nature'
import { patch, type Shared } from './shaders'
import { buildClouds } from './sky'
import { buildStreets } from './streets'
import { cloudsTexture, detailTexture, glowTexture, skyTexture, waterNormalTexture } from './textures'
import { buildTraffic } from './traffic'

export interface RouteStep {
  at: number
  name: string
}
export interface MapData {
  bounds: [[number, number], [number, number]]
  station: XZ
  sun: { azimuth: number; elevation: number }
  route: { points: XZ[]; length: number; km: number; minutes: number; steps: RouteStep[] }
  roads: { c: 1 | 2 | 3 | 4; p: XZ[] }[]
  lakes: XZ[][]
  canals: XZ[][]
  rail: XZ[]
  labels: { name: string; p: XZ }[]
  colors: [number, number, number][]
  hall: HallData
  stationYard: StationData
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

/** the night haze — the same deep blue the page fades the map into */
const HAZE = new THREE.Color('#141a30')
const T_INTRO = 2.6
const T_DRIVE = 9
const T_ARRIVE = 3.4

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
  renderer.toneMappingExposure = 1.1
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(HAZE, 2200, 7200)
  const camera = new THREE.PerspectiveCamera(34, 1, 8, 12000)
  const disposables: { dispose: () => void }[] = [renderer, groundTex]
  const track = <T extends { dispose: () => void }>(o: T) => (disposables.push(o), o)
  const all = (list: { dispose: () => void }[]) => disposables.push(...list)

  // light: night — a low moon in the west-south-west (where the baked shadows fall from), a deep blue sky
  // overhead and the town's own warm glow from below; the lamps, windows and the hall do the rest
  const az = THREE.MathUtils.degToRad(data.sun.azimuth)
  const el = THREE.MathUtils.degToRad(data.sun.elevation)
  const sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el))
  const moon = new THREE.DirectionalLight(0xaebbe0, 0.85)
  moon.position.copy(sunDir).multiplyScalar(1000)
  scene.add(moon, new THREE.HemisphereLight(0x3e4a6e, 0x3a2418, 0.75))

  const pmrem = track(new THREE.PMREMGenerator(renderer))
  const metalEnv = track(pmrem.fromScene(new RoomEnvironment(), 0.04).texture)
  const skyTex = track(skyTexture(sunDir))
  const skyEnv = track(pmrem.fromEquirectangular(skyTex).texture)

  const [[x0, z0], [x1, z1]] = data.bounds
  const shared: Shared = {
    time: { value: 0 },
    bounds: { value: new THREE.Vector4(x0, z0, x1, z1) },
    clouds: { value: track(cloudsTexture()) },
    sun: { value: sunDir.clone() },
  }

  // the ground: soils, grass, shoulders and baked shadows, with fine grit up close and cloud shadows drifting over
  groundTex.colorSpace = THREE.SRGBColorSpace
  groundTex.anisotropy = renderer.capabilities.getMaxAnisotropy()
  const detail = track(detailTexture())
  const groundMat = track(
    patch(new THREE.MeshLambertMaterial({ map: groundTex, transparent: true }), shared, {
      key: 'ground',
      clouds: true,
      uniforms: { uDetail: { value: detail } },
      fragmentHead: 'uniform sampler2D uDetail;',
      color: /* glsl */ `
        float gpx = length(fwidth(vWorld.xz));
        float grit = texture2D(uDetail, vWorld.xz / 21.).r * .6 + texture2D(uDetail, vWorld.xz / 4.7).r * .4;
        diffuseColor.rgb *= mix(1., .8 + .4 * grit, 1. - smoothstep(1.2, 4., gpx));`,
    }),
  )
  const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(x1 - x0, z1 - z0)), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2)
  scene.add(ground)

  const view = new DataView(bin)
  const streets = buildStreets(data.roads, data.rail, data.canals, data.stationYard.sizes.track, shared, [x0, z0, x1, z1])
  const city = buildCity(view, data.colors, shared)
  const trees = buildTrees(view, city.treesAt, shared)
  const waterNormal = track(waterNormalTexture())
  const lakes = buildLakes(data.lakes, shared, skyEnv, waterNormal)
  const hall = buildHall(data.hall, shared, metalEnv)
  const railway = buildStation(data.stationYard, shared)
  const traffic = buildTraffic(data.roads, shared, [data.station, [0, 0]])
  const glows = [streets.lamps, traffic.lights, railway.lamps]
  for (const part of [streets, city, trees, lakes, hall, railway, traffic]) {
    scene.add(part.group)
    all(part.disposables)
  }
  scene.add(railway.train)

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
          float ph=fract((vUv.x-uTime*140.)/420.);
          float pulse=smoothstep(.0,.08,ph)*(1.-smoothstep(.08,.22,ph));
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
  const glowTex = track(glowTexture())
  const headMat = track(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd9a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))
  const head = new THREE.Sprite(headMat)
  head.scale.set(90, 90, 1)
  head.renderOrder = 5
  scene.add(head)

  /* ---------------- markers: a beacon at the station, the brass pin over the hall */
  const beacon = (x: number, z: number, color: number, height: number, radius: number) => {
    const g = track(new THREE.CylinderGeometry(radius, radius, height, 24, 1, true))
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
  beacon(sx, sz, 0x9fd0ff, 130, 7)
  const hc = hall.centre
  const ROOF = hall.height
  const venueBeacon = beacon(hc.x, hc.z, 0xffc56a, 420, 7)
  venueBeacon.scale.set(1, 0.001, 1)

  const brass = track(new THREE.MeshStandardMaterial({ color: '#e2b65c', metalness: 1, roughness: 0.25, envMap: metalEnv, envMapIntensity: 1.1 }))
  const pinGeo = track(new THREE.ExtrudeGeometry(markerShape(), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 5, curveSegments: 40 }))
  pinGeo.translate(0, 0, -0.06)
  const pin = new THREE.Group()
  const pinBody = new THREE.Mesh(pinGeo, brass)
  const enamel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.147, 0.147, 0.08, 40)), track(new THREE.MeshStandardMaterial({ color: '#6e1022', roughness: 0.2, envMap: metalEnv })))
  enamel.rotation.x = Math.PI / 2
  enamel.position.y = 0.66
  pin.add(pinBody, enamel)
  const PIN = 62
  const HOVER = ROOF + 24 // the pin's tip floats this high, so the whole hall shows beneath it
  pin.scale.setScalar(PIN)
  pin.position.set(hc.x, HOVER, hc.z)
  scene.add(pin)
  // its soft shadow on the hall's roof
  const shadowMat = track(new THREE.MeshBasicMaterial({ map: glowTex, color: 0x2a1a10, transparent: true, opacity: 0, depthWrite: false }))
  const pinShadow = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), shadowMat)
  pinShadow.rotation.x = -Math.PI / 2
  pinShadow.position.set(hc.x, ROOF + 0.3, hc.z)
  pinShadow.scale.set(36, 36, 1)
  pinShadow.renderOrder = 3
  scene.add(pinShadow)
  // a faint thread of light from the pin's tip down to the hall
  const tetherMat = track(new THREE.MeshBasicMaterial({ color: 0xffc56a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }))
  const tether = new THREE.Mesh(track(new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, true)), tetherMat)
  tether.position.set(hc.x, (ROOF + HOVER) / 2, hc.z)
  tether.scale.y = HOVER - ROOF
  scene.add(tether)
  // ripples where the pin lands
  const ripples = [0, 1, 2].map(() => {
    const r = new THREE.Mesh(track(new THREE.RingGeometry(0.92, 1, 64)), track(new THREE.MeshBasicMaterial({ color: 0xffc56a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })))
    r.rotation.x = -Math.PI / 2
    r.position.set(hc.x, 2, hc.z)
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
    return { pos: h.clone().addScaledVector(dir, -400).add(new THREE.Vector3(-dir.z * 100, 560, dir.x * 100)), look: h.clone().addScaledVector(dir, 50) }
  }
  // the hall: the camera swings round to look back along the way the drive came, then circles slowly
  const from = chase(routeLen)
  const endAngle = Math.atan2(from.pos.x - hc.x, from.pos.z - hc.z),
    endR = Math.hypot(from.pos.x - hc.x, from.pos.z - hc.z)
  const idleAngle = endAngle + 2.5
  const R = 430,
    ALT = 290,
    look = new THREE.Vector3(hc.x, 58, hc.z) // aimed above the hall, so it and its pin sit clear of the caption
  const orbit = (angle: number): Shot => ({ pos: new THREE.Vector3(hc.x + Math.sin(angle) * R, ALT, hc.z + Math.cos(angle) * R), look: look.clone() })
  const swing = (ta: number): Shot => {
    const k = ease(clamp01(ta / T_ARRIVE))
    const a = endAngle + (idleAngle - endAngle) * k,
      r = endR + (R - endR) * k
    return { pos: new THREE.Vector3(hc.x + Math.sin(a) * r, from.pos.y + (ALT - from.pos.y) * k, hc.z + Math.cos(a) * r), look: from.look.clone().lerp(look, k) }
  }
  const clouds = buildClouds(wide(0).pos, chase(0).pos)
  scene.add(clouds.group)
  all(clouds.disposables)

  let phase: Phase = 'intro'
  let t0 = performance.now()
  const born = performance.now()
  let last = performance.now()
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
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
    last = now
    shared.time.value = (now - born) / 1000
    uniforms.uTime.value = t
    waterNormal.offset.set(shared.time.value * 0.006, shared.time.value * 0.0035)
    let shot: Shot
    let ta = -1 // seconds since the drive reached the hall
    let cloudy = 0
    head.visible = false
    if (still) {
      ta = 99
      uniforms.uProgress.value = 1
      shot = orbit(idleAngle)
    } else {
      traffic.step(dt)
      if (t < T_INTRO) {
        setPhase('intro')
        uniforms.uProgress.value = 0
        // hold the wide shot, easing in, then dive down through the clouds to the station
        const k = t / T_INTRO
        const w = wide(ease(clamp01(k / 0.6)))
        const c = chase(0)
        const m = ease(clamp01((k - 0.3) / 0.7))
        shot = { pos: w.pos.lerp(c.pos, m), look: w.look.lerp(c.look, m) }
        cloudy = 1
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
        cloudy = 1 - clamp01((t - T_INTRO) / 1.2)
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
        // the head flares as it reaches the gate
        if (ta < 0.7) {
          head.visible = true
          head.position.set(0, 8, 0)
          head.scale.setScalar(90 + ta * 420)
          headMat.opacity = 1 - ta / 0.7
        }
      }
    }
    // the brass pin falls in and settles over the hall with a little squash; its shadow firms up on the roof;
    // the beacon rises, rings spread, and the wedding lights glow up
    const fall = clamp01((ta - 0.25) / 0.7)
    pin.visible = ta >= 0.25
    const bob = ta > 2 && !still ? Math.sin((ta - 2) * 1.6) * 2.5 : 0
    pin.position.y = HOVER + (1 - fall * fall) * 340 + bob
    const squash = ta > 0.95 ? Math.sin(clamp01((ta - 0.95) / 0.45) * Math.PI) : 0
    pin.scale.set(PIN * (1 + 0.1 * squash), PIN * (1 - 0.15 * squash), PIN * (1 + 0.1 * squash))
    shadowMat.opacity = 0.34 * fall * fall
    tetherMat.opacity = 0.5 * ease(clamp01((ta - 0.95) / 0.8))
    venueBeacon.scale.y = Math.max(0.001, ease(clamp01((ta - 0.95) / 1.4)))
    venueBeacon.position.y = pin.position.y + PIN * 0.98 // a beam rising from the pin's head
    ripples.forEach((r, i) => {
      const rt = (((ta - 0.95 - i * 0.7) % 2.8) + 2.8) % 2.8
      r.scale.setScalar(26 + rt * 70)
      ;(r.material as THREE.MeshBasicMaterial).opacity = ta > 0.95 ? Math.max(0, 0.6 * (1 - rt / 2.8)) : 0
    })
    hall.setGlow(0.6 + 0.4 * ease(clamp01((ta - 0.9) / 1.6)))

    camPos.copy(shot.pos)
    camera.position.copy(shot.pos)
    camera.lookAt(shot.look)
    clouds.update(camPos, cloudy)
    // keep what the camera looks at crisp; let the distance go hazy
    const dist = shot.pos.distanceTo(shot.look)
    fog.near = dist * 1.05
    fog.far = dist * 4.6
    for (const g of glows) {
      g.uniforms.uFogNear.value = fog.near
      g.uniforms.uFogFar.value = fog.far
    }
    pin.rotation.y = Math.atan2(camPos.x - hc.x, camPos.z - hc.z) // the pin's face turns to the camera
    renderer.render(scene, camera)
  }

  const loop = (now: number) => {
    frame(now)
    if (active && !still) raf = requestAnimationFrame(loop)
  }

  // compile every shader now, with everything that appears later shown, so nothing stalls mid-film
  pin.visible = head.visible = clouds.group.visible = true
  camera.position.set(hc.x + 400, 400, hc.z + 400)
  camera.lookAt(hc)
  await renderer.compileAsync(scene, camera)

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
    const scale = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
    hall.bulbs.uniforms.uScale.value = scale
    for (const g of glows) g.uniforms.uScale.value = scale
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
      last = performance.now()
      if (on && !still) raf = requestAnimationFrame(loop)
    },
    resize,
    project(id) {
      if (id === 'station') projectV.set(sx, 105, sz)
      else if (id === 'venue') projectV.set(hc.x, PIN * 1.12 + pin.position.y, hc.z)
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
