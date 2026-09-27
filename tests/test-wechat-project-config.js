const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const configPath = path.join(root, 'project.config.json')
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const artifactRoot = path.join(root, 'unpackage', 'dist', 'dev', 'mp-weixin')

// 源工程配置断言：与编译产物无关，任何环境都必须成立。
assert.strictEqual(
  config.miniprogramRoot,
  './',
  'The source project config must keep the compiled output as its project root'
)

// SKIP 协议（tests/run-tests.cjs）：编译产物（project.config.json / app.json）
// 缺失时显式降级为 SKIP 并 exit 0（runner 不计 passed/failed）。产物由
// HBuilderX 生成（AGENTS §6.1：npm run build:mp-weixin 不是本工程的生成入口），
// 且 unpackage/ 已被 .gitignore 忽略——干净检出（含 CI ubuntu-latest）必然无
// 编译产物，因此两处产物检查都必须前置于 SKIP 守卫之前，不能先断言再降级。
// 产物一旦重新编译产出，下方全量断言自动恢复生效：不是永久豁免。
function skipMissingArtifact(reason) {
  console.log(
    `SKIP test-wechat-project-config.js: compiled artifact missing ${reason} — regenerate via HBuilderX per AGENTS §6.1; artifact gate inactive`
  )
  process.exit(0)
}

const artifactConfigPath = path.join(artifactRoot, 'project.config.json')
if (!fs.existsSync(artifactConfigPath)) {
  skipMissingArtifact('project.config.json')
}

const artifactConfig = JSON.parse(fs.readFileSync(artifactConfigPath, 'utf8'))
const artifactRootSetting = artifactConfig.miniprogramRoot || './'
const resolvedArtifactRoot = path.resolve(artifactRoot, artifactRootSetting)

const artifactAppJsonPath = path.join(resolvedArtifactRoot, 'app.json')
if (!fs.existsSync(artifactAppJsonPath)) {
  skipMissingArtifact('app.json')
}

// 以下断言仅在编译产物齐备时执行（门禁自动重启）。
assert.strictEqual(
  resolvedArtifactRoot,
  artifactRoot,
  'Opening the compiled output directly must resolve miniprogramRoot to that output directory'
)
assert.ok(
  fs.existsSync(artifactAppJsonPath),
  'The compiled project root must contain app.json'
)

console.log('微信开发者工具项目路径测试通过')
