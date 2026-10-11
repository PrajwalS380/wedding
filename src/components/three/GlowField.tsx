import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import { useDisposable } from './geometry'

export interface GlowInstance {
  position: [number, number, number]
  /** world-space width (height derived from `aspect`) */
  size: number
  /** sRGB colour, also used as intensity (darker = dimmer) */
  color: string
}

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uFlicker;
  attribute float aSeed;
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    vUv = uv;
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float sx = length(instanceMatrix[0].xyz);
    float sy = length(instanceMatrix[1].xyz);
    float f = 1.0 + uFlicker * (sin(uTime * 9.0 + aSeed * 17.0) * 0.07 + sin(uTime * 23.0 + aSeed * 5.0) * 0.045);
    mv.xy += position.xy * vec2(sx * (2.0 - f), sy * f);
    gl_Position = projectionMatrix * mv;
  }
`

const flameFragment = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    float y = vUv.y;
    float w = 1.25 * (1.0 - y) * sqrt(max(y, 0.0));
    float d = abs(vUv.x - 0.5) / max(w, 1e-3);
    float a = (1.0 - smoothstep(0.45, 1.0, d)) * smoothstep(0.0, 0.1, y) * (1.0 - smoothstep(0.8, 1.0, y));
    vec3 core = vec3(1.0, 0.97, 0.86);
    vec3 col = mix(vColor, core, clamp((1.0 - d) * (1.0 - y * 0.9), 0.0, 1.0));
    gl_FragColor = vec4(col * a, a);
  }
`

const glowFragment = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float a = pow(max(1.0 - r, 0.0), 2.4);
    gl_FragColor = vec4(vColor * a, a);
  }
`

/**
 * Camera-facing instanced quads for flames and soft light halos.
 * Flicker runs entirely in the vertex shader → one draw call, no CPU per flame.
 */
export function GlowField({ items, kind, flicker = 1 }: { items: GlowInstance[]; kind: 'flame' | 'glow'; flicker?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useDisposable(() => {
    const g = new THREE.PlaneGeometry(1, 1)
    if (kind === 'flame') g.translate(0, 0.5, 0)
    const seeds = new Float32Array(items.length).map((_, i) => (i * 0.6180339) % 1)
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))
    return g
  }, [kind, items.length])
  const material = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uFlicker: { value: flicker } },
        vertexShader: vertex,
        fragmentShader: kind === 'flame' ? flameFragment : glowFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [kind, flicker],
  )

  useLayoutEffect(() => {
    const mesh = ref.current!
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    items.forEach((it, i) => {
      o.position.set(...it.position)
      o.scale.set(it.size, kind === 'flame' ? it.size * 2.3 : it.size, 1)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, c.set(it.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items, kind])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })

  return <instancedMesh ref={ref} args={[geometry, material, items.length]} frustumCulled={false} renderOrder={10} />
}
