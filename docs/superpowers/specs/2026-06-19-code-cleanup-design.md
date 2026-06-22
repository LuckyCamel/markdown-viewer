# Code Cleanup — Design

## Overview

Remove three abandoned `App.tsx` alternative files and fix unused-variable warnings in the production `App.tsx`. Scope is deliberately limited to low-risk, high-confidence changes.

## Scope

| Operation | Files | Rationale |
|-----------|-------|-----------|
| Delete | `src/renderer/App.testA.tsx` | Abandoned App implementation, not imported anywhere |
| Delete | `src/renderer/App.testB.tsx` | Same |
| Delete | `src/renderer/App.testC.tsx` | Same |
| Fix warnings | `src/renderer/App.tsx` | Remove declared-but-unused variables that trigger `@typescript-eslint/no-unused-vars` |

## Detailed Changes

### File deletions

Three files are safe to delete because:
- They are not imported by any spec/component (confirmed via `import` statements)
- They are not referenced in any configuration (vitest, tsconfig)
- They do not contain unique logic — each is a partial/incomplete alternative of `src/renderer/App.tsx`

### App.tsx warning fixes

| Line | Variable | Problem | Action |
|------|----------|---------|--------|
| 25 | `theme` | assigned but only used as a type | Remove from destructuring; `setTheme` stays for init logic |
| 37 | `openFile` | assigned but never used | Remove destructuring entirely |
| 38 | `closeFile` | assigned but never used | Remove destructuring entirely |
| 39 | `setActive` | assigned but never used | Remove destructuring entirely |
| 55 | `workspacePath` | unnecessary dependency in useMemo | Remove from dependency array |

The `trackRecent`, `handleOpenFolder`, `handleOpenFile` callbacks, state init effects, file watcher effects, menu handlers, settings panel toggle, and JSX remain unchanged.

## Not in Scope

- Test files (`*.spec.ts`, `*.test.tsx`) — warnings there are pre-existing and expected
- Type-assertion warnings (`no-explicit-any`) — these are in tests and type declarations
- Unused-import warnings in other production files — not present based on lint output

## Verification

| Check | Command | Expected |
|-------|---------|----------|
| Lint | `pnpm run lint` | 0 errors, warnings reduced from 63 |
| Typecheck | `pnpm run typecheck` | 0 errors |
| Unit tests | `pnpm run test:coverage` | 51/51 passed |
| E2E tests | `pnpm run test:e2e` | 22/22 passed |
