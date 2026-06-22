export function basename(path: string): string {
  const sep = path.includes('\\') ? '\\' : '/'
  return path.split(sep).pop() || path
}

export function dirname(path: string): string {
  const sep = path.includes('\\') ? '\\' : '/'
  const parts = path.split(sep)
  parts.pop()
  return parts.join(sep) || sep
}

export function joinPaths(...parts: string[]): string {
  const sep = parts[0]?.includes('\\') ? '\\' : '/'
  return parts.join(sep)
    .replace(/\\+/g, '\\')
    .replace(/\/+/g, '/')
}
