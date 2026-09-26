const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const root = path.resolve(__dirname, '..')
const apiSource = fs.readFileSync(path.join(root, 'api/message.uts'), 'utf8')
const apiIndexSource = fs.readFileSync(path.join(root, 'api/index.uts'), 'utf8')
const mockSource = fs.readFileSync(path.join(root, 'mock/message.uts'), 'utf8')

function functionHeader(source, name) {
  const start = source.indexOf(`export async function ${name}`)
  assert.ok(start >= 0, `${name} must be exported`)
  const end = source.indexOf(') {', start)
  assert.ok(end > start, `${name} header must be complete`)
  return source.slice(start, end + 1)
}

function loadMockModule() {
  const context = { Array, Date, JSON, Math, Number, Object, String, console }
  context.globalThis = context
  const executable = mockSource
    .replace(/\s+as\s+any(?:\[\])?/g, '')
    .replace(/\b(let|const|var)\s+(\w+)\s*:\s*[^=;\n]+=/g, '$1 $2 =')
    .replace(/export const\s+(\w+)\s*=/g, 'globalThis.$1 =')
    .replace(/export function/g, 'function')
    .replace(
      /function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*[^\{]+)?\{/g,
      (_match, name, rawArgs) => {
        const args = rawArgs.replace(/([A-Za-z_$][\w$]*)\s*:\s*[^,=]+/g, '$1')
        return `function ${name}(${args}) {`
      },
    )
    .replace(/\(([^)]*)\)\s*=>/g, (_match, rawArgs) => {
      const args = rawArgs.replace(/([A-Za-z_$][\w$]*)\s*:\s*[^,]+/g, '$1')
      return `(${args}) =>`
    })

  vm.runInNewContext(executable, context, { filename: 'mock/message.uts' })
  return context
}

function loadProtectedSanitizers() {
  const start = apiSource.indexOf('const PROTECTED_MEDIA_FIELDS')
  const end = apiSource.indexOf('function protectPageAvatars', start)
  assert.ok(start >= 0 && end > start, 'protected sanitizer block must be complete')
  const executable = apiSource
    .slice(start, end)
    .replace(/:\s*(?:any\[\]|string\[\]|any|boolean)/g, '')
  const context = { Array, Object, String }
  context.globalThis = context
  vm.runInNewContext(
    `${executable}\n` +
      'globalThis.protectAvatarList = protectAvatarList\n' +
      'globalThis.protectMessageList = protectMessageList\n' +
      'globalThis.protectSubjectResponse = protectSubjectResponse',
    context,
    { filename: 'api/message.uts#protected-sanitizers' },
  )
  return context
}

