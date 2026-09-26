# 当前工程状态

> 更新日期：2026-09-25。
> 用途：只记录可由当前代码核对的状态。带日期的验收段落是当时记录，不自动代表今天的运行结果。
> 不把占位实现、Mock 或历史配置写成已完成生产能力。

## 微信小程序产物验收（历史记录：2026-09-01）

- HBuilderX `5.24` 已成功编译 `mp-weixin`，产物目录为 `unpackage/dist/dev/mp-weixin`，可直接导入微信开发者工具。
- `npm run verify:mp` 已通过：主包 `1,859.6 KiB`，全部 6 个分包均低于 `2 MiB`，其中 `pagesSub/profileExtra` 为 `1,265.6 KiB`；全部媒体文件不超过 `200 KiB`，且 `lazyCodeLoading=requiredComponents`。
- 编译产物与 `app.json` 交叉验证：61 个声明页面均已生成。父母端、昵称编辑、资料标签与 AI 军师会话入口的接口导出检查通过。

## 服务红娘管理中心（2026-08-30，首页框架已重做）

- **范围：** 在“我要做红娘”页面保留总店红娘工作台入口及已付款、账号已激活的访问门禁。本期只实现参考图中的首页结构：欢迎区、8 项门店数据简报、5 个快捷入口、推广工具、10 个功能入口和退出登录。
- **当前实现：** `MatchmakerManagementCenter` 看板仅提供字段骨架，所有未接入指标统一显示 `--`，不渲染 Mock 用户、金额、数量或明细页。`资料待审` 是独立的前端 Mock 工作流，用于审核、弃海、捞取、联系、跟进和录入等交互演示，不代表真实用户数据、联系方式授权或服务端写入；接口契约见 [`服务红娘管理中心框架开发文档.md`](./服务红娘管理中心框架开发文档.md)。
- **未完成：** 测试服尚未实现管理中心访问与首页接口。审核、资料编辑、联系方式、弃海、牵线约见、分成结算、推广生成和各入口业务页均未接入，不能视为生产可用。

## 已具备的前端能力

- UniApp、Vue 3 与 UTS 工程结构；微信小程序是第一验收端。
- 常规用户的首页、牵线、社区、消息、我的，以及相应分包页面和 Mock 数据。
- 父母端独立四面板：首页、牵线、消息、我的。
- 父母端的单子女资料摘要、候选推荐、私有喜欢、申请认识、候选详情、举报和屏蔽页面流程。
- 父母端受保护消息主体和候选照片可见性的数据边界。
- AI 分身与 AI 军师仅恢复给普通用户；父母代聊不会进入这两条路径。

## 当前演示模式

- 全局 `USE_MOCK = false`，但消息、父母端、情感实验室和纸飞机次数仍走模块级 Mock，见下一节。
- 父母端固定使用独立 Mock，并保持当前登录账号、父母身份和关联子女主体的本地隔离。
- 演示登录会建立本地演示会话；它不能证明真实身份、父母关系或服务端授权已经通过。

## 后端对接状态（配置核对：2026-09-25）

- 全局 `USE_MOCK = false`，当前 `API_BASE_URL` 与 `LAN_API_BASE_URL` 都是 `http://127.0.0.1:8000`。这是本机联调地址，不是测试服 `https://xhztest.xyz`，也不是生产域名。
- 纸飞机获取次数仍使用本地 Mock（`PAPER_PLANE_CHANCE_USE_MOCK = true`）。
- 消息、父母端、情感实验室分别由 `MESSAGE_USE_MOCK`、`PARENT_USE_MOCK`、`EMOTION_LAB_USE_MOCK` 保持 Mock。

## 媒体与互动扩展（2026-07-26）

- 已补：评论点赞、纸飞机语音上传播放、纸飞机回复转匿名会话（页内面板）。
- 真实私信仍仅申请同意后开启；消息 Tab 的 /chat/sessions 联调不在本次。

## M04 AI 画像（历史记录：2026-08-20）

- 2026-08-20 的页面入口是 `pagesSub/profileExtra/my-portrait.uvue`。2026-09-25 的 `pages.json` 已不再登记该页；现役画像路由是 `my-portrait-master`、`my-portrait-result`、`my-portrait-archive`。
- 同日记录的测试、包体和「HBuilderX 未定位」只描述 2026-08-20，不能当作当前验收。
- 当时后置项：真实 ASR、后端 `/ai/*` 联调、67% 提前建构、暂停 / 恢复 / 重新开始。是否已完成以当前代码和后端门禁为准，本文不补写未复验结论。

## 1. 当前可确认的工程事实

