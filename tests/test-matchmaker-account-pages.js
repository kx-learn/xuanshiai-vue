const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parse, compileTemplate } = require('@vue/compiler-sfc')

const { hasRegisteredPage } = require('./page-route-helper.cjs')

// 三个页面此前零测试引用（rg 'my-account|my-date' tests/ 无命中），本文件补齐：
//   - 分包路由注册断言（pages.json，只读——AGENTS §5 受保护文件）
//   - SFC 模板/脚本可解析（@vue/compiler-sfc，范式同 tests/test-personal-tags.js）
//   - 关键 API 接线的源级断言
//
// 验证缺口（如实标注，不虚报）：色调继承（DESIGN.md/uni.scss 与上级页面关系）
// 与小程序真机表现按 AGENTS §4/§6.5 需 HBuilderX 编译 + 微信开发者工具回归，
// 本环境不可用；本文件只覆盖静态可验证的注册/解析/接线契约。
const root = path.resolve(__dirname, '..')

const PAGES = [
  { route: 'pagesSub/matchmaker/my-account', file: 'pagesSub/matchmaker/my-account.uvue', title: '我的账号' },
  { route: 'pagesSub/profileExtra/my-date', file: 'pagesSub/profileExtra/my-date.uvue', title: '我的约会' },
  { route: 'pagesSub/profileExtra/my-date-service', file: 'pagesSub/profileExtra/my-date-service.uvue', title: '我的约会' }
]

function readPage(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function scriptBlock(source) {
  const match = source.match(/<script setup lang="uts">([\s\S]*?)<\/script>/)
  assert.ok(match, 'page must expose a <script setup lang="uts"> block')
  return match[1]
}

for (const page of PAGES) {
  // 1) 分包路由注册
  assert.ok(
    hasRegisteredPage(root, page.route),
    `${page.route} must be registered in pages.json (subPackages)`
  )

  const source = readPage(page.file)
  const { descriptor, errors } = parse(source, { filename: page.file })
  assert.deepEqual(errors, [], `${page.file} must parse without SFC errors`)

  // 2) 模板可编译（收集编译错误，允许未解析的组件引用等非致命警告）
  const templateResult = compileTemplate({
    source: descriptor.template.content,
    filename: page.file,
    id: page.route
  })
  assert.deepEqual(
    templateResult.errors,
    [],
    `${page.file} template must compile without errors`
  )

  // 3) 脚本块存在且非空
  const script = scriptBlock(source)
  assert.ok(script.trim().length > 0, `${page.file} script block must not be empty`)

  // 4) 页面标题与 pages.json 声明一致
  const config = JSON.parse(readPage('pages.json'))
  for (const subpackage of config.subPackages || []) {
    const entry = (subpackage.pages || []).find(
      (item) => `${subpackage.root}/${item.path}` === page.route
    )
    if (entry) {
      assert.equal(
        entry.style?.navigationBarTitleText,
        page.title,
        `${page.route} navigation title must stay ${page.title}`
      )
    }
  }
}

// 5) 关键 API 接线（源级断言）
const accountSource = readPage('pagesSub/matchmaker/my-account.uvue')
assert.match(accountSource, /import \{ getProfileOverview \} from '@\/api'/, 'my-account must load the account profile through the api barrel')
assert.match(accountSource, /await getProfileOverview\(\)/, 'my-account must call getProfileOverview on load')
assert.match(accountSource, /resolveMediaUrl\(/, 'my-account avatars must go through resolveMediaUrl')
assert.match(accountSource, /from '@\/api\/config\.uts'/, 'resolveMediaUrl must come from api/config.uts')

const dateSource = readPage('pagesSub/profileExtra/my-date.uvue')
assert.match(dateSource, /const goBack|navigateBack/, 'my-date must provide a back action')
assert.doesNotMatch(dateSource, /getChatFeatureUnlocks|unlockUserProfile|getUserProfileUnlockStatus/, 'my-date must not reference removed dead APIs')

const serviceSource = readPage('pagesSub/profileExtra/my-date-service.uvue')
assert.match(serviceSource, /uni\.navigateBack\(\)/, 'my-date-service must provide a back action')
assert.doesNotMatch(serviceSource, /getChatFeatureUnlocks|unlockUserProfile|getUserProfileUnlockStatus/, 'my-date-service must not reference removed dead APIs')

console.log('PASS matchmaker account pages contract')
