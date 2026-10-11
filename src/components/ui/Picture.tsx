import { useState, type CSSProperties } from 'react'
import type { ImageAsset } from '../../data/assets'

interface PictureProps {
  asset: ImageAsset
  /** `sizes` attribute describing the rendered width. */
  sizes: string
  className?: string
  imgClassName?: string
  style?: CSSProperties
  imgStyle?: CSSProperties
  priority?: boolean
  /** Override alt (e.g. empty for a purely decorative layer). */
  alt?: string
}

/**
 * Responsive, layout-stable image. Reserves its aspect ratio, lazy-loads
 * below the fold, and degrades to a tasteful tinted panel if the file fails.
 */
export function Picture({ asset, sizes, className = '', imgClassName = '', style, imgStyle, priority, alt }: PictureProps) {
  const [failed, setFailed] = useState(false)
  const srcSet = asset.variants.map((v) => `${v.src} ${v.width}w`).join(', ')
  const largest = asset.variants[asset.variants.length - 1]
  return (
    <span className={`relative block ${className}`} style={{ aspectRatio: `${asset.width} / ${asset.height}`, ...style }}>
      {failed ? (
        <span
          role={alt === '' ? undefined : 'img'}
          aria-label={alt === '' ? undefined : alt ?? asset.alt}
          className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#1c4b3c,#061914)] text-center text-xs uppercase tracking-[0.25em] text-gold/60"
        >
          <span aria-hidden="true">Image unavailable</span>
        </span>
      ) : (
        <img
          src={largest.src}
          srcSet={srcSet}
          sizes={sizes}
          width={asset.width}
          height={asset.height}
          alt={alt ?? asset.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full ${imgClassName}`}
          style={imgStyle}
          draggable={false}
        />
      )}
    </span>
  )
}
