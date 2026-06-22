# Packaging Config Cleanup 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复安装包文件名含空格问题，清理中间产物

**Architecture:** 仅修改 `electron-builder.yml` 和 `package.json` 的构建脚本，不涉及应用代码

**Tech Stack:** electron-builder, npm scripts

---

### Task 1: NSIS artifactName + 构建后清理

**Files:**
- Modify: `electron-builder.yml`
- Modify: `package.json` (scripts.package:win)

- [ ] **Step 1: 修改 `electron-builder.yml`**

在 `win` 段添加 `artifactName`：

```yaml
win:
  target: nsis
  artifactName: 'Markdown-Viewer-Setup-${version}.${ext}'
```

- [ ] **Step 2: 修改 `package.json` package:win 脚本**

追加清理命令：

```json
"package:win": "electron-vite build && electron-builder --win && powershell Remove-Item -Recurse -Force release/win-unpacked"
```

- [ ] **Step 3: 运行打包验证**

```bash
pnpm run package:win
```

预期输出：
- `release/Markdown-Viewer-Setup-1.0.0.exe`（无空格）
- `release/win-unpacked/` 不存在（已被清理）
- NSIS 安装包签名成功

- [ ] **Step 4: 提交**

```bash
git add electron-builder.yml package.json
git commit -m "chore: 规范安装包文件名，构建后清理中间产物"
```
