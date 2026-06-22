## Goal
- Create E2E tests for file-tree.spec.ts (3 tests) and tabs.spec.ts (3 tests) for the Electron markdown-viewer

## Constraints & Preferences
- **工作语言：中文**。所有技术产出（规约、注释、提交信息、报告）默认使用中文。代码标识符、类型名、文件名保持英文。
- Use Playwright E2E testing with Electron via `e2e/utils.ts` (launchApp, createTestDir, writeFixture)
- App builds with `pnpm run build` to `out/`, test with `pnpm run test:e2e`
- Cannot use `dialog.openDirectory()` in tests (blocks); must mock via `electronApp.evaluate` IPC handler replacement
- Report file: `.git/sdd/task-4-5-report.md`

## Progress
### Done
- Created `e2e/file-tree.spec.ts` with 3 tests (show .md files, click opens tab, unsupported extensions shown)
- Created `e2e/tabs.spec.ts` with 3 tests (tab created with filename, switching tabs switches content, closing tab removes it)
- Added `clearStoredConfig()` to `launchApp()` in `e2e/utils.ts` — prevents stale lastWorkspace/openFiles/activeFile from previous runs
- Root-caused React error #185: `|| []` in zustand selectors creates new array reference every render → `useSyncExternalStore` infinite re-render loop
- Fixed FileTree selectors: removed `|| []` from `useFileStore((s) => s.entries[...])`, handle null with `?.map()` and `&&`
- All 10 E2E tests pass (43.2s)

### Blocked
- (none)

## Key Decisions
- Root cause was `useFileStore((s) => s.entries[rootPath] || [])` — `[]` is a new reference each render → `Object.is` mismatch → infinite `useSyncExternalStore` loop → React error #185
- Secondary issue: stale electron-store config from previous runs caused ENOENT on launch; fixed by clearing in `launchApp()`
- Did NOT apply `createStore.ts` wrapper (`api.getInitialState = api.getState`) — unnecessary; the `|| []` fix resolved the actual crash
- Did NOT need JSX-after-early-return restructuring — conditional rendering in return is fine

## Relevant Files
- `src/renderer/features/file-tree/FileTree.tsx`: fixed `|| []` selectors (lines 9, 49) with null-safe access
- `e2e/file-tree.spec.ts`: 3 file-tree tests
- `e2e/tabs.spec.ts`: 3 tabs tests
- `e2e/utils.ts`: added `clearStoredConfig()`, called in `launchApp()`
- `.git/sdd/task-4-5-report.md`: task report
