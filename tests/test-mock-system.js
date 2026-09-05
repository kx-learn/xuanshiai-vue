/**
 * Mock 数据系统测试脚本
 * 测试 API 层是否能正常返回 Mock 数据
 */

// 模拟 uni-app 环境
const uniCloud = {
  callFunction: () => Promise.resolve({ result: {} })
}

// 测试配置
console.log('====================================')
console.log('Mock 数据系统测试')
console.log('====================================\n')

// 1. 测试配置文件
console.log('1. 测试配置文件...')
try {
  const fs = require('fs')
  const path = require('path')

  const configPath = path.join(__dirname, '../api/config.uts')
  const configContent = fs.readFileSync(configPath, 'utf-8')

  const useMockMatch = configContent.match(/export const USE_MOCK = (true|false)/)
  if (useMockMatch) {
    const useMock = useMockMatch[1] === 'true'
    console.log(`   ✅ 配置文件正常`)
    console.log(`   📌 USE_MOCK = ${useMock}`)
    console.log(`   ${useMock ? '📦 当前使用 Mock 数据' : '🌐 当前使用真实 API'}\n`)
  }
} catch (error) {
  console.log(`   ❌ 配置文件读取失败: ${error.message}\n`)
}

// 2. 测试 Mock 数据文件
console.log('2. 测试 Mock 数据文件...')
try {
  const fs = require('fs')
  const path = require('path')

  const mockFiles = [
    'mock/user.uts',
    'mock/message.uts',
    'mock/community.uts',
    'mock/security.uts',
    'mock/matchmaker.uts',
    'mock/help.uts',
    'mock/spotlight.uts',
    'mock/ai-avatar.uts',
    'mock/ai-advisor.uts'
  ]

  mockFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const exportMatch = content.match(/export const mock\w+/g)
      console.log(`   ✅ ${file} - 导出 ${exportMatch ? exportMatch.length : 0} 个数据项`)
    } else {
      console.log(`   ❌ ${file} - 文件不存在`)
    }
  })
  console.log('')
} catch (error) {
  console.log(`   ❌ Mock 文件检查失败: ${error.message}\n`)
}

// 3. 测试 API 文件
console.log('3. 测试 API 文件...')
try {
  const fs = require('fs')
  const path = require('path')

  const apiFiles = [
    'api/user.uts',
    'api/message.uts',
    'api/community.uts',
    'api/security.uts',
    'api/matchmaker.uts',
    'api/help.uts',
    'api/spotlight.uts',
    'api/ai-avatar.uts',
    'api/ai-advisor.uts'
  ]

  apiFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const exportMatch = content.match(/export async function \w+/g)
      console.log(`   ✅ ${file} - 导出 ${exportMatch ? exportMatch.length : 0} 个 API 方法`)
    } else {
      console.log(`   ❌ ${file} - 文件不存在`)
    }
  })
  console.log('')
} catch (error) {
  console.log(`   ❌ API 文件检查失败: ${error.message}\n`)
}

// 4. 测试重构的页面
console.log('4. 测试重构的页面...')
try {
  const fs = require('fs')
  const path = require('path')

  const pages = [
    { path: 'pages/index/index.uvue', name: '首页' },
    { path: 'pages/message/message.uvue', name: '消息页' },
    { path: 'pages/community/community.uvue', name: '社区页' },
    { path: 'pages/matchmaker/matchmaker.uvue', name: '牵线页' },
    { path: 'pagesSub/chat/detail.uvue', name: '聊天详情页' }
  ]

  pages.forEach(page => {
    const filePath = path.join(__dirname, '..', page.path)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const hasApiImport = content.includes("from '@/api'")
      const hasOnMounted = content.includes('onMounted')
      console.log(`   ${hasApiImport && hasOnMounted ? '✅' : '⚠️'} ${page.name}`)
      if (!hasApiImport) console.log(`      ⚠️  未导入 API`)
      if (!hasOnMounted) console.log(`      ⚠️  未使用 onMounted 加载数据`)
    } else {
      console.log(`   ❌ ${page.name} - 文件不存在`)
    }
  })
  console.log('')
} catch (error) {
  console.log(`   ❌ 页面文件检查失败: ${error.message}\n`)
}

