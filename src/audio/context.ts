import { createContext } from 'react'

/**
 * idle     — never started (nothing downloaded yet)
 * loading  — fetching / buffering after the guest pressed Play
 * playing  — audibly playing (or playing muted)
 * paused   — paused by the guest, or by the browser / operating system
 * blocked  — the browser refused to start playback; another tap on Play will
 * error    — the audio file could not be loaded or decoded
 */
export type SoundtrackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'blocked' | 'error'

export interface SoundtrackValue {
  status: SoundtrackStatus
  muted: boolean
  /** 0–1 */
  volume: number
  /** false on iOS, where a page cannot set the volume (device buttons only). */
  volumeAdjustable: boolean
  play: () => void
  pause: () => void
  toggle: () => void
  setMuted: (muted: boolean) => void
  setVolume: (volume: number) => void
  retry: () => void
}

export const SoundtrackContext = createContext<SoundtrackValue | null>(null)
