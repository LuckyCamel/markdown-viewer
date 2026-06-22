import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WelcomePage } from './WelcomePage'

describe('WelcomePage', () => {
  it('should render welcome message', () => {
    render(<WelcomePage />)
    expect(screen.getByText('Markdown Viewer')).toBeDefined()
  })

  it('should show open folder button', () => {
    render(<WelcomePage />)
    expect(screen.getByRole('button', { name: /open folder/i })).toBeDefined()
  })
})