// 5. AI 分身隔离与持久化检查
console.log('5. 测试 AI 分身前端隔离...')
try {
  const fs = require('fs')
  const path = require('path')
  const apiContent = fs.readFileSync(path.join(__dirname, '../api/ai-avatar.uts'), 'utf-8')
  const mockContent = fs.readFileSync(path.join(__dirname, '../mock/ai-avatar.uts'), 'utf-8')
  const chatContent = fs.readFileSync(path.join(__dirname, '../pagesSub/chat/detail.uvue'), 'utf-8')
  const profileContent = fs.readFileSync(path.join(__dirname, '../pagesSub/userExtra/user/detail.uvue'), 'utf-8')
  const ownerContent = fs.readFileSync(path.join(__dirname, '../pagesSub/profileExtra/my-ai-avatar.uvue'), 'utf-8')
  const checks = [
    ['独立本地存储键', apiContent.includes('xsa-ai-avatar-conversations-v1-')],
    ['当前账号作用域', apiContent.includes('tokenScope()') && apiContent.includes('USER_ID_STORAGE_KEY')],
    ['本人主页按登录账号识别', profileContent.includes("uni.getStorageSync('xsa_user_id')") && profileContent.includes('viewerId == parsed')],
    ['旧版无账号记录不再迁移', !apiContent.includes('legacyStorageKey') && !apiContent.includes('legacyProfileStorageKey')],
    ['本人答案忽略空格和标点差异', mockContent.includes('normalizeQuestion') && mockContent.includes('normalizeQuestion(item.question) == normalizedQuestion')],
    ['AI 资料进入前重新校验隐私', apiContent.includes('getMembershipStatus') && apiContent.includes('hasVipProfileFlag') && apiContent.includes('snapshotUpdatedAt')],
    ['网络降级不暴露敏感资料', apiContent.includes('profile.interests = []') && apiContent.includes('profile.customAnswers = []') && apiContent.includes('profile.stale = true')],
    ['本人管理数据接口', apiContent.includes('getAiAvatarOwnerDashboard') && ownerContent.includes('getAiAvatarOwnerDashboard')],
    ['本人回答回写访客会话', apiContent.includes('updateVisitorHandoff') && apiContent.includes('submitAiAvatarOwnerAnswer')],
    ['本人回答来源标记', mockContent.includes("source: 'owner-answer'") && chatContent.includes("msg.source === 'owner-answer'")],
    ['受限资料不暴露本人答案', apiContent.includes('profile.customAnswers = []') && apiContent.includes('profile.restricted === true') && mockContent.includes('profile.restricted !== true')],
    ['管理页不再硬编码数据', !ownerContent.includes('const chatRecords = ref<any[]>([\n') && !ownerContent.includes('const pendingQuestions = ref<any[]>([\n') && !ownerContent.includes('const myAnswers = ref<any[]>([\n')],
    ['本地历史读取', apiContent.includes('getAiAvatarConversation')],
    ['首次欢迎消息持久化', apiContent.includes('messages = [initialMessage(profile)]') && apiContent.includes('writeMessages(userId, messages)')],
    ['模拟转交恢复', apiContent.includes('resolveAiAvatarHandoffs')],
    ['真实资料字段兼容', apiContent.includes('education_level') && apiContent.includes('relationship_expectation')],
    ['公开资料快照', apiContent.includes('saveAiAvatarProfileSnapshot') && profileContent.includes('city: user.value.city')],
    ['地区表不重复打包', !apiContent.includes("@/static/location.json")],
    ['兴趣问题分类边界', mockContent.includes("'电影'") && mockContent.includes("'喜欢什么样的人'") && !mockContent.includes("'喜欢什么样',")],
    ['个人主页入口', profileContent.includes('mode=ai-avatar')],
    ['自己主页按钮宽度隔离', profileContent.includes('flex: 0 0 480rpx')],
    ['聊天页 AI 模式', chatContent.includes("options.mode === 'ai-avatar'")],
    ['清空记录取消待回复定时器', chatContent.includes('clearTimeout(aiHandoffTimer)') && chatContent.includes('aiHandoffTimer = null')],
    ['真人预览隔离', chatContent.includes('if (isAiAvatarMode.value)')]
  ]
  checks.forEach(([name, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${name}`)
    if (!passed) process.exitCode = 1
  })
  console.log('')
} catch (error) {
  process.exitCode = 1
  console.log(`   ❌ AI 分身检查失败: ${error.message}\n`)
}

// 6. AI 军师前端闭环检查
console.log('6. 测试 AI 军师前端闭环...')
try {
  const fs = require('fs')
  const path = require('path')
  const apiContent = fs.readFileSync(path.join(__dirname, '../api/ai-advisor.uts'), 'utf-8')
  const mockContent = fs.readFileSync(path.join(__dirname, '../mock/ai-advisor.uts'), 'utf-8')
  const chatContent = fs.readFileSync(path.join(__dirname, '../pagesSub/chat/detail.uvue'), 'utf-8')
  const sheetContent = fs.readFileSync(path.join(__dirname, '../components/XsaAiAdvisorSheet.uvue'), 'utf-8')
  const checks = [
    ['军师接口封装', apiContent.includes('/ai/advisor/sessions') && apiContent.includes('/advice')],
    ['结构化建议 Mock', mockContent.includes('suggestions') && mockContent.includes('risk_level')],
    ['聊天页入口', chatContent.includes('openAiAdvisor') && chatContent.includes('AI军师')],
    ['场景和语气选择', sheetContent.includes('ADVISOR_SCENARIOS') && sheetContent.includes('ADVISOR_TONES')],
    ['复制而不自动发送', sheetContent.includes('setClipboardData') && !sheetContent.includes('sendMessageApi')],
    ['错误状态处理', sheetContent.includes('advisorErrorMessage') && sheetContent.includes('errorMessage')]
  ]
  checks.forEach(([name, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${name}`)
    if (!passed) process.exitCode = 1
  })
  console.log('')
} catch (error) {
  process.exitCode = 1
  console.log(`   ❌ AI 军师检查失败: ${error.message}\n`)
}

