const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

console.log('Parent route boundary checks')

const detail = read('pagesSub/userExtra/user/detail.uvue')
const parentApi = read('api/parent.uts')

assert.ok(detail.includes('const redirectParentRoute = (): boolean =>'), 'ordinary detail defines a parent-route guard')
assert.ok(detail.includes("uni.reLaunch({ url: '/pages/parent/parent' })"), 'ordinary detail redirects a parent role to the parent shell')
assert.ok(detail.includes('onMounted(async () => {\n\tif (redirectParentRoute()) return'), 'ordinary detail checks the role before initial data loading')
assert.ok(detail.includes('onShow(async () => {\n\tif (redirectParentRoute()) return'), 'ordinary detail checks the role before refresh')
assert.ok(parentApi.includes('function toParentCandidate(raw: any)'), 'candidate privacy adapter exists')
assert.ok(parentApi.includes('toParentCandidate(source[i])'), 'candidate list applies the privacy adapter')
assert.ok(parentApi.includes('function toParentMatchmakerList(source: any[])'), 'matchmaker list adapter exists')
assert.ok(!parentApi.includes('return okResponse(getMockParentCandidatesData())'), 'Mock candidate responses cannot skip privacy shaping')
assert.ok(!parentApi.includes('return okResponse(getMockParentLikedCandidatesData())'), 'Mock like responses cannot skip privacy shaping')

console.log('Parent route boundary checks passed')
