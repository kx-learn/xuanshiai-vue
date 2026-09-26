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
  'test-message-real-contract.js'
]

function discover() {
  return fs.readdirSync(testDir).filter((name) => /^test-.*\.js$/.test(name)).sort()
}

function run(files, execute = (file) => spawnSync(process.execPath, [path.join(testDir, file)], {
  cwd: path.dirname(testDir), encoding: 'utf8'
})) {
  let failed = 0
  for (const file of files) {
    if (!fs.existsSync(path.join(testDir, file))) {
      console.error(`FAIL ${file}: test file missing`)
      failed++
      continue
    }
    const result = execute(file)
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
  console.log(`${files.length - failed}/${files.length} passed`)
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
