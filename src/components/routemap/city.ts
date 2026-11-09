/**
 * The houses of Davangere's streets (illustrative — placed along the real streets by tools/routemap/build.py):
 * flat concrete roofs behind a parapet, rows of windows under sunshade slabs, some panes catching the low sun,
 * shops with rolling shutters and sign boards along the main roads, stair rooms on the roofs with the black
 * water tank perched on top, the odd solar water heater — weathered, with grime at the plinth.
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { local, rng } from './geo'
import { patch, type Shared } from './shaders'

export const F_TANK = 1,
  F_SHOP = 2,
  F_MUMTY = 4
/** marks a stair room (or any plain block) for the house shader: no windows or parapet */
export const PLAIN = 64

const VERT_HEAD = /* glsl */ `
attribute float aFlags;
varying vec3 vLocal; varying vec3 vSize; varying vec3 vObjN; varying vec3 vWorldN; varying float vFlags; varying float vSeed;
`
const VERT = /* glsl */ `
#ifdef USE_INSTANCING
  vSize = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
  vWorldN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
#else
  vSize = vec3(1.); vSeed = .5; vWorldN = normalize(mat3(modelMatrix) * objectNormal);
#endif
vLocal = position * vSize;
vObjN = objectNormal;
vFlags = aFlags;
`
const FRAG_HEAD = /* glsl */ `
varying vec3 vLocal; varying vec3 vSize; varying vec3 vObjN; varying vec3 vWorldN; varying float vFlags; varying float vSeed;
`
/* vLocal: metres inside the building — x towards the street (the front), z along it, y up from the ground */
const COLOR = /* glsl */ `
vec3 wall = diffuseColor.rgb;
float fl = vFlags;
float plain = step(63.5, fl); fl -= 64. * plain;
float roofType = floor(fl / 8. + .01);
float shop = mod(floor(fl / 2. + .01), 2.);
float px = max(length(fwidth(vLocal)), 1e-4);
float detail = 1. - smoothstep(.3, .95, px);
vec3 col;
if (vObjN.y > .5) {
  // the roof: grey concrete, whitewash, red oxide or old dark concrete, stained; the parapet's top and its shade
  vec3 roofC = roofType < .5 ? vec3(.6, .58, .55) : roofType < 1.5 ? vec3(.86, .85, .81) : roofType < 2.5 ? vec3(.56, .31, .25) : vec3(.42, .4, .37);
  roofC *= .84 + .24 * rmNoise(vLocal.xz * .45 + vSeed * 17.);
  vec2 hs = vSize.xz * .5;
  float e = min(hs.x - abs(vLocal.x), hs.y - abs(vLocal.z));
  float parapet = (1. - smoothstep(.25, .25 + px, e)) * (1. - plain);
  float inner = (1. - smoothstep(.3, 1.4, e)) * .34 * (1. - plain);
  col = mix(roofC * (1. - inner * detail), wall * 1.05, parapet);
} else if (vObjN.y < -.5) {
  col = wall * .5;
} else {
  bool sideX = abs(vObjN.x) > .5;
  float along = sideX ? vLocal.z * sign(vObjN.x) : -vLocal.x * sign(vObjN.z);
  float faceW = sideX ? vSize.z : vSize.x;
  float front = step(.5, vObjN.x);
  float y = vLocal.y;
  float top = vSize.y - (1. - plain);              // the parapet's foot
  float fH = 3.15;
  float flr = floor(y / fH), fy = y - flr * fH;
  float nW = max(1., floor(faceW / 3.2));
  float cell = faceW / nW;
  float ci = floor((along + faceW * .5) / cell);
  float cx = (fract((along + faceW * .5) / cell) - .5) * cell;
  float r = rmHash(vec2(ci, flr) + vSeed * 37.);
  float hw = .5 + .26 * fract(vSeed * 7.31);
  float win = (1. - smoothstep(hw, hw + px, abs(cx))) * smoothstep(.95, .95 + px, fy) * (1. - smoothstep(2.2, 2.2 + px, fy));
  win *= step(y, top - .3) * (1. - plain) * mix(step(.38, r), 1., front);   // fewer on the sides and back
  // panes at night: most lit — warm bulbs or the white of tube lights — the rest dark glass
  float lit = step(fract(r * 7.13), .58);
  vec3 lamp = fract(r * 3.7) < .42 ? vec3(.82, .9, 1.) : mix(vec3(1., .7, .38), vec3(1., .84, .58), fract(r * 11.3));
  vec3 glass = mix(vec3(.04, .05, .07), lamp * .5, lit);
  // the sunshade slab over each row of windows, and the roof slab's edge
  float chajja = smoothstep(2.3, 2.3 + px, fy) * (1. - smoothstep(2.62, 2.62 + px, fy)) * step(y, top) * (1. - plain);
  float band = smoothstep(top - .18, top - .18 + px, y) * (1. - smoothstep(top + .02, top + .02 + px, y)) * (1. - plain);
  col = wall * (1. - .3 * chajja) * (1. - .32 * band);
  col = mix(col, glass, win);
  totalEmissiveRadiance += lamp * lit * win * detail * (1.3 + .4 * fract(r * 5.1));
  // a stair room: its door, on the side facing the street
  float door = plain * front * (1. - smoothstep(.5, .5 + px, abs(along))) * (1. - smoothstep(2.1, 2.1 + px, y));
  col = mix(col, vec3(.3, .21, .14), door);
  // a ground-floor shop: bays of rolling shutters, some up with the shop lit inside, under a painted board
  if (shop > .5 && front > .5 && plain < .5 && y < 3.3) {
    float bayW = 3.6;
    float bx = fract((along + faceW * .5) / bayW) * bayW;
    float br = rmHash(vec2(floor((along + faceW * .5) / bayW), 7.) + vSeed * 13.);
    vec3 shutter = vec3(.55, .56, .57) * (.92 + .08 * step(.5, fract(y * 2.5)));
    vec3 inside = mix(vec3(1., .74, .42), vec3(.9, .95, 1.), step(.7, fract(br * 7.)));
    vec3 shopC = br > .45 ? inside * .5 : shutter;
    float open = step(.45, br) * step(y, 2.55);
    shopC = mix(shopC, wall * .72, 1. - smoothstep(.16, .16 + px, min(bx, bayW - bx)));
    float si = floor(fract(vSeed * 3.7) * 4.);
    vec3 board = si < .5 ? vec3(.72, .16, .14) : si < 1.5 ? vec3(.12, .3, .58) : si < 2.5 ? vec3(.94, .74, .12) : vec3(.1, .46, .26);
    board *= .88 + .2 * rmNoise(vec2(along * 1.7, y * 3.));
    col = y > 2.55 ? board : shopC;
    // open shops spill light; the boards are lit from within
    float bayIn = smoothstep(.16, .16 + px, min(bx, bayW - bx));
    totalEmissiveRadiance += inside * open * bayIn * 1.15 + board * step(2.55, y) * .55;
  }
  // weathering: damp streaks from the roof down, dust and grime at the plinth
  float streak = rmNoise(vec2(along * .9 + vSeed * 9., y * .1)) * smoothstep(top - 4.5, top, y);
  col *= 1. - .13 * streak;
  float plinth = mix(.68, 1., smoothstep(0., 2.2, y));
  col *= plinth;
  // far away the pattern averages out
  vec3 avg = wall * mix(.86, .74, shop * front) * plinth;
  col = mix(avg, col, detail);
  // far away, the lit windows add up to a faint warm glow on every wall
  totalEmissiveRadiance += vec3(1., .76, .46) * (1. - detail) * (1. - plain) * step(y, top) * .11;
}
diffuseColor.rgb = col;
`

