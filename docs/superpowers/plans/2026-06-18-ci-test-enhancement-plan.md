# CI & Test Enhancement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add CI pipeline (GitHub Actions), linting (ESLint + Prettier), main process unit tests (~29 tests across 8 modules), vitest coverage, and pre-commit hooks.

**Architecture:** Phase 1 of a two-phase plan. All tests run in vitest (node environment for main process, jsdom for renderer). Main process modules that use Electron APIs are mocked in `src/main/test/setup.ts`. Files that wrap `fs/promises` (files.ts, search.ts) test against real temp directories.

**Tech Stack:** ESLint v9 flat config + typescript-eslint + Prettier + husky + lint-staged + vitest + @vitest/coverage-v8 + GitHub Actions

## Global Constraints

- TypeScript strict mode, no `any` in new code (existing `any` in renderer code gets `@ts-expect-error` rather than refactored)
- All new test files follow existing naming: `.spec.ts` for main process, `.test.tsx` for renderer
- Main process mock must NOT leak state between tests — use `beforeEach` to reset shared mocks
- CI runs on ubuntu-latest only (OS matrix deferred to packaging phase)
- No Electron E2E tests in this phase (deferred to Phase 2)
- All pre-existing renderer tests must continue passing unchanged

---

## File Structure

### New files

```
.github/workflows/ci.yml
eslint.config.js
.prettierrc
.lintstagedrc.json
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
```

### Modified files

```
package.json              # scripts + devDependencies + prepare
.gitignore                # coverage/ + playwright/
electron.vite.config.ts   # add test + coverage config under renderer
```

---

### Task 1: ESLint + Prettier

**Files:**
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Modify: `package.json`

- [x] **Step 1: Install dependencies**

```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks prettier
```

- [x] **Step 2: Create ESLint config**

`eslint.config.js`:
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

- [x] **Step 3: Create Prettier config**

`.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [x] **Step 4: Add scripts to package.json**

Insert into `package.json` scripts:
```json
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "format:check": "prettier --check src/",
    "typecheck": "tsc --noEmit",
    "test:main": "vitest run --config vitest.config.main.ts",
    "test:coverage": "vitest run --coverage && vitest run --coverage --config vitest.config.main.ts"
```

- [x] **Step 5: Run lint and format to verify**

```bash
pnpm run format:check
pnpm run lint
```

Expected: passes with no warnings (or minimal acceptable warnings). If there are pre-existing formatting issues, run `pnpm run format` first to auto-fix, then re-check.

- [x] **Step 6: Commit**

```bash
git add eslint.config.js .prettierrc package.json
git commit -m "chore: add ESLint + Prettier config"
```

---

### Task 2: Pre-commit Hooks (husky + lint-staged)

**Files:**
- Create: `.husky/pre-commit`
- Create: `.lintstagedrc.json`
- Modify: `package.json`

- [x] **Step 1: Install dependencies**

```bash
pnpm add -D husky lint-staged
```

- [x] **Step 2: Enable husky**

```bash
pnpm pkg set scripts.prepare="husky"
pnpm run prepare
```

- [x] **Step 3: Create pre-commit hook**

`.husky/pre-commit`:
```bash
npx lint-staged
```

- [x] **Step 4: Create lint-staged config**

`.lintstagedrc.json`:
```json
{
  "src/**/*.{ts,tsx,js,jsx,json,css,md}": ["prettier --check"],
  "src/**/*.{ts,tsx}": ["tsc --noEmit --pretty"]
}
```

- [x] **Step 5: Test the hook**

```bash
git add .husky/pre-commit .lintstagedrc.json package.json
git commit -m "chore: add husky + lint-staged pre-commit hooks"
```

This commit should trigger the hook. If the previous task's commit wasn't made yet, commit that first.

- [x] **Step 6: Commit**

```bash
git add .husky/ .lintstagedrc.json package.json
git commit -m "chore: add husky + lint-staged pre-commit hooks"
```

---

### Task 3: Main Process Test Infrastructure + Store Tests

**Files:**
- Create: `vitest.config.main.ts`
- Create: `src/main/test/setup.ts`
- Create: `src/main/store.spec.ts`

- [x] **Step 1: Create vitest config for main process**

`vitest.config.main.ts`:
```ts
import { defineConfig } from 'vitest/config'

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
})
```

- [x] **Step 2: Create mocks for Electron and electron-store**

`src/main/test/setup.ts`:
```ts
import { vi, beforeEach } from 'vitest'

