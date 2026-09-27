const assert = require('assert')
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'api', 'index.uts')
const source = fs.readFileSync(filePath, 'utf8')
const userApi = fs.readFileSync(path.join(__dirname, '..', 'api', 'user.uts'), 'utf8')
const messageApi = fs.readFileSync(path.join(__dirname, '..', 'api', 'message.uts'), 'utf8')

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function assertNamedApiExportsResolve() {
  const namedExportBlock = /export\s*\{([\s\S]*?)\}\s*from\s*['\"]([^'\"]+)['\"]/g
  let match = null
  while ((match = namedExportBlock.exec(source)) !== null) {
    const names = match[1]
      .replace(/\/\/[^\n]*/g, '')
      .split(',')
      .map((name) => name.trim().replace(/^type\s+/, ''))
      .filter(Boolean)
    const modulePath = path.join(__dirname, '..', 'api', match[2].endsWith('.uts') ? match[2] : match[2] + '.uts')
    const moduleSource = fs.readFileSync(modulePath, 'utf8')
    for (const name of names) {
      const escapedName = escapeRegExp(name)
      const declaration = new RegExp(`export\\s+(?:(?:async|declare)\\s+)?(?:function|const|let|class|interface|type)\\s+${escapedName}\\b`)
      const reExport = new RegExp(`export\\s*\\{[^}]*\\b${escapedName}\\b`)
      assert.ok(declaration.test(moduleSource) || reExport.test(moduleSource), `${match[2]} must implement exported ${name}`)
    }
  }
}

assert.match(source, /\bdeleteDynamic\b/, 'api/index.uts must re-export deleteDynamic')
assert.match(source, /\bdeleteComment\b/, 'api/index.uts must re-export deleteComment')
// 2026-09-27：getUserProfileUnlockStatus / unlockUserProfile 已移除——后端不存在
// /user/profile-unlock 路由，全仓无调用方（按导出名取用只会 404）。名单只保留
// 仍在用的导出，并加反向断言防止死 API 回归。
for (const name of ['updateOwnNickname']) {
  assert.match(source, new RegExp(`\\b${name}\\b`), `api/index.uts must re-export ${name}`)
  assert.match(userApi, new RegExp(`export async function ${name}\\b`), `api/user.uts must implement ${name}`)
}
for (const retired of ['getUserProfileUnlockStatus', 'unlockUserProfile', 'getChatFeatureUnlocks', 'unlockChatFeature', 'getRecommendUser', 'getSquareUsers', 'getRecommendUsers']) {
  // 只对 re-export 条目与函数声明做反向断言；移除注释中保留函数名是允许的。
  assert.doesNotMatch(
    source,
    new RegExp(`^\\s*${retired}\\s*,?\\s*$`, 'm'),
    `api/index.uts must not re-export removed dead API ${retired}`
  )
  assert.doesNotMatch(userApi, new RegExp(`export async function ${retired}\\b`), `api/user.uts must not re-introduce removed dead API ${retired}`)
}

assert.match(userApi, /url:\s*'\/users\/me\/nickname'/, 'updateOwnNickname must use the authenticated nickname endpoint')
assert.match(userApi, /method:\s*'PATCH'/, 'updateOwnNickname must use PATCH')
assert.match(userApi, /url:\s*'\/profile\/tag-options'/, 'getProfileTagOptions must use the public tag catalog endpoint')
assert.match(userApi, /skipAuth:\s*true/, 'getProfileTagOptions must not attach unnecessary authentication')
assert.match(messageApi, /export async function getChatSessionId\b/, 'api/message.uts must implement getChatSessionId')
assert.match(messageApi, /getChatPermission\(targetUserId, subject\)/, 'chat-session lookup must preserve the mutual-consent gate')

assertNamedApiExportsResolve()

console.log('PASS api/index.uts export guard')
