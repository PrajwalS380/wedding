import { Fragment, type ReactNode } from 'react'
import { Amp } from './Amp'

/** Renders a string, swapping each "&" for <Amp />. */
export function withAmp(text: string, className?: string): ReactNode {
  const parts = text.split('&')
  return parts.map((p, i) => (
    <Fragment key={i}>
      {p}
      {i < parts.length - 1 && <Amp className={className} />}
    </Fragment>
  ))
}
