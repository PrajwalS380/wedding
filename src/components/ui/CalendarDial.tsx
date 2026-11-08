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
const r2 = (n: number) => Math.round(n * 100) / 100

/** A ring (annulus) between two radii, for even-odd fills. */
const ring = (outer: number, inner: number) =>
  `M${C - outer} ${C}a${outer} ${outer} 0 1 0 ${2 * outer} 0a${outer} ${outer} 0 1 0 ${-2 * outer} 0Z` +
  `M${C - inner} ${C}a${inner} ${inner} 0 1 1 ${2 * inner} 0a${inner} ${inner} 0 1 1 ${-2 * inner} 0Z`

/** An arc of radius r from angle a1 to a2 (radians, 0 = up, clockwise). */
const arc = (r: number, a1: number, a2: number) => {
  const [x1, y1] = polar(C, C, r, a1)
  const [x2, y2] = polar(C, C, r, a2)
  return `M${x1} ${y1}A${r} ${r} 0 ${a2 - a1 > Math.PI ? 1 : 0} 1 ${x2} ${y2}`
}

/* ---------------------------------------------------------------- engraving geometry (computed once) */

/** Milled coin edge round the outside: dark grooves with light ridges between. */
const KNURL_DARK = radialTicks(C, C, 360, range(360), () => 291, 297.5)
const KNURL_LIGHT = radialTicks(C, C, 720, range(720, (i) => i % 2 === 1), () => 291.5, 297)
/** Beads embossed round the bezel band: a light top-left face and a dark shadow side. */
const BEADS_LIGHT = circles(range(144).map((i) => [...polar(C - 0.55, C - 0.55, 279.5, (i / 144) * Math.PI * 2), 1.35]))
const BEADS_DARK = circles(range(144).map((i) => [...polar(C + 0.6, C + 0.6, 279.5, (i / 144) * Math.PI * 2), 1.45]))

const TICKS_MAJOR = radialTicks(C, C, 120, range(120, (i) => i % 10 === 0), () => 234, 262)
const TICKS_MID = radialTicks(C, C, 120, range(120, (i) => i % 5 === 0 && i % 10 !== 0), () => 243, 262)
const TICKS_MINOR = radialTicks(C, C, 120, range(120, (i) => i % 5 !== 0), () => 250, 262)
const TICKS_FINE = radialTicks(C, C, 480, range(480, (i) => i % 4 !== 0), () => 257, 262)
/** 27 nakshatra marks — every third one larger, each with a tiny halo of dots. */
const NAKSHATRAS = circles(range(27).map((i) => [...polar(C, C, 229, (i / 27) * Math.PI * 2), i % 3 === 0 ? 2.8 : 1.7]))
const NAKSHATRA_HALO = circles(
  range(27)
    .filter((i) => i % 3 === 0)
    .flatMap((i) => range(6).map((k) => [...polar(...polar(C, C, 229, (i / 27) * Math.PI * 2), 5.6, (k / 6) * Math.PI * 2), 0.7] as [number, number, number])),
)

/** 12 lotus petals round the face: an outer outline, an inner outline and a centre vein. */
const petal = (tip: number, base: number, w: number): [number, number][] => [
  [C, C - tip],
  [C + w, C - tip + (tip - base) * 0.35],
  [C + w * 0.85, C - base - (tip - base) * 0.25],
  [C, C - base],
  [C - w * 0.85, C - base - (tip - base) * 0.25],
  [C - w, C - tip + (tip - base) * 0.35],
  [C, C - tip],
]
const PETALS = range(12)
  .map((i) => placedCubic(petal(200, 170, 8), i * 30, C, C))
  .join('')
const PETALS_INNER = range(12)
  .map((i) => placedCubic(petal(196, 174, 4.6), i * 30, C, C))
  .join('')
const PETAL_VEINS = radialTicks(C, C, 12, range(12), () => 176, 193)
/** Small four-point stars between the petals. */
const STARS = range(12)
  .map((i) => {
    const [x, y] = polar(C, C, 205, ((i + 0.5) / 12) * Math.PI * 2)
    return `M${x} ${r2(y - 3.2)}L${r2(x + 0.9)} ${r2(y - 0.9)}L${r2(x + 3.2)} ${y}L${r2(x + 0.9)} ${r2(y + 0.9)}L${x} ${r2(y + 3.2)}L${r2(x - 0.9)} ${r2(y + 0.9)}L${r2(x - 3.2)} ${y}L${r2(x - 0.9)} ${r2(y - 0.9)}Z`
  })
  .join('')