/** The shared material of every building block — houses, stair rooms, the hall, the station. */
export function houseMaterial(shared: Shared) {
  return patch(new THREE.MeshLambertMaterial({ color: 0xffffff }), shared, { key: 'house', clouds: true, vertexHead: VERT_HEAD, vertexBody: VERT, fragmentHead: FRAG_HEAD, color: COLOR })
}

export function blockGeometry() {
  const box = new THREE.BoxGeometry(1, 1, 1)
  box.translate(0, 0.5, 0)
  return box
}

/** One building block as an instanced mesh of one (so it shares the house shader). */
export function block(geo: THREE.BufferGeometry, mat: THREE.Material, size: [number, number, number], color: THREE.ColorRepresentation, flags: number, at: THREE.Vector3, turn = 0) {
  const g = geo.clone()
  g.setAttribute('aFlags', new THREE.InstancedBufferAttribute(new Float32Array([flags]), 1))
  const m = new THREE.InstancedMesh(g, mat, 1)
  m.setMatrixAt(0, new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn), new THREE.Vector3(...size)))
  m.setColorAt(0, new THREE.Color(color))
  return m
}

export interface City {
  group: THREE.Group
  /** byte offset where the trees begin in city.bin */
  treesAt: number
  disposables: { dispose: () => void }[]
}

