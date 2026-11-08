import { memo, useRef, type CSSProperties } from 'react'
import type { LightPoint } from '../../data/sceneArt'
import { useInView } from '../../hooks/useInView'

const BASE: Record<LightPoint['kind'], number> = { flame: 2.1, bulb: 3.4, sparkle: 2.6, star: 4.8, glow: 7.5 }

/**
 * Living light over a rendered scene: flames flicker, wedding bulbs and stars
 * twinkle, glints on water come and go. Purely decorative, compositor-only CSS,
 * paused off-screen, and absent when motion is paused or reduced (the render
 * itself already shows every light).
 */
export const LiveLights = memo(function LiveLights({ lights, active }: { lights: readonly LightPoint[]; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { rootMargin: '80px' })
  if (!active || !lights.length) return <div ref={ref} className="absolute inset-0" />
  return (
    <div ref={ref} className="absolute inset-0">
      {lights.map((l, i) => {
        const dur = BASE[l.kind] * (0.75 + l.seed * 0.6)
        return (
          <span
            key={i}
            className={`live-light live-${l.kind} ambient`}
            style={
              {
                left: `${l.x * 100}%`,
                top: `${l.y * 100}%`,
                width: `${l.r * 200}%`,
                animationDuration: `${dur.toFixed(2)}s`,
                animationDelay: `${(-l.seed * dur * 3).toFixed(2)}s`,
                animationPlayState: inView ? 'running' : 'paused',
              } as CSSProperties
            }
          />
        )
      })}
    </div>
  )
})
