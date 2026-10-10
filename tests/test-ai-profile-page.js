const fs = require('fs')
const path = require('path')
const assert = require('assert')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const api = read('api/ai-profile.uts')
const moxiangApi = read('api/ai-moxiang.uts')
const apiIndex = read('api/index.uts')
const masterPage = read('pagesSub/profileExtra/my-portrait-master.uvue')
const resultPage = read('pagesSub/profileExtra/my-portrait-result.uvue')
const profileCardApi = read('api/ai-profile-card.uts')
const ws = read('api/voice-master-ws.uts')

// AI profile API: idempotency, consent, task polling and stable field contracts.
assert.match(api, /Idempotency-Key/, 'profile writes must use idempotency keys')
assert.match(api, /export async function pollTaskUntilTerminal/, 'profile tasks must expose terminal polling')
for (const status of ['succeeded', 'failed', 'cancelled', 'superseded']) {
  assert.ok(api.includes(`status == '${status}'`), `task polling must handle ${status}`)
}
assert.match(api, /shouldContinue/, 'polling must stop when its page is no longer active')
assert.match(api, /export async function getAiConsents/, 'profile flow must read AI consent state')
assert.match(api, /export async function grantProfileTextConsent/, 'profile flow must grant text-extract consent')
assert.match(api, /X-Expected-Privacy-Revision/, 'consent writes must carry the current privacy revision')

