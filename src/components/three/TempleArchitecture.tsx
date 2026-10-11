import * as THREE from 'three'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  bananaLeafGeometry,
  gatewayGeometry,
  KALASHA_PROFILE,
  lathe,
  PILLAR_PROFILE,
  roofGeometry,
  scallopGeometry,
  templePillarGeometry,
  useDisposable,
} from './geometry'
import { createBackdropTexture, createGlowTexture, createRangoliTexture, createStoneTexture } from './textures'
import type { SceneQuality } from './quality'
import { MANDAP } from './layout'
import { lampPositions } from './stage'

/** Shared physically-based materials. */
function useMaterials() {
  const gold = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#b8914f', metalness: 0.9, roughness: 0.36, envMapIntensity: 1.0 }),
  )
  const darkGold = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#7a5a2c', metalness: 0.85, roughness: 0.45, envMapIntensity: 0.8 }),
  )
  const ivoryStone = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#b39b74', roughness: 0.62, metalness: 0.02 }))
  const granite = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#4f4738', roughness: 0.86, metalness: 0.04 }))
  const velvet = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#5c1426', roughness: 0.8, metalness: 0.0, side: THREE.DoubleSide, flatShading: true }),
  )
  const leaf = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#24472a', roughness: 0.7, side: THREE.DoubleSide, emissive: '#081a0c', emissiveIntensity: 0.35 }),
  )
  const stem = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#7d8a4a', roughness: 0.7 }))
  return { gold, darkGold, ivoryStone, granite, velvet, leaf, stem }
}
type Materials = ReturnType<typeof useMaterials>

function Floor() {
  const stone = useDisposable(() => {
    const t = createStoneTexture()
    t.repeat.set(10, 10)
    return t
  })
  const mat = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#0f2a22', roughness: 0.24, metalness: 0.25, roughnessMap: stone, envMapIntensity: 0.9 }),
    [stone],
  )
  const runner = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#4d0f1e', roughness: 0.92 }))
  const trim = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#c99a4e', metalness: 0.8, roughness: 0.35 }))
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} material={mat}>
        <planeGeometry args={[140, 140]} />
      </mesh>
      {/* Aisle runner leading the eye to the mandap */}
      {/* long enough to reach the pulled-back portrait camera */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 17.05]} material={runner}>
        <planeGeometry args={[2.3, 27.9]} />
      </mesh>
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.008, 17.05]} material={trim}>
          <planeGeometry args={[0.06, 27.9]} />
        </mesh>
      ))}
    </group>
  )
}

function Platform({ m }: { m: Materials }) {
  const rangoli = useDisposable(() => createRangoliTexture())
  const rangoliMat = useDisposable(
    () =>
      new THREE.MeshStandardMaterial({
        map: rangoli,
        transparent: true,
        color: '#f0cf86',
        emissive: '#7a5520',
        emissiveMap: rangoli,
        emissiveIntensity: 0.6,
        roughness: 0.55,
        metalness: 0.3,
        depthWrite: false,
      }),
    [rangoli],
  )
  return (
    <group>
      <mesh position={[0, 0.125, 0]} material={m.ivoryStone}>
        <boxGeometry args={[7.6, 0.25, 5.8]} />
      </mesh>
      <mesh position={[0, 0.35, -0.05]} material={m.ivoryStone}>
        <boxGeometry args={[6.9, 0.2, 5.0]} />
      </mesh>
      {/* inlaid gold border and maroon band on the risers */}
      <mesh position={[0, 0.125, 2.902]} material={m.velvet}>
        <boxGeometry args={[7.62, 0.09, 0.01]} />
      </mesh>
      <mesh position={[0, 0.235, 2.905]} material={m.gold}>
        <boxGeometry args={[7.62, 0.03, 0.02]} />
      </mesh>
      <mesh position={[0, 0.03, 2.905]} material={m.gold}>
        <boxGeometry args={[7.62, 0.02, 0.02]} />
      </mesh>
      <mesh position={[0, 0.44, 2.455]} material={m.gold}>
        <boxGeometry args={[6.92, 0.03, 0.02]} />
      </mesh>
      {/* two-step stair */}
      <mesh position={[0, 0.17, 3.12]} material={m.ivoryStone}>
        <boxGeometry args={[2.6, 0.34, 0.46]} />
      </mesh>
      <mesh position={[0, 0.085, 3.52]} material={m.ivoryStone}>
        <boxGeometry args={[2.9, 0.17, 0.4]} />
      </mesh>
      <mesh position={[0, 0.34, 3.351]} material={m.gold}>
        <boxGeometry args={[2.62, 0.02, 0.02]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, MANDAP.platformTop + 0.004, 0.0]} material={rangoliMat}>
        <circleGeometry args={[2.05, 64]} />
      </mesh>
    </group>
  )
}

