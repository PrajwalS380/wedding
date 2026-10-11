import { useId } from 'react'
import { Loader2, Music2, Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react'
import { useSoundtrack } from '../../audio/useSoundtrack'
import type { SoundtrackStatus } from '../../audio/context'
import { useI18n } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n/translate'
import { usePopover } from '../../hooks/usePopover'

const STATUS_TEXT: Record<SoundtrackStatus, TranslationKey | null> = {
  idle: null,
  loading: 'music.loading',
  playing: 'music.playing',
  paused: 'music.paused',
  blocked: 'music.blocked',
  error: 'music.error',
}

/** Three small bars that rise and fall while music plays (still when motion is paused or reduced). */
function Equalizer({ active }: { active: boolean }) {
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-hidden="true">
      {[0, 0.25, 0.5].map((delay) => (
        <span
          key={delay}
          className={`block w-[3px] rounded-full bg-current ${active ? 'eq-bar ambient' : ''}`}
          style={{ height: active ? '100%' : '35%', animationDelay: `${-delay}s` }}
        />
      ))}
    </span>
  )
}

type Variant = 'header' | 'capsule'

/**
 * The soundtrack control for the header (desktop) and the floating capsule
 * (phones): one compact button that opens a small panel with Play / Pause,
 * Mute, Volume and an honest status line.
 */
export function MusicControl({ variant = 'header', align = 'right' }: { variant?: Variant; align?: 'left' | 'right' }) {
  const { t } = useI18n()
  const { status, muted, volume, volumeAdjustable, toggle, setMuted, setVolume, retry } = useSoundtrack()
  const { open, setOpen, close, root, trigger } = usePopover()
  const panelId = useId()
  const playing = status === 'playing' || status === 'loading'
  const statusKey = STATUS_TEXT[status]

  return (
    // in the phone capsule the panel anchors to the capsule's right edge (the capsule is `fixed`)
    <div ref={root} className={variant === 'capsule' ? '' : 'relative'}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={statusKey ? `${t('music.button')}: ${t(statusKey)}` : t('music.button')}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-center gap-2 transition-colors ${
          variant === 'header'
            ? 'min-h-11 rounded-full border border-gold/40 px-3.5 text-gold-light hover:border-gold/80 hover:text-ivory'
            : 'h-11 w-11 rounded-full text-gold-light hover:text-ivory'
        } ${status === 'playing' ? 'text-gold' : ''}`}
      >
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : status === 'playing' ? (
          <Equalizer active={!muted} />
        ) : (
          <Music2 className="h-4 w-4" aria-hidden="true" />
        )}
        {variant === 'header' && <span className="text-label font-semibold uppercase tracking-[0.2em]">{t('music.button')}</span>}
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={t('music.panel')}
          className={`absolute top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-[4px] border border-gold/40 bg-night/95 p-4 text-left shadow-[0_18px_40px_-12px_rgba(0,0,0,.85)] backdrop-blur-md ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-[1.25rem] leading-tight text-ivory">{t('music.trackTitle')}</p>
              <p className="mt-0.5 text-caption text-ivory/60">{t('music.trackSubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => close(true)}
              aria-label={t('music.close')}
              className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ivory/60 hover:text-ivory"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={status === 'error' ? retry : toggle}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[3px] border border-gold/70 bg-gold/10 px-4 text-button font-semibold uppercase tracking-[0.16em] text-gold-light transition-colors hover:bg-gold/20 hover:text-ivory"
            >
              {status === 'error' ? (
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              ) : playing ? (
                <Pause className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {status === 'error' ? t('music.retry') : playing ? t('music.pause') : t('music.play')}
            </button>
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              aria-label={muted ? t('music.unmute') : t('music.mute')}
              title={muted ? t('music.unmute') : t('music.mute')}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] border border-gold/40 text-gold-light transition-colors hover:border-gold/80 hover:text-ivory"
            >
              {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>

          {volumeAdjustable ? (
            <label className="mt-4 flex items-center gap-3 text-caption text-ivory/70">
              <span className="shrink-0">{t('music.volume')}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round((muted ? 0 : volume) * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                className="h-11 w-full accent-[#d5b06d]"
              />
            </label>
          ) : (
            <p className="mt-3 text-caption text-ivory/60">{t('music.deviceVolume')}</p>
          )}

          <p role="status" aria-live="polite" className="mt-2 min-h-5 text-caption text-gold-light/90">
            {statusKey ? t(statusKey) : ''}
          </p>
        </div>
      )}
    </div>
  )
}

/** One-tap music toggle for the intro screen — the same soundtrack continues after the intro closes. */
export function IntroMusicToggle() {
  const { t } = useI18n()
  const { status, toggle, retry } = useSoundtrack()
  const playing = status === 'playing' || status === 'loading'
  const statusKey = STATUS_TEXT[status]
  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        onClick={status === 'error' ? retry : toggle}
        aria-pressed={playing}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-gold/35 bg-night/40 px-3 text-label font-semibold uppercase tracking-[0.2em] text-ivory/80 transition-colors hover:border-gold/70 hover:text-ivory sm:px-4"
      >
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : status === 'playing' ? (
          <Equalizer active />
        ) : (
          <Music2 className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="sr-only sm:not-sr-only">{playing ? t('music.pause') : t('music.play')}</span>
      </button>
      <p role="status" aria-live="polite" className="mt-1 min-h-4 max-w-[14rem] pl-2 text-tag text-ivory/60">
        {status === 'error' || status === 'blocked' ? (statusKey ? t(statusKey) : '') : ''}
      </p>
    </div>
  )
}
