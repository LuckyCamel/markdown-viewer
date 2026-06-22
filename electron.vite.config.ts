import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['src/renderer/test/setup.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/renderer/**'],
        exclude: ['**/*.test.*', '**/test/**', '**/*.d.ts'],
      },
    },
  },
})
