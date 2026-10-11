import { useId } from 'react'
import { circles, placedCubic, polar, radialTicks, range } from './svgPaths'

function roman(n: number): string {
  const map: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let out = ''
  for (const [v, s] of map) {
    while (n >= v) {
      out += s
      n -= v
    }
  }
  return out
}

const C = 300 // centre of the 600×600 artwork
const VIEW = '0 0 600 600'
const layer = 'absolute inset-0 h-full w-full'

/* Engraving geometry, merged into a handful of paths (computed once). */
const TICKS_MAJOR = radialTicks(C, C, 120, range(120, (i) => i % 10 === 0), () => 236, 262)
const TICKS_MID = radialTicks(C, C, 120, range(120, (i) => i % 5 === 0 && i % 10 !== 0), () => 244, 262)
const TICKS_MINOR = radialTicks(C, C, 120, range(120, (i) => i % 5 !== 0), () => 250, 262)
/** 27 nakshatra marks — every third one larger. */
const NAKSHATRAS = circles(range(27).map((i) => [...polar(C, C, 229, (i / 27) * Math.PI * 2), i % 3 === 0 ? 2.6 : 1.6]))
/** 12 lotus petals around the face. */
const PETAL: [number, number][] = [
  [C, C - 196],
  [C + 7, C - 188],
  [C + 6, C - 178],
  [C, C - 172],
  [C - 6, C - 178],
  [C - 7, C - 188],
  [C, C - 196],
]
const PETALS = range(12)
  .map((i) => placedCubic(PETAL, i * 30, C, C))
  .join('')

/**
 * Engraved antique-gold calendar dial — decorative only (aria-hidden).
 *
 * Built as stacked SVG layers so the two moving parts (the slowly turning
 * engraving ring and the light sweeping the bezel) rotate as whole HTML
 * layers on the compositor — no per-frame SVG repaint, which keeps phones
 * cool. Motion runs only while `spinning` (on screen, motion allowed, not
 * paused by the guest); everything readable is HTML on top.
 */
export function CalendarDial({ inscription, year, spinning }: { inscription: string; year: number; spinning: boolean }) {
  const id = useId().replace(/:/g, '')
  const text = `${inscription} ✦ ${roman(year)} ✦ `
  // each SVG layer needs its own copy of the gradient, under a unique id
  const gold = (layerId: string) => (
    <linearGradient id={`${id}-gold-${layerId}`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#f6e2b4" />
      <stop offset=".35" stopColor="#d5b06d" />
      <stop offset=".62" stopColor="#8f6a33" />
      <stop offset="1" stopColor="#e9cf96" />
    </linearGradient>
  )
  const turning = (cls: string) => `${layer} ${spinning ? `${cls} ambient will-change-transform` : ''}`

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {/* 1 · bezel */}
      <svg viewBox={VIEW} className={layer} focusable="false">
        <defs>
          {gold('bezel')}
          <radialGradient id={`${id}-band`} cx="50%" cy="50%" r="50%">
            <stop offset=".88" stopColor="#3c2a12" />
            <stop offset=".92" stopColor="#c99f5a" />
            <stop offset=".955" stopColor="#f0d9a6" />
            <stop offset=".985" stopColor="#8a6430" />
            <stop offset="1" stopColor="#4a3414" />
          </radialGradient>
        </defs>
        {/* soft shadow under the instrument */}
        <circle cx={C} cy={C + 10} r={292} fill="#000" opacity=".35" />
        {/* metallic bezel */}
        <circle cx={C} cy={C} r={294} fill={`url(#${id}-band)`} />
        <circle cx={C} cy={C} r={294} fill="none" stroke={`url(#${id}-gold-bezel)`} strokeWidth="2" />
        <circle cx={C} cy={C} r={268} fill="#0a2a21" stroke={`url(#${id}-gold-bezel)`} strokeWidth="1.4" />
      </svg>

      {/* 2 · light travelling across the bezel */}
      <svg viewBox={VIEW} className={turning('dial-sheen')} focusable="false">
        <defs>
          <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff6dc" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff6dc" stopOpacity=".75" />
            <stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M ${C - 120} ${C - 255} A 280 280 0 0 1 ${C + 120} ${C - 255}`} fill="none" stroke={`url(#${id}-sheen)`} strokeWidth="9" strokeLinecap="round" opacity=".55" />
      </svg>

      {/* 3 · slowly turning engraving ring */}
      <svg viewBox={VIEW} className={turning('dial-turn')} focusable="false">
        <defs>
          <path id={`${id}-text`} d={`M ${C} ${C - 214} a 214 214 0 1 1 -0.01 0`} />
        </defs>
        <path d={TICKS_MAJOR} stroke="#d5b06d" strokeOpacity=".95" strokeWidth="1.6" />
        <path d={TICKS_MID} stroke="#d5b06d" strokeOpacity=".7" strokeWidth="1" />
        <path d={TICKS_MINOR} stroke="#d5b06d" strokeOpacity=".45" strokeWidth="1" />
        {/* 27 nakshatra marks */}
        <path d={NAKSHATRAS} fill="#ecd4a2" fillOpacity=".8" />
        {/* exactly one inscription, spaced to wrap the full ring without overlapping itself */}
        <text fontFamily="'Cormorant Garamond', Georgia, serif" fontSize="15" fill="#ecd4a2" fillOpacity=".72">
          <textPath href={`#${id}-text`} textLength={Math.round(2 * Math.PI * 214 * 0.985)} lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
        {/* 12 lotus petals */}
        <path d={PETALS} fill="none" stroke="#d5b06d" strokeOpacity=".75" strokeWidth="1" />
      </svg>

      {/* 4 · emerald face */}
      <svg viewBox={VIEW} className={layer} focusable="false">
        <defs>
          {gold('face')}
          <radialGradient id={`${id}-face`} cx="50%" cy="42%" r="62%">
            <stop offset="0" stopColor="#164a3a" />
            <stop offset=".6" stopColor="#0c3026" />
            <stop offset="1" stopColor="#061914" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r={186} fill={`url(#${id}-face)`} />
        <circle cx={C} cy={C} r={186} fill="none" stroke={`url(#${id}-gold-face)`} strokeWidth="2" />
        <circle cx={C} cy={C} r={178} fill="none" stroke="#d5b06d" strokeOpacity=".35" strokeWidth="1" />
        {/* cardinal studs */}
        {[0, 90, 180, 270].map((deg) => (
          <path key={deg} transform={`rotate(${deg} ${C} ${C})`} d={`M ${C} ${C - 194} l 6 8 l -6 8 l -6 -8 Z`} fill={`url(#${id}-gold-face)`} />
        ))}
      </svg>
    </div>
  )
}
