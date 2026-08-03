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
assert.match(communityPage, /snapshotCursor/, '喜欢列表第 2 页及以后必须传 snapshotCursor')
assert.match(communityPage, /quoteRelationUnlock/, '单条解锁第一步之后必须先 quote')
assert.match(communityPage, /confirmRelationUnlock/, '单条解锁确认必须调用 confirm')
assert.match(communityPage, /alreadyUnlocked/, 'quote 已解锁时不得继续 confirm')
assert.match(communityPage, /likes_unlock_one/, '喜欢单条解锁必须使用 likes_unlock_one')
assert.match(communityPage, /viewers_unlock_one/, '访客单条解锁必须使用 viewers_unlock_one')
assert.doesNotMatch(communityPage, /\/miniapp\/asset\/unlock['"`]/, '喜欢/访客单条解锁不得调用旧 asset unlock 接口')
assert.match(communityPage, /getPendingMatchPopup/, '心动页必须查询待展示匹配弹层')
assert.match(communityPage, /markMatchPopupRead/, '匹配弹层发生用户动作后必须 read')

assert.match(mutualPage, /getMutualMatches/, '相互喜欢页必须调用真实相互喜欢接口')
assert.doesNotMatch(mutualPage, /Array\.from\(\{ length: 4 \}/, '相互喜欢页不得继续使用 4 人静态数组')

assert.match(userPage, /sendRelationLike/, '用户主页喜欢按钮必须调用真实喜欢接口')
assert.match(userPage, /cancelRelationLike/, '用户主页取消喜欢必须调用真实取消接口')
assert.match(userPage, /reportRelationVisit/, '用户主页主体展示后必须上报访问')
assert.match(userPage, /sourceScene/, '用户主页必须携带来源场景')
assert.match(userPage, /eventNo/, '用户主页访问上报必须使用稳定 eventNo')

assert.match(packageJson, /validate-relation-feedback-miniapp-closure\.mjs/, '关系反馈闭环门禁必须接入构建脚本')

console.log('关系反馈与互动链路小程序闭环门禁通过')
