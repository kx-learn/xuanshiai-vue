const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const babel = require('@babel/core')

const root = path.resolve(__dirname, '..')
const code = babel.transformSync(fs.readFileSync(path.join(root, 'api/parent.uts'), 'utf8'), {
  filename: 'parent.ts', configFile: false, babelrc: false,
  plugins: ['@babel/plugin-transform-typescript', '@babel/plugin-transform-modules-commonjs']
}).code
const now = Date.parse('2026-10-02T00:00:00Z')
class TestDate extends Date {
  static now() { return now }
}

function validContext() {
  return {
    mode: 'parent', dataMode: 'http',
    parent: { id: 101, realNameStatus: 'passed' },
    child: { id: 202, authorizationStatus: 'granted', authorizationExpiresAt: '2026-10-03T00:00:00Z' },
    releaseGate: { productionReady: true },
    quota: { dailyTotal: 3, remainingApplications: 3 }
  }
}

// Execute the production module. Only imported services and platform session storage
// are replaced; no network, persistent storage or ordinary-user mutation is allowed.
function runtime(useMock = false) {
  const session = { token: 'test-session', userId: '101', clears: 0 }
  const requests = []
  const matchmakerCalls = []
  const reply = { value: { success: true, data: { items: [], page: 1, total: 0, hasMore: false } } }
  const unexpectedOrdinaryAction = () => { throw new Error('parent action escaped to an ordinary-user service') }
  const matchmakers = [{ id: 303, name: '顾问', price: 999, rating: 5, successCount: 99, serviceCount: 99, phone: 'private', wechat: 'private' }]
  const imports = {
    './config.uts': {
      USE_MOCK: useMock, CURRENT_USER_ID_KEY: 'xsa_user_id',
      getAccessToken: () => session.token,
      clearAuthTokens: () => { session.token = ''; session.userId = ''; session.clears++ }
    },
    './request.uts': { request: async options => { requests.push(options); return reply.value } },
    './user.uts': {
      applyToMeet: unexpectedOrdinaryAction, getLikedUsers: unexpectedOrdinaryAction,
      getParentMockCandidateSource: unexpectedOrdinaryAction,
      getUserDetail: unexpectedOrdinaryAction, likeUser: unexpectedOrdinaryAction
    },
    './message.uts': { getApplications: unexpectedOrdinaryAction, getMessageList: unexpectedOrdinaryAction },
    './matchmaker.uts': {
      getServiceMatchmakers: async mock => { matchmakerCalls.push(['service', mock]); return { success: true, data: matchmakers } },
      getCustomMatchmakers: async mock => { matchmakerCalls.push(['custom', mock]); return { success: true, data: matchmakers } }
    },
    '@/mock/parent.uts': {
      getMockParentContextData: () => ({ ...validContext(), dataMode: 'mock', releaseGate: { productionReady: false } }),
      getParentMockSubjectKey: childId => `parent:${session.userId}:${childId}`
    }
  }
  const module = { exports: {} }
  vm.runInNewContext('(function(require, module, exports) {' + code + '\n})', {
    Date: TestDate,
    uni: { getStorageSync: key => key === 'xsa_user_id' ? session.userId : '' }
  })(id => {
    assert.ok(Object.hasOwn(imports, id), `unhandled production dependency ${id}`)
    return imports[id]
  }, module, module.exports)
  return { api: module.exports, session, requests, matchmakerCalls, reply }
}

for (const useMock of [false, true]) {
  test(`parent mode follows USE_MOCK=${useMock}`, () => {
    assert.equal(runtime(useMock).api.PARENT_USE_MOCK, useMock)
  })
}

