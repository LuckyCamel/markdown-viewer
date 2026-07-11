import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'src/renderer/**/*.test.ts',
      'src/renderer/**/*.test.tsx',
      'src/shared/**/*.test.ts',
    ],
    setupFiles: ['src/renderer/test/setup.ts'],
  },
})
