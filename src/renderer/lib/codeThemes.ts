export interface CodeTheme {
  id: string
  name: string
  variant: 'light' | 'dark'
  colors: {
    background: string
    foreground: string
    comment: string
    keyword: string
    string: string
    number: string
    function: string
    type: string
    variable: string
    operator: string
    builtIn: string
    tag: string
    attr: string
    regexp: string
    section: string
    bullet: string
    addition: string
    additionBg: string
    deletion: string
    deletionBg: string
  }
}

/** 代码主题定义：基于 highlight.js 主流主题调色板 */
export const CODE_THEMES: CodeTheme[] = [
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    variant: 'dark',
    colors: {
      background: '#0d1117',
      foreground: '#c9d1d9',
      comment: '#8b949e',
      keyword: '#ff7b72',
      string: '#a5d6ff',
      number: '#79c0ff',
      function: '#d2a8ff',
      type: '#ff7b72',
      variable: '#79c0ff',
      operator: '#79c0ff',
      builtIn: '#ffa657',
      tag: '#7ee787',
      attr: '#79c0ff',
      regexp: '#a5d6ff',
      section: '#1f6feb',
      bullet: '#f2cc60',
      addition: '#aff5b4',
      additionBg: '#033a16',
      deletion: '#ffdcd7',
      deletionBg: '#67060c',
    },
  },
  {
    id: 'monokai',
    name: 'Monokai',
    variant: 'dark',
    colors: {
      background: '#272822',
      foreground: '#f8f8f2',
      comment: '#75715e',
      keyword: '#f92672',
      string: '#e6db74',
      number: '#ae81ff',
      function: '#a6e22e',
      type: '#66d9ef',
      variable: '#f8f8f2',
      operator: '#f92672',
      builtIn: '#ae81ff',
      tag: '#f92672',
      attr: '#a6e22e',
      regexp: '#e6db74',
      section: '#a6e22e',
      bullet: '#ae81ff',
      addition: '#a6e22e',
      additionBg: '#3c3d38',
      deletion: '#f92672',
      deletionBg: '#3c3d38',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    variant: 'dark',
    colors: {
      background: '#282a36',
      foreground: '#f8f8f2',
      comment: '#6272a4',
      keyword: '#ff79c6',
      string: '#f1fa8c',
      number: '#bd93f9',
      function: '#50fa7b',
      type: '#8be9fd',
      variable: '#f8f8f2',
      operator: '#ff79c6',
      builtIn: '#bd93f9',
      tag: '#ff79c6',
      attr: '#50fa7b',
      regexp: '#f1fa8c',
      section: '#50fa7b',
      bullet: '#bd93f9',
      addition: '#50fa7b',
      additionBg: '#282a36',
      deletion: '#ff5555',
      deletionBg: '#282a36',
    },
  },
  {
    id: 'one-dark',
    name: 'Atom One Dark',
    variant: 'dark',
    colors: {
      background: '#282c34',
      foreground: '#abb2bf',
      comment: '#5c6370',
      keyword: '#c678dd',
      string: '#98c379',
      number: '#d19a66',
      function: '#61afef',
      type: '#e5c07b',
      variable: '#e06c75',
      operator: '#56b6c2',
      builtIn: '#d19a66',
      tag: '#e06c75',
      attr: '#d19a66',
      regexp: '#98c379',
      section: '#e5c07b',
      bullet: '#d19a66',
      addition: '#98c379',
      additionBg: '#282c34',
      deletion: '#e06c75',
      deletionBg: '#282c34',
    },
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    variant: 'light',
    colors: {
      background: '#ffffff',
      foreground: '#24292e',
      comment: '#6a737d',
      keyword: '#d73a49',
      string: '#032f62',
      number: '#005cc5',
      function: '#6f42c1',
      type: '#d73a49',
      variable: '#005cc5',
      operator: '#005cc5',
      builtIn: '#e36209',
      tag: '#22863a',
      attr: '#005cc5',
      regexp: '#032f62',
      section: '#005cc5',
      bullet: '#735c0f',
      addition: '#22863a',
      additionBg: '#f0fff4',
      deletion: '#b31d28',
      deletionBg: '#ffeef0',
    },
  },
  {
    id: 'one-light',
    name: 'Atom One Light',
    variant: 'light',
    colors: {
      background: '#fafafa',
      foreground: '#383a42',
      comment: '#a0a1a7',
      keyword: '#a626a4',
      string: '#50a14f',
      number: '#986801',
      function: '#4078f2',
      type: '#c18401',
      variable: '#e45649',
      operator: '#0184bb',
      builtIn: '#986801',
      tag: '#e45649',
      attr: '#986801',
      regexp: '#50a14f',
      section: '#c18401',
      bullet: '#986801',
      addition: '#50a14f',
      additionBg: '#fafafa',
      deletion: '#e45649',
      deletionBg: '#fafafa',
    },
  },
]

export const CODE_THEME_MAP: Record<string, CodeTheme> = Object.fromEntries(
  CODE_THEMES.map((t) => [t.id, t]),
)

export const DEFAULT_CODE_THEME = 'auto'
export const DARK_CODE_THEME = 'github-dark'
export const LIGHT_CODE_THEME = 'github-light'

/** 根据 codeTheme ID 和当前应用主题解析出实际使用的主题 */
export function resolveCodeTheme(themeId: string, appVariant: 'light' | 'dark'): CodeTheme {
  if (themeId === 'auto') {
    const id = appVariant === 'dark' ? DARK_CODE_THEME : LIGHT_CODE_THEME
    return CODE_THEME_MAP[id] ?? CODE_THEMES[0]
  }
  return CODE_THEME_MAP[themeId] ?? CODE_THEMES[0]
}

/** 将代码主题颜色应用到 documentElement 的 CSS 变量 */
export function applyCodeTheme(theme: CodeTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const c = theme.colors
  root.style.setProperty('--code-bg', c.background)
  root.style.setProperty('--code-fg', c.foreground)
  root.style.setProperty('--code-comment', c.comment)
  root.style.setProperty('--code-keyword', c.keyword)
  root.style.setProperty('--code-string', c.string)
  root.style.setProperty('--code-number', c.number)
  root.style.setProperty('--code-function', c.function)
  root.style.setProperty('--code-type', c.type)
  root.style.setProperty('--code-variable', c.variable)
  root.style.setProperty('--code-operator', c.operator)
  root.style.setProperty('--code-builtin', c.builtIn)
  root.style.setProperty('--code-tag', c.tag)
  root.style.setProperty('--code-attr', c.attr)
  root.style.setProperty('--code-regexp', c.regexp)
  root.style.setProperty('--code-section', c.section)
  root.style.setProperty('--code-bullet', c.bullet)
  root.style.setProperty('--code-addition', c.addition)
  root.style.setProperty('--code-addition-bg', c.additionBg)
  root.style.setProperty('--code-deletion', c.deletion)
  root.style.setProperty('--code-deletion-bg', c.deletionBg)
}
