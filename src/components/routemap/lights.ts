/**
 * Points of light for the night map — street lamps, headlights and tail-lights, platform lamps: each a soft glow
 * of a given size in metres that keeps a pixel or two when far away (dimming as it shrinks, so a distant
 * street of lamps reads as a faint string rather than a smear) and fades into the haze.
 */
import * as THREE from 'three'

const VERT = /* glsl */ `
attribute vec3 aColor;
uniform float uScale; uniform float uSize; uniform float uMin; uniform float uMax; uniform float uI;
uniform float uFogNear; uniform float uFogFar;
varying vec3 vColor; varying float vI;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  gl_Position = projectionMatrix * mv;
  float raw = uSize * uScale / -mv.z;
  float fog = smoothstep(uFogNear, uFogFar, -mv.z);
  vI = uI * min(1., raw / 1.4) * (1. - .85 * fog);
  vColor = aColor;
  gl_PointSize = clamp(raw * 3., uMin, uMax);
}`
const FRAG = /* glsl */ `
varying vec3 vColor; varying float vI;
void main() {
  float d = length(gl_PointCoord - .5) * 2.;
  float core = exp(-d * d * 16.), halo = exp(-d * d * 3.2) * .38;
  gl_FragColor = vec4(vColor * (core * 1.25 + halo) * vI, 1.);
}`

export interface Glow {
  points: THREE.Points
  uniforms: { uScale: { value: number }; uFogNear: { value: number }; uFogFar: { value: number } } & Record<string, THREE.IUniform>
  positions: Float32Array
  dispose: () => void
}

export function glowPoints(positions: Float32Array, colors: Float32Array, { size = 2, min = 1.2, max = 18, intensity = 1 } = {}): Glow {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  const uniforms = {
    uScale: { value: 800 },
    uSize: { value: size },
    uMin: { value: min },
    uMax: { value: max },
    uI: { value: intensity },
    uFogNear: { value: 2000 },
    uFogFar: { value: 8000 },
  }
  const m = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  const points = new THREE.Points(g, m)
  points.frustumCulled = false
  points.renderOrder = 6
  return { points, uniforms, positions, dispose: () => (g.dispose(), m.dispose()) }
}
