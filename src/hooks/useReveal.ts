import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { RefObject } from 'react'
import { useMotion } from './motion'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export const EASE = {
  silk: 'expo.out',
  soft: 'power3.out',
  curtain: 'power2.inOut',
} as const

/**
 * Scroll-triggered entrance for every `[data-reveal]` element inside `scope`.
 * Content is fully visible in the markup; GSAP only animates *from* a hidden
 * state once mounted, so if JavaScript or GSAP fails nothing stays invisible.
 *
 * data-reveal="up" (default) | "fade" | "left" | "right" | "scale"
 * data-reveal-delay="0.2"
 */
export function useReveal(scope: RefObject<HTMLElement | null>) {
  const { prefersReducedMotion } = useMotion()
  useGSAP(
    () => {
      if (prefersReducedMotion) return
      const items = gsap.utils.toArray<HTMLElement>('[data-reveal]', scope.current)
      items.forEach((el) => {
        const kind = el.dataset.reveal || 'up'
        // opacity (not autoAlpha/visibility) keeps content in the accessibility tree
        const from: gsap.TweenVars = { opacity: 0 }
        if (kind === 'up') from.y = 34
        if (kind === 'left') from.x = -40
        if (kind === 'right') from.x = 40
        if (kind === 'scale') from.scale = 0.94
        gsap.from(el, {
          ...from,
          duration: kind === 'fade' ? 1.4 : 1.15,
          delay: Number(el.dataset.revealDelay || 0),
          ease: EASE.silk,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        })
      })
    },
    { scope, dependencies: [prefersReducedMotion] },
  )
}

export { gsap, ScrollTrigger }
