import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Outline } from './Outline'
import { SCROLL_CONTAINER_SELECTOR } from '../../../shared/scrollContainer'

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

  it('点击大纲条目应滚动正文容器到对应标题', () => {
    document.body.innerHTML = `
      <div data-scroll-container style="height:200px;overflow:auto">
        <h2 id="简介">简介</h2>
      </div>
    `
    const container = document.querySelector(SCROLL_CONTAINER_SELECTOR) as HTMLElement
    container.scrollTo = () => {}
    const scrollToSpy = vi.spyOn(container, 'scrollTo')

    render(<Outline content="## 简介" />)
    fireEvent.click(screen.getByRole('button', { name: '简介' }))

    expect(scrollToSpy).toHaveBeenCalled()
  })
})
