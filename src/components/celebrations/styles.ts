/** Shared button looks for the Celebrations chapters (dark scenes and paper). */
export const actionClass = {
  dark: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] border border-gold/60 bg-[rgba(12,10,22,.35)] px-4 text-label font-semibold uppercase tracking-[0.18em] text-gold-light backdrop-blur-[6px] transition-colors hover:border-gold hover:bg-gold/15 hover:text-ivory',
  light: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] border border-maroon/50 bg-[rgba(255,252,244,.35)] px-4 text-label font-semibold uppercase tracking-[0.18em] text-maroon transition-colors hover:bg-maroon/10',
  lightFill: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] bg-[linear-gradient(180deg,#6a1a2a,#521220)] px-4 text-label font-semibold uppercase tracking-[0.18em] text-ivory shadow-[0_8px_18px_-10px_rgba(80,10,20,.8),inset_0_1px_0_rgba(255,255,255,.12)] transition-[filter] hover:brightness-110',
} as const
