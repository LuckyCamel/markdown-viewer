# Code Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove 3 abandoned App.tsx alternatives and fix unused-variable warnings in the production App.tsx.

**Architecture:** Pure deletion and dead-code removal — no behavioral changes. Lint and test suites verify nothing is broken.

**Tech Stack:** ESLint, TypeScript, vitest, Playwright

## Global Constraints

- Do NOT modify test files (`*.spec.ts`, `*.test.tsx`) — warnings there are pre-existing
- Do NOT modify type-assertion warnings (`no-explicit-any`)
- All unit tests (51) and E2E tests (22) must continue passing unchanged
- TypeScript typecheck must pass with 0 errors
- Only files listed below may be changed

---

### Task 1: Delete abandoned test files

**Files:**
- Delete: `src/renderer/App.testA.tsx`
- Delete: `src/renderer/App.testB.tsx`
- Delete: `src/renderer/App.testC.tsx`

- [ ] **Step 1: Delete files**

```bash
git rm src/renderer/App.testA.tsx src/renderer/App.testB.tsx src/renderer/App.testC.tsx
```

- [ ] **Step 2: Verify deletion**

```bash
ls src/renderer/App.test*.tsx 2>&1 || echo "No matching files (expected)"
```

Expected output: `No matching files (expected)`

- [ ] **Step 3: Run lint to confirm warning count dropped**

```bash
pnpm run lint
```

Expected: warning count should be reduced by ~20 (from 63 to ~43). 0 errors.

- [ ] **Step 4: Run typecheck**

```bash
pnpm run typecheck
```

Expected: 0 errors

- [ ] **Step 5: Run unit tests**

```bash
pnpm run test:coverage
```

Expected: 51/51 passed, 10 renderer test files + 8 main test files

- [ ] **Step 6: Commit**

```bash
git add src/renderer/
git commit -m "chore: remove abandoned App.testA/B/C.tsx files"
```

---

### Task 2: Fix unused-variable warnings in App.tsx

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Read current App.tsx**

```bash
cat -n src/renderer/App.tsx | head -60
```

Current warnings (lines 25, 37, 38, 39, 55):
- Line 25: `theme` — assigned but only used as a type
- Line 37: `openFile` — assigned but never used
- Line 38: `closeFile` — assigned but never used
- Line 39: `setActive` — assigned but never used
- Line 55: `workspacePath` — unnecessary dependency in useMemo

- [ ] **Step 2: Remove unused destructuring from App.tsx**

Replace line 25:
```ts
  const theme = useUIStore((s) => s.theme)
```
→
```ts
  // theme removed — only setTheme is needed for init
```

Remove lines 37-39 entirely:
```ts
  const openFile = useTabStore((s) => s.openFile)
  const closeFile = useTabStore((s) => s.closeFile)
  const setActive = useTabStore((s) => s.setActive)
```

Remove `workspacePath` from the useMemo dependency array at line 55:
```ts
  }, [workspacePath])
```
→
```ts
  }, [])
```

- [ ] **Step 3: Verify lint passes with 0 warnings for App.tsx**

```bash
pnpm run lint
```

Expected: 0 errors, App.tsx should no longer appear in output. Total warnings should be reduced by ~5.

- [ ] **Step 4: Run full verification**

```bash
pnpm run typecheck && pnpm run test:coverage
```

Expected: typecheck 0 errors, 51/51 tests passed.

- [ ] **Step 5: Run E2E tests**

```bash
pnpm run build && pnpm run test:e2e
```

Expected: 22/22 passed.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "chore: remove unused variable declarations in App.tsx"
```

---

### Self-Review

1. **Spec coverage:** Plan covers both items in the spec (delete 3 files, fix App.tsx warnings). No gaps.
2. **Placeholder scan:** No TBD/TODO. All steps have exact commands and expected output.
3. **Type consistency:** Only one file modified (App.tsx) — no cross-task type dependencies.
