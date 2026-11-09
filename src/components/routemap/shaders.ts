/**
 * Shared shading for the route map: every surface knows its world position, so the city can fade out at the
 * edge of the traced area and drifting cloud shadows can dim the low sun across ground, streets, houses and
 * trees alike. Materials stay three.js's own (Lambert / Standard), patched where the colour is decided.
 */
import * as THREE from 'three'

/** Uniforms every patched material shares (one object, updated once a frame). */
export interface Shared {
  time: { value: number }
  bounds: { value: THREE.Vector4 }
  clouds: { value: THREE.Texture }
  /** direction towards the sun, world space */
  sun: { value: THREE.Vector3 }
}

/** metres over which the city fades out at the edge of the traced area (tools/routemap/build.py uses the same) */
export const EDGE = 240

export const GLSL_NOISE = /* glsl */ `
float rmHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float rmNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(rmHash(i), rmHash(i + vec2(1., 0.)), u.x), mix(rmHash(i + vec2(0., 1.)), rmHash(i + vec2(1., 1.)), u.x), u.y);
}
/** a thin line of width w (metres) at distance d, antialiased for a pixel footprint of px metres */
float rmLine(float d, float w, float px) { return (1. - smoothstep(w * .5, w * .5 + px, d)) * min(1., w / px + .15); }
`

const FRAG_HEAD = /* glsl */ `
varying vec3 vWorld;
uniform float uTime;
uniform vec4 uBounds;
uniform sampler2D uClouds;
uniform vec3 uSun;
${GLSL_NOISE}
float cloudLight(vec2 xz) {
  float c = texture2D(uClouds, xz / 1900. + uTime * vec2(.0042, .0018)).r;
  return mix(1., .62, smoothstep(.52, .76, c)); // clouds passing over the moon
}
float edgeFade(vec2 xz) {
  float e = min(min(xz.x - uBounds.x, uBounds.z - xz.x), min(xz.y - uBounds.y, uBounds.w - xz.y));
  return pow(clamp(e / ${EDGE}., 0., 1.), 1.5);
}
`

const WORLD = /* glsl */ `
vec4 wpos = vec4(transformed, 1.);
#ifdef USE_INSTANCING
  wpos = instanceMatrix * wpos;
#endif
wpos = modelMatrix * wpos;
vWorld = wpos.xyz;
`

export interface PatchOptions {
  /** unique per variant: three caches programs by it */
  key: string
  /** fade out at the edge of the traced area (makes the material transparent) */
  edge?: boolean
  /** with `edge`: a colour (GLSL vec3) to fade towards as well, for dark surfaces that would smudge the page */
  edgeTint?: string
  /** cloud shadows dim the direct sunlight */
  clouds?: boolean
  uniforms?: Record<string, THREE.IUniform>
  /** vertex declarations, and code after `begin_vertex` (has `transformed`, `objectNormal`, `wpos`) */
  vertexHead?: string
  vertexBody?: string
  /** fragment declarations, and code after `color_fragment` that sets `diffuseColor` (has `vWorld`) */
  fragmentHead?: string
  color?: string
}

export function patch<M extends THREE.MeshLambertMaterial | THREE.MeshStandardMaterial>(m: M, shared: Shared, o: PatchOptions): M {
  if (o.edge) m.transparent = true
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, { uTime: shared.time, uBounds: shared.bounds, uClouds: shared.clouds, uSun: shared.sun }, o.uniforms)
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWorld;\nuniform float uTime;\n${o.vertexHead ?? ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${WORLD}\n${o.vertexBody ?? ''}`)
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_HEAD}\n${o.fragmentHead ?? ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${o.color ?? ''}`)
    if (o.clouds)
      s.fragmentShader = s.fragmentShader.replace(
        '#include <aomap_fragment>',
        '#include <aomap_fragment>\n{ float cl = cloudLight(vWorld.xz); reflectedLight.directDiffuse *= cl; reflectedLight.directSpecular *= cl; }',
      )
    if (o.edge)
      s.fragmentShader = s.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        float ef = edgeFade(vWorld.xz);
        ${o.edgeTint ? `gl_FragColor.rgb = mix(${o.edgeTint}, gl_FragColor.rgb, ef);` : ''}
        gl_FragColor.a *= ef;`,
      )
  }
  m.customProgramCacheKey = () => `routemap-${o.key}`
  return m
}
