# 宣誓爱 UniApp 前端

宣誓爱的唯一生产前端工程，目标端为微信小程序与 H5；H5 主要用于快速调试，关键流程以微信开发者工具验收为准。

## 快速开始

当前源码采用根目录式 UniApp X 结构（`.uvue` / `.uts`）。请优先使用 HBuilderX 打开本目录，然后运行到浏览器或微信开发者工具。

```bash
npm install
node tests/test-mock-system.js
```

`package.json` 保留了 `dev:h5`、`dev:mp-weixin`、`build:h5` 和 `build:mp-weixin`。这些 npm CLI 命令会默认寻找 `src/manifest.json`，即使手动指定根目录，仍会在解析 `App.uvue` 时失败，所以只用于诊断，不是运行入口。端侧编译用 HBuilderX。不要为绕过问题复制或移动受保护的 `manifest.json`、`pages.json`。详细说明见 [`docs/HOW_TO_RUN.md`](./docs/HOW_TO_RUN.md) 与 [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md)。

## 必读文件

| 文件 | 作用 |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | 项目级强约束与允许修改范围 |
| [`PRODUCT.md`](./PRODUCT.md) | 产品定位、功能边界与核心流程 |
| [`DESIGN.md`](./DESIGN.md) | 设计 Token、组件与视觉规范 |
| [`CLAUDE.md`](./CLAUDE.md) | AI 协作与开发执行说明 |
| [`docs/README.md`](./docs/README.md) | 工程文档索引 |
| [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) | 当前实现、已知差异与待确认项 |

## 目录结构

```text
api/                 统一数据接口与请求封装
components/          Xsa* 基础组件和业务组件
pages/               主包页面（五个 Tab、登录注册、父母端、情感实验室）
pagesSub/            分包二级页
mock/                开发期 Mock 数据
static/              静态资源
docs/                运行、接口、UI、排错与验收文档
tests/               当前测试脚本
uniCloud-aliyun/     既有云函数目录，未经确认不得修改
```

## 当前开发状态

- `api/config.uts` 当前为 `USE_MOCK = false`，`API_BASE_URL = http://127.0.0.1:8000`。这是本机联调地址，不是测试服，也不代表生产后端可用。
- 消息、父母端、情感实验室和纸飞机次数仍分别由 `MESSAGE_USE_MOCK`、`PARENT_USE_MOCK`、`EMOTION_LAB_USE_MOCK`、`PAPER_PLANE_CHANCE_USE_MOCK` 保持 Mock。
- 页面只能通过 `@/api` 获取业务数据，不直接依赖 `@/mock`。
- `manifest.json`、`pages.json`、`uniCloud-aliyun/` 是受保护区域，未经明确确认不得修改。
- 历史 HTML / design-demos 已退出开发链路，不是生产入口。

## 验证顺序

1. 运行 `node tests/test-mock-system.js`。
2. 使用 HBuilderX 运行到浏览器，记录第一条编译错误并完成 H5 快速回归。
3. 使用 HBuilderX 运行到微信开发者工具，检查关键路径；H5 不能替代小程序验收。
4. 在 npm CLI 能稳定编译本工程之前，不把 `npm run build:h5` / `npm run build:mp-weixin` 当作提交门禁。`npm run verify:mp` 只审计 HBuilderX 已经生成的产物。
5. 提交前按 [`AGENTS.md`](./AGENTS.md) 第 6 节做结构测试、`git diff --check` 与微信小程序关键路径回归。
