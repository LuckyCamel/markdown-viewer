# Markdown Viewer — 开发上下文

架构设计见 [`docs/architecture.md`](docs/architecture.md)，架构决策见 [`docs/adr/`](docs/adr/)。

## 深化机会

### 已完成 (2026-06-20 ~ 2026-06-22)

- App.tsx 拆分：提取 4 个 hook，281→159 行
- 死代码清理：`createStore.ts` 删除
- 集中式 IPC 适配器：`lib/ipc.ts` 封装所有 `window.api.*` 调用
- Store 搬迁集中 + 单元测试
- 忽略列表注入修复 + DEFAULT_IGNORE 去重
- IPC 通道常量规范化
- 错误处理全面硬化：主进程 + 渲染进程 + ErrorBoundary + E2E 拦截
- 主进程 handler 纯函数抽取 + 测试
- 全部 131 单元测试 + 29 E2E 测试通过

### 活跃

| # | 候选 | 优先级 | 问题 |
|---|------|--------|------|
| 1 | ContentSearch deps | 中 | useEffect 依赖数组不完整，过时闭包风险 |
| 2 | dirtyFiles 防御 | 低 | `getState().dirtyFiles` 返回可变 Set 引用 |
| 3 | E2E waitForTimeout 替换 | 低 | 固定等待替代基于断言的 `waitFor`，CI 下脆弱 |
