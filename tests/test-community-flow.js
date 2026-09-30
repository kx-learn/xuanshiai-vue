/**
 * 社区闭环 Mock / 路由 / 实名门槛 静态校验
 * 不启动小程序，仅校验源码与 Mock 约定
 * 主 Tab：关注 / 同城 / 发现；关注页喜欢=用户级喜欢动态
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')
const { hasRegisteredPage } = require('./page-route-helper.cjs')

const root = path.join(__dirname, '..')
let failed = 0

function ok(msg) {
  console.log(`   ✅ ${msg}`)
}

function fail(msg) {
  failed += 1
  console.log(`   ❌ ${msg}`)
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf-8')
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel))
}

console.log('====================================')
console.log('社区闭环流程测试')
console.log('====================================\n')

// 0. 真实后端模式下，调试登录必须换取后端签发的有效 Token。
console.log('0. 本地开发登录...')
const loginPage = read('pages/auth/login.uvue')
if (loginPage.includes('loginByExistingAccount') && !loginPage.includes('debug_access_token_xsa')) {
  ok('调试登录使用后端签发的有效 Token')
} else {
  fail('调试登录仍写入后端无法识别的固定 Token')
}

// 1. 页面与路由
console.log('1. 社区页面与 pages.json 路由...')
const communityPages = [
  'pages/community/community.uvue',
  'pagesSub/community/publish.uvue',
  'pagesSub/community/topic-list.uvue',
  'pagesSub/community/topic-detail.uvue',
  'pagesSub/community/post-detail.uvue',
  'pagesSub/community/activity-list.uvue',
  'pagesSub/community/activity-detail.uvue',
  'pagesSub/community/my-activities.uvue',
  'pagesSub/community/paper-plane.uvue',
  'pagesSub/community/notifications.uvue'
]
communityPages.forEach((p) => {
  if (exists(p)) ok(p)
  else fail(`${p} 缺失`)
})

const pagesJson = read('pages.json')
const routePaths = [
  'pagesSub/community/topic-list',
  'pagesSub/community/topic-detail',
  'pagesSub/community/post-detail',
  'pagesSub/community/activity-list',
  'pagesSub/community/activity-detail',
  'pagesSub/community/my-activities',
  'pagesSub/community/paper-plane',
  'pagesSub/community/notifications'
]
routePaths.forEach((r) => {
  if (hasRegisteredPage(root, r)) ok(`pages.json 已注册 ${r}`)
  else fail(`pages.json 缺少 ${r}`)
})

if (pagesJson.includes('pages/community/community') && pagesJson.includes('"text": "社区"')) {
  ok('社区 Tab 仍存在')
} else {
  fail('社区 Tab 配置异常')
}

// 2. Mock 扩展
console.log('\n2. Mock 数据扩展...')
const mockCommunity = read('mock/community.uts')
const mockExports = [
  'mockDynamicList',
  'mockTopics',
  'mockPaperPlanes',
  'mockActivities',
  'mockCommunityBanners',
  'mockCommunityNotifications',
  'mockCommunityQuotas',
  'mockReportReasons',
  'mockBlockedUserIds',
  'mockApplyStates',
  'mockLikedUserIds',
  'mockCurrentCity'
]
mockExports.forEach((name) => {
  if (mockCommunity.includes(`export const ${name}`)) ok(name)
  else fail(`缺少 ${name}`)
})

if (mockCommunity.includes("type: 'topic'") && mockCommunity.includes("type: 'activity'") && mockCommunity.includes("type: 'plane'")) {
  ok('发现页三入口 banner 类型齐全')
} else {
  fail('banner 缺少 topic/activity/plane')
}

const mockIndex = read('mock/index.uts')
;[
	  'mockCommunityNotifications',
	  'mockCommunityQuotas',
	  'mockReportReasons',
	  'mockBlockedUserIds',
	  'mockApplyStates',
	  'mockLikedUserIds',
	  'mockCurrentCity'
	].forEach((n) => {
	  if (mockIndex.includes(n)) ok(`mock/index 导出 ${n}`)
	  else fail(`mock/index 未导出 ${n}`)
	})
	
	// 2.1 动态卡 / 通知分栏样本字段
	console.log('\n2.1 动态卡字段 / 通知 type 样本...')
	if (
	  mockCommunity.includes('gender:') &&
	  mockCommunity.includes('birthYear:') &&
	  mockCommunity.includes('ipLocation:') &&
	  mockCommunity.includes('income:')
	) {
	  ok('mock 动态用户含 gender/birthYear/ipLocation/income')
	} else {
	  fail('mock 动态用户缺少性别/出生年/IP/年薪字段')
	}
	if (
	  mockCommunity.includes('relationTags') &&
	  mockCommunity.includes('topicTitle')
	) {
	  ok('mock 动态含 relationTags / topicTitle')
	} else {
	  fail('mock 动态缺少 relationTags 或 topicTitle')
	}
	if (
	  mockCommunity.includes("type: 'like'") &&
	  mockCommunity.includes("type: 'comment'") &&
	  mockCommunity.includes("type: 'apply'") &&
	  mockCommunity.includes("type: 'activity'")
	) {
	  ok('通知 type 含 like/comment/apply/activity')
	} else {
	  fail('通知 type 样本不齐')
	}
	
	// 3. API
console.log('\n3. 社区 API...')
const apiCommunity = read('api/community.uts')
const apiFns = [
  'getDynamicList',
  'getDynamicDetail',
  'getTopics',
  'getTopicList',
  'getTopicDetail',
  'joinTopic',
  'leaveTopic',
  'getPaperPlanes',
  'sendPaperPlane',
  'replyPaperPlane',
  'getActivities',
  'getActivityDetail',
  'signupActivity',
  'getMyActivities',
  'getCommunityBanners',
  'getCommunityNotifications',
  'getUnreadNotificationCount',
  'markNotificationRead',
  'markAllNotificationsRead',
  'getCommunityQuotas',
  'publishDynamic',
  'likeDynamic',
  'collectDynamic',
  'followUserFromCommunity',
  'unfollowUserFromCommunity',
  'deleteDynamic',
  'deleteComment',
  'getMyPaperPlanes',
  'commentDynamic',
  'reportContent',
  'blockUser',
  'getReportReasons',
  'getCurrentCity',
  'setCurrentCity'
]
apiFns.forEach((fn) => {
  if (apiCommunity.includes(`export async function ${fn}`)) ok(fn)
  else fail(`API 缺少 ${fn}`)
})

// 关注 all：BE following_and_liked 真并集；mergeLiked 恒 false（禁止客户端假分页）
	if (apiCommunity.includes("filter == 'likedUsers'") && apiCommunity.includes('liked_users')) {
	  ok('关注 Tab 支持 following / liked_users 分流')
	} else {
	  fail('关注 Tab 缺少 liked_users 分流')
	}
	if (
	  apiCommunity.includes("mode: 'following_and_liked'") &&
	  apiCommunity.includes('mergeLiked: false')
	) {
	  ok('关注 Tab all → following_and_liked（BE 并集，无假分页）')
	} else {
	  fail('关注 Tab all 未切到 following_and_liked')
	}
if (
		  apiCommunity.includes('COMMUNITY_CITY_OPTIONS') &&
		  apiCommunity.includes('normalizeCityCode') &&
		  apiCommunity.includes('city_code')
		) {
		  ok('同城 city_code 规范化 + 列表传参')
		} else {
		  fail('同城 city_code 对齐缺失')
		}
		// 同城 Mock 对齐 BE：location-only；拒未设置；一周限改
		const cityFilterBlock = (() => {
		  const i = apiCommunity.indexOf("tab == 'city'")
		  if (i < 0) return ''
		  return apiCommunity.slice(i, i + 500)
		})()
		if (
		  cityFilterBlock.includes('loc.indexOf(city)') &&
		  !cityFilterBlock.includes('cityTag == true') &&
		  !cityFilterBlock.includes("tabs.indexOf('city')")
		) {
		  ok('Mock 同城 filter 仅 location/city（无 cityTag/tabs 放宽）')
		} else {
		  fail('Mock 同城 filter 未与 BE location-only 对齐')
		}
		if (
		  apiCommunity.includes("城市名称不能为空") &&
		  apiCommunity.includes('同城城市一周内仅可更换一次')
		) {
		  ok('Mock setCurrentCity 拒非法名 + 一周限改')
		} else {
		  fail('Mock setCurrentCity 契约不完整')
		}
if (apiCommunity.includes('points_available') && apiCommunity.includes(': false')) {
  ok('mapQuotaItem pointsAvailable 缺省 fail-closed')
} else {
  fail('mapQuotaItem pointsAvailable 缺省未 fail-closed')
}
if (apiCommunity.includes('commentsLoadError') && apiCommunity.includes('动态加载失败，无法点赞')) {
  ok('详情评论失败标记 + 赞藏预检失败不默认 PUT')
} else {
  fail('详情/赞藏 fail-closed 不完整')
}

const apiIndex = read('api/index.uts')
;['unfollowUserFromCommunity', 'deleteDynamic', 'deleteComment', 'getMyPaperPlanes'].forEach((n) => {
  if (apiIndex.includes(n)) ok(`api/index 导出 ${n}`)
  else fail(`api/index 未导出 ${n}`)
})

console.log('\n3.0 user like/apply 双路径...')
const apiUser = read('api/user.uts')
if (apiUser.includes('USE_MOCK') && apiUser.includes('/discovery/applications/') && apiUser.includes('/users/') && apiUser.includes('/like')) {
  ok('likeUser/applyToMeet 含 USE_MOCK 与 discovery/social 真路径')
} else {
  fail('user.uts 未双路径对接 discovery/social')
}
if (apiUser.includes('relations/likes')) {
  ok('likeUser 真路径会查 relations/likes')
} else {
  fail('likeUser 缺少 likes 状态查询')
}
if (apiUser.includes('page_size: pageSize') || apiUser.includes('page_size: 50')) {
  ok('likeUser page_size≤50 分页扫描')
} else {
  fail('likeUser 仍可能 page_size>50')
}
if (apiUser.includes('喜欢列表加载失败')) {
  ok('likeUser 预检失败返回 failRes')
} else {
  fail('likeUser 预检失败路径缺失')
}
if (apiUser.includes('ALREADY_PENDING') && apiUser.includes('failRes') && apiUser.includes('quotaRefreshFailed')) {
  ok('apply 409 failRes + 额度刷新失败标记')
} else {
  fail('apply 409/额度刷新修复不完整')
}

if (apiCommunity.includes('hasMore') && apiCommunity.includes('pageSize') && apiCommunity.includes('list:')) {
  ok('getDynamicList 分页结构 list/hasMore/pageSize')
} else {
  fail('getDynamicList 缺少分页 payload')
}

if (apiCommunity.includes('normalizeListQuery') || apiCommunity.includes("tab: 'discover'")) {
  ok('列表支持 tab 结构化查询')
} else {
  fail('列表 tab 结构异常')
}

console.log('\n3.1 publishDynamic 契约...')
if (
  apiCommunity.includes('videos') &&
  apiCommunity.includes('mediaType') &&
  apiCommunity.includes('topicTitle')
) {
  ok('publishDynamic 处理 videos/mediaType/topicTitle')
} else {
  fail('publishDynamic 未透传 videos/mediaType/topicTitle')
}
if (
  apiCommunity.includes('正文或图片') ||
  apiCommunity.includes('文字或图片、视频') ||
  apiCommunity.includes('图片或视频')
) {
  ok('空内容拦截文案覆盖视频')
} else {
  fail('空内容文案未覆盖视频')
}
if (
  apiCommunity.includes('INVALID_MEDIA') &&
  apiCommunity.includes('图片与视频不能同时')
) {
  ok('publishDynamic 拒绝图视频同时提交')
} else {
  fail('publishDynamic 缺少图视频互斥校验')
}
if (
  apiCommunity.includes('mediaType: mediaType') &&
  apiCommunity.includes('topicTitle: topicTitle')
) {
  ok('publishDynamic request data 含 mediaType/topicTitle')
} else {
  fail('publishDynamic request data 未写入 mediaType/topicTitle')
}

;[
  'commentDynamic',
  'signupActivity',
  'sendPaperPlane',
  'reportContent',
  'getUnreadNotificationCount',
  'markNotificationRead',
  'getCurrentCity'
].forEach((fn) => {
  if (apiIndex.includes(fn)) ok(`api/index 导出 ${fn}`)
  else fail(`api/index 未导出 ${fn}`)
})

// 4. 认证门槛：常规互动/申请/话题仅实名；发布动态（含带话题）实名 + 人脸
console.log('\n4. 认证门槛（互动仅实名，发布需实名 + 人脸）...')
if (exists('utils/realNameGate.uts')) ok('utils/realNameGate.uts 存在')
else fail('缺少 realNameGate')

const gate = read('utils/realNameGate.uts')
if (gate.includes('guardRealName') && gate.includes('resolveRealNameStatus')) ok('导出 guardRealName / resolveRealNameStatus')
else fail('门槛工具导出不完整')
if (
  gate.includes('仅实名通过：常规社区互动') &&
  gate.includes('实名通过 + 人脸通过：发布动态') &&
  gate.includes('不作为任何操作门槛')
) {
  ok('认证边界：互动仅实名，发布实名 + 人脸，学历仅展示')
} else {
  fail('认证边界文案未同步为互动仅实名 / 发布实名 + 人脸')
}
if (
  gate.includes("'passed'") &&
  gate.includes("'missing'") &&
  gate.includes("'reviewing'") &&
  gate.includes("'rejected'")
) {
  ok('实名状态枚举 passed/missing/reviewing/rejected')
} else {
  fail('实名状态枚举未对齐定版')
}
if (gate.includes("pending") && gate.includes('reviewing') && gate.includes('failed') && gate.includes('rejected')) {
  ok('兼容 pending→reviewing / failed→rejected')
} else {
  fail('缺少旧状态映射')
}

const me = read('mock/user.uts')
if (me.includes("realNameStatus: 'passed'")) ok('mockMeProfile 含 realNameStatus')
else fail('mockMeProfile 缺少 realNameStatus')

const pagesNeedGate = [
  'pages/community/community.uvue',
  'pagesSub/community/publish.uvue',
  'pagesSub/community/post-detail.uvue',
  'pagesSub/community/topic-detail.uvue',
  'pagesSub/community/activity-detail.uvue',
  'pagesSub/community/paper-plane.uvue'
]
pagesNeedGate.forEach((p) => {
  const c = read(p)
  if (c.includes('guardRealName') || c.includes('realNameGate')) ok(`${p} 接入实名门槛`)
  else fail(`${p} 未接入实名门槛`)
})

// 5. 安全：更多仅举报/屏蔽；无「不感兴趣」
console.log('\n5. 安全交互约定...')
const communityMain = read('pages/community/community.uvue')
const dislikeUi = /action-text=["']不感兴趣["']|>不感兴趣<|>\s*不感兴趣\s*</
if (dislikeUi.test(communityMain)) fail('社区主页仍含「不感兴趣」交互')
else ok('社区主页已移除「不感兴趣」')

if (exists('components/XsaReportSheet.uvue')) ok('XsaReportSheet 存在')
else fail('缺少 XsaReportSheet')
if (exists('components/XsaApplySheet.uvue')) ok('XsaApplySheet 存在')
else fail('缺少 XsaApplySheet')

const card = read('components/XsaDynamicCard.uvue')
	if (card.includes('申请认识') && card.includes('handleApply')) ok('动态卡含申请认识')
	else fail('动态卡缺少申请认识')
	if (card.includes('不感兴趣')) fail('动态卡仍含不感兴趣')
	else ok('动态卡无「不感兴趣」')

	console.log('\n5.1 动态卡字段展示...')
	const cardSrc = read('components/XsaDynamicCard.uvue')
	if (
	  cardSrc.includes('birthYear') &&
	  cardSrc.includes('ipLocation') &&
	  (cardSrc.includes('gender') || cardSrc.includes('genderIcon'))
	) {
	  ok('动态卡含出生年/IP/性别逻辑')
	} else {
	  fail('动态卡缺少出生年/IP/性别')
	}
	if (cardSrc.includes('topicTitle') && cardSrc.includes('cityTag')) {
	  ok('动态卡含 topicTitle / cityTag')
	} else {
	  fail('动态卡缺少 topicTitle 或 cityTag')
	}
if (cardSrc.includes('relationTags') || cardSrc.includes('relation-tag')) {
		  ok('动态卡含关系小标')
		} else {
		  fail('动态卡缺少关系小标')
		}
		if (
		  cardSrc.includes('hasVideo') &&
		  (cardSrc.includes('video-block') || cardSrc.includes('<video'))
		) {
		  ok('动态卡支持视频可见性')
		} else {
		  fail('动态卡缺少视频展示分支')
		}
		if (
		  cardSrc.includes('relationSet.indexOf') ||
		  cardSrc.includes('relationList.value')
		) {
		  ok('动态卡 tagList 与关系标去重')
		} else {
		  fail('动态卡未对关系标与 tags 去重')
		}

		const communityNorm = read('pages/community/community.uvue')
	if (
	  communityNorm.includes('topicTitle') &&
	  communityNorm.includes('cityTag') &&
	  communityNorm.includes('relationTags')
	) {
	  ok('community normalizeDynamic 透传新字段')
	} else {
	  fail('community normalizeDynamic 未透传新字段')
	}

if (card.includes('age') && card.includes('height') && card.includes('education')) {
  ok('动态卡支持完整资料标签字段')
} else {
  fail('动态卡资料标签字段不完整')
}

// 6. 主 Tab + 浏览无门槛
console.log('\n6. 主 Tab 与浏览边界...')
if (
  communityMain.includes("currentTab === 'follow'") &&
  communityMain.includes("currentTab === 'city'") &&
  communityMain.includes("currentTab === 'discover'")
) {
  ok('主 Tab 为 关注 / 同城 / 发现')
} else {
  fail('主 Tab 未切换为 关注/同城/发现')
}
// 喜欢不应作为主 Tab 文案（可出现在注释）
if (/<text>喜欢<\/text>/.test(communityMain)) {
  fail('主 Tab 仍展示「喜欢」')
} else {
  ok('主 Tab 未展示「喜欢」')
}
if (communityMain.includes('filterOptions') || communityMain.includes("key: 'media'")) {
  ok('二级筛选存在')
} else {
  fail('缺少二级筛选')
}
if (
	  communityMain.includes("选择城市") &&
	  communityMain.includes("!isValidCity(cityName.value)") &&
	  communityMain.includes('switchCity()') &&
	  communityMain.includes('城市加载失败')
	) {
	  ok('同城未设城 CTA→选择城市/switchCity；loadCity 失败可见')
	} else {
	  fail('同城空态 CTA 或 loadCity 失败提示缺失')
	}
	if (communityMain.includes('loadDynamics') && communityMain.includes('getDynamicList')) {
	  ok('动态列表可直接加载（浏览无门槛）')
} else {
  fail('动态列表加载异常')
}
if (communityMain.includes('guardRealName')) ok('互动使用 guardRealName')
else fail('互动未使用实名门槛')
if (communityMain.includes('getUnreadNotificationCount') || communityMain.includes('unreadCount')) {
  ok('通知未读角标接入')
} else {
  fail('通知未读角标未接入')
}

// 6.1 二级标签与喜欢用户语义
console.log('\n6.1 二级标签 / 喜欢用户 / 话题页...')
const filterKeys = [
  "key: 'all'",
  "key: 'following'",
  "key: 'likedUsers'",
  "key: 'hot'",
  "key: 'latest'",
  "key: 'mbti'",
  "key: 'alumni'",
  "key: 'hometown'"
]
if (filterKeys.every((k) => communityMain.includes(k))) {
  ok('三组二级标签键齐全')
} else {
  fail('二级标签键缺失')
}
if (communityMain.includes("label: '喜欢'") && communityMain.includes('likedUsers')) {
  ok('关注页含「喜欢」二级标签（用户级）')
} else {
  fail('关注页喜欢标签缺失')
}
if (communityMain.includes("currentTab === 'discover' && currentFilter === 'all'")) {
  ok('TOPIC 轮播仅在发现·全部展示')
} else {
  fail('TOPIC 展示条件未限制为发现·全部')
}
if (communityMain.includes('topic-panel') && communityMain.includes('hotTopics') && communityMain.includes('openTopics')) {
  ok('发现·全部含 TOPIC 完整话题面板')
} else {
  fail('TOPIC 面板结构不完整')
}
if (communityMain.includes('正在发生的话题')) {
  fail('仍保留独立「正在发生的话题」区块')
} else {
  ok('已移除独立话题区块')
}
if (communityMain.includes('bannerIndex') && communityMain.includes('onBannerChange') && communityMain.includes('setBannerIndex')) {
  ok('轮播支持受控 current + change + 指示项')
} else {
  fail('轮播受控状态不完整')
}

if (mockCommunity.includes('mockLikedUserIds') && mockCommunity.includes('mbti:') && mockCommunity.includes('school:') && mockCommunity.includes('hometown:')) {
  ok('Mock 含用户级喜欢与 mbti/school/hometown')
} else {
  fail('Mock 用户属性不完整')
}
if ((mockCommunity.match(/viewCount:/g) || []).length >= 20) {
  ok('Mock 话题 >=20 且含 viewCount')
} else {
  fail('Mock 话题数量或 viewCount 不足')
}

if (apiCommunity.includes('likedUsers') && apiCommunity.includes('isLikedUser') && apiCommunity.includes("filter == 'mbti'")) {
  ok('API 按用户级喜欢 / 发现标签筛选')
} else {
  fail('API 筛选语义未升级')
}
if (apiCommunity.includes('export async function getTopicList') && apiCommunity.includes('excludeIds') && apiCommunity.includes('hasMore')) {
  ok('getTopicList 分页接口存在')
} else {
  fail('缺少 getTopicList 分页接口')
}
if (apiCommunity.includes('export async function getTopicDetail(topicId: number, sort: string =') || apiCommunity.includes('getTopicDetail(topicId: number, sort')) {
  ok('getTopicDetail 支持 hot/latest 排序')
} else {
  fail('getTopicDetail 未支持排序参数')
}

const applyApiLike = read('api/user.uts')
if (applyApiLike.includes('mockLikedUserIds') && applyApiLike.includes('likeUser') && applyApiLike.includes('liked')) {
  ok('likeUser 维护 mockLikedUserIds')
} else {
  fail('likeUser 未写入用户级喜欢状态')
}

const topicDetail = read('pagesSub/community/topic-detail.uvue')
if (topicDetail.includes('hero-cover') && topicDetail.includes('参与话题') && topicDetail.includes("sort == 'hot'") && topicDetail.includes("sort == 'latest'")) {
  ok('话题详情含封面 Hero / 热门最新 / 固定参与按钮')
} else {
  fail('话题详情页结构未对齐')
}
if (topicDetail.includes('topicError') && topicDetail.includes('action-text="重试"') && topicDetail.includes('topic != null && !topicError')) {
  ok('话题详情包含错误重试态并仅在成功加载后显示参与按钮')
} else {
  fail('话题详情缺少错误重试态或参与按钮未受状态保护')
}
const realNameGate = read('utils/realNameGate.uts')
if (realNameGate.includes('resolveEducationStatus') && realNameGate.includes('ensureDualVerification') && realNameGate.includes('guardDualVerification')) {
  ok('双重认证守卫仍保留（展示/预留）')
} else {
  fail('双重认证守卫工具缺失')
}
if (topicDetail.includes("guardRealName('topicJoin')") && topicDetail.includes('publish?topicId=') && !topicDetail.includes('guardDualVerification')) {
  ok('参与话题仅要求实名并携带 topicId')
} else {
  fail('参与话题实名门槛或 topicId 缺失')
}
if (
  topicDetail.includes('joinTopic') &&
  topicDetail.includes('leaveTopic') &&
  topicDetail.includes('doJoin') &&
  topicDetail.includes('confirmLeave') &&
  topicDetail.includes('去发言') &&
  topicDetail.includes('取消参与') &&
  topicDetail.includes('onShow')
) {
  ok('话题详情接线 join/leave 与已参与态 CTA')
} else {
  fail('话题详情未接线 join/leave 或已参与 CTA')
}
const communityApiSrc = read('api/community.uts')
if (
  communityApiSrc.includes('export async function leaveTopic') &&
  communityApiSrc.includes("/leave") &&
  communityApiSrc.includes('unmarkTopicParticipation') &&
  communityApiSrc.includes('participant_count') &&
  communityApiSrc.includes('raw.joined == true') &&
  communityApiSrc.includes("failRes('话题不存在', 404)")
) {
  ok('joinTopic/leaveTopic API 含 fail-closed 与 participantCount')
} else {
  fail('join/leave API 契约不完整')
}
if (topicDetail.includes('joining.value || leaving.value')) {
  ok('话题详情 onShow 在 join/leave 进行中跳过重拉')
} else {
  fail('话题详情未防护 join/leave 与 onShow 竞态')
}
if (topicDetail.includes("guardRealName('like')") && topicDetail.includes("guardRealName('collect')") && topicDetail.includes("guardRealName('follow')")) {
  ok('话题内点赞、收藏、关注仍仅要求实名')
} else {
  fail('话题内常规互动实名门槛缺失')
}

const communityPublishPage = read('pagesSub/community/publish.uvue')
if (communityPublishPage.includes('onLoad') && communityPublishPage.includes('query.topicId') && communityPublishPage.includes('topicId.value = parsed > 0 ? parsed : 0')) {
  ok('发布页解析 topicId')
} else {
  fail('发布页未解析 topicId')
}
if (
  communityPublishPage.includes('guardCommunityVerification()') &&
  !communityPublishPage.includes('guardDualVerification')
) {
  const gateSource = read('utils/realNameGate.uts')
  if (
    gateSource.includes('export async function guardCommunityVerification') &&
    gateSource.includes('Number(profile.face_verified) == 1') &&
    gateSource.includes("!realnamePassed ? 'realname' : 'face'")
  ) {
    ok('发布动态（含带话题）要求实名 + 人脸')
  } else {
    fail('发布门槛未收敛为实名 + 人脸')
  }
} else {
  fail('发布流程认证门槛不完整')
}
if (communityPublishPage.includes('topicId: topicId.value')) {
  ok('发布接口透传 topicId')
} else {
  fail('发布接口未透传 topicId')
}
if (apiCommunity.includes('function markTopicParticipation') && apiCommunity.includes('topic.joined == true') && apiCommunity.includes('topic.postCount = ((topic.postCount as number) || 0) + 1')) {
  ok('话题参与人数按用户去重，发帖仅累计帖子数')
} else {
  fail('话题参与人数可能因重复发帖重复累计')
}

const topicList = read('pagesSub/community/topic-list.uvue')
if (topicList.includes('近期热门') && topicList.includes('更多话题') && topicList.includes('getTopicList') && topicList.includes('没有更多话题了')) {
  ok('全部话题页：热门前10 + 分页更多')
} else {
  fail('全部话题页结构未对齐')
}
if (topicList.includes("sort == 'hot'") || topicList.includes("changeSort('hot')")) {
  fail('全部话题页仍保留顶部热门/最新标签')
} else {
  ok('全部话题页已移除顶部热门/最新标签')
}

if (topicList.includes('loadError') && topicList.includes('action-text="重试"')) {
	  ok('全部话题页包含网络错误重试态')
	} else {
	  fail('全部话题页缺少网络错误重试态')
	}
	// 分页失败不得 loadError=true，否则已成功首屏被整页 Empty 盖住
	const loadMoreBlock = topicList.includes('const loadMore = async')
	  ? topicList.slice(topicList.indexOf('const loadMore = async'))
	  : ''
	const loadMoreSetsLoadError =
	  loadMoreBlock.includes("loadError.value = true") ||
	  loadMoreBlock.includes('loadError.value=true')
	if (loadMoreBlock !== '' && !loadMoreSetsLoadError) {
	  ok('全部话题页分页失败不触发整页 loadError')
	} else if (loadMoreBlock === '') {
	  fail('全部话题页缺少 loadMore')
	} else {
	  fail('全部话题页 loadMore 仍会 loadError=true 盖住首屏')
	}
const cardClick = read('components/XsaDynamicCard.uvue')
if (cardClick.includes('handleOpen') && cardClick.includes('previewImage') && cardClick.includes('@click.stop')) {
  ok('动态卡：正文进详情、图片预览并阻止冒泡')
} else {
  fail('动态卡点击规则不完整')
}

// 6.2 审查修复项
if (communityMain.includes('loadSeq') && communityMain.includes('seq != loadSeq.value')) {
  ok('列表请求带 loadSeq 防竞态')
} else {
  fail('列表竞态防护缺失')
}
if (communityMain.includes('list.slice(1, 5)') || communityMain.includes('slice(1, 5)')) {
  ok('TOPIC 快捷入口与 featured 去重')
} else {
  fail('TOPIC 快捷入口仍可能与 featured 重复')
}
if (communityMain.includes('#18415d') || communityMain.includes('#3d5a45')) {
  fail('banner 仍含散落 hex 渐变')
} else {
  ok('banner 渐变已 Token 化')
}

const indexPageLike = read('pages/index/index.uvue')
if (
  indexPageLike.includes('likeUser') &&
  indexPageLike.includes("guardRealName('like')") &&
  indexPageLike.includes('onLike(1)') &&
  indexPageLike.includes('onLike(2)') &&
  indexPageLike.includes('onLike(7)')
) {
  ok('首页 onLike 接通 likeUser 且传入真实 userId')
} else {
  fail('首页 likeUser/userId/实名门槛不完整')
}
const detailPageLike = read('pagesSub/userExtra/user/detail.uvue')
if (
  detailPageLike.includes('likeUser') &&
  detailPageLike.includes("guardRealName('like')") &&
  detailPageLike.includes("options.userId != null && options.userId != ''") &&
  !detailPageLike.includes('options.userId != null and options.userId')
) {
  ok('资料页 onLike 接通 likeUser，路由 userId 用 && 解析')
} else {
  fail('资料页 likeUser/userId 解析/实名门槛不完整')
}
if (topicDetail.includes('res.data.collectCount') && !topicDetail.includes('(p.collectCount || 0) + (p.collected ? 1 : -1)')) {
  ok('话题详情收藏计数使用 API 返回值')
} else {
  fail('话题详情收藏计数仍可能双计')
}
const postDetailPage = read('pagesSub/community/post-detail.uvue')
if (postDetailPage.includes('res.data.collectCount')) {
  ok('帖子详情收藏计数回写 collectCount')
} else {
  fail('帖子详情未回写 collectCount')
}

// 7. 发布页完整能力
console.log('\n7. 发布页完整能力...')
const publishSrc = read('pagesSub/community/publish.uvue')
if (
  publishSrc.includes('添加话题') ||
  publishSrc.includes('topic-sheet') ||
  publishSrc.includes('showTopicSheet')
) {
  ok('发布页含话题选择')
} else {
  fail('发布页缺少话题选择')
}
if (
  publishSrc.includes('内容声明') ||
  publishSrc.includes('declaration')
) {
  ok('发布页含内容声明')
} else {
  fail('发布页缺少内容声明')
}
if (
  publishSrc.includes('chooseVideo') ||
  publishSrc.includes('添加视频') ||
  publishSrc.includes('videos')
) {
  ok('发布页含视频能力')
} else {
  fail('发布页缺少视频')
}
if (
  publishSrc.includes('emoji') ||
  publishSrc.includes('表情') ||
  publishSrc.includes('insertEmoji')
) {
  ok('发布页含表情')
} else {
  fail('发布页缺少表情')
}
if (
  publishSrc.includes('guardCommunityVerification') ||
  publishSrc.includes('guardRealName')
) {
  ok('发布页接入认证门槛')
} else {
  fail('发布门槛缺失')
}
if (read('utils/realNameGate.uts').includes("!realnamePassed ? 'realname' : 'face'")) {
  ok('发布门槛未通过时按缺失项跳转实名 / 人脸认证')
} else {
  fail('发布门槛未区分实名与人脸跳转')
}
	if (
	  publishSrc.includes('getTopicDetail') &&
	  (publishSrc.includes('话题标题加载失败') || publishSrc.includes('话题 #'))
	) {
	  ok('入口 topicId 标题失败有占位/提示')
	} else {
	  fail('入口 topicId 标题失败仍可能静默')
	}

// 8. 通知分栏
	console.log('\n8. 通知分栏...')
	const notifySrc = read('pagesSub/community/notifications.uvue')
	if (
	  notifySrc.includes('评论') &&
	  notifySrc.includes('点赞') &&
	  (notifySrc.includes("currentTab") || notifySrc.includes('notifyTab'))
	) {
	  ok('通知页含评论/点赞分栏')
	} else {
	  fail('通知页缺少分栏 Tab')
	}
	if (
	  notifySrc.includes("type == 'comment'") ||
	  notifySrc.includes("type === 'comment'") ||
	  notifySrc.includes("n.type == 'comment'") ||
	  notifySrc.includes("'comment'")
	) {
	  ok('通知页按 type 过滤')
	} else {
	  fail('通知页缺少 type 过滤')
	}
	if (
	  notifySrc.includes('暂无评论') &&
	  notifySrc.includes('暂无点赞') &&
	  notifySrc.includes('暂无通知')
	) {
	  ok('通知分栏独立空态')
	} else {
	  fail('通知分栏空态不完整')
	}

	// 8.1 Demo 冻结提示文件存在
	console.log('\n8.1 HTML Demo 参考...')
	if (exists('design-demos/community-shell/index.html')) ok('community-shell demo 仍在（视觉参考）')
	else ok('community-shell demo 已移除（非本轮阻断项）')

// 9. 申请认识跨入口一致性 + 额度
console.log('\n9. 申请认识统一规则...')
const indexPage = read('pages/index/index.uvue')
if (indexPage.includes('guardRealName') && indexPage.includes("guardRealName('apply')")) {
  ok('首页申请认识接入 guardRealName')
} else {
  fail('首页申请认识未接入实名门槛')
}
if (indexPage.includes('XsaApplySheet') && indexPage.includes('openApplyModal')) {
  ok('首页复用 XsaApplySheet')
} else {
  fail('首页未统一到 XsaApplySheet')
}
// 首页不应再自建申请 textarea 主路径
if (indexPage.includes('confirmApply') || indexPage.includes('applyMessage')) {
  fail('首页仍保留自定义申请 Modal 逻辑')
} else {
  ok('首页已移除自定义申请 Modal 逻辑')
}

const detailPage = read('pagesSub/userExtra/user/detail.uvue')
if (detailPage.includes('XsaApplySheet') && (detailPage.includes('openApply') || detailPage.includes('applyVisible') || detailPage.includes('handleApply'))) {
  ok('资料页复用 XsaApplySheet')
} else {
  fail('资料页未统一到 XsaApplySheet')
}

const applyApi = read('api/user.uts')
if (applyApi.includes('QUOTA_EXCEEDED') && applyApi.includes('mockCommunityQuotas')) {
  ok('applyToMeet 与 mockCommunityQuotas 联动并拦截超额')
} else {
  fail('applyToMeet 额度拦截不完整')
}
if (applyApi.includes('ALREADY_PENDING') && applyApi.includes('mockApplyStates')) {
  ok('applyToMeet 幂等 pending/accepted 不重复扣次')
} else {
  fail('applyToMeet 幂等状态不完整')
}
// Mock 重复申请应 success:false，避免 Sheet 当成功
if (
  applyApi.includes("code: 'ALREADY_PENDING'") &&
  applyApi.includes('success: false')
) {
  ok('applyToMeet 重复申请 mock/真路径均为失败语义')
} else {
  fail('applyToMeet 重复申请仍可能 success:true')
}

const planeApi = read('api/community.uts')
if (planeApi.includes('paperPlaneDaily') && planeApi.includes('QUOTA_EXCEEDED')) {
  ok('纸飞机免费额度用尽拦截')
} else {
  fail('纸飞机额度拦截异常')
}
if (planeApi.includes('scope') && planeApi.includes('sendPaperPlane')) {
  ok('sendPaperPlane 支持对象 payload / scope')
} else {
  fail('sendPaperPlane 结构未升级')
}

// 10. 发布 / 评论 / 通知闭环
console.log('\n10. 发布评论通知闭环...')
const publishPage = read('pagesSub/community/publish.uvue')
if (publishPage.includes('publishDynamic') && !publishPage.includes('setTimeout(() => {\n\t\t\t\tuni.hideLoading()')) {
  ok('发布页调用 publishDynamic')
} else if (publishPage.includes('publishDynamic')) {
  ok('发布页调用 publishDynamic')
} else {
  fail('发布页仍为假发布')
}

const postDetail = read('pagesSub/community/post-detail.uvue')
if (postDetail.includes('commentDynamic') && postDetail.includes('dynamicId')) {
  ok('详情评论使用结构化 commentDynamic')
} else if (postDetail.includes('commentDynamic')) {
  ok('详情评论接入 commentDynamic')
} else {
  fail('详情评论未闭环')
}

const notifications = read('pagesSub/community/notifications.uvue')
if (notifications.includes('markNotificationRead') && notifications.includes('markAllNotificationsRead')) {
  ok('通知页支持已读 / 全部已读')
} else {
  fail('通知已读 API 未接入')
}

const paperPage = read('pagesSub/community/paper-plane.uvue')
if (paperPage.includes('sendPaperPlane') && paperPage.includes('scope')) {
  ok('纸飞机页对象式发送')
} else if (paperPage.includes('sendPaperPlane')) {
  ok('纸飞机页接入 sendPaperPlane')
} else {
  fail('纸飞机发送未闭环')
}

// 11. Live API contract hardening. These checks intentionally inspect the UTS
// source because this Node test does not execute a UniApp runtime.
console.log('\n11. Live API contract...')
function contract(name, check) {
  try {
    check()
    ok(name)
  } catch (err) {
    fail(`${name}: ${err.message}`)
  }
}

const liveUserApi = read('api/user.uts')
const liveCommunityApi = read('api/community.uts')
const liveTopicPage = read('pagesSub/community/topic-detail.uvue')
const dynamicCard = read('components/XsaDynamicCard.uvue')
const livePublishPage = read('pagesSub/community/publish.uvue')
const livePostDetailPage = read('pagesSub/community/post-detail.uvue')
const livePaperPlanePage = read('pagesSub/community/paper-plane.uvue')

contract('getMeProfile uses /auth/me and maps real-name status', () => {
  assert.match(liveUserApi, /url:\s*'\/auth\/me'/)
  assert.match(liveUserApi, /realname_status/)
  assert.match(liveUserApi, /status == 2.*passed/s)
  assert.match(liveUserApi, /status == 1 \|\| status == 4.*reviewing/s)
  assert.match(liveUserApi, /status == 3 \|\| status == 5.*rejected/s)
})
contract('real post mapper preserves verification, visibility, and declaration', () => {
  assert.match(liveCommunityApi, /realname_status/)
  assert.match(liveCommunityApi, /visibility:\s*row\.visibility/)
  assert.match(liveCommunityApi, /declaration:\s*row\.declaration/)
})
contract('create requests transmit fields and idempotency keys', () => {
  assert.match(liveCommunityApi, /visibility:\s*visibility/)
  assert.match(liveCommunityApi, /declaration:\s*declaration/)
  assert.match(liveCommunityApi, /'Idempotency-Key'/)
})
contract('real-media publishing is blocked before its HTTP request', () => {
  assert.match(liveCommunityApi, /MEDIA_UPLOAD_REQUIRED/)
  assert.match(liveCommunityApi, /图片和视频上传服务尚未接入，暂不能发布媒体动态/)
})
contract('community api exposes media upload helpers', () => {
  const api = read('api/community.uts')
  assert.match(api, /uploadCommunityMedia/)
  assert.match(api, /deleteCommunityMedia/)
  assert.match(api, /image_media_ids|imageMediaIds/)
  assert.match(api, /community\/media\/uploads/)
})
contract('real publish no longer hard-blocks all temp media without upload path', () => {
  const api = read('api/community.uts')
  // 仍可保留 isTemporaryMediaPath 工具，但正常路径应先 upload 再发 media ids
  assert.match(api, /uploadCommunityMedia/)
  assert.match(api, /image_media_ids/)
})
contract('topic detail passes page metadata and scroll pagination', () => {
  assert.match(liveCommunityApi, /getTopicDetail\(topicId: number, sort: string = 'hot', page: number = 1, pageSize: number = 20\)/)
  assert.match(liveTopicPage, /@scrolltolower="loadMore"/)
  assert.match(liveTopicPage, /const hasMore = ref\(true\)/)
  assert.match(liveTopicPage, /const loadingMore = ref\(false\)/)
})
contract('dynamic card emits interactions without optimistic local mutation', () => {
  assert.doesNotMatch(dynamicCard, /liked\.value\s*=\s*!liked\.value/)
  assert.doesNotMatch(dynamicCard, /collected\.value\s*=\s*!collected\.value/)
  assert.doesNotMatch(dynamicCard, /followed\.value\s*=\s*true/)
  assert.match(dynamicCard, /emit\('like', props\.dynamic\.id\)/)
  assert.match(dynamicCard, /emit\('collect', props\.dynamic\.id\)/)
  assert.match(dynamicCard, /emit\('follow', props\.dynamic\.user\.id\)/)
})
contract('publish page retains the request failure message', () => {
  assert.match(livePublishPage, /res\.message/)
})
contract('publish page uploads media before publish', () => {
	  const page = read('pagesSub/community/publish.uvue')
	  assert.match(page, /uploadCommunityMedia/)
	  assert.match(page, /mediaId|imageMediaIds/)
	  assert.match(page, /deleteCommunityMedia/)
	  assert.match(page, /cancelled/)
	  assert.match(page, /inFlightMedia/)
	  assert.match(page, /hasReadyMedia/)
	})
	contract('publish photo→video / video replace cancels in-flight uploads', () => {
	  const page = read('pagesSub/community/publish.uvue')
	  // addVideo clear photos + pickVideo replace must cancel uploading, not only delete ready
	  const addVideoStart = page.indexOf('const addVideo = ')
	  assert.ok(addVideoStart >= 0, 'addVideo should exist')
	  const pickVideoStart = page.indexOf('const pickVideo = ')
	  assert.ok(pickVideoStart >= 0, 'pickVideo should exist')
	  const addVideoBody = page.slice(addVideoStart, pickVideoStart > addVideoStart ? pickVideoStart : undefined)
	  assert.match(addVideoBody, /cancelled\s*=\s*true/)
	  assert.match(addVideoBody, /trackInFlight/)
	  assert.match(addVideoBody, /photoItems\.value\s*=\s*\[\]/)
	  const deletePhotoStart = page.indexOf('const deletePhoto = ')
	  const pickVideoEnd = deletePhotoStart > pickVideoStart ? deletePhotoStart : page.length
	  const pickVideoBody = page.slice(pickVideoStart, pickVideoEnd)
	  assert.match(pickVideoBody, /cancelled\s*=\s*true/)
	  assert.match(pickVideoBody, /trackInFlight/)
	})
contract('paper plane supports image pick and upload', () => {
  const page = read('pagesSub/community/paper-plane.uvue')
  assert.match(page, /chooseImage|addPhoto/)
  assert.match(page, /uploadCommunityMedia/)
  assert.match(page, /imageMediaIds|image_media_ids/)
  assert.match(page, /cancelled/)
  assert.match(page, /inFlightMedia/)
})
contract('mock community media map resolves ids on publish/send', () => {
  const api = read('api/community.uts')
  assert.match(api, /mockCommunityMediaById/)
  assert.match(api, /resolveMockMediaUrls/)
  assert.match(api, /images:\s*planeImages/)
})
contract('like-user scan is bounded by returned data rather than a hard page cap', () => {
  assert.doesNotMatch(liveUserApi, /while \(page <= 20\)/)
  assert.match(liveUserApi, /scanned >= total/)
  assert.match(liveUserApi, /items\.length < pageSize/)
})

const liveRequestApi = read('api/request.uts')
contract('all create flows use caller-owned keys instead of a hidden durable cache', () => {
  assert.match(liveCommunityApi, /export function createCommunityCreateKey/)
  assert.match(liveCommunityApi, /export function discardCommunityCreateKey/)
  assert.doesNotMatch(liveCommunityApi, /pendingCreateKeys/)
  assert.match(liveCommunityApi, /suppliedCreateKey/)
  assert.match(livePublishPage, /pendingPublishKey/)
  assert.match(livePublishPage, /discardCommunityCreateKey\(pendingPublishKey\.value\)/)
  assert.match(livePostDetailPage, /pendingCommentKey/)
  assert.match(livePostDetailPage, /idempotencyKey:\s*pendingCommentKey\.value/)
  assert.match(livePaperPlanePage, /pendingSendKey/)
  assert.match(livePaperPlanePage, /idempotencyKey:\s*pendingSendKey\.value/)
  assert.match(livePaperPlanePage, /pendingReplyKey/)
  assert.match(livePaperPlanePage, /replyPaperPlane\(p\.id, content, pendingReplyKey\.value\)/)
})
contract('create keys rotate when the exact caller payload snapshot changes', () => {
  assert.match(livePublishPage, /pendingPublishFingerprint/)
  assert.match(livePublishPage, /publishFingerprint\(/)
  assert.match(livePublishPage, /pendingPublishFingerprint\.value != fingerprint/)
  assert.match(livePostDetailPage, /pendingCommentFingerprint/)
  assert.match(livePaperPlanePage, /pendingSendFingerprint/)
  assert.match(livePaperPlanePage, /pendingReplyFingerprint/)
  assert.match(livePaperPlanePage, /discardPendingSendKey\(\)/)
  assert.match(livePaperPlanePage, /discardPendingReplyKey\(\)/)
})
contract('paper-plane reply mutates local state only after business success', () => {
  const replyStart = livePaperPlanePage.indexOf('const reply = async')
  const replyHandler = livePaperPlanePage.slice(replyStart)
  assert.match(replyHandler, /const replyOk = res != null && res\.success && \(res\.data == null \|\| res\.data\.success != false\)/)
  assert.match(replyHandler, /if \(replyOk\) \{[\s\S]*p\.replied = true[\s\S]*p\.replyCount \+= 1/)
})
contract('topic requests invalidate stale load and pagination responses', () => {
  assert.match(liveTopicPage, /const topicLoadSeq = ref\(0\)/)
  assert.match(liveTopicPage, /const seq = topicLoadSeq\.value \+ 1/)
  assert.match(liveTopicPage, /seq != topicLoadSeq\.value/)
  assert.match(liveTopicPage, /const requestedSort = sort\.value/)
  assert.match(liveTopicPage, /const requestedPage = nextPage/)
})
contract('comments fail closed without server certification data', () => {
  const commentStart = liveCommunityApi.indexOf('function mapComment')
  const commentEnd = liveCommunityApi.indexOf('function mapTopic', commentStart)
  const commentMapper = liveCommunityApi.slice(commentStart, commentEnd)
  assert.match(commentMapper, /realNameStatus: 'missing'/)
  assert.doesNotMatch(commentMapper, /realNameStatus: 'passed'/)
})
contract('live HTTP request logging does not include request bodies', () => {
  assert.doesNotMatch(liveRequestApi, /console\.log\('🌐 \[HTTP Request\]', method, url, body\)/)
})

// 无浏览器专属 API（社区关键路径）
const browserApi = /window\.|document\.|localStorage|sessionStorage|querySelector|innerHTML/
const scanTargets = [
  'utils/realNameGate.uts',
  'components/XsaApplySheet.uvue',
  'components/XsaReportSheet.uvue',
  'pages/community/community.uvue',
  'pages/index/index.uvue',
  'pagesSub/userExtra/user/detail.uvue'
]
let browserHits = 0
scanTargets.forEach((p) => {
  if (!exists(p)) return
  const c = read(p)
  if (browserApi.test(c)) {
    browserHits += 1
    fail(`${p} 含浏览器专属 API`)
  }
})
if (browserHits === 0) ok('关键路径无 window/document 等浏览器 API')

console.log('\n12. 第一期治理前端闭环...')
contract('privacy, blocklist and appeal adapters are exported', () => {
  assert.match(liveCommunityApi, /getCommunityPrivacy/)
  assert.match(liveCommunityApi, /updateCommunityPrivacy/)
  assert.match(liveCommunityApi, /getBlockedUsers/)
  assert.match(liveCommunityApi, /createReportAppeal/)
})
contract('settings persists privacy and exposes safety management', () => {
  const settings = read('pagesSub/profileExtra/settings.uvue')
  assert.match(settings, /loadPrivacy/)
  assert.match(settings, /savePrivacy/)
  assert.match(settings, /getBlockedUsers/)
  assert.match(settings, /createReportAppeal/)
})
contract('notifications route by backend target type without post hardcode', () => {
  const page = read('pagesSub/community/notifications.uvue')
  assert.match(liveCommunityApi, /target_type/)
  assert.match(page, /targetType == 'comment'/)
  assert.match(page, /targetType == 'user'/)
  assert.match(page, /targetType == 'report'/)
})
contract('post detail supports threaded cursor comments and reply submission', () => {
  assert.match(livePostDetailPage, /getThreadedComments/)
  assert.match(livePostDetailPage, /getCommentReplies/)
  assert.match(livePostDetailPage, /replyToCommentId/)
  assert.match(livePostDetailPage, /loadMoreComments/)
  assert.match(livePostDetailPage, /removeComment/)
  assert.match(livePostDetailPage, /@longpress="replyTo\(/)
})
contract('threaded comment adapters normalize backend metadata before rendering', () => {
  const mapperStart = liveCommunityApi.indexOf('function mapComment')
  const mapperEnd = liveCommunityApi.indexOf('function mapTopic', mapperStart)
  const mapper = liveCommunityApi.slice(mapperStart, mapperEnd)
  assert.match(mapper, /rootId:\s*row\.root_id/)
  assert.match(mapper, /replyCount:\s*row\.reply_count/)
  assert.match(mapper, /canDelete:\s*row\.can_delete/)
  assert.match(mapper, /replyToUserId:\s*row\.target_user_id/)
  assert.match(liveCommunityApi, /items\.push\(mapComment\(rawItems\[i\]\)\)/)
})
contract('settings sends UTS-compatible privacy payloads and shows appeal history', () => {
  const settings = read('pagesSub/profileExtra/settings.uvue')
  assert.match(settings, /const payload: any = \{\}/)
  assert.match(settings, /payload\[key\] = value/)
  assert.match(settings, /getMyReportAppeals/)
  assert.match(settings, /appeals/)
  assert.match(settings, /appealReason/)
  assert.match(settings, /submitAppeal/)
})

contract('settings reads and writes real profile/message privacy instead of claiming no API', () => {
  const settings = read('pagesSub/profileExtra/settings.uvue')
  // 必须真实读写后端字段
  assert.match(settings, /p\.profile_visibility/)
  assert.match(settings, /p\.message_privacy/)
  assert.match(settings, /profile_visibility' : 'message_privacy'/)
  // 读取成功前不得宣称“所有人”
  assert.match(settings, /let profilePrivacy = ref\(''\)/)
  assert.match(settings, /let messagePrivacy = ref\(''\)/)
  assert.match(settings, /if \(!privacyLoaded\.value\) return '读取中…'/)
  // 失败必须回滚到上一次确认值
  assert.match(settings, /profilePrivacy\.value = previous/)
  assert.match(settings, /messagePrivacy\.value = previous/)
  // 不得再以“接口暂未提供”替代资料/消息权限
  assert.doesNotMatch(settings, /const field = type === 'profile' \? '资料可见性' : '消息权限'/)
  assert.doesNotMatch(settings, /field \+ '接口暂未提供'/)
})
contract('settings keeps notification preferences consistent and recovers failed safety actions', () => {
  const settings = read('pagesSub/profileExtra/settings.uvue')
  assert.match(settings, /p\.notify_message/)
  assert.match(settings, /savePrivacy\('notify_message'/)
  assert.match(settings, /try \{[\s\S]*await updateCommunityPrivacy\(payload\)[\s\S]*\} catch \(e\) \{[\s\S]*rollback\(\)/)
  assert.match(settings, /blockedLoading/)
  assert.match(settings, /blockedError/)
  assert.match(settings, /recordsLoading/)
  assert.match(settings, /recordsError/)
  assert.match(settings, /unblockingIds/)
  assert.match(settings, /appealSubmitting/)
})
contract('settings separates v-else from v-for and normalizes blocked user ids', () => {
  const settings = read('pagesSub/profileExtra/settings.uvue')
  assert.doesNotMatch(settings, /v-else\s+v-for=/)
  assert.match(settings, /<view v-else>/)
  assert.match(liveCommunityApi, /function mapBlockedUser/)
  assert.match(liveCommunityApi, /id: row\.id != null \? row\.id : row\.user_id/)
})
contract('threaded comments map each backend root exactly once', () => {
  const start = liveCommunityApi.indexOf('export async function getThreadedComments')
  const end = liveCommunityApi.indexOf('export async function getCommentReplies', start)
  const threaded = liveCommunityApi.slice(start, end)
  assert.doesNotMatch(threaded, /items\.push\(mapComment\(rawItems\[i\]\)\)/)
  assert.match(threaded, /const comment = mapComment\(rawItems\[i\]\)/)
  assert.match(threaded, /items\.push\(comment\)/)
})
contract('notification and activity pages show retryable unavailable states', () => {
  const notifications = read('pagesSub/community/notifications.uvue')
  const activity = read('pagesSub/community/activity-detail.uvue')
  assert.match(notifications, /notificationError/)
  assert.match(notifications, /show-action/)
  assert.match(notifications, /@action="load"/)
  assert.match(activity, /activityLoading/)
  assert.match(activity, /activityError/)
  assert.match(activity, /show-action/)
})
contract('governance notification opens the registered settings destination', () => {
  const page = read('pagesSub/community/notifications.uvue')
  assert.match(page, /navigateTo\(\{ url: '\/pagesSub\/profileExtra\/settings' \}\)/)
})

console.log('\n====================================')
if (failed === 0) {
  console.log('社区闭环静态校验全部通过')
  process.exit(0)
} else {
  console.log(`社区闭环静态校验失败：${failed} 项`)
  process.exit(1)
}
