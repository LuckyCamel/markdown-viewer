let mermaidInstance: typeof import('mermaid') | null = null

export async function getMermaid(): Promise<typeof import('mermaid')> {
  if (!mermaidInstance) {
    mermaidInstance = await import('mermaid')
    mermaidInstance.default.initialize({
      startOnLoad: false,
      theme: 'default',
    })
  }
  return mermaidInstance
}
