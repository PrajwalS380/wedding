/**
 * Illustrated (non-photographic) Magical Moments panels.
 * CONCEPTUAL ARTWORK — drawn in code, never presented as photographs.
 */
import { LampMotif, PetalShape } from '../ui/Ornaments'

function KalashMotif({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 180" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ka-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3d79c" />
          <stop offset=".45" stopColor="#c9984f" />
          <stop offset="1" stopColor="#6e4a20" />
        </linearGradient>
        <radialGradient id="ka-coconut" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#a8723f" />
          <stop offset="1" stopColor="#4a2c14" />
        </radialGradient>
      </defs>
      {/* mango leaves */}
      {[-58, -30, 0, 30, 58].map((r) => (
        <path
          key={r}
          transform={`rotate(${r} 60 100)`}
          d="M60 100 C50 82 50 62 60 44 C70 62 70 82 60 100 Z"
          fill={r % 60 === 0 ? '#2f6b47' : '#1f4f34'}
          stroke="#d5b06d"
          strokeWidth=".6"
        />
      ))}
      <ellipse cx="60" cy="80" rx="15" ry="19" fill="url(#ka-coconut)" />
      <path d="M56 62 Q60 54 64 62" fill="none" stroke="#6e4a20" strokeWidth="1.5" />
      {/* pot */}
      <ellipse cx="60" cy="100" rx="23" ry="5" fill="url(#ka-brass)" stroke="#f6e2b4" strokeWidth=".6" />
      <path d="M44 103 H76 L73 112 H47 Z" fill="url(#ka-brass)" />
      <path d="M32 112 C10 114 8 152 30 166 C44 176 76 176 90 166 C112 152 110 114 88 112 Z" fill="url(#ka-brass)" stroke="#f6e2b4" strokeWidth=".6" />
      <path d="M22 134 Q60 146 98 134" fill="none" stroke="#7d2535" strokeWidth="3" />
      {[30, 42, 54, 66, 78, 90].map((x) => (
        <circle key={x} cx={x} cy={136 + Math.sin((x - 22) / 12) * 2} r="1.5" fill="#f6e2b4" />
      ))}
      <ellipse cx="44" cy="128" rx="5" ry="14" fill="#fff6dc" opacity=".25" transform="rotate(18 44 128)" />
    </svg>
  )
}

export function BlessingsArt() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(70%_55%_at_50%_42%,#6b2a16_0%,#3a140d_45%,#140806_100%)]">
      <div className="absolute left-1/2 top-[38%] h-[70%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,200,120,.35),transparent)]" />
      <svg viewBox="0 0 200 250" className="absolute inset-0 h-full w-full text-gold/35" aria-hidden="true">
        <path d="M30 250 V110 Q30 40 100 22 Q170 40 170 110 V250" fill="none" stroke="currentColor" strokeWidth=".8" />
        <path d="M40 250 V112 Q40 52 100 34 Q160 52 160 112 V250" fill="none" stroke="currentColor" strokeWidth=".5" />
      </svg>
      <LampMotif className="absolute bottom-[8%] left-1/2 h-[72%] w-auto -translate-x-1/2 text-gold" />
      {[
        { k: 'rose', l: '18%', t: '20%', r: -20, s: 18 },
        { k: 'marigold', l: '76%', t: '28%', r: 35, s: 16 },
        { k: 'jasmine', l: '26%', t: '58%', r: 10, s: 14 },
        { k: 'rose', l: '70%', t: '66%', r: 60, s: 15 },
        { k: 'marigold', l: '40%', t: '12%', r: 120, s: 12 },
      ].map((p, i) => (
        <PetalShape
          key={i}
          kind={p.k as 'rose' | 'marigold' | 'jasmine'}
          className="absolute"
          style={{ left: p.l, top: p.t, width: p.s, height: p.s * 1.25, transform: `rotate(${p.r}deg)` }}
        />
      ))}
    </div>
  )
}

export function FamiliesArt() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(70%_60%_at_50%_45%,#5a1524_0%,#2a0a12_55%,#0d0406_100%)]">
      <div className="absolute left-1/2 top-[46%] h-[50%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(240,169,74,.3),transparent)]" />
      {/* one shared flame between the two families' kalash */}
      <svg viewBox="0 0 200 250" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="fa-flame-glow">
            <stop offset="0" stopColor="#ffe3a3" stopOpacity=".85" />
            <stop offset=".4" stopColor="#f0a94a" stopOpacity=".25" />
            <stop offset="1" stopColor="#f0a94a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="fa-flame" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff9d3a" />
            <stop offset=".55" stopColor="#ffd77a" />
            <stop offset="1" stopColor="#fff6dc" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="92" r="46" fill="url(#fa-flame-glow)" />
        <path className="ambient" style={{ transformOrigin: '100px 112px', animation: 'flame-flicker 1.9s ease-in-out infinite' }} d="M100 112 C92 100 95 86 100 72 C105 86 108 100 100 112 Z" fill="url(#fa-flame)" />
        <path d="M82 116 Q100 128 118 116 L114 122 Q100 130 86 122 Z" fill="#c9984f" stroke="#f6e2b4" strokeWidth=".5" />
        <path d="M72 64 C80 54 90 52 100 58 C110 52 120 54 128 64" fill="none" stroke="#d5b06d" strokeWidth=".9" strokeOpacity=".7" />
        {/* marigold garland joining the two kalash */}
        <path d="M44 150 Q100 196 156 150" fill="none" stroke="#e39a32" strokeWidth="5" strokeDasharray="0.1 6.5" strokeLinecap="round" />
        <path d="M44 154 Q100 200 156 154" fill="none" stroke="#fbf4e4" strokeWidth="3" strokeDasharray="0.1 6" strokeLinecap="round" opacity=".9" />
      </svg>
      <KalashMotif className="absolute bottom-[10%] left-[6%] h-[52%] w-auto" />
      <KalashMotif className="absolute bottom-[10%] right-[6%] h-[52%] w-auto" />
      <div className="absolute inset-x-0 bottom-0 h-[14%] bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  )
}