/** Guilloché: interlaced waves engine-turned into the face's outer band, like a fine watch dial. */
const GUILLOCHE = range(30)
  .map((k) => {
    let d = ''
    for (let j = 0; j <= 360; j++) {
      const a = (j / 360) * Math.PI * 2
      const r = 158 + 17 * Math.sin(9 * a + (k / 30) * Math.PI * 2)
      const [x, y] = polar(C, C, r, a)
      d += `${j ? 'L' : 'M'}${x} ${y}`
    }
    return d + 'Z'
  })
  .join('')
/** Sunray finish on the face: fine lines radiating from the centre. */
const SUNRAY = radialTicks(C, C, 180, range(180), () => 26, 138)
/** Beaded chapter ring just inside the face's rim. */
const CHAPTER_BEADS = circles(range(96).map((i) => [...polar(C, C, 181.5, (i / 96) * Math.PI * 2), 1.05]))

/**
 * Engraved antique-gold calendar dial — decorative only (aria-hidden).
 *
 * Built as stacked SVG layers so the moving parts (the engraving ring, the
 * counter-turning guilloché and the light sweeping the bezel) rotate as whole
 * HTML layers on the compositor — no per-frame SVG repaint, which keeps phones
 * cool. Motion runs only while `spinning` (on screen, motion allowed, not
 * paused by the guest); everything readable is HTML on top.
 */
