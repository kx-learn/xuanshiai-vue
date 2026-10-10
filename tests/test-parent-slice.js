const fs = require('fs')
const path = require('path')
const assert = require('assert')
const vm = require('vm')

const root = path.join(__dirname, '..')

function read(file) {
  const target = path.join(root, file)
  if (!fs.existsSync(target)) {
    throw new Error(`${file}: file is missing`)
  }
  return fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n')
}

function expect(content, fragment, label) {
  if (!content.includes(fragment)) {
    throw new Error(`${label}: missing ${fragment}`)
  }
  console.log(`PASS ${label}`)
}

function expectAbsent(content, fragment, label) {
  if (content.includes(fragment)) {
    throw new Error(`${label}: should not contain ${fragment}`)
  }
  console.log(`PASS ${label}`)
}

function expectNoLiteralColors(content, file) {
  if (/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(content)) {
    throw new Error(`${file}: parent UI must use existing color tokens only`)
  }
  console.log(`PASS ${file} uses token colors`)
}

function expectOrdered(content, fragments, label) {
  let offset = 0
  for (const fragment of fragments) {
    const index = content.indexOf(fragment, offset)
    if (index < 0) {
      throw new Error(`${label}: missing ordered fragment ${fragment}`)
    }
    offset = index + fragment.length
  }
  console.log(`PASS ${label}`)
}

