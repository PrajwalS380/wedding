import { Fragment, type ReactNode } from 'react'

/**
 * Renders a translated sentence that contains `**bold**` segments and
 * `{token}` placeholders filled with elements (e.g. a non-breaking phone
 * number) — so word order stays in the translation, not in the component.
 */
export function Rich({ text, parts = {}, strongClassName = 'font-semibold' }: { text: string; parts?: Record<string, ReactNode>; strongClassName?: string }) {
  const out: ReactNode[] = []
  text.split(/(\*\*[^*]+\*\*)/g).forEach((chunk, i) => {
    if (!chunk) return
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      out.push(
        <strong key={i} className={strongClassName}>
          {chunk.slice(2, -2)}
        </strong>,
      )
      return
    }
    chunk.split(/(\{\w+\})/g).forEach((piece, j) => {
      const token = piece.match(/^\{(\w+)\}$/)?.[1]
      out.push(<Fragment key={`${i}-${j}`}>{token && token in parts ? parts[token] : piece}</Fragment>)
    })
  })
  return <>{out}</>
}