function MandapPillars({ m, quality }: { m: Materials; quality: SceneQuality }) {
  const shaft = useDisposable(() => lathe(PILLAR_PROFILE, quality === 'high' ? 28 : 16), [quality])
  const positions: [number, number][] = [
    [-MANDAP.pillarX, MANDAP.frontZ],
    [MANDAP.pillarX, MANDAP.frontZ],
    [-MANDAP.pillarX, MANDAP.backZ],
    [MANDAP.pillarX, MANDAP.backZ],
  ]
  return (
    <group>
      {positions.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, MANDAP.platformTop, z]}>
          <mesh position={[0, 0.17, 0]} material={m.gold}>
            <boxGeometry args={[0.62, 0.34, 0.62]} />
          </mesh>
          <mesh position={[0, 0.36, 0]} material={m.darkGold}>
            <boxGeometry args={[0.7, 0.05, 0.7]} />
          </mesh>
          <mesh geometry={shaft} position={[0, 0.34, 0]} material={m.gold} />
          <mesh position={[0, 0.34 + MANDAP.pillarHeight + 0.09, 0]} material={m.gold}>
            <boxGeometry args={[0.72, 0.18, 0.72]} />
          </mesh>
          <mesh position={[0, 0.34 + MANDAP.pillarHeight + 0.24, 0]} material={m.darkGold}>
            <boxGeometry args={[1.0, 0.12, 0.34]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Curved temple roof (vaulted velvet underside) with a gold eave and kalasha finials. */
function Canopy({ m }: { m: Materials }) {
  const kalasha = useDisposable(() => lathe(KALASHA_PROFILE, 20))
  const valance = useDisposable(() => scallopGeometry(6.3, 0.42, 9))
  const depth = MANDAP.frontZ - MANDAP.backZ
  const roof = useDisposable(() => roofGeometry(7.3, depth + 1.15, 1.75))
  const eave = useDisposable(() => {
    const g = lathe(
      [
        [3.6, -0.02],
        [4.04, 0.05],
        [4.0, 0.12],
        [3.7, 0.1],
      ],
      4,
      false,
    )
    g.rotateY(Math.PI / 4)
    const half = 4.04 * Math.SQRT1_2
    g.scale(7.42 / (2 * half), 1, (depth + 1.27) / (2 * half))
    return g
  })
  const y = MANDAP.beamY
  const midZ = (MANDAP.frontZ + MANDAP.backZ) / 2
  return (
    <group>
      {/* beams */}
      <mesh position={[0, y, MANDAP.frontZ]} material={m.darkGold}>
        <boxGeometry args={[6.5, 0.3, 0.34]} />
      </mesh>
      <mesh position={[0, y, MANDAP.backZ]} material={m.gold}>
        <boxGeometry args={[6.5, 0.3, 0.34]} />
      </mesh>
      {[-MANDAP.pillarX, MANDAP.pillarX].map((x) => (
        <mesh key={x} position={[x, y, midZ]} material={m.gold}>
          <boxGeometry args={[0.34, 0.3, depth + 0.34]} />
        </mesh>
      ))}
      <mesh geometry={valance} position={[0, y - 0.12, MANDAP.frontZ + 0.19]} material={m.velvet} />
      {/* roof */}
      <group position={[0, y + 0.16, midZ]}>
        <mesh geometry={roof} material={m.velvet} />
        <mesh geometry={eave} material={m.gold} />
        <mesh geometry={kalasha} position={[0, 1.66, 0]} scale={1.35} material={m.gold} />
      </group>
      {/* corner finials on the eave */}
      {[
        [-3.55, MANDAP.frontZ + 0.5],
        [3.55, MANDAP.frontZ + 0.5],
      ].map(([x, z]) => (
        <mesh key={x} geometry={kalasha} position={[x, y + 0.24, z]} scale={0.62} material={m.gold} />
      ))}
    </group>
  )
}

function Backdrop() {
  const tex = useDisposable(() => createBackdropTexture())
  const mat = useDisposable(
    () => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, emissive: '#2a0711', emissiveIntensity: 0.4 }),
    [tex],
  )
  return (
    <mesh position={[0, MANDAP.platformTop + 2.75, MANDAP.backZ - 0.12]} material={mat}>
      <planeGeometry args={[5.4, 5.5]} />
    </mesh>
  )
}

