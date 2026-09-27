const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const testDir = __dirname
// 无运行中外部服务依赖；真实契约测试需相邻后端源码或 XSA_BACKEND_ROOT，--all 执行全部测试。
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
  'test-matchmaker-account-pages.js'
]

function discover() {
  return fs.readdirSync(testDir).filter((name) => /^test-.*\.js$/.test(name)).sort()
}

// SKIP 协议：测试文件以 exit 0 结束且 stdout 含以 "SKIP" 开头的行时计为
// skipped（不计 passed 也不计 failed）。SKIP 行必须携带原因（如编译产物
// 缺失 → HBuilderX 重编译指引）；产物恢复后测试自然回到 PASS，无永久豁免。
function run(files, execute = (file) => spawnSync(process.execPath, [path.join(testDir, file)], {
  cwd: path.dirname(testDir), encoding: 'utf8'
})) {
  let failed = 0
  let skipped = 0
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
      skipped++
      console.log(`SKIP ${file}`)
      if (skipLine.trim().length > 'SKIP'.length) {
        console.log(`  ${skipLine.trim()}`)
      }
      continue
    }
    if (result.status === 0 && !result.error) {
      console.log(`PASS ${file}`)
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
  return failed === 0 ? 0 : 1
}

if (require.main === module) {
  const mode = process.argv[2]
  if (mode && mode !== '--all') {
    console.error('Usage: node tests/run-tests.cjs [--all]')
    process.exitCode = 2
  } else {
    process.exitCode = run(mode === '--all' ? discover() : core)
  }
}

module.exports = { core, discover, run }
