import { describe, it, expect } from 'vitest'
import {
  isImageFile,
  getRelativePath,
  parsePathQuery,
  resolveTargetDir,
  buildCandidates,
  filterPaths,
  detectTrigger,
  extractQuery,
} from './pathCompletion'
import type { FileEntry } from '../../../shared/types'

/**
 * 创建测试用的 FileEntry
 */
function entry(name: string, path: string, isDir = false): FileEntry {
  return {
    name,
    path,
    isDirectory: isDir,
    isHidden: false,
  }
}

describe('isImageFile', () => {
  it('识别 png 图片', () => {
    expect(isImageFile('photo.png')).toBe(true)
  })

  it('识别 jpg/jpeg/gif/svg/webp 图片', () => {
    expect(isImageFile('a.jpg')).toBe(true)
    expect(isImageFile('a.jpeg')).toBe(true)
    expect(isImageFile('a.gif')).toBe(true)
    expect(isImageFile('a.svg')).toBe(true)
    expect(isImageFile('a.webp')).toBe(true)
  })

  it('大小写不敏感', () => {
    expect(isImageFile('photo.PNG')).toBe(true)
    expect(isImageFile('photo.JPG')).toBe(true)
  })

  it('非图片文件返回 false', () => {
    expect(isImageFile('note.md')).toBe(false)
    expect(isImageFile('code.ts')).toBe(false)
    expect(isImageFile('doc.txt')).toBe(false)
  })

  it('无扩展名返回 false', () => {
    expect(isImageFile('README')).toBe(false)
  })
})

describe('getRelativePath', () => {
  it('同目录文件返回 ./filename', () => {
    expect(getRelativePath('/workspace/docs/api.md', '/workspace/docs/guide.md')).toBe('./api.md')
  })

  it('子目录文件返回 ./dir/filename', () => {
    expect(getRelativePath('/workspace/docs/images/pic.png', '/workspace/docs/guide.md')).toBe(
      './images/pic.png',
    )
  })

  it('上级目录文件返回 ../filename', () => {
    expect(getRelativePath('/workspace/api.md', '/workspace/docs/guide.md')).toBe('../api.md')
  })

  it('跨目录引用返回 ../dir/filename', () => {
    expect(getRelativePath('/workspace/api/config.md', '/workspace/docs/guide.md')).toBe(
      '../api/config.md',
    )
  })

  it('Windows 路径分隔符兼容', () => {
    expect(getRelativePath('C:\\workspace\\docs\\api.md', 'C:\\workspace\\docs\\guide.md')).toBe(
      './api.md',
    )
  })

  it('根目录文件', () => {
    expect(getRelativePath('/workspace/readme.md', '/workspace/docs/guide.md')).toBe('../readme.md')
  })
})

describe('parsePathQuery', () => {
  it('空查询返回空前缀和空过滤词', () => {
    const result = parsePathQuery('', '/workspace/docs/guide.md')
    expect(result.dirPrefix).toBe('')
    expect(result.filter).toBe('')
  })

  it('[[ 触发词后无输入', () => {
    const result = parsePathQuery('[[', '/workspace/docs/guide.md')
    expect(result.dirPrefix).toBe('')
    expect(result.filter).toBe('')
  })

  it('[[api 过滤词为 api', () => {
    const result = parsePathQuery('[[api', '/workspace/docs/guide.md')
    expect(result.dirPrefix).toBe('')
    expect(result.filter).toBe('api')
  })

  it('./images/ 目录前缀', () => {
    const result = parsePathQuery('./images/', '/workspace/docs/guide.md')
    expect(result.dirPrefix).toBe('images/')
    expect(result.filter).toBe('')
  })

  it('./images/arch 目录前缀 + 过滤词', () => {
    const result = parsePathQuery('./images/arch', '/workspace/docs/guide.md')
    expect(result.dirPrefix).toBe('images/')
    expect(result.filter).toBe('arch')
  })

  it('../api/ 上级目录前缀', () => {
    const result = parsePathQuery('../api/', '/workspace/docs/guide.md')
    expect(result.dirPrefix).toBe('../api/')
    expect(result.filter).toBe('')
  })

  it('![]( 触发词被正确剥离', () => {
    const result = parsePathQuery('![](./images/', '/workspace/docs/guide.md')
    expect(result.dirPrefix).toBe('images/')
    expect(result.filter).toBe('')
  })
})

describe('resolveTargetDir', () => {
  it('空前缀返回当前文件所在目录', () => {
    expect(resolveTargetDir('', '/workspace/docs/guide.md')).toBe('/workspace/docs')
  })

  it('images/ 返回当前目录下的 images 子目录', () => {
    expect(resolveTargetDir('images/', '/workspace/docs/guide.md')).toBe('/workspace/docs/images')
  })

  it('../ 返回上级目录', () => {
    expect(resolveTargetDir('../', '/workspace/docs/guide.md')).toBe('/workspace')
  })

  it('../api/ 返回上级目录下的 api 子目录', () => {
    expect(resolveTargetDir('../api/', '/workspace/docs/guide.md')).toBe('/workspace/api')
  })
})