const gateCases = [
  ['missing context', () => null, 'PARENT_ROLE_REQUIRED'],
  ['ordinary-user role', c => ({ ...c, mode: 'self' }), 'PARENT_ROLE_REQUIRED'],
  ...['missing', 'reviewing', 'rejected'].map(status => [
    `parent real-name ${status}`, c => ({ ...c, parent: { ...c.parent, realNameStatus: status } }), 'PARENT_REALNAME_REQUIRED'
  ]),
  ['missing child', c => ({ ...c, child: null }), 'CHILD_AUTHORIZATION_REQUIRED'],
  ...['pending', 'revoked', 'expired'].map(status => [
    `child authorization ${status}`, c => ({ ...c, child: { ...c.child, authorizationStatus: status } }), 'CHILD_AUTHORIZATION_REQUIRED'
  ]),
  ['authorization deadline reached', c => ({ ...c, child: { ...c.child, authorizationExpiresAt: '2026-10-02T00:00:00Z' } }), 'CHILD_AUTHORIZATION_EXPIRED'],
  ['invalid authorization deadline', c => ({ ...c, child: { ...c.child, authorizationExpiresAt: 'invalid' } }), 'CHILD_AUTHORIZATION_REQUIRED'],
  ['backend not ready', c => ({ ...c, releaseGate: { productionReady: false } }), 'PARENT_RELEASE_BLOCKED'],
  ['missing backend readiness', c => ({ ...c, releaseGate: undefined }), 'PARENT_RELEASE_BLOCKED'],
  ['non-boolean backend readiness', c => ({ ...c, releaseGate: { productionReady: 'true' } }), 'PARENT_RELEASE_BLOCKED'],
  ['authorized real context', c => c, 'OK'],
  ['isolated demo context', c => ({ ...c, dataMode: 'mock', releaseGate: { productionReady: false } }), 'OK']
]
for (const [label, change, expectedCode] of gateCases) {
  test(`parent access: ${label}`, () => {
    const result = runtime().api.getParentAccessGate(change(validContext()))
    assert.equal(result.code, expectedCode)
    assert.equal(result.allowed, expectedCode === 'OK')
  })
}

test('parent and child verification states remain independent', () => {
  const context = validContext()
  context.parent.realNameStatus = 'missing'
  const result = runtime().api.getParentAccessGate(context)
  assert.equal(result.parentVerified, false)
  assert.equal(result.childAuthorized, true)
  assert.equal(result.allowed, false)
})

for (const [label, candidate, expected] of [
  ['explicit consent and scoped URL', { clearAvatar: 'scoped.jpg', photoVisibility: { parentViewAllowed: true } }, true],
  ['clear photo without consent', { clearAvatar: 'private.jpg' }, false],
  ['ordinary avatar without consent', { avatar: 'private.jpg' }, false],
  ['explicit refusal', { clearAvatar: 'private.jpg', photoVisibility: { parentViewAllowed: false } }, false],
  ['consent without a photo', { photoVisibility: { parentViewAllowed: true } }, false]
]) {
  test(`parent photo privacy: ${label}`, () => {
    assert.equal(runtime().api.canParentViewClearPhoto(validContext(), candidate), expected)
  })
}
test('revoked child authorization never exposes a clear photo', () => {
  const context = validContext()
  context.child.authorizationStatus = 'revoked'
  assert.equal(runtime().api.canParentViewClearPhoto(context, { clearAvatar: 'private.jpg', photoVisibility: { parentViewAllowed: true } }), false)
})

for (const missing of ['token', 'userId']) {
  test(`missing ${missing} rejects and clears an incomplete parent session`, async () => {
    const r = runtime()
    r.session[missing] = ''
    const result = await r.api.getParentContext()
    assert.equal(result.code, 'PARENT_AUTH_REQUIRED')
    assert.equal(result.success, false)
    assert.equal(r.session.clears, 1)
    assert.equal(r.requests.length, 0)
  })
}

for (const method of ['reportParentCandidate', 'blockParentCandidate']) {
  test(`${method} rejects stale account context before making a request`, async () => {
    const r = runtime()
    r.session.userId = '404'
    const result = await r.api[method](validContext(), 505, 'inaccurate', '说明')
    assert.equal(result.code, 'PARENT_SUBJECT_CHANGED')
    assert.equal(result.success, false)
    assert.equal(r.requests.length, 0)
  })
}