const fieldKeys = new Set([...api.matchAll(/FIELD_KEY_LABELS\.set\('(\w+)'/g)].map(match => match[1]))
const expectedFieldKeys = [
  'age', 'city_code', 'marriage_status', 'education_level', 'height_cm',
  'income_band', 'occupation_group', 'interest_tags', 'lifestyle_tags', 'relationship_goal'
]
assert.deepStrictEqual([...fieldKeys].sort(), expectedFieldKeys.sort(), 'profile field labels must match the supported key set')
assert.match(api, /value:\s*'single'/, 'marriage status must submit the backend enum value')
assert.match(api, /value:\s*4/, 'education must submit a numeric backend value')
assert.match(api, /value:\s*0/, 'income band must preserve the zero-valued backend option')

// Publish uses the exact user-approved preview and expected revision.
assert.match(api, /\/publish\?expected_revision=' \+ expectedRevision/, 'publish must send expected_revision as a query parameter')
assert.match(api, /preview_id:\s*previewId/, 'publish must bind the request to the approved preview')
assert.match(api, /export async function confirmPortraitNarrative/, 'the completed narrative must have an explicit confirmation API')
assert.match(api, /\/profiles\/.*\/narrative\/confirm/, 'narrative confirmation must use the backend confirmation endpoint')
assert.match(apiIndex, /from '\.\/ai-profile\.uts'/, 'API barrel must expose ai-profile')
assert.match(apiIndex, /ai-moxiang\.uts/, 'API barrel must expose the unified moxiang journey API')

// Current journey entry: consented subject-scoped WebSocket with progress and explicit field confirmation.
assert.match(masterPage, /import \{ MasterWS/, 'journey page must use the existing MasterWS transport')
assert.match(masterPage, /ws\.startJourneyMode\(currentSubject\.value, 'profile-text-v1'\)/, 'journey start must carry the selected subject and consent version')
assert.match(masterPage, /onExtractionStatus:/, 'journey page must consume extraction status')
assert.match(masterPage, /onJourneyProgress:/, 'journey page must consume server progress')
assert.match(masterPage, /onBuildInvite:/, 'journey page must consume durable build invitations')
assert.match(masterPage, /ws\.acceptBuildInvite\(subject, inviteId\)/, 'build invitation must be accepted explicitly')
assert.match(masterPage, /patchProfileDraft\(card\.draftId, \[fieldAction\(item\.fieldKey, 'confirm'/, 'field confirmation must patch the exact draft field')
assert.match(masterPage, /expected_revision|expectedRevision/, 'journey draft updates must retain revision context')
assert.match(masterPage, /my-portrait-result\?subject=/, 'journey completion must route to the canonical result page')
assert.match(ws, /mode: 'moxiang_journey'/, 'MasterWS must identify the journey protocol on the wire')
assert.match(ws, /case 'journey_progress':/, 'MasterWS must dispatch journey progress events')
assert.match(ws, /case 'build_invite':/, 'MasterWS must dispatch durable build invitations')

// Result page: preview, publish, background task resolution, then user-confirmed narrative.
assert.match(resultPage, /createProfilePreview/, 'result page must create a preview before publishing')
assert.match(resultPage, /getProfilePreview/, 'result page must be able to resume the exact preview')
assert.match(resultPage, /publishProfileDraft\(this\.draftId, this\.expectedRevision, this\.previewId\)/, 'publish must use the displayed preview and revision')
assert.match(resultPage, /pollTaskUntilTerminal/, 'result page must wait for asynchronous task completion')
assert.match(resultPage, /pending_confirmation/, 'narrative must remain pending until the user confirms it')
assert.match(resultPage, /confirmPortraitNarrative\(this\.subject\)/, 'narrative confirmation must be an explicit user action')
assert.match(resultPage, /this\.pageAlive = false/, 'result-page task polling must stop when the page unloads')

// Confirmed narrative can be proposed to the existing profile-card draft contract.
assert.match(profileCardApi, /\/ai\/profile-card\/summarize/, 'profile-card summarize must use the backend contract')
assert.match(profileCardApi, /Idempotency-Key/, 'profile-card writes must use idempotency keys')
assert.match(profileCardApi, /waitForProfileCardTask/, 'profile-card summarize must poll the accepted task')
assert.match(resultPage, /canPrepareProfileCard/, 'profile-card entry must require a confirmed personal narrative')
assert.match(resultPage, /expected_revision/, 'profile-card apply must preserve the server revision')
assert.match(resultPage, /accepted/, 'profile-card apply must submit explicit user selections')
assert.match(resultPage, /rejected/, 'profile-card apply must preserve skipped fields')
assert.match(resultPage, /applyProfileCardDraft/, 'profile-card apply must use the existing draft endpoint')
assert.match(resultPage, /search\?suggest=1/, 'ideal-partner narrative must enter the existing editable search-suggestion flow')

// The response adapter keeps transport envelopes and persisted turn field names out of the UI.
assert.match(moxiangApi, /function unwrapMoxiangResponse\(/, 'moxiang API must unwrap the shared request envelope')
assert.match(moxiangApi, /answer_text[\s\S]{0,120}content|content[\s\S]{0,120}answer_text/, 'turn adapter must map backend answer_text to frontend content')


// S1资料卡闭环：公开范围、可选版本字段、冲突保留与无副作用。
assert.match(profileCardApi, /draft_id|source_revision_id|tag_apply_mode/, 'profile-card API must support optional draft context fields')
assert.match(profileCardApi, /base_profile_revision/, 'profile-card API must preserve the profile version')
assert.doesNotMatch(profileCardApi, /isLegacyOptionalFieldValidation|delete\s+.*draft_id/, 'profile-card writes must never remove version constraints and retry')
assert.strictEqual((profileCardApi.match(/url: '\/ai\/profile-card\/draft\/apply'/g) || []).length, 1, 'apply must have only one request path')
assert.match(resultPage, /getProfileCardDraft\(cardDraftId\)/, 'result page must read the exact summarized draft')
assert.match(resultPage, /fields\.base_profile_revision = this\.profileCardBaseProfileRevision/, 'apply must bind the read profile version')
assert.match(resultPage, /String\(draft\.data\.draft_id \?\? ''\) != cardDraftId/, 'result page must reject a different returned draft')
assert.match(resultPage, /v-model="row\.value"/, 'intro must be editable before explicit publication')
assert.match(resultPage, /profileCardSelectedTags\.length < profileCardTagBudget\(this\.profileCardExistingTagCount\)/, 'S1 tag selection must go through profileCardTagBudget (cap 3, bounded by 10 - existing)')
assert.match(resultPage, /return room > MAX_PROFILE_CARD_ADOPT_TAGS \? MAX_PROFILE_CARD_ADOPT_TAGS : room/, 'S1 per-adopt explicit tag cap stays 3')
assert.doesNotMatch(resultPage, /add\('qa_/, 'S1 must not implicitly adopt QA slots')
assert.match(resultPage, /确认画像只代表本人确认，不会自动公开/, 'profile-card modal must explain confirmation is not automatic publication')
assert.match(resultPage, /不会修改长期择偶标准、发送消息或公开访谈原文/, 'profile-card modal must explain protected scopes')
assert.match(resultPage, /onRequestApplyProfileCard/, 'profile-card apply must have an explicit confirmation step')
assert.match(resultPage, /this\.profileCardOptionalFields\(\)/, 'profile-card apply must pass optional draft context when available')
assert.match(resultPage, /资料已变化，请重新整理\/刷新/, 'profile-card version conflicts must keep the existing draft and guide refresh')
assert.match(resultPage, /result\.data\.written_fields|result\.data\.skipped_fields/, 'profile-card success UI must use the server receipt')
assert.match(resultPage, /replace_existing: \{ self_intro: this\.replaceExistingSelfIntro \}/, 'self-intro replacement must be an explicit user choice')
assert.doesNotMatch(resultPage, /personalTags\.length < 10/, 'profile-card tags must not be silently truncated')
assert.doesNotMatch(resultPage, /sendMessage|sendMockMessage|createMessage/, 'profile-card apply must not send an automatic message')

// 复用现有 Babel/VM 测试方式，执行页面方法；不代表 UTS 或小程序编译。
const vm = require('node:vm')
const babel = require('@babel/core')
const { parse, compileTemplate } = require('@vue/compiler-sfc')
const sfc = parse(resultPage)
assert.deepStrictEqual(sfc.errors, [], 'result page SFC must parse')
assert.deepStrictEqual(compileTemplate({ source: sfc.descriptor.template.content, filename: 'portrait.uvue', id: 'portrait' }).errors, [], 'result page template must parse')
assert.match(resultPage, /<scroll-view scroll-y class="mpr-card-scroll"/, 'long content must use a cross-platform scroll view')
assert.match(resultPage, /<\/scroll-view>\s*<view[\s\S]{0,180}class="mpr-card-actions"/, 'actions must remain outside the scroll area')
assert.match(resultPage, /:disabled="profileCardApplying \|\| profileCardApplyPayload != null"/, 'unresolved writes must lock the editor')
assert.match(profileCardApi, /export function createProfileCardIdempotencyKey/, 'page and API must reuse the same key generator')
const script = sfc.descriptor.script.content.replace(/^\s*import .*$/gm, '').replace('export default', 'globalThis.pageOptions =')
const executable = babel.transformSync(script, { filename: 'portrait.ts', configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-typescript'] }).code
const json = value => JSON.parse(JSON.stringify(value))
const receipt = () => ({ success: true, data: { expected_revision: 2, written_fields: ['self_intro'], skipped_fields: [], profile: { self_intro: '服务端最终值' } } })

function pageHarness(options = {}) {
  const writes = [], summarizes = [], messages = []
  let sequence = 0
  const draft = { draft_id: 'card-1', expected_revision: 1, source_revision_id: 88, base_profile_revision: 3, status: 'ready', fields: { self_intro: { value: '原先确认的介绍' }, interest_tag_candidates: { candidates: ['跑步', '周末徒步'] } } }
  const sandbox = {
    MoxiangPosterSheet: {},
    // 结果页的资料卡等待分档用 setInterval 计时；本 harness 只需可清除的空实现，
    // 分档行为本身由 test-moxiang-continuous-result.js 驱动 tick 覆盖。
    setInterval: () => 0,
    clearInterval: () => {},
    uni: { getSystemInfoSync: () => ({ windowWidth: 390 }), getMenuButtonBoundingClientRect: () => null, showToast: v => messages.push(v.title), showModal() {} },
    createProfileCardIdempotencyKey: prefix => prefix + '-test-' + (++sequence),
    isProfileCardVersionConflict: response => response.code === 409,
    applyProfileCardDraft: async (payload, key, context) => {
      writes.push(json({ payload, key, context }))
      return options.apply ? options.apply(writes.length) : receipt()
    },
    summarizeProfileCard: async (force, key) => {
      summarizes.push({ force, key })
      return options.summarize ? options.summarize(summarizes.length) : { success: true, data: { task_id: 'task-1', draft_id: 'card-1' } }
    },
    waitForProfileCardTask: async () => options.task ? options.task(summarizes.length) : { done: true, status: 'succeeded', error: '' },
    getProfileCardDraft: async id => { assert.strictEqual(id, 'card-1'); return { success: true, data: options.draft || draft } }
  }
  vm.runInNewContext(executable, sandbox, { filename: 'portrait.ts' })
  const page = sandbox.pageOptions.data()
  for (const [name, method] of Object.entries(sandbox.pageOptions.methods)) page[name] = method.bind(page)
  for (const [name, getter] of Object.entries(sandbox.pageOptions.computed)) Object.defineProperty(page, name, { get: getter.bind(page) })
  Object.assign(page, {
    narrative: { status: 'confirmed' }, profileCardVisible: true,
    profileCardDraftId: 'card-1', profileCardExpectedRevision: 1,
    profileCardSourceRevisionId: 88, profileCardBaseProfileRevision: 3,
    profileCardTagApplyMode: 'merge', profileCardSelectedTags: ['跑步'],
    profileCardRows: json(page.buildProfileCardRows(draft.fields))
  })
  return { page, writes, summarizes, messages }
}

async function testProfileCardRetry() {
  // 响应丢失：锁定表单；即使响应期间其它状态变化，也原样重试 body 和版本。
  const lost = pageHarness({ apply: attempt => { if (attempt === 1) throw Error('response lost'); return receipt() } })
  await lost.page.applyProfileCard()
  assert.strictEqual(lost.page.profileCardApplyUncertain, true)
  const before = json(lost.page.profileCardRows)
  lost.page.toggleProfileCardField('self_intro')
  lost.page.toggleProfileCardTag('周末徒步')
  lost.page.toggleReplaceExistingSelfIntro()
  assert.deepStrictEqual(json(lost.page.profileCardRows), before)
  assert.deepStrictEqual(lost.page.profileCardSelectedTags, ['跑步'])
  assert.strictEqual(lost.page.replaceExistingSelfIntro, false)
  lost.page.closeProfileCard()
  await lost.page.onPrepareProfileCard()
  assert.strictEqual(lost.summarizes.length, 0, 'reopening must not abandon the unresolved request')
  lost.page.profileCardRows[0].value = '响应期间变化的介绍'
  lost.page.profileCardSelectedTags.push('周末徒步')
  lost.page.profileCardExpectedRevision = 99
  lost.page.profileCardSourceRevisionId = 99
  lost.page.profileCardBaseProfileRevision = 99
  await lost.page.applyProfileCard()
  assert.deepStrictEqual(lost.writes[1], lost.writes[0], 'same key must always carry the exact first approved body and context')
  assert.strictEqual(lost.page.profileCardApplyPayload, null)
  assert.strictEqual(lost.page.profileCardExpectedRevision, 2)
  assert.deepStrictEqual(json(lost.page.profileCardDraft), receipt().data, 'success must use only the server receipt')

  // 首次明确校验失败才允许编辑并使用新键；曾经结果不明则不能以 422 猜测从未保存。
  const invalid = pageHarness({ apply: attempt => attempt === 1 ? { success: false, code: 422, message: 'invalid' } : receipt() })
  await invalid.page.applyProfileCard()
  assert.strictEqual(invalid.page.profileCardApplyPayload, null)
  invalid.page.profileCardRows[0].value = '修改后的介绍'
  await invalid.page.applyProfileCard()
  assert.notStrictEqual(invalid.writes[1].key, invalid.writes[0].key)
  assert.strictEqual(invalid.writes[1].payload.accepted.self_intro, '修改后的介绍')
  const uncertain = pageHarness({ apply: attempt => ({ success: false, code: attempt === 1 ? -1 : 422, message: 'unavailable' }) })
  await uncertain.page.applyProfileCard()
  await uncertain.page.applyProfileCard()
  assert.deepStrictEqual(uncertain.writes[1], uncertain.writes[0])
  assert.notStrictEqual(uncertain.page.profileCardApplyPayload, null)

  const conflict = pageHarness({ apply: () => ({ success: false, code: 409 }) })
  await conflict.page.applyProfileCard()
  assert.strictEqual(conflict.writes.length, 1, '409 must not auto retry')
  assert.strictEqual(conflict.page.profileCardApplyPayload, null)
  assert.match(conflict.page.profileCardError, /先核对当前资料/)
  assert.strictEqual(conflict.page.profileCardVisible, true)

  let settle
  const pending = pageHarness({ apply: () => new Promise(resolve => { settle = resolve }) })
  const first = pending.page.applyProfileCard()
  await pending.page.applyProfileCard()
  assert.strictEqual(pending.writes.length, 1, 'in-flight duplicate tap must not send another request')
  settle(receipt())
  await first

  const failedTask = pageHarness({ task: attempt => ({ done: true, status: attempt === 1 ? 'failed' : 'succeeded', error: 'failed task' }) })
  await failedTask.page.onPrepareProfileCard()
  assert.strictEqual(failedTask.page.profileCardSummarizeKey, '')
  await failedTask.page.onPrepareProfileCard()
  assert.notStrictEqual(failedTask.summarizes[0].key, failedTask.summarizes[1].key, 'terminal task failure must not replay the failed task forever')
  assert.strictEqual(failedTask.page.profileCardRows.length, 2)

  const summaryConflict = pageHarness({ summarize: attempt => attempt === 1 ? { success: false, code: 409, message: 'conflict' } : { success: true, data: { task_id: 'task-1', draft_id: 'card-1' } } })
  await summaryConflict.page.onPrepareProfileCard()
  await summaryConflict.page.onPrepareProfileCard()
  assert.notStrictEqual(summaryConflict.summarizes[0].key, summaryConflict.summarizes[1].key)
  const legacy = pageHarness({ draft: { draft_id: 'card-1', status: 'ready', source_revision_id: 88, base_profile_revision: 3 } })
  await legacy.page.onPrepareProfileCard()
  await legacy.page.applyProfileCard()
  assert.strictEqual(legacy.writes.length, 0, 'missing draft revision must fail closed')
  assert.match(legacy.page.profileCardError, /版本信息不完整/)
  console.log('AI profile contract, SFC and 8 retry-state scenarios passed')
}

testProfileCardRetry().catch(error => { console.error(error); process.exitCode = 1 })
