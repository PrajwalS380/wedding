import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../../hooks/useReveal'
import { useMotion } from '../../hooks/motion'
import type { SceneArt, SceneVariant } from '../../data/sceneArt'
import { useSceneVariant } from '../../hooks/useOrientation'
import { LiveLights } from './LiveLights'

interface Box {
  w: number
  h: number
  x: number
  y: number
}

/** Size and offset that make the image cover `cw × ch`, keeping its focus point in view. */
function coverBox(cw: number, ch: number, v: SceneVariant): Box {
  const s = Math.max(cw / v.width, ch / v.height)
  const w = v.width * s
  const h = v.height * s
  return { w, h, x: (cw - w) * v.focus[0], y: (ch - h) * v.focus[1] }
}

/**
 * A rendered scene filling its parent. The picture and its live lights share
 * one "stage" that is cover-fitted like `object-fit: cover`, so the lights
 * always sit on the flames and bulbs they belong to. While the chapter
 * scrolls past, the stage drifts and settles very slightly (parallax).
 */
export function SceneStage({ art, eager = false, parallax = true, className = '', children }: { art: SceneArt; eager?: boolean; parallax?: boolean; className?: string; children?: ReactNode }) {
  const v = useSceneVariant(art)
  const frame = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Box | null>(null)
  const { ambientMotion, prefersReducedMotion } = useMotion()

  useLayoutEffect(() => {
    const el = frame.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      const next = coverBox(r.width, r.height, v)
      setBox((b) => (b && Math.abs(b.w - next.w) < 0.5 && Math.abs(b.h - next.h) < 0.5 && Math.abs(b.x - next.x) < 0.5 && Math.abs(b.y - next.y) < 0.5 ? b : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [v])

  useGSAP(
    () => {
      if (!parallax || prefersReducedMotion || !stage.current) return
      gsap.fromTo(
        stage.current,
        { yPercent: -2.6, scale: 1.09 },
        { yPercent: 2.6, scale: 1.06, ease: 'none', scrollTrigger: { trigger: frame.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 } },
      )
    },
    { dependencies: [parallax, prefersReducedMotion, v.src], revertOnUpdate: true },
  )

  return (
    <div ref={frame} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div
        ref={stage}
        className="absolute origin-center will-change-transform"
        style={box ? { width: box.w, height: box.h, left: box.x, top: box.y } : { inset: 0 }}
      >
        <img
          src={v.src}
          srcSet={v.srcSet}
          sizes="100vw"
          width={v.width}
          height={v.height}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `${v.focus[0] * 100}% ${v.focus[1] * 100}%` }}
        />
        {box && <LiveLights lights={v.lights} active={ambientMotion} />}
        {children}
      </div>
    </div>
  )
}
