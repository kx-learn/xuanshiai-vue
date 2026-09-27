# 回退重构未实施改动登记

本文件记录提交 `3495d8a70514e6d8c2c5a78d66f0a73db2903a71` 逐文件重构期间明确未采纳或暂缓判断的改动。这里的条目不是实现需求，只有在关联文件完成审查并再次获得确认后才能进入代码。

| 状态 | 改动 | 关联文件 | 当前决定 | 重新判断条件 |
| --- | --- | --- | --- | --- |
| 已回退（2026-09-27） | 资料付费解锁（积分解锁路径） | `api/user.uts`、`api/index.uts` | 原「积分解锁资料」的本地状态机（`getUserProfileUnlockStatus`/`unlockUserProfile`/`getChatFeatureUnlocks`/`unlockChatFeature` 及相关常量与存储键）已于 2026-09-27 移除：后端不存在 `/user/profile-unlock`、`/user/chat-feature-unlocks` 路由，全仓无调用方，按导出名取用只会 404（契约测试已改为反向守卫）。资料页 VIP 解锁（`detail.uvue` 的 `openVipUnlock`）为独立路径，不受影响 | 若产品需要恢复「积分解锁」形态，须先由 FastAPI 提供正式的服务端积分/权限合同，再按该合同重新设计并接入，不得直接复活旧 Mock 状态机 |
| 暂缓 | 纸飞机专属 Mock 用户 | `mock/user.uts`、`mock/index.uts`、`api/user.uts` | 当前不导入 `mockPaperPlanePeerProfile`；仅吸收广场用户兜底和简介字段兼容 | 审查 `mock/user.uts` 与 `mock/index.uts` 时结合纸飞机资料入口统一判断 |
| 持续关注 | 申请认识额度合同 | `components/XsaApplySheet.uvue`、`api/user.uts`、`api/community.uts` | 额度以服务端返回为准；响应缺少 `remain` 时禁止前端自行减一，额度刷新失败必须保留可见提示 | 任何申请次数、积分加次、会员额度或本地额度缓存改动都必须单独复核前后端合同 |

## 已采纳但待联调确认的风险

| 风险项 | 关联文件 | 当前实现 | 后续可能影响 | 收口条件 |
| --- | --- | --- | --- | --- |
| 纸飞机会话头像进入对方资料 | `pagesSub/community/paper-plane-messages.uvue`、`api/community.uts`、FastAPI 纸飞机会话接口 | 点击头像阻止打开会话，存在有效 `userId` 时进入用户资料；缺少用户 ID 时显示不可用提示 | 真实接口映射当前固定返回 `userId: 0`，因此该入口在真实数据下不可用；Mock 与真实行为不一致；若后端直接暴露用户 ID，可能提前破坏纸飞机匿名边界 | FastAPI 明确返回经过权限判断的 `peer_user_id` 与 `can_view_profile`，前后端统一匿名规则，并补充真实接口与隐私边界回归测试 |
