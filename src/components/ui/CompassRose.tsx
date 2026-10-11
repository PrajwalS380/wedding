import { useId } from 'react'
import type { Direction } from '../../lib/compass'
import { wedding } from '../../data/wedding'
import { radialTicks, range } from './svgPaths'

const ANGLE: Record<Direction, number> = { north: 0, east: 90, south: 180, west: 270 }

/* Degree ticks merged into two paths (long every 30°, short between). */
const TICKS_LONG = radialTicks(200, 200, 72, range(72, (i) => i % 6 === 0), () => 160, 172)
const TICKS_SHORT = radialTicks(200, 200, 72, range(72, (i) => i % 6 !== 0), () => 166, 172)

/** All faceted star points of one tier as two paths: lit half and shaded half. */
function points(degs: number[], len: number, w: number): [string, string] {
  const rot = (x: number, y: number, deg: number) => {
    const a = (deg * Math.PI) / 180
    const dx = x - 200
    const dy = y - 200
    return `${Math.round((200 + dx * Math.cos(a) - dy * Math.sin(a)) * 100) / 100} ${Math.round((200 + dx * Math.sin(a) + dy * Math.cos(a)) * 100) / 100}`
  }
  const half = (side: 1 | -1) => degs.map((d) => `M${rot(200, 200 - len, d)}L${rot(200 + side * w, 200, d)}L200 200Z`).join('')
  return [half(1), half(-1)]
}
const TIER_MINOR = points([22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5], 78, 9)
const TIER_MID = points([45, 135, 225, 315], 98, 13)
const TIER_CARDINAL = points([0, 90, 180, 270], 112, 17)

/**
 * Antique brass compass rose — decorative (aria-hidden). The needle turns to
 * the chosen direction; the D & V medallion always stays on top of it.
 */
export function CompassRose({ direction, className = '' }: { direction: Direction | null; className?: string }) {
  const id = useId().replace(/:/g, '')
  const angle = direction ? ANGLE[direction] : 0
  const { first, second } = wedding.couple.monogram
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e2b4" />
          <stop offset=".4" stopColor="#d5b06d" />
          <stop offset=".7" stopColor="#8f6a33" />
          <stop offset="1" stopColor="#e2c48a" />
        </linearGradient>
        <radialGradient id={`${id}-band`} cx="50%" cy="50%" r="50%">
          <stop offset=".86" stopColor="#3c2a12" />
          <stop offset=".91" stopColor="#c99f5a" />
          <stop offset=".95" stopColor="#f0d9a6" />
          <stop offset=".985" stopColor="#8a6430" />
          <stop offset="1" stopColor="#4a3414" />
        </radialGradient>
        <radialGradient id={`${id}-face`} cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#164a3a" />
          <stop offset="1" stopColor="#071d16" />
        </radialGradient>
      </defs>

      <circle cx="200" cy="206" r="196" fill="#000" opacity=".3" />
      <circle cx="200" cy="200" r="198" fill={`url(#${id}-band)`} />
      <circle cx="200" cy="200" r="176" fill={`url(#${id}-face)`} stroke={`url(#${id}-gold)`} strokeWidth="1.5" />

      {/* degree ticks */}
      <path d={TICKS_LONG} stroke="#d5b06d" strokeOpacity=".9" strokeWidth="1.4" />
      <path d={TICKS_SHORT} stroke="#d5b06d" strokeOpacity=".45" strokeWidth="1" />
      <circle cx="200" cy="200" r="150" fill="none" stroke="#d5b06d" strokeOpacity=".35" />

      {/* cardinal letters */}
      {(
        [
          ['N', 0],
          ['E', 90],
          ['S', 180],
          ['W', 270],
        ] as const
      ).map(([l, deg]) => {
        const a = (deg / 180) * Math.PI
        return (
          <text
            key={l}
            x={200 + Math.sin(a) * 133}
            y={200 - Math.cos(a) * 133 + 7}
            textAnchor="middle"
            fontFamily="'Cormorant Garamond', Georgia, serif"
            fontSize="22"
            fontWeight="600"
            fill={direction && ANGLE[direction] === deg ? '#f6e2b4' : '#d5b06d'}
          >
            {l}
          </text>
        )
      })}

      {/* 16-point rose */}
      <path d={TIER_MINOR[0]} fill="#2a6b55" />
      <path d={TIER_MINOR[1]} fill="#123d30" />
      <path d={TIER_MID[0]} fill="#b8914f" />
      <path d={TIER_MID[1]} fill="#6e5024" />
      <path d={TIER_CARDINAL[0]} fill="#f0d9a6" />
      <path d={TIER_CARDINAL[1]} fill="#a9844b" />

      {/* needle */}
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '200px 200px', transition: 'transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}>
        <path d="M200 58 L209 200 L200 214 L191 200 Z" fill="#7d2535" stroke="#f0d9a6" strokeWidth="1" />
        <path d="M200 58 L200 214 L191 200 Z" fill="#5a1524" />
        <circle cx="200" cy="62" r="4" fill="#f6e2b4" />
      </g>

      {/* D & V medallion */}
      <circle cx="200" cy="200" r="44" fill={`url(#${id}-face)`} stroke={`url(#${id}-gold)`} strokeWidth="2.5" />
      <circle cx="200" cy="200" r="37" fill="none" stroke="#d5b06d" strokeOpacity=".4" />
      <text x="200" y="210" textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontSize="27" fill="#f6ead5">
        {first}
        <tspan fontStyle="italic" fontSize="18" fill="#d5b06d" dx="2" dy="-1">
          &amp;
        </tspan>
        <tspan dx="2" dy="1">
          {second}
        </tspan>
      </text>
    </svg>
  )
}
