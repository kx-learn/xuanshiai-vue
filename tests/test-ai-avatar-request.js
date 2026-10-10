const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const root = path.resolve(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'api/ai-avatar.uts'), 'utf8')
const requestSource = fs.readFileSync(path.join(root, 'api/request.uts'), 'utf8')

// Execute only the changed request helpers; this is not a UTS compiler check.
const start = source.indexOf('async function loadServerConversation(')
const end = source.indexOf('\n}', source.indexOf('async function sendServerMessage(', start)) + 2
assert.ok(start >= 0 && end > start)
const helpers = source.slice(start, end)
  .replace(/: Promise<any>/g, '')
  .replace(/: (number|string|any)/g, '')

async function main() {
  for (const code of [429, 503, 504]) {
    const calls = []
    const failure = { success: false, code, message: 'synthetic failure' }
    const context = vm.createContext({ request: async options => { calls.push(options); return failure } })
    vm.runInContext(helpers, context)
    assert.strictEqual(await context.loadServerConversation(26, {}), failure)
    assert.strictEqual(await context.sendServerMessage(26, 'synthetic question', 'synthetic-key'), failure)
    assert.strictEqual(calls.length, 2, 'helpers must not automatically retry')
    assert.strictEqual(calls[0].url, '/ai-avatars/26/conversations')
    assert.strictEqual(calls[0].method, 'GET')
    assert.strictEqual(calls[1].url, '/ai-avatars/26/messages')
    assert.strictEqual(calls[1].method, 'POST')
    assert.strictEqual(calls[1].headers['Idempotency-Key'], 'synthetic-key')
    assert.strictEqual(calls[1].data.content, 'synthetic question')
    assert.ok(calls.every(options => options.timeout === 60000))
  }
  const response = { success: true, data: { result: { reply: 'synthetic answer' } } }
  const context = vm.createContext({ request: async () => response })
  vm.runInContext(helpers, context)
  assert.strictEqual(await context.sendServerMessage(26, 'test', 'synthetic-key'), response)
  assert.match(requestSource, /options\.timeout != null \? Number\(options\.timeout\) : API_CONFIG\.timeout/)
  assert.match(requestSource, /timeout: timeout/)
  console.log('PASS AI avatar request timeout, error forwarding, payload and idempotency header')
}

// ── A1/A2：本人编辑、看板如实状态、发送幂等键 ────────────────────────────
const avatarSource = source
const dashboardBlock = avatarSource.slice(
  avatarSource.indexOf('function normalizeServerDashboard('),
  avatarSource.indexOf('async function loadServerConversation('),
)
assert.match(dashboardBlock, /chatRecordsAvailable:\s*false/, '生产看板必须标记对话记录不可用')
assert.match(dashboardBlock, /chatRecordsStatus:\s*'unavailable'/, '生产看板必须给出明确的不可用状态')
assert.ok(
  !dashboardBlock.includes('这些摘要来自服务端'),
  '适配器层不得声称摘要来自服务端',
)

const sendBlock = avatarSource.slice(avatarSource.indexOf('export async function sendAiAvatarMessage('))
assert.match(sendBlock, /requestKey: string = ''/, '发送函数必须接受调用方持有的幂等键')
assert.match(sendBlock, /requestKey != '' \? requestKey :/, '同一逻辑请求必须复用同一把幂等键')

// ── 死代码清理：sendAiAvatarMessage 只允许走 /ai-avatars/{id}/messages ─────
// 背景：该函数原先在 USE_MOCK 分支里还留了一段 `if (USE_MOCK !== true)` 调用
// 遗留端点 POST /ai/avatar/{id}/reply 的代码。因为整段位于 `if (!USE_MOCK)`
// 的早返回之后，生产路径永远不可达；而那个端点在后端被
// memory_projection_read_mode != "memory" 门禁固定 503「AI分身记忆服务尚未就绪」。
// 保留它会让人误以为分身走的是 /reply 从而去调那个 503 端点排查，故删除。
assert.ok(
  !avatarSource.includes("'/ai/avatar/'"),
  '前端不得再引用遗留端点 /ai/avatar/{id}/reply（生产不可达且被 503 门禁固定拒绝）',
)
assert.ok(
  !avatarSource.includes("'/ai/avatar/' + String(userId) + '/reply'"),
  '/reply 调用必须是删除状态，而不是被注释或改名',
)
assert.ok(
  sendBlock.includes("sendServerMessage(userId, question, key)"),
  '生产分支必须走 /ai-avatars/{id}/messages helper',
)

const avatarPage = fs.readFileSync(path.join(root, 'pagesSub/profileExtra/my-ai-avatar.uvue'), 'utf8')
assert.ok(avatarPage.includes('当前暂不提供对话记录'), '对话记录入口必须如实说明当前不提供')
assert.ok(!avatarPage.includes('这些摘要来自服务端'), '看板不得再声称摘要来自服务端')
assert.ok(avatarPage.includes('const answerSubmitting = ref(false)'), '本人回答提交必须带锁')
assert.ok(avatarPage.includes('if (answerSubmitting.value) return'), '提交中必须拒绝重复点击')
assert.ok(
  avatarPage.indexOf('answerText.value = \'\'') > avatarPage.indexOf('} finally {'),
  '失败时必须保留已输入答案，只有成功后才清空',
)

const chatDetail = fs.readFileSync(path.join(root, 'pagesSub/chat/detail.uvue'), 'utf8')
assert.ok(chatDetail.includes('aiAvatarRequestKey'), '分身发送必须持有稳定的幂等键')
assert.ok(chatDetail.includes('服务端保存的这段对话记录'), '清空确认必须说明服务端真实影响')
assert.ok(chatDetail.includes('onHide(() =>'), '离开页面必须停止待补答轮询')
assert.ok(chatDetail.includes('cancelAiHandoffPolling'), '必须能显式取消待补答轮询')
assert.ok(
  /scheduleAiHandoff[\s\S]{0,400}hasPendingOwnerHandoff\(rows\)\) return/.test(chatDetail),
  '没有待补答项时不得排程轮询',
)
console.log('PASS AI avatar owner edit, dashboard honesty, send idempotency and visibility polling')
main().catch(error => { console.error(error); process.exitCode = 1 })