# xuanshiai-vue 文档索引

本文档目录只描述当前 UniApp 工程。需求、设计和协作约束均随工程保存，不依赖工作区外的临时文件。

## 必读顺序

1. [`../AGENTS.md`](../AGENTS.md) — 强约束、允许修改范围与验收纪律。
2. [`authoritative/PRODUCT.md`](./authoritative/PRODUCT.md) — 随仓版本化的权威产品快照；来源为工作区根 PRODUCT.md。
3. [`authoritative/DESIGN.md`](./authoritative/DESIGN.md) — 随仓版本化的权威设计快照；来源为工作区根 DESIGN.md。
4. [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) — 当前实现状态、已知差异和待确认项。
5. [`前端开发注意事项.md`](./前端开发注意事项.md) — 日常开发约定。

快照来源与 LF 归一化摘要见 [`authoritative/manifest.json`](./authoritative/manifest.json)。
执行 `node scripts/authoritative-docs.cjs --check` 校验；若工作区根文档存在，必须同时存在且与快照摘要一致。
只有权威源正式更新后才执行 `--sync`，不能从仓内根 PRODUCT/DESIGN 历史镜像生成快照，也不能修改摘要来掩盖漂移。
仓内 [`../PRODUCT.md`](../PRODUCT.md) / [`../DESIGN.md`](../DESIGN.md) 保留为历史资料，不作为当前需求入口。

## 运行与排错

| 文档 | 说明 |
|---|---|
| [`HOW_TO_RUN.md`](./HOW_TO_RUN.md) | npm、HBuilderX、H5 与微信小程序运行方式 |
| [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) | 编译、Mock、uniCloud 提示与缓存问题 |
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | 当前实现、已知差异、保护配置与验收边界 |
| [`HOW_TO_RUN.md#发布验收门禁`](./HOW_TO_RUN.md#发布验收门禁) | 唯一发布验收入口：目标 SHA、HBuilderX 产物摘要、质量检查与端侧证据 |

## 开发专题

| 文档 | 说明 |
|---|---|
| [`COMMUNITY_HTTP_CHANGELOG.md`](./COMMUNITY_HTTP_CHANGELOG.md) | 社区 FE↔BE 联调修改记录 |
| [`服务红娘管理中心框架开发文档.md`](./服务红娘管理中心框架开发文档.md) | 总店红娘首页框架、支付门禁和后端联调契约 |
| [`红娘管理中心-数据看板开发文档.md`](./红娘管理中心-数据看板开发文档.md) | 8 项数据简报的固定顺序、占位规则与接口契约 |
| [`待完成事项.md`](./待完成事项.md) | 前端未完成事项（媒体上传、端侧回归、M04 后置） |
| [`plans/2026-10-10-structure-simplification.md`](./plans/2026-10-10-structure-simplification.md) | 分批结构精简计划、本批范围和延期条件 |
| [`前端开发注意事项.md`](./前端开发注意事项.md) | 日常开发约定 |

## 组件文档

- [`../components/README.md`](../components/README.md) — 基础组件。
- [`../components/BUSINESS_COMPONENTS.md`](../components/BUSINESS_COMPONENTS.md) — 业务组件。

## 已退出开发链路的内容

- 历史 XMind 不再是需求源。
- 历史 HTML Demo 已退出开发链路，不继续迁移或维护。
- 定版 PRD 优先级高于临时功能说明；本目录只保留仍存在的现役文档。
