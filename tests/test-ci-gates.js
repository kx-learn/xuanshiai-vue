const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')
const { run, artifact } = require('./run-tests.cjs')
const { load, sync } = require('../scripts/authoritative-docs.cjs')

function fixture(t) {
  const root = fs.mkdtempSync(path.join(process.env.PI_SCRATCH_DIR || os.tmpdir(), 'xsa-docs-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const repoRoot = path.join(root, 'frontend')
  fs.mkdirSync(repoRoot)
  fs.writeFileSync(path.join(root, 'PRODUCT.md'), '# 权威产品\r\ncontinuous_v2\r\n')
  fs.writeFileSync(path.join(root, 'DESIGN.md'), '# 权威设计\n')
  const options = { repoRoot, workspaceRoot: root }
  sync(options)
  return options
}

test('artifact SKIP is failure, source SKIP remains explicit', () => {
  const skipped = (file) => ({ status: 0, stdout: `SKIP ${file}: HBuilderX artifact missing\n` })
  assert.equal(run(artifact, skipped, { allowSkip: false }), 1)
  assert.equal(run(artifact, skipped), 0)
  assert.equal(run(artifact, () => ({ status: 0, stdout: 'PASS artifact\n' }), { allowSkip: false }), 0)
  assert.equal(run(artifact, () => ({ status: 1, stderr: 'quality failure' }), { allowSkip: false }), 1)
})

test('clean checkout loads complete verified snapshots, not the old repository mirror', (t) => {
  const options = fixture(t)
  fs.writeFileSync(path.join(options.repoRoot, 'PRODUCT.md'), '旧镜像不能作为权威')
  assert.equal(load(options).source, 'workspace-root')
  fs.rmSync(path.join(options.workspaceRoot, 'PRODUCT.md'))
  fs.rmSync(path.join(options.workspaceRoot, 'DESIGN.md'))
  const result = load({ ...options, explicitWorkspace: false })
  assert.equal(result.source, 'versioned-snapshot')
  assert.match(result.docs['PRODUCT.md'], /continuous_v2/)
  assert.throws(() => load(options), /需同时提供/)
})

test('source drift, partial source, damaged snapshot and missing manifest all fail', (t) => {
  const options = fixture(t)
  fs.appendFileSync(path.join(options.workspaceRoot, 'PRODUCT.md'), '变更')
  assert.throws(() => load(options), /权威文档已变化/)
  sync(options)
  fs.rmSync(path.join(options.workspaceRoot, 'DESIGN.md'))
  assert.throws(() => load({ ...options, explicitWorkspace: false }), /需同时提供/)
  fs.appendFileSync(path.join(options.repoRoot, 'docs/authoritative/PRODUCT.md'), '篡改')
  assert.throws(() => load(options), /快照摘要不符/)
  fs.rmSync(path.join(options.repoRoot, 'docs/authoritative/manifest.json'))
  assert.throws(() => load(options), /ENOENT/)
})