export function CalendarDial({ inscription, year, spinning }: { inscription: string; year: number; spinning: boolean }) {
  const id = useId().replace(/:/g, '')
  const text = `${inscription} ✦ ${roman(year)} ✦ `
  // each SVG layer needs its own copy of the gradient, under a unique id
  const gold = (layerId: string) => (
    <linearGradient id={`${id}-gold-${layerId}`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#fbecc4" />
      <stop offset=".3" stopColor="#d9b46e" />
      <stop offset=".55" stopColor="#8f6a33" />
      <stop offset=".78" stopColor="#c99c55" />
      <stop offset="1" stopColor="#f0d79e" />
    </linearGradient>
  )
  const turning = (cls: string) => `${layer} ${spinning ? `${cls} ambient will-change-transform` : ''}`

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {/* 1 · bezel: milled edge, a rounded band of turned gold with embossed beads, lit from the top left */}
      <svg viewBox={VIEW} className={layer} focusable="false">
        <defs>
          {gold('bezel')}
          <radialGradient id={`${id}-shadow`} cx="50%" cy="50%" r="50%">
            <stop offset=".86" stopColor="#000" stopOpacity=".55" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-band`} cx="50%" cy="50%" r="50%">
            <stop offset=".884" stopColor="#2e1f0b" />
            <stop offset=".9" stopColor="#7a5726" />
            <stop offset=".925" stopColor="#d8b169" />
            <stop offset=".945" stopColor="#fbeac0" />
            <stop offset=".962" stopColor="#c99c55" />
            <stop offset=".98" stopColor="#7a5524" />
            <stop offset="1" stopColor="#3e2a10" />
          </radialGradient>
          <linearGradient id={`${id}-light`} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#fff8e2" stopOpacity=".42" />
            <stop offset=".42" stopColor="#fff8e2" stopOpacity="0" />
            <stop offset=".6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".5" />
          </linearGradient>
          <radialGradient id={`${id}-well`} cx="50%" cy="46%" r="52%">
            <stop offset=".7" stopColor="#0b2b22" />
            <stop offset="1" stopColor="#04130e" />
          </radialGradient>
          <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>
        {/* soft shadow under the instrument */}
        <circle cx={C} cy={C + 14} r={300} fill={`url(#${id}-shadow)`} />
        {/* milled coin edge */}
        <circle cx={C} cy={C} r={297.5} fill="#5a3e18" />
        <path d={KNURL_DARK} stroke="#2a1b08" strokeWidth="1.2" />
        <path d={KNURL_LIGHT} stroke="#f3dca6" strokeOpacity=".75" strokeWidth=".8" />
        {/* the rounded band, its turning rings and directional light */}
        <path d={ring(291, 266)} fillRule="evenodd" fill={`url(#${id}-band)`} />
        {[270.5, 274, 284, 287.5].map((rr, i) => (
          <circle key={rr} cx={C} cy={C} r={rr} fill="none" stroke={i % 2 ? '#2a1b08' : '#fff3d0'} strokeOpacity={i % 2 ? 0.28 : 0.22} strokeWidth=".7" />
        ))}
        <path d={BEADS_DARK} fill="#3a280e" fillOpacity=".75" />
        <path d={BEADS_LIGHT} fill="#fff2c8" fillOpacity=".85" />
        <path d={ring(291, 266)} fillRule="evenodd" fill={`url(#${id}-light)`} />
        <circle cx={C} cy={C} r={291} fill="none" stroke={`url(#${id}-gold-bezel)`} strokeWidth="1.6" />
        {/* specular highlights: a broad one top-left, a faint return bottom-right */}
        <path d={arc(282, -1.75, -0.25)} fill="none" stroke="#fffaf0" strokeOpacity=".55" strokeWidth="5" strokeLinecap="round" filter={`url(#${id}-soft)`} />
        <path d={arc(282, -1.3, -0.65)} fill="none" stroke="#ffffff" strokeOpacity=".7" strokeWidth="1.6" strokeLinecap="round" />
        <path d={arc(280, 1.9, 2.6)} fill="none" stroke="#ffe7b0" strokeOpacity=".22" strokeWidth="4" strokeLinecap="round" filter={`url(#${id}-soft)`} />
        {/* stepped bevel down into the well */}
        <circle cx={C} cy={C} r={266} fill="#d9b46e" />
        <circle cx={C} cy={C} r={264.6} fill={`url(#${id}-well)`} />
        <circle cx={C} cy={C} r={265.4} fill="none" stroke="#2a1b08" strokeOpacity=".7" strokeWidth=".8" />
      </svg>

      {/* 2 · light travelling across the bezel */}
      <svg viewBox={VIEW} className={turning('dial-sheen')} focusable="false">
        <defs>
          <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff6dc" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff6dc" stopOpacity=".8" />
            <stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M ${C - 120} ${C - 255} A 280 280 0 0 1 ${C + 120} ${C - 255}`} fill="none" stroke={`url(#${id}-sheen)`} strokeWidth="10" strokeLinecap="round" opacity=".5" />
        <path d={`M ${C + 80} ${C + 268} A 280 280 0 0 1 ${C - 80} ${C + 268}`} fill="none" stroke={`url(#${id}-sheen)`} strokeWidth="6" strokeLinecap="round" opacity=".18" />
      </svg>

      {/* 3 · the turning engraving ring: scale, nakshatras, inscription, lotus */}
      <svg viewBox={VIEW} className={turning('dial-turn')} focusable="false">
        <defs>
          <path id={`${id}-text`} d={`M ${C} ${C - 214} a 214 214 0 1 1 -0.01 0`} />
          <radialGradient id={`${id}-petal`} cx="50%" cy="50%" r="50%">
            <stop offset=".55" stopColor="#d9b46e" stopOpacity="0" />
            <stop offset=".66" stopColor="#d9b46e" stopOpacity=".16" />
          </radialGradient>
        </defs>
        {/* hairline rails of the scale */}
        <circle cx={C} cy={C} r={262} fill="none" stroke="#d5b06d" strokeOpacity=".55" strokeWidth=".8" />
        <circle cx={C} cy={C} r={233} fill="none" stroke="#d5b06d" strokeOpacity=".3" strokeWidth=".6" />
        <circle cx={C} cy={C} r={198} fill="none" stroke="#d5b06d" strokeOpacity=".25" strokeWidth=".6" strokeDasharray="1 3" />
        {/* engraved ticks: a dark cut with a lit edge */}
        <g transform="translate(.7 .7)" stroke="#000" strokeOpacity=".55">
          <path d={TICKS_MAJOR} strokeWidth="1.8" />
          <path d={TICKS_MID} strokeWidth="1.1" />
        </g>
        <path d={TICKS_MAJOR} stroke="#e7c98a" strokeOpacity=".95" strokeWidth="1.6" />
        <path d={TICKS_MID} stroke="#d5b06d" strokeOpacity=".75" strokeWidth="1" />
        <path d={TICKS_MINOR} stroke="#d5b06d" strokeOpacity=".5" strokeWidth=".9" />
        <path d={TICKS_FINE} stroke="#d5b06d" strokeOpacity=".28" strokeWidth=".5" />
        {/* 27 nakshatra marks */}
        <path d={NAKSHATRAS} fill="#f2dcaa" fillOpacity=".9" />
        <path d={NAKSHATRA_HALO} fill="#ecd4a2" fillOpacity=".55" />
        {/* exactly one inscription, spaced to wrap the full ring without overlapping itself */}
        <text fontFamily="'Cormorant Garamond', Georgia, serif" fontSize="15" fill="#000" fillOpacity=".45" transform="translate(.6 .6)">
          <textPath href={`#${id}-text`} textLength={Math.round(2 * Math.PI * 214 * 0.985)} lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
        <text fontFamily="'Cormorant Garamond', Georgia, serif" fontSize="15" fill="#f0d9a8" fillOpacity=".82">
          <textPath href={`#${id}-text`} textLength={Math.round(2 * Math.PI * 214 * 0.985)} lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
        {/* lotus petals, double outlined and veined, with stars between */}
        <path d={PETALS} fill={`url(#${id}-petal)`} stroke="#e2c27f" strokeOpacity=".8" strokeWidth="1" />
        <path d={PETALS_INNER} fill="none" stroke="#d5b06d" strokeOpacity=".45" strokeWidth=".6" />
        <path d={PETAL_VEINS} stroke="#d5b06d" strokeOpacity=".4" strokeWidth=".5" />
        <path d={STARS} fill="#f0d9a8" fillOpacity=".75" />
      </svg>

      {/* 4 · emerald enamel face with a sunray finish */}
      <svg viewBox={VIEW} className={layer} focusable="false">
        <defs>
          <radialGradient id={`${id}-face`} cx="50%" cy="40%" r="64%">
            <stop offset="0" stopColor="#1a5442" />
            <stop offset=".55" stopColor="#0d3328" />
            <stop offset="1" stopColor="#05170f" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r={186} fill={`url(#${id}-face)`} />
        <path d={SUNRAY} stroke="#e8cf98" strokeOpacity=".05" strokeWidth=".7" />
      </svg>

      {/* 5 · guilloché engine-turned into the face, turning slowly the other way */}
      <svg viewBox={VIEW} className={turning('dial-counter')} focusable="false">
        <path d={GUILLOCHE} fill="none" stroke="#e5c98f" strokeOpacity=".11" strokeWidth=".6" />
      </svg>

      {/* 6 · rim, beaded chapter ring, gem studs and the crystal's reflection */}
      <svg viewBox={VIEW} className={layer} focusable="false">
        <defs>
          {gold('face')}
          <radialGradient id={`${id}-depth`} cx="50%" cy="50%" r="50%">
            <stop offset=".86" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".5" />
          </radialGradient>
          <linearGradient id={`${id}-glass`} x1="0.15" y1="0" x2="0.65" y2="0.75">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".13" />
            <stop offset=".5" stopColor="#ffffff" stopOpacity=".03" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-gemL`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff6d8" />
            <stop offset="1" stopColor="#d9b46e" />
          </linearGradient>
          <linearGradient id={`${id}-gemD`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b88a45" />
            <stop offset="1" stopColor="#5e4119" />
          </linearGradient>
        </defs>
        <circle cx={C} cy={C} r={186} fill={`url(#${id}-depth)`} />
        <circle cx={C} cy={C} r={186} fill="none" stroke={`url(#${id}-gold-face)`} strokeWidth="2.4" />
        <circle cx={C} cy={C} r={177.5} fill="none" stroke="#d5b06d" strokeOpacity=".35" strokeWidth=".8" />
        <path d={CHAPTER_BEADS} fill="#e7c98a" fillOpacity=".55" />
        {/* cardinal studs: faceted gold gems with a glint */}
        {[0, 90, 180, 270].map((deg) => (
          <g key={deg} transform={`rotate(${deg} ${C} ${C})`}>
            <path d={`M ${C} ${C - 196} l 7 9 l -7 9 l -7 -9 Z`} fill={`url(#${id}-gemD)`} />
            <path d={`M ${C} ${C - 196} l 7 9 l -7 0 Z M ${C} ${C - 196} l -7 9 l 7 0 Z`} fill={`url(#${id}-gemL)`} />
            <circle cx={C - 2} cy={C - 191} r=".9" fill="#fff" />
          </g>
        ))}
        {/* the crystal over the face catches the light */}
        <path d={`M ${C - 168} ${C - 40} A 186 186 0 0 1 ${C + 60} ${C - 176} A 230 230 0 0 0 ${C - 168} ${C - 40} Z`} fill={`url(#${id}-glass)`} />
        <path d={arc(184, -1.45, -0.55)} fill="none" stroke="#ffffff" strokeOpacity=".22" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  )
}
