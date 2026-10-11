import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BELL_PROFILE, lathe, leafGeometry, swagPoints, useDisposable } from './geometry'
import { MANDAP } from './layout'
import { QUALITY, type SceneQuality } from './quality'

type Flower = 'jasmine' | 'marigold' | 'rose'

interface Bead {
  kind: Flower
  p: THREE.Vector3
  s: number
  /** distance below the hanging anchor → sway amplitude */
  sway: number
  phase: number
}

const PATTERN: Flower[] = ['jasmine', 'jasmine', 'jasmine', 'jasmine', 'jasmine', 'marigold', 'marigold', 'marigold', 'rose']

/** Shared uniform so a single useFrame drives every swaying flower. */
const swayUniform = { value: 0 }

function swayMaterial(params: THREE.MeshStandardMaterialParameters) {
  const mat = new THREE.MeshStandardMaterial(params)
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = swayUniform
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aSway;\nattribute float aPhase;')
      .replace(
        '#include <project_vertex>',
        THREE.ShaderChunk.project_vertex.replace(
          'mvPosition = modelViewMatrix * mvPosition;',
          `mvPosition.x += sin(uTime * 0.85 + aPhase) * 0.028 * aSway;
           mvPosition.z += cos(uTime * 0.6 + aPhase * 1.3) * 0.02 * aSway;
           mvPosition = modelViewMatrix * mvPosition;`,
        ),
      )
  }
  return mat
}

function buildBeads(quality: SceneQuality): Bead[] {
  const beads: Bead[] = []
  const spacing = QUALITY[quality].strandSpacing
  const { pillarX, frontZ, backZ, beamY } = MANDAP

  // 1. Flower curtain along the front beam — strand lengths trace an arch.
  const strands = quality === 'high' ? 30 : 22
  const span = 3.05
  for (let i = 0; i < strands; i++) {
    const x = -span + (i / (strands - 1)) * span * 2
    const t = Math.abs(x) / span
    const length = 0.26 + 2.9 * Math.pow(t, 2.3)
    const top = beamY - 0.2
    const z = frontZ + 0.3 + (i % 2) * 0.05
    const n = Math.floor(length / spacing)
    const phase = i * 0.7
    for (let k = 0; k < n; k++) {
      const kind = PATTERN[(k + i * 2) % PATTERN.length]
      const depth = k * spacing
      beads.push({ kind, p: new THREE.Vector3(x, top - depth, z), s: kind === 'jasmine' ? 0.033 : 0.046, sway: depth, phase })
    }
    // tassel
    beads.push({ kind: 'marigold', p: new THREE.Vector3(x, top - n * spacing - 0.02, z), s: 0.06, sway: n * spacing, phase })
  }

  // 2. Side curtains along the side beams.
  const sideCount = quality === 'high' ? 9 : 6
  for (const sx of [-1, 1]) {
    for (let i = 0; i < sideCount; i++) {
      const z = backZ + 0.2 + (i / (sideCount - 1)) * (frontZ - backZ - 0.2)
      const x = sx * (pillarX + 0.24)
      const length = 1.5 + (i % 3) * 0.25
      const n = Math.floor(length / spacing)
      for (let k = 0; k < n; k++) {
        const kind = PATTERN[(k + i) % PATTERN.length]
        beads.push({ kind, p: new THREE.Vector3(x, beamY - 0.2 - k * spacing, z), s: kind === 'jasmine' ? 0.03 : 0.042, sway: k * spacing, phase: i + sx })
      }
    }
  }

  // 3. A single heavy marigold swag across the front, kept high so the
  //    area behind the couple's names stays calm.
  const a = new THREE.Vector3(-pillarX - 0.1, beamY - 0.12, frontZ + 0.42)
  const b = new THREE.Vector3(pillarX + 0.1, beamY - 0.12, frontZ + 0.42)
  swagPoints(a, b, 0.42, 120).forEach((p, i) => {
    const sway = 0.3 * Math.sin((i / 120) * Math.PI)
    beads.push({ kind: i % 12 === 0 ? 'rose' : 'marigold', p, s: 0.062, sway, phase: 1.2 })
    beads.push({ kind: 'marigold', p: p.clone().add(new THREE.Vector3(0, -0.048, 0.03)), s: 0.05, sway, phase: 1.2 })
  })

  // 4. Garlands spiralling up the two front pillars.
  for (const sx of [-1, 1]) {
    const turns = 5
    const r = 0.25
    const y0 = MANDAP.platformTop + 0.9
    const y1 = MANDAP.platformTop + 4.9
    const steps = quality === 'high' ? 150 : 110
    for (let k = 0; k < steps; k++) {
      const t = k / (steps - 1)
      const ang = t * turns * Math.PI * 2 * sx
      const kind: Flower = k % 9 === 4 ? 'rose' : 'marigold'
      beads.push({
        kind,
        p: new THREE.Vector3(sx * pillarX + Math.cos(ang) * r, y0 + t * (y1 - y0), frontZ + Math.sin(ang) * r),
        s: 0.05,
        sway: 0,
        phase: 0,
      })
    }
  }

  // 5. Flower edging along the front of the two lower roof tiers.
  const edge = (w: number, y: number, z: number, kind: Flower, s: number) => {
    const n = Math.floor(w / 0.065)
    for (let k = 0; k <= n; k++) beads.push({ kind, p: new THREE.Vector3(-w / 2 + (k / n) * w, y, z), s, sway: 0, phase: 0 })
  }
  const midZ = (frontZ + backZ) / 2
  const depth = frontZ - backZ
  edge(7.1, beamY + 0.15, midZ + (depth + 1.0) / 2 + 0.04, 'marigold', 0.05)
  edge(5.6, beamY + 0.51, midZ + (depth + 0.25) / 2 + 0.04, 'jasmine', 0.04)

  return beads
}

