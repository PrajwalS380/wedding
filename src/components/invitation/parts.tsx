/**
 * Pieces of the invitation letter: the foil gradient its ornaments share, the marigold-and-mango-leaf thorana
 * printed across its head, the paisley borders down its sides, the torn deckle of its edges, the medallion
 * between the names, the arched date tiles, and the petals and motes of light around it.
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { rng } from '../../lib/random'
import { PetalShape } from '../ui/Ornaments'
import { NameJoiner } from '../ui/Amp'

/** The gold-foil gradient (referenced as url(#inv-foil) by `.foil-svg`). Render once per page. */
export function FoilDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="inv-foil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7a5422" />
          <stop offset=".3" stopColor="#c4994c" />
          <stop offset=".45" stopColor="#f0d690" />
          <stop offset=".6" stopColor="#a87a34" />
          <stop offset="1" stopColor="#6e4a1c" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** A garland of mango leaves and marigolds swagged across the head of the letter, printed in colour. */
export function Thorana({ className = '', ...rest }: { className?: string } & Record<`data-${string}`, unknown>) {
  const items = useMemo(() => {
    const N = 15
    const sag = (x: number) => 5 + 15 * (1 - ((x - 180) / 180) ** 2)
    return Array.from({ length: N }, (_, i) => {
      const x = 12 + (i * 336) / (N - 1)
      const y = sag(x)
      const slope = (-30 * (x - 180)) / (180 * 180)
      return { x, y, leaf: i % 2 === 0, rot: (Math.atan(slope) * 180) / Math.PI + (i % 4 === 0 ? -5 : 5) }
    })
  }, [])
  return (
    <svg viewBox="0 0 360 62" className={className} aria-hidden="true" focusable="false" {...rest}>
      <defs>
        <linearGradient id="inv-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5f8f37" />
          <stop offset=".55" stopColor="#3f6e27" />
          <stop offset="1" stopColor="#2b5220" />
        </linearGradient>
        <radialGradient id="inv-marigold" cx="42%" cy="38%" r="70%">
          <stop offset="0" stopColor="#ffd06a" />
          <stop offset=".55" stopColor="#f39a25" />
          <stop offset="1" stopColor="#c4600d" />
        </radialGradient>
      </defs>
      <path d="M0 4 Q180 36 360 4" fill="none" stroke="#8a6a3c" strokeWidth=".8" opacity=".7" />
      {items.map(({ x, y, leaf, rot }, i) =>
        leaf ? (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
            <path d="M0 0 C6.5 8 7.5 21 0 36 C-7.5 21 -6.5 8 0 0 Z" fill="url(#inv-leaf)" />
            <path d="M0 2 L0 33" stroke="#24461a" strokeWidth=".7" opacity=".7" />
            {[8, 14, 20, 26].map((v) => (
              <path key={v} d={`M0 ${v} l4 -3 M0 ${v} l-4 -3`} stroke="#9cc06a" strokeWidth=".35" opacity=".55" />
            ))}
          </g>
        ) : (
          <g key={i} transform={`translate(${x} ${y + 6})`}>
            {Array.from({ length: 12 }, (_, k) => (
              <circle key={k} cx={Math.cos((k / 12) * Math.PI * 2) * 5.6} cy={Math.sin((k / 12) * Math.PI * 2) * 5.6} r="2.7" fill="url(#inv-marigold)" />
            ))}
            <circle r="5.6" fill="url(#inv-marigold)" />
            {Array.from({ length: 7 }, (_, k) => (
              <circle key={k} cx={Math.cos((k / 7) * Math.PI * 2) * 2.6} cy={Math.sin((k / 7) * Math.PI * 2) * 2.6} r="1.7" fill="#ffc451" opacity=".85" />
            ))}
            <circle r="1.4" fill="#b8540c" />
          </g>
        ),
      )}
    </svg>
  )
}

