import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SettingsPanel } from './SettingsPanel'

describe('SettingsPanel', () => {
  it('should render theme options', () => {
    render(<SettingsPanel />)
    expect(screen.getByText('主题')).toBeDefined()
    expect(screen.getByText('代码主题')).toBeDefined()
    expect(screen.getByText('自动 (跟随应用主题)')).toBeDefined()
  })
})
