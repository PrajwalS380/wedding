import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import { useDisposable } from './geometry'
import { GlowField, type GlowInstance } from './GlowField'
import type { SceneQuality } from './quality'
import { useStage } from './stage'

const shaftVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vFacing = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`
const shaftFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    float vertical = smoothstep(0.0, 0.35, vUv.y) * (0.35 + 0.65 * vUv.y);
    float a = pow(vFacing, 2.2) * vertical * uStrength;
    gl_FragColor = vec4(uColor * a, a);
  }
`

/** Soft "volumetric" light cones — additive, cheap, no post-processing. */
function LightShafts() {
  const geo = useDisposable(() => new THREE.CylinderGeometry(0.35, 2.4, 9.5, 40, 1, true))
  const mat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color('#ffcf8a') }, uStrength: { value: 0.085 } },
        vertexShader: shaftVertex,
        fragmentShader: shaftFragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
  )
  return (
    <group>
      <mesh geometry={geo} material={mat} position={[0, 5.2, 0.4]} />
      <mesh geometry={geo} material={mat} position={[-1.7, 5.4, 0.6]} rotation-z={-0.09} scale={[0.7, 1, 0.7]} />
      <mesh geometry={geo} material={mat} position={[1.7, 5.4, 0.6]} rotation-z={0.09} scale={[0.7, 1, 0.7]} />
    </group>
  )
}

/** Warm distant lights along the colonnade and through the gateway. */
function DistantLights({ quality }: { quality: SceneQuality }) {
  const items = useMemo<GlowInstance[]>(() => {
    const out: GlowInstance[] = []
    const xs = quality === 'high' ? [6.4, 9.6] : [6.4]
    for (const x of xs) {
      for (const z of [-0.5, -5.5, -10.5, -15.5, -20.5]) {
        const fade = Math.max(0.25, 1 - Math.abs(z) / 26)
        const c = new THREE.Color('#c9772c').multiplyScalar(fade)
        out.push({ position: [-x + 0.85, 6.2, z], size: 1.5, color: `#${c.getHexString()}` })
        out.push({ position: [x - 0.85, 6.2, z], size: 1.5, color: `#${c.getHexString()}` })
      }
    }
    out.push({ position: [0, 4.6, -28.5], size: 17, color: '#8a4f1c' })
    out.push({ position: [0, 3.2, -27.6], size: 7, color: '#b8742c' })
    out.push({ position: [0, 6.6, -2.3], size: 9, color: '#4a2410' })
    return out
  }, [quality])
  return <GlowField items={items} kind="glow" flicker={0} />
}

/** Low-lying haze over the floor and down the hall — soft depth without post-processing. */
function GroundMist() {
  const items = useMemo<GlowInstance[]>(
    () =>
      [
        [-5.2, 0.55, 5.5, 7],
        [5, 0.5, 6.2, 7.5],
        [0, 0.35, 8.5, 8],
        [-7.5, 0.9, -2, 9],
        [7.5, 0.9, -3, 9],
        [0, 1.1, -8, 12],
        [-3.5, 0.7, -13, 11],
        [3.5, 0.7, -15, 11],
      ].map(([x, y, z, s]) => ({ position: [x, y, z] as [number, number, number], size: s, color: '#17322a' })),
    [],
  )
  return <GlowField items={items} kind="glow" flicker={0} />
}

export function AtmosphericLighting({ quality }: { quality: SceneQuality }) {
  const scene = useThree((s) => s.scene)
  const key = useRef<THREE.SpotLight>(null)

  const { fogDensity } = useStage()
  useEffect(() => {
    scene.background = new THREE.Color('#06150f')
    scene.fog = new THREE.FogExp2('#081b15', fogDensity)
    return () => {
      scene.fog = null
      scene.background = null
    }
  }, [scene, fogDensity])

  useEffect(() => {
    if (!key.current) return
    key.current.target.position.set(0, 1.4, 0.6)
    key.current.target.updateMatrixWorld()
  }, [])

  return (
    <group>
      <ambientLight intensity={0.22} color="#5b6a58" />
      <hemisphereLight args={['#ffd9a8', '#0b3026', 0.45]} />
      <spotLight
        ref={key}
        position={[0.5, 12, 7.5]}
        angle={0.5}
        penumbra={0.95}
        intensity={340}
        distance={40}
        decay={1.75}
        color="#ffd7a0"
      />
      {/* warm rim from behind the mandap */}
      <pointLight position={[0, 5.4, -4.2]} intensity={46} distance={16} decay={1.6} color="#ff9445" />
      {/* soft frontal fill so the couple's names sit on a lit stage */}
      <pointLight position={[-7, 3.5, 10]} intensity={30} distance={30} decay={1.5} color="#ffcf98" />
      <pointLight position={[7, 3, 9]} intensity={18} distance={28} decay={1.5} color="#e8b27a" />

      {/* Reflection environment rendered once from local light-formers (no HDR download). */}
      <Environment resolution={quality === 'high' ? 128 : 64} frames={1} background={false}>
        <color attach="background" args={['#120a04']} />
        <Lightformer form="rect" intensity={2.4} color="#ffd59a" position={[0, 6, 6]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ff9d4d" position={[-8, 3, 0]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.0} color="#ffb870" position={[8, 3, 0]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer form="ring" intensity={1.6} color="#ffe2b0" position={[0, 9, -2]} rotation-x={Math.PI / 2} scale={4} />
        <Lightformer form="rect" intensity={0.5} color="#2e6b52" position={[0, -2, 0]} rotation-x={-Math.PI / 2} scale={[20, 20, 1]} />
      </Environment>

      <LightShafts />
      <DistantLights quality={quality} />
      <GroundMist />
    </group>
  )
}
