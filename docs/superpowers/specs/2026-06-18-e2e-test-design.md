# E2E Test — Phase 2 Design

## Overview

Add Playwright + Electron end-to-end tests covering all critical user workflows: app startup, file tree navigation, markdown rendering, tab management, search, theme switching, settings, keyboard shortcuts, link handling, and file monitoring. Phase 2 builds on Phase 1's CI and unit test infrastructure.

## Scope (Phase 2)

| Area | Deliverables |
|------|-------------|
| Test framework | Playwright with `electron.launch()` (uses Electron's built-in Chromium) |
| Test data | `e2e/fixtures/` — 6 Markdown files covering GFM, math, mermaid, code, links, nested |
| E2E tests | 9 test files, ~19 tests across all user-facing workflows |
| CI | GitHub Actions `e2e` job (parallel to `ci`), `xvfb-run` for headless display |

## Files Changed / Created

### New files (~18)

```
e2e/
├── playwright.config.ts
├── utils.ts
├── fixtures/
│   ├── basic.md
│   ├── math.md
│   ├── mermaid.md
│   ├── code.md
│   ├── links.md
│   └── nested/
│       └── deep.md
├── app.spec.ts
├── file-tree.spec.ts
├── markdown-rendering.spec.ts
├── tabs.spec.ts
├── search.spec.ts
├── theme.spec.ts
├── settings.spec.ts
├── shortcuts.spec.ts
└── links.spec.ts
```

### Modified files (~2)

```
package.json              # add test:e2e script + @playwright/test dep
.github/workflows/ci.yml  # add e2e job (xvfb-run)
```

## Detailed Design

### 1. Playwright Config

**`e2e/playwright.config.ts`:**
- Single worker (Electron can't parallelize)
- 30s test timeout, 10s assertion timeout
- headless: true
- HTML reporter output to `playwright-report/`
- No browser download needed (Electron uses its own Chromium)

### 2. Test Utilities

**`e2e/utils.ts`:**
- `launchApp()` — starts Electron with `electron.launch()`, returns `{ electronApp, page, cleanup }`
- `createTestDir()` — creates temp directory for test fixtures, returns `{ path, cleanup }`
- `writeFixture()` — writes a file into the temp directory, creating parent dirs as needed

### 3. Test Files and Coverage

| File | Tests | Key assertions |
|------|-------|----------------|
| `app.spec.ts` | 3 | window title, welcome page, file tree panel visible |
| `file-tree.spec.ts` | 2 | open directory renders files, click file opens tab |
| `tabs.spec.ts` | 3 | open tab, switch content, close tab |
| `markdown-rendering.spec.ts` | 5 | tables, code blocks, math (KaTeX), mermaid (SVG), GFM |
| `search.spec.ts` | 2 | Ctrl+P opens file search, Ctrl+Shift+F opens content search |
| `theme.spec.ts` | 1 | toggle theme changes class on `<html>` |
| `settings.spec.ts` | 2 | Ctrl+, opens, Escape closes |
| `shortcuts.spec.ts` | 2 | Ctrl+B toggles file tree, Ctrl+T toggles outline |
| `links.spec.ts` | 1 | internal .md link opens in new tab |
| **Total** | **~19** | |

### 4. CI Integration

New `e2e` job in `.github/workflows/ci.yml`:

```yaml
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: pnpm/action-setup@v4
        with: { version: 9, run_install: false }
      - run: echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_ENV
      - uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - run: xvfb-run pnpm run test:e2e
```

Runs in parallel with the `ci` job. Requires `xvfb-run` for virtual display on Linux.

### 5. Test Fixtures

```
e2e/fixtures/
├── basic.md       # GFM: headings, bold, italic, strikethrough, lists, tables, task lists, blockquotes, footnotes
├── math.md         # KaTeX: inline $...$ and block $$...$$
├── mermaid.md      # graph TD diagram
├── code.md         # javascript + python code blocks
├── links.md        # internal .md link + external https link
└── nested/
    └── deep.md     # simple file in subdirectory
```

### 6. Key Design Decisions

- **Build-first:** E2E tests run against `pnpm run build` output (`out/`), not dev server. This matches production behavior.
- **No browser download:** Electron has its own Chromium. `electron.launch()` from `@playwright/test` handles this.
- **Single worker:** Electron apps are stateful (single window, single process). Tests run sequentially.
- **Temp directories per test:** Each test creates its own fixture directory via `createTestDir()`, ensuring isolation.
- **No visual regression:** Screenshot comparison deferred to future phase.

## Non-goals (explicitly excluded from Phase 2)

- macOS/Windows CI runners (deferred to packaging phase)
- Visual regression / screenshot diff testing
- Performance / load / stress testing
- DevTools Protocol deep debugging
- Cross-application integration testing

## Dependencies to Add

```
devDependencies:
  @playwright/test
```
