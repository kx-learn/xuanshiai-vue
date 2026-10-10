# 分批结构精简实施计划（2026-10-10）

目标：减少重复事实来源和维护负担，保持产品行为；不增加功能、表、中间件或框架，不改变五 Tab，不合并、部署或操作生产数据。

## 基线与隔离

- 后端：`kx-learn/xuanshiai`，main `ce72b9e10e683cf9681606325ee9e8a0ba961350`。
- 前端：`kx-learn/xuanshiai-vue`，main `a1d25f34f7793224686a2af32240e2a92f630f50`。
- 远端 HEAD 经 `git ls-remote --symref upstream HEAD refs/heads/main` 核对，再 fetch 并解析 `refs/remotes/upstream/HEAD`。两仓独立 checkout 使用 `refactor/structure-batch-1`，从上游默认分支开始。
- 原后端在 `feature/ideal-partner-proxy`，有一个额外提交及未跟踪目录；原前端在 `feature/parent-flow-mp-weixin`。本次不修改原 checkout，也不带入其功能提交。
- 已读取两仓 AGENTS、后端 PROJECT_RULES/README/DEVELOPMENT、前端 CLAUDE/HOW_TO_RUN、版本化 PRODUCT/DESIGN 与测试入口；两仓没有受版本控制的模块 AGENTS 或 `.agents/skills/SKILL.md`。

## 可行性

现有 API 适配、Worker 注册、草稿对象和 revision writer 足以承载本批改动；只收敛入口及传递已存在的字段。性能上移除重复映射/反向导入/补写 SQL，安全上保持可见性、授权和事务边界，兼容上允许历史 `profile_dimension=NULL`。无需产品范围或接口契约变更。

## 第一批：可独立回退的小步改动

每项独立提交；若证据不足，记录为后续项，不按删行数推进。

| 项目 | 实施边界 | 验证与退出条件 |
| --- | --- | --- |
| 旧编辑页 | 核对路由、运行时/动态引用、两页行为。当前 `pages/user/edit.uvue` 未注册，现役入口是 `pagesSub/userExtra/user/edit`，但旧页有已确认 MBTI 来源读取和实验室回访，现役页只有手动编辑。**本批保留旧页及有效断言**。 | 先解决来源、未保存编辑、红娘代编主体隔离，才可迁移相关行为断言并删除旧页；不能只换测试路径。 |
| 公开候选卡 | 复用 `api/discovery.uts` 的 `mapCard`，供首页推荐/广场和 AI 搜索结果使用；页面只消费统一字段。列表与详情保留各自边界，不把详情私密画像、理想对象偏好或原始对话混入卡片。 | 实际执行映射：首页/搜索相同公开输入一致；覆盖 nickname、education_level、occupation、city_code、detail_locked、空 personal_tags、distance=null/0、缺值、旧 Mock 别名和分页/匹配说明。 |
| 文档入口 | docs/README 和 CLAUDE 指向 docs/authoritative 快照及来源/摘要校验；根 PRODUCT/DESIGN 保留历史资料。将 CI 的失效发布链接收敛到现有 HOW_TO_RUN 的一处发布门禁，不新增第三份规范。 | `authoritative-docs --check`、`test-ci-gates`、实际文档链接和摘要漂移测试；端侧证据始终单独记录。 |
| 测试写法 | 仅在真实行为测试覆盖相应语义时，替换源码次数/写法断言。 | `invalidatePendingPublishKey()` 恰好 7 次断言先核对现有发布重试/内容变更覆盖；不足时本批保留，并记录所需行为用例，不重写测试框架。 |
| 后端任务注册 | 只保留 `ai_worker.register_business_handlers` 明确注册路径，移除 search/compatibility/recommend 导入时反向注册。 | 新 Python 进程分别按 Worker 优先及服务优先顺序导入；全部 handler、search_suggest 提交后发布器、幂等注册和 `python -m ... --once --dry-run` 不丢失。 |
| 后端投影死入口 | 确认 `features.read_projection_with_mode` 只有定义和测试引用后移除；把有效缺失/撤权/日志隐私覆盖落到实际读者。 | 搜索等消费者的 memory 模式缺失时仍 memory-only、fail-closed；legacy/shadow 的实际消费者契约保持。纯 canonical diff 测试不删除。 |
| 画像维度传递 | 已有 `profile_dimension` 走 SELECT → ProfileDraftField → JSON 序列化/幂等回放 → revision INSERT；同时保留回放中的 field_kind/category/content/replaces_field_key，删除 continuous 确认后的维度补写 UPDATE。 | 初次与幂等回放字段一致、历史 NULL、两主体独立、确认幂等、冻结稿摘要校验、记忆/outbox 与正式稿同事务；有隔离临时 MySQL/Redis 才运行真实库验证。 |

## 第二批（只计划）：知遇页面按职责拆分

对约 2762 行 `my-portrait-master.uvue` 分离语音/转写/播报状态、continuous_v2 的两份冻结预览与整份确认、旧协议适配。先写状态所有权和取消/退出时序表，再分步移动函数及原测试，保持页面入口与展示不变。重点回归旧任务不能覆盖新状态、切主体/撤权/重新授权隔离、失败重试及语音确认前不写画像。

## 第三批（只计划）：后端画像服务拆分

对约 5505 行 `profile.py` 按草稿装载/协商、不可变 revision 写入、授权删除/恢复、Worker handler 拆出内部模块。先固定现有调用签名和事务所有权，逐个移动公共能力，不重设计状态机，不合并 personal/ideal_partner 确认；每步跑原服务/路由/真实库围栏测试。

## 第四批（只计划）：按用途统一投影读取

清点 search candidate_filter、compatibility candidate_rank、recommend preference、persona public_only、counselor context 的主体/用途/字段/授权门禁。只抽取同语义能力，保留 public 与 self-only 的差异、memory-only 缺失语义、撤权代际、删除压制和旧任务围栏；不建立一个宽泛 fallback 入口。

## 待产品决定

- 旧画像兼容周期结束时间；旧入口仍可达，届时才能讨论退出协议。
- 普通海报保留与否；已知假保存提示不纳入本批修复。
- “我的”页面知遇重复入口取舍。
- 旧编辑页 MBTI 归一方式：实验室确认来源与现役手动保存、未保存编辑及红娘代编如何相处。现行权威快照与历史镜像内容不同，不能通过改镜像或测试重定义产品。

## 验证和交付

前端执行定向行为测试、`npm test`、传统 Mock 检查、权威文档摘要校验和 `git diff --check`；页面改动按 HBuilderX 生成本分支 mp-weixin 产物，执行 `verify:mp` / `test:artifact`。缺产物、工具环境或真机证据写明 NOT_RUN/FAIL，不把源码 CI 绿等同发布或端侧验收通过。

后端测试强制 mock provider、testing 环境、不复制 `.env`，数据库/Redis 默认指向不可达本机端口；只读检查确认隔离环境后才能启动临时测试服务。执行相关 pytest、Ruff、语法编译、全新进程 Worker 测试。全仓存量失败单列，不能关闭检查或加宽回退。

两仓各自提交、推送并开关联 draft PR，列明实际命令、结果、未运行项及原因。创建后核对 PR head SHA 并检查该 SHA 的 CI；本批回归继续修复，无关基线/权限/环境失败明确保留。
