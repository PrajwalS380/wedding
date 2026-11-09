/**
 * Streets traced from OpenStreetMap, surfaced as they are in Davangere: worn asphalt on the main roads with
 * dashed centre lines (edge lines and a planted median on the widest), patchy pale tar and concrete on the
 * lanes, dust drifting onto the edges; the double-line railway on its ballast with sleepers and rails; the
 * canals' still green water. Markings fade where streets meet; everything fades at the traced area's edge.
 */
import * as THREE from 'three'
import { Path, ribbonGeometry, type XZ } from './geo'
import { glowPoints } from './lights'
import { patch, type Shared } from './shaders'

const VERT_HEAD = /* glsl */ `attribute float aLen; varying vec2 vRoad; varying float vLen;`
const VERT = /* glsl */ `vRoad = uv; vLen = aLen;`
const FRAG_HEAD = /* glsl */ `varying vec2 vRoad; varying float vLen; uniform float uHalf; uniform float uClass; uniform float uPeriod; uniform vec3 uLamp; uniform float uPool;`

const ROAD = /* glsl */ `
float across = vRoad.y * uHalf;                       // metres from the centre line
float px = max(fwidth(vRoad.x), 1e-3);                // metres per pixel
float detail = 1. - smoothstep(.12, .7, px);
vec3 c = uClass > 1.5 ? vec3(.31, .3, .29) : vec3(.54, .51, .47);
float n1 = rmNoise(vWorld.xz * .07), n2 = rmNoise(vWorld.xz * .55 + 3.1);
c *= .86 + .22 * n1 + .1 * (n2 - .5) * detail;
// patches of newer tar on the lanes, a polished darker strip where the wheels run on the main roads
c = mix(c, vec3(.36, .35, .34), step(.68, rmNoise(vWorld.xz * .11 + 7.)) * step(uClass, 1.5) * .7);
float lane = abs(abs(across) - uHalf * .5);
c *= 1. - .07 * (1. - smoothstep(.4, 1.6, lane)) * step(1.5, uClass) * detail;
// dust blown onto the edges
c = mix(c, vec3(.7, .64, .55), smoothstep(.7, 1., abs(vRoad.y)) * (.55 + .3 * n2));
// markings, faded where streets meet
float ends = smoothstep(9., 18., vRoad.x) * smoothstep(9., 18., vLen - vRoad.x);
float dash = step(fract(vRoad.x / 9.), .42);
float centre = rmLine(abs(across), .15, px) * dash * step(1.5, uClass) * step(uClass, 3.5);
float edges = rmLine(abs(abs(across) - (uHalf - .7)), .15, px) * step(2.5, uClass);
float paint = (centre + edges) * ends * (.55 + .4 * detail) * (.8 + .2 * n2);
c = mix(c, vec3(.88, .86, .8), clamp(paint, 0., 1.));
// the widest roads: a kerbed median planted with shrubs
float median = (1. - smoothstep(.9, .9 + px, abs(across))) * step(3.5, uClass);
vec3 med = mix(vec3(.8, .78, .72), vec3(.32, .44, .2) * (.8 + .4 * n2), 1. - smoothstep(.5, .5 + px, abs(across)));
c = mix(c, med, median);
diffuseColor.rgb = c;
// pools of lamplight, one under each street lamp (alternate sides, as placed by buildStreets)
float lk = floor(vRoad.x / uPeriod);
float lAlong = vRoad.x - (lk + .5) * uPeriod;
float lSide = mod(lk, 2.) < .5 ? 1. : -1.;
float lOff = across - lSide * (uHalf - .6);
float pool = exp(-(lAlong * lAlong + lOff * lOff * 1.5) / (2. * uPool * uPool));
totalEmissiveRadiance += uLamp * pool * (.82 + .3 * n1);
`

const RAIL = /* glsl */ `
float across = vRoad.y * uHalf;
float px = max(fwidth(vRoad.x), 1e-3);
float detail = 1. - smoothstep(.08, .5, px);
vec3 c = vec3(.47, .44, .41) * (.82 + .3 * rmNoise(vWorld.xz * 1.7)) * (.9 + .15 * rmNoise(vWorld.xz * .08));
for (int k = 0; k < 2; k++) {
  float d = abs(across - (k == 0 ? -uClass : uClass));     // uClass carries the track offset here
  float onTrack = 1. - smoothstep(1.35, 1.35 + px, d);
  float sleeper = step(fract(vRoad.x / .66), .36);
  c = mix(c, vec3(.36, .31, .27), onTrack * mix(.5, sleeper, detail));
  c = mix(c, vec3(.78, .78, .8), rmLine(abs(d - .84), .08, px) * .9);
  c *= 1. - .25 * onTrack * (1. - detail);
}
diffuseColor.rgb = c;
`

const WATER = /* glsl */ `
float n = rmNoise(vWorld.xz * .15 + uTime * .05);
diffuseColor.rgb = mix(vec3(.24, .36, .32), vec3(.34, .46, .4), n) * mix(.8, 1., smoothstep(.6, 1., abs(vRoad.y)));
`

