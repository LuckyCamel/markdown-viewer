import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SettingsPanel } from './SettingsPanel'

describe('SettingsPanel', () => {
  it('should render theme options', () => {
    render(<SettingsPanel />)
    expect(screen.getByText(/theme/i)).toBeDefined()
  })
})
