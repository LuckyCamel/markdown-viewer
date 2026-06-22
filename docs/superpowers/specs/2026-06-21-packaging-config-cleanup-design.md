# Packaging Config Cleanup

## Problem

1. 安装包文件名含空格：`Markdown Viewer Setup 1.0.0.exe`
2. 构建产物包含无需的 `release/win-unpacked/` 目录

## Design

### artifactName

在 `electron-builder.yml` 的 `win` 段添加 `artifactName`，覆盖输出文件名而不影响 `productName`（应用显示名）：

```yaml
win:
  target: nsis
  artifactName: 'Markdown-Viewer-Setup-${version}.${ext}'
```

输出：`release/Markdown-Viewer-Setup-1.0.0.exe`

### 构建后清理

`release/win-unpacked/` 是 electron-builder NSIS 构建的中间产物，无法阻止生成。在 `package.json` 脚本中追加清理命令：

```json
"package:win": "electron-vite build && electron-builder --win && powershell Remove-Item -Recurse -Force release/win-unpacked"
```

### 非目标
- 不改 `productName`（保持应用显示名 `Markdown Viewer`）
- 不改其他平台（mac/linux）构建配置
- 不引入新依赖
