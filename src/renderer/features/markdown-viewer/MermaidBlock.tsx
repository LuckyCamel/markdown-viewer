import { useEffect, useRef, useState, useId } from 'react'
import { getMermaid } from './mermaid'

interface MermaidBlockProps {
  chart: string
}

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const id = useId().replace(/:/g, '')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mermaid = await getMermaid()
        if (cancelled) return
        const { svg } = await mermaid.default.render(id, chart)
        if (cancelled) return
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch (e) {
        if (!cancelled) setError(String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [chart, id])

  if (error) {
    return <pre className="text-red-500 text-sm p-2 bg-red-50 dark:bg-red-950 rounded">{error}</pre>
  }

  return <div ref={containerRef} className="mermaid-block" />
}
