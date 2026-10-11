import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SOUNDTRACK_SRC } from '../data/site'
import { useI18n } from '../i18n/useI18n'
import { SoundtrackContext, type SoundtrackStatus } from './context'

const PREF_KEY = 'wr:music'
const FADE_IN_MS = 1800
const FADE_OUT_MS = 450

interface Prefs {
  volume: number
  muted: boolean
}

/** Only the guest's volume / mute choice is remembered — never playback itself (no autoplay). */
function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) ?? 'null') as Partial<Prefs> | null
    if (raw && typeof raw.volume === 'number' && raw.volume >= 0 && raw.volume <= 1) return { volume: raw.volume, muted: Boolean(raw.muted) }
  } catch {
    /* storage unavailable or malformed — use defaults */
  }
  return { volume: 0.6, muted: false }
}

function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
  } catch {
    /* not persisted — fine */
  }
}

/** iOS ignores `audio.volume` (device buttons only); detect it once. */
function canSetVolume(): boolean {
  try {
    const probe = document.createElement('audio')
    probe.volume = 0.5
    return probe.volume === 0.5
  } catch {
    return false
  }
}

/**
 * One soundtrack for the whole page. The <audio> element is created only when
 * the guest first presses Play (nothing is downloaded before that), loops
 * gently, fades in and out, and survives section navigation, language changes
 * and the intro closing — it is never duplicated and never autoplays.
 */
export function SoundtrackProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const audio = useRef<HTMLAudioElement | null>(null)
  const ramp = useRef(0)
  const [status, setStatus] = useState<SoundtrackStatus>('idle')
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const prefsRef = useRef(prefs)
  const [volumeAdjustable] = useState(canSetVolume)

  // keep the ref current; preferences are saved only when the guest changes them (below)
  useEffect(() => {
    prefsRef.current = prefs
  }, [prefs])

  const stopRamp = () => cancelAnimationFrame(ramp.current)

  /** Smoothly moves the element's volume to `to` (instant where volume is fixed, e.g. iOS). */
  const rampTo = useCallback(
    (a: HTMLAudioElement, to: number, ms: number, done?: () => void) => {
      stopRamp()
      if (!volumeAdjustable) {
        done?.()
        return
      }
      const from = a.volume
      const start = performance.now()
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / ms)
        a.volume = from + (to - from) * k * k * (3 - 2 * k)
        if (k < 1) ramp.current = requestAnimationFrame(step)
        else done?.()
      }
      ramp.current = requestAnimationFrame(step)
    },
    [volumeAdjustable],
  )

  const ensure = useCallback((): HTMLAudioElement => {
    if (audio.current) return audio.current
    const a = new Audio()
    a.preload = 'auto'
    a.loop = true
    a.muted = prefsRef.current.muted
    a.src = SOUNDTRACK_SRC
    a.addEventListener('playing', () => setStatus('playing'))
    a.addEventListener('waiting', () => setStatus((s) => (s === 'playing' ? 'loading' : s)))
    // also catches pauses made by the browser or the operating system (calls, other media)
    a.addEventListener('pause', () => setStatus((s) => (s === 'error' || s === 'blocked' ? s : 'paused')))
    a.addEventListener('error', () => setStatus('error'))
    audio.current = a
    return a
  }, [])

  const play = useCallback(() => {
    const a = ensure()
    stopRamp()
    if (a.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) setStatus('loading')
    if (volumeAdjustable) a.volume = 0
    a.play().then(
      () => rampTo(a, prefsRef.current.volume, FADE_IN_MS),
      (err: unknown) => {
        const name = err instanceof DOMException ? err.name : ''
        if (name === 'NotAllowedError') setStatus('blocked')
        else if (name !== 'AbortError') setStatus('error')
      },
    )
  }, [ensure, rampTo, volumeAdjustable])

  const pause = useCallback(() => {
    const a = audio.current
    if (!a || a.paused) return
    rampTo(a, 0, FADE_OUT_MS, () => a.pause())
  }, [rampTo])

  const toggle = useCallback(() => (status === 'playing' || status === 'loading' ? pause() : play()), [status, pause, play])

  const setMuted = useCallback((muted: boolean) => {
    if (audio.current) audio.current.muted = muted
    setPrefs((p) => {
      const next = { ...p, muted }
      savePrefs(next)
      return next
    })
  }, [])

  const setVolume = useCallback((volume: number) => {
    const v = Math.min(1, Math.max(0, volume))
    stopRamp()
    if (audio.current && volumeAdjustable) audio.current.volume = v
    setPrefs((p) => {
      const next = { ...p, volume: v, muted: v === 0 ? p.muted : false }
      savePrefs(next)
      return next
    })
    if (audio.current && v > 0) audio.current.muted = false
  }, [volumeAdjustable])

  const retry = useCallback(() => {
    const old = audio.current
    if (old) {
      old.pause()
      old.removeAttribute('src')
      old.load()
    }
    audio.current = null
    play()
  }, [play])

  // lock-screen / headset controls, in the guest's language
  useEffect(() => {
    const ms = navigator.mediaSession
    if (!ms || status === 'idle' || typeof MediaMetadata === 'undefined') return
    ms.metadata = new MediaMetadata({
      title: t('music.trackTitle'),
      artist: t('couple.pair'),
      artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    })
    ms.setActionHandler('play', play)
    ms.setActionHandler('pause', pause)
    return () => {
      ms.setActionHandler('play', null)
      ms.setActionHandler('pause', null)
    }
  }, [status, t, play, pause])

  useEffect(
    () => () => {
      cancelAnimationFrame(ramp.current)
      audio.current?.pause()
    },
    [],
  )

  const value = useMemo(
    () => ({ status, muted: prefs.muted, volume: prefs.volume, volumeAdjustable, play, pause, toggle, setMuted, setVolume, retry }),
    [status, prefs, volumeAdjustable, play, pause, toggle, setMuted, setVolume, retry],
  )
  return <SoundtrackContext.Provider value={value}>{children}</SoundtrackContext.Provider>
}
