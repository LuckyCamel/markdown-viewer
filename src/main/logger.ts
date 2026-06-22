export function logError(context: string, err: unknown): void {
  if (err instanceof Error) {
    process.stderr.write(`[${context}] ${err.name}: ${err.message}\n`)
    if (err.stack) {
      process.stderr.write(`${err.stack}\n`)
    }
  } else {
    process.stderr.write(`[${context}] ${String(err)}\n`)
  }
}
