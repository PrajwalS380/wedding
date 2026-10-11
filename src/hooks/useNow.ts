import { useEffect, useState } from 'react'

/**
 * QA-only clock override (development builds): `?now=2026-11-15T09:30` starts
 * the page's clock at that local time and lets it tick forward from there.
 */
function initialOffset(): number {
  if (!import.meta.env.DEV) return 0
  const raw = new URLSearchParams(window.location.search).get('now')
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return Number.isFinite(t) ? t - Date.now() : 0
}

const OFFSET = typeof window !== 'undefined' ? initialOffset() : 0

export const currentTime = (): Date => new Date(Date.now() + OFFSET)

/**
 * The current time, re-rendered on each whole second while `active`.
 * The interval is aligned to the second boundary and always cleaned up.
 */
export function useNow(active: boolean): Date {
  const [now, setNow] = useState(currentTime)
  useEffect(() => {
    if (!active) return
    let interval = 0
    // refresh straight away (next frame) after being inactive, then tick on each second
    const raf = requestAnimationFrame(() => setNow(currentTime()))
    const align = window.setTimeout(() => {
      setNow(currentTime())
      interval = window.setInterval(() => setNow(currentTime()), 1000)
    }, 1000 - (currentTime().getTime() % 1000))
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(align)
      window.clearInterval(interval)
    }
  }, [active])
  return now
}