/** Banana stems tied at the mandap entrance — a traditional South Indian welcome. */
function BananaPlants({ m }: { m: Materials }) {
  const leafGeo = useDisposable(() => bananaLeafGeometry())
  const leaves = useMemo(() => {
    let seed = 5
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: 5 }, (_, i) => ({
      y: 1.35 + i * 0.12 + r() * 0.08,
      rotY: (i / 5) * Math.PI * 2 + r() * 0.4,
      tilt: 0.75 + r() * 0.4,
      scale: 0.9 + r() * 0.25,
    }))
  }, [])
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 3.12, MANDAP.platformTop, MANDAP.frontZ - 0.28]}>
          <mesh position={[0, 0.95, 0]} material={m.stem}>
            <cylinderGeometry args={[0.07, 0.11, 1.9, 10]} />
          </mesh>
          {leaves.map((l, i) => (
            <group key={i} position={[0, l.y, 0]} rotation={[0, l.rotY * side, 0]}>
              <mesh geometry={leafGeo} rotation={[l.tilt, 0, 0]} scale={l.scale} material={m.leaf} />
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}

/** Receding colonnade of Dravidian temple pillars (one instanced draw call). */
function Colonnade({ m, quality }: { m: Materials; quality: SceneQuality }) {
  const pillar = useDisposable(() => templePillarGeometry())
  const ref = useRef<THREE.InstancedMesh>(null)
  const rowsX = useMemo(() => (quality === 'high' ? [6.6, 9.9] : [6.6]), [quality])
  const placements = useMemo(() => {
    const zs = [4.2, -0.8, -5.8, -10.8, -15.8, -20.8]
    return rowsX.flatMap((x) => zs.flatMap((z) => [[-x, z] as const, [x, z] as const]))
  }, [rowsX])
  const height = (pillar.userData.height as number) * 1.18

  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    placements.forEach(([x, z], i) => {
      o.position.set(x, 0, z)
      o.scale.set(1.12, 1.18, 1.12)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
    })
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [placements])

  return (
    <group>
      <instancedMesh ref={ref} args={[pillar, m.granite, placements.length]} />
      {rowsX.flatMap((x) =>
        [-x, x].map((sx) => (
          <mesh key={sx} position={[sx, height + 0.3, -8]} material={m.granite}>
            <boxGeometry args={[1.3, 0.6, 28]} />
          </mesh>
        )),
      )}
    </group>
  )
}

/** Distant arched gateway, back-lit to read as a warm glow at the end of the hall. */
function Gateway({ m }: { m: Materials }) {
  const geo = useDisposable(() => gatewayGeometry(26, 15, 5.2, 8.5))
  return (
    <group position={[0, 0, -27]}>
      <mesh geometry={geo} material={m.granite} />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 15 + i * 1.1, 0.4]} material={m.granite}>
          <boxGeometry args={[14 - i * 3, 1.0, 1.0]} />
        </mesh>
      ))}
    </group>
  )
}

/** Soft contact shadows that ground pillars, lamps and steps (no shadow maps needed). */
function ContactShadows() {
  const tex = useDisposable(() => createGlowTexture(64))
  const mat = useDisposable(
    () => new THREE.MeshBasicMaterial({ color: '#000000', alphaMap: tex, transparent: true, opacity: 0.62, depthWrite: false }),
    [tex],
  )
  const spots: [number, number, number, number][] = [
    ...[MANDAP.frontZ, MANDAP.backZ].flatMap((z) => [-MANDAP.pillarX, MANDAP.pillarX].map((x) => [x, MANDAP.platformTop + 0.006, z, 1.5] as [number, number, number, number])),
    ...lampPositions().map(([x, z, by]) => [x, by + 0.012, z, 1.3] as [number, number, number, number]),
    [0, 0.013, 3.9, 3.6],
  ]
  return (
    <group>
      {spots.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} rotation-x={-Math.PI / 2} material={mat}>
          <planeGeometry args={[s, s]} />
        </mesh>
      ))}
    </group>
  )
}

export function TempleArchitecture({ quality }: { quality: SceneQuality }) {
  const m = useMaterials()
  return (
    <group>
      <Floor />
      <Platform m={m} />
      <MandapPillars m={m} quality={quality} />
      <Canopy m={m} />
      <Backdrop />
      <BananaPlants m={m} />
      <Colonnade m={m} quality={quality} />
      <Gateway m={m} />
      <ContactShadows />
    </group>
  )
}
