# CI & Test Enhancement — Phase 1 Design

## Overview

Add CI pipeline, linting, main process unit tests, coverage, and pre-commit hooks to the markdown-viewer project. Phase 1 focuses on developer experience and test infrastructure; Phase 2 adds E2E tests (Playwright for Electron).

## Scope (Phase 1)

| Area | Deliverables |
|------|-------------|
| Linting | ESLint (TypeScript + React hooks) + Prettier |
| CI | GitHub Actions: lint → typecheck → test (renderer + main) → coverage → build |
| Main process tests | 8 test files, ~35 tests across store/window/protocol/files/watcher/search/menu/preload |
| Coverage | vitest --coverage with v8 provider |
| Pre-commit hooks | husky + lint-staged: prettier check + typecheck on staged files |

## Files Changed / Created

### New files (~15)

```
.github/workflows/ci.yml
eslint.config.js
.prettierrc
vitest.config.main.ts
src/main/test/setup.ts              # electron + electron-store mocks
src/main/store.spec.ts
src/main/window.spec.ts
src/main/protocol.spec.ts
src/main/files.spec.ts
src/main/watcher.spec.ts
src/main/search.spec.ts
src/main/menu.spec.ts
src/preload/index.spec.ts
.lintstagedrc.json
```

### Modified files (~4)

```
package.json         # scripts + devDependencies
.gitignore           # coverage/, playwright/
README.md            # badge + test commands
```

## Detailed Design

### 1. ESLint + Prettier

**eslint.config.js** — Flat config (ESLint v9+ compatible):

```js
// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['out/', 'node_modules/', 'coverage/', 'dist/'] },
)
```

**.prettierrc**:
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Scripts** (`package.json`):
```json
{
  "lint": "eslint src/",
  "format": "prettier --write src/",
  "format:check": "prettier --check src/",
  "typecheck": "tsc --noEmit",
  "test:main": "vitest run --config vitest.config.main.ts",
  "test": "vitest run && vitest run --config vitest.config.main.ts",
  "test:coverage": "vitest run --coverage && vitest run --coverage --config vitest.config.main.ts"
}
```

### 2. GitHub Actions CI

**`.github/workflows/ci.yml`**:
- Trigger: push/PR to master
- Single job on `ubuntu-latest` (OS matrix deferred until packaging)
- Steps:
  1. Checkout repo
  2. Setup Node 22
  3. Install pnpm
  4. `pnpm install --frozen-lockfile`
  5. `pnpm run format:check`
  6. `pnpm run lint`
  7. `pnpm run typecheck`
  8. `pnpm run test:coverage` (renderer + main process with coverage)
  9. `pnpm run build`

### 3. Main Process Unit Tests

**Test runner config** (`vitest.config.main.ts`):
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['src/main/test/setup.ts'],
    include: ['src/main/**/*.spec.ts', 'src/preload/**/*.spec.ts'],
  },
})
```

**Mock strategy** (`src/main/test/setup.ts`):
- `vi.mock('electron')` — mock BrowserWindow, ipcMain, Menu, dialog, shell, protocol, app
- `vi.mock('electron-store')` — in-memory store (Map-based)
- `files.spec.ts` and `search.spec.ts` do NOT mock `fs/promises` — they test against real temp directories
- `watcher.spec.ts` mocks `electron` but uses real `fs` for the watched files

**Test files and coverage:**

| File | Tests | Key assertions |
|------|-------|----------------|
| `store.spec.ts` | 5 | defaults, set/get, delete, clear |
| `window.spec.ts` | 3 | createWindow, restoreBounds, resize saves |
| `protocol.spec.ts` | 2 | register without throw, MIME types |
| `files.spec.ts` | 6 | listDirectory, readFile, getFileInfo, hidden files, hasSupportedFiles, sort order |
| `watcher.spec.ts` | 4 | watchFile, unwatchFile, unwatchAll, no duplicate watches |
| `search.spec.ts` | 4 | searchInFile match, no match, case insensitive, line context |
| `menu.spec.ts` | 2 | createAppMenu, menu template structure |
| `preload/index.spec.ts` | 3 | API shape validates, namespaces exist, function signatures |
| **Total** | **~29** | |

### 4. Coverage

```bash
pnpm add -D @vitest/coverage-v8
```

Update `electron.vite.config.ts` renderer test section:
```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['src/renderer/test/setup.ts'],
  coverage: {
    provider: 'v8',
    include: ['src/renderer/**'],
    exclude: ['**/*.test.*', '**/test/**'],
  },
},
```

Add coverage section to `vitest.config.main.ts`:
```ts
coverage: {
  provider: 'v8',
  include: ['src/main/**', 'src/preload/**'],
  exclude: ['**/*.spec.*', '**/test/**'],
},
```

CI uploads coverage data (optional Codecov integration).

### 5. Pre-commit Hooks

```bash
pnpm add -D husky lint-staged
pnpm pkg set scripts.prepare="husky"
pnpm run prepare
```

**`.husky/pre-commit`**:
```bash
npx lint-staged
```

**`.lintstagedrc.json`**:
```json
{
  "src/**/*.{ts,tsx,js,jsx,json,css,md}": ["prettier --check"],
  "src/**/*.{ts,tsx}": ["tsc --noEmit --pretty"]
}
```

## Phase 2 Preview (separate spec)

- Playwright for Electron: `@playwright/test` + `electron`
- E2E test directory: `e2e/`
- Test flows: app launch, open folder, navigate tree, open tab, search, file change detection
- CI: separate job after build, runs on ubuntu-latest

## Non-goals (explicitly excluded from Phase 1)

- E2E tests (Phase 2)
- Multi-OS CI matrix (deferred to packaging phase)
- Codecov / badge (nice-to-have, not blocking)
- Docker / containerized testing
- Visual regression testing

## Dependencies to Add

```
devDependencies:
  eslint @eslint/js typescript-eslint eslint-plugin-react-hooks
  prettier
  husky lint-staged
  @vitest/coverage-v8
```
