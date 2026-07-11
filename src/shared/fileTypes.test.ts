import { describe, it, expect } from 'vitest'
import {
  getExtension,
  getBasename,
  isMarkdownFile,
  isCodeFile,
  isTextFile,
  getHighlightLanguage,
} from './fileTypes'

describe('fileTypes', () => {
  describe('getExtension', () => {
    it('应正确提取文件扩展名（小写）', () => {
      expect(getExtension('README.md')).toBe('md')
      expect(getExtension('src/app.TSX')).toBe('tsx')
      expect(getExtension('/path/to/file.PY')).toBe('py')
    })

    it('无扩展名时返回空字符串', () => {
      expect(getExtension('Makefile')).toBe('')
      expect(getExtension('/path/to/README')).toBe('')
    })

    it('以点开头的隐藏文件无扩展名时返回空', () => {
      expect(getExtension('.gitignore')).toBe('')
    })
  })

  describe('getBasename', () => {
    it('应正确提取文件名', () => {
      expect(getBasename('/path/to/file.ts')).toBe('file.ts')
      expect(getBasename('README.md')).toBe('README.md')
      expect(getBasename('Makefile')).toBe('Makefile')
    })

    it('Windows 路径也能正确提取', () => {
      expect(getBasename('C:\\Users\\dev\\main.rs')).toBe('main.rs')
    })
  })

  describe('isMarkdownFile', () => {
    it('标准 Markdown 扩展名', () => {
      expect(isMarkdownFile('README.md')).toBe(true)
      expect(isMarkdownFile('guide.markdown')).toBe(true)
      expect(isMarkdownFile('notes.mkd')).toBe(true)
    })

    it('无扩展名的 README 文件', () => {
      expect(isMarkdownFile('/path/README')).toBe(true)
    })

    it('非 Markdown 文件', () => {
      expect(isMarkdownFile('main.ts')).toBe(false)
      expect(isMarkdownFile('style.css')).toBe(false)
      expect(isMarkdownFile('data.json')).toBe(false)
    })
  })

  describe('getHighlightLanguage', () => {
    it('JavaScript / TypeScript 系列', () => {
      expect(getHighlightLanguage('app.js')).toBe('javascript')
      expect(getHighlightLanguage('app.jsx')).toBe('javascript')
      expect(getHighlightLanguage('app.mjs')).toBe('javascript')
      expect(getHighlightLanguage('app.ts')).toBe('typescript')
      expect(getHighlightLanguage('app.tsx')).toBe('typescript')
    })

    it('Python', () => {
      expect(getHighlightLanguage('main.py')).toBe('python')
    })

    it('C / C++', () => {
      expect(getHighlightLanguage('main.c')).toBe('c')
      expect(getHighlightLanguage('main.h')).toBe('c')
      expect(getHighlightLanguage('main.cpp')).toBe('cpp')
      expect(getHighlightLanguage('main.hpp')).toBe('cpp')
    })

    it('Rust / Go / Java', () => {
      expect(getHighlightLanguage('main.rs')).toBe('rust')
      expect(getHighlightLanguage('main.go')).toBe('go')
      expect(getHighlightLanguage('Main.java')).toBe('java')
    })

    it('配置文件', () => {
      expect(getHighlightLanguage('config.json')).toBe('json')
      expect(getHighlightLanguage('config.yaml')).toBe('yaml')
      expect(getHighlightLanguage('config.yml')).toBe('yaml')
      expect(getHighlightLanguage('config.toml')).toBe('ini')
      expect(getHighlightLanguage('config.ini')).toBe('ini')
    })

    it('无扩展名的特殊文件', () => {
      expect(getHighlightLanguage('Makefile')).toBe('makefile')
      expect(getHighlightLanguage('Dockerfile')).toBe('dockerfile')
      expect(getHighlightLanguage('.gitignore')).toBe('plaintext')
    })

    it('未知扩展名返回 null', () => {
      expect(getHighlightLanguage('file.xyz')).toBeNull()
      expect(getHighlightLanguage('file.bin')).toBeNull()
    })
  })

  describe('isCodeFile', () => {
    it('常见代码文件返回 true', () => {
      expect(isCodeFile('main.ts')).toBe(true)
      expect(isCodeFile('app.py')).toBe(true)
      expect(isCodeFile('lib.rs')).toBe(true)
      expect(isCodeFile('main.go')).toBe(true)
      expect(isCodeFile('style.css')).toBe(true)
      expect(isCodeFile('index.html')).toBe(true)
    })

    it('未知扩展名返回 false', () => {
      expect(isCodeFile('image.png')).toBe(false)
      expect(isCodeFile('binary.exe')).toBe(false)
    })
  })

  describe('isTextFile', () => {
    it('Markdown 文件返回 true', () => {
      expect(isTextFile('README.md')).toBe(true)
      expect(isTextFile('guide.markdown')).toBe(true)
    })

    it('代码文件返回 true', () => {
      expect(isTextFile('main.ts')).toBe(true)
      expect(isTextFile('app.py')).toBe(true)
    })

    it('纯文本文件返回 true', () => {
      expect(isTextFile('notes.txt')).toBe(true)
    })

    it('二进制文件返回 false', () => {
      expect(isTextFile('image.jpg')).toBe(false)
      expect(isTextFile('archive.zip')).toBe(false)
    })
  })
})
