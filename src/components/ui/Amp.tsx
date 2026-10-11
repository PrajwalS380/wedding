/**
 * Elegant italic ampersand. Pinyon Script's own "&" is tiny and hard to read,
 * so ampersands are always set in Cormorant Garamond italic.
 */
export function Amp({ className = '' }: { className?: string }) {
  return <span className={`mx-[0.12em] font-display italic font-normal ${className}`}>&amp;</span>
}