function loadSubjectHelpers() {
  const start = apiSource.indexOf('function isPositiveInteger')
  const end = apiSource.indexOf('function normalizedPageSize', start)
  assert.ok(start >= 0 && end > start, 'message subject helper block must be complete')
  const executable = apiSource
    .slice(start, end)
    .replace(
      /function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*[^\{]+)?\{/g,
      (_match, name, rawArgs) => {
        const args = rawArgs.replace(/([A-Za-z_$][\w$]*)\s*:\s*[^,=]+/g, '$1')
        return `function ${name}(${args}) {`
      },
    )
  const context = { Math, Number }
  context.globalThis = context
  vm.runInNewContext(
    `${executable}\n` +
      'globalThis.resolveMessageSubject = resolveMessageSubject\n' +
      'globalThis.effectivePrivacyScope = effectivePrivacyScope\n' +
      'globalThis.appendMessageSubject = appendMessageSubject',
    context,
    { filename: 'api/message.uts#message-subject' },
  )
  return context
}

console.log('消息 API 主体隔离与脱敏安全测试')

assert.ok(apiSource.includes('export type MessageSubject'), 'MessageSubject must be public')
assert.ok(apiIndexSource.includes('MessageSubject'), 'MessageSubject must be exported from api/index.uts')
for (const name of [
  'getConversationPage',
  'getApplicationPage',
  'getChatPermission',
  'markAllMessagesRead',
  'getMessageList',
  'getChatMessages',
  'sendMessage',
  'getApplications',
  'handleApplication',
]) {
  const header = functionHeader(apiSource, name)
  assert.ok(
    header.lastIndexOf('subject: MessageSubject | null = null') >= 0,
    `${name} must accept MessageSubject as its last optional parameter`,
  )
}
assert.ok(
  apiSource.includes("return subjectContext.mode == 'parent' ? 'protected' : privacyScope"),
  'parent subjects must force protected response mode',
)
assert.ok(apiSource.includes('data.actingChildId ='), 'HTTP requests must transmit actingChildId')
assert.ok(apiSource.includes('data.subjectMode = subjectContext.mode'), 'HTTP requests must transmit a scalar subject mode')
assert.ok(!apiSource.includes('data.subject = {'), 'GET requests must not serialize a subject object as [object Object]')
assert.ok(
  (apiSource.match(/appendMessageSubject\((?:requestData|data), subjectContext\)/g) || []).length >= 4,
  'legacy message endpoints that accept acting subjects must retain their explicit subject claims',
)
assert.ok(apiSource.includes('export const CHAT_USE_MOCK = false'), 'ordinary chat must use the formal authenticated backend')
assert.ok(apiSource.includes("url: '/chat/sessions'"), 'ordinary chat must resolve sessions from the server-visible session list')
assert.ok(apiSource.includes('const sessionId = Number(item?.id ?? 0)'), 'ordinary chat must use the server-provided session id')
assert.ok(apiSource.includes("url: '/chat/sessions/' + sessionId + '/messages'"), 'chat history must be scoped by the resolved session id')
assert.ok(apiSource.includes("data: { type: 1, content: content.trim(), client_message_id: resolvedClientMessageId }"), 'chat send must include the same client_message_id for retries')
assert.ok(apiSource.includes('function chatBackendUnavailable(subjectContext: any)'), 'formal chat must have a dedicated fail-closed subject boundary')
assert.ok(apiSource.includes("'PARENT_BACKEND_NOT_AVAILABLE'"), 'unsupported parent-mode chat must fail closed')
assert.ok(!apiSource.includes("url: '/chat/sessions/' + userId + '/messages'"), 'a peer user id must never be used as a session id')
assert.ok(
  apiSource.includes("'CLIENT_MESSAGE_ID_REQUIRED'"),
  'sendMessage must reject a missing clientMessageId',
)
assert.ok(
  apiSource.includes("'CLIENT_COMMAND_ID_REQUIRED'"),
  'handleApplication must reject a missing clientCommandId',
)
assert.ok(
  apiSource.includes("permissionRes != null ? permissionRes : failResponse('聊天权限检查失败', 'CHAT_PERMISSION_FAILED')") &&
    (apiSource.match(/permissionRes \?\? failResponse\('聊天权限检查失败', 'CHAT_PERMISSION_FAILED'\)/g) || []).length >= 2,
  'permission rechecks must preserve 401/auth failures in mock and real send paths',
)
assert.ok(!apiSource.includes('legacyClientMessageSequence'), 'sendMessage must not fabricate an idempotency key')
assert.ok(
  apiSource.includes('authorize actingChildId for every read and mutation'),
  'the client subject claim must document the server authorization boundary',
)
assert.ok(apiSource.includes('async function messageRequest(options: any)'), 'message API must normalize rejected cloud requests')
assert.ok(apiSource.includes('error != null && error.code != null ? error.code : -1'), 'cloud request failures must preserve 401 and other status codes')
assert.ok(
  (apiSource.match(/await messageRequest\(/g) || []).length >= 7,
  'all real message HTTP/cloud calls must use the rejection-normalizing boundary',
)
assert.ok(!apiSource.includes('normalizeBusinessResponse(await request('), 'real message calls must not bypass failure normalization')

const subjectHelpers = loadSubjectHelpers()
assert.strictEqual(subjectHelpers.resolveMessageSubject(null).key, 'self', 'omitted subjects remain self-compatible')
assert.strictEqual(
  subjectHelpers.resolveMessageSubject({ mode: 'parent' }).valid,
  false,
  'parent subject without childId must fail closed',
)
assert.strictEqual(
  subjectHelpers.resolveMessageSubject({ mode: 'parent', childId: 1.5 }).valid,
  false,
  'parent childId must be a positive integer',
)
const parentSubject = subjectHelpers.resolveMessageSubject({ mode: 'parent', childId: 42 })
assert.strictEqual(parentSubject.key, 'parent:42', 'parent childId must partition message state')
assert.strictEqual(
  subjectHelpers.effectivePrivacyScope('standard', parentSubject),
  'protected',
  'parent subjects cannot request clear media',
)
const requestData = {}
subjectHelpers.appendMessageSubject(requestData, parentSubject)
assert.strictEqual(requestData.subjectMode, 'parent', 'HTTP subject mode must be explicit and scalar')
assert.strictEqual(requestData.actingChildId, 42, 'HTTP request must carry actingChildId')

const sanitizers = loadProtectedSanitizers()
const protectedRows = sanitizers.protectAvatarList([
  {
    id: 7,
    status: 'pending',
    text: '保留的业务文本',
    avatarUrl: 'https://private.example/avatar.jpg',
    photo_url: '/private/photo.jpg',
    sender: {
      id: 9,
      status: 'verified',
      name: '发送者',
      avatar: 'https://private.example/sender.jpg',
    },
    payload: {
      id: 'payload-1',
      status: 'ready',
      text: '保留的载荷文本',
      url: 'https://private.example/payload.jpg',
      nested: { photoUrl: 'https://private.example/nested.jpg' },
    },
    preview: 'https://private.example/future-schema.jpg',
    relativePreview: 'private/media/opaque-token',
    encodedPreview: 'DATA:image/png;base64,PRIVATE',
  },
])
assert.strictEqual(protectedRows[0].id, 7, 'protected rows must preserve identifiers')
assert.strictEqual(protectedRows[0].status, 'pending', 'protected rows must preserve status')
assert.strictEqual(protectedRows[0].text, '保留的业务文本', 'protected rows must preserve text')
assert.strictEqual(protectedRows[0].sender.id, 9, 'nested sender identifiers must remain')
assert.strictEqual(protectedRows[0].sender.avatar, '', 'nested sender.avatar must be cleared')
assert.strictEqual(protectedRows[0].payload.url, '', 'nested payload.url must be cleared')
assert.strictEqual(protectedRows[0].payload.nested.photoUrl, '', 'nested photoUrl must be cleared')
assert.strictEqual(protectedRows[0].preview, '', 'unknown future URL fields must fail closed')
assert.strictEqual(protectedRows[0].relativePreview, '', 'opaque relative media paths must fail closed')
assert.strictEqual(protectedRows[0].encodedPreview, '', 'URI schemes must be matched case-insensitively')
assert.ok(
  !JSON.stringify(protectedRows).includes('private.example') &&
    !JSON.stringify(protectedRows).includes('/private/photo.jpg'),
  'protected list responses must contain no clear media URL',
)

const protectedMessages = sanitizers.protectMessageList([
  {
    id: 1,
    status: 'received',
    type: 'text',
    content: '普通文字消息',
    sender: { id: 1, avatar: 'https://private.example/avatar.jpg' },
  },
  {
    id: 2,
    status: 'received',
    type: 'text',
    content: '媒体说明',
    payload: { id: 'media-2', url: 'https://private.example/media.jpg' },
    sender_avatar: 'https://private.example/avatar-2.jpg',
  },
])
assert.strictEqual(protectedMessages[0].content, '普通文字消息', 'plain text content must remain usable')
assert.strictEqual(protectedMessages[0].sender.avatar, '', 'nested message sender avatar must be cleared')
assert.strictEqual(protectedMessages[0].protectedContent, false, 'identity redaction alone is not media content')
assert.strictEqual(protectedMessages[1].content, '', 'nested media payloads must hide message content')
assert.strictEqual(protectedMessages[1].protectedContent, true, 'nested media payloads need a protected marker')
assert.strictEqual(protectedMessages[1].id, 2, 'protected messages must preserve identifiers')
assert.strictEqual(protectedMessages[1].status, 'received', 'protected messages must preserve status')
assert.ok(!JSON.stringify(protectedMessages).includes('private.example'), 'protected chat must contain no clear URL')

const protectedFailure = sanitizers.protectSubjectResponse({
  success: false,
  code: 401,
  data: {
    peer: { id: 9, avatar: 'https://private.example/permission.jpg' },
    application: { id: 2, photo_url: '/private/application.jpg' },
  },
}, { mode: 'parent', childId: 42 })
assert.strictEqual(protectedFailure.data.peer.id, 9, 'protected failures retain identifiers')
assert.strictEqual(protectedFailure.data.peer.avatar, '', 'protected permission/failure data clears nested avatars')
assert.strictEqual(protectedFailure.data.application.photo_url, '', 'protected failure data clears nested photos')
assert.ok(
  (apiSource.match(/protectSubjectResponse\(/g) || []).length >= 12,
  'all parent permission, failure, history and command paths must use the response sanitizer',
)
assert.ok(
  apiSource.includes("normalized.indexOf('private/') == 0") &&
    apiSource.includes("normalized.indexOf('media/') == 0"),
  'opaque relative protected-media references must fail closed',
)

const mock = loadMockModule()
mock.resetMockMessageState()

const selfUnreadBefore = mock.getMockConversationPage('', 20, 'self').unreadTotal
const childOneUnreadBefore = mock.getMockConversationPage('', 20, 'parent:101').unreadTotal
const childTwoUnreadBefore = mock.getMockConversationPage('', 20, 'parent:202').unreadTotal
assert.strictEqual(selfUnreadBefore, 1, 'self seed must start unread')
assert.strictEqual(childOneUnreadBefore, 1, 'first child seed must start unread')
assert.strictEqual(childTwoUnreadBefore, 1, 'second child seed must start unread')
assert.strictEqual(mock.markAllMockMessagesRead('parent:101').success, true, 'parent read-all should succeed')
assert.strictEqual(mock.getMockConversationPage('', 20, 'parent:101').unreadTotal, 0, 'read-all mutates only acting child')
assert.strictEqual(mock.getMockConversationPage('', 20, 'self').unreadTotal, 1, 'parent read-all cannot mutate self')
assert.strictEqual(mock.getMockConversationPage('', 20, 'parent:202').unreadTotal, 1, 'parent read-all cannot mutate another child')

const accepted = mock.handleMockApplication(2, 'accept', 'application-command-1', 'parent:101')
assert.strictEqual(accepted.success, true, 'parent application action should succeed for its own state')
assert.strictEqual(mock.getMockChatPermission(2, 'parent:101').canChat, true, 'accepted parent state opens its chat')
assert.strictEqual(mock.getMockChatPermission(2, 'self').canChat, false, 'parent action cannot open self chat')
assert.strictEqual(mock.getMockChatPermission(2, 'parent:202').canChat, false, 'parent action cannot open another child chat')
const replayed = mock.handleMockApplication(2, 'accept', 'application-command-1', 'parent:101')
assert.strictEqual(JSON.stringify(replayed), JSON.stringify(accepted), 'same command and action must replay the same result')
const commandConflict = mock.handleMockApplication(2, 'reject', 'application-command-1', 'parent:101')
assert.strictEqual(commandConflict.success, false, 'reusing a command for another action must fail')
assert.strictEqual(commandConflict.code, 'IDEMPOTENCY_CONFLICT', 'command conflicts need a stable code')
assert.strictEqual(
  mock.getMockApplicationPage('incoming', '', 20, 'self').list.find((item) => item.id === 2).status,
  'pending',
  'parent application mutation cannot change the self application list',
)

const selfThreadLength = mock.getMockChatMessages(1, 'self').length
const childTwoThreadLength = mock.getMockChatMessages(1, 'parent:202').length
const sent = mock.sendMockMessage(1, '父母主体消息', 'text', 'message-command-1', 'parent:101')
assert.strictEqual(sent.success, true, 'parent subject send should succeed when chat is allowed')
assert.strictEqual(mock.getMockChatMessages(1, 'parent:101').length, 4, 'sent message belongs to acting child')
assert.strictEqual(mock.getMockChatMessages(1, 'self').length, selfThreadLength, 'parent send cannot mutate self chat')
assert.strictEqual(
  mock.getMockChatMessages(1, 'parent:202').length,
  childTwoThreadLength,
  'parent send cannot mutate another child chat',
)
const duplicateSend = mock.sendMockMessage(1, '父母主体消息', 'text', 'message-command-1', 'parent:101')
assert.strictEqual(duplicateSend.success, true, 'same message id and body should be idempotent')
assert.strictEqual(duplicateSend.deduplicated, true, 'duplicate send must be reported as deduplicated')
assert.strictEqual(mock.getMockChatMessages(1, 'parent:101').length, 4, 'duplicate send must not append a message')
const sendConflict = mock.sendMockMessage(1, '冲突内容', 'text', 'message-command-1', 'parent:101')
assert.strictEqual(sendConflict.code, 'IDEMPOTENCY_CONFLICT', 'same message id with another body must fail')
const selfSameId = mock.sendMockMessage(1, '普通主体消息', 'text', 'message-command-1', 'self')
assert.strictEqual(selfSameId.success, true, 'idempotency keys are isolated by subject')

console.log('消息 API 主体隔离与脱敏安全测试通过')
