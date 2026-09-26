const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const root = path.resolve(__dirname, '..')
const apiSource = fs.readFileSync(path.join(root, 'api/message.uts'), 'utf8')
const mockSource = fs.readFileSync(path.join(root, 'mock/message.uts'), 'utf8')
const parentApiSource = fs.readFileSync(path.join(root, 'api/parent.uts'), 'utf8')
const messagePage = fs.readFileSync(path.join(root, 'pages/message/message.uvue'), 'utf8')
const chatPage = fs.readFileSync(path.join(root, 'pagesSub/chat/detail.uvue'), 'utf8')
const messageCenterPath = path.join(root, 'components/XsaMessageCenter.uvue')
const applicationTabsPath = path.join(root, 'components/XsaApplicationTabs.uvue')
const conversationListPath = path.join(root, 'components/XsaConversationList.uvue')

function includes(source, value, label) {
  assert.ok(source.includes(value), `${label} should include ${value}`)
}

function excludes(source, value, label) {
  assert.ok(!source.includes(value), `${label} should not include ${value}`)
}

function loadMockModule() {
  const context = {
    Array,
    Date,
    JSON,
    Math,
    Number,
    Object,
    String,
    console,
  }
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

function loadProtectedMessageSanitizer() {
  const start = apiSource.indexOf('const PROTECTED_MEDIA_FIELDS')
  const end = apiSource.indexOf('function protectPageAvatars', start)
  assert.ok(start >= 0 && end > start, 'protected message sanitizer block should be complete')
  const executable = apiSource
    .slice(start, end)
    .replace(/:\s*(?:any\[\]|string\[\]|any|boolean)/g, '')
  const context = { Array, String }
  context.globalThis = context
  vm.runInNewContext(
    `${executable}\nglobalThis.protectMessageList = protectMessageList`,
    context,
    { filename: 'api/message.uts#protected-sanitizer' },
  )
  return context.protectMessageList
}

console.log('消息闭环行为与契约测试')

// Public API and compatibility exports.
includes(apiSource, 'export const MESSAGE_USE_MOCK = false', 'ordinary message center uses the authenticated FastAPI backend')
for (const name of [
  'getConversationPage',
  'getApplicationPage',
  'getChatPermission',
  'markAllMessagesRead',
  'getMessageList',
  'getChatMessages',
  'sendMessage',
  'uploadChatMedia',
  'revokeMessage',
  'getContactExchanges',
  'createContactExchange',
  'respondContactExchange',
  'getApplications',
  'handleApplication',
]) {
  includes(apiSource, `export async function ${name}`, `${name} export`)
}
includes(apiSource, 'clientMessageId', 'send message idempotency key')
includes(apiSource, 'protectPageAvatars', 'parent list response avatar redaction')
includes(apiSource, 'protectMessageList', 'parent chat response payload redaction')
includes(apiSource, "senderAvatar: ''", 'protected responses clear sender avatars')
includes(apiSource, "content: protectedContent ? '' : item.content", 'protected responses clear media content')
includes(apiSource, 'protectedItem[PROTECTED_MEDIA_OBJECT_FIELDS[j]] = null', 'protected responses clear nested attachments')
includes(apiSource, 'photoScope: photoScope', 'legacy message requests carry the effective privacy scope')
includes(apiSource, 'export const CHAT_USE_MOCK = false', 'ordinary text chat uses the authenticated FastAPI backend')
includes(apiSource, "url: '/chat/sessions'", 'chat permission resolves sessions from the authenticated session list')
includes(apiSource, 'const peerId = Number(item?.target?.user_id ?? 0)', 'session lookup matches the requested peer')
includes(apiSource, 'const sessionId = Number(item?.id ?? 0)', 'session lookup uses the server-owned session id')
includes(apiSource, "url: '/chat/sessions/' + sessionId + '/messages'", 'chat history uses the server-owned session id')
includes(apiSource, 'data: { page: 1, page_size: 50 }', 'chat history uses the supported FastAPI page contract')
includes(apiSource, 'data: { type: 1, content: content.trim(), client_message_id: resolvedClientMessageId }', 'text send carries the stable idempotency key')
includes(apiSource, "if (subjectContext.mode == 'parent') {", 'ordinary chat rejects unsupported parent mode')
includes(apiSource, 'const peerAvatar = sessionRes.data.target?.avatar ?? DEFAULT_PEER_AVATAR', 'history reuses the authorized session lookup result')
excludes(apiSource, 'const session = await findRealChatSession(userId)', 'history does not repeat the session-list request')
excludes(apiSource, "url: '/chat/sessions/' + userId + '/messages'", 'peer user id is never used as a chat session id')
includes(parentApiSource, "getApplications('protected', subject)", 'parent applications require protected scope and child subject')
includes(parentApiSource, "getMessageList('protected', subject)", 'parent messages require protected scope and child subject')
assert.ok(
  (apiSource.match(/normalizeBusinessResponse\(await messageRequest\(/g) || []).length >= 5,
  'all real message reads and writes should normalize transport and business failures',
)

const protectMessageList = loadProtectedMessageSanitizer()
const clearAvatarUrl = 'https://private.example/avatar.jpg'
const clearAttachmentUrl = 'https://private.example/photo.jpg'
const protectedMessages = protectMessageList([
  {
    id: 1,
    type: 'image',
    content: clearAttachmentUrl,
    senderAvatar: clearAvatarUrl,
    imageUrl: clearAttachmentUrl,
    attachment: { url: clearAttachmentUrl },
  },
  {
    id: 2,
    type: 'text',
    content: '正常文字消息',
    senderAvatar: clearAvatarUrl,
  },
])
assert.strictEqual(protectedMessages[0].senderAvatar, '', 'protected image messages must clear senderAvatar')
assert.strictEqual(protectedMessages[0].content, '', 'protected image messages must clear content URLs')
assert.strictEqual(protectedMessages[0].imageUrl, '', 'protected image messages must clear flat media URLs')
assert.strictEqual(protectedMessages[0].attachment, null, 'protected image messages must clear nested attachments')
assert.strictEqual(protectedMessages[0].protectedContent, true, 'protected media should carry a safe placeholder flag')
assert.strictEqual(protectedMessages[1].content, '正常文字消息', 'protected text messages should retain non-media content')
assert.strictEqual(protectedMessages[1].senderAvatar, '', 'protected text messages must still clear senderAvatar')
assert.ok(!JSON.stringify(protectedMessages).includes('private.example'), 'protected chat data must contain no clear URL')

// Execute the production mock state machine for outcome-based checks.
const mock = loadMockModule()
for (const name of [
  'resetMockMessageState',
  'failNextMockMessageOperation',
  'getMockConversationPage',
  'getMockApplicationPage',
  'getMockChatPermission',
  'markAllMockMessagesRead',
  'handleMockApplication',
  'getMockChatMessages',
  'sendMockMessage',
  'revokeMockMessage',
  'getMockContactExchanges',
  'createMockContactExchange',
  'respondMockContactExchange',
]) {
  assert.strictEqual(typeof mock[name], 'function', `${name} should be executable`)
}

mock.resetMockMessageState()
const firstConversationPage = mock.getMockConversationPage('', 2)
assert.strictEqual(firstConversationPage.list.length, 2, 'first conversation page should honor page size')
assert.strictEqual(firstConversationPage.hasMore, true, 'first conversation page should expose more data')
assert.ok(firstConversationPage.nextCursor, 'first conversation page should return a cursor')
const secondConversationPage = mock.getMockConversationPage(firstConversationPage.nextCursor, 2)
assert.strictEqual(secondConversationPage.list.length, 1, 'second conversation page should contain the remainder')
assert.notStrictEqual(
  firstConversationPage.list[0].id,
  secondConversationPage.list[0].id,
  'conversation pages should not overlap',
)

mock.resetMockMessageState()
const incomingPage = mock.getMockApplicationPage('incoming', '', 20)
const outgoingPage = mock.getMockApplicationPage('outgoing', '', 20)
assert.ok(incomingPage.list.every((item) => item.direction === 'in'), 'incoming page should only contain received applications')
assert.ok(outgoingPage.list.every((item) => item.direction === 'out'), 'outgoing page should only contain sent applications')
assert.strictEqual(incomingPage.pendingCount, 1, 'only received pending applications should count as actionable')
assert.strictEqual(outgoingPage.pendingCount, 0, 'sent applications should not count as actionable')
const firstIncomingApplicationPage = mock.getMockApplicationPage('incoming', '', 1)
assert.strictEqual(firstIncomingApplicationPage.list.length, 1, 'application page should honor page size')
assert.strictEqual(firstIncomingApplicationPage.hasMore, true, 'application page should expose more data')
const secondIncomingApplicationPage = mock.getMockApplicationPage(
  'incoming',
  firstIncomingApplicationPage.nextCursor,
  1,
)
assert.notStrictEqual(
  firstIncomingApplicationPage.list[0].id,
  secondIncomingApplicationPage.list[0].id,
  'application pages should not overlap',
)
assert.strictEqual(secondIncomingApplicationPage.pendingCount, 1, 'pending count should remain a received-list total')

const outgoingBeforeFailure = mock.mockApplications.find((item) => item.direction === 'out').status
const invalidHandle = mock.handleMockApplication(1, 'accept')
assert.strictEqual(invalidHandle.success, false, 'an outgoing application cannot be accepted locally')
const outgoingAfterFailure = mock.mockApplications.find((item) => item.direction === 'out').status
assert.strictEqual(outgoingAfterFailure, outgoingBeforeFailure, 'business failure must preserve application state')

assert.strictEqual(mock.getMockChatPermission(2).canChat, false, 'pending applications must fail closed')
mock.failNextMockMessageOperation('handleApplication')
const transientHandleFailure = mock.handleMockApplication(2, 'accept')
assert.strictEqual(transientHandleFailure.success, false, 'a transient application failure should be observable')
assert.strictEqual(
  mock.mockApplications.find((item) => item.id === 2).status,
  'pending',
  'a transient application failure must preserve the pending state',
)
assert.strictEqual(mock.getMockChatPermission(2).canChat, false, 'failed acceptance must not open chat')
const accepted = mock.handleMockApplication(2, 'accept')
assert.strictEqual(accepted.success, true, 'a received pending application can be accepted')
assert.strictEqual(mock.getMockChatPermission(2).canChat, true, 'accepting an application should open that conversation')
assert.strictEqual(mock.getMockChatPermission(9999).canChat, false, 'unknown users must fail closed')

mock.resetMockMessageState()
const rejected = mock.handleMockApplication(2, 'reject')
assert.strictEqual(rejected.success, true, 'a received pending application can be rejected')
assert.strictEqual(rejected.application.status, 'rejected', 'reject should return the final application state')
assert.strictEqual(rejected.canChat, false, 'reject must not open chat')
assert.strictEqual(mock.getMockChatPermission(2).canChat, false, 'rejected applications remain unable to chat')

mock.resetMockMessageState()
const unreadBefore = mock.mockMessageList.reduce((sum, item) => sum + item.unreadCount, 0)
assert.ok(unreadBefore > 0, 'fixture should start with unread messages')
mock.failNextMockMessageOperation('markAllRead')
const failedReadResult = mock.markAllMockMessagesRead()
assert.strictEqual(failedReadResult.success, false, 'mark-all-read should expose business failure')
assert.strictEqual(
  mock.mockMessageList.reduce((sum, item) => sum + item.unreadCount, 0),
  unreadBefore,
  'mark-all-read failure must preserve unread state',
)
const readResult = mock.markAllMockMessagesRead()
assert.strictEqual(readResult.updatedCount, unreadBefore, 'mark-all-read should report the changed unread count')
assert.ok(mock.mockMessageList.every((item) => item.unreadCount === 0), 'mark-all-read should persist in mock state')

mock.resetMockMessageState()
const beforeSendCount = mock.getMockChatMessages(1).length
mock.failNextMockMessageOperation('sendMessage')
const failedSend = mock.sendMockMessage(1, '同一条消息', 'text', 'client-message-1')
assert.strictEqual(failedSend.success, false, 'send failure should be observable')
assert.strictEqual(mock.getMockChatMessages(1).length, beforeSendCount, 'failed send must not append history')
const firstSend = mock.sendMockMessage(1, '同一条消息', 'text', 'client-message-1')
const duplicateSend = mock.sendMockMessage(1, '同一条消息', 'text', 'client-message-1')
assert.strictEqual(firstSend.success, true, 'first send should succeed')
assert.strictEqual(duplicateSend.success, true, 'idempotent retry should succeed')
assert.strictEqual(duplicateSend.deduplicated, true, 'idempotent retry should be identified')
assert.strictEqual(duplicateSend.message.id, firstSend.message.id, 'idempotent retry should return the original message')
assert.strictEqual(mock.getMockChatMessages(1).length, beforeSendCount + 1, 'idempotent retry must not duplicate history')
const conflictingSend = mock.sendMockMessage(1, '不同内容', 'text', 'client-message-1')
assert.strictEqual(conflictingSend.success, false, 'reusing one idempotency key for different content must fail')
assert.strictEqual(conflictingSend.code, 'IDEMPOTENCY_CONFLICT', 'idempotency conflicts need an explicit code')
assert.strictEqual(mock.getMockChatMessages(1).length, beforeSendCount + 1, 'idempotency conflict must not append history')
const blockedSend = mock.sendMockMessage(9999, '不能越过门禁', 'text', 'blocked-message-1')
assert.strictEqual(blockedSend.success, false, 'sending to an unapproved conversation must fail closed')

const revokeFailureMessage = firstSend.message.id
mock.failNextMockMessageOperation('revokeMessage')
const failedRevoke = mock.revokeMockMessage(revokeFailureMessage, 'revoke-message-1')
assert.strictEqual(failedRevoke.success, false, 'failed revoke should be observable')
assert.ok(
  mock.getMockChatMessages(1).some((message) => message.id === revokeFailureMessage && message.revoked !== true),
  'failed revoke must preserve the original message',
)
const revoked = mock.revokeMockMessage(revokeFailureMessage, 'revoke-message-1')
assert.strictEqual(revoked.success, true, 'own sent message can be revoked')
const duplicateRevoke = mock.revokeMockMessage(revokeFailureMessage, 'revoke-message-1')
assert.strictEqual(duplicateRevoke.success, true, 'revoke retry should be idempotent')
assert.ok(
  mock.getMockChatMessages(1).some((message) => message.id === revokeFailureMessage && message.content === '消息已撤回'),
  'successful revoke should replace visible content',
)

mock.resetMockMessageState()
const pendingExchanges = mock.getMockContactExchanges(1)
assert.strictEqual(pendingExchanges.success, true, 'accepted chat permission can read contact exchange state')
assert.strictEqual(pendingExchanges.list[0].contactValue, null, 'pending contact values must remain hidden')
mock.failNextMockMessageOperation('createContactExchange')
const failedContactCreate = mock.createMockContactExchange(1, 'wechat', 'xsa_contact_01', 'contact-create-1')
assert.strictEqual(failedContactCreate.success, false, 'contact create failure should remain observable')
const contactCreate = mock.createMockContactExchange(1, 'wechat', 'xsa_contact_01', 'contact-create-1')
assert.strictEqual(contactCreate.success, true, 'contact request should be creatable after chat permission')
assert.strictEqual(contactCreate.exchange.contactValue, null, 'requester cannot read a pending submitted value')
const initialIncomingExchange = pendingExchanges.list[0]
mock.failNextMockMessageOperation('respondContactExchange')
const failedContactResponse = mock.respondMockContactExchange(initialIncomingExchange.id, 'accept', 'contact-accept-1')
assert.strictEqual(failedContactResponse.success, false, 'contact response failure should preserve pending state')
const acceptedContact = mock.respondMockContactExchange(initialIncomingExchange.id, 'accept', 'contact-accept-1')
assert.strictEqual(acceptedContact.success, true, 'receiver can explicitly accept a contact request')
assert.strictEqual(acceptedContact.exchange.contactValue, 'xsa_mock_suwanqing', 'accepted contact becomes visible to both parties')

// Message center contract.
assert.ok(fs.existsSync(messageCenterPath), 'reusable XsaMessageCenter component should exist')
assert.ok(fs.existsSync(applicationTabsPath), 'reusable XsaApplicationTabs component should exist')
assert.ok(fs.existsSync(conversationListPath), 'reusable XsaConversationList component should exist')
const messageCenter = fs.readFileSync(messageCenterPath, 'utf8')
const applicationTabs = fs.readFileSync(applicationTabsPath, 'utf8')
const conversationList = fs.readFileSync(conversationListPath, 'utf8')
includes(messagePage, 'const openEmotionLab = () =>', 'message page exposes the emotion-lab navigation action')
includes(messagePage, "url: '/pages/emotion-lab/emotion-lab'", 'message page uses the registered emotion-lab route')
excludes(messagePage, "openHint('情感实验室", 'emotion-lab shortcut must not show a dead-end hint')
includes(messageCenter, "mode?: 'standard' | 'parent'", 'standard and parent modes')
includes(messageCenter, 'showStandardShortcuts', 'role-aware shortcut visibility')
includes(messageCenter, 'refreshKey?: number', 'message center exposes a page-lifecycle refresh contract')
includes(messageCenter, 'const refreshCenter', 'message center can reload shared data without remounting')
includes(messageCenter, '<XsaApplicationTabs', 'message center application component')
includes(messageCenter, '<XsaConversationList', 'message center conversation component')
includes(messageCenter, "['收到的', '发出的']", 'application direction tabs')
includes(messageCenter, 'applicationTab.value = index', 'application tab is a controlled state update')
includes(messageCenter, 'incomingPendingCount.value', 'pending count is exposed for the received tab')
includes(messageCenter, "incomingApplications.value.filter((item: any) => item.status == 'pending').length", 'pending count includes all loaded pages, not only the latest page')
includes(applicationTabs, '收到的申请会出现在这里', 'received application tab state')
includes(applicationTabs, '发出的申请会出现在这里', 'sent application tab state')
includes(conversationList, '<XsaMessageItem', 'shared conversation item rendering')
includes(messageCenter, "from '@/api'", 'shared API boundary')
includes(messageCenter, 'getConversationPage', 'cursor conversation API')
includes(messageCenter, 'getApplicationPage', 'directional application API')
includes(messageCenter, 'markAllMessagesRead', 'persistent mark-all-read action')
includes(messageCenter, 'result.success != true', 'mark-all-read and application writes require business success')
includes(messageCenter, 'retryLoad', 'message center retry action')
includes(messageCenter, 'incomingApplicationErrorMode', 'incoming application retry remembers reset versus load-more')
includes(messageCenter, 'outgoingApplicationErrorMode', 'outgoing application retry remembers reset versus load-more')
includes(messageCenter, "incomingApplicationErrorMode.value = reset ? 'reset' : 'more'", 'failed incoming reset preserves retry cursor mode')
includes(messageCenter, "outgoingApplicationErrorMode.value = reset ? 'reset' : 'more'", 'failed outgoing reset preserves retry cursor mode')
excludes(
  messageCenter,
  "loadApplicationPage(applicationTab.value === 0 ? 'incoming' : 'outgoing', applications.value.length === 0)",
  'application retry must not infer reset mode from stale list length',
)
includes(messageCenter, 'getChatPermission', 'conversation permission recheck')
includes(messageCenter, "isParentMode.value ? 'protected' : 'standard'", 'parent message reads request protected data')
includes(messageCenter, 'permission.canChat == true', 'fail-closed conversation navigation')
includes(messageCenter, 'result.application.status != expectedStatus', 'application success requires a matching final state')
includes(messageCenter, 'result.canChat != expectedCanChat', 'application success requires the matching chat permission state')
includes(messageCenter, 'clearParentMessageState', 'revoked parent access clears cached message data')
includes(messageCenter, "uni.getStorageSync('xsa_onboarding_mode')", 'parent message actions recheck the stored role')
includes(messageCenter, 'ParentContext | null', 'parent message context uses the shared typed contract')
assert.ok(
  (messageCenter.match(/if \([^\n]*await ensureParentAccess\(\)[^\n]*\) return(?: false)?/g) || []).length >= 6,
  'parent message reads, mutations, and chat navigation should refresh the parent access gate',
)
includes(messageCenter, "emit('parent-context-change', latestContext)", 'refreshed parent context is returned to the shell')
assert.ok(
  (messageCenter.match(/:protect-photos="isParentMode"/g) || []).length >= 2,
  'parent conversations and applications should both use protected avatars',
)
includes(applicationTabs, 'protected-avatar-mark', 'parent applications should replace identifying photos')
includes(conversationList, ':protect-photo="protectPhotos"', 'parent conversations should protect each avatar')
includes(messageCenter, '@click="openEmotionLab"', 'emotion-lab shortcut binds the navigation action')
includes(messageCenter, 'const openEmotionLab = () =>', 'emotion-lab shortcut exposes a navigation action')
includes(messageCenter, "url: '/pages/emotion-lab/emotion-lab'", 'emotion-lab shortcut uses the registered page')
excludes(messageCenter, '情感实验室尚未完成账号与结果绑定', 'emotion-lab shortcut is not a dead-end hint')
excludes(messageCenter, "openHint('情感实验室", 'fake emotion-lab success hint')
excludes(messageCenter, '// mock 容错', 'application success-on-error fallback')

// Chat detail contract.
includes(chatPage, 'getChatPermission', 'chat detail permission API')
includes(chatPage, 'chatAllowed', 'chat detail fail-closed state')
includes(chatPage, 'onShow(() =>', 'chat detail rechecks permission when returning to the page')
includes(chatPage, 'clientMessageId', 'optimistic message idempotency key')
includes(chatPage, 'retryFailedMessage', 'single failed message retry')
includes(chatPage, 'message.clientMessageId,', 'message delivery sends the original client_message_id')
includes(chatPage, 'if (result.messageId != null) message.id = result.messageId', 'successful send replaces the optimistic id with the backend message id')
const retryHandlerStart = chatPage.indexOf('const retryFailedMessage = async')
assert.ok(retryHandlerStart >= 0, 'retry handler should exist')
assert.ok(chatPage.slice(retryHandlerStart, retryHandlerStart + 240).includes('await deliverMessage(message)'), 'retry must resend the same message object and idempotency key')
includes(chatPage, 'unsentLocal', 'failed local messages survive permission rechecks')
includes(chatPage, "isParentMode.value ? 'protected' : 'standard'", 'parent chat history requests protected avatars')
includes(chatPage, "content: protectedContent ? '' : message.content", 'parent detail never stores protected attachment content')
includes(chatPage, "avatar: isParentMode.value ? ''", 'parent detail never stores clear avatars')
includes(chatPage, 'message.protectedContent', 'parent detail renders a protected-content placeholder')
includes(chatPage, "{ 'parent-mode': isParentMode }", 'parent chat enables its accessibility variant')
includes(chatPage, '.chat-page.parent-mode .tool-btn', 'parent chat enlarges icon controls')
includes(chatPage, 'min-height: 48px', 'parent chat controls expose 48px targets')
includes(chatPage, "url: '/pages/parent/user-detail?id=' + userId.value", 'parent chat profile uses the gated parent detail')
includes(chatPage, 'v-if="!message.isMine && isParentMode"', 'parent chat does not bind the peer clear avatar')
includes(chatPage, "res.code == 'CHAT_NOT_ALLOWED'", 'detail and send failures close the permission gate')
assert.match(chatPage, /message\.status\s*=\s*'failed'/, 'failed sends should update only their own message state')
excludes(chatPage, 'Math.random()', 'random auto replies')
excludes(chatPage, '自动回复', 'demo auto reply')
includes(chatPage, 'uni.chooseImage', 'image action should select a file for upload')
includes(chatPage, 'sendMediaFile', 'selected media should enter the upload-and-send flow')
includes(chatPage, 'uploadChatMedia', 'media messages should use the upload API before send')
includes(apiSource, 'Mock 模式不上传本地媒体', 'mock media upload must fail explicitly instead of fake sending')
excludes(chatPage, '@click="chooseImage"', 'album action without an upload-and-send flow')
excludes(chatPage, '@click="takePhoto"', 'camera action without an upload-and-send flow')
excludes(chatPage, '@click="sendVoice"', 'voice action without a send flow')
excludes(chatPage, '@click="sendGift"', 'gift action without a send flow')
excludes(chatPage, '发送服务暂未开放', 'dead-end image send toast')
excludes(chatPage, '语音消息暂未开放', 'dead-end voice toast')
excludes(chatPage, '礼物功能开发中', 'dead-end gift toast')
includes(applicationTabs, 'v-if="protectPhotos"', 'parent applications do not bind clear avatar URLs')
includes(conversationList, ':protect-photo="protectPhotos"', 'parent conversations pass protected-photo mode')
const messageItem = fs.readFileSync(path.join(root, 'components/XsaMessageItem.uvue'), 'utf8')
includes(messageItem, 'v-if="protectPhoto"', 'parent conversations render a protected avatar placeholder')

console.log('消息闭环行为与契约测试通过')
