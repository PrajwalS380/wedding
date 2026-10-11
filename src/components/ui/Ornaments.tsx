/**
 * Hand-drawn gold line-art ornaments shared across the site.
 * All decorative: aria-hidden, stroke = currentColor, hairline weight.
 */
import { useId, type CSSProperties, type SVGProps } from 'react'
import { circles, placedCubic } from './svgPaths'

type OrnamentProps = SVGProps<SVGSVGElement> & { title?: never }

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
}

export function LotusDivider({ className, ...rest }: OrnamentProps) {
  return (
    <svg viewBox="0 0 240 24" className={className} aria-hidden="true" focusable="false" {...rest}>
      <g {...line}>
        <path d="M4 13 H98" opacity=".55" />
        <path d="M142 13 H236" opacity=".55" />
        <path d="M120 3 C124 8 124 14 120 20 C116 14 116 8 120 3 Z" />
        <path d="M120 20 C113 19 108 14 107 8 C113 9 118 13 120 20 Z" />
        <path d="M120 20 C127 19 132 14 133 8 C127 9 122 13 120 20 Z" />
        <path d="M110 21.5 Q120 24.5 130 21.5" />
      </g>
      <circle cx="101" cy="13" r="1.6" fill="currentColor" />
      <circle cx="139" cy="13" r="1.6" fill="currentColor" />
      <path d="M92 13 l3 -3 l3 3 l-3 3 Z M142 13 l3 -3 l3 3 l-3 3 Z" fill="currentColor" opacity=".7" />
    </svg>
  )
}

export function CornerFlourish({ className, style, ...rest }: OrnamentProps & { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden="true" focusable="false" {...rest}>
      <g {...line}>
        <path d="M2 62 V12 Q2 2 12 2 H62" opacity=".8" />
        <path d="M8 50 C8 26 26 8 50 8" opacity=".55" />
        <path d="M17 32 C17 23 23 17 31 17 C36 17 38 21 36 24 C34 27 29 26 29 23" />
        <path d="M40 8.5 C45.5 4.5 51.5 4.5 56 6.5 C51.5 10.5 45.5 10.5 40 8.5 Z" />
        <path d="M8.5 40 C4.5 45.5 4.5 51.5 6.5 56 C10.5 51.5 10.5 45.5 8.5 40 Z" />
      </g>
      <circle cx="7" cy="7" r="1.7" fill="currentColor" />
    </svg>
  )
}

/** Gold line-art mandap (canopy, pillars, garland swag, bells, kalasha). */
export function MandapMotif({ className, ...rest }: OrnamentProps) {
  return (
    <svg viewBox="0 0 160 124" className={className} aria-hidden="true" focusable="false" {...rest}>
      <g {...line}>
        {/* kalasha finial */}
        <path d="M80 2 V8" />
        <path d="M76 8 C72 6 70 9 73 11 M84 8 C88 6 90 9 87 11" />
        <path d="M74 12 C70 16 72 22 80 22 C88 22 90 16 86 12 Z" />
        {/* tiered canopy */}
        <path d="M22 50 C40 36 54 26 80 22 C106 26 120 36 138 50" />
        <path d="M28 50 C44 40 58 32 80 29 C102 32 116 40 132 50" opacity=".6" />
        <path d="M16 50 H144 M20 55 H140" />
        {/* scalloped valance */}
        <path d="M24 55 q7 7 14 0 q7 7 14 0 q7 7 14 0 q7 7 14 0 q7 7 14 0 q7 7 14 0 q7 7 14 0 q7 7 14 0" opacity=".75" />
        {/* pillars */}
        <path d="M32 55 V108 M40 55 V108 M120 55 V108 M128 55 V108" />
        <path d="M30 70 H42 M30 92 H42 M118 70 H130 M118 92 H130" opacity=".7" />
        <ellipse cx="36" cy="81" rx="5" ry="3.2" opacity=".7" />
        <ellipse cx="124" cy="81" rx="5" ry="3.2" opacity=".7" />
        {/* garland swag + bells */}
        <path d="M42 62 Q80 84 118 62" strokeDasharray="1 3.2" strokeWidth="2.2" />
        <path d="M62 72 V80 M80 75 V86 M98 72 V80" opacity=".8" />
        <path d="M59.5 83 Q62 78 64.5 83 Z M77.5 89 Q80 84 82.5 89 Z M95.5 83 Q98 78 100.5 83 Z" />
        {/* platform */}
        <path d="M22 108 H138 M14 115 H146 M6 122 H154" />
      </g>
      <circle cx="80" cy="2" r="1.6" fill="currentColor" />
    </svg>
  )
}