function FlowerMesh({ beads, kind, quality }: { beads: Bead[]; kind: Flower; quality: SceneQuality }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const list = useMemo(() => beads.filter((b) => b.kind === kind), [beads, kind])
  const geometry = useDisposable(() => {
    const g = new THREE.IcosahedronGeometry(1, quality === 'high' ? 1 : 0)
    const sway = new Float32Array(list.length)
    const phase = new Float32Array(list.length)
    list.forEach((b, i) => {
      sway[i] = b.sway
      phase[i] = b.phase
    })
    g.setAttribute('aSway', new THREE.InstancedBufferAttribute(sway, 1))
    g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1))
    return g
  }, [list, quality])
  const material = useDisposable(() => {
    if (kind === 'marigold') return swayMaterial({ color: '#ffffff', roughness: 0.62, flatShading: true })
    if (kind === 'rose') return swayMaterial({ color: '#ffffff', roughness: 0.55, flatShading: true })
    return swayMaterial({ color: '#ffffff', roughness: 0.5, emissive: '#3a3226', emissiveIntensity: 0.6 })
  }, [kind])

  useLayoutEffect(() => {
    const mesh = ref.current!
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    let seed = kind.length * 977
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    list.forEach((b, i) => {
      o.position.copy(b.p)
      o.rotation.set(rand() * 6, rand() * 6, rand() * 6)
      if (kind === 'jasmine') o.scale.set(b.s * 0.85, b.s * 1.3, b.s * 0.85)
      else o.scale.setScalar(b.s * (0.9 + rand() * 0.2))
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      if (kind === 'marigold') c.setHSL(0.085 + rand() * 0.03, 0.92, 0.5 + rand() * 0.08)
      else if (kind === 'rose') c.setHSL(0.975, 0.72, 0.28 + rand() * 0.06)
      else c.setHSL(0.11, 0.35, 0.9 + rand() * 0.05)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [list, kind])

  return <instancedMesh ref={ref} args={[geometry, material, list.length]} frustumCulled={false} />
}

function Bells() {
  const bell = useDisposable(() => lathe(BELL_PROFILE, 18))
  const mat = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#d1a456', metalness: 0.95, roughness: 0.22, side: THREE.DoubleSide, envMapIntensity: 1.4 }),
  )
  const chainMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#8f6a33', metalness: 0.9, roughness: 0.4 }))
  const groups = useRef<(THREE.Group | null)[]>([])
  const bells = useMemo(
    () => [
      { x: -1.15, z: MANDAP.frontZ + 0.52, len: 0.95 },
      { x: 1.15, z: MANDAP.frontZ + 0.52, len: 0.95 },
      { x: -2.1, z: MANDAP.frontZ + 0.52, len: 1.45 },
      { x: 2.1, z: MANDAP.frontZ + 0.52, len: 1.45 },
      { x: -3.25, z: MANDAP.frontZ + 0.35, len: 1.2 },
      { x: 3.25, z: MANDAP.frontZ + 0.35, len: 1.2 },
      { x: -3.25, z: MANDAP.backZ - 0.2, len: 1.0 },
      { x: 3.25, z: MANDAP.backZ - 0.2, len: 1.0 },
    ],
    [],
  )
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    groups.current.forEach((g, i) => {
      if (!g) return
      g.rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.045
      g.rotation.x = Math.cos(t * 0.7 + i) * 0.03
    })
  })
  return (
    <group>
      {bells.map((b, i) => (
        <group key={i} ref={(el) => void (groups.current[i] = el)} position={[b.x, MANDAP.beamY - 0.1, b.z]}>
          <mesh position={[0, -b.len / 2, 0]} material={chainMat}>
            <cylinderGeometry args={[0.006, 0.006, b.len, 4]} />
          </mesh>
          <mesh geometry={bell} position={[0, -b.len - 0.26, 0]} material={mat} />
          <mesh position={[0, -b.len - 0.27, 0]} material={mat}>
            <sphereGeometry args={[0.022, 8, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Mango-leaf thoranam festoon along the front beam — the traditional auspicious entrance garland. */
function Thoranam() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useDisposable(() => leafGeometry(0.17, 0.42))
  const mat = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, side: THREE.DoubleSide, emissive: '#0b2010', emissiveIntensity: 0.6 }),
  )
  const count = 44
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    let seed = 17
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < count; i++) {
      const x = -3.2 + (i / (count - 1)) * 6.4
      o.position.set(x, MANDAP.beamY - 0.06 - Math.sin((i / (count - 1)) * Math.PI * 4) * 0.02, MANDAP.frontZ + 0.24)
      o.rotation.set((r() - 0.5) * 0.3, (r() - 0.5) * 0.5, (r() - 0.5) * 0.28)
      o.scale.setScalar(0.85 + r() * 0.3)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
      ref.current!.setColorAt(i, c.setHSL(0.28 + r() * 0.04, 0.5, 0.17 + r() * 0.06))
    }
    ref.current!.instanceMatrix.needsUpdate = true
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true
  }, [])
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}

export function Garlands({ quality }: { quality: SceneQuality }) {
  const beads = useMemo(() => buildBeads(quality), [quality])
  useFrame(({ clock }) => {
    swayUniform.value = clock.elapsedTime
  })
  return (
    <group>
      <FlowerMesh beads={beads} kind="jasmine" quality={quality} />
      <FlowerMesh beads={beads} kind="marigold" quality={quality} />
      <FlowerMesh beads={beads} kind="rose" quality={quality} />
      <Thoranam />
      <Bells />
    </group>
  )
}
