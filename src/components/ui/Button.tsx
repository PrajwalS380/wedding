import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { useI18n } from '../../i18n/useI18n'

type Variant = 'gold' | 'outline' | 'ink' | 'ghost'

const base =
  'group relative inline-flex min-h-11 items-center justify-center gap-2.5 rounded-[3px] px-6 py-3 ' +
  'font-sans text-button font-semibold uppercase tracking-[0.22em] leading-none ' +
  'transition-[transform,background-color,color,border-color,box-shadow] duration-300 ease-[var(--ease-silk)] ' +
  'active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 select-none'

const variants: Record<Variant, string> = {
  gold:
    'bg-[linear-gradient(180deg,#ecd4a2_0%,#d5b06d_55%,#b8924f_100%)] text-[#2a1a10] ' +
    'shadow-[0_10px_30px_-12px_rgba(213,176,109,.65),inset_0_1px_0_rgba(255,255,255,.45)] ' +
    'hover:shadow-[0_16px_40px_-12px_rgba(213,176,109,.8),inset_0_1px_0_rgba(255,255,255,.55)] hover:-translate-y-0.5',
  outline:
    'border border-gold/60 text-gold-light bg-night/20 backdrop-blur-[2px] ' +
    'hover:border-gold hover:bg-gold/10 hover:text-ivory',
  ink: 'bg-maroon text-ivory shadow-[0_10px_24px_-14px_rgba(90,21,36,.9)] hover:bg-burgundy hover:-translate-y-0.5',
  ghost: 'text-gold-light hover:text-ivory underline-offset-[6px] hover:underline px-2',
}

interface CommonProps {
  variant?: Variant
  icon?: ReactNode
  iconAfter?: ReactNode
  children: ReactNode
  className?: string
}

export function Button({
  variant = 'gold',
  icon,
  iconAfter,
  children,
  className = '',
  type = 'button',
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {icon}
      <span>{children}</span>
      {iconAfter}
    </button>
  )
}

export function LinkButton({
  variant = 'gold',
  icon,
  iconAfter,
  children,
  className = '',
  external,
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { external?: boolean }) {
  const { t } = useI18n()
  return (
    <a
      className={`${base} ${variants[variant]} ${className}`}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {icon}
      <span>{children}</span>
      {iconAfter}
      {external && <span className="sr-only"> {t('common.newTab')}</span>}
    </a>
  )
}
