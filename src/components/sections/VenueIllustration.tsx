/**
 * CONCEPTUAL ARTWORK — an imagined, illuminated wedding hall in gold line-art.
 * It is deliberately stylised so it cannot be mistaken for a photograph of
 * Bapuji Samudhaya Bhavan. Replace via `wedding.venue.photo` when a real,
 * family-supplied photograph is available.
 */
const STARS = [
  [60, 40], [140, 90], [210, 30], [300, 70], [380, 24], [470, 58], [540, 30], [610, 84], [700, 40], [760, 110],
  [90, 150], [250, 140], [560, 150], [680, 170], [30, 210], [770, 230],
]

const LIGHTS_ROOF = Array.from({ length: 28 }, (_, i) => i)

export function VenueIllustration({ className = '' }: { className?: string }) {
  const gold = '#D5B06D'
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-labelledby="venue-art-title">
      <title id="venue-art-title">Conceptual illustration of an illuminated wedding hall at night (not a photograph of the venue)</title>
      <defs>
        <linearGradient id="v-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#030f0b" />
          <stop offset=".5" stopColor="#0b3026" />
          <stop offset=".72" stopColor="#1e3a26" />
          <stop offset=".8" stopColor="#3b3519" />
          <stop offset="1" stopColor="#1a1408" />
        </linearGradient>
        <radialGradient id="v-halo" cx="50%" cy="62%" r="55%">
          <stop offset="0" stopColor="#ffbe6e" stopOpacity=".42" />
          <stop offset=".5" stopColor="#d58a3a" stopOpacity=".12" />
          <stop offset="1" stopColor="#d58a3a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="v-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0c8" />
          <stop offset=".45" stopColor="#ffc46b" />
          <stop offset="1" stopColor="#d9792c" />
        </linearGradient>
        <linearGradient id="v-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#173f31" />
          <stop offset="1" stopColor="#0a241b" />
        </linearGradient>
        <linearGradient id="v-path" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c98b46" stopOpacity=".55" />
          <stop offset="1" stopColor="#3a2412" stopOpacity=".2" />
        </linearGradient>
        <radialGradient id="v-lamp">
          <stop offset="0" stopColor="#fff1c9" />
          <stop offset=".3" stopColor="#ffb256" stopOpacity=".8" />
          <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
        </radialGradient>
        <filter id="v-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width="800" height="600" fill="url(#v-sky)" />
      {STARS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 ? 0.9 : 1.4} fill="#f6ead5" opacity={0.35 + (i % 4) * 0.12} />
      ))}
      <ellipse cx="400" cy="380" rx="420" ry="230" fill="url(#v-halo)" />

      {/* distant hills */}
      <path d="M0 418 Q120 382 240 404 T480 394 T800 408 V600 H0 Z" fill="#06180f" />

      {/* building — wings */}
      <g stroke={gold} strokeWidth="1.1" strokeLinejoin="round">
        <rect x="128" y="302" width="176" height="140" fill="url(#v-wall)" />
        <rect x="496" y="302" width="176" height="140" fill="url(#v-wall)" />
        <rect x="120" y="290" width="192" height="12" fill="#0d2a21" />
        <rect x="488" y="290" width="192" height="12" fill="#0d2a21" />
        {/* central block */}
        <rect x="304" y="244" width="192" height="198" fill="url(#v-wall)" />
        <rect x="296" y="230" width="208" height="14" fill="#0d2a21" />
        <path d="M352 230 Q400 168 448 230" fill="#0d2a21" />
        <path d="M392 182 Q400 170 408 182 Q404 190 400 190 Q396 190 392 182 Z" fill="#0d2a21" />
        <path d="M400 170 V156" />
      </g>
      <circle cx="400" cy="154" r="2.4" fill={gold} />

      {/* parapet merlons */}
      <g fill="#0d2a21" stroke={gold} strokeWidth=".8">
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={`l${i}`} x={124 + i * 16} y={282} width="8" height="8" />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={`r${i}`} x={492 + i * 16} y={282} width="8" height="8" />
        ))}
      </g>

      {/* glowing arched windows */}
      {[150, 202, 254, 518, 570, 622].map((x) => (
        <g key={x}>
          <rect x={x - 6} y={336} width={44} height={84} fill="#ffb256" opacity=".22" filter="url(#v-soft)" />
          <path d={`M${x} 412 V356 Q${x + 16} 332 ${x + 32} 356 V412 Z`} fill="url(#v-window)" stroke={gold} strokeWidth="1" />
          <path d={`M${x + 16} 344 V412 M${x} 380 H${x + 32}`} stroke="#8a5a22" strokeWidth=".8" opacity=".7" />
        </g>
      ))}

      {/* portico columns and cusped arch entrance */}
      <rect x="350" y="300" width="100" height="142" fill="#ffb256" opacity=".28" filter="url(#v-soft)" />
      <path d="M362 442 V350 Q362 312 400 300 Q438 312 438 350 V442 Z" fill="url(#v-window)" stroke={gold} strokeWidth="1.2" />
      <path d="M372 442 V354 Q372 322 400 312 Q428 322 428 354 V442" fill="none" stroke="#8a5a22" strokeWidth=".9" opacity=".6" />
      <g stroke={gold} strokeWidth="1.1" fill="#0d2a21">
        {[316, 340, 452, 476].map((x) => (
          <g key={x}>
            <rect x={x} y={300} width="8" height="142" />
            <rect x={x - 3} y={294} width="14" height="6" />
            <rect x={x - 3} y={436} width="14" height="6" />
          </g>
        ))}
      </g>
      <rect x="330" y="262" width="140" height="22" fill="none" stroke={gold} strokeWidth=".9" opacity=".8" />
      <path d="M340 273 H460" stroke={gold} strokeWidth=".6" strokeDasharray="2 4" opacity=".7" />

      {/* festoon lights */}
      <g>
        {LIGHTS_ROOF.map((i) => {
          const t = i / (LIGHTS_ROOF.length - 1)
          const x = 120 + t * 560
          const y = 288 + Math.sin(t * Math.PI * 6) * 4 + 6
          return <circle key={i} cx={x} cy={y} r="1.8" fill={i % 2 ? '#ffd27a' : '#ffefc4'} />
        })}
        <path d="M400 186 Q300 230 128 290" fill="none" stroke={gold} strokeWidth=".5" opacity=".5" />
        <path d="M400 186 Q500 230 672 290" fill="none" stroke={gold} strokeWidth=".5" opacity=".5" />
        {Array.from({ length: 9 }, (_, i) => {
          const t = (i + 1) / 10
          const lx = 400 - t * 272
          const rx = 400 + t * 272
          const y = 186 + t * 104 + Math.sin(t * Math.PI) * 22
          return (
            <g key={i}>
              <circle cx={lx} cy={y} r="1.7" fill="#ffe2a0" />
              <circle cx={rx} cy={y} r="1.7" fill="#ffe2a0" />
            </g>
          )
        })}
      </g>

      {/* steps */}
      <g fill="#0f2c22" stroke={gold} strokeWidth=".8">
        <rect x="336" y="442" width="128" height="7" />
        <rect x="328" y="449" width="144" height="7" />
        <rect x="320" y="456" width="160" height="7" />
      </g>

      {/* ground + lit path */}
      <rect x="0" y="442" width="800" height="158" fill="#04130e" />
      <path d="M332 463 H468 L600 600 H200 Z" fill="url(#v-path)" />
      <path d="M332 463 L200 600 M468 463 L600 600" stroke={gold} strokeWidth=".7" opacity=".55" />

      {/* path lamps */}
      {[
        [318, 478, 1],
        [482, 478, 1],
        [296, 506, 1.25],
        [504, 506, 1.25],
        [266, 540, 1.55],
        [534, 540, 1.55],
        [226, 584, 1.95],
        [574, 584, 1.95],
      ].map(([x, y, s], i) => (
        <g key={i}>
          <circle cx={x} cy={y - 6 * s} r={14 * s} fill="url(#v-lamp)" opacity=".85" />
          <path d={`M${x - 5 * s} ${y} Q${x} ${y + 4 * s} ${x + 5 * s} ${y} Z`} fill="#8a4a26" />
          <path d={`M${x} ${y - 1} Q${x - 2 * s} ${y - 5 * s} ${x} ${y - 9 * s} Q${x + 2 * s} ${y - 5 * s} ${x} ${y - 1} Z`} fill="#ffd27a" />
        </g>
      ))}

      {/* hedges */}
      <g fill="#071d15" stroke={gold} strokeWidth=".6" strokeOpacity=".35">
        {[150, 196, 242, 288, 512, 558, 604, 650].map((x) => (
          <ellipse key={x} cx={x} cy={446} rx="26" ry="11" />
        ))}
      </g>

      {/* coconut palms */}
      {[
        { x: 30, flip: 1 },
        { x: 770, flip: -1 },
      ].map(({ x, flip }) => (
        <g key={x} transform={`translate(${x} 60) scale(${flip * 0.82} 0.9)`} fill="none" stroke="#061712" strokeLinecap="round">
          <path d="M0 600 C 6 520 -4 420 18 300" strokeWidth="12" />
          <path d="M0 600 C 6 520 -4 420 18 300" strokeWidth="1" stroke={gold} strokeOpacity=".35" />
          {[
            'M18 300 C 60 270 100 280 128 314',
            'M18 300 C 54 250 92 236 126 240',
            'M18 300 C 30 246 52 214 80 196',
            'M18 300 C -6 250 -30 232 -60 228',
            'M18 300 C -18 282 -48 294 -74 330',
            'M18 300 C 10 260 0 236 -12 214',
          ].map((d, i) => (
            <g key={i}>
              <path d={d} strokeWidth="7" />
              <path d={d} strokeWidth=".8" stroke={gold} strokeOpacity=".3" />
            </g>
          ))}
        </g>
      ))}

      {/* fireflies */}
      {[
        [110, 470], [180, 520], [640, 500], [700, 460], [420, 520], [360, 560], [560, 470],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="#ffe2a0" opacity=".7" />
      ))}
    </svg>
  )
}
