const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const userSource = fs.readFileSync(path.join(root, 'api', 'user.uts'), 'utf8')
const deferredPath = path.join(root, 'RECONSTRUCTION_DEFERRED_CHANGES.md')

assert.match(
  userSource,
  /const squareUsers = mockSquareUsers as any\[\][\s\S]*?squareUsers\[i\]\.id == userId/,
  'getUserDetail must fall back to square users'
)
assert.match(
  userSource,
  /introduction:\s*found\.intro != null[\s\S]*?found\.introduction != null[\s\S]*?mockUserDetail\.introduction/,
  'getUserDetail must preserve a non-empty introduction fallback'
)

assert.match(userSource, /export async function getMeProfile\(\)[\s\S]*?if \(USE_MOCK\)/, 'getMeProfile must keep its Mock boundary')
assert.match(userSource, /url: '\/auth\/me'/, 'getMeProfile must keep the FastAPI auth endpoint')
assert.match(userSource, /realname_status[\s\S]*?realNameStatus/, 'getMeProfile must keep real-name status mapping')
assert.match(userSource, /url: '\/discovery\/applications\/' \+ userId/, 'applyToMeet must keep the FastAPI discovery endpoint')
assert.match(userSource, /const qRes = await getCommunityQuotas\(\)/, 'applyToMeet must refresh the real quota after success')
assert.match(userSource, /url: '\/relations\/likes'/, 'likeUser must keep its server-side state preflight')
assert.match(userSource, /url: '\/users\/' \+ userId \+ '\/like'/, 'likeUser must keep the FastAPI mutation endpoint')

// 2026-09-27：原断言「profile unlock API remains available」已被证伪——后端不存在
// /user/profile-unlock 路由（全仓无调用方），四个导出与解锁状态机已按用户决策移除。
// 反向断言防止死 API 复活；产品决策仍登记在根目录
// RECONSTRUCTION_DEFERRED_CHANGES.md 的「资料付费解锁」表格行（下方两断言钉死）。
assert.doesNotMatch(userSource, /export async function (getUserProfileUnlockStatus|unlockUserProfile|getChatFeatureUnlocks|unlockChatFeature|getRecommendUser|getSquareUsers)\b/, 'removed profile/chat unlock APIs must not be re-introduced')
assert.doesNotMatch(userSource, /USER_PROFILE_UNLOCK_STORAGE_KEY|CHAT_FEATURE_UNLOCK_STORAGE_KEY/, 'removed unlock state-machine storage keys must not be re-introduced')
assert.doesNotMatch(userSource, /mockPaperPlanePeerProfile/, 'paper-plane peer Mock must remain deferred until mock files are reviewed')

assert.ok(fs.existsSync(deferredPath), 'deferred reconstruction decisions must have a persistent register')
const deferred = fs.readFileSync(deferredPath, 'utf8')
assert.match(deferred, /资料付费解锁/, 'the rejected profile paywall must be registered')
assert.match(deferred, /纸飞机专属 Mock 用户/, 'the paper-plane peer Mock decision must be registered')

console.log('PASS user reconstruction contract')
