import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Outline } from './Outline'

describe('Outline', () => {
  it('should extract headings from markdown', () => {
    const markdown = '# Title\n## Section 1\n### Sub\n## Section 2'
    render(<Outline content={markdown} />)
    expect(screen.getByText('Title')).toBeDefined()
    expect(screen.getByText('Section 1')).toBeDefined()
    expect(screen.getByText('Section 2')).toBeDefined()
  })

  it('should show no headings message', () => {
    render(<Outline content="Plain text without headings" />)
    expect(screen.getByText('No headings found')).toBeDefined()
  })
})
