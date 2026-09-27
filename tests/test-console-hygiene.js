const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

// console 卫生守卫（对应后端 tests/test_mojibake_guard.py 的前端对应物）。
//
// 背景：request 层曾对每个请求打印 URL/请求体，页面打印用户资料 payload，
// WS 打印生命周期日志；这些在提审包里无法关闭且构成信息泄露面。现统一收口到
// `utils/debug-log.uts`（默认 XSA_DEBUG=false 的 debugLog）。`console.error` /
// `console.warn` 仍允许直接使用（错误与告警需要可见性）。
//
// 显式 allowlist（不得静默豁免）：下方条目须写明文件与理由。
const root = path.resolve(__dirname, '..')
const SCAN_DIRS = ['api', 'pagesSub', 'pages', 'components', 'utils']
const EXTENSIONS = ['.uts', '.uvue']
const FORBIDDEN = /console\.(log|info|debug)\s*\(/

// 统一开关实现本体与文档示例不在范围内。
const ALLOWLIST = new Map([
  ['utils/debug-log.uts', '调试开关实现本体（唯一的 console.log 出口）'],
  ['components/README.md', '组件文档示例代码，非运行时源码']
])

function collect(dir, collected = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collect(full, collected)
      continue
    }
    const ext = path.extname(entry.name)
    if (EXTENSIONS.includes(ext) || entry.name.endsWith('.md')) collected.push(full)
  }
  return collected
}

const violations = []
for (const dir of SCAN_DIRS) {
  const base = path.join(root, dir)
  if (!fs.existsSync(base)) continue
  for (const file of collect(base)) {
    const relative = path.relative(root, file).split(path.sep).join('/')
    if (ALLOWLIST.has(relative)) continue
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      if (FORBIDDEN.test(line)) {
        violations.push(`${relative}:${index + 1}: ${line.trim()}`)
      }
    })
  }
}

assert.deepEqual(
  violations,
  [],
  'production sources must not call console.log/info/debug directly; use debugLog from utils/debug-log.uts:\n' +
    violations.join('\n')
)

// allowlist 腐化自检：条目必须仍然存在
for (const relative of ALLOWLIST.keys()) {
  assert.ok(
    fs.existsSync(path.join(root, relative)),
    `allowlist entry no longer exists: ${relative}`
  )
}

// 开关默认关闭（提审包不得输出调试信息）
const debugSource = fs.readFileSync(path.join(root, 'utils/debug-log.uts'), 'utf8')
assert.match(debugSource, /export const XSA_DEBUG = false/, 'XSA_DEBUG must default to false')

console.log('PASS console hygiene guard')
