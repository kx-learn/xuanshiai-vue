# 2026-10-02 最新上游整合验收

## 交付范围

前端基线 `kx-learn/xuanshiai-vue/main`：`a45fae5bf1bf6e4a1f604098241abdb4ad843f6f`；后端基线 `kx-learn/xuanshiai/main`：`50c8001fc3192548747f5368f60e327c87f68d95`。本地工作在两边 `feature/integrate-live-business` 整合，保留上游最新页面和接口，不改写 `main`。外层历史副本不提交。

上游直播 `api/live.uts` 保留；本地四轮相亲使用 `api/live-v2.uts` → `/api/v1/live/v2` → `live_v2_*` 表。两套模型不同，不共用状态或迁移正式数据。v2 六个页面、Demo 与真实业务演练共用页面而隔离数据来源。

## 本次维护

- 合入父母真实授权、子女主体隔离、MBTI 持久化、场后免费申请以及实时房间能力，沿用上游普通聊天、申请与认证流程。
- 切换账号后丢弃旧请求结果；旧请求的 401 不清除新账号会话。
- Demo 显式 `mode=demo`，不申请媒体、不请求后台、不修改用户身份；正常入口不回退 Mock。
- 恢复上游分包路由，增加 v2 六页面及原生媒体组件声明；修复合并及原源码中的括号、导出和条件编译错误。
- 通知新增“直播场次”；申请展示免费机会来源；父母红娘卡片不展示指标、价格或评分。
- 情感实验室测试与资料走真实后端；上游尚无真实推荐接口，明确显示“合拍推荐暂未开放”，保留显式 Mock 的推荐演示，不伪造空结果或刷新成功。

## 启动

```powershell
# 工作目录：xuanshiai-vue
& D:/HBuilderX/cli.exe launch mp-weixin --project xuanshiai-vue --compile true
$env:XSA_BACKEND_ROOT='D:/项目/宣誓爱后端/xuanshiai'
node tests/run-tests.cjs
node tests/run-tests.cjs --all
node tests/test-mock-system.js
npm run verify:mp
git diff --check
```

微信工具打开 `unpackage/dist/dev/mp-weixin`。离线讲解入口：`pagesSub/live/lobby`，参数 `mode=demo`。真实业务不带参数，必须连接隔离后端并正常登录；按 [业务演练说明](../../直播真实业务演练说明.md) 准备，不写假 Token。本机 HTTP 联调需按用户已授权范围，在微信“详情 → 本地设置”关闭合法域名检查；只作用于开发产物的本地配置，不修改云平台或作为上线方案。

微信自动化使用 `scripts/verify-live-demo-devtools.cjs`、`scripts/verify-live-business-devtools.cjs`，参数为已安装的 `miniprogram-automator` 模块路径。`XSA_VERIFICATION_DIR` 指定新证据目录，避免覆盖旧记录；自动化端口 9420。业务脚本拒绝覆盖已有登录，只清理由它正常登录的合成账号。

## 验证结果

| 检查 | 实际结果 |
| --- | --- |
| HBuilderX 5.26 微信小程序 | 编译成功，74 个页面全部生成；uniCloud 未关联提示不代表 FastAPI 失败 |
| 前端核心回归 | 16/16 passed |
| 全量前端测试 | 71/88 passed，17 failed，0 skipped |
| 直播全部十组契约／状态测试 | 通过；包含上游直播与本地 v2、Demo、真实入口隔离和 SDK 测试替身 |
| 父母权限／路由等定向回归 | 45 passed；其中新增生产 UTS 行为矩阵 40 项 |
| 真实后端集成 | 四轮 HTTP/Redis/WebSocket 2 passed；父母 MBTI 1 passed；媒体事务 1 passed |
| 微信 Demo 实际交互 | 通过：390px，四轮、三组交流、无人互选、退出、暂停、申请、同意、拒绝及双向演示聊天；零真实业务／媒体／身份写入调用 |
| 微信真实业务界面 | 通过：390px，正常测试短信登录、账号搜索、完整名单创建、排期、带版本编辑；真实 HTTP、MySQL、Redis，无媒体 |
| 严格 `verify:mp` | 未通过：主包约 5.52 MiB，限额仍为 2 MiB；直播分包约 247 KiB；各分包、媒体阈值、懒加载与页面完整性通过 |
| 发行编译探查（不上传） | HBuilderX 提示 DCloud appid 不存在；未修改平台 AppID 或创建云资源 |
| Graphify | 从外层工作区执行 `graphify update .` 成功，2920 nodes / 3026 edges / 286 communities；仅本地图谱，不提交外层仓库 |

### 未通过项与边界

前端剩余 17 个测试文件：API 标签目录、社区流程／关注刷新／视觉、展示一致性、私人定制支付、动态卡、情感实验室旧页面契约、帮助、红娘管理中心、Mock 浮层菜单、墨香文档／角色路径、六页重构、置顶支付与会员卡。均属于上游原有失败或旧接口／目录断言；本次修复了合并损坏并更新已授权的父母、分包、消息契约，没有提高阈值、吞错或把未验证标为通过。详细原始对照保留在本机 `xsa-unit-review-20261002-1745`。

`test-mock-system.js` 的失败是“更多菜单在页面浮层内绝对定位”旧约定；该脚本即使失败也打印建议性结尾，必须按退出码和失败项判断。

主包还包含上游 MBTI 图片、地区字典与主包公共代码，不能因 v2 分包较小就宣称满足上传限制；需要专门完成全项目主包拆分／素材治理及发行验证。本次不为通过检查而修改预算或删除业务页面。

320／375／428 宽度、iOS／Android 真机和真实音视频仍未验证。腾讯云 Key、微信音视频权限、真实连麦、强制下台、混流、CDN 及正式发布都不在本次通过声明内。

## 交接与提交

上游草稿 PR：[前端 #28](https://github.com/kx-learn/xuanshiai-vue/pull/28)、[后端 #46](https://github.com/kx-learn/xuanshiai/pull/46)。两者是配套交付，不把新版前端单独指向未包含这些接口的旧后端。

前端首次远端 CI（提交 `cd5889c`，运行 `36996982760`）为 14 passed / 1 skipped / 1 failed：工作流固定 checkout 后端上游默认分支，缺少尚在后端 #46 的 `app/api/routes/message.py`，故真实消息契约检查失败。本地 16/16 是使用配套后端分支的结果，不能替代此远端结果。维护者应先审查、合入配套后端再重跑，或另行批准 CI 使用明确的配套后端提交；本次未绕过检查、改工作流或自动合并主线。另有上游原存的 `xuanshiai` gitlink 缺少 `.gitmodules` 的清理警告，不是本次新增，也不是当前测试退出原因。

本次截图与机器结果分别保存在 [Demo 证据](demo/devtools-result.json) 和 [真实业务证据](business/devtools-result.json)。旧 `live-demo/`、`live-business/` 目录继续作为历史记录，不覆盖本次结论。

详细业务、运行和提示词入口：[真实业务演练](../../直播真实业务演练说明.md)、[Demo 手册](../../直播Demo开发与演示说明.md)、[AI 协作提示词](../../ai-collaboration/直播模块协作提示词.md)。后端见 `docs/upstream-integration-20261002.md`。

本地源码备份与 stash 保留在 `D:/项目/.local-backups/live-upstream-20261002/` 和两仓库 `stash@{0}`。上游已删除的旧脚本／文档不重新引入 Git；已有个人 Pen 文件不修改、不混入代码提交。前端推送个人与上游同名任务分支，后端推送个人分支并用 Draft PR 交付上游，不自动合并。
