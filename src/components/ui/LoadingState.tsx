/** Unobtrusive loading indicator for optional enhancements (never blocks content). */
export function LoadingState({ label, className = '' }: { label: string; className?: string }) {
  return (
    <div role="status" className={`inline-flex items-center gap-3 text-gold-light/80 ${className}`}>
      <span className="relative flex h-3 w-3" aria-hidden="true">
        <span className="ambient absolute inset-0 animate-ping rounded-full bg-gold/50" />
        <span className="relative h-3 w-3 rounded-full border border-gold/80 bg-gold/30" />
      </span>
      <span className="font-sans text-label font-semibold uppercase tracking-[0.28em]">{label}</span>
    </div>
  )
}
