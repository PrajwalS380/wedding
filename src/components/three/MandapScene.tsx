import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AtmosphericLighting } from './AtmosphericLighting'
import { FallingPetals, FloorPetals, GoldenDust } from './FloatingPetals'
import { Garlands } from './Garlands'
import { OilLamps } from './OilLamps'
import { QUALITY, type SceneQuality } from './quality'
import { TempleArchitecture } from './TempleArchitecture'
import { cuspedArchPoints, useDisposable } from './geometry'
import { MANDAP } from './layout'
import { FOG_DENSITY, PORTRAIT_ANCHOR, StageContext } from './stage'

export interface MandapSceneProps {
  /** 'always' while visible & animated, 'demand' for a still frame, 'never' off-screen. */
  frameloop: 'always' | 'demand' | 'never'
  animate: boolean
  quality: SceneQuality
  /**
   * Portrait screens: where the couple's names sit, as a fraction of the hero's
   * height from the top. The mandap's interior is framed behind them.
   */
  anchor?: number
  onReady?: () => void
  onFail?: () => void
}

/* Portrait fit: the mandap with both flanking lamps (outer edge ±4.45 at the
   lamps' depth) spans the width just inside the foreground torana's jambs. */
const FIT_HALF_WIDTH = 4.45
const FIT_DEPTH = 2.75
const FIT_MARGIN = 0.95
/** The mandap's interior, between canopy and platform — framed behind the names. */
const INTERIOR = new THREE.Vector3(0, 3.55, MANDAP.frontZ)
const PORTRAIT_CAMERA_Y = 1.9
/** Desktop camera distance — the fog is tuned for it. */
const DESKTOP_DISTANCE = 15.2

/**
 * Orientation-aware framing. Wide screens get a cinematic horizontal stage.
 * Portrait screens show the same complete mandap — roof, canopy, pillars,
 * platform, steps and both lamps — scaled to fit the width, with its interior
 * placed behind the couple's names (`anchor`).
 */
function framingFor(aspect: number, anchor = PORTRAIT_ANCHOR) {
  const portrait = aspect < 1
  if (!portrait) {
    const fov = aspect < 1.4 ? 42 : 36
    const visibleH = aspect < 1.4 ? 10.3 : 9.9
    const dist = visibleH / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2))
    return { fov, portrait, dist, position: new THREE.Vector3(0, 1.95, dist), target: new THREE.Vector3(0, 3.05, 0) }
  }
  const fov = 46
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  const tanH = tanV * aspect
  const dist = FIT_DEPTH + FIT_HALF_WIDTH / (tanH * FIT_MARGIN)
  const position = new THREE.Vector3(0, PORTRAIT_CAMERA_Y, dist)
  // pitch the camera so the interior lands at `anchor` (fraction from the top)
  const ndcY = 1 - 2 * THREE.MathUtils.clamp(anchor, 0.25, 0.6)
  const toInterior = Math.atan2(INTERIOR.y - position.y, dist - INTERIOR.z)
  const pitch = toInterior - Math.atan(ndcY * tanV)
  const target = new THREE.Vector3(0, position.y + Math.tan(pitch) * dist, 0)
  return { fov, portrait, dist, position, target }
}

/** Exponential fog thinned for farther cameras, so the mandap reads as clearly as on desktop. */
const fogFor = (aspect: number) => FOG_DENSITY * Math.min(1, DESKTOP_DISTANCE / framingFor(aspect).dist)

const FRAME_DISTANCE = 3.2

/**
 * Foreground torana: a carved, cusped temple doorway lined with marigolds that
 * travels with the camera, so the mandap is seen through it and gains real
 * parallax depth. Sized from the live field of view so it frames every aspect.
 */
function ToranaFrame({ fov, aspect, portrait }: { fov: number; aspect: number; portrait: boolean }) {
  const vh = 2 * FRAME_DISTANCE * Math.tan(THREE.MathUtils.degToRad(fov / 2))
  const vw = vh * aspect
  const halfW = (vw * (portrait ? 0.97 : 0.9)) / 2
  const springY = vh * (portrait ? 0.2 : 0.14)
  const apexY = vh * (portrait ? 0.445 : 0.54)
  const arch = useMemo(() => cuspedArchPoints(halfW, springY, apexY, portrait ? 5 : 9, 0.035, 220), [halfW, springY, apexY, portrait])

  const frameGeo = useDisposable(() => {
    const W = vw * 1.6
    const H = vh * 1.6
    const s = new THREE.Shape()
    s.moveTo(-W / 2, -H / 2)
    s.lineTo(-W / 2, H / 2)
    s.lineTo(W / 2, H / 2)
    s.lineTo(W / 2, -H / 2)
    s.lineTo(halfW, -H / 2)
    s.lineTo(halfW, springY)
    for (const p of arch) s.lineTo(p.x, p.y)
    s.lineTo(-halfW, -H / 2)
    s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 2, curveSegments: 4 })
  }, [vw, vh, halfW, springY, arch])
  const frameMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#0e1b15', roughness: 0.78, metalness: 0.15 }))

  // fine gold rim tracing the doorway edge (catches the warm environment light)
  const rimGeo = useDisposable(() => {
    const edge = [new THREE.Vector3(halfW, -vh * 0.8, 0.06), new THREE.Vector3(halfW, springY, 0.06)]
    arch.forEach((p, i) => i % 2 === 0 && edge.push(new THREE.Vector3(p.x, p.y, 0.06)))
    edge.push(new THREE.Vector3(-halfW, springY, 0.06), new THREE.Vector3(-halfW, -vh * 0.8, 0.06))
    const curve = new THREE.CatmullRomCurve3(edge, false, 'centripetal')
    return new THREE.TubeGeometry(curve, 360, vh * 0.0042, 6, false)
  }, [arch, halfW, springY, vh])
  const rimMat = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#c79b55', metalness: 0.9, roughness: 0.32, emissive: '#3a2408', emissiveIntensity: 0.6 }),
  )

  return (
    <group>
      <mesh geometry={frameGeo} material={frameMat} renderOrder={20} />
      <mesh geometry={rimGeo} material={rimMat} renderOrder={21} />
    </group>
  )
}

