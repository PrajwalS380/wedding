import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { DIYA_PROFILE, LAMP_PROFILE, lathe, useDisposable } from './geometry'
import { GlowField, type GlowInstance } from './GlowField'
import { lampPositions } from './stage'

const LAMP_SCALE = 1.15

/** Clay diya placements: platform front edge + both sides of the aisle. */
function diyaPositions(): [number, number, number][] {
  const out: [number, number, number][] = []
  for (const x of [1.55, 2.05, 2.55, 3.05, 3.5]) {
    out.push([-x, 0.25, 2.78], [x, 0.25, 2.78])
  }
  for (const z of [4.1, 5.3, 6.5, 7.7, 8.9]) {
    out.push([-1.5, 0, z], [1.5, 0, z])
  }
  return out
}

export function OilLamps({ animate }: { animate: boolean }) {
  const LAMP_POSITIONS = useMemo(() => lampPositions(), [])
  const lampGeo = useDisposable(() => lathe(LAMP_PROFILE, 24))
  const diyaGeo = useDisposable(() => lathe(DIYA_PROFILE, 14))
  const brass = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#d0a052', metalness: 0.95, roughness: 0.24, envMapIntensity: 1.3 }),
  )
  const clay = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#8a4a26', roughness: 0.8 }))
  const allDiyas = useMemo(() => diyaPositions(), [])
  const lampBlocks = useCallback(
    ([x, , z]: [number, number, number]) => LAMP_POSITIONS.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < 0.45),
    [LAMP_POSITIONS],
  )
  const diyas = useMemo(() => allDiyas.filter((d) => !lampBlocks(d)), [allDiyas, lampBlocks])
  const diyaRef = useRef<THREE.InstancedMesh>(null)
  const lights = useRef<(THREE.PointLight | null)[]>([])

  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    diyas.forEach((p, i) => {
      o.position.set(...p)
      o.scale.setScalar(1.5)
      o.updateMatrix()
      diyaRef.current!.setMatrixAt(i, o.matrix)
    })
    diyaRef.current!.instanceMatrix.needsUpdate = true
  }, [diyas])

  const flames = useMemo<GlowInstance[]>(() => {
    const out: GlowInstance[] = []
    const rimY = 1.53 * LAMP_SCALE
    const rimR = 0.31 * LAMP_SCALE
    for (const [x, z, by] of LAMP_POSITIONS) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + Math.PI / 2
        out.push({ position: [x + Math.cos(a) * rimR, by + rimY, z + Math.sin(a) * rimR], size: 0.095, color: '#ff8a2a' })
      }
    }
    for (const [x, y, z] of diyas) out.push({ position: [x + 0.1, y + 0.08, z], size: 0.065, color: '#ff8a2a' })
    return out
  }, [diyas, LAMP_POSITIONS])

  const halos = useMemo<GlowInstance[]>(() => {
    const out: GlowInstance[] = LAMP_POSITIONS.map(([x, z, by]) => ({ position: [x, by + 1.85 * LAMP_SCALE, z], size: 2.6, color: '#b8601e' }))
    for (const [x, y, z] of diyas) out.push({ position: [x, y + 0.18, z], size: 0.85, color: '#9a4a16' })
    return out
  }, [diyas, LAMP_POSITIONS])

  useFrame(({ clock }) => {
    if (!animate) return
    const t = clock.elapsedTime
    lights.current.forEach((l, i) => {
      if (l) l.intensity = 7.5 + Math.sin(t * 7.3 + i * 2.1) * 0.6 + Math.sin(t * 13.1 + i) * 0.4
    })
  })

  return (
    <group>
      {LAMP_POSITIONS.map(([x, z, by], i) => (
        <group key={x} position={[x, by, z]}>
          <mesh geometry={lampGeo} material={brass} scale={LAMP_SCALE} />
          <pointLight
            ref={(el) => void (lights.current[i] = el)}
            position={[0, 2.05, 0.1]}
            color="#ffae5c"
            intensity={7.5}
            distance={9}
            decay={1.8}
          />
        </group>
      ))}
      <instancedMesh ref={diyaRef} args={[diyaGeo, clay, diyas.length]} />
      <GlowField items={halos} kind="glow" flicker={animate ? 0.6 : 0} />
      <GlowField items={flames} kind="flame" flicker={animate ? 1 : 0} />
    </group>
  )
}