/** Traditional South Indian standing oil lamp (kuthuvilakku). */
export function LampMotif({ className, lit = true, ...rest }: OrnamentProps & { lit?: boolean }) {
  return (
    <svg viewBox="0 0 100 200" className={className} aria-hidden="true" focusable="false" {...rest}>
      <defs>
        <radialGradient id="lamp-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffe3a3" stopOpacity=".9" />
          <stop offset=".35" stopColor="#f0a94a" stopOpacity=".35" />
          <stop offset="1" stopColor="#f0a94a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lamp-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff9d3a" />
          <stop offset=".55" stopColor="#ffd77a" />
          <stop offset="1" stopColor="#fff6dc" />
        </linearGradient>
      </defs>
      {lit && <ellipse cx="50" cy="70" rx="48" ry="30" fill="url(#lamp-glow)" />}
      <g {...line}>
        <path d="M50 50 C44 42 46 32 50 26 C54 32 56 42 50 50 Z" />
        <path d="M50 50 V82" />
        <path d="M14 84 H86" />
        <path d="M18 84 Q50 106 82 84" />
        <path d="M46 96 V158 M54 96 V158" />
        <ellipse cx="50" cy="104" rx="7" ry="3" />
        <ellipse cx="50" cy="124" rx="9" ry="4" />
        <ellipse cx="50" cy="146" rx="7" ry="3" />
        <path d="M46 158 C40 172 28 178 22 188 H78 C72 178 60 172 54 158" />
        <path d="M16 194 H84" />
      </g>
      {lit &&
        [20, 35, 50, 65, 80].map((x) => (
          <path
            key={x}
            className="ambient"
            style={{
              transformOrigin: `${x}px 84px`,
              animation: `flame-flicker ${1.6 + (x % 7) * 0.13}s ease-in-out infinite`,
            }}
            d={`M${x} 84 C${x - 4} 77 ${x - 2} 71 ${x} 64 C${x + 2} 71 ${x + 4} 77 ${x} 84 Z`}
            fill="url(#lamp-flame)"
          />
        ))}
    </svg>
  )
}

/** Tall gopuram-inspired temple silhouette used as faint background line art. */
export function TempleLineArt({ className, ...rest }: OrnamentProps) {
  const tiers = [0, 1, 2, 3, 4, 5]
  return (
    <svg viewBox="0 0 220 340" className={className} aria-hidden="true" focusable="false" {...rest}>
      <g {...line}>
        {tiers.map((i) => {
          const w = 200 - i * 26
          const x = 110 - w / 2
          const y = 300 - i * 40
          return (
            <g key={i}>
              <path d={`M${x} ${y} H${x + w} M${x + 6} ${y - 6} H${x + w - 6}`} />
              <path d={`M${x + 6} ${y - 6} L${x + 14} ${y - 36} H${x + w - 14} L${x + w - 6} ${y - 6}`} opacity=".7" />
              {Array.from({ length: Math.max(2, 7 - i) }).map((_, j, arr) => {
                const cx = x + 20 + (j * (w - 40)) / Math.max(1, arr.length - 1)
                return <path key={j} d={`M${cx - 4} ${y - 8} V${y - 26} Q${cx} ${y - 34} ${cx + 4} ${y - 26} V${y - 8}`} opacity=".55" />
              })}
            </g>
          )
        })}
        <path d="M78 60 Q110 18 142 60" />
        <path d="M104 26 C100 22 102 14 110 10 C118 14 120 22 116 26 Z" />
        <path d="M110 10 V2" />
        <path d="M10 300 V334 H210 V300 M92 334 V290 Q110 268 128 290 V334" />
      </g>
    </svg>
  )
}

/** Stylised rose / marigold / jasmine petals for CSS petal fields. */
export function PetalShape({ kind, className, style }: { kind: 'rose' | 'marigold' | 'jasmine'; className?: string; style?: CSSProperties }) {
  // a unique gradient id per petal (a petal field renders many of them)
  const gradId = `${useId().replace(/:/g, '')}-petal`
  if (kind === 'jasmine') {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true" focusable="false">
        {[0, 72, 144, 216, 288].map((r) => (
          <path key={r} transform={`rotate(${r} 12 12)`} d="M12 12 C9.5 8 10 3.5 12 2 C14 3.5 14.5 8 12 12 Z" fill="#fbf4e4" stroke="#e6d4b2" strokeWidth=".4" />
        ))}
        <circle cx="12" cy="12" r="1.6" fill="#e8c77d" />
      </svg>
    )
  }
  const stops = kind === 'rose' ? ['#c8475a', '#8f1f33', '#5e1222'] : ['#ffc861', '#ec9a2b', '#c46a12']
  return (
    <svg viewBox="0 0 24 30" className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={gradId} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset=".7" stopColor={stops[1]} />
          <stop offset="1" stopColor={stops[2]} />
        </radialGradient>
      </defs>
      <path d="M12 1 C20 4 24 13 20 22 C17.5 27.5 13 29 12 29 C11 29 6.5 27.5 4 22 C0 13 4 4 12 1 Z" fill={`url(#${gradId})`} />
      <path d="M12 4 C11 12 11.5 20 12 27" stroke="rgba(255,255,255,.18)" strokeWidth=".6" fill="none" />
    </svg>
  )
}

