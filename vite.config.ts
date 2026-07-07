import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  build: {
    outDir: '../../dist',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand'],
          markdown: ['react-markdown', 'remark-gfm', 'remark-math'],
          mermaid: ['mermaid'],
          katex: ['katex', 'rehype-katex'],
          highlight: ['highlight.js', 'rehype-highlight'],
        },
      },
    },
    assetsInlineLimit: 4096,
  },
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
})