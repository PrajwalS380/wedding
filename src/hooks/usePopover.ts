import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Small disclosure popover: closes on an outside tap/click, on Escape (focus
 * returns to the trigger, and the key stops there so it never also dismisses
 * a surrounding dialog such as the intro), and when the page scrolls.
 */
export function usePopover<T extends HTMLElement = HTMLButtonElement>() {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<T>(null)

  const close = useCallback((returnFocus = false) => {
    setOpen(false)
    if (returnFocus) requestAnimationFrame(() => trigger.current?.focus())
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      close(true)
    }
    const startY = window.scrollY
    const onScroll = () => Math.abs(window.scrollY - startY) > 24 && close()
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open, close])

  return { open, setOpen, close, root, trigger }
}