describe('buildCandidates', () => {
  const currentFile = '/workspace/docs/guide.md'
  const entries: FileEntry[] = [
    entry('api.md', '/workspace/docs/api.md'),
    entry('images', '/workspace/docs/images', true),
    entry('guide.md', '/workspace/docs/guide.md'),
    entry('pic.png', '/workspace/docs/images/pic.png'),
  ]

  it('构建候选项，目录排在前面', () => {
    const candidates = buildCandidates(entries, currentFile)
    expect(candidates.length).toBe(4)
    expect(candidates[0].isDirectory).toBe(true) // images 目录排前
    expect(candidates[1].label).toBe('api.md')
  })

  it('计算相对路径正确', () => {
    const candidates = buildCandidates(entries, currentFile)
    const apiCandidate = candidates.find((c) => c.label === 'api.md')
    expect(apiCandidate?.relativePath).toBe('./api.md')

    const imageCandidate = candidates.find((c) => c.label === 'images')
    expect(imageCandidate?.relativePath).toBe('./images')
  })

  it('imagesOnly 仅返回图片文件 + 目录', () => {
    const candidates = buildCandidates(entries, currentFile, { imagesOnly: true })
    // api.md 被过滤，images 目录保留，pic.png 保留，guide.md 被过滤
    expect(candidates.length).toBe(2)
    expect(candidates.find((c) => c.label === 'images')).toBeDefined()
    expect(candidates.find((c) => c.label === 'pic.png')).toBeDefined()
    expect(candidates.find((c) => c.label === 'api.md')).toBeUndefined()
  })

  it('跳过隐藏文件', () => {
    const entriesWithHidden: FileEntry[] = [
      { ...entry('.hidden.md', '/workspace/docs/.hidden.md'), isHidden: true },
      ...entries,
    ]
    const candidates = buildCandidates(entriesWithHidden, currentFile)
    expect(candidates.find((c) => c.label === '.hidden.md')).toBeUndefined()
  })

  it('正确标记图片文件', () => {
    const candidates = buildCandidates(entries, currentFile)
    const pic = candidates.find((c) => c.label === 'pic.png')
    expect(pic?.isImage).toBe(true)

    const api = candidates.find((c) => c.label === 'api.md')
    expect(api?.isImage).toBe(false)
  })
})

describe('filterPaths', () => {
  const candidates = [
    {
      label: 'api.md',
      fullPath: '/docs/api.md',
      isDirectory: false,
      isImage: false,
      relativePath: './api.md',
    },
    {
      label: 'advanced.md',
      fullPath: '/docs/advanced.md',
      isDirectory: false,
      isImage: false,
      relativePath: './advanced.md',
    },
    {
      label: 'images',
      fullPath: '/docs/images',
      isDirectory: true,
      isImage: false,
      relativePath: './images',
    },
    {
      label: 'intro.md',
      fullPath: '/docs/intro.md',
      isDirectory: false,
      isImage: false,
      relativePath: './intro.md',
    },
  ]

  it('空过滤词返回所有候选项（最多 50）', () => {
    const result = filterPaths('', candidates)
    expect(result.length).toBe(4)
  })

  it('子字符串匹配', () => {
    const result = filterPaths('ap', candidates)
    expect(result.length).toBe(1)
    expect(result[0].label).toBe('api.md')
  })

  it('大小写不敏感', () => {
    const result = filterPaths('API', candidates)
    expect(result.find((c) => c.label === 'api.md')).toBeDefined()
  })

  it('无匹配返回空数组', () => {
    const result = filterPaths('xyz', candidates)
    expect(result.length).toBe(0)
  })

  it('限制最多 50 条', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      label: `file${i}.md`,
      fullPath: `/docs/file${i}.md`,
      isDirectory: false,
      isImage: false,
      relativePath: `./file${i}.md`,
    }))
    const result = filterPaths('file', many)
    expect(result.length).toBe(50)
  })
})

describe('detectTrigger', () => {
  it('[[ 触发 wiki', () => {
    expect(detectTrigger('text [[')).toBe('wiki')
  })

  it('./ 触发 relative', () => {
    expect(detectTrigger('text ./')).toBe('relative')
  })

  it('行首 ./ 也触发', () => {
    expect(detectTrigger('./')).toBe('relative')
  })

  it('![]( 触发 image', () => {
    expect(detectTrigger('![](')).toBe('image')
  })

  it(']( 触发 link', () => {
    expect(detectTrigger('[text](')).toBe('link')
  })

  it('无触发返回 none', () => {
    expect(detectTrigger('just text')).toBe('none')
  })

  it('单个 [ 不触发', () => {
    expect(detectTrigger('text [')).toBe('none')
  })
})

describe('extractQuery', () => {
  it('wiki 触发后提取查询', () => {
    expect(extractQuery('text [[api', 'wiki')).toBe('api')
  })

  it('wiki 触发后无输入', () => {
    expect(extractQuery('text [[', 'wiki')).toBe('')
  })

  it('relative 触发后提取查询', () => {
    expect(extractQuery('text ./images/', 'relative')).toBe('images/')
  })

  it('image 触发后提取查询', () => {
    expect(extractQuery('![](./images/', 'image')).toBe('./images/')
  })

  it('link 触发后提取查询', () => {
    expect(extractQuery('[text](./api', 'link')).toBe('./api')
  })

  it('none 触发返回空字符串', () => {
    expect(extractQuery('text', 'none')).toBe('')
  })
})