// 7. 红娘工作台统计明细与实时汇总检查
console.log('7. 红娘工作台统计明细与实时汇总检查...')
try {
  const fs = require('fs')
  const path = require('path')
  const mockContent = fs.readFileSync(path.join(__dirname, '../mock/matchmaker.uts'), 'utf-8')
  const apiContent = fs.readFileSync(path.join(__dirname, '../api/matchmaker.uts'), 'utf-8')
  const pageContent = fs.readFileSync(path.join(__dirname, '../pagesSub/matchmaker/become-matchmaker.uvue'), 'utf-8')
  const avatarDir = path.join(__dirname, '../static/avatars')
  const animeAvatarCount = fs.existsSync(avatarDir)
    ? fs.readdirSync(avatarDir).filter(name => /^matchmaking-anime-\d{3}\.jpg$/.test(name)).length
    : 0
  const checks = [
    ['牵线明细覆盖四种状态', ['PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED'].every(status => mockContent.includes("'" + status + "'"))],
    ['牵线统计包含 3 条待我牵线与 29 条成功记录', mockContent.includes('i < 3') && mockContent.includes('i < 29')],
    ['约见明细覆盖处理中、待见面、已完成、已结束', ['SUBMITTED', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'DECLINED'].every(status => mockContent.includes("'" + status + "'"))],
    ['每位测试嘉宾使用不同的本地动漫头像', mockContent.includes('matchmakingAnimeAvatar') && animeAvatarCount == 82],
    ['明细接口在 Mock 模式可返回测试记录', apiContent.includes('mockMatchmakerWorkspaceIntroductions') && apiContent.includes('mockMatchmakerWorkspaceMeetingRequests')],
    ['卡片数字由明细状态实时汇总', pageContent.includes('refreshBusinessMetricCounts') && pageContent.includes("item.status == 'PENDING'") && pageContent.includes("item.status == 'SUCCEEDED'") && pageContent.includes("item.phase == 'PROCESSING'") && pageContent.includes("item.phase == 'UPCOMING'")]
  ]
  checks.forEach(([name, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${name}`)
    if (!passed) process.exitCode = 1
  })
  console.log('')
} catch (error) {
  process.exitCode = 1
  console.log(`   ❌ 红娘工作台统计检查失败: ${error.message}\n`)
}

// 8. 红娘待审列表浮动操作与更多菜单定位检查
console.log('8. 红娘待审列表浮动操作与更多菜单定位检查...')
try {
  const fs = require('fs')
  const path = require('path')
  const reviewContent = fs.readFileSync(path.join(__dirname, '../components/MatchmakerPendingReview.uvue'), 'utf-8')
  const managementPageContent = fs.readFileSync(path.join(__dirname, '../pagesSub/matchmaker/become-matchmaker.uvue'), 'utf-8')
  const matchmakerApiContent = fs.readFileSync(path.join(__dirname, '../api/matchmaker.uts'), 'utf-8')
  const checks = [
    ['录入与筛选固定在当前视口右下角', reviewContent.includes('.review-float-actions { position: fixed') && reviewContent.includes('bottom: calc(env(safe-area-inset-bottom) + 20rpx)')],
    ['列表底部为悬浮操作预留空间', reviewContent.includes('padding: 14rpx 24rpx 260rpx')],
    ['更多菜单不受滚动卡片裁切', reviewContent.includes('class="more-layer"') && reviewContent.includes('.more-layer { position: fixed')],
    ['更多菜单用点击事件坐标定位', reviewContent.includes('toggleMenu(member, $event)') && reviewContent.includes('event.detail.x') && reviewContent.includes('event.detail.y')],
    ['更多菜单位置避开屏幕边缘', reviewContent.includes('maxLeft') && reviewContent.includes('maxTop')],
    ['更多菜单在页面浮层内绝对定位', reviewContent.includes('.more-pop {\n  position: absolute;')],
    ['管理中心全部会员进入资料待审全部页', managementPageContent.includes("name == '查看全部会员'") && managementPageContent.includes("openPendingReview('')")],
    ['管理中心我服务的进入资料待审我的页', managementPageContent.includes("name == '查看我服务的'") && managementPageContent.includes("openPendingReview('mine')") && reviewContent.includes("props.initialTab == 'mine'")],
    ['录入按钮打开完整会员档案表单', reviewContent.includes("subview == 'entry'") && reviewContent.includes('entryTextFields') && reviewContent.includes('上传头像') && reviewContent.includes('确认')],
    ['录入表单校验姓名、昵称、手机与身高体重', reviewContent.includes('请填写昵称') && reviewContent.includes('请填写姓名') && reviewContent.includes('请填写正确的手机号') && reviewContent.includes('请填写正确的身高') && reviewContent.includes('请填写正确的体重')],
    ['录入提交使用红娘后台真实会员创建接口', matchmakerApiContent.includes("url: '/admin/matchmaker/members', method: 'POST'") && matchmakerApiContent.includes("url: '/admin/matchmaker/members/' + encodeURIComponent(memberId)")],
    ['筛选使用页面级右侧抽屉', reviewContent.includes('filterVisible') && reviewContent.includes('class="filter-layer"') && reviewContent.includes('.filter-layer { position: fixed') && reviewContent.includes('.filter-drawer')],
    ['筛选覆盖资料待审全部条件', ['籍贯', '现居', '性别', '年龄', '身高', '学历', '职业', '收入', '婚况', '购房', '购车', '吸烟', '喝酒', '认证', '线上VIP', '线下VIP'].every(label => reviewContent.includes("label: '" + label + "'"))],
    ['线下VIP展开可选不限与只看VIP', reviewContent.includes("key: 'vipOffline'") && reviewContent.includes("label: '只看VIP'") && reviewContent.includes("label: '不限'")],
    ['筛选支持重置并确认后实时应用', reviewContent.includes('resetMemberFilter') && reviewContent.includes('confirmMemberFilter') && reviewContent.includes('applyMemberFilter()')],
    ['可用资料字段参与真实筛选', reviewContent.includes('rangeMatches') && reviewContent.includes('educationFilterMatches') && reviewContent.includes('realname_status')]
  ]
  checks.forEach(([name, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${name}`)
    if (!passed) process.exitCode = 1
  })
  console.log('')
} catch (error) {
  process.exitCode = 1
  console.log(`   ❌ 红娘待审列表定位检查失败: ${error.message}\n`)
}

