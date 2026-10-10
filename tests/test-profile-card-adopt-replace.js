// 采用资料卡时必须把「确认替换已有自我介绍」如实传出：
// 用户已有 self_intro 且该开关为 true 时，后端才会写入（written_fields 含 self_intro）；
// 若前端漏传或传 false，后端按隐私默认跳过 → applied_meta.ai_generated 为空 →
// 海报导出被 PROFILE_CARD_EXPORT_NOT_AVAILABLE 拒绝。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const babel = require('@babel/core')
const parser = require('@babel/parser')
const sfc = require('@vue/compiler-sfc')
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8')
const compile = src => babel.transformSync(src, { filename: 'runtime.ts', configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-typescript'] }).code
const PAGE = 'pagesSub/profileExtra/my-portrait-result.uvue'

function buildPage(options = {}) {
  const parsed = sfc.parse(read(PAGE))
  assert.deepEqual(parsed.errors, [])
  const src = parsed.descriptor.script.content
  const nodes = parser.parse(src, { sourceType: 'module', plugins: ['typescript'] }).program.body
  const pageCode = nodes.filter(n => n.type !== 'ImportDeclaration')
    .map(n => n.type === 'ExportDefaultDeclaration' ? 'const page = ' + src.slice(n.declaration.start, n.declaration.end) : src.slice(n.start, n.end)).join('\n')

  const sent = []
  const ctx = {
    MoxiangPosterSheet: {}, fieldLabel: x => x, genIdempotencyKey: () => 'k',
    displayFieldValue: (key, value, dv) => (dv != null ? String(dv) : String(value)),
    setInterval: () => 0, clearInterval: () => {}, setTimeout: () => 0, clearTimeout: () => {},
    uni: {
      getSystemInfoSync: () => ({ windowWidth: 390 }), getMenuButtonBoundingClientRect: () => null,
      showToast: () => {}, showModal: o => { if (o && o.success) o.success({ confirm: true }) },
      enableAlertBeforeUnload: () => {}, disableAlertBeforeUnload: () => {},
    },
    // 用户已有自我介绍：这是走 replace_existing 分支的前提。
    getOwnProfile: async () => ({ success: true, data: { profile: { self_intro: '已有的自我介绍', personal_tags: ['城市漫步'] } } }),
    getMeProfile: async () => ({ success: true, data: {} }),
    summarizeProfileCard: async () => ({ success: true, data: { task_id: 't1', draft_id: 'card-1' } }),
    waitForProfileCardTask: async () => ({ done: true, status: 'succeeded', error: '' }),
    getProfileCardDraft: async () => ({
      success: true,
      data: {
        draft_id: 'card-1', expected_revision: 1, source_revision_id: 88, base_profile_revision: 3, status: 'ready',
        fields: { self_intro: { value: 'AI 生成的自我介绍' }, interest_tag_candidates: { candidates: [] } },
      },
    }),
    applyProfileCardDraft: async (payload, key, context) => {
      sent.push({ payload: JSON.parse(JSON.stringify(payload)), key, context })
      return options.apply
        ? options.apply(sent.length)
        : { success: true, data: { status: 'applied', expected_revision: 2, written_fields: ['self_intro'], skipped_fields: [] } }
    },
    createProfileCardIdempotencyKey: p => p + '-k',
    isProfileCardVersionConflict: () => false,
    getPublicProfileCardExport: async () => ({ success: false }),
    getPortraitNarrative: async () => ({ success: true, data: {} }),
  }
  const opts = vm.runInNewContext(compile(pageCode) + '\n;page', ctx)
  const page = { ...opts.data(), subject: 'personal', narrative: { status: 'confirmed', revision_id: 19 }, continuousFlow: true, pageAlive: true, pageVisible: true }
  for (const [name, fn] of Object.entries(opts.methods)) page[name] = fn.bind(page)
  for (const [name, getter] of Object.entries(opts.computed)) Object.defineProperty(page, name, { get: getter.bind(page) })
  return { page, sent }
}

async function main() {
  // 1. 默认不替换：开关关着时必须如实传 false（保护已有公开资料，不得默默改成 true）。
  {
    const { page, sent } = buildPage()
    await page.onPrepareProfileCard()
    assert.ok(page.profileCardRows.length > 0, '必须至少有一行可采用')
    assert.equal(page.replaceExistingSelfIntro, false, '默认必须是不替换')
    await page.applyProfileCard()
    assert.equal(sent.length, 1)
    assert.equal(sent[0].payload.replace_existing.self_intro, false, '默认必须传 false')
    assert.equal(sent[0].payload.accepted.self_intro, 'AI 生成的自我介绍')
  }

  // 2. 用户明确勾选替换：必须传 true，否则后端跳过 self_intro，海报永久不可用。
  {
    const { page, sent } = buildPage()
    await page.onPrepareProfileCard()
    page.toggleReplaceExistingSelfIntro()
    assert.equal(page.replaceExistingSelfIntro, true, '点击后开关必须翻转')
    await page.applyProfileCard()
    assert.equal(sent[0].payload.replace_existing.self_intro, true, '勾选后必须传 true')
  }

  // 3. 零字段采用（后端 written 为空）必须明示无法生成海报，不能只说"已跳过"。
  {
    const { page } = buildPage({
      apply: () => ({ success: true, data: { status: 'applied', expected_revision: 2, written_fields: [], skipped_fields: ['self_intro'] } }),
    })
    await page.onPrepareProfileCard()
    await page.applyProfileCard()
    // 页面必须已经把「无法生成海报」写进可见提示（toast 文案来源）。
    const pageSrc = read(PAGE)
    assert.ok(/written\.length == 0[\s\S]{0,600}无法生成海报/.test(pageSrc), '零字段采用必须提示无法生成海报')
  }

  // 4. 事前提示：已有自我介绍且选择保留时，必须在采用之前就说明拿不到海报，
  //    而不是等用户采用成功、去点生成海报时才失败。
  {
    const { page } = buildPage()
    await page.onPrepareProfileCard()
    assert.equal(page.profileCardHasExistingSelfIntro, true, '必须识别到用户已有自我介绍')
    assert.equal(page.profileCardSelfIntroKept, true, '已有介绍 + 保留 → 应提示拿不到海报')
    page.toggleReplaceExistingSelfIntro()
    assert.equal(page.profileCardSelfIntroKept, false, '改为替换后不再提示')
    page.toggleReplaceExistingSelfIntro()
    // 没有已有介绍的用户不该看到这个提示（避免噪音）。
    const noIntro = buildPage()
    noIntro.page.profileCardHasExistingSelfIntro = false
    noIntro.page.profileCardRows = [{ key: 'self_intro', selected: true }]
    noIntro.page.replaceExistingSelfIntro = false
    assert.equal(noIntro.page.profileCardSelfIntroKept, false, '无已有介绍时不得提示')
  }

  console.log('PASS profile card adopt: 4 场景（默认不替换/勾选替换如实传出/零字段可解释/事前提示）')
}

module.exports = { main, buildPage }
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1 })