export function buildCity(view: DataView, palette: [number, number, number][], shared: Shared): City {
  const nB = view.getUint32(0, true)
  const box = blockGeometry()
  const mat = houseMaterial(shared)
  const group = new THREE.Group()
  const rand = rng(97)

  // read the records first to size the extra meshes
  type B = { x: number; z: number; w: number; d: number; h: number; ang: number; col: number; flags: number }
  const bs: B[] = []
  for (let i = 0, o = 8; i < nB; i++, o += 10)
    bs.push({
      x: view.getInt16(o, true) / 10,
      z: view.getInt16(o + 2, true) / 10,
      w: view.getUint8(o + 4) / 10,
      d: view.getUint8(o + 5) / 10,
      h: view.getUint8(o + 6) / 5,
      ang: (view.getUint8(o + 7) / 255) * Math.PI,
      col: view.getUint8(o + 8),
      flags: view.getUint8(o + 9),
    })

  const houses = new THREE.InstancedMesh(box, mat, nB)
  const flagsAttr = new Float32Array(nB)
  const nM = bs.filter((b) => b.flags & F_MUMTY).length
  const stairs = new THREE.InstancedMesh(box.clone(), mat, Math.max(1, nM))
  const stairFlags = new Float32Array(Math.max(1, nM))
  const tankGeo = (() => {
    const body = new THREE.CylinderGeometry(0.78, 0.82, 1.5, 9)
    body.translate(0, 0.75, 0)
    const lid = new THREE.CylinderGeometry(0.34, 0.34, 0.16, 9)
    lid.translate(0, 1.58, 0)
    return mergeGeometries([body, lid])
  })()
  const tankMat = patch(new THREE.MeshLambertMaterial({ color: 0xffffff }), shared, { key: 'tank', clouds: true })
  const tanks = new THREE.InstancedMesh(tankGeo, tankMat, nB)
  const solarGeo = new THREE.BoxGeometry(2.1, 0.12, 1.2)
  solarGeo.rotateX(-0.55)
  solarGeo.translate(0, 0.9, 0)
  const solarMat = patch(new THREE.MeshLambertMaterial({ color: 0x23324a }), shared, { key: 'solar', clouds: true })
  const solar = new THREE.InstancedMesh(solarGeo, solarMat, nB)

  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    s = new THREE.Vector3(),
    v = new THREE.Vector3(),
    col = new THREE.Color()
  const up = new THREE.Vector3(0, 1, 0)
  const TANK_COLS = [0x262628, 0x262628, 0x262628, 0x2b2b2e, 0x262628, 0xe9e6de, 0x2d5f9c]
  let iM = 0,
    iT = 0,
    iS = 0
  bs.forEach((b, i) => {
    q.setFromAxisAngle(up, -b.ang)
    m4.compose(v.set(b.x, 0, b.z), q, s.set(b.d, b.h, b.w))
    houses.setMatrixAt(i, m4)
    const c = palette[b.col] ?? [230, 225, 215]
    houses.setColorAt(i, col.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace))
    flagsAttr[i] = b.flags
    const side = rand() < 0.5 ? -1 : 1
    let tankAt: [number, number, number]
    if (b.flags & F_MUMTY) {
      // the stair room at a back corner of the roof
      const [mx, mz] = local(b.x, b.z, b.ang, -b.d / 2 + 1.8, side * (b.w / 2 - 2))
      m4.compose(v.set(mx, b.h, mz), q, s.set(2.8, 2.7, 3.4))
      stairs.setMatrixAt(iM, m4)
      stairs.setColorAt(iM, col.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace).multiplyScalar(0.96))
      stairFlags[iM++] = PLAIN + (b.flags & 24) // keeps the roof's finish
      tankAt = [mx, b.h + 2.7, mz]
    } else {
      const [tx, tz] = local(b.x, b.z, b.ang, -b.d / 2 + 1.6, side * (b.w / 2 - 1.6))
      tankAt = [tx, b.h, tz]
    }
    if (b.flags & F_TANK) {
      m4.compose(v.set(...tankAt), q.setFromAxisAngle(up, rand() * 6), s.set(1, 1, 1))
      tanks.setMatrixAt(iT, m4)
      tanks.setColorAt(iT++, col.setHex(TANK_COLS[Math.floor(rand() * TANK_COLS.length)], THREE.SRGBColorSpace))
    }
    if (rand() < 0.12) {
      // a solar water heater facing south, by the front parapet
      const [sx, sz] = local(b.x, b.z, b.ang, b.d / 2 - 2, -side * (b.w / 2 - 2))
      m4.compose(v.set(sx, b.h, sz), q.setFromAxisAngle(up, 0), s.set(1, 1, 1))
      solar.setMatrixAt(iS++, m4)
    }
  })
  houses.geometry.setAttribute('aFlags', new THREE.InstancedBufferAttribute(flagsAttr, 1))
  stairs.geometry.setAttribute('aFlags', new THREE.InstancedBufferAttribute(stairFlags, 1))
  stairs.count = iM
  tanks.count = iT
  solar.count = iS
  group.add(houses, stairs, tanks, solar)
  return { group, treesAt: 8 + nB * 10, disposables: [box, stairs.geometry, mat, tankGeo, tankMat, solarGeo, solarMat] }
}
