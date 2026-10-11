import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface MotionContextValue {
  /** Operating-system "reduce motion" preference. */
  prefersReducedMotion: boolean
  /** Guest paused decorative motion with the on-page control. */
  paused: boolean
  /** True when decorative/ambient motion may run. */
  ambientMotion: boolean
  togglePaused: () => void
}

const MotionContext = createContext<MotionContextValue | null>(null)

const QUERY = '(prefers-reduced-motion: reduce)'

// eslint-disable-next-line react-refresh/only-export-components
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [paused, setPaused] = useState(false)
  const ambientMotion = !prefersReducedMotion && !paused

  useEffect(() => {
    document.documentElement.dataset.motion = ambientMotion ? 'on' : 'off'
  }, [ambientMotion])

  const togglePaused = useCallback(() => setPaused((p) => !p), [])

  const value = useMemo(
    () => ({ prefersReducedMotion, paused, ambientMotion, togglePaused }),
    [prefersReducedMotion, paused, ambientMotion, togglePaused],
  )
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMotion(): MotionContextValue {
  const ctx = useContext(MotionContext)
  if (!ctx) throw new Error('useMotion must be used inside <MotionProvider>')
  return ctx
}