- 技术栈：UniApp / Vue 3，页面和组件以 `.uvue` 为主，逻辑以 `.uts` 为主。
- 主目标端：微信小程序；H5 用于快速调试。
- `pages.json` 于 2026-09-25 登记主包 10 页 + 6 个分包共 57 页，合计 67 页。五个 Tab 为 **首页 / 红娘服务 / 社区 / 消息 / 我的**（`pages.json` tabBar 第二项文本就是「红娘服务」，属受保护配置）。
- 社区闭环子路由（`pages.json` 已登记）：话题列表/详情、动态详情、活动列表/详情/我的活动、纸飞机、社区通知、发布。
- 社区主 Tab：**关注 / 同城 / 发现**；二级筛选随主 Tab 切换：
  - 关注：`全部 / 关注 / 喜欢`（喜欢 = 用户级喜欢关系，不是帖子点赞）
  - 同城：`全部 / 热门 / 最新`
  - 发现：`全部 / MBTI / 校友`（TOPIC 面板仅在「发现·全部」；「同乡」筛选已在 fc026f0 移除，勿凭旧资料恢复）
- 已有 `Xsa*` 组件含 `XsaDynamicCard`、`XsaApplySheet`、`XsaReportSheet` 等；实名门槛见 `utils/realNameGate.uts`（`passed|missing|reviewing|rejected`，兼容 pending/failed）。
- 认证门槛：常规社区互动、申请认识、参与话题 / 带话题发布均仅要求实名通过；双重认证仅作展示加分。
- 已有 `api/` 与 `mock/` 分层；**社区 API 已支持 Mock / FastAPI 双路径**（`config.uts` + `request.uts` HTTP Bearer + `community.uts` map*）。当前社区 1.0 验收配置为 `USE_MOCK = false`；需要纯结构预览时才临时切回 `true`。
- 申请认识：`applyToMeet` Mock 幂等（重复申请 `success:false`）；**真路径** `POST /discovery/applications/{id}` + 刷新 quotas；409 → failRes。喜欢用户：`likeUser` 真路径 `PUT|DELETE /users/{id}/like`，likes 列表 `page_size≤50` 分页预检。
- 社区 API 另导出：删帖/删评/取关/我的纸飞机；关注 Tab「全部」真路径 **`mode=following_and_liked`**（关注∪用户级喜欢，BE 分页；原客户端假并集已撤）。
- **联调总账：** [`COMMUNITY_HTTP_CHANGELOG.md`](./COMMUNITY_HTTP_CHANGELOG.md)。
- 2026-07-24：社区动态卡字段密度、发布页话题/声明/视频/表情、通知三栏已按设计实现（Mock + 页面渐进增强）；真机视频上传与 COS 仍属二期。
- 用户肖像资源位于 `static/portraits/`。
- 历史 HTML 参考已冻结，不再作为实现主线。

## 2. 运行与构建状态

- npm CLI 当前不能作为端侧验收：默认读取不存在的 `src/manifest.json`；指定项目根目录后仍会在解析 `App.uvue` 时失败。`npm run build:mp-weixin` / `dev:mp-weixin` 不能生成验收产物。
- 端侧编译入口是 HBuilderX。产物目录为 `unpackage/dist/dev/mp-weixin`；`npm run verify:mp` 只审计这份已有产物。
- 不得通过移动受保护配置、复制双份 `manifest.json` / `pages.json` 或批量改写 `.uvue` 来隐藏该架构差异。
- 2026-09-01 及更早的包体、页面数和模拟器通过记录保留在上文历史段落，不代表 2026-09-25 重新编译通过。
- **社区门槛（实现覆盖）：** 浏览无需认证；互动与申请认识仅 `realNameStatus === 'passed'`；学历只展示不拦截；举报/拉黑无门槛。
- **微信 AppID 历史记录：** 2026-07-27 以前曾使用 `touristappid`/空 AppID；该状态已由当前授权 AppID `wxb5f4e639f4eb2591` 替换，验收以最新 HBuilderX 产物为准。

## 3. 页面成熟度说明

路由存在不等于功能已经生产就绪。当前登录、注册、发布、编辑资料、认证、会员、设置等页面仍可能包含静态展示或占位交互；验收时必须以实际代码和定版 PRD 为准。

聊天详情页已经存在，但产品规则仍是“先申请认识、双方同意后再建立沟通”。不得把现有页面理解为允许陌生人直接私信。

## 4. 当前后端 / 联调状态