/* Floral corner geometry, merged into a few paths (computed once). */
const LEAF: [number, number][] = [
  [0, 0],
  [6, -6],
  [16, -6],
  [22, 0],
  [16, 6],
  [6, 6],
  [0, 0],
]
const LEAVES: [number, number, number][] = [
  [30, 112, -40],
  [58, 70, -20],
  [84, 48, 10],
  [118, 26, 30],
  [18, 92, 200],
  [104, 22, -60],
]
const leafPath = (odd: boolean) =>
  LEAVES.filter((_, i) => (i % 2 === 1) === odd)
    .map(([x, y, r]) => placedCubic(LEAF, r, 0, 0, x, y))
    .join('')
const LEAVES_DARK = leafPath(false)
const LEAVES_LIGHT = leafPath(true)
const MARIGOLD_PETALS = circles(Array.from({ length: 12 }, (_, i): [number, number, number] => [92 + Math.cos((i / 12) * Math.PI * 2) * 7, 54 + Math.sin((i / 12) * Math.PI * 2) * 7, 3.4]))
const JASMINE: [number, number][] = [
  [0, 0],
  [-2, -3],
  [-1.5, -6.5],
  [0, -7.5],
  [1.5, -6.5],
  [2, -3],
  [0, 0],
]
const BUDS: [number, number][] = [
  [126, 24],
  [136, 16],
  [20, 130],
  [12, 120],
  [70, 76],
]
const JASMINE_PETALS = BUDS.flatMap(([x, y]) => [0, 72, 144, 216, 288].map((r) => placedCubic(JASMINE, r, 0, 0, x, y))).join('')
const JASMINE_HEARTS = circles(BUDS.map(([x, y]): [number, number, number] => [x, y, 1.1]))

/** Delicate floral corner spray: rose, marigold, jasmine buds and leaves. */
export function FloralCorner({ className, style }: { className?: string; style?: CSSProperties }) {
  // unique gradient ids per instance (several corners can share a page)
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 160 160" className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-rose`} cx="45%" cy="40%" r="60%">
          <stop offset="0" stopColor="#c44a5c" />
          <stop offset=".75" stopColor="#7d2535" />
          <stop offset="1" stopColor="#5a1524" />
        </radialGradient>
        <radialGradient id={`${id}-mari`} cx="45%" cy="40%" r="60%">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset=".8" stopColor="#e39a32" />
          <stop offset="1" stopColor="#b8650f" />
        </radialGradient>
      </defs>
      {/* vine */}
      <path d="M4 150 C30 120 40 80 70 56 C96 36 128 30 156 6" fill="none" stroke="#a9844b" strokeWidth="1.1" />
      <path d="M40 92 C28 86 18 88 10 96 M96 40 C100 26 110 18 122 16" fill="none" stroke="#a9844b" strokeWidth=".9" />
      {/* leaves */}
      <path d={LEAVES_DARK} fill="#123d30" stroke="#a9844b" strokeWidth=".5" />
      <path d={LEAVES_LIGHT} fill="#1c4b3c" stroke="#a9844b" strokeWidth=".5" />
      {/* rose */}
      <g transform="translate(46 98)">
        <circle r="15" fill={`url(#${id}-rose)`} />
        <path d="M-8 -2 C-6 -10 6 -10 8 -2 C6 6 -6 6 -8 -2 Z M-4 -1 C-3 -5 3 -5 4 -1 C3 3 -3 3 -4 -1 Z" fill="none" stroke="#e7a0a8" strokeWidth=".7" opacity=".7" />
        <path d="M-13 4 C-8 12 8 12 13 4" fill="none" stroke="#3e0d18" strokeWidth=".8" opacity=".6" />
      </g>
      {/* marigold */}
      <circle cx="92" cy="54" r="11" fill={`url(#${id}-mari)`} />
      <path d={MARIGOLD_PETALS} fill="#f3b04a" fillOpacity=".85" />
      <circle cx="92" cy="54" r="3.5" fill="#c46a12" />
      {/* jasmine buds */}
      <path d={JASMINE_PETALS} fill="#fbf4e4" stroke="#d9c39a" strokeWidth=".3" />
      <path d={JASMINE_HEARTS} fill="#e8c77d" />
    </svg>
  )
}
