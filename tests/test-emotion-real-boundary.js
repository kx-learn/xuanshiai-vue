const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const babel = require('@babel/core')

const root = path.resolve(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'api/emotionLab.uts'), 'utf8')
const page = fs.readFileSync(path.join(root, 'pages/emotion-lab/emotion-lab.uvue'), 'utf8')
const calls = []
const code = babel.transformSync(source, {
  filename: 'emotionLab.ts', babelrc: false, configFile: false,
  plugins: [require('@babel/plugin-transform-typescript'), require('@babel/plugin-transform-modules-commonjs')],
}).code
const moduleObject = { exports: {} }
vm.runInNewContext('(function(require, module, exports) {' + code + '\n})', {})((name) => {
  if (name === './request.uts') return { request: async options => {
    calls.push(options.url)
    return { success: true, data: {} }
  } }
  if (name === './config.uts') return { USE_MOCK: false }
  if (name === '@/mock/emotionLab.uts') return { configureEmotionLabMockRuntime: () => {} }
  if (name === '@/mock/user.uts') return {}
  throw new Error('Unexpected dependency: ' + name)
}, moduleObject, moduleObject.exports)

async function main() {
  const api = moduleObject.exports
  await api.getEmotionLabSummary()
  assert.deepEqual(calls, ['/emotion-lab/summary'], 'MBTI must use the real backend')
  const matches = await api.getEmotionLabMatches('INFJ')
  assert.equal(matches.success, false, 'unimplemented recommendations must not report success')
  assert.equal(matches.code, 'EMOTION_MATCHES_UNAVAILABLE')
  assert.equal(matches.data, null, 'unavailable is not an empty successful result')
  assert.deepEqual(calls, ['/emotion-lab/summary'], 'do not call the nonexistent matches endpoint')
  assert.match(page, /v-else-if="matchesError != ''"/, 'show the unavailable/error state')
  assert.match(page, /if \(await loadMatches\(\)\)/, 'refresh success must depend on a successful result')
  console.log('PASS emotion real backend / unavailable recommendation boundary')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
