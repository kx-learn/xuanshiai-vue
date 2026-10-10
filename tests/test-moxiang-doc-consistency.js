const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')

// 文档与实现的一致性守卫。
// 由来：海报主题从「东方美学三主题」(qianyan/yuebai/shendai) 重构为「东方山海四主题」
// (mood/profile/poem/relationship) 后，PRODUCT.md 与 DESIGN.md 长时间仍描述旧三主题，
// 且 DESIGN.md 登记的白名单元素「朱砂方印」在一次重写中被静默删除而无人察觉。
// 这类漂移只有静态比对能发现——视觉审查看不出来，单元测试也只覆盖运行时。
// 这里把三个关键事实钉死：主题集合、印章存在、禁止伪造数值的铁律可查。

const root = path.resolve(__dirname, '..')
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8')
// 本地优先核对工作区权威全文；干净检出读取随提交版本化、带来源及摘要的完整快照。
// 快照缺失、摘要不符或本地源文档漂移均失败，不能 SKIP 或改指向旧仓内镜像。
const { load } = require('../scripts/authoritative-docs.cjs')
const { docs, source } = load()
const product = docs['PRODUCT.md']
const design = docs['DESIGN.md']
console.log(`INFO authoritative docs source=${source}`)
const drawer = read('utils', 'moxiang-poster-drawer.uts')

/** 从 MOXIANG_POSTER_THEMES 中抽出 key 与 name（顺序即定义顺序）。 */
function themesInCode() {
  const block = drawer.slice(drawer.indexOf('MOXIANG_POSTER_THEMES'))
  const end = block.indexOf('\n]')
  const body = block.slice(0, end)
  const keys = [...body.matchAll(/key:\s*'([a-z_]+)'/g)].map(m => m[1])
  const names = [...body.matchAll(/name:\s*'([^']+)'/g)].map(m => m[1])
  return { keys, names }
}

test('the four poster themes in code are exactly the ones documented', () => {
  const { keys, names } = themesInCode()
  assert.deepEqual(keys, ['mood', 'profile', 'poem', 'relationship'], 'theme keys changed; update PRODUCT.md/DESIGN.md')
  assert.equal(names.length, keys.length, 'every theme needs a display name')

  for (const theme of keys) {
    assert.ok(product.includes('`' + theme + '`'), `PRODUCT.md must document theme \`${theme}\``)
    assert.ok(design.includes('`' + theme + '`'), `DESIGN.md must document theme \`${theme}\``)
  }
  for (const name of names) {
    assert.ok(product.includes(name), `PRODUCT.md must name the theme 「${name}」`)
  }

  // 旧三主题不得再作为「当前规范」出现在文档里：只允许以历史兼容键名的形式被提及。
  for (const legacy of ['qianyan', 'yuebai', 'shendai']) {
    for (const [doc, text] of [['PRODUCT.md', product], ['DESIGN.md', design]]) {
      for (const line of text.split('\n')) {
        if (!line.includes(legacy)) continue
        assert.ok(
          /历史|兼容|映射|legacy/.test(line),
          `${doc} mentions legacy key ${legacy} outside a compatibility note: ${line.trim()}`
        )
      }
    }
  }
})

test('legacy theme keys still resolve for stored data', () => {
  const { keys } = themesInCode()
  for (const legacy of ['qianyan', 'yuebai', 'shendai']) {
    assert.match(
      drawer,
      new RegExp("targetKey == '" + legacy + "'"),
      `getThemeByKey must keep mapping the legacy key ${legacy}`
    )
  }
  assert.equal(keys.length, 4, 'legacy keys must not be re-added as themes')
})

test('the documented cinnabar seal is actually implemented', () => {
  // DESIGN.md 与 PRODUCT.md 白名单都登记了朱砂方印；它曾被一次重写弄丢。
  assert.match(drawer, /function drawCinnabarSeal/, 'drawer must implement the cinnabar seal')
  assert.match(drawer, /sealBg: string/, 'theme must declare a seal background colour')
  for (const doc of [product, design]) {
    assert.ok(doc.includes('朱砂方印') || doc.includes('朱砂印章'), 'docs must keep the seal in the whitelist')
  }
  const { keys } = themesInCode()
  const sealFills = [...drawer.matchAll(/sealBg:\s*'(#[0-9A-Fa-f]{6})'/g)].map(m => m[1])
  assert.equal(sealFills.length, keys.length, 'every theme must define its own seal colour')
})

test('the no-fabricated-numbers rule is recorded in the product docs', () => {
  // 海报曾把写死的四维百分比画到画布上，用户会读作自己的画像结论。
  // 这条纪律要留在文档里，否则后续很容易为了「版面好看」把它加回来。
  assert.match(product, /禁止伪造数值铁律/, 'PRODUCT.md must keep the no-fabricated-numbers rule')
  assert.match(design, /禁止绘制后端无出处的数值/, 'DESIGN.md must state the same rule for the canvas')
})

test('no hardcoded percentage metrics live in the drawing engine', () => {
  assert.doesNotMatch(drawer, /pct/, 'drawer must not carry a pct metric field')
  assert.doesNotMatch(drawer, /['"][0-9]{1,3}%['"]/, 'drawer must not contain literal percentage strings')
})
