const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const testDir = __dirname
// 源码组不依赖编译产物，任何环境都必须跑；artifact 组要求 mp-weixin 实物，
// 只在取得真实产物的环境执行（AGENTS §6.1：产物由 HBuilderX 生成）。
// 跨仓契约测试统一通过 tests/helpers/cross-repo.cjs 解析后端路径。
const core = [
  'test-ai-avatar-request.js',
  'test-ai-search-proxy-contract.js',
  'test-community-api-compile-guard.js',
  'test-fastapi-request-contract.js',
  'test-http-request-transport.js',
  'test-login-debug-guard.js',
  'test-message-api-security.js',
  'test-message-flow.js',
  'test-message-ui-security.js',
  'test-parent-chat-subject.js',
  'test-parent-route-boundary.js',
  'test-wechat-project-config.js',
  'test-message-real-contract.js',
  'test-matchmaker-account-pages.js',
  'test-master-ws-error-contract.js',
  'test-moxiang-ws-ticket-contract.js',
  'test-ai-profile-page.js',
  'test-console-hygiene.js',
  'test-role-copy-consistency.js',
  'test-profile-card-tag-consistency.js',
  'test-portrait-resync-contract.js',
  'test-moxiang-tts-round-immutability.js',
  'test-moxiang-continuous.js',
  'test-moxiang-continuous-result.js',
  'test-moxiang-continuous-archive.js',
  'test-moxiang-continuous-profile.js',
  'test-moxiang-poster-public-source.js',
  'test-profile-card-adopt-replace.js',
  'test-moxiang-build-confirmation.js',
  'test-search-retry-idempotency.js',
  'test-home-recommend-display.js',
  'test-public-candidate-card.js',
  // 本轮遗漏的源码级契约：首页状态诚实性、匹配固定话术、文档一致性、兴趣标签。
  'test-home-profile-state-honesty.js',
  'test-home-no-profile-completion-banner.js',
  'test-match-interpretation-fixed-copy.js',
  'test-moxiang-doc-consistency.js',
  'test-moxiang-role-identity.js',
  'test-personal-tags.js',
  'test-moxiang-continuous-crosspage.js',
  'test-ci-gates.js',
]

// artifact 模式禁止 SKIP；源码组仍允许有理由的跳过，二者不能混作发布通过。
const artifact = [
  'test-mp-subpackage-assets.js',
  'test-wechat-project-config.js',
]

function discover() {
  return fs.readdirSync(testDir).filter((name) => /^test-.*\.js$/.test(name)).sort()
}

// SKIP 协议：测试文件以 exit 0 结束且 stdout 含以 "SKIP" 开头的行时计为
// skipped（不计 passed 也不计 failed）。SKIP 行必须携带原因（如编译产物
// 缺失 → HBuilderX 重编译指引）；产物恢复后测试自然回到 PASS，无永久豁免。
function run(files, execute = (file) => spawnSync(process.execPath, [path.join(testDir, file)], {
  cwd: path.dirname(testDir), encoding: 'utf8'
}), { allowSkip = true } = {}) {
  let failed = 0
  let skipped = 0
  const warnings = []
  for (const file of files) {
    if (!fs.existsSync(path.join(testDir, file))) {
      console.error(`FAIL ${file}: test file missing`)
      failed++
      continue
    }
    const result = execute(file)
    const output = result.stdout ?? ''
    // 收紧匹配：必须为「SKIP <本文件名>」形式，避免通过用例的诊断行
    // （恰好以 SKIP 开头）被静默计为 skipped。
    const skipLine = output
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith(`SKIP ${file}`))
    if (result.status === 0 && !result.error && skipLine) {
      if (allowSkip) {
        skipped++
        console.log(`SKIP ${file}`)
      } else {
        failed++
        console.error(`FAIL ${file}: artifact 模式不允许 SKIP`)
      }
      console.log(`  ${skipLine.trim()}`)
      continue
    }
    if (result.status === 0 && !result.error) {
      console.log(`PASS ${file}`)
      // 通过用例的诊断行同样要保留：受保护文件的导航栏旧称、后端源码不可达等
      // 只能在 WARN 里暴露。退出码 0 不该让这些待确认项从摘要里消失。
      for (const line of output.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (trimmed.startsWith('WARN')) {
          console.log(`  ${trimmed}`)
          warnings.push(`${file}: ${trimmed}`)
        }
      }
    } else {
      failed++
      console.error(`FAIL ${file} (exit ${result.status ?? 'spawn error'})`)
      if (result.stdout) console.error(result.stdout)
      if (result.stderr) console.error(result.stderr)
      if (result.error) console.error(result.error)
    }
  }
  console.log(
    `${files.length - failed - skipped}/${files.length} passed, ${skipped} skipped, ${failed} failed`
  )
  if (warnings.length > 0) {
    console.log(`WARN 汇总（${warnings.length} 条，需人工确认，不计失败）：`)
    for (const warning of warnings) console.log(`  ${warning}`)
  }
  return failed === 0 ? 0 : 1
}

if (require.main === module) {
  const mode = process.argv[2]
  if (mode && mode !== '--all' && mode !== '--artifact') {
    console.error('Usage: node tests/run-tests.cjs [--all|--artifact]')
    process.exitCode = 2
  } else {
    const files = mode === '--all' ? discover() : mode === '--artifact' ? artifact : core
    process.exitCode = run(files, undefined, { allowSkip: mode !== '--artifact' })
  }
}

module.exports = { core, artifact, discover, run, frontendRoot: path.resolve(__dirname, '..') }