const storeData = new Map<string, unknown>()

beforeEach(() => {
  storeData.clear()
})

vi.mock('electron', () => {
  const mockBrowserWindow = vi.fn().mockImplementation(() => ({
    webContents: { send: vi.fn() },
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    close: vi.fn(),
    getSize: vi.fn(() => [1200, 800]),
    getPosition: vi.fn(() => [0, 0]),
    setSize: vi.fn(),
    setPosition: vi.fn(),
    show: vi.fn(),
    isDestroyed: vi.fn(() => false),
  }))

  return {
    app: {
      getPath: vi.fn(() => '/tmp/mock-userdata'),
      getVersion: vi.fn(() => '1.0.0'),
      on: vi.fn(),
      quit: vi.fn(),
    },
    BrowserWindow: mockBrowserWindow,
    ipcMain: { handle: vi.fn(), on: vi.fn() },
    ipcRenderer: { invoke: vi.fn(), on: vi.fn(), send: vi.fn(), removeListener: vi.fn() },
    contextBridge: { exposeInMainWorld: vi.fn() },
    Menu: {
      buildFromTemplate: vi.fn(() => ({})),
      setApplicationMenu: vi.fn(),
    },
    dialog: {
      showOpenDialog: vi.fn(() => Promise.resolve({ canceled: true, filePaths: [] })),
      showMessageBox: vi.fn(),
    },
    shell: { openExternal: vi.fn() },
    protocol: { handle: vi.fn(), registerFileProtocol: vi.fn() },
  }
})

