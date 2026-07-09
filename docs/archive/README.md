# 归档文档

本目录存放**已完成规划**与**历史规格**，只读追溯，不再作为活文档维护。

---

## 生命周期规则

```
规划期 → docs/planning/<主题>/   （可选，新功能大改时用）
实施中 → 同步更新 L2 活文档 + 必要时新增 ADR
完成后 → planning/ 迁入 archive/；L2 保留；CHANGELOG 记录
ADR    → 不修改正文；被推翻时写新 ADR 并在旧 ADR 标 superseded
```

阶段 4+ 若再用 spec 流程：产出物直接进 `docs/planning/phase4/`，完成后整包进 `archive/`，**不**再在 `docs/` 根目录长期堆放。

---

## 归档清单

| 路径 | 说明 |
|------|------|
| [history.md](history.md) | 版本里程碑与架构演进摘要 |
| [spec-v1.md](spec-v1.md) | V1 产品规格（2026-06 起草，历史参考） |
| [phase3/](phase3/) | 阶段 3 规划三件套（2026-07-09 实施完成，v1.2.1） |

---

## 入口

文档导航见根目录 [README.md](../../README.md#文档)。