- `api/request.uts`：`USE_MOCK=true` 走 mock；`false` 走 FastAPI HTTP（Bearer）。不再按 `useHttp` 回退 uniCloud。
- 2026-09-25 仓库配置是 `API_BASE_URL=http://127.0.0.1:8000`，`LAN_API_BASE_URL` 也是回环地址；token 存 `xsa_access_token`。真机需要改成当前可达局域网地址。测试服 `https://xhztest.xyz` 不是当前默认值。
- 2026-07-25 的本地 HTTP 冒烟和关 Mock 端侧记录只证明当天环境，不证明当前后端、模拟器或真机仍然通过。
- 实测顺带修：BE `discovery._viewer_context` 缺 `user_auth` JOIN（R-T1）；社区 feed `up.school` → `ua.school`（R-T2）。
- 物理手机扫码预览、正式发布配置和阶段 C 仍开放；本地 DevTools 通过不能替代生产验收。
- BE：`set_like` 不再互喜欢建会话（对齐先申请再聊）；quotas VIP 用 `end_at`；额度 Redis 键 UTC 统一。
- **同城城市（2026-07-25 续）：** 独立偏好 `community_city_*`（**不写** residence）；一周限改 429；`mode=city` **只按** 帖子 `p.location`；锚点请求→偏好→现居回落；未设城 FE CTA「选择城市」。Live：`tests/live/test_community_city_http.py`。详见 changelog「同城偏好独立 + location-only + 一周限改」。
- Mock 应按模块逐步退役，不删除作为契约样例的有效数据；当前社区联调保持 `USE_MOCK = false`，其它尚未接入真实后端的模块仍按模块保留 Mock。
- 仍后置：消息页 applications 真路径、聊天 sessions FE、纸飞机 reply 幂等、区级筛选/完整 regions 选择器、自动化 E2E 入库；见 changelog deferred。

## 5. 配置与产品边界差异

以下是现有配置中的历史或预留项，不代表已批准产品能力：

- `manifest.json` 包含定位、麦克风等 App 权限描述。
- 权限文案提到“附近推荐”“语音聊天和视频通话”，与当前认真婚恋、申请认识优先的产品边界并不完全一致。
- `manifest.json` 引用 `static/logo.png`；该文件目前存在于仓库，不代表已完成正式品牌定稿。

这些内容属于受保护配置，本文只记录差异；修改前需明确授权并同步产品、设计与隐私说明。

## 6. 设计实现差异

- `DESIGN.md` 现役圆角等级含 4 / 6 / 8 / 9 / 12 / 16 / 999px。
- `uni.scss` 可能仍残留旧工具类；新页面遵循 `DESIGN.md`，不要继续复制未评审色值或旧圆角。
- 全局 Token 的统一修改需要设计评审。
- `pages.json` 只能使用平台支持的静态色值，不能直接引用 CSS 变量；其中颜色应视为平台配置映射，而非新增设计 Token。
- **Token 运行时（2026-07-22 方案 A）**：语义名不变；色值为 hex/rgba。全局注入在 `App.uvue` 的 `page { --token }`（进入微信 `app.wxss`），并与 `uni.scss` 对齐。业务继续用 `var(--token)`，禁止 `oklch()` 与页面散落字面色。
- 历史产物 `unpackage/dist/dev/mp-weixin` 在未重新编译前可能仍是旧样式；验收以 HBuilderX 重新运行到微信开发者工具后的结果为准。

## 7. 当前需求依据

定版产品定义以工作区根 `../PRODUCT.md` 为唯一权威；本目录 `PRODUCT.md` 是实现侧参考，不是第二份产品真相。裁决优先级：

1. **用户本次明确授权**
2. **`../PRODUCT.md`：** 产品定位、原则、边界与当前基线
3. **`AGENTS.md` 硬约束**
4. **`../DESIGN.md`**（视觉权威）与当前代码 / Mock 状态；本地 `DESIGN.md` 仅为实现参考

注意：

- 最终版页面/大纲正文可能仍含导图残留（VIP 锁定、爆灯存疑、会员开通等），**不得按残留旧句实现**。
- 根目录过渡文档、`ref-*`、历史 XMind 源文件与已废弃路径（`xmind-*`、`design-demos`）不作为生产需求源。
- 当前代码中的会员开通页、认证项列表等可能与决策层不一致；验收以决策层 + 实际代码对照为准，并逐步收敛。
## 产品与安全边界

- 父母账号首期只管理一名已授权子女。
- 父母端不提供社区、情感实验室、多人子女管理、会员支付或直接联系方式交换。
- 申请认识以关联子女为主体；真实发布仍需父母实名与有效子女授权。
- 清晰照片必须由子女明确允许；双方同意前不能开启真人聊天。

## 待后端联调或发布前完成

- 父母与子女关系授权、父母实名、授权过期和照片可见性策略。
- 关联子女主体的推荐、申请认识、消息和幂等写入。
- 实名、支付、审核、通知、举报、数据删除和真实媒体服务。
- 微信开发者工具的手动关键路径回归，以及正式小程序域名和 AppID 配置核验。

## 验收原则

- 页面、Mock 和结构检查通过不等于后端或生产发布完成。
- H5 预览不能替代微信小程序验收。
- `manifest.json`、`pages.json` 和云服务配置属于受保护文件，变更须有明确授权。