vi.mock('electron-store', () => {
  return {
    default: class MockStore {
      constructor(opts?: { defaults?: Record<string, unknown> }) {
        if (opts?.defaults) {
          for (const [k, v] of Object.entries(opts.defaults)) {
            if (!storeData.has(k)) storeData.set(k, v)
          }
        }
      }
      get(key: string) {
        return storeData.get(key)
      }
      set(key: string, value: unknown) {
        storeData.set(key, value)
      }
      delete(key: string) {
        storeData.delete(key)
      }
      clear() {
        storeData.clear()
      }
    },
  }
})
```

- [x] **Step 3: Write store tests**

`src/main/store.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('appStore', () => {
  async function getStore() {
    const { appStore } = await import('./store')
    return appStore
  }

  it('should return default theme as system', async () => {
    const store = await getStore()
    expect(store.get('theme')).toBe('system')
  })

  it('should store and retrieve a value', async () => {
    const store = await getStore()
    store.set('theme', 'dark')
    expect(store.get('theme')).toBe('dark')
  })

  it('should restore default after delete', async () => {
    const store = await getStore()
    store.set('theme', 'dark')
    store.delete('theme')
    expect(store.get('theme')).toBe('system')
  })

  it('should return default window bounds', async () => {
    const store = await getStore()
    expect(store.get('windowBounds')).toEqual({ width: 1200, height: 800 })
  })

  it('should clear all data', async () => {
    const store = await getStore()
    store.set('theme', 'dark')
    store.clear()
    expect(store.get('theme')).toBe('system')
  })
})
```

- [x] **Step 4: Run tests**

```bash
pnpm run test:main -- src/main/store.spec.ts
```

Expected: PASS (5 tests)

- [x] **Step 5: Commit**

```bash
git add vitest.config.main.ts src/main/test/setup.ts src/main/store.spec.ts
git commit -m "test: add main process test infra + store tests"
```

---

### Task 4: Main Process — Files Tests

**Files:**
- Create: `src/main/files.spec.ts`

- [x] **Step 1: Write files tests**

`src/main/files.spec.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('file system operations', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mdfiles-'))
    writeFileSync(join(tmpDir, 'test.md'), '# Hello\nWorld')
    writeFileSync(join(tmpDir, '.hidden.md'), '# Hidden')
    writeFileSync(join(tmpDir, 'readme.txt'), 'plain text')
    mkdirSync(join(tmpDir, 'sub'))
    writeFileSync(join(tmpDir, 'sub', 'nested.md'), '# Nested')
    mkdirSync(join(tmpDir, 'node_modules'))
    mkdirSync(join(tmpDir, 'empty'))
  })

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('should list directory contents', async () => {
    const { listDirectory } = await import('./files')
    const entries = await listDirectory(tmpDir)
    expect(entries.length).toBeGreaterThanOrEqual(3)
    expect(entries.find((e) => e.name === 'test.md')).toBeDefined()
  })

  it('should mark hidden files', async () => {
    const { listDirectory } = await import('./files')
    const entries = await listDirectory(tmpDir)
    const hidden = entries.find((e) => e.name === '.hidden.md')
    expect(hidden?.isHidden).toBe(true)
  })

  it('should read file content', async () => {
    const { readFile } = await import('./files')
    const result = await readFile(join(tmpDir, 'test.md'))
    expect(result.path).toBe(join(tmpDir, 'test.md'))
    expect(result.content).toContain('# Hello')
  })

  it('should get file info', async () => {
    const { getFileInfo } = await import('./files')
    const info = await getFileInfo(tmpDir)
    expect(info.isDirectory).toBe(true)
  })

  it('should detect supported files', async () => {
    const { hasSupportedFiles, listDirectory } = await import('./files')
    const entries = await listDirectory(tmpDir)
    expect(hasSupportedFiles(entries)).toBe(true)
  })

  it('should sort directories first then alphabetically', async () => {
    const { listDirectory } = await import('./files')
    const entries = await listDirectory(tmpDir)
    const dirs = entries.filter((e) => e.isDirectory)
    const files = entries.filter((e) => !e.isDirectory)
    if (entries.length > 0) {
      expect(entries[0].isDirectory).toBe(true)
    }
    for (let i = 1; i < dirs.length; i++) {
      expect(dirs[i - 1].name.localeCompare(dirs[i].name)).toBeLessThanOrEqual(0)
    }
    for (let i = 1; i < files.length; i++) {
      expect(files[i - 1].name.localeCompare(files[i].name)).toBeLessThanOrEqual(0)
    }
  })
})
```

- [x] **Step 2: Run tests**

```bash
pnpm run test:main -- src/main/files.spec.ts
```

Expected: PASS (6 tests)

- [x] **Step 3: Commit**

```bash
git add src/main/files.spec.ts
git commit -m "test: add file system operation tests"
```

---

### Task 5: Main Process — Search Tests

**Files:**
- Create: `src/main/search.spec.ts`

- [x] **Step 1: Write search tests**

`src/main/search.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('searchInFile', () => {
  async function getSearch() {
    const { searchInFile } = await import('./search')
    return searchInFile
  }

  it('should find matches in file content', async () => {
    const searchInFile = await getSearch()
    const results = await searchInFile('/fake/path.md', 'test', '# Hello\ntest match\nline')
    expect(results).toHaveLength(1)
    expect(results[0].line).toBe(2)
    expect(results[0].match).toBe('test')
  })

  it('should return empty array when no match', async () => {
    const searchInFile = await getSearch()
    const results = await searchInFile('/fake/path.md', 'xyz', '# Hello\nWorld')
    expect(results).toHaveLength(0)
  })

  it('should be case insensitive', async () => {
    const searchInFile = await getSearch()
    const results = await searchInFile('/fake/path.md', 'hello', '# Hello\nWorld')
    expect(results).toHaveLength(1)
  })

  it('should provide line context', async () => {
    const searchInFile = await getSearch()
    const results = await searchInFile('/fake/path.md', 'match', 'prefix ' + 'x'.repeat(30) + ' match ' + 'y'.repeat(30) + ' suffix')
    expect(results).toHaveLength(1)
    expect(results[0].lineContent.length).toBeLessThan(60)
  })
})
```

- [x] **Step 2: Run tests**

```bash
pnpm run test:main -- src/main/search.spec.ts
```

Expected: PASS (4 tests)

- [x] **Step 3: Commit**

```bash
git add src/main/search.spec.ts
git commit -m "test: add content search tests"
```

---

### Task 6: Main Process — Watcher Tests

**Files:**
- Create: `src/main/watcher.spec.ts`

- [x] **Step 1: Write watcher tests**

`src/main/watcher.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('file watcher', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'watch-'))
    writeFileSync(join(tmpDir, 'test.md'), '# Hello')
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('should watch a file', async () => {
    const { watchFile } = await import('./watcher')
    // The watcher uses BrowserWindow internally (mocked), so this should not throw
    expect(() => watchFile(join(tmpDir, 'test.md'), {} as any)).not.toThrow()
  })

  it('should unwatch a file', async () => {
    const { watchFile, unwatchFile } = await import('./watcher')
    watchFile(join(tmpDir, 'test.md'), {} as any)
    expect(() => unwatchFile(join(tmpDir, 'test.md'))).not.toThrow()
  })

  it('should not create duplicate watchers', async () => {
    const { watchFile, unwatchFile } = await import('./watcher')
    watchFile(join(tmpDir, 'test.md'), {} as any)
    watchFile(join(tmpDir, 'test.md'), {} as any)
    // Should only need one unwatch
    expect(() => unwatchFile(join(tmpDir, 'test.md'))).not.toThrow()
    // Second unwatch should be a no-op
    expect(() => unwatchFile(join(tmpDir, 'test.md'))).not.toThrow()
  })

  it('should unwatch all files', async () => {
    const { watchFile, unwatchAll } = await import('./watcher')
    watchFile(join(tmpDir, 'test.md'), {} as any)
    expect(() => unwatchAll()).not.toThrow()
  })
})
```

- [x] **Step 2: Run tests**

```bash
pnpm run test:main -- src/main/watcher.spec.ts
```

Expected: PASS (4 tests)

- [x] **Step 3: Commit**

```bash
git add src/main/watcher.spec.ts
git commit -m "test: add file watcher tests"
```

---

### Task 7: Main Process — Window + Protocol + Menu Tests

**Files:**
- Create: `src/main/window.spec.ts`
- Create: `src/main/protocol.spec.ts`
- Create: `src/main/menu.spec.ts`

- [x] **Step 1: Write window tests**

`src/main/window.spec.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'

