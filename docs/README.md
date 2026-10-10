# xuanshiai-vue 文档索引

本文档目录只描述当前 UniApp 工程。需求、设计和协作约束均随工程保存，不依赖工作区外的临时文件。

## 必读顺序

1. [`../AGENTS.md`](../AGENTS.md) — 强约束、允许修改范围与验收纪律。
2. [`../PRODUCT.md`](../PRODUCT.md) — 产品定位、功能边界与核心流程。
3. [`../DESIGN.md`](../DESIGN.md) — 设计 Token、组件与视觉规范。
4. [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) — 当前实现状态、已知差异和待确认项。
5. [`前端开发注意事项.md`](./前端开发注意事项.md) — 日常开发约定。

## 运行与排错

| 文档 | 说明 |
|---|---|
| [`HOW_TO_RUN.md`](./HOW_TO_RUN.md) | npm、HBuilderX、H5 与微信小程序运行方式 |
| [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) | 编译、Mock、uniCloud 提示与缓存问题 |
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | 当前实现、已知差异、保护配置与验收边界 |

## 开发专题

最新上游整合：[2026-10-02 验收与发布边界](verification/upstream-integration-20261002/README.md)。原直播保留，四轮相亲独立为 v2；包含实际通过项、既有失败与包体阻塞。

直播真实业务演练：[运行与模块交接](直播真实业务演练说明.md)、[2026-09-27验收记录](verification/live-business/README.md)。正常登录＋独立MySQL/Redis、无音视频；与离线Demo和正式TRTC分开。

直播试点：[开发与验收](直播试点开发与验收.md)。使用生产子项目和真实 FastAPI，不以外层历史大厅作为联调入口。

直播 Demo：[开发与演示说明](直播Demo开发与演示说明.md)、[AI 协作提示词](ai-collaboration/直播模块协作提示词.md)、[验证记录](verification/live-demo/README.md)、[Pen 设计说明](../design/README.md)。只有显式 `mode=demo` 使用本地状态，不代表真实连麦已验收。

| 文档 | 说明 |
|---|---|
| [`DEV_SUBAGENT_ORCHESTRATION.md`](./DEV_SUBAGENT_ORCHESTRATION.md) | 开发期 Luna 探索、Sol 修复强度阈值、调用回传与主模型复核规范 |
| [`COMMUNITY_HTTP_CHANGELOG.md`](./COMMUNITY_HTTP_CHANGELOG.md) | 社区 FE↔BE 联调修改记录 |
| [`服务红娘管理中心框架开发文档.md`](./服务红娘管理中心框架开发文档.md) | 总店红娘首页框架、支付门禁和后端联调契约 |
| [`红娘管理中心-数据看板开发文档.md`](./红娘管理中心-数据看板开发文档.md) | 8 项数据简报的固定顺序、占位规则与接口契约 |
| [`待完成事项.md`](./待完成事项.md) | 前端未完成事项（媒体上传、端侧回归、M04 后置） |
| [`ai-portrait-prompt.md`](./ai-portrait-prompt.md) | AI 画像提示词 |
| [`backend-gaps-ai-portrait.md`](./backend-gaps-ai-portrait.md) | AI 画像后端缺口 |
| [`前端开发注意事项.md`](./前端开发注意事项.md) | 日常开发约定 |

## 组件文档

- [`../components/README.md`](../components/README.md) — 基础组件。
- [`../components/BUSINESS_COMPONENTS.md`](../components/BUSINESS_COMPONENTS.md) — 业务组件。

## 已退出开发链路的内容

- 历史 XMind 不再是需求源。
- 历史 HTML Demo 已退出开发链路，不继续迁移或维护。
- 定版 PRD 优先级高于临时功能说明；本目录只保留仍存在的现役文档。
