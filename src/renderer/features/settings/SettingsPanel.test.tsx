import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SettingsPanel } from './SettingsPanel'

describe('SettingsPanel', () => {
  it('should render theme options', () => {
    render(<SettingsPanel />)
    expect(screen.getByText('Theme')).toBeDefined()
    expect(screen.getByText('Code Theme')).toBeDefined()
    expect(screen.getByText('Auto (follow app theme)')).toBeDefined()
  })
})
