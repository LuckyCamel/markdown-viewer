import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['src/main/test/setup.ts'],
        include: ['src/main/**/*.spec.ts', 'src/preload/**/*.spec.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/main/**', 'src/preload/**'],
            exclude: ['**/*.spec.*', '**/test/**'],
        },
    },
});