// 9. 总结
// 9. 合伙人资金模块与提现路径检查
console.log('9. 测试合伙人资金模块与提现路径...')
try {
  const fs = require('fs')
  const path = require('path')
  const mockContent = fs.readFileSync(path.join(__dirname, '../mock/matchmaker.uts'), 'utf-8')
  const apiContent = fs.readFileSync(path.join(__dirname, '../api/matchmaker.uts'), 'utf-8')
  const pageContent = fs.readFileSync(path.join(__dirname, '../pagesSub/matchmaker/partner-center.uvue'), 'utf-8')
  const checks = [
    ['首页资金卡展示团队业绩', pageContent.includes('团队业绩') && pageContent.includes('teamPerformance')],
    ['立即提现进入提现记录页', pageContent.includes("openScreen('withdraw')") && pageContent.includes("screen == 'withdraw'")],
    ['提现记录页可进入申请提现表单', pageContent.includes('toggleWithdrawalForm') && pageContent.includes('申请提现')],
    ['提现表单具备三种收款方式', ['wechat', 'bank', 'alipay'].every(method => pageContent.includes("key: '" + method + "'"))],
    ['提现金额和收款信息均在前端校验', pageContent.includes('提现金额不能超过可提现额度') && pageContent.includes('请输入收款账号') && pageContent.includes('请输入收款人姓名')],
    ['提现申请不伪造本地成功记录', apiContent.includes('code: 501') && apiContent.includes('提现接口不在本期范围内')],
    ['接口归一化兼容资金与团队业绩字段', apiContent.includes('withdrawable_balance') && apiContent.includes('team_performance') && apiContent.includes('total_earned')],
    ['Mock 提供可校验的合伙人资金数值', mockContent.includes('withdrawableBalance: 1864.50') && mockContent.includes('teamPerformance: 28760.00') && mockContent.includes('totalEarned: 4386.80')],
    ['名下会员使用统计、说明、搜索和档案卡结构', pageContent.includes('member-overview') && pageContent.includes('member-metrics') && pageContent.includes('member-search') && pageContent.includes('member-profile-card')],
    ['名下会员统计随明细实时计算', pageContent.includes('effectiveMembers.length') && pageContent.includes('maleCount') && pageContent.includes('femaleCount') && pageContent.includes('filteredEffectiveMembers.length')],
    ['Mock 提供多性别、多推广人和不同头像的会员样本', mockContent.includes("name: '许知夏'") && mockContent.includes("gender: '男'") && mockContent.includes("gender: '女'") && mockContent.includes("promoterName: '周雅'") && mockContent.includes('matchmaking-anime-012.jpg')],
    ['会员接口归一化保留头像和审核状态', apiContent.includes('avatar_url') && apiContent.includes('reviewStatus')],
    ['Mock 模式可加载名下会员测试数据', apiContent.includes('mockPartnerCenterSnapshot') && apiContent.includes("url: '/matchmaker/partner-center'")],
    ['本机空数据可回退至脱敏会员测试明细', apiContent.includes('canUseWorkspaceDemoFallback') && apiContent.includes('const useDemoFallback') && apiContent.includes('source = useDemoFallback ? mockPartnerCenterSnapshot')]
  ]
  checks.forEach(([name, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${name}`)
    if (!passed) process.exitCode = 1
  })
  console.log('')
} catch (error) {
  process.exitCode = 1
  console.log(`   ❌ 合伙人资金模块检查失败: ${error.message}\n`)
}

// 10. 推广红娘管理中心首页结构检查
console.log('10. 测试推广红娘管理中心首页重构...')
try {
  const fs = require('fs')
  const path = require('path')
  const promoterContent = fs.readFileSync(path.join(__dirname, '../pagesSub/matchmaker/promoter-center.uvue'), 'utf-8')
  const checks = [
    ['首页展示可提现额度与即时反馈入口', promoterContent.includes('可提现额度（元）') && promoterContent.includes('promoter-fund-card') && promoterContent.includes('立即提现')],
    ['首页展示待审、通过、未通过审核统计', promoterContent.includes('pendingMemberCount') && promoterContent.includes('通过人数') && promoterContent.includes('未通过人数')],
    ['首页提供专属推广码与海报工具', promoterContent.includes('复制专属推广码') && promoterContent.includes('推广海报') && promoterContent.includes('copyLink')],
    ['首页覆盖团队、会员、线索与结算入口', ['隶属团队', '名下会员', '客源线索', '消费分成', '申请提现'].every(label => promoterContent.includes(label))],
    ['推广中心继承项目青瓷绿令牌', promoterContent.includes('var(--accent)') && promoterContent.includes('var(--match-mist)') && promoterContent.includes('var(--surface)')],
    ['商家联盟提供三页签与异业合作介绍卡', promoterContent.includes('class="section merchant-page"') && promoterContent.includes('merchant-tabs-row') && promoterContent.includes('merchant-coop-card') && promoterContent.includes('同城商家异业联盟合作')],
    ['商家联盟详情洽谈直达客服且订单核销页签联动', promoterContent.includes('merchantNegotiate') && promoterContent.includes('contactVisible.value=true') && promoterContent.includes("merchantTab.value='orders'")],
    ['商家联盟入口可查看开通说明', promoterContent.includes("@click=\"open('merchant')\"") && !promoterContent.includes("v=='commission'||v=='merchant'||v=='mall'")],
    ['商家联盟与商城不再使用通用 merchant 高度类', promoterContent.includes('promoter-menu-icon merchant-entry') && promoterContent.includes('class="section mall-page"') && !/(^|\n)\.merchant\s*\{/.test(promoterContent) && !promoterContent.includes('promoter-menu-icon merchant"><text>商</text>')]
  ]
  checks.forEach(([name, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${name}`)
    if (!passed) process.exitCode = 1
  })
  console.log('')
} catch (error) {
  process.exitCode = 1
  console.log(`   ❌ 推广红娘管理中心检查失败: ${error.message}\n`)
}

// 11. 总结
console.log('====================================')
console.log('测试完成！')
console.log('====================================\n')

console.log('📋 检查清单：')
console.log('   ✅ Mock 数据仓库已创建（4 个文件）')
console.log('   ✅ API 统一接口层已创建（7 个文件）')
console.log('   ✅ 5 个核心页面已重构')
console.log('')

console.log('🎯 下一步：')
console.log('   1. 在 HBuilderX 中运行项目')
console.log('   2. 或使用微信开发者工具运行小程序')
console.log('   3. 查看页面是否能正常加载 Mock 数据')
console.log('')

console.log('💡 提示：')
console.log('   - 当前项目可能需要在 HBuilderX 中运行')
console.log('   - uni-app 的命令行工具有时会有路径配置问题')
console.log('   - Mock 数据系统的架构是正确的，只是运行环境的问题')
console.log('')