/** The medallion between the couple's names: a gold ring holding the ampersand (or the language's word). */
export function JoinerMedallion() {
  return (
    <span className="relative my-1 flex items-center justify-center gap-3" aria-hidden="true">
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#a9844b] xs:w-14" />
      <span className="grid h-12 min-w-12 place-items-center rounded-full border border-[#b48a44] px-2 shadow-[inset_0_0_0_3px_rgba(255,250,238,.7),inset_0_0_0_4px_rgba(180,138,68,.5),0_2px_6px_-2px_rgba(90,60,20,.4)]">
        <NameJoiner className="foil text-[1.7rem] leading-none" wordClassName="!text-[1.05rem] font-medium" />
      </span>
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#a9844b] xs:w-14" />
    </span>
  )
}

/** One of the two days, on an arched tile with a double gold rule. */
export function DateTile({ day, suffix }: { day: number; suffix: string }) {
  return (
    <span className="inv-card inv-arch relative grid w-[5.4rem] place-items-center px-2 pb-3 pt-6 xs:w-[6rem]">
      <span className="inv-frame inv-arch" />
      <span className="relative font-display text-[2.9rem] font-medium leading-none text-ink xs:text-[3.2rem]">
        {day}
        <sup className="ml-0.5 align-super text-[0.36em] font-semibold text-[#8a6326]">{suffix}</sup>
      </span>
    </span>
  )
}

/** Petals showering down over the letter once it has opened. */
export function PetalShower({ count = 26, seed = 5 }: { count?: number; seed?: number }) {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const id = window.setTimeout(() => setOn(false), 7500)
    return () => window.clearTimeout(id)
  }, [])
  const petals = useMemo(() => {
    const r = rng(seed)
    const kinds = ['rose', 'marigold', 'jasmine', 'rose', 'marigold'] as const
    return Array.from({ length: count }, (_, i) => ({
      kind: kinds[i % kinds.length],
      left: `${2 + r() * 96}%`,
      size: 11 + r() * 12,
      duration: 3.8 + r() * 2.6,
      delay: r() * 1.4,
      drift: `${(r() - 0.5) * 30}vw`,
      spin: `${200 + r() * 420}deg`,
      sway: 1.6 + r() * 1.6,
    }))
  }, [count, seed])
  if (!on) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-24 bottom-0 z-[6] overflow-hidden" aria-hidden="true">
      {petals.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block will-change-transform"
          style={
            {
              left: p.left,
              width: p.size,
              height: p.size * 1.25,
              animation: `petal-fall ${p.duration}s cubic-bezier(.4,.1,.6,1) ${p.delay}s both`,
              '--petal-drift': p.drift,
              '--petal-spin': p.spin,
              '--petal-opacity': 0.95,
            } as CSSProperties
          }
        >
          <span className="block h-full w-full" style={{ animation: `petal-sway ${p.sway}s ease-in-out infinite` }}>
            <PetalShape kind={p.kind} className="h-full w-full drop-shadow-[0_3px_4px_rgba(0,0,0,.35)]" />
          </span>
        </span>
      ))}
    </div>
  )
}

/** Motes of dust drifting in the candlelight round the tied scroll. */
export function Motes({ count = 14, seed = 9 }: { count?: number; seed?: number }) {
  const motes = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: count }, () => ({
      left: `${8 + r() * 84}%`,
      top: `${r() * 100}%`,
      size: 1.5 + r() * 2.5,
      duration: 6 + r() * 7,
      delay: -r() * 10,
      x: `${(r() - 0.5) * 40}px`,
      y: `${-20 - r() * 50}px`,
      o: 0.4 + r() * 0.5,
    }))
  }, [count, seed])
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
      {motes.map((m, i) => (
        <span
          key={i}
          className="ambient absolute rounded-full bg-[#ffd9a0] shadow-[0_0_6px_2px_rgba(255,200,120,.45)]"
          style={
            {
              left: m.left,
              top: m.top,
              width: m.size,
              height: m.size,
              animation: `mote-float ${m.duration}s ease-in-out ${m.delay}s infinite`,
              '--mote-x': m.x,
              '--mote-y': m.y,
              '--mote-opacity': m.o,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
