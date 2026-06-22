import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'main',
      include: ['tests/**/*.spec.ts'],
      environment: 'node',
      globals: true,
    },
  },
])
