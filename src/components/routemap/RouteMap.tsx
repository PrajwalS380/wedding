import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { useMotion } from '../../hooks/motion'
import { useInView } from '../../hooks/useInView'
import { useI18n } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n/translate'
import type { Phase, RouteMapController, RouteStep } from './scene'

/** Names on the map → dictionary keys, so road and area names read in the guest's script. */
const PLACE_KEYS: Record<string, TranslationKey> = {
  'Hadadi Road': 'places.hadadiRoad',
  'Vidhyanagar Road': 'places.vidhyanagarRoad',
  'BIET Road': 'places.bietRoad',
  'Shamanur Road': 'places.shamanurRoad',
  Vinobanagara: 'places.vinobanagara',
  'K.B. Extension': 'places.kbExtension',
  'K.T. Jambanna Nagara': 'places.ktJambannaNagara',
}
const AREAS = ['Vinobanagara', 'K.B. Extension', 'K.T. Jambanna Nagara']

/**
 * The venue's map: a live 3D Davangere (streets traced from OpenStreetMap) that plays the drive from the
 * railway station to the hall when it comes into view — see ./scene. Until it is ready, and wherever WebGL is
 * unavailable, `fallback` shows instead. With reduced motion (or animations paused) it shows the finished
 * map as a still.
 */
export function RouteMap({
  fallback,
  maskStyle,
  maskClass = '',
  focus,
}: {
  fallback: ReactNode
  maskStyle?: CSSProperties
  maskClass?: string
  /** where the film keeps its subject, as fractions of the width and height — clear of what overlaps the map */
  focus?: [number, number]
}) {
  const { t } = useI18n()
  const { ambientMotion } = useMotion()
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const ctl = useRef<RouteMapController | null>(null)
  const labels = useRef<Record<string, HTMLSpanElement | null>>({})
  // Get ready well before the guest arrives: once they have scrolled past the opening (where the mandap's own
  // 3D is then paused) build the map in an idle moment, so the film can start the instant the venue is in view.
  const near = useInView(wrap, { rootMargin: '1800px 0px', once: true })
  const [warm, setWarm] = useState(false)
  useEffect(() => {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return
    const w = window as Window & { requestIdleCallback?: Window['requestIdleCallback'] }
    let idle = 0,
      timer = 0
    const check = () => {
      if (window.scrollY < window.innerHeight * 0.85) return
      window.removeEventListener('scroll', check)
      if (w.requestIdleCallback) idle = w.requestIdleCallback(() => setWarm(true), { timeout: 2500 })
      else timer = window.setTimeout(() => setWarm(true), 300)
    }
    window.addEventListener('scroll', check, { passive: true })
    check()
    return () => {
      window.removeEventListener('scroll', check)
      if (idle) window.cancelIdleCallback(idle)
      window.clearTimeout(timer)
    }
  }, [])
  // the film starts as soon as the map is coming into view
  const visible = useInView(wrap, { rootMargin: '0px 0px -8% 0px' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle')
  const [step, setStep] = useState<RouteStep | null>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const started = useRef(false)
  const place = (name: string) => (PLACE_KEYS[name] ? t(PLACE_KEYS[name]) : name)

  // load the scene once the guest is on their way (or the venue is near)
  const loading = useRef(false)
  const unmounted = useRef(false)
  useEffect(() => {
    if (!(near || warm) || loading.current || !canvas.current) return
    loading.current = true
    setStatus('loading')
    import('./scene')
      .then(({ createRouteMap }) => createRouteMap(canvas.current!, import.meta.env.BASE_URL, { onStep: setStep, onPhase: setPhase, focus }))
      .then((c) => {
        if (unmounted.current) return c.dispose()
        ctl.current = c
        setStatus('ready')
      })
      .catch((e) => {
        console.warn('3D route map unavailable, showing the still map instead.', e)
        if (!unmounted.current) setStatus('failed')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the framing is fixed for the page's layout
  }, [near, warm])

  useEffect(() => {
    unmounted.current = false
    return () => {
      unmounted.current = true
      ctl.current?.dispose()
      ctl.current = null
    }
  }, [])

  // play the film the first time it is seen; run only while on screen
  useEffect(() => {
    const c = ctl.current
    if (status !== 'ready' || !c) return
    c.setActive(visible)
    if (visible && !started.current) {
      started.current = true
      if (ambientMotion) c.play()
      else c.still()
    }
  }, [status, visible, ambientMotion])

  // motion switched off mid-film: settle on the finished map
  useEffect(() => {
    if (status === 'ready' && !ambientMotion && started.current) ctl.current?.still()
  }, [ambientMotion, status])

  useEffect(() => {
    const c = ctl.current
    if (status !== 'ready' || !c || !wrap.current) return
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [status])

  // keep the HTML labels pinned to their places while the camera moves
  useEffect(() => {
    if (status !== 'ready' || !visible) return
    let raf = 0
    const tick = () => {
      const c = ctl.current
      if (c) {
        const ids: [string, 'station' | 'venue' | number][] = [['station', 'station'], ['venue', 'venue'], ...AREAS.map((_, i) => [`area-${i}`, i] as [string, number])]
        for (const [key, id] of ids) {
          const el = labels.current[key]
          if (!el) continue
          const p = c.project(id)
          el.style.opacity = p ? '' : '0'
          if (p) el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [status, visible])

  const replay = useCallback(() => {
    if (!ctl.current) return
    if (ambientMotion) ctl.current.play()
    else ctl.current.still()
  }, [ambientMotion])

  const ready = status === 'ready'
  const arrived = phase === 'arrive' || phase === 'idle'
  // the road the drive is on; before it sets off and once it arrives, the whole trip
  const line = step && !arrived ? place(step.name) : t('celebrations.routeSummary', { km: '6.1', min: 8 })

  return (
    <div ref={wrap} className="absolute inset-0">
      <div className={`absolute inset-0 ${maskClass}`} style={maskStyle}>
        <div className={`absolute inset-0 transition-opacity duration-500 ${ready ? 'opacity-0' : 'opacity-100'}`}>{fallback}</div>
        <canvas ref={canvas} aria-hidden="true" className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`} />
        {/* a shallow depth of field: the far city softens, like a long lens */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-[36%] backdrop-blur-[2.5px] transition-opacity duration-1000 [mask-image:linear-gradient(to_bottom,#000_20%,transparent)] ${ready ? 'opacity-100' : 'opacity-0'}`}
        />
        {ready && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            {AREAS.map((a, i) => (
              <span key={a} ref={(el) => void (labels.current[`area-${i}`] = el)} className="absolute left-0 top-0 whitespace-nowrap text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-ivory/70 [text-shadow:0_0_8px_rgba(0,0,0,.95),0_0_2px_rgba(0,0,0,.9)]">
                {place(a)}
              </span>
            ))}
            <span
              ref={(el) => void (labels.current.station = el)}
              className={`absolute left-0 top-0 whitespace-nowrap rounded-full bg-[rgba(20,40,60,.72)] px-2.5 py-1 text-[0.66rem] font-semibold tracking-wide text-[#e6f2ff] shadow-[0_4px_12px_-4px_rgba(0,0,0,.6)] backdrop-blur-sm transition-opacity duration-500 ${arrived ? '!opacity-0' : ''}`}
            >
              {t('celebrations.routeStation')}
            </span>
            <span
              ref={(el) => void (labels.current.venue = el)}
              className={`absolute left-0 top-0 whitespace-nowrap rounded-[3px] bg-[linear-gradient(180deg,#6a1a2a,#4e1020)] px-3 py-1.5 font-display text-[0.95rem] font-semibold text-ivory shadow-[0_8px_18px_-8px_rgba(60,10,20,.9),inset_0_0_0_1px_rgba(240,210,150,.4)] transition-opacity duration-700 ${arrived ? '' : '!opacity-0'}`}
            >
              {t('venue.name')}
            </span>
          </div>
        )}
      </div>

      {/* the journey, told as it plays */}
      <p className="sr-only">{t('celebrations.mapAlt')}</p>
      {/* the caption and the replay button sit together at the top left, clear of the card that overlaps the
          map's right edge on wide screens; the caption keeps a fixed width so the button never jumps */}
      {ready && (
        <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-start gap-2 sm:left-5 sm:top-5">
          <div className="w-[min(17rem,calc(100%-3rem))] rounded-[4px] bg-[rgba(30,18,12,.62)] px-3 pb-1.5 pt-2 text-left shadow-[0_10px_24px_-12px_rgba(0,0,0,.7)] backdrop-blur-md">
            <p aria-hidden="true" className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-gold-light/90">
              {t('celebrations.routeFrom')}
            </p>
            <p aria-hidden="true" key={line} className="mt-0.5 animate-[caption-in_.6s_var(--ease-silk)_both] font-display text-[1.15rem] leading-tight text-ivory">
              {line}
            </p>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto mt-0.5 inline-block text-[0.58rem] text-ivory/60 underline-offset-2 hover:text-ivory/90 hover:underline"
            >
              © OpenStreetMap contributors
              <span className="sr-only"> {t('common.newTab')}</span>
            </a>
          </div>
          <button
            type="button"
            onClick={replay}
            aria-label={t('celebrations.replayRoute')}
            title={t('celebrations.replayRoute')}
            className="pointer-events-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgba(30,18,12,.62)] text-ivory shadow-[0_10px_24px_-12px_rgba(0,0,0,.7)] backdrop-blur-md transition-colors hover:bg-[rgba(30,18,12,.8)]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
