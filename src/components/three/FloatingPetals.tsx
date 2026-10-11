import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { petalGeometry, useDisposable } from './geometry'
import { MANDAP } from './layout'
import { QUALITY, type SceneQuality } from './quality'

function seeded(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

const PETAL_COLORS = [
  ['#9e1f33', 0.42],
  ['#b8293f', 0.2],
  ['#e8902a', 0.22],
  ['#f7efdf', 0.16],
] as const

function pickColor(r: number, c: THREE.Color) {
  let acc = 0
  for (const [hex, w] of PETAL_COLORS) {
    acc += w
    if (r <= acc) return c.set(hex)
  }
  return c.set(PETAL_COLORS[0][0])
}

function usePetalMaterial() {
  return useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, side: THREE.DoubleSide, emissive: '#200508', emissiveIntensity: 0.4 }),
  )
}

/** Petals resting on the ceremonial floor, the platform and the aisle. */
export function FloorPetals({ quality }: { quality: SceneQuality }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useDisposable(() => petalGeometry())
  const mat = usePetalMaterial()
  const count = QUALITY[quality].floorPetals
  useLayoutEffect(() => {
    const rand = seeded(42)
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const zone = rand()
      let x: number, y: number, z: number
      if (zone < 0.45) {
        // platform, denser toward the centre
        const r = Math.pow(rand(), 0.7) * 2.9
        const a = rand() * Math.PI * 2
        x = Math.cos(a) * r * 1.15
        z = Math.sin(a) * r * 0.75 + 0.3
        y = MANDAP.platformTop + 0.006
      } else if (zone < 0.8) {
        // aisle runner
        x = (rand() - 0.5) * 2.4
        z = 3.4 + rand() * 7.5
        y = 0.012
      } else {
        // scattered on the polished floor
        x = (rand() - 0.5) * 11
        z = 2.9 + rand() * 6
        y = 0.003
      }
      o.position.set(x, y, z)
      o.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.5, (rand() - 0.5) * 0.4, rand() * Math.PI * 2)
      o.scale.setScalar(0.055 + rand() * 0.03)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
      ref.current!.setColorAt(i, pickColor(rand(), c))
    }
    ref.current!.instanceMatrix.needsUpdate = true
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true
  }, [count])
  return <instancedMesh ref={ref} args={[geo, mat, count]} />
}

/** Occasional petals drifting down through the mandap. */
export function FallingPetals({ quality, animate }: { quality: SceneQuality; animate: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useDisposable(() => petalGeometry())
  const mat = usePetalMaterial()
  const count = QUALITY[quality].fallingPetals
  const state = useMemo(() => {
    const rand = seeded(7)
    return Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * 12,
      y: rand() * 8.5,
      z: -1.5 + rand() * 9,
      vy: 0.22 + rand() * 0.25,
      phase: rand() * Math.PI * 2,
      spin: new THREE.Vector3(rand() * 1.4, rand() * 1.8, rand() * 1.2),
      rot: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6),
      scale: 0.06 + rand() * 0.035,
      color: rand(),
    }))
  }, [count])
  const o = useMemo(() => new THREE.Object3D(), [])

  useLayoutEffect(() => {
    const c = new THREE.Color()
    state.forEach((p, i) => {
      o.position.set(p.x, p.y, p.z)
      o.rotation.copy(p.rot)
      o.scale.setScalar(p.scale)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
      ref.current!.setColorAt(i, pickColor(p.color, c))
    })
    ref.current!.instanceMatrix.needsUpdate = true
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true
  }, [state, o])

  useFrame(({ clock }, delta) => {
    if (!animate) return
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    state.forEach((p, i) => {
      p.y -= p.vy * dt
      p.x += Math.sin(t * 0.6 + p.phase) * 0.18 * dt
      p.z += Math.cos(t * 0.45 + p.phase) * 0.1 * dt
      p.rot.x += p.spin.x * dt
      p.rot.y += p.spin.y * dt
      p.rot.z += p.spin.z * dt
      if (p.y < 0.05) {
        p.y = 8 + Math.random() * 1.5
        p.x = (Math.random() - 0.5) * 12
      }
      o.position.set(p.x, p.y, p.z)
      o.rotation.copy(p.rot)
      o.scale.setScalar(p.scale)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
    })
    ref.current!.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}

const dustVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.13 + aSeed * 20.0) * 0.35;
    p.y += sin(uTime * 0.09 + aSeed * 13.0) * 0.28;
    p.z += cos(uTime * 0.11 + aSeed * 7.0) * 0.3;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (14.0 + aSeed * 22.0) * uPixelRatio / -mv.z;
    vAlpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 0.8 + aSeed * 31.0));
  }
`
const dustFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = pow(max(1.0 - r, 0.0), 2.0) * vAlpha;
    gl_FragColor = vec4(vec3(1.0, 0.82, 0.52) * a * 0.9, a);
  }
`

/** Golden dust drifting in the light — animated entirely on the GPU. */
export function GoldenDust({ quality }: { quality: SceneQuality }) {
  const count = QUALITY[quality].dust
  const dpr = useThree((s) => s.viewport.dpr)
  const geo = useDisposable(() => {
    const rand = seeded(99)
    const pos = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 18
      pos[i * 3 + 1] = 0.3 + rand() * 8
      pos[i * 3 + 2] = -6 + rand() * 14
      seeds[i] = rand()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return g
  }, [count])
  const mat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
        vertexShader: dustVertex,
        fragmentShader: dustFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
  )
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uPixelRatio.value = dpr
  })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}