function CameraRig({ animate, anchor }: { animate: boolean; anchor?: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const aspect = size.width / Math.max(size.height, 1)
  const framing = useMemo(() => framingFor(aspect, anchor), [aspect, anchor])
  const pointer = useRef({ x: 0, y: 0, active: false })
  const coarse = useMemo(() => window.matchMedia('(hover: none)').matches, [])
  const frame = useRef<THREE.Group>(null)

  useLayoutEffect(() => {
    camera.fov = framing.fov
    camera.position.copy(framing.position)
    camera.lookAt(framing.target)
    camera.updateProjectionMatrix()
    placeFrame(frame.current, camera)
    invalidate()
  }, [camera, framing, invalidate])

  useEffect(() => {
    if (coarse) return
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
      pointer.current.active = true
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [coarse])

  useFrame(({ clock }, delta) => {
    if (animate) {
      const t = clock.elapsedTime
      // Touch devices get a slow, gentle drift instead of pointer parallax.
      const px = pointer.current.active ? pointer.current.x : Math.sin(t * 0.11) * 0.55
      const py = pointer.current.active ? pointer.current.y : Math.sin(t * 0.07) * 0.25
      const k = 1 - Math.exp(-delta * 2.2)
      camera.position.x += (framing.position.x + px * 0.5 - camera.position.x) * k
      camera.position.y += (framing.position.y - py * 0.24 - camera.position.y) * k
      camera.lookAt(framing.target)
    }
    placeFrame(frame.current, camera)
  })

  return (
    <group ref={frame}>
      <ToranaFrame fov={framing.fov} aspect={aspect} portrait={framing.portrait} />
    </group>
  )
}

/** Keeps the foreground torana locked in front of the camera. */
function placeFrame(g: THREE.Group | null, camera: THREE.Camera) {
  if (!g) return
  g.position.copy(camera.position)
  g.quaternion.copy(camera.quaternion)
  g.translateZ(-FRAME_DISTANCE)
}

/** Shares the portrait/landscape staging with every scene component. */
function StageProvider({ children }: { children: ReactNode }) {
  const size = useThree((s) => s.size)
  const aspect = size.width / Math.max(size.height, 1)
  const value = useMemo(() => ({ portrait: aspect < 1, aspect, fogDensity: fogFor(aspect) }), [aspect])
  return <StageContext.Provider value={value}>{children}</StageContext.Provider>
}

/**
 * Compiles every material asynchronously (KHR_parallel_shader_compile) before
 * the first frame, so shader compilation never blocks the main thread — the
 * intro and hero text keep animating smoothly while the stage prepares.
 */
function ShaderWarmup({ onDone }: { onDone: () => void }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    let cancelled = false
    const finish = () => !cancelled && onDone()
    if (typeof gl.compileAsync === 'function') gl.compileAsync(scene, camera).then(finish, finish)
    else finish()
    return () => {
      cancelled = true
    }
  }, [gl, scene, camera, onDone])
  return null
}

/** Requests a frame whenever the loop mode changes (needed for 'demand' mode). */
function KickOnChange({ token }: { token: string }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    invalidate()
  }, [token, invalidate])
  return null
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    // let the frame reach the screen before revealing the canvas
    requestAnimationFrame(() => onReady?.())
  })
  return null
}

function MandapScene({ frameloop, animate, quality, anchor, onReady, onFail }: MandapSceneProps) {
  const [dpr, setDpr] = useState<number>(() => Math.min(window.devicePixelRatio || 1, QUALITY[quality].dpr[1]))
  const [compiled, setCompiled] = useState(false)
  const markCompiled = useCallback(() => setCompiled(true), [])

  return (
    <Canvas
      frameloop={compiled ? frameloop : 'never'}
      resize={{ debounce: { scroll: 50, resize: 0 } }}
      dpr={dpr}
      gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      camera={{ fov: 38, near: 0.1, far: 90, position: [0, 2.2, 15] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.08
        gl.domElement.addEventListener(
          'webglcontextlost',
          (e) => {
            e.preventDefault()
            onFail?.()
          },
          { once: true },
        )
      }}
      aria-hidden="true"
      tabIndex={-1}
      style={{ touchAction: 'pan-y' }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(1, d - 0.35))}
        onIncline={() => setDpr((d) => Math.min(QUALITY[quality].dpr[1], d + 0.2))}
        flipflops={3}
        onFallback={() => setDpr(1)}
      />
      <Suspense fallback={null}>
        <StageProvider>
          <AtmosphericLighting quality={quality} />
          <TempleArchitecture quality={quality} />
          <Garlands quality={quality} />
          <OilLamps animate={animate} />
          <FloorPetals quality={quality} />
          <FallingPetals quality={quality} animate={animate} />
          <GoldenDust quality={quality} />
          <CameraRig animate={animate} anchor={anchor} />
        </StageProvider>
        <ShaderWarmup onDone={markCompiled} />
        <KickOnChange token={`${compiled}-${frameloop}`} />
        <ReadySignal onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}

/** Memoized: changing the page language (or any unrelated hero state) never re-renders the 3D scene. */
export default memo(MandapScene)
