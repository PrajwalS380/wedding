import { useEffect, useState } from 'react'
import { navigationHeld } from '../lib/browser'

/** Returns the id of the section currently occupying the middle of the viewport. */
export function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [ids])
  return active
}

/** Scroll direction + whether the page has left the very top. */
export function useScrollState(threshold = 40) {
  const [state, setState] = useState({ scrolled: false, hidden: false })
  useEffect(() => {
    let last = window.scrollY
    let ticking = false
    const update = () => {
      const y = window.scrollY
      const down = y > last + 4
      const up = y < last - 4
      setState((s) => {
        const next = {
          scrolled: y > threshold,
          hidden: y > 480 && !navigationHeld() ? (down ? true : up ? false : s.hidden) : false,
        }
        return next.scrolled === s.scrolled && next.hidden === s.hidden ? s : next
      })
      last = y
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return state
}
