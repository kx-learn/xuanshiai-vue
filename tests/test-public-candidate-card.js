const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const babel = require('@babel/core')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const discovery = read('api/discovery.uts')
const search = read('api/ai-search.uts')
const compile = (source) => babel.transformSync(source, {
  filename: 'candidate.ts', configFile: false, babelrc: false,
  plugins: ['@babel/plugin-transform-typescript'],
}).code
const mapSource = discovery.slice(discovery.indexOf('function mapCard'), discovery.indexOf('function mapPage'))
const mapCard = vm.runInNewContext(compile(mapSource) + ';mapCard', {
  resolveMediaUrl: (url) => String(url).startsWith('https://') ? url : 'https://cdn.test/' + url,
})
const resultSource = search.slice(search.indexOf('export function searchResultItems'), search.indexOf('export function searchNextCursor'))
const searchResultItems = vm.runInNewContext(compile(resultSource.replace('export function', 'function')) + ';searchResultItems', { mapCard })
const plain = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value))

const publicCard = {
  user_id: 42, nickname: '小宣', age: 28, education_level: 3, occupation: '设计师',
  city_code: '330100', avatar: '/public.webp', personal_tags: [], tags: ['旧标签'],
  distance_km: null, detail_locked: true,
}
const home = mapCard(publicCard)
const results = searchResultItems({ data: {
  items: [{ user_id: 42, card: publicCard, profile: { private_portrait: '不可读' },
    matched_conditions: ['所在城市'], unknown_conditions: ['收入'], reason_codes: ['city'], is_fuzzy: true }],
  degraded: true,
} })
const result = results[0]
for (const key of ['name', 'nickname', 'education', 'educationLevel', 'job', 'occupation', 'city', 'cityCode', 'distance', 'detailLocked', 'interestTags', 'avatar']) {
  assert.deepEqual(plain(result.profile[key]), plain(home[key]), `首页与搜索公开字段 ${key} 必须一致`)
}
assert.equal(result.profile.name, '小宣')
assert.equal(result.profile.education, '3', '公开学历编码保持现有边界，不套用画像六维词典')
assert.equal(result.profile.job, '设计师')
assert.equal(result.profile.city, '330100')
assert.equal(result.profile.detailLocked, true)
assert.deepEqual(plain(result.profile.interestTags), [], '显式空 personal_tags 不能回填旧 tags')
assert.equal(result.profile.distance, null, '未公开距离不能伪造为零')
assert.equal(mapCard({ ...publicCard, distance_km: 0 }).distance, 0, '已公开的 0km 是有效值')
assert.equal(mapCard({ ...publicCard, detail_locked: false }).detailLocked, false)
assert.equal(result.profile.private_portrait, undefined, '只适配公开 card，不读取详情或私密画像')
assert.equal(result.profile.ideal_partner, undefined)
assert.equal(result.id, 42)
assert.deepEqual(plain(result.matchedConditions), ['所在城市'])
assert.deepEqual(plain(result.unknownConditions), ['收入'])
assert.deepEqual(plain(result.reasonCodes), ['city'])
assert.equal(result.isFuzzy, true)
assert.equal(result.degraded, true)
assert.strictEqual(result.card, publicCard, '原公开卡片保留，详情仍从原接口按可见性读取')

const withoutCardId = searchResultItems({ items: [{ user_id: 43, card: { nickname: '小爱' } }] })[0]
assert.equal(withoutCardId.profile.id, 43, '搜索导航主体必须来自结果 user_id')
const missing = searchResultItems({ items: [{ user_id: 44 }] })[0]
assert.equal(missing.profile.name, '认真生活的人', '保留搜索未知姓名的文案')
assert.equal(missing.profile.distance, null)
assert.equal(missing.profile.detailLocked, false)
assert.deepEqual(plain(missing.profile.interestTags), [])
assert.deepEqual(plain(searchResultItems(null)), [])
const mock = mapCard({ target: { id: 7, name: '演示名', education: '本科', job: '教师', city: '杭州', interest_tags: ['骑行'] } })
assert.equal(mock.id, 7)
assert.equal(mock.name, '演示名')
assert.equal(mock.education, '本科')
assert.equal(mock.job, '教师')
assert.equal(mock.city, '杭州')
assert.deepEqual(plain(mock.interestTags), ['骑行'])

assert.match(search, /import \{ mapCard \} from '\.\/discovery\.uts'/, '复用现有公开候选边界')
assert.doesNotMatch(read('pagesSub/profileExtra/search.uvue'), /profile\.edu\b|profile\.location\b/, '页面不重复猜公开字段别名')
console.log('PASS public candidate card: 首页/AI 搜索、公开边界、锁定、空标签、距离和未知值')
