import { describe, it, expect } from 'vitest'
import { formatExtensionLines, parseExtensionLines } from './parseExtensionLines'

describe('parseExtensionLines', () => {
  it('保留空行作为无扩展名规则', () => {
    expect(parseExtensionLines('md\n\nmarkdown')).toEqual(['md', '', 'markdown'])
  })

  it('format 与 parse 互逆', () => {
    const list = ['md', 'markdown', '']
    expect(parseExtensionLines(formatExtensionLines(list))).toEqual(list)
  })
})
