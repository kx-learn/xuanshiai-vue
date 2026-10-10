const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const names = ['PRODUCT.md', 'DESIGN.md']
const normalize = (text) => text.replace(/\r\n/g, '\n')
const digest = (text) => crypto.createHash('sha256').update(normalize(text), 'utf8').digest('hex')

function locations(options = {}) {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, '..')
  const configured = options.workspaceRoot ?? process.env.XSA_WORKSPACE_ROOT
  return {
    repoRoot,
    workspaceRoot: configured ? path.resolve(configured) : path.resolve(repoRoot, '..'),
    explicitWorkspace: options.explicitWorkspace ?? Boolean(configured),
    snapshotRoot: path.join(repoRoot, 'docs', 'authoritative'),
  }
}

// 快照只复制工作区权威全文，不读取仓内旧 PRODUCT.md 镜像；摘要统一 LF，兼容 Git autocrlf。
function sync(options = {}) {
  const { workspaceRoot, snapshotRoot } = locations(options)
  const docs = Object.fromEntries(names.map((name) => [name,
    normalize(fs.readFileSync(path.join(workspaceRoot, name), 'utf8'))]))
  fs.mkdirSync(snapshotRoot, { recursive: true })
  for (const name of names) fs.writeFileSync(path.join(snapshotRoot, name), docs[name])
  const manifest = {
    schema_version: 1,
    authority: 'workspace-root',
    normalization: 'UTF-8 LF',
    documents: names.map((name) => ({ name, source: `../${name}`, sha256: digest(docs[name]) })),
  }
  fs.writeFileSync(path.join(snapshotRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
}

function load(options = {}) {
  const { workspaceRoot, snapshotRoot, explicitWorkspace } = locations(options)
  const manifest = JSON.parse(fs.readFileSync(path.join(snapshotRoot, 'manifest.json'), 'utf8'))
  assert.equal(manifest.schema_version, 1)
  assert.equal(manifest.authority, 'workspace-root')
  assert.equal(manifest.normalization, 'UTF-8 LF')
  assert.deepEqual(manifest.documents.map((entry) => entry.name), names)
  const docs = {}
  for (const entry of manifest.documents) {
    assert.equal(entry.source, `../${entry.name}`, '快照来源必须为工作区根文档')
    assert.match(entry.sha256, /^[a-f0-9]{64}$/)
    docs[entry.name] = normalize(fs.readFileSync(path.join(snapshotRoot, entry.name), 'utf8'))
    assert.equal(digest(docs[entry.name]), entry.sha256, `${entry.name} 快照摘要不符，请从权威文档重新同步`)
  }
  const present = names.map((name) => fs.existsSync(path.join(workspaceRoot, name)))
  if (present.some(Boolean) || explicitWorkspace) {
    assert.ok(present.every(Boolean), `工作区 ${workspaceRoot} 需同时提供 PRODUCT.md 与 DESIGN.md`)
    for (const name of names) {
      const current = normalize(fs.readFileSync(path.join(workspaceRoot, name), 'utf8'))
      assert.equal(digest(current), digest(docs[name]), `${name} 权威文档已变化：运行 node scripts/authoritative-docs.cjs --sync`)
      docs[name] = current
    }
  }
  return { docs, source: present.every(Boolean) ? 'workspace-root' : 'versioned-snapshot', manifest }
}

if (require.main === module) {
  try {
    if (process.argv[2] === '--sync') sync()
    else assert.ok(process.argv[2] === '--check', 'Usage: node scripts/authoritative-docs.cjs --sync|--check')
    const result = load()
    console.log(`PASS authoritative docs (${result.source})`)
    for (const entry of result.manifest.documents) console.log(`${entry.source} sha256=${entry.sha256}`)
  } catch (error) {
    console.error(`FAIL authoritative docs: ${error.message}`)
    process.exitCode = 1
  }
}

module.exports = { load, sync, digest }