function extractExportedFunction(content, name) {
  const marker = `export function ${name}`
  const start = content.indexOf(marker)
  if (start < 0) throw new Error(`${name}: function is missing`)
  const bodyStart = content.indexOf('{', start)
  let depth = 0
  for (let i = bodyStart; i < content.length; i += 1) {
    if (content[i] === '{') depth += 1
    if (content[i] === '}') depth -= 1
    if (depth === 0) {
      return content
        .slice(start, i + 1)
        .replace('export ', '')
				.replace(/([,(]\s*[A-Za-z_$][\w$]*)\s*:\s*(?:ParentContext\s*\|\s*null|any|string)/g, '$1')
				.replace(/\)\s*:\s*(?:ParentAccessGate|any|boolean)\s*\{/g, ') {')
    }
  }
  throw new Error(`${name}: function body is incomplete`)
}

console.log('Parent slice contract checks')

const mock = read('mock/parent.uts')
expect(mock, 'export const mockParentContext', 'single ParentContext fixture')
expect(mock, "realNameStatus: 'passed'", 'parent real-name status')
expect(mock, "authorizationStatus: 'granted'", 'child authorization status')
expect(mock, 'authorizationExpiresAt:', 'child authorization validity window')
expect(mock, "dataMode: 'mock'", 'parent context identifies internal mock data')
expect(mock, 'productionReady: false', 'parent production release gate stays closed')
expect(mock, '服务端返回父母端专用的隐私字段', 'server-side privacy filtering is an explicit release gate')
expect(mock, 'child:', 'single child field')
expectAbsent(mock, 'children:', 'multiple children are excluded')
expectAbsent(mock, 'mockParentCandidates', 'shared recommendation fixture is not duplicated')
expectAbsent(mock, 'mockParentApplications', 'shared application fixture is not duplicated')
expectAbsent(mock, 'mockParentMessages', 'shared message fixture is not duplicated')
expectAbsent(mock, 'mockParentMatchmakers', 'shared matchmaker fixture is not duplicated')
expectAbsent(mock, 'mockParentLikedIds', 'shared like state is not duplicated')

const api = read('api/parent.uts')
const apiIndex = read('api/index.uts')
const userApi = read('api/user.uts')
expect(api, 'export type ParentContext', 'typed parent context contract')
expect(api, "realNameStatus: ParentRealNameStatus", 'parent identity status is narrow')
expect(api, "authorizationStatus: ChildAuthorizationStatus", 'child authorization status is narrow')
expect(api, 'child: ParentChildProfile | null', 'missing linked child is represented explicitly')
expect(api, 'dataMode?: ParentDataMode', 'real context may omit internal data-mode metadata')
expect(api, 'releaseGate?: ParentReleaseGate', 'real context may omit internal release metadata')
expect(api, 'export function getParentAccessGate', 'shared parent access gate')
expect(api, 'export function getParentAuthenticationGate', 'parent account authentication gate')
expect(api, "code: 'PARENT_AUTH_REQUIRED'", 'missing parent account session has an explicit code')
expect(api, 'clearAuthTokens()', 'partial parent sessions clear stale account and role state')
expect(api, 'export function canParentViewClearPhoto', 'shared detail photo privacy gate')
expect(api, 'parentViewAllowed == true', 'photo visibility requires explicit child consent')
expect(api, 'export async function getParentContext', 'parent context API')
const contextApiStart = api.indexOf('export async function getParentContext')
const updateProfileApiStart = api.indexOf('export async function updateParentChildProfile')
assert.ok(contextApiStart >= 0 && updateProfileApiStart > contextApiStart, 'parent context API should be complete')
const contextApi = api.slice(contextApiStart, updateProfileApiStart)
expect(contextApi, 'const authBlocked = authenticationGated()', 'parent context authenticates before resolving data')
assert.ok(
	contextApi.indexOf('const authBlocked = authenticationGated()') < contextApi.indexOf('if (PARENT_USE_MOCK)'),
	'parent context authentication must run before the internal Mock branch',
)
expect(api, 'export const PARENT_USE_MOCK = USE_MOCK', 'parent data mode follows the shared environment boundary')
expect(api, 'export function getParentSubjectApiGate', 'shared subject-safety gate is explicit')
expect(api, "code: 'PARENT_MOCK_SUBJECT_REAL_API_BLOCKED'", 'hybrid subject mismatch has an explicit error code')
expect(api, 'export async function updateParentChildProfile', 'child profile update API')
expect(api, 'export async function getParentCandidates', 'candidate list API')
expect(api, 'export async function getParentLikedCandidates', 'complete private-like list API')
expect(api, 'export async function getParentCandidateDetail', 'candidate detail API')
expect(api, 'function toParentCandidate(raw: any)', 'parent Mock candidates pass through the privacy allowlist')
expectAbsent(api, 'return okResponse(getMockParentCandidatesData())', 'parent Mock candidates never bypass the privacy adapter')
expectAbsent(api, 'return okResponse(getMockParentLikedCandidatesData())', 'parent Mock likes never bypass the privacy adapter')
expect(api, 'export async function toggleParentLike', 'private like API')
expect(api, 'export async function applyParentIntroduction', 'apply-to-meet API')
expect(api, 'export async function reportParentCandidate', 'parent report gate API')
expect(api, 'export async function blockParentCandidate', 'parent block gate API')
expect(api, 'function gated(context: ParentContext | null)', 'dual-subject actions use one gate')
expect(api, 'function parentRoleGated(context: ParentContext | null)', 'safety actions use one parent-role gate')
const gatedStart = api.indexOf('function gated(context: ParentContext | null)')
const parentRoleGatedStart = api.indexOf('function parentRoleGated(context: ParentContext | null)')
const validCandidateStart = api.indexOf('function validCandidateId(candidateId: number)')
assert.ok(gatedStart >= 0 && parentRoleGatedStart > gatedStart, 'dual-subject gate should be complete')
assert.ok(parentRoleGatedStart >= 0 && validCandidateStart > parentRoleGatedStart, 'parent-role gate should be complete')
expect(
	api.slice(gatedStart, parentRoleGatedStart),
	'parentRoleGated(context)',
	'dual-subject actions reject stale contexts after logout',
)
expect(
	api.slice(parentRoleGatedStart, validCandidateStart),
	'authenticationGated()',
	'parent safety actions reject stale contexts after logout',
)
const applyApiStart = api.indexOf('export async function applyParentIntroduction')
const reportApiStart = api.indexOf('export async function reportParentCandidate')
const blockApiStart = api.indexOf('export async function blockParentCandidate')
assert.ok(applyApiStart >= 0 && reportApiStart > applyApiStart, 'parent application API should be complete')
assert.ok(reportApiStart >= 0 && blockApiStart > reportApiStart, 'parent report API should be complete')
const applyApi = api.slice(applyApiStart, reportApiStart)
const reportApi = api.slice(reportApiStart, blockApiStart)
const blockApi = api.slice(blockApiStart)
expect(applyApi, 'const blocked = gated(context)', 'parent applications retain the dual-subject access gate')
expect(reportApi, 'const blocked = parentRoleGated(context)', 'parent reports require the parent role only')
expect(blockApi, 'const blocked = gated(context)', 'changing a child blocklist requires current child authorization')
expectAbsent(reportApi, 'const blocked = gated(context)', 'parent reports do not require real-name or child authorization')
expect(reportApi, 'validCandidateId(candidateId)', 'parent reports validate the candidate id')
expect(blockApi, 'validCandidateId(candidateId)', 'parent blocks validate the candidate id')
for (const name of ['getParentCandidates', 'getParentLikedCandidates', 'getParentCandidateDetail', 'toggleParentLike', 'applyParentIntroduction']) {
  const start = api.indexOf(`export async function ${name}(`)
  const next = api.indexOf('\nexport async function ', start + 1)
  assert.ok(start >= 0, `${name} must exist`)
  expect(api.slice(start, next < 0 ? api.length : next), 'const blocked = gated(context)', `${name} retains the account and child authorization gate`)
}
console.log('PASS parent candidate subject isolation remains enforced')
expect(api, 'getParentMockCandidateSource()', 'parent Mock recommendations use the scoped fixture source')
expect(api, 'getLikedUsers(parentInternalMockScope(context))', 'parent Mock likes pass an explicit child scope')
expect(api, 'getUserDetail(candidateId, parentInternalMockScope(context))', 'parent Mock details pass an explicit child scope')
expect(api, 'likeUser(candidateId, parentInternalMockScope(context), desiredLiked)', 'parent Mock like changes retain their explicit child scope and desired state')
expect(api, 'applyToMeet(candidateId, String(note).trim(), parentInternalMockScope(context))', 'parent Mock applications retain their explicit child scope')
expect(mock, 'export function getParentMockSubjectKey', 'parent Mock defines an account and child scoped identity')
expect(mock, 'export function getMockParentStateData', 'parent Mock reads state through its scoped boundary')
expect(mock, 'export function saveMockParentStateData', 'parent Mock persists through its scoped boundary')
expect(userApi, 'getMockParentStateData(scope).likedUserIds', 'parent Mock likes are not stored in ordinary-user state')
expect(api, "? String(raw.protectedAvatar)", 'candidate adapter prefers server-provided protected photos')
expectAbsent(api, "protectedAvatar = raw.avatar", 'candidate adapter never falls back to the clear avatar')
expectAbsent(api, "city + '男士'", 'candidate adapter does not invent gendered city names')
expectAbsent(api, "city + '女士'", 'candidate adapter does not invent gendered city names')
expect(api, 'syncRemainingApplications', 'successful applications refresh the parent quota')
expect(api, 'Math.min(total, Math.max(0, reported))', 'reported quota is capped to the daily total')
expect(mock, "'xsa_parent_state_v2:' + key", 'parent Mock quotas and relationships share the account scoped storage')
expect(api, "from './message.uts'", 'parent reuses message business API')
expect(api, "getApplications('protected', subject)", 'parent application list delegates with protected photo scope and child subject')
expect(api, "getMessageList('protected', subject)", 'parent message list delegates with protected photo scope and child subject')
expect(api, "from './matchmaker.uts'", 'parent reuses matchmaker business API')
expect(api, 'function toParentMatchmakerList(source: any[])', 'parent matchmakers use an allowlist adapter')
expect(api, 'function parentMatchmakerResponse(result: any)', 'real parent matchmaker responses pass through the allowlist adapter')
expect(api, 'return parentMatchmakerResponse(await getServiceMatchmakers(parentInternalMockScope(context) != \'\'))', 'parent service lists retain the allowlist in both data modes')
expect(api, 'return parentMatchmakerResponse(await getCustomMatchmakers(parentInternalMockScope(context) != \'\'))', 'parent custom lists retain the allowlist in both data modes')
expect(reportApi, "url: '/parent/children/' + context.child.id + '/reports/' + candidateId", 'parent reports preserve the relationship context and candidate target')
expect(blockApi, "url: '/parent/children/' + context.child.id + '/blocks/' + candidateId", 'parent blocks update only the authorized child blocklist')

const gateRuntime = {
  Date,
  String,
  isNaN,
}
gateRuntime.globalThis = gateRuntime
vm.runInNewContext(
  [
    extractExportedFunction(api, 'getParentAccessGate'),
    extractExportedFunction(api, 'canParentViewClearPhoto'),
    'globalThis.getParentAccessGate = getParentAccessGate',
    'globalThis.canParentViewClearPhoto = canParentViewClearPhoto',
  ].join('\n'),
  gateRuntime,
)

const validContext = {
		mode: 'parent',
	dataMode: 'mock',
	releaseGate: { productionReady: false },
  parent: { realNameStatus: 'passed' },
  child: { authorizationStatus: 'granted', authorizationExpiresAt: '2099-12-31T23:59:59Z' },
}
const expiredContext = {
		mode: 'parent',
	dataMode: 'mock',
	releaseGate: { productionReady: false },
  parent: { realNameStatus: 'passed' },
  child: { authorizationStatus: 'granted', authorizationExpiresAt: '2020-01-01T00:00:00Z' },
}
const unverifiedParent = {
		mode: 'parent',
	dataMode: 'mock',
	releaseGate: { productionReady: false },
  parent: { realNameStatus: 'missing' },
  child: { authorizationStatus: 'granted', authorizationExpiresAt: '2099-12-31T23:59:59Z' },
}
assert.strictEqual(gateRuntime.getParentAccessGate(validContext).allowed, true, 'both valid subjects should pass')
assert.strictEqual(
	gateRuntime.getParentAccessGate({ ...validContext, mode: 'self' }).allowed,
	false,
	'non-parent role should fail closed',
)
assert.strictEqual(gateRuntime.getParentAccessGate(expiredContext).allowed, false, 'expired child authorization should fail closed')
assert.strictEqual(
	gateRuntime.getParentAccessGate(expiredContext).code,
	'CHILD_AUTHORIZATION_EXPIRED',
	'expired authorization should have an explicit failure code',
)
assert.strictEqual(
	gateRuntime.getParentAccessGate({
		...validContext,
		dataMode: 'http',
		releaseGate: { productionReady: true },
	}).allowed,
	true,
	'a verified, authorized real context opens when the backend release gate is ready',
)
for (const releaseGate of [undefined, { productionReady: false }]) {
  assert.strictEqual(
    gateRuntime.getParentAccessGate({ ...validContext, dataMode: 'http', releaseGate }).allowed,
    false,
    'a real-data context without backend readiness must remain blocked',
  )
}
assert.strictEqual(gateRuntime.getParentAccessGate(unverifiedParent).allowed, false, 'unverified parents remain blocked')
assert.strictEqual(gateRuntime.getParentAccessGate(unverifiedParent).code, 'PARENT_REALNAME_REQUIRED', 'parent verification rejection retains its business code')
assert.strictEqual(
  gateRuntime.getParentAccessGate(unverifiedParent).childAuthorized,
  true,
  'parent and child verification states should be reported independently',
)
assert.strictEqual(
  gateRuntime.canParentViewClearPhoto(validContext, { clearAvatar: 'clear.jpg', photoVisibility: { parentViewAllowed: true } }),
  true,
  'explicit subject consent plus viewer eligibility should allow a clear detail photo',
)
assert.strictEqual(
  gateRuntime.canParentViewClearPhoto(validContext, { avatar: 'clear.jpg' }),
  false,
  'missing photo consent should fail closed',
)
assert.strictEqual(
  gateRuntime.canParentViewClearPhoto(expiredContext, { avatar: 'clear.jpg', photoVisibility: { parentViewAllowed: true } }),
  false,
  'an ineligible viewer should never receive a clear detail photo',
)
console.log('PASS parent gate and photo privacy matrices')

let authToken = ''
let authUserId = ''
let authCleanupCount = 0
const authRuntime = {
	String,
	CURRENT_USER_ID_KEY: 'xsa_user_id',
	getAccessToken: () => authToken,
	clearAuthTokens: () => { authCleanupCount += 1 },
	uni: {
		getStorageSync: () => authUserId,
	},
}
authRuntime.globalThis = authRuntime
vm.runInNewContext(
	[
		extractExportedFunction(api, 'getParentAuthenticationGate'),
		'globalThis.getParentAuthenticationGate = getParentAuthenticationGate',
	].join('\n'),
	authRuntime,
)
assert.strictEqual(
	authRuntime.getParentAuthenticationGate().code,
	'PARENT_AUTH_REQUIRED',
	'a forged local parent mode cannot resolve parent data without a token and account id',
)
assert.strictEqual(authCleanupCount, 1, 'an incomplete parent session clears stale role state')
authToken = 'token-for-account-1'
assert.strictEqual(
	authRuntime.getParentAuthenticationGate().allowed,
	false,
	'a token without a bound account id remains unauthenticated',
)
authUserId = '1'
assert.strictEqual(
	authRuntime.getParentAuthenticationGate().allowed,
	true,
	'a token bound to an account id passes the parent account gate',
)
authToken = ''
assert.strictEqual(
	authRuntime.getParentAuthenticationGate().allowed,
	false,
	'an old ParentContext cannot survive token removal',
)
console.log('PASS parent account authentication gate')

const subjectRuntime = { USE_MOCK: false }
subjectRuntime.globalThis = subjectRuntime
vm.runInNewContext(
	[
		extractExportedFunction(api, 'getParentSubjectApiGate'),
		'globalThis.getParentSubjectApiGate = getParentSubjectApiGate',
	].join('\n'),
	subjectRuntime,
)
assert.strictEqual(
	subjectRuntime.getParentSubjectApiGate({ dataMode: 'mock' }).allowed,
	false,
	'internal parent context must not call real ordinary-user APIs',
)
assert.strictEqual(
	subjectRuntime.getParentSubjectApiGate({ dataMode: 'http' }).allowed,
	true,
	'a released real parent context may use owning business APIs',
)
console.log('PASS parent subject mismatch fails closed')

assert.strictEqual(
	subjectRuntime.getParentSubjectApiGate({ dataMode: 'mock' }, 'parent:9001').allowed,
	true,
	'an explicit parent-only mock scope stays available while global USE_MOCK is disabled',
)
expect(mock, 'const parentStates:', 'parent mock state is scoped to the parent adapter')
expectAbsent(api, 'getRecommendUsers(parentInternalMockScope(context))', 'ordinary user recommendations cannot receive a parent mock scope')
expectAbsent(api, 'likeUser(candidateId, parentInternalMockScope(context))', 'ordinary user like mutations cannot receive a parent mock scope')
expect(apiIndex, 'getParentLikedCandidates,', 'unified API exports the parent like list')
console.log('PASS parent internal mock remains isolated from ordinary APIs')

const bottomNav = read('components/ParentBottomNav.uvue')
const parentIcon = read('components/XsaIcon.uvue')
expect(bottomNav, "key: 'home'", 'parent home nav item')
expect(bottomNav, "key: 'matchmaker'", 'parent matchmaker nav item')
expect(bottomNav, "key: 'message'", 'parent message nav item')
expect(bottomNav, "key: 'profile'", 'parent profile nav item')
expect(bottomNav, 'min-height: 56px', 'accessible nav targets')
expect(bottomNav, 'box-shadow: var(--shadow-md)', 'parent navigation uses the shared elevation token')
expect(bottomNav, 'background: var(--accent-bg)', 'parent navigation exposes a clear active surface')
expect(bottomNav, '<XsaIcon :name="item.icon" size="medium" />', 'parent navigation uses the shared icon component')
expect(parentIcon, "/static/底部导航栏/iconfont.woff2", 'parent icons reuse the ordinary navigation font asset')
expect(parentIcon, 'xsa-icon-home:before', 'parent home icon glyph')
expect(parentIcon, 'xsa-icon-matchmaker:before', 'parent matchmaker icon glyph')
expect(parentIcon, 'xsa-icon-message:before', 'parent message icon glyph')
expect(parentIcon, 'xsa-icon-profile:before', 'parent profile icon glyph')

const candidateCard = read('components/ParentCandidateCard.uvue')
expect(candidateCard, '<XsaIcon name="profile" size="large" />', 'candidate photo uses the shared protected profile icon')
expect(candidateCard, '照片已保护', 'candidate privacy state is explicit')
expectAbsent(candidateCard, ':src="candidate.avatar"', 'candidate list never binds a clear ordinary-user avatar')
expect(candidateCard, 'justify-content: center', 'candidate protected icon is centered')
expect(candidateCard, 'font-size: 20px', 'candidate primary type scale')
expect(candidateCard, 'font-size: 14px', 'candidate body type scale')
expect(candidateCard, 'border-radius: 18px', 'candidate card uses the parent surface radius')
expect(candidateCard, 'min-height: 48px', 'candidate action target')

const gateNotice = read('components/ParentGateNotice.uvue')
expect(gateNotice, '父母实名认证', 'parent gate copy')
expect(gateNotice, '子女授权', 'child authorization copy')

const applySheet = read('components/ParentApplySheet.uvue')
expect(applySheet, ':large-text="true"', 'parent application sheet uses the accessibility variant')
expect(applySheet, '申请附言', 'parent application requires a written note')
expect(applySheet, '对方本人同意后才能开始聊天', 'parent application explains mutual consent')
expect(applySheet, '父母实名认证与子女授权均有效时才可发送', 'parent application explains both subject gates')
expect(applySheet, '未双方同意前，不交换微信、电话或照片', 'parent application explains contact privacy')
expect(applySheet, '对方拒绝不会产生额外扣次', 'parent application explains rejection semantics')
expect(applySheet, 'remainingApplications <= 0', 'parent application stops when the daily quota is exhausted')
expect(applySheet, 'getParentAccessGate(props.parentContext)', 'parent application rechecks the shared access gate')
expect(applySheet, "uni.getStorageSync('xsa_onboarding_mode')", 'parent application rechecks the stored role')
expect(applySheet, 'applyParentIntroduction(props.parentContext, props.candidateId, note)', 'parent application submits through the parent API')
expect(applySheet, 'min-height: 48px', 'parent application actions meet the touch target')

const parentPage = read('pages/parent/parent.uvue')
expect(parentPage, 'header-kicker', 'parent shell exposes a compact identity header')
expect(parentPage, 'padding-bottom: calc(112px + env(safe-area-inset-bottom))', 'parent content reserves the fixed navigation area')
expect(parentPage, 'profile-panel', 'parent profile uses the dedicated layout variant')
expect(parentPage, '<XsaIcon name="profile" size="small" />', 'parent profile reuses ordinary iconography')
expect(parentPage, '<ParentBottomNav', 'custom parent bottom navigation')
expect(parentPage, '<ParentCandidateCard', 'parent candidate cards')
expect(parentPage, '<ParentApplySheet', 'parent list uses the shared confirmation sheet')
expect(parentPage, 'home-child-summary', 'home child profile summary')
const matchmakerCardTags = parentPage.match(/<MatchmakerCard\b[^>]*>/g) || []
assert.strictEqual(matchmakerCardTags.length, 2, 'parent retains service and custom advisor cards')
for (const tag of matchmakerCardTags) {
  assert.match(tag, /:show-metrics="false"/, 'each parent card disables actual performance metrics')
}
const matchmakerCard = read('components/MatchmakerCard.uvue')
const matchmakerTemplate = matchmakerCard.slice(matchmakerCard.indexOf('<template>'), matchmakerCard.indexOf('</template>'))
assert.doesNotMatch(matchmakerTemplate, /price|rating|score|amount|fee|¥|￥|价格|金额|评分|星级/i, 'the shared card template must not render pricing or ratings')
assert.match(matchmakerTemplate, /v-if="showMetrics"/, 'performance metrics remain controlled by the actual component prop')
console.log('PASS parent matchmaker cards avoid commercial performance claims')
expect(parentPage, '<XsaMessageCenter mode="parent"', 'parent reuses the unified message center')
expect(parentPage, ':refresh-key="parentMessageRefreshKey"', 'parent passes a refresh key to the shared message center')
expect(parentPage, 'const parentMessageRefreshKey = ref(0)', 'parent owns message refresh state')
expect(parentPage, "if (panel == 'message' && activePanel.value != 'message') requestParentMessageRefresh()", 'entering the message panel refreshes mounted data')
expect(parentPage, "if (activePanel.value == 'message') requestParentMessageRefresh()", 'successful parent context reload refreshes an open message panel')
const contextUpdateStart = parentPage.indexOf('const updateParentContext =')
const contextUpdateEnd = parentPage.indexOf('const requestParentMessageRefresh =')
assert.ok(contextUpdateStart >= 0 && contextUpdateEnd > contextUpdateStart, 'parent context update handler should be complete')
expectAbsent(
	parentPage.slice(contextUpdateStart, contextUpdateEnd),
	'requestParentMessageRefresh()',
	'parent context change events do not trigger a refresh loop',
)
expectAbsent(parentPage, '<XsaMessageItem', 'parent does not maintain a second message list')
expect(parentPage, '私人定制顾问', 'private customization is visible without a payment entry')
expect(parentPage, '切换为普通身份', 'parent profile exposes an explicit identity switch')
expect(parentPage, "uni.setStorageSync('xsa_onboarding_mode', 'self')", 'identity switch persists standard mode')
expect(parentPage, "const parentContext = ref(null as ParentContext | null)", 'parent page uses the ParentContext contract')
expect(parentPage, 'onShow(() =>', 'parent context and quota refresh whenever the page is shown')
expect(parentPage, 'let parentPageActive = false', 'parent shell tracks whether the page is visible')
expect(parentPage, 'const invalidateParentPageRequests = () =>', 'parent shell can invalidate every request family')
expect(parentPage, 'const deactivateParentPage = () =>', 'parent shell centralizes hide and unmount cleanup')
expectOrdered(
	parentPage,
	['onShow(() =>', 'parentPageActive = true', 'loadParentPage()'],
	'parent shell reactivates and reloads whenever shown',
)
const parentHideStart = parentPage.indexOf('onHide(() =>')
const parentUnmountStart = parentPage.indexOf('onUnmounted(() =>')
const parentRoleStart = parentPage.indexOf('const ensureParentRole =')
assert.ok(parentHideStart >= 0 && parentUnmountStart > parentHideStart, 'parent hide hook should be complete')
assert.ok(parentUnmountStart >= 0 && parentRoleStart > parentUnmountStart, 'parent unmount hook should be complete')
expect(parentPage.slice(parentHideStart, parentUnmountStart), 'deactivateParentPage()', 'parent hide invalidates requests and clears sensitive state')
expect(parentPage.slice(parentUnmountStart, parentRoleStart), 'deactivateParentPage()', 'parent unmount invalidates requests and clears sensitive state')
expect(parentPage, 'parentContextRequestGeneration += 1', 'parent context requests have an invalidation generation')
expect(parentPage, 'candidateRequestGeneration += 1', 'parent recommendation and like requests have an invalidation generation')
expect(parentPage, 'matchmakerRequestGeneration += 1', 'parent matchmaker requests have an invalidation generation')
expect(parentPage, 'customMatchmakerRequestGeneration += 1', 'parent custom matchmaker requests have an invalidation generation')
expect(parentPage, 'parentPageActive &&', 'parent request guards require a visible page')
expect(parentPage, "String(storedMode) == 'parent'", 'parent request guards recheck the latest stored role')
expectOrdered(
	parentPage,
	['const contextRes = await getParentContext()', 'if (!isParentContextRequestCurrent(contextRequestId)) return', 'parentContext.value = contextRes.data as ParentContext'],
	'stale parent context responses cannot write state',
)
expectOrdered(
	parentPage,
	['const result = await getParentCandidates(requestContext)', 'if (!isCandidateRequestCurrent(requestId)) return', 'candidates.value = result.data as any[]'],
	'stale recommendation responses cannot write state',
)
expectOrdered(
	parentPage,
	['const likedResult = await getParentLikedCandidates(requestContext)', 'if (!isCandidateRequestCurrent(requestId)) return', 'likedCandidates.value = likedResult.data as any[]'],
	'stale private-like responses cannot write state',
)
expectOrdered(
	parentPage,
	['const result = await getParentMatchmakers(requestContext)', 'if (!isMatchmakerRequestCurrent(requestId)) return', 'matchmakers.value = result.data as any[]'],
	'stale matchmaker responses cannot write state',
)
expectOrdered(
	parentPage,
	['const result = await getParentCustomMatchmakers(requestContext)', 'if (!isCustomMatchmakerRequestCurrent(requestId)) return', 'customMatchmakers.value = result.data as any[]'],
	'stale custom matchmaker responses cannot write state',
)
expect(parentPage, 'candidates.value = []', 'parent reload clears stale candidates')
expect(parentPage, 'likedCandidates.value = []', 'parent reload clears stale private likes')
expect(parentPage, "likedCandidateError.value = ''", 'parent reload clears stale private-like errors')
expect(parentPage, 'clearParentCollections()', 'parent cleanup paths share the same sensitive-data reset')
expect(parentPage, 'matchmakers.value = []', 'parent reload clears stale matchmakers')
expect(parentPage, 'customMatchmakers.value = []', 'parent reload clears stale custom advisors')
expect(parentPage, '推荐资料暂时无法加载，请重试。', 'candidate request failure is explicit')
expect(parentPage, '服务红娘暂时无法加载，请重试。', 'matchmaker request failure is explicit')
expect(parentPage, '私人定制顾问暂时无法加载，请重试。', 'custom advisor request failure is explicit')
expect(parentPage, 'currentCandidateError.length > 0', 'active candidate-list failure renders inside the home section')
expect(parentPage, "likedOnly.value ? likedCandidateError.value : candidateError.value", 'recommendation and private-like failures stay independent')
expect(parentPage, 'matchmakerError.length > 0', 'matchmaker failure renders inside its section')
expect(parentPage, 'customMatchmakerError.length > 0', 'custom advisor failure renders inside its section')
expect(parentPage, '@click="loadParentCandidatesSection"', 'candidate section exposes retry')
expect(parentPage, '@click="loadMatchmakerSection"', 'matchmaker section exposes retry')
expect(parentPage, '@click="loadCustomMatchmakerSection"', 'custom advisor section exposes retry')
expect(parentPage, 'setInterval(() => ensureParentRole()', 'parent shell continuously validates the stored role')
expect(parentPage, 'scheduleAuthorizationExpiry()', 'parent shell reacts when child authorization expires')
expect(parentPage, 'ensureCurrentParentAccess()', 'parent actions continuously re-check stored role and authorization')
expectAbsent(parentPage, '内部演示', 'parent page does not expose internal implementation state')
expectAbsent(parentPage, 'demo-notice', 'parent page does not render a demo-state banner')
expect(parentPage, '<ParentGateNotice', 'parent page continues to render access gates')
expect(parentPage, '父母端设置', 'parent profile has role-specific settings')
expect(parentPage, 'class="settings-toggle-target"', 'parent settings give the notification switch a 48px target')
expectAbsent(parentPage, 'menu-arrow', 'parent profile menu omits decorative arrows')
expect(parentPage, 'text-align: center;', 'parent profile titles and menu content are centered')
expect(parentPage, '.menu-row {\n\t\twidth: 100%;\n\t\tmargin: 0;', 'parent profile menu row height follows its content')
assert.ok(
	parentPage.indexOf('\n\t.settings-toggle-target {') < parentPage.indexOf('\n\t@media (max-width: 360px)'),
	'notification switch target must apply at every supported parent viewport',
)
expectAbsent(parentPage, '/pages/profile/settings', 'parent settings do not open the ordinary-user settings page')
expect(parentPage, '我的喜欢', 'private like wording')
expect(applySheet, '申请认识', 'apply-to-meet wording')
expect(parentPage, "activePanel === 'home'", 'home panel')
expect(parentPage, "activePanel === 'matchmaker'", 'matchmaker panel')
expect(parentPage, "activePanel === 'message'", 'message panel')
expect(parentPage, "activePanel === 'profile'", 'profile panel')
expect(parentPage, 'padding-bottom: calc(', 'content reserves custom nav space')
expect(parentPage, '<XsaSheet', 'child profile editor reuses sheet')
expect(parentPage, 'updateParentChildProfile(', 'profile editor saves through parent API')
expect(parentPage, 'birthYear: Number(childBirthYearDraft.value)', 'profile editor passes a numeric birth year to the typed API')
const parentScheduleStart = parentPage.indexOf('const scheduleAuthorizationExpiry =')
const parentScheduleEnd = parentPage.indexOf('const restoreParentPreferences =')
assert.ok(parentScheduleStart >= 0 && parentScheduleEnd > parentScheduleStart, 'parent expiry scheduler should be a complete top-level function')
expectAbsent(
	parentPage.slice(parentScheduleStart, parentScheduleEnd),
	'const stopParentRoleMonitor =',
	'parent role monitor is not nested inside the expiry scheduler',
)

const detailPage = read('pages/parent/user-detail.uvue')
expect(detailPage, 'getParentAccessGate', 'detail enforces parent gate')
expect(detailPage, "const parentContext = ref(null as ParentContext | null)", 'detail uses the ParentContext contract')
expect(detailPage, 'candidate.canViewClearPhoto', 'detail photo visibility is data gated')
expect(detailPage, 'v-if="candidate.canViewClearPhoto"', 'detail only binds a clear photo after explicit consent')
expect(detailPage, ':src="candidate.clearAvatar"', 'detail uses the scoped clear-photo URL')
expect(detailPage, 'protected-photo-placeholder', 'detail has a protected-photo placeholder')
expect(detailPage, '<XsaIcon name="profile" size="large" />', 'detail protected-photo placeholder uses shared iconography')
expectAbsent(detailPage, 'candidate.canViewClearPhoto ? candidate.clearAvatar : candidate.avatar', 'detail never falls back to an ordinary-user avatar')
expect(detailPage, '仅在本人明确允许后显示清晰照片', 'detail explains the protected photo state')
expect(detailPage, '申请认识', 'detail apply-to-meet wording')
expect(detailPage, '<ParentApplySheet', 'detail uses the shared confirmation sheet')
expect(detailPage, '喜欢', 'detail private like wording')
expect(detailPage, 'reportParentCandidate(', 'detail reports through parent gate API')
expect(detailPage, 'blockParentCandidate(', 'detail blocks through parent gate API')
const reportHandlerStart = detailPage.indexOf('const handleReport =')
const blockHandlerStart = detailPage.indexOf('const handleBlock =')
const scriptEnd = detailPage.indexOf('</script>')
assert.ok(reportHandlerStart >= 0 && blockHandlerStart > reportHandlerStart, 'detail report handler should be complete')
assert.ok(blockHandlerStart >= 0 && scriptEnd > blockHandlerStart, 'detail block handler should be complete')
const reportHandler = detailPage.slice(reportHandlerStart, blockHandlerStart)
const blockHandler = detailPage.slice(blockHandlerStart, scriptEnd)
expect(reportHandler, 'ensureParentRole()', 'detail report rechecks the stored parent role')
expect(blockHandler, 'ensureParentRole()', 'detail block rechecks the stored parent role')
expect(reportHandler, 'validSafetyCandidateId()', 'detail report validates its candidate target')
expect(blockHandler, 'validSafetyCandidateId()', 'detail block validates its candidate target')
expectAbsent(reportHandler, 'ensureCurrentParentAccess()', 'detail report does not require real-name or child authorization')
expect(detailPage, 'scrubCandidatePhoto()', 'detail clears scoped photo data when access expires')
expect(detailPage, 'scheduleAuthorizationExpiry()', 'detail schedules authorization expiry enforcement')
expect(detailPage, 'setInterval(() => ensureParentRole()', 'detail continuously validates the stored role')
expect(detailPage, 'ensureCurrentParentAccess()', 'detail actions continuously re-check parent access')
expect(detailPage, 'if (contextRes == null || contextRes.success != true || contextRes.data == null)', 'detail handles an empty parent-context response explicitly')
expect(detailPage, 'let detailPageActive = false', 'detail tracks whether the page is visible')
expect(detailPage, 'let detailRequestGeneration = 0', 'detail requests have an invalidation generation')
expect(detailPage, 'const deactivateDetailPage = () =>', 'detail centralizes hide and unmount cleanup')
expectOrdered(
	detailPage,
	['onShow(() =>', 'detailPageActive = true', 'loadDetail()'],
	'detail reactivates and reloads whenever shown',
)
const detailHideStart = detailPage.indexOf('onHide(() =>')
const detailUnmountStart = detailPage.indexOf('onUnmounted(() =>')
const detailScrubStart = detailPage.indexOf('const scrubCandidatePhoto =')
assert.ok(detailHideStart >= 0 && detailUnmountStart > detailHideStart, 'detail hide hook should be complete')
assert.ok(detailUnmountStart >= 0 && detailScrubStart > detailUnmountStart, 'detail unmount hook should be complete')
expect(detailPage.slice(detailHideStart, detailUnmountStart), 'deactivateDetailPage()', 'detail hide invalidates requests and scrubs the photo')
expect(detailPage.slice(detailUnmountStart, detailScrubStart), 'deactivateDetailPage()', 'detail unmount invalidates requests and scrubs the photo')
expect(detailPage, 'candidate.value.clearAvatar = \'\'', 'detail hidden-state cleanup removes the clear photo URL')
expect(detailPage, 'detailPageActive &&', 'detail request guards require a visible page')
expectOrdered(
	detailPage,
	['const contextRes = await getParentContext()', 'if (!isDetailRequestCurrent(requestId)) return', 'const requestContext = contextRes.data as ParentContext', 'parentContext.value = requestContext'],
	'stale detail context responses cannot write state',
)
expectOrdered(
	detailPage,
	['const detailRes = await getParentCandidateDetail(requestContext, candidateId.value)', 'if (!isDetailRequestCurrent(requestId)) return', 'candidate.value = detailRes.data'],
	'stale candidate-detail responses cannot restore protected data',
)
expectAbsent(detailPage, '内部演示', 'detail does not expose internal implementation state')
expect(detailPage, '举报资料', 'detail exposes report action')
expect(detailPage, '屏蔽资料', 'detail exposes block action')
expect(detailPage, 'font-size: 20px', 'detail heading type scale')
expect(detailPage, 'font-size: 14px', 'detail support type scale')
expect(detailPage, 'min-height: 48px', 'detail action targets')
const detailScheduleStart = detailPage.indexOf('const scheduleAuthorizationExpiry =')
const detailScheduleEnd = detailPage.indexOf('const ensureParentRole =')
assert.ok(detailScheduleStart >= 0 && detailScheduleEnd > detailScheduleStart, 'detail expiry scheduler should be a complete top-level function')
expectAbsent(
	detailPage.slice(detailScheduleStart, detailScheduleEnd),
	'const stopParentRoleMonitor =',
	'detail role monitor is not nested inside the expiry scheduler',
)

for (const [file, content] of [
  ['components/ParentBottomNav.uvue', bottomNav],
  ['components/ParentCandidateCard.uvue', candidateCard],
  ['components/ParentGateNotice.uvue', gateNotice],
	['components/ParentApplySheet.uvue', applySheet],
  ['pages/parent/parent.uvue', parentPage],
  ['pages/parent/user-detail.uvue', detailPage]
]) {
  expectNoLiteralColors(content, file)
}

for (const [file, content] of [
	['pages/parent/parent.uvue', parentPage],
	['pages/parent/user-detail.uvue', detailPage],
	['components/ParentApplySheet.uvue', applySheet],
	['components/XsaReportSheet.uvue', read('components/XsaReportSheet.uvue')]
]) {
	for (const forbiddenCopy of ['Mock', 'mock', '测试', '内部演示', '流程审校', '仅供审校', '不会影响真实用户', '不代表已向真实用户', '测试数据']) {
		expectAbsent(content, forbiddenCopy, `${file} hides internal-only copy ${forbiddenCopy}`)
	}
}

expect(mock, "import { mockMeProfile } from './user.uts'", 'parent child summary imports ordinary profile fixture')
expect(mock, 'const ordinaryProfile = mockMeProfile as any', 'parent child summary aliases ordinary profile data')
expect(mock, 'displayName: ordinaryProfile.name', 'parent child name comes from ordinary profile')
expect(mock, 'city: ordinaryProfile.city', 'parent child city comes from ordinary profile')
expect(mock, 'job: ordinaryProfile.job', 'parent child job comes from ordinary profile')
expect(mock, 'profileProgress: Number(ordinaryProfile.profileProgress', 'parent child progress comes from ordinary profile')
expect(userApi, 'export function getParentMockCandidateSource(): any[]', 'parent candidates aggregate fixtures through their scoped source')
expect(userApi, 'const groups = [mockRecommendUsers as any[], mockSquareUsers as any[]]', 'parent candidates combine recommendation and square fixtures')
expect(userApi, "if (id == '' || seen[id] == true) continue", 'parent candidate aggregation de-duplicates by id')
expect(userApi, 'seen[id] = true', 'parent candidate aggregation records every accepted identity')

const allParentFiles = [mock, api, bottomNav, candidateCard, gateNotice, applySheet, parentPage, detailPage].join('\n')
for (const forbidden of ['收藏', '申请牵线', '社区', '情感实验室', '多人子女', '联系人', '会员支付']) {
  expectAbsent(allParentFiles, forbidden, `parent slice excludes ${forbidden}`)
}
for (const forbiddenAction of ['>交换微信<', '>交换电话<', '>交换照片<', '直接交换联系方式']) {
	expectAbsent(allParentFiles, forbiddenAction, `parent slice excludes contact exchange action ${forbiddenAction}`)
}

console.log('Parent slice contract checks passed')