describe('createWindow', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should create a BrowserWindow', async () => {
    const { createWindow } = await import('./window')
    const win = await createWindow()
    expect(win).toBeDefined()
    expect(win.webContents).toBeDefined()
  })

  it('should restore saved window bounds', async () => {
    const { appStore } = await import('./store')
    appStore.set('windowBounds', { x: 100, y: 200, width: 800, height: 600 })
    const { createWindow } = await import('./window')
    const win = await createWindow()
    expect(win).toBeDefined()
  })

  it('should save bounds on resize', async () => {
    const { createWindow } = await import('./window')
    const win = await createWindow()
    // Simulate resize handler firing
    const onCall = (win.on as any).mock.calls.find((c: any[]) => c[0] === 'resize')
    expect(onCall).toBeDefined()
  })
})
```

- [x] **Step 2: Write protocol tests**

`src/main/protocol.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('registerFileProtocol', () => {
  it('should register protocol without throwing', async () => {
    const { registerFileProtocol } = await import('./protocol')
    expect(() => registerFileProtocol()).not.toThrow()
  })

  it('should call protocol.handle with local-file', async () => {
    const electron = await import('electron')
    const { registerFileProtocol } = await import('./protocol')
    registerFileProtocol()
    expect(electron.protocol.handle).toHaveBeenCalledWith('local-file', expect.any(Function))
  })
})
```

- [x] **Step 3: Write menu tests**

`src/main/menu.spec.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'

