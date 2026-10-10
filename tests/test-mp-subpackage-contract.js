const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const readJson = (file) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  return JSON.parse(source.replace(/\/\*[\s\S]*?\*\//g, ''))
}

const manifest = readJson('manifest.json')
const pages = readJson('pages.json')
const mainPages = pages.pages.map((page) => page.path)
const subpackagePages = new Map(
  (pages.subPackages || []).map((subpackage) => [
    subpackage.root,
    subpackage.pages.map((page) => page.path)
  ])
)

assert.equal(
  manifest['mp-weixin'].lazyCodeLoading,
  'requiredComponents',
  'WeChat build must enable requiredComponents lazy loading'
)

assert.deepEqual(mainPages, [
  'pages/index/index',
  'pages/community/community',
  'pages/matchmaker/matchmaker',
  'pages/message/message',
  'pages/profile/profile',
  'pages/auth/login',
  'pages/auth/register',
  'pages/parent/parent',
  'pages/parent/user-detail',
  'pages/emotion-lab/emotion-lab'
])

const expectedSubpackages = {
  'pagesSub/live': ['lobby', 'detail', 'backstage', 'room', 'results', 'manage'],
  'pagesSub/community': [
    'publish',
    'topic-list',
    'topic-detail',
    'post-detail',
    'activity-list',
    'activity-detail',
    'my-activities',
    'paper-plane',
    'dating-plane',
    'dating-plane-compose',
    'paper-plane-messages',
    'paper-plane-chat',
    'paper-plane-sent',
    'notifications'
  ],
  'pagesSub/matchmaker': [
    'apply',
    'detail',
    'payment',
    'become-matchmaker',
    'become-partner',
    'partner-center',
    'become-promoter',
    'promoter-center',
    'application-success',
    'custom',
    'my-account'
  ],
  'pagesSub/profileExtra': [
    'settings',
    'help',
    'security',
    'certification',
    'vip',
    'my-moments',
    'my-tasks',
    'my-registration',
    'my-date',
    'my-date-service',
    'my-posters',
    'my-poster-preview',
    'history',
    'visitors',
    'search',
    'report',
    'applications',
    'favorites',
    'spotlights',
    'support',
    'my-ai-avatar',
    'my-portrait-master',
    'my-portrait-result',
    'my-portrait-archive'
  ],
  'pagesSub/chat': ['detail'],
  'pagesSub/about': ['about', 'article'],
  'pagesSub/userExtra': [
    'onboarding/profile',
    'user/detail',
    'user/edit',
    'user/preference',
    'mytags/edit',
    'index/top-placement'
  ]
}

assert.deepEqual([...subpackagePages.keys()], Object.keys(expectedSubpackages), 'subpackage roots changed')
assert.equal(pages.subPackages.length, subpackagePages.size, 'subpackage roots must not be duplicated')
for (const [rootPath, expectedPages] of Object.entries(expectedSubpackages)) {
  assert.deepEqual(subpackagePages.get(rootPath), expectedPages, `${rootPath} route set changed`)
}

console.log('PASS mp-weixin subpackage contract')
