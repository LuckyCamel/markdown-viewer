import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TabBar } from './TabBar'
import { useTabStore } from './useTabStore'

describe('TabBar', () => {
  it('should render nothing when no files are open', () => {
    render(<TabBar />)
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('should render tabs for open files', () => {
    useTabStore.getState().openFile('/test/file.md')
    render(<TabBar />)
    expect(screen.getByText('file.md')).toBeDefined()
    useTabStore.getState().closeAll()
  })
})