test('a parent may report after child authorization is revoked without becoming the child', async () => {
  const r = runtime()
  const context = validContext()
  context.child.authorizationStatus = 'revoked'
  context.parent.realNameStatus = 'missing'
  const result = await r.api.reportParentCandidate(context, 505, 'inaccurate', '说明')
  assert.equal(result.success, true)
  assert.equal(r.requests.length, 1)
  assert.equal(r.requests[0].url, '/parent/children/202/reports/505')
  assert.equal(r.requests[0].method, 'POST')
  assert.deepEqual(Object.keys(r.requests[0].data).sort(), ['detail', 'reasonId'])
})

test('revoked authorization cannot modify a child blocklist', async () => {
  const r = runtime()
  const context = validContext()
  context.child.authorizationStatus = 'revoked'
  const result = await r.api.blockParentCandidate(context, 505)
  assert.equal(result.code, 'CHILD_AUTHORIZATION_REQUIRED')
  assert.equal(result.success, false)
  assert.equal(r.requests.length, 0)
})

test('authorized blocking addresses the child, never the logged-in parent', async () => {
  const r = runtime()
  const result = await r.api.blockParentCandidate(validContext(), 505)
  assert.equal(result.success, true)
  assert.equal(r.requests.length, 1)
  assert.equal(r.requests[0].url, '/parent/children/202/blocks/505')
  assert.equal(r.requests[0].method, 'PUT')
})

for (const [method, args, expectedPath] of [
  ['getParentCandidates', [], '/parent/children/202/candidates'],
  ['getParentLikedCandidates', [], '/parent/children/202/candidates'],
  ['getParentCandidateDetail', [505], '/parent/children/202/candidates/505'],
  ['toggleParentLike', [505, true], '/parent/children/202/likes/505'],
  ['applyParentIntroduction', [505, '认真了解'], '/parent/children/202/applications/505']
]) {
  test(`${method} uses only the authorized child HTTP route`, async () => {
    const r = runtime()
    await r.api[method](validContext(), ...args)
    assert.equal(r.requests.length, 1)
    assert.equal(r.requests[0].url, expectedPath)
    const revoked = validContext()
    revoked.child.authorizationStatus = 'revoked'
    const denied = await r.api[method](revoked, ...args)
    assert.equal(denied.success, false)
    assert.equal(denied.code, 'CHILD_AUTHORIZATION_REQUIRED')
    assert.equal(r.requests.length, 1, 'denied actions must not issue a second request')
  })
}

test('application responses without an authoritative remaining count never guess a debit', async () => {
  const r = runtime()
  const context = validContext()
  r.reply.value = { success: true, data: { success: true, quotaRefreshFailed: true } }
  await r.api.applyParentIntroduction(context, 505, '认真了解')
  assert.equal(context.quota.remainingApplications, 3)
  r.reply.value = { success: true, data: { success: true, remainingApplications: 2 } }
  await r.api.applyParentIntroduction(context, 505, '认真了解')
  assert.equal(context.quota.remainingApplications, 2)
})

for (const method of ['getParentMatchmakers', 'getParentCustomMatchmakers']) {
  test(`${method} keeps real service data behind the parent privacy allowlist`, async () => {
    const r = runtime()
    const result = await r.api[method](validContext())
    assert.equal(r.matchmakerCalls.length, 1)
    assert.equal(r.matchmakerCalls[0][1], false, 'real context must not switch the service to Mock')
    assert.equal(result.data[0].name, '顾问')
    for (const privateField of ['price', 'rating', 'successCount', 'serviceCount', 'phone', 'wechat']) {
      assert.equal(Object.hasOwn(result.data[0], privateField), false, `parent result leaked ${privateField}`)
    }
  })
}
