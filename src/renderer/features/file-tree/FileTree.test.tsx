import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileTree } from './FileTree'
import { useFileStore } from './useFileStore'

describe('FileTree', () => {
  beforeAll(() => {
    useFileStore.setState({ rootPath: '/test', entries: { '/test': [] } })
  })

  it('should render root directory name', () => {
    render(<FileTree rootPath="/test" />)
    expect(screen.getByText('test')).toBeDefined()
  })
})
