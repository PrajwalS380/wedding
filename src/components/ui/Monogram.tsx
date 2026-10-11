import { wedding } from '../../data/wedding'

interface MonogramProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Render without the arch frame (compact nav usage). */
  bare?: boolean
}

const sizes = {
  sm: { box: 'h-11 w-11', letter: 'text-[1.3rem]', amp: 'text-[1rem]' },
  md: { box: 'h-20 w-20', letter: 'text-[2.3rem]', amp: 'text-[1.6rem]' },
  lg: { box: 'h-40 w-32 xs:h-48 xs:w-40', letter: 'text-[3.6rem] xs:text-[4.4rem]', amp: 'text-[2rem] xs:text-[2.4rem]' },
}

/** V ❦ D monogram set in an arched temple frame. */
export function Monogram({ size = 'md', className = '', bare = false }: MonogramProps) {
  const s = sizes[size]
  const { first, second } = wedding.couple.monogram
  return (
    <span className={`relative inline-flex items-center justify-center ${s.box} ${className}`} aria-hidden="true">
      {!bare && (
        <svg viewBox="0 0 80 100" className="absolute inset-0 h-full w-full text-gold" fill="none">
          <path
            d="M6 98 V44 C6 22 22 6 40 4 C58 6 74 22 74 44 V98"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M11 98 V45 C11 26 24 12 40 10 C56 12 69 26 69 45 V98"
            stroke="currentColor"
            strokeOpacity=".45"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <path d="M40 1 l2.2 3 l-2.2 3 l-2.2 -3 Z" fill="currentColor" />
        </svg>
      )}
      <span className={`relative flex items-baseline font-display leading-none text-ivory ${size === 'lg' ? 'mt-6' : ''}`}>
        <span className={`${s.letter} font-medium`}>{first}</span>
        <span className={`font-display italic ${s.amp} mx-[0.08em] text-gold`}>&amp;</span>
        <span className={`${s.letter} font-medium`}>{second}</span>
      </span>
    </span>
  )
}