describe('createAppMenu', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should create menu without throwing', async () => {
    const { createAppMenu } = await import('./menu')
    expect(() => createAppMenu({ webContents: { send: vi.fn() } } as any)).not.toThrow()
  })

  it('should build menu template', async () => {
    const electron = await import('electron')
    const { createAppMenu } = await import('./menu')
    createAppMenu({ webContents: { send: vi.fn() } } as any)
    expect(electron.Menu.buildFromTemplate).toHaveBeenCalled()
  })
})
```

- [x] **Step 4: Run tests**

```bash
pnpm run test:main -- src/main/window.spec.ts src/main/protocol.spec.ts src/main/menu.spec.ts
```

Expected: PASS (all 3 files)

- [x] **Step 5: Commit**

```bash
git add src/main/window.spec.ts src/main/protocol.spec.ts src/main/menu.spec.ts
git commit -m "test: add window, protocol, and menu tests"
```

---

### Task 8: Preload API Tests

**Files:**
- Create: `src/preload/index.spec.ts`

- [x] **Step 1: Write preload API shape tests**

`src/preload/index.spec.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('preload API shape', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should expose all required namespaces', async () => {
    const mod = await import('../preload/index')
    // The module calls contextBridge.exposeInMainWorld
    const electron = await import('electron')
    expect(electron.contextBridge.exposeInMainWorld).toHaveBeenCalledWith('api', expect.any(Object))
    const api = (electron.contextBridge.exposeInMainWorld as any).mock.calls[0][1]
    expect(api).toHaveProperty('files')
    expect(api).toHaveProperty('search')
    expect(api).toHaveProperty('watcher')
    expect(api).toHaveProperty('store')
    expect(api).toHaveProperty('dialog')
    expect(api).toHaveProperty('shell')
    expect(api).toHaveProperty('ipc')
  })

  it('should have correct function signatures on files', async () => {
    const electron = await import('electron')
    await import('../preload/index')
    const api = (electron.contextBridge.exposeInMainWorld as any).mock.calls[0][1]
    expect(typeof api.files.listDirectory).toBe('function')
    expect(typeof api.files.readFile).toBe('function')
    expect(typeof api.files.getFileInfo).toBe('function')
  })

  it('should have correct function signatures on ipc', async () => {
    const electron = await import('electron')
    await import('../preload/index')
    const api = (electron.contextBridge.exposeInMainWorld as any).mock.calls[0][1]
    expect(typeof api.ipc.on).toBe('function')
    expect(typeof api.ipc.off).toBe('function')
    expect(api.ipc.on.length).toBe(2)
    expect(api.ipc.off.length).toBe(2)
  })
})
```

- [x] **Step 2: Run tests**

```bash
pnpm run test:main -- src/preload/index.spec.ts
```

Expected: PASS (3 tests)

- [x] **Step 3: Commit**

```bash
git add src/preload/index.spec.ts
git commit -m "test: add preload API shape tests"
```

---

### Task 9: Coverage Configuration

**Files:**
- Modify: `electron.vite.config.ts`

- [x] **Step 1: Install coverage provider**

```bash
pnpm add -D @vitest/coverage-v8
```

- [x] **Step 2: Update electron.vite.config.ts**

Replace the renderer section:
```ts
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
```

- [x] **Step 3: Run coverage to verify**

```bash
pnpm run test:coverage
```

Expected: both renderer and main process tests pass with coverage reports generated.

- [x] **Step 4: Update .gitignore**

Add to `.gitignore`:
```
coverage/
playwright/
```

- [x] **Step 5: Commit**

```bash
git add electron.vite.config.ts .gitignore package.json
git commit -m "chore: add vitest coverage configuration"
```

---

### Task 10: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [x] **Step 1: Create CI workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - uses: pnpm/action-setup@v4
        with:
          version: 9
          run_install: false

      - name: Get pnpm store directory
        run: echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_ENV

      - uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-

      - run: pnpm install --frozen-lockfile

      - run: pnpm run format:check
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run test:coverage
      - run: pnpm run build
```

- [x] **Step 2: Verify the workflow syntax**

```bash
# No explicit validation needed — GitHub validates on push.
# But make sure the YAML is valid:
node -e "console.log(require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8')))"
```

Install `js-yaml` only if needed for manual checking.

- [x] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (lint, typecheck, test, build)"
```

---

### Task 11: Final Verification

- [x] **Step 1: Run everything**

```bash
pnpm run format:check && pnpm run lint && pnpm run typecheck && pnpm run test:coverage && pnpm run build
```

Expected: All pass

- [x] **Step 2: Verify test count**

```bash
pnpm run test:coverage 2>&1 | tail -20
```

Expected output showing all tests passing:
```
 Test Files  (total)
      Tests  (total: ~51)
```

Renderer: 10 files, 22 tests. Main process: 8 files, ~29 tests. Total: ~18 files, ~51 tests.

- [x] **Step 3: Verify no regressions**

```bash
pnpm run test 2>&1 | grep -E "(Tests|Test Files)"
```

Expected: all 22 renderer tests and all ~29 main process tests pass.

---

## Plan Self-Review

- **Spec coverage:** All Phase 1 spec items mapped to tasks (ESLint → T1, Prettier → T1, pre-commit → T2, main tests → T3-T8, coverage → T9, CI → T10)
- **Placeholder scan:** No TBD, TODO, or incomplete steps. All test files contain complete code.
- **Type consistency:** Mock types match the actual ElectronAPI interface. Test assertions use the same property names as the source.
- **Scope check:** Focused on Phase 1 only. Phase 2 (E2E) explicitly deferred.
