const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const babel = require('@babel/core')
const root = path.resolve(__dirname, '..')

// Execute real UTS modules with only platform storage/network replaced.
function runtime(storage = new Map(), http = null) {
  const cache = new Map()
  const uni = {
    getStorageSync: key => storage.get(key) ?? '',
    setStorageSync: (key, value) => storage.set(key, JSON.parse(JSON.stringify(value))),
    removeStorageSync: key => storage.delete(key),
    getSystemInfoSync: () => ({ platform: 'test' }),
    request: options => http(options)
  }
  function load(name) {
    let file = path.isAbsolute(name) ? name : path.join(root, name)
    if (!path.extname(file)) file = fs.existsSync(file + '.uts') ? file + '.uts' : path.join(file, 'index.uts')
    if (cache.has(file)) return cache.get(file).exports
    if (!http && file === path.join(root, 'api/request.uts')) return { request: async () => { throw Error('unexpected real request') } }
    const module = { exports: {} }
    cache.set(file, module)
    const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
      filename: file, configFile: false, babelrc: false,
      plugins: [[require('@babel/plugin-transform-typescript'), { allExtensions: true }], require('@babel/plugin-transform-modules-commonjs')]
    }).code
    const requireModule = id => load(id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(file), id))
    vm.runInNewContext('(function(require,module,exports){' + code + '\n})', { uni, console, Date, Math, JSON, setTimeout, clearTimeout })(requireModule, module, module.exports)
    return module.exports
  }
  const config = load('api/config.uts')
  config.USE_MOCK = !http
  const login = id => {
    uni.setStorageSync(config.CURRENT_USER_ID_KEY, id)
    config.setAuthTokens('test-access', 'test-refresh')
    uni.setStorageSync('xsa_onboarding_mode', 'parent')
  }
  return { load, login, storage, config }
}

async function main() {
  const r = runtime()
  r.login(9101)
  const api = r.load('api/parent.uts')
  const initial = (await api.getParentContext()).data
  const input = { displayName: '账号甲的子女', birthYear: 1996, city: '南京', job: '工程师', introduction: '测试资料' }
  assert.equal((await api.updateParentChildProfile(initial, input)).success, true)
  r.login(9102)
  const other = (await api.getParentContext()).data
  assert.notEqual(other.child.displayName, input.displayName, 'child profile leaked across accounts')
  assert.equal((await api.updateParentChildProfile(initial, input)).success, false, 'stale account context accepted')
  r.login(9101)
  const context = (await api.getParentContext()).data
  assert.equal(context.child.displayName, input.displayName)
  const candidates = (await api.getParentCandidates(context)).data
  const existing = (await api.getParentApplications(context)).data
  const candidate = candidates.find(item => !existing.some(application => application.userId === item.id))
  assert.ok(candidate)
  const before = context.quota.remainingApplications
  assert.equal((await api.toggleParentLike(context, candidate.id, true)).data.liked, true)
  assert.equal((await api.toggleParentLike(context, candidate.id, true)).data.liked, true, 'repeating a desired like must keep it selected')
  assert.equal((await api.getParentLikedCandidates(context)).data.filter(item => item.id === candidate.id).length, 1)
  assert.equal((await api.toggleParentLike(context, candidate.id, false)).data.liked, false)
  assert.equal((await api.toggleParentLike(context, candidate.id, false)).data.liked, false)
  let stateWrites = 0
  const store = r.storage.set.bind(r.storage)
  r.storage.set = (key, value) => {
    if (key.startsWith('xsa_parent_state_v2:')) stateWrites++
    return store(key, value)
  }
  const applied = await api.applyParentIntroduction(context, candidate.id, '认真了解')
  assert.equal(applied.success, true)
  assert.equal(applied.data.success, true)
  assert.equal(stateWrites, 1, 'an application and its quota are saved together once')
  const repeated = await api.applyParentIntroduction(context, candidate.id, '认真了解')
  assert.equal(repeated.data.applicationId, applied.data.applicationId)
  assert.equal(stateWrites, 1, 'replaying a completed application must not rewrite its quota')
  assert.equal(context.quota.remainingApplications, before - 1)
  const messages = await api.getParentApplications(context)
  assert.ok(JSON.stringify(messages.data).includes(String(candidate.id)), 'outgoing application missing')
  assert.equal((await api.blockParentCandidate(context, candidate.id)).success, true)
  assert.equal((await api.getParentCandidateDetail(context, candidate.id)).success, false)
  assert.equal((await api.applyParentIntroduction(context, candidate.id, '重复申请')).success, false)
  assert.ok(!(await api.getParentCandidates(context)).data.some(item => item.id === candidate.id))
  const reload = runtime(r.storage)
  reload.login(9101)
  const restored = (await reload.load('api/parent.uts').getParentContext()).data
  assert.equal(restored.child.displayName, input.displayName)
  assert.equal(restored.quota.remainingApplications, before - 1)
  assert.equal((await reload.load('api/parent.uts').getParentCandidateDetail(restored, candidate.id)).success, false)
  console.log('PASS parent account isolation, durable state, application idempotency and blocking')
}
module.exports = { runtime }
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1 })
