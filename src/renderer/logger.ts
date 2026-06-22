export function logError(context: string, err: unknown): void {
  if (err instanceof Error) {
    console.error(`[${context}] ${err.name}: ${err.message}`)
    if (err.stack) {
      console.error(err.stack)
    }
  } else {
    console.error(`[${context}]`, err)
  }
}
