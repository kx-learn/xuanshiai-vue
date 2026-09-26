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

// The response adapter keeps transport envelopes and persisted turn field names out of the UI.
assert.match(moxiangApi, /function unwrapMoxiangResponse\(/, 'moxiang API must unwrap the shared request envelope')
assert.match(moxiangApi, /answer_text[\s\S]{0,120}content|content[\s\S]{0,120}answer_text/, 'turn adapter must map backend answer_text to frontend content')

console.log('AI profile current-flow contract passed')
