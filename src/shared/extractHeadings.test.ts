import { describe, it, expect } from 'vitest'
import { extractHeadings } from './extractHeadings'

const toId = (text: string) => text.toLowerCase().replace(/\s+/g, '-')

describe('extractHeadings', () => {
  it('提取普通 ATX 标题', () => {
    const md = '# Title\n## Section 1\n### Sub'
    expect(extractHeadings(md, toId).map((h) => h.text)).toEqual(['Title', 'Section 1', 'Sub'])
  })

  it('忽略围栏代码块内的 # 标题行', () => {
    const md = `# Real Title

\`\`\`markdown
# Fake Heading
## Also Fake
\`\`\`

## Real Section
`
    const texts = extractHeadings(md, toId).map((h) => h.text)
    expect(texts).toEqual(['Real Title', 'Real Section'])
    expect(texts).not.toContain('Fake Heading')
    expect(texts).not.toContain('Also Fake')
  })

  it('支持 ~~~ 围栏代码块', () => {
    const md = `## Intro
~~~js
# not a heading
~~~
## End
`
    expect(extractHeadings(md, toId).map((h) => h.text)).toEqual(['Intro', 'End'])
  })

  it('嵌套围栏时按开闭状态切换', () => {
    const md = `# A
\`\`\`
# B
\`\`\`extra
# C
\`\`\`
# D
`
    expect(extractHeadings(md, toId).map((h) => h.text)).toEqual(['A', 'D'])
  })
})
