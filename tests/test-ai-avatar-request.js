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
main().catch(error => { console.error(error); process.exitCode = 1 })