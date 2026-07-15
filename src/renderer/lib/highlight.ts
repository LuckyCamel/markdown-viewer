import hljs from 'highlight.js/lib/core'
import type { LanguageFn } from 'highlight.js'

interface LanguageModule {
  default: LanguageFn
}

const languageImports: Record<string, () => Promise<LanguageModule>> = {
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  python: () => import('highlight.js/lib/languages/python'),
  bash: () => import('highlight.js/lib/languages/bash'),
  json: () => import('highlight.js/lib/languages/json'),
  markdown: () => import('highlight.js/lib/languages/markdown'),
  xml: () => import('highlight.js/lib/languages/xml'),
  html: () => import('highlight.js/lib/languages/xml'),
  css: () => import('highlight.js/lib/languages/css'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
  yml: () => import('highlight.js/lib/languages/yaml'),
  sql: () => import('highlight.js/lib/languages/sql'),
  go: () => import('highlight.js/lib/languages/go'),
  rust: () => import('highlight.js/lib/languages/rust'),
  java: () => import('highlight.js/lib/languages/java'),
  c: () => import('highlight.js/lib/languages/c'),
  h: () => import('highlight.js/lib/languages/c'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  'c++': () => import('highlight.js/lib/languages/cpp'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  cs: () => import('highlight.js/lib/languages/csharp'),
  php: () => import('highlight.js/lib/languages/php'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  swift: () => import('highlight.js/lib/languages/swift'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  dart: () => import('highlight.js/lib/languages/dart'),
  dockerfile: () => import('highlight.js/lib/languages/dockerfile'),
  makefile: () => import('highlight.js/lib/languages/makefile'),
  ini: () => import('highlight.js/lib/languages/ini'),
  toml: () => import('highlight.js/lib/languages/ini'),
  scss: () => import('highlight.js/lib/languages/scss'),
  less: () => import('highlight.js/lib/languages/less'),
  lua: () => import('highlight.js/lib/languages/lua'),
  perl: () => import('highlight.js/lib/languages/perl'),
  r: () => import('highlight.js/lib/languages/r'),
  scala: () => import('highlight.js/lib/languages/scala'),
  haskell: () => import('highlight.js/lib/languages/haskell'),
  plaintext: () => import('highlight.js/lib/languages/plaintext'),
}

const loadedLanguages = new Set<string>()

async function ensureLanguageLoaded(language: string): Promise<void> {
  if (loadedLanguages.has(language)) return
  const importFn = languageImports[language]
  if (!importFn) {
    loadedLanguages.add(language)
    return
  }
  try {
    const module = await importFn()
    hljs.registerLanguage(language, module.default)
    loadedLanguages.add(language)
  } catch {
    loadedLanguages.add(language)
  }
}

export async function highlightCode(code: string, language: string): Promise<string> {
  await ensureLanguageLoaded(language)
  const result = hljs.highlight(code, { language })
  return result.value
}

export async function highlightElement(element: HTMLElement): Promise<void> {
  const language = element.className.match(/language-(\S+)/)?.[1]
  if (language) {
    await ensureLanguageLoaded(language)
  }
  hljs.highlightElement(element)
}

export default hljs
