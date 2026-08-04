/* eslint-env node */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(rootDir, relativePath), 'utf8')

const relationService = read('src/services/relation.ts')
const communityPage = read('src/pages/community/index.tsx')
const mutualPage = read('src/pages/heart/mutual.tsx')
const userPage = read('src/pages/heart/user.tsx')
const requestService = read('src/services/request.ts')
const config = read('src/constants/config.ts')
const relationFlow = read('src/domain/relationFeedbackFlow.ts')
const packageJson = read('package.json')

const requiredServiceCalls = [
  '/miniapp/relation/likes-me',
  '/miniapp/relation/recent-viewers',
  '/miniapp/relation/mutual-matches',
  '/miniapp/relation/likes',
  '/miniapp/relation/visits',
  '/miniapp/relation/match-popup/pending',
  '/miniapp/asset/unlock/quote',
  '/miniapp/asset/unlock/confirm',
]

for (const endpoint of requiredServiceCalls) {
  assert.match(relationService, new RegExp(endpoint.replaceAll('/', '\\/')), `关系服务缺少真实接口 ${endpoint}`)
}

assert.match(relationService, /markLikesMeRead/, '关系服务必须封装喜欢我的已读确认接口')
assert.match(relationService, /markMatchPopupRead/, '关系服务必须封装匹配弹层动作回执接口')
assert.match(relationService, /deleteRelationLike|cancelRelationLike/, '关系服务必须封装取消喜欢接口')

assert.match(communityPage, /getLikesMePage/, '心动页必须调用喜欢我的真实列表接口')
assert.match(communityPage, /getRecentViewersPage/, '心动页必须调用最近访客真实列表接口')
assert.match(communityPage, /markLikesMeRead/, '心动页必须在首屏渲染后确认 readCursor')
assert.match(communityPage, /Taro\.nextTick/, '喜欢我的已读确认必须发生在首屏渲染后')
assert.match(communityPage, /snapshotCursor/, '喜欢列表第 2 页及以后必须传 snapshotCursor')
assert.match(communityPage, /quoteRelationUnlock/, '单条解锁第一步之后必须先 quote')
assert.match(communityPage, /confirmRelationUnlock/, '单条解锁确认必须调用 confirm')
assert.match(communityPage, /alreadyUnlocked/, 'quote 已解锁时不得继续 confirm')
assert.match(communityPage, /likes_unlock_one/, '喜欢单条解锁必须使用 likes_unlock_one')
assert.match(communityPage, /viewers_unlock_one/, '访客单条解锁必须使用 viewers_unlock_one')
assert.doesNotMatch(communityPage, /\/miniapp\/asset\/unlock['"`]/, '喜欢/访客单条解锁不得调用旧 asset unlock 接口')
assert.match(communityPage, /getPendingMatchPopup/, '心动页必须查询待展示匹配弹层')
assert.match(communityPage, /markMatchPopupRead/, '匹配弹层发生用户动作后必须 read')
assert.match(communityPage, /await markMatchPopupRead/, '匹配弹层必须等待 read 成功后再关闭或跳转')
assert.ok(
  communityPage.indexOf('await markMatchPopupRead') < communityPage.indexOf('setMatchPopup(null)'),
  '匹配弹层不得先关闭再异步确认动作',
)
assert.doesNotMatch(communityPage, /fallbackLikes|fallbackVisitors|router\.params\.member/, '心动页不得使用假数据或 URL 会员覆盖')
assert.match(communityPage, /relation-loading-state|state="loading"/, '心动页必须提供加载态')
assert.match(communityPage, /relation-empty-state|state="empty"/, '心动页必须提供空态')
assert.match(communityPage, /relation-error-state|state="error"/, '心动页必须提供错误重试态')
assert.match(communityPage, /ensureUnlockAttempt/, '解锁确认必须复用稳定 requestId')
assert.match(communityPage, /getApiErrorCode\(error\) === 5001/, '解锁错误必须使用业务错误码分支')
assert.doesNotMatch(communityPage, /\/余额\|5001\//, '解锁错误不得通过文案正则猜测')

assert.match(mutualPage, /getMutualMatches/, '相互喜欢页必须调用真实相互喜欢接口')
assert.doesNotMatch(mutualPage, /Array\.from\(\{ length: 4 \}/, '相互喜欢页不得继续使用 4 人静态数组')
assert.doesNotMatch(mutualPage, /fallbackPeople|MAT-DEMO/, '相互喜欢页不得使用兜底假用户')
assert.match(mutualPage, /mutual-empty-state/, '相互喜欢页必须提供真实空态')
assert.match(mutualPage, /mutual-error-state/, '相互喜欢页必须提供错误重试态')
assert.match(mutualPage, /page\.current \+ 1/, '相互喜欢页必须支持真实分页')

assert.match(userPage, /sendRelationLike/, '用户主页喜欢按钮必须调用真实喜欢接口')
assert.match(userPage, /cancelRelationLike/, '用户主页取消喜欢必须调用真实取消接口')
assert.match(userPage, /reportRelationVisit/, '用户主页主体展示后必须上报访问')
assert.match(userPage, /sourceScene/, '用户主页必须携带来源场景')
assert.match(userPage, /eventNo/, '用户主页访问上报必须使用稳定 eventNo')
assert.match(userPage, /getPublicProfile/, '用户主页必须调用真实公开资料接口')
assert.ok(
  userPage.indexOf('const data = await getPublicProfile') < userPage.indexOf('await reportRelationVisit'),
  '用户主页必须在公开资料加载成功后上报访问',
)
assert.match(userPage, /private-chat\?conversationNo=/, '匹配用户必须跳转真实私聊页面')

assert.match(requestService, /class ApiBusinessError/, '统一请求错误必须保留业务错误类型')
assert.match(requestService, /this\.code = code/, '统一请求错误必须保留后端业务码')
assert.match(config, /resolveRelationApiBaseUrl/, 'API 地址必须通过安全解析函数选择')
assert.match(relationFlow, /127\\\.0\\\.0\\\.1\|localhost/, 'E2E API 覆盖只能允许本机回环地址')
assert.match(relationFlow, /normalized > 99 \? '99\+'/, '关系徽标超过 99 必须显示 99+')

assert.match(packageJson, /validate-relation-feedback-miniapp-closure\.mjs/, '关系反馈闭环门禁必须接入构建脚本')
assert.match(packageJson, /test-relation-feedback-flow\.cjs/, '关系反馈领域测试必须接入构建脚本')

console.log('关系反馈与互动链路小程序闭环门禁通过')
