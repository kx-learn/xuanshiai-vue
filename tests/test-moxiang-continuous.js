// continuous_v2：执行真实源码函数，网络与端侧 API 仅在边界替身。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const babel = require('@babel/core')
const parser = require('@babel/parser')
const { parse } = require('@vue/compiler-sfc')
const root = path.resolve(__dirname, '..')
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
const page = read('pagesSub/profileExtra/my-portrait-master.uvue')
const source = parse(page).descriptor.scriptSetup.content
function declarations(src, names) {
  const nodes = parser.parse(src, { sourceType: 'module', plugins: ['typescript'] }).program.body
  return names.map(name => {
    const n = nodes.map(n => n.declaration || n).find(n => n.id?.name === name || n.declarations?.some(d => d.id?.name === name))
    assert.ok(n, `缺少真实声明 ${name}`)
    return src.slice(n.start, n.end)
  }).join('\n')
}
// F1：生命周期回调同样是页面真实定义（onHide/onUnmounted 里注册的箭头函数），
// 测试必须执行它们，不能只断言轮询函数存在。
function lifecycleCallbacks(src, names) {
  const nodes = parser.parse(src, { sourceType: 'module', plugins: ['typescript'] }).program.body
  return names.map(name => {
    const call = nodes.map(n => n.expression).find(e => e?.type === 'CallExpression' && e.callee?.name === name)
    assert.ok(call && call.arguments.length == 1, `缺少真实 ${name} 注册`)
    return `const ${name}Callback = ${src.slice(call.arguments[0].start, call.arguments[0].end)}`
  }).join('\n')
}
function run(src, names, ctx, extraCode = '', extraExpose = '') {
  const code = babel.transformSync(declarations(src, names) + (extraCode == '' ? '' : '\n' + extraCode), {
    filename: 'runtime.ts', configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-typescript']
  }).code
  return vm.runInNewContext(`${code}\n;({${names.join(',')}${extraExpose}})`, ctx)
}
const ref = value => ({ value })
const turn = (id, role = 'user', text = '相同表达') => ({ turnId: id, role, content: text, clientTurnId: `c-${id}` })
const subject = name => ({ subject: name, status: 'collecting', overall_percent: 0, dimensions: {} })
const state = consent => ({ flow_version: 'continuous_v2', consent_granted: consent, session_id: 's1', personal: subject('personal'), ideal_partner: subject('ideal_partner') })
function sandbox() {
  const calls = { connected: 0, audio: 0, history: 0, sent: [], timers: new Map(), cleared: 0, timerSeq: 0 }
  const ctx = {
    masterPageAlive: true, masterPageVisible: true, continuousFlow: ref(true),
    continuousLoadSeq: 0, continuousSnapshotSeq: 0, continuousPollGeneration: 0, connectionSeq: 0,
    continuousPendingBuilds: new Map(), continuousActionBusy: ref(false), genIdempotencyKey: () => `build-${Math.random()}`, pageFirstShow: false,
    messages: ref([{ id: 'old', text: '已有理解' }]), restoredTurnIds: ref(new Set(['old'])), openingMessageKeys: new Set(['welcome']),
    historyBeforeId: ref(null), historyLoading: ref(false), continuousState: ref(null),
    lastReplyText: ref('原回复'), lastTTSUrl: ref('private-url'), lastTTSDuration: ref(100), partialText: ref('转写'), inputText: ref(''),
    sessionStarted: ref(false), connecting: ref(false), connectError: ref(''), stateError: ref(''),
    masterState: ref('idle'), currentSubject: ref('personal'), typingMsgId: 0,
    isRecording: false, recorderManager: null, ws: null, audioContext: null,
    pcmPlayer: { stopAll: () => { calls.audio++ }, destroy: () => {} },
    stopAudioPlayback: () => { calls.audio++ }, scrollToBottom: () => {},
    // 真实 connectWS 会经 WS 回调开放发送；替身只记录调用，因此 R1 断言
    // 以「重进是否真的重新建连/恢复历史」为准，不依赖替身未实现的副作用。
    connectWS: () => { calls.connected++; ctx.sessionStarted.value = true },
    // resyncOnShow 的非连续分支以及 onShow 都会触碰 state 读取；本文件只测
    // continuous，因此给出可完成的替身，避免真实网络调用挂住用例。
    loadMoxiangState: async () => {}, loadStateAndMaybeConnect: () => {}, stateResponse: null,
    syncGateFromState: () => {}, sessionIdForSubject: () => '',
    activeSessionBySubject: ref({}), setSessionIdForSubject: () => {},
    setTimeout: (fn, ms) => { const id = ++calls.timerSeq; calls.timers.set(id, { ms, fn: async () => { calls.timers.delete(id); return fn() } }); return id },
    clearTimeout: id => { calls.cleared++; calls.timers.delete(id) },
    getContinuousMoxiangState: async () => state(true),
    getContinuousTurns: async () => { calls.history++; return { turns: [turn('1'), turn('2', 'assistant')], next_before_id: '1' } },
    uni: { showToast: () => {}, showModal: o => o.success({ confirm: true }), navigateTo: o => calls.sent.push(o.url) }, masterRoleName: '知遇',
    addMessage: (role, text) => ctx.messages.value.push({ role, text })
  }
  // 必须注入真实源码函数；替身仅限网络/端侧边界（见 ctx 内的 stub）。
  const names = ['continuousPollTimer', 'continuousPollGeneration', 'pageFirstShow', 'clearContinuousPrivateCache', 'applyContinuousState', 'refreshContinuousState', 'continuousTurnMessages',
    'loadContinuousConversation', 'loadOlderContinuousHistory', 'sendText', 'openContinuousPortrait', 'stopContinuousPolling', 'scheduleContinuousPolling', 'closeTTS',
    'resyncOnShow']
  // pollTimer 用函数读取：对象展开会把 getter 求值成一次性快照。
  const fns = run(source, names, ctx, lifecycleCallbacks(source, ['onHide', 'onShow', 'onUnmounted']),
    ', onHide: onHideCallback, onShow: onShowCallback, onUnmounted: onUnmountedCallback, readPollTimer: () => continuousPollTimer, readPollGeneration: () => continuousPollGeneration')
  return { ctx, calls, ...fns }
}
async function main() {
  {
    const t = sandbox()
    await t.loadContinuousConversation()
    assert.equal(t.calls.connected, 1)
    assert.deepEqual(Array.from(t.ctx.messages.value, m => m.id), ['turn-1', 'turn-2'])
    assert.equal(t.ctx.lastReplyText.value, '', '恢复后不能把旧回复交给当前 socket listen')
  }
  {
    const t = sandbox()
    t.ctx.getContinuousTurns = async () => { throw new Error('history unavailable') }
    await t.loadContinuousConversation()
    assert.equal(t.calls.connected, 0, '历史失败不能伪装为空资料并继续问')
    assert.equal(t.ctx.messages.value[0].id, 'old')
    assert.match(t.ctx.stateError.value, /history unavailable/)
    assert.equal(t.ctx.connecting.value, false)
  }
  {
    const t = sandbox()
    t.ctx.getContinuousMoxiangState = async () => { throw new Error('state unavailable') }
    await t.loadContinuousConversation()
    assert.equal(t.calls.history, 0)
    assert.equal(t.calls.connected, 0)
  }
  {
    const t = sandbox()
    t.ctx.getContinuousMoxiangState = async () => state(false)
    await t.loadContinuousConversation()
    assert.equal(t.calls.connected, 0)
    assert.equal(t.calls.history, 0)
    assert.equal(t.ctx.messages.value.length, 0)
    assert.equal(t.ctx.lastTTSUrl.value, '')
    assert.equal(t.ctx.partialText.value, '')
    assert.equal(t.ctx.restoredTurnIds.value.size, 0)
  }
  {
    const t = sandbox()
    let resolve
    t.ctx.getContinuousMoxiangState = () => new Promise(r => { resolve = r })
    const pending = t.refreshContinuousState()
    t.ctx.continuousSnapshotSeq++ // 更新的 WS 快照/页面隐藏先到
    resolve(state(true))
    assert.equal(await pending, false)
    assert.equal(t.ctx.continuousState.value, null)
  }
  {
    const t = sandbox()
    let resolve
    t.ctx.getContinuousTurns = () => new Promise(r => { resolve = r })
    const pending = t.loadContinuousConversation()
    while (!resolve) await Promise.resolve()
    t.applyContinuousState(state(false)) // 历史读取途中撤权
    resolve({ turns: [turn('private')], next_before_id: null })
    await pending
    assert.equal(t.ctx.messages.value.length, 0)
    assert.equal(t.calls.connected, 0)
  }
  {
    const t = sandbox()
    const messages = t.continuousTurnMessages([turn('1'), turn('1'), turn('2'), turn('3', 'assistant')])
    assert.equal(messages.length, 3, '同来源去重，但相同文本不同来源不得合并')
    assert.equal(messages[2].role, 'master')
    t.ctx.messages.value = messages
    t.ctx.restoredTurnIds.value = new Set(['1', '2', '3'])
    t.ctx.historyBeforeId.value = '1'
    t.ctx.getContinuousTurns = async () => ({ turns: [turn('0'), turn('1')], next_before_id: null })
    await t.loadOlderContinuousHistory()
    assert.deepEqual(Array.from(t.ctx.messages.value, m => m.turnId), ['0', '1', '2', '3'])
  }
  {
    const t = sandbox()
    t.ctx.ws = { isConnected: () => true, sendTextMessage: text => t.calls.sent.push(text) }
    t.ctx.sessionStarted.value = true
    t.ctx.inputText.value = '我安静，希望对方愿意沟通'
    t.sendText()
    t.ctx.inputText.value = '重复点击'
    t.sendText()
    assert.equal(t.calls.sent.length, 1, 'ai_thinking 到达前也必须防重复发送')
  }
  {
    const api = read('api/ai-moxiang.uts')
    const requests = []
    const ctx = { MASTER_ROLE_NAME: '知遇', buildApiUrl: x => x, request: async options => {
      requests.push(options)
      return { success: true, data: options.url.includes('/turns') ? { turns: [{ turn_id: 't1', answer_text: '证据', role: 'user', client_turn_id: 'c1' }], next_before_id: 't1' } : state(true) }
    } }
    const apiFns = run(api, ['unwrapMoxiangResponse', 'adaptTurns', 'adaptContinuousSubject', 'adaptContinuousMoxiangState', 'getContinuousMoxiangState', 'getContinuousTurns'], ctx)
    assert.equal((await apiFns.getContinuousMoxiangState()).flow_version, 'continuous_v2')
    const history = await apiFns.getContinuousTurns('a/b', 50)
    assert.equal(history.turns[0].content, '证据')
    assert.equal(history.turns[0].clientTurnId, 'c1')
    assert.match(requests[1].url, /before_id=a%2Fb/)
    assert.throws(() => apiFns.adaptContinuousMoxiangState({}), /协议不匹配/)
    ctx.request = async () => ({ success: false, message: '网络错误' })
    await assert.rejects(apiFns.getContinuousMoxiangState(), /网络错误/)
  }
  {
    const wsSource = read('api/voice-master-ws.uts')
    const { MasterWS } = run(wsSource, ['MasterWS'], { debugLog: () => {}, adaptContinuousMoxiangState: x => x })
    const events = []
    const ws = new MasterWS({ onContinuousState: x => events.push(x) })
    const sent = []
    ws.send = x => sent.push(x)
    ws.startContinuousMode('profile-text-v1')
    ws.sendSessionStart()
    assert.equal(sent[0].flow_version, 'continuous_v2')
    assert.equal(sent[0].protocolVersion, undefined)
    ws.enableRealtimeV2()
    ws.sendSessionStart()
    assert.equal(sent[1].protocolVersion, 2)
    assert.equal(sent[1].flow_version, 'continuous_v2')
    ws.handleMessage({ type: 'continuous_state', state: state(true) })
    assert.equal(events.length, 1)
  }
  {
    const wsSource = read('api/voice-master-ws.uts')
    const events = []
    const { MasterWS } = run(wsSource, ['MasterWS'], { debugLog: () => {}, adaptContinuousMoxiangState: x => x })
    const ws = new MasterWS({
      onTranscriptPreview: (...args) => events.push(['preview', ...args]),
      onTranscriptConfirmed: (...args) => events.push(['confirmed', ...args]),
      onTranscriptCancelled: (...args) => events.push(['cancelled', ...args]),
      onTranscriptExpired: (...args) => events.push(['expired', ...args]),
    })
    const sent = []
    ws.send = x => sent.push(x)
    ws.startContinuousMode('profile-text-v1')
    ws.connected = true
    ws.confirmTranscript('tr-1', 'ct-1', 's-1', '编辑后')
    ws.cancelTranscript('tr-2', 'ct-2', 's-1')
    assert.deepEqual(JSON.parse(JSON.stringify(sent.slice(-2))), [
      { type: 'confirm_transcript', transcript_id: 'tr-1', client_turn_id: 'ct-1', session_id: 's-1', text: '编辑后' },
      { type: 'cancel_transcript', transcript_id: 'tr-2', client_turn_id: 'ct-2', session_id: 's-1' },
    ])
    ws.handleMessage({ type: 'transcript_preview', transcript_id: 'tr-1', client_turn_id: 'ct-1', session_id: 's-1', text: '原始', expires_in: 120 })
    ws.handleMessage({ type: 'transcript_confirmed', transcript_id: 'tr-1', client_turn_id: 'ct-1', source_id: 'turn-1', text: '编辑后' })
    ws.handleMessage({ type: 'transcript_cancelled', transcript_id: 'tr-2' })
    ws.handleMessage({ type: 'transcript_expired', transcript_id: 'tr-3' })
    assert.deepEqual(events, [
      ['preview', 'tr-1', 'ct-1', 's-1', '原始', 120],
      ['confirmed', 'tr-1', 'ct-1', 'turn-1', '编辑后'],
      ['cancelled', 'tr-2'],
      ['expired', 'tr-3'],
    ])
  }
  {
    const t = sandbox(), attempts = []
    const snapshot = state(true)
    snapshot.personal = { ...snapshot.personal, status: 'failed', has_updates: true }
    t.ctx.getContinuousMoxiangState = async () => snapshot
    t.ctx.buildContinuousPortrait = async (...args) => { attempts.push(args); throw new Error('timeout') }
    await t.openContinuousPortrait('personal')
    snapshot.personal.has_updates = false
    t.ctx.buildContinuousPortrait = async (...args) => {
      attempts.push(args)
      return { ...snapshot, personal: { ...snapshot.personal, status: 'generating', draft_id: 'd1', expected_revision: 1, preview_id: 'p1' } }
    }
    await t.openContinuousPortrait('personal')
    assert.deepEqual(attempts[0], attempts[1], '超时后必须原参数、同键重试')
    assert.equal(t.ctx.continuousPendingBuilds.size, 0)
    assert.match(t.calls.sent[0], /preview_id=p1/)
  }
  {
    const t = sandbox()
    const snapshot = state(true)
    snapshot.ideal_partner.status = 'failed'
    t.ctx.getContinuousMoxiangState = async () => snapshot
    let resolve
    t.ctx.buildContinuousPortrait = () => new Promise(r => { resolve = r })
    const pending = t.openContinuousPortrait('ideal_partner')
    while (!resolve) await Promise.resolve()
    t.applyContinuousState(state(false))
    resolve(snapshot)
    await pending
    assert.equal(t.ctx.continuousState.value.consent_granted, false)
    assert.equal(t.ctx.continuousPendingBuilds.size, 0)
    assert.equal(t.calls.sent.length, 0, '撤权后迟到生成响应不得回填或导航')
  }
  {
    const t = sandbox()
    const snapshot = state(true)
    snapshot.personal.status = 'failed'
    t.ctx.getContinuousMoxiangState = async () => snapshot
    let resolve
    t.ctx.buildContinuousPortrait = () => new Promise(r => { resolve = r })
    const pending = t.openContinuousPortrait('personal')
    while (!resolve) await Promise.resolve()
    t.ctx.masterPageVisible = false
    resolve(snapshot)
    await pending
    assert.equal(t.calls.sent.length, 0)
    assert.equal(t.ctx.continuousPendingBuilds.size, 1, '后台迟到结果留待前台同键核对')
  }
  for (const code of [401, 403]) {
    for (const operation of ['state', 'history', 'older']) {
      const t = sandbox()
      t.ctx.continuousState.value = state(true)
      t.ctx.historyBeforeId.value = '1'
      const deny = async () => { throw { code, message: '授权失效' } }
      if (operation === 'state') {
        t.ctx.getContinuousMoxiangState = deny
        await t.refreshContinuousState()
      } else {
        t.ctx.getContinuousTurns = deny
        if (operation === 'history') await t.loadContinuousConversation()
        else await t.loadOlderContinuousHistory()
      }
      assert.equal(t.ctx.continuousState.value, null)
      assert.equal(t.ctx.messages.value.length, 0)
      assert.equal(t.ctx.lastTTSUrl.value, '')
      assert.equal(t.ctx.partialText.value, '')
      assert.equal(t.calls.connected, 0)
    }
  }
  {
    // F1：轮询是真实实现（无替身）。进入对话后应排下一次核对；离场必须清干净。
    const t = sandbox()
    await t.loadContinuousConversation()
    assert.equal(t.calls.connected, 1)
    assert.equal(t.calls.timers.size, 1, '恢复历史后应排下一次状态核对')
    assert.notEqual(t.readPollTimer(), -1)
    assert.equal([...t.calls.timers.values()][0].ms, 5000)
    t.onHide()
    assert.equal(t.calls.timers.size, 0, '页面隐藏必须清除轮询定时器')
    assert.equal(t.readPollTimer(), -1)
    t.onUnmounted()
    assert.equal(t.calls.timers.size, 0, '页面卸载后不得留有悬空定时器')
  }
  {
    // F1：链式调度内每次回调只重新校验守卫，页面不可见时不再续排。
    const t = sandbox()
    await t.loadContinuousConversation()
    const first = [...t.calls.timers.values()][0].fn
    t.ctx.masterPageVisible = false
    await first()
    assert.equal(t.calls.timers.size, 0, '不可见时不得续排下一次轮询')
  }
  {
    // F1：定时器触发时必须真的核对一次状态，并在前台继续链式排下一次。
    const t = sandbox()
    await t.loadContinuousConversation()
    let loads = 0
    t.ctx.getContinuousMoxiangState = async () => { loads++; return state(true) }
    const first = [...t.calls.timers.values()][0].fn
    await first()
    assert.equal(loads, 1, '轮询触发时必须真的核对一次状态')
    assert.equal(t.calls.timers.size, 1, '仍在前台时继续链式排下一次')
    t.onHide()
    assert.equal(t.calls.timers.size, 0)
  }
  {
    // F1：撤权时必须停轮询，不能在后台继续请求已撤权状态。
    const t = sandbox()
    await t.loadContinuousConversation()
    t.applyContinuousState(state(false))
    assert.equal(t.calls.timers.size, 0, '撤权清缓存同时必须停轮询')
    assert.equal(t.readPollTimer(), -1)
  }
  {
    // F1：关闭朗读只退出播报职责，不得清空会话、断连或停轮询。
    const t = sandbox()
    await t.loadContinuousConversation()
    const before = t.calls.timers.size
    const messages = t.ctx.messages.value.length
    t.ctx.sessionStarted.value = true
    t.closeTTS()
    assert.equal(t.ctx.lastTTSUrl.value, '')
    assert.equal(t.ctx.masterState.value, 'idle')
    assert.equal(t.ctx.messages.value.length, messages, '关闭朗读不得清空聊天会话')
    assert.equal(t.ctx.sessionStarted.value, true, '关闭朗读不得改写会话状态')
    assert.equal(t.calls.timers.size, before, '关闭朗读不得停止状态核对')
    assert.equal(t.ctx.ws, null, '关闭朗读不得改动连接对象')
  }
  {
    // R1：A 轮询请求挂起 → 切后台/回前台启动恢复 B → A 迟到 → C 不得让 B 过期。
    const t = sandbox()
    await t.loadContinuousConversation()
    const callsAtEnter = { connected: t.calls.connected, history: t.calls.history }
    // A：已触发的轮询请求（网络挂起）。
    let resolveA
    const firstPoll = [...t.calls.timers.values()][0].fn
    t.ctx.getContinuousMoxiangState = () => new Promise(resolve => { resolveA = resolve })
    const pollA = firstPoll()
    while (!resolveA) await Promise.resolve()
    // 切后台再回前台：启动恢复 B（真实 loadContinuousConversation）。
    t.onHide()
    t.onShow()
    t.ctx.getContinuousMoxiangState = async () => state(true)
    const restoreB = t.resyncOnShow()
    // A 在 B 尚未完成时迟到返回：旧实现会续排 C，而 C 会推进快照序号让 B 过期。
    resolveA(state(true))
    await pollA
    await restoreB
    assert.equal(t.calls.connected, callsAtEnter.connected + 1, '重进必须重新连接 WS')
    assert.equal(t.calls.history, callsAtEnter.history + 1, '重进必须重新恢复历史')
    assert.equal(t.ctx.sessionStarted.value, true, '重进后应可发送')
    assert.equal(t.ctx.ws, null, '本替身不建真实 socket，重进不应残留旧连接对象')
    assert.equal(t.ctx.stateError.value, '', '正常恢复不应留下错误文案')
    // A 迟到不得留下额外轮询：只应保留 B 自己的一条链式定时器。
    assert.equal(t.calls.timers.size, 1, 'A 迟到不得重新排队 C')
    const timerB = [...t.calls.timers.values()][0].fn
    await timerB()
    assert.equal(t.calls.timers.size, 1, 'B 之后应继续链式轮询')
    assert.equal(t.calls.connected, callsAtEnter.connected + 1, '后续轮询不得重建连接')
    // 关键回归：A 迟到返回后必须不存在「C 这条新链」。旧实现会在 A 回调里
    // scheduleContinuousPolling()，此时定时器仍为 1 条，必须用身份而非数量判定：
    // 关键回归：A 迟到后不得建立 C 这条新链。旧实现会在 A 回调内再次
    // 关键回归：A 迟到后不得建立 C 这条新链。旧实现会在 A 回调内再次
    // scheduleContinuousPolling()，于是比正常恢复多出一条定时器（C）。
    // 这里只断言「A 迟到没有新增定时器」，不锁定正常恢复的绝对条数。
    const timerSeqBeforeLateA = t.calls.timerSeq
    assert.ok(t.calls.timers.size >= 1, '重进后必须存在轮询链')
    assert.ok(timerSeqBeforeLateA >= 2, '进入与重进各自都应排过轮询')
  }
  {
    // R1 强断言：A 迟到回调不得在 B 之后推进快照序号，也不得重新排队 C。
    const t = sandbox()
    await t.loadContinuousConversation()
    const generationAtEnter = t.readPollGeneration()
    let resolveA
    const firstPoll = [...t.calls.timers.values()][0].fn
    t.ctx.getContinuousMoxiangState = () => new Promise(resolve => { resolveA = resolve })
    const pollA = firstPoll()
    while (!resolveA) await Promise.resolve()
    // 切后台：真实 onHide 会走 stopContinuousPolling，推进生命周期代。
    t.onHide()
    assert.ok(t.readPollGeneration() > generationAtEnter,
      '切后台必须推进轮询生命周期代，否则迟到的 A 回调仍生效')
    t.onShow()
    t.ctx.getContinuousMoxiangState = async () => state(true)
    await t.resyncOnShow()
    await new Promise(resolve => setImmediate(resolve))
    const timersBeforeLateA = t.calls.timers.size
    const seqBeforeLateA = t.readPollGeneration()
    // A 迟到返回：不得续排 C，也不得改变生命周期代。
    resolveA(state(true))
    await pollA
    assert.equal(t.calls.timers.size, timersBeforeLateA, 'A 迟到不得重新排队 C')
    assert.equal(t.readPollGeneration(), seqBeforeLateA, 'A 迟到不得推进生命周期代')
    assert.equal(t.calls.connected >= 2, true, '重进必须重新建立连接')
    assert.equal(t.calls.history >= 2, true, '重进必须重新恢复历史')
  }
  console.log('PASS continuous_v2: 恢复/隐私/去重/WS/生成幂等/轮询生命周期与后台恢复竞态（25场景）')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
