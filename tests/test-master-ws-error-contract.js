const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

// 墨相师 WebSocket 错误码契约（源级断言）。
//
// 后端已文档化语义（docs/api/语音.md §4 错误表）：
//   - listen 时账号撤权/注销/签名上下文失效 → 下行 error AI_POLICY_DENIED
//     → 前端「停止播放并重新获取当前会话/音频」；
//   - listen 时无法确认账号状态或隐私修订、ASR/TTS/模型暂时失败
//     → AI_TEMPORARILY_UNAVAILABLE → 稍后重试，不复用旧音频 URL。
// 本文件钉死客户端已落地该语义（此前 case 'error' 仅匿名透传 code/message）。
const root = path.resolve(__dirname, '..')
const wsSource = fs.readFileSync(path.join(root, 'api/voice-master-ws.uts'), 'utf8')
const pageSource = fs.readFileSync(
  path.join(root, 'pagesSub/profileExtra/my-portrait-master.uvue'),
  'utf8'
)

// 1) 分类函数存在且覆盖文档列出的错误码
assert.match(wsSource, /export function classifyMasterWSError\(/, 'WS client must expose classifyMasterWSError')
for (const [code, kind] of [
  ['AI_POLICY_DENIED', 'policy_denied'],
  ['AI_TEMPORARILY_UNAVAILABLE', 'temporarily_unavailable'],
  ['AI_QUOTA_EXCEEDED', 'quota_exceeded'],
  ['AI_INPUT_INVALID', 'input_invalid'],
  ['AUTH_REQUIRED', 'auth_required']
]) {
  assert.match(
    wsSource,
    new RegExp(`code == '${code}'\\s*\\)\\s*return '${kind}'`),
    `${code} must classify as ${kind}`
  )
}
assert.match(wsSource, /return 'unknown'/, 'unknown codes must not be silently dropped')

// 2) onError 保持既有签名（向后兼容），onTypedError 为新增可选回调
assert.match(wsSource, /onError\?: \(code: string, message: string\) => void/, 'onError signature must stay unchanged')
assert.match(wsSource, /onTypedError\?: \(kind: string, code: string, message: string\) => void/, 'onTypedError must be optional for backward compatibility')

// 3) error 分支同时触发两者（既有行为不丢，新增分类）
const errorBranch = wsSource.split("case 'error'")[1] || ''
assert.match(errorBranch, /this\.callbacks\.onError\?\.\(code, message\)/, 'error branch must keep calling onError')
assert.match(errorBranch, /this\.callbacks\.onTypedError\?\.\(classifyMasterWSError\(code\), code, message\)/, 'error branch must forward the classified kind')

// 4) 消费方：policy_denied 必须停止播放且丢弃旧音频 URL（文档语义）
assert.match(pageSource, /onTypedError: \(kind: string, code: string, message: string\)/, 'master page must consume typed errors')
assert.match(pageSource, /function handleTypedWSFailure\(kind: string, message: string\)/, 'master page must implement typed failure handling')
assert.match(pageSource, /kind == 'policy_denied'/, 'policy_denied must be handled distinctly')
assert.match(pageSource, /kind == 'temporarily_unavailable'/, 'temporarily_unavailable must be handled distinctly')
assert.match(pageSource, /function stopAudioPlayback\(\)/, 'typed handling must be able to stop playback')
const deniedBlock = pageSource.split("if (kind == 'policy_denied' || kind == 'temporarily_unavailable')")[1] || ''
assert.match(deniedBlock, /stopAudioPlayback\(\)/, 'policy_denied must stop playback')
assert.match(deniedBlock, /lastTTSUrl\.value = ''/, 'policy_denied must discard the stale audio URL')
assert.doesNotMatch(
  pageSource,
  /catch \(e\) \{\s*\}\s*\n\s*if \(kind == 'policy_denied'\)/,
  'policy_denied handling must not be swallowed'
)

// 5) 去重契约（评审必改项）：同一条下行 error 会同时触发 onError 与
// onTypedError；会话阶段 connecting 已为 false，两条回调都会走到消费方。
// 分类后的 typed kind 由 handleTypedWSFailure 展示，onError 必须跳过通用 toast，
// 否则同一错误连弹两个提示。
assert.match(
  pageSource,
  /function isTypedFailureHandledFor\(code: string\): boolean/,
  'consumer must expose the dedupe predicate used by onError'
)
assert.match(
  pageSource,
  /if \(!isTypedFailureHandledFor\(code\)\) \{\s*\n\s*uni\.showToast\(\{ title: message, icon: 'none' \}\)/,
  'onError must skip its generic toast when the typed handler already showed one'
)
// 判定必须复用 WS 模块的分类源，且只覆盖有专属文案的三个 kind
const dedupeBlock = pageSource.split('function isTypedFailureHandledFor')[1].split('\n}')[0]
assert.match(dedupeBlock, /classifyMasterWSError\(code\)/, 'dedupe must reuse classifyMasterWSError')
for (const kind of ['policy_denied', 'temporarily_unavailable', 'quota_exceeded']) {
  assert.match(dedupeBlock, new RegExp(`'${kind}'`), `dedupe must cover ${kind}`)
}
for (const kind of ['input_invalid', 'auth_required', 'unknown']) {
  assert.doesNotMatch(
    dedupeBlock,
    new RegExp(`'${kind}'`),
    `${kind} has no dedicated copy and must keep going through onError`
  )
}

console.log('PASS master WS typed error contract')
