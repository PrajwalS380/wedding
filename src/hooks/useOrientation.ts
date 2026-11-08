import { useEffect, useState } from 'react'
import type { SceneArt, SceneVariant } from '../data/sceneArt'

const LANDSCAPE = '(orientation: landscape)'
export type Orientation = 'portrait' | 'landscape'

/** Portrait (phones, upright tablets) or landscape (wider screens) — picks which render is shown. */
export function useOrientation(): Orientation {
  const [o, setO] = useState<Orientation>(() => (window.matchMedia?.(LANDSCAPE).matches ? 'landscape' : 'portrait'))
  useEffect(() => {
    const mq = window.matchMedia(LANDSCAPE)
    const on = () => setO(mq.matches ? 'landscape' : 'portrait')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return o
}

export function useSceneVariant(art: SceneArt): SceneVariant {
  return art[useOrientation()]
}