export const ROADS: Record<1 | 2 | 3 | 4, { half: number }> = { 1: { half: 3.25 }, 2: { half: 5.5 }, 3: { half: 7 }, 4: { half: 9.5 } }

/** Street lamps by road class: spacing (m), the light they pool on the road, the lamp's own colour, height. */
const LAMPS: Record<1 | 2 | 3 | 4, { period: number; pool: [number, number, number]; radius: number; lamp: [number, number, number]; y: number }> = {
  1: { period: 58, pool: [0.3, 0.24, 0.16], radius: 6.5, lamp: [1, 0.86, 0.66], y: 5.5 }, // lanes: a few warm-white lamps
  2: { period: 32, pool: [0.62, 0.36, 0.13], radius: 8, lamp: [1, 0.62, 0.26], y: 7 }, // sodium orange on the main roads
  3: { period: 30, pool: [0.66, 0.38, 0.14], radius: 8.5, lamp: [1, 0.62, 0.26], y: 8 },
  4: { period: 28, pool: [0.7, 0.4, 0.15], radius: 9, lamp: [1, 0.64, 0.28], y: 9 },
}

export function buildStreets(roads: { c: 1 | 2 | 3 | 4; p: XZ[] }[], rail: XZ[], canals: XZ[][], track: number, shared: Shared, bounds: [number, number, number, number]) {
  const group = new THREE.Group()
  const disposables: { dispose: () => void }[] = []
  const surface = (key: string, color: string, half: number, cls: number, offset: number) => {
    const m = patch(new THREE.MeshLambertMaterial({ polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset }), shared, {
      key,
      clouds: true,
      edge: true,
      vertexHead: VERT_HEAD,
      vertexBody: VERT,
      fragmentHead: FRAG_HEAD,
      color,
      uniforms: { uHalf: { value: half }, uClass: { value: cls }, uPeriod: { value: LAMPS[cls as 1]?.period ?? 40 }, uLamp: { value: new THREE.Color(...(LAMPS[cls as 1]?.pool ?? [0, 0, 0])) }, uPool: { value: LAMPS[cls as 1]?.radius ?? 7 } },
    })
    disposables.push(m)
    return m
  }
  for (const c of [1, 2, 3, 4] as const) {
    const lines = roads.filter((r) => r.c === c).map((r) => r.p)
    if (!lines.length) continue
    const g = ribbonGeometry(lines, ROADS[c].half * 2, 0.3 + c * 0.05)
    const m = new THREE.Mesh(g, surface(`road${c}`, ROAD, ROADS[c].half, c, -2 - c * 2))
    m.renderOrder = 1
    disposables.push(g)
    group.add(m)
    if (c >= 3) {
      // footpaths with a kerb either side of the big roads
      const fg = ribbonGeometry(lines, ROADS[c].half * 2 + 4, 0.25 + c * 0.05)
      const f = new THREE.Mesh(fg, surface(`kerb${c}`, `diffuseColor.rgb = mix(vec3(.74, .7, .64), vec3(.56, .53, .5), step(abs(vRoad.y), .86)) * (.9 + .15 * rmNoise(vWorld.xz * .4));`, ROADS[c].half + 2, c, -1 - c))
      f.renderOrder = 1
      disposables.push(fg)
      group.add(f)
    }
  }
  if (rail.length > 1) {
    const half = track + 2.8
    const g = ribbonGeometry([rail], half * 2, 0.45)
    const m = new THREE.Mesh(g, surface('rail', RAIL, half, track, -10))
    m.renderOrder = 1
    disposables.push(g)
    group.add(m)
  }
  if (canals.length) {
    const g = ribbonGeometry(canals, 5, 0.25)
    const m = new THREE.Mesh(g, surface('canal', WATER, 2.5, 0, -3))
    m.renderOrder = 1
    disposables.push(g)
    group.add(m)
  }
  // the lamps themselves, where the pools are: alternate sides, one per period along every street
  const pos: number[] = [],
    col: number[] = []
  const at = [0, 0, 0, 0]
  const [bx0, bz0, bx1, bz1] = bounds
  for (const r of roads) {
    const L = LAMPS[r.c]
    const path = new Path(r.p)
    for (let k = 0; (k + 0.5) * L.period < path.length; k++) {
      path.sample((k + 0.5) * L.period, at)
      const side = k % 2 ? -1 : 1
      const off = side * (ROADS[r.c].half - 0.6)
      const x = at[0] - at[3] * off,
        z = at[1] + at[2] * off
      const edge = Math.min(1, Math.max(0, Math.min(x - bx0, bx1 - x, z - bz0, bz1 - z) / 240))
      if (edge < 0.1) continue
      pos.push(x, L.y, z)
      col.push(...L.lamp.map((v) => v * edge))
    }
  }
  const lamps = glowPoints(new Float32Array(pos), new Float32Array(col), { size: 1.6, min: 1.3, max: 16, intensity: 1.1 })
  disposables.push(lamps)
  group.add(lamps.points)
  return { group, disposables, lamps }
}
