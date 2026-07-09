# ADR-0003: zustand 状态管理选型

## 元数据
- **状态**：已采纳
- **日期**：2026-07-07
- **决策者**：AI agent + 用户

## 上下文
Tauri 桌面应用需要在前端管理多种状态：文件树数据、标签页列表、编辑器内容、搜索结果、UI 偏好、用户设置等。这些状态有不同的作用域和更新频率，需要选择合适的客户端状态管理方案。

## 选项

- **选项 A：Redux Toolkit** — 社区标准，单一 store + reducer 模式
  - 优：生态成熟，DevTools 完善，模式统一
  - 劣：样板代码多；单一 store 不利于按 feature 分割；对中等规模应用偏重

- **选项 B：zustand（采纳）** — 轻量级 store，每 feature 独立 store
  - 优：零样板、极小体积；每个 store 独立，天然按 feature 分割；hook 友好；selector 订阅避免不必要渲染
  - 劣：缺少官方 DevTools（需第三方中间件）；无强制模式约束，依赖团队规范

- **选项 C：Jotai** — 原子化状态，每个状态单元独立
  - 优：细粒度更新，极佳渲染性能
  - 劣：原子间依赖管理复杂；对"标签页 + 文件树"等关联状态建模不如 store 直观

## 决策
选择选项 B：zustand。

- 每个 feature 维护独立 store（useFileStore、useTabStore、useEditorStore 等）
- Store 间无交叉依赖，组件通过 hook 订阅所需 slice
- 使用 `create` 工厂函数 + TypeScript 类型推导，无需额外泛型

## 后果
- **正面**：6 个 store 各自独立，feature 间零耦合；新增 feature 只需新建 store，不影响已有代码；组件粒度订阅，渲染性能优
- **负面**：无统一约束需团队自律（如不跨 store 引用）；调试时需手动定位目标 store
- **现状**：6 个 store 运行稳定，所有 feature 测试覆盖完整
