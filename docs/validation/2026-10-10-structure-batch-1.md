# 第一批结构精简验证（2026-10-10）

计划：[分批结构精简实施计划](../plans/2026-10-10-structure-simplification.md)。

## 范围

上游 main 为 `a1d25f34f7793224686a2af32240e2a92f630f50`。隔离 checkout/分支，原 D: 工作区没有修改。

首页已有公开候选适配 `api/discovery.uts.mapCard`；AI 搜索复用它，保留结果 user_id、原始公开 card 和匹配/未知条件。首页 detail 接口补充资料的路径继续独立，不把 private portrait 或 ideal_partner 混入公开卡。本批未改五 Tab、路由注册、manifest 或依赖。

旧编辑页没有删除：现用页缺少旧页已确认 MBTI 来源读取/实验室回跳行为，安全迁移条件还不满足。有效行为测试和 `invalidatePendingPublishKey()` 次数断言仍保留。

## 实际命令与结果

| 验证 | 命令 | 结果 |
| --- | --- | --- |
| 安装锁定依赖 | `npm ci --no-audit --no-fund` | 成功，锁文件未变 |
| 共享适配行为 | `node tests/test-public-candidate-card.js` | 通过；实际执行函数，覆盖昵称/学历/职业/城市、detail_locked、显式空 personal_tags、distance null/0、缺值、Mock 别名、结果身份及私密数据隔离 |
| 既有相关行为 | `node tests/test-home-recommend-display.js`、`node tests/test-search-retry-idempotency.js`、`node tests/test-ai-search-proxy-contract.js` | 均通过 |
| 核心源码 | `npm test`（XSA_BACKEND_ROOT 指向隔离后端 checkout） | 40/40 passed，0 skipped，0 failed；早期无产物时为 39 passed/1 skipped，未计为完整通过 |
| 文档来源/摘要 | `node scripts/authoritative-docs.cjs --check` | 通过 versioned-snapshot；PRODUCT/DESIGN 摘要保持原值，未 sync 或掩盖漂移 |
| CI 文档链接与门禁 | `node tests/test-ci-gates.js` | 4 tests passed；保留漂移、缺产物、artifact SKIP 失败检查 |
| HBuilderX | `D:\HBuilderX\cli.exe project open --path <checkout>`；`D:\HBuilderX\cli.exe launch mp-weixin --project <checkout> --compile true` | 5.26.2026091802 编译成功，68 页，未 publish/upload |
| 微信产物契约 | `npm run test:artifact` | 2/2 passed，0 skipped |
| 包体等门禁 | `npm run verify:mp` | **FAIL**，主包 5,397.7 KiB > 2,048 KiB；分包/媒体/lazy loading/68 页均通过。同工具 main 对照编译主包 5,397.4 KiB，已有同类超限；未提高限额 |
| 全量源码/产物 | `npm run test:all` | **FAIL**，75/92 passed，17 failed，0 skipped；main 对照 74/91 passed、17 failed，失败文件集合相同 |
| 系统 Mock | `node tests/test-mock-system.js` | **FAIL**，既有“更多菜单在页面浮层内绝对定位”断言；main 同样失败 |
| 补丁检查 | `git diff --check` | 通过 |

main 对照使用独立 detached worktree，`NODE_PATH` 指向本分支锁定依赖，`XSA_BACKEND_ROOT` 同为隔离后端。比较的是失败文件集合，没有将全量失败改写成通过。

全量保留的 17 个失败文件：

```text
test-community-flow.js
test-community-follow-state-sync.js
test-community-visual-contract.js
test-consistency-regressions.js
test-custom-payment-flow.js
test-dynamic-card-reconstruction-contract.js
test-emotion-lab-flow.js
test-help-security-flow.js
test-matchmaker-management-center-flow.js
test-memory-management-contract.js
test-mock-system.js
test-mp-subpackage-contract.js
test-parent-slice.js
test-six-page-reconstruction-contract.js
test-spotlight-payment-flow.js
test-top-placement-payment-flow.js
test-vip-card-rendering-flow.js
```

## 未运行与后续

- 微信 DevTools/真机交互、四档宽度、安全关键交互端侧记录 **NOT_RUN**；没有相关验收证据。HBuilderX 编译及源码 CI 不等于微信端验收。
- 主包超限、既有全量失败继续作为发布阻塞。单一发布规范入口：[HOW_TO_RUN 发布验收门禁](../HOW_TO_RUN.md#发布验收门禁)。
- 旧页/MBTI 安全迁移、次数断言的真实行为替代、知遇大页拆分仅列后续计划；未删除有效断言或加功能修复假海报保存提示。

## 提交与产物证据

- `4c9176cab2a724e6aebc20a8a6e007648c085157`：计划。
- `3f41e16ce806e07054ffca94538b03f770974a17`：共享公开候选适配和行为测试。
- `aee6aed5547fd8046f2a2d69c9692e35b6a898e0`：权威文档/单一发布入口及 CI 链接检查。

最终干净 head 的 HBuilderX 重编译、产物 SHA-256 清单、草稿 PR 和 head CI 状态在 PR 验证部分记录；不以本文件对动态 CI 结果作预先保证。
