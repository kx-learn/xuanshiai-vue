# 运行与关键流程验证

> 更新日期：2026-09-01。请在 `xuanshiai-vue` 项目根目录运行命令。

## 环境

- Node.js 与 npm：安装依赖、执行结构检查。
- HBuilderX：`.uvue` 和 `.uts` 的首选编译入口。
- 微信开发者工具：小程序端关键路径验收入口。

安装依赖：

```bash
npm install
```

不要升级依赖大版本，也不要为命令行构建改写 `manifest.json` 或 `pages.json`。

## 当前演示配置

- `api/config.uts` 当前 `USE_MOCK = false`，`API_BASE_URL` 与 `LAN_API_BASE_URL` 都是 `http://127.0.0.1:8000`。真机不能使用这个回环地址。
- 普通用户消息中心、会话列表、申请列表、文字聊天、撤回和会话已读走 FastAPI；联系方式交换仅有本地 Mock 状态，不与后端同步；聊天媒体上传明确 fail-closed，不能发送。
- 父母端消息继续 fail-closed：后端尚未提供父母 acting subject 契约时，不复用普通用户消息接口。
- 演示登录只创建本地演示会话，不会提交真实 token、账号或子女关系数据；父母端 Mock 仅用于非消息流程核验。

## HBuilderX 与微信小程序

1. 在 HBuilderX 中打开本项目根目录。
2. 选择“运行到小程序模拟器 → 微信开发者工具”。
3. 编译后在微信开发者工具导入 `unpackage/dist/dev/mp-weixin`。
4. 每次修改 `.uvue` 或 `.uts` 后，重新编译并刷新模拟器。

H5 只用于快速预览和冒烟检查，不能替代微信小程序验收。当前根目录式工程的 npm CLI 不能作为端侧编译结论。

## 父母端关键流程

1. 在登录页勾选协议后，选择“演示登录，选择身份”。
2. 在身份引导中选择父母身份，进入 `/pages/parent/parent`。
3. 首页确认只展示一名已授权子女、资料摘要、推荐资料和私有喜欢列表。
4. 牵线页确认可查看红娘与私人定制顾问，但没有支付入口。
5. 消息页确认复用统一消息中心；当前父母 acting subject 后端尚未开放，消息读取和聊天保持 fail-closed，不以演示数据绕过子女授权或双方同意。
6. 候选详情确认清晰照片只在子女允许时显示，且没有联系方式交换入口。

父母实名、子女授权、聊天双向同意和照片隐私是安全边界，不得用演示配置绕过。

## 本地结构检查

核心、无外部服务的门禁：

```bash
npm test
```

核心门禁包含消息安全、跨仓 FastAPI 契约和稳定的页面/配置检查；跨仓测试默认读取相邻的 `../xuanshiai-backend`，也可通过 `XSA_BACKEND_ROOT` 指定后端目录。

全量测试会执行 `tests/` 下全部 Node 脚本，并如实暴露当前仍未收敛的历史失败：

```bash
npm run test:all
```

单独运行传统 Mock 检查：

```bash
node tests/test-mock-system.js
node tests/test-parent-slice.js
node tests/test-parent-chat-subject.js
git diff --check
```

完成 HBuilderX 编译后，可运行 `npm run verify:mp:dev` 检查小程序产物的页面声明、包体与懒加载配置。该检查脚本为项目自包含实现；只有在产物来自本次编译时，其结论才有意义。

## 发布验收门禁

这是本仓唯一的发布验收规范入口，CI 和文档索引共同指向本节。产品与设计来源为
[`authoritative/PRODUCT.md`](./authoritative/PRODUCT.md) / [`authoritative/DESIGN.md`](./authoritative/DESIGN.md)，
来源与 SHA-256 摘要保存在 [`authoritative/manifest.json`](./authoritative/manifest.json)。

1. 从目标前端 SHA 的干净检出开始，记录前端 SHA、后端契约 SHA 和工具版本，确认用户本地改动或旧产物未混入。
2. 安装锁文件依赖；运行 `node scripts/authoritative-docs.cjs --check` 和 `npm test`。
   跨仓测试用 `XSA_BACKEND_ROOT` 指定已记录 SHA 的后端 checkout。权威源缺失一半、来源漂移或快照摘要不符均失败。
3. 用 HBuilderX 编译该前端 checkout 的 mp-weixin，记录编译日志、产物目录及文件清单 SHA-256 摘要，关联目标前端 SHA。
   `npm run build:mp-weixin` 不是本工程认可的生成入口；旧 checkout 的产物不能证明本次改动通过。
4. 对同一新鲜产物实际运行 `npm run verify:mp` 与 `npm run test:artifact`。缺产物或任意 artifact SKIP 都失败；
   `verify:mp:dev` 的开发阈值不能替代发布阈值。
5. 提供微信开发者工具和物理真机证据，覆盖 320px、375px、390px、428px，记录 Console/Network 与关键路径。
   本批候选卡改动重点：首页推荐/广场、AI 与条件搜索姓名及公开字段、未知值和空标签、列表进入详情的可见性门禁。
   连续画像验收另含双主体独立、冻结预览整份确认、重复确认、撤权/重新授权与旧异步结果隔离。

源码 CI 仅证明源码和版本化文档检查结果；没有对应 SHA 的新鲜产物、质量门禁和端侧记录时，发布仍阻塞。
验证记录应分别写 PASS / FAIL / SKIP / NOT_RUN 与原因，不能把 H5、Mock 或 DevTools 模拟器通过写成真机通过。
测试不得调用付费 provider 或生产库；真实库验证只能使用已确认隔离的临时 MySQL/Redis。

## 常见问题

- `npm run build:mp-weixin` 提示找不到 `uni`：先执行 `npm install` 以安装项目依赖；仍不能编译时，改用 HBuilderX。
- 页面空白：先读取 HBuilderX 或微信开发者工具中的第一条错误。
- Mock 数据未出现：确认页面通过 `@/api` 调用，并检查全局与模块级 Mock 开关。
- 父母端被拦截：从登录页建立演示会话，并检查父母身份和子女授权状态；不要直接清空本地授权状态后跳转页面。
