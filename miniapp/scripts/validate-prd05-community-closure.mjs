import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = relativePath => readFileSync(resolve(root, relativePath), 'utf8')

const service = read('src/services/community.ts')
const compose = read('src/pages/qianxun/compose.tsx')
const interactions = read('src/pages/qianxun/interactions.tsx')
const myPosts = read('src/pages/qianxun/my-posts.tsx')
const postDetail = read('src/pages/qianxun/post-detail.tsx')
const topicDetail = read('src/pages/qianxun/topic.tsx')
const family = read('src/features/qianxun/QianxunFamilyPage.tsx')
const zhiyin = read('src/features/qianxun/QianxunZhiyinTab.tsx')
const heartUser = read('src/pages/heart/user.tsx')
const topics = read('src/pages/qianxun/topics.tsx')
const topicSpotlight = read('src/features/qianxun/QianxunTopicSpotlight.tsx')

const apiContracts = [
  'getCommunityMeta',
  'getCommunityDraft',
  'saveCommunityDraft',
  'deleteCommunityDraft',
  'getMyCommunityPosts',
  'getCommunityInteractions',
  'getCommunityViewHistory',
  'recordCommunityView',
  'toggleCommunityCommentLike',
  'getCommunityFollowRelations',
  'getCommunityPostInteractors',
  'hideCommunityAuthor',
  'unhideCommunityAuthor',
  'reportCommunityTarget',
]

for (const contract of apiContracts) {
  assert.match(service, new RegExp(`export (?:const|function) ${contract}\\b`), `缺少社区真实接口：${contract}`)
}

assert.match(service, /interface CommunityPublishResultVO[\s\S]*postNo[\s\S]*status[\s\S]*statusName[\s\S]*message/, '发布结果必须包含 postNo/status/statusName/message')
assert.match(service, /interface CommunityDraftVO/, '缺少服务端草稿模型')
assert.match(service, /interface CommunityInteractionRecordVO/, '缺少服务端互动历史模型')
assert.match(service, /interface CommunityRelationUserVO/, '缺少关注粉丝/互动用户模型')
assert.match(service, /export const COMMUNITY_COPY_KEYS\b/, '社区动态文案必须使用稳定 copy key')
assert.match(service, /export function resolveCommunityCopy\b/, '社区动态文案必须统一从 meta\.copy 解析')
assert.match(service, /export function resolveCommunityFeedback\b/, '社区接口错误必须优先消费服务端 message，缺失时读 meta\.copy')

for (const status of ['queued', 'uploading', 'success', 'failed']) {
  assert.match(compose, new RegExp(`['\"]${status}['\"]`), `发布页缺少单图 ${status} 状态`)
}
assert.match(compose, /saveCommunityDraft/, '发布页必须自动保存服务端草稿')
assert.match(compose, /getCommunityDraft/, '发布页必须恢复服务端草稿')
assert.match(compose, /deleteCommunityDraft/, '发布或放弃后必须清除服务端草稿')
assert.match(compose, /CommunityPublishResultVO|publishResult/, '发布页必须消费服务端真实发布结果')

const businessStorageKeys = [
  'qianxun_my_post_receipts',
  'qianxun_interaction_history',
  'qianxun_browsing_history',
  'qianxun_hidden_post_ids',
  'qianxun_hidden_sincere_post_ids',
]
const businessSources = [compose, interactions, myPosts, family, zhiyin]
for (const key of businessStorageKeys) {
  for (const source of businessSources) {
    assert.doesNotMatch(source, new RegExp(key), `业务事实仍由本地 Storage 替代：${key}`)
  }
}

assert.match(interactions, /getCommunityInteractions/, '互动中心必须读取服务端互动历史')
assert.match(interactions, /getCommunityInteractions\('viewed',\s*1,\s*50\)/, '互动中心必须读取包含真实浏览时间的 viewed 互动历史')
assert.doesNotMatch(interactions, /getCommunityViewHistory/, '互动中心不得继续消费缺少浏览时间的扁平浏览列表')
assert.match(interactions, /interactionTime:\s*item\.interactionTime/, '互动中心必须保留服务端互动时间')
assert.match(interactions, /post:\s*item\.post/, '互动中心必须保留服务端关联动态')
assert.match(interactions, /clearCommunityViewHistory/, '互动中心清空浏览记录必须调用服务端')
assert.match(interactions, /确定清空浏览记录吗/, '清空浏览记录必须二次确认')
assert.match(interactions, /getCommunityFollowRelations/, '关注粉丝必须读取服务端')
assert.match(myPosts, /getMyCommunityPosts/, '我的动态必须读取服务端')
assert.match(heartUser, /getUserCommunityPosts/, '他人主页个人动态必须读取服务端')
assert.match(heartUser, /getCommunityMeta/, '他人主页举报原因必须读取社区字典')
assert.match(heartUser, /reportCommunityTarget\('user'/, '他人主页举报必须按 user 对象提交真实接口')
assert.doesNotMatch(heartUser, /2 \u5c0f\u65f6\u524d · \u516c开动态/, '他人主页不得保留静态动态时间')
assert.match(family, /hideCommunityAuthor/, '成家信息流隐藏作者必须写服务端')
assert.match(zhiyin, /hideCommunityAuthor/, '诚意贴隐藏作者必须写服务端')
assert.match(zhiyin, /unhideCommunityAuthor/, '诚意贴必须按服务端最终态支持取消不看')
assert.match(postDetail, /recordCommunityView/, '进入详情必须把浏览记录写入服务端')
assert.match(postDetail, /toggleCommunityCommentLike/, '动态详情页必须对接评论点赞接口')
assert.match(postDetail, /deleteCommunityComment/, '动态详情页必须对接本人评论删除接口')
assert.match(postDetail, /hideCommunityAuthor/, '动态详情更多操作必须对接作者级不看偏好')
assert.match(postDetail, /unhideCommunityAuthor/, '动态详情更多操作必须支持取消不看')
assert.match(postDetail, /取消不看 TA 动态/, '动态详情更多操作必须按最终态展示反向动作')
assert.match(postDetail, /reportTarget\('comment'/, '评论举报必须按 comment 对象提交，不能误报为帖子')
assert.match(topicDetail, /hideCommunityAuthor/, '话题详情更多操作必须将作者偏好写入服务端')
assert.match(topicDetail, /unhideCommunityAuthor/, '话题详情更多操作必须支持取消不看')
assert.doesNotMatch(topicDetail, /不看此动态/, '话题详情不得伪造单条动态本地隐藏')

const runtimeCopySources = [compose, interactions, myPosts, postDetail, topicDetail, topics, family, zhiyin, topicSpotlight, heartUser]
for (const source of runtimeCopySources) {
  assert.doesNotMatch(source, /\?\.copy\?\.\w+\s*\|\|\s*['"`][^'"`]*[\u3400-\u9fff]/, '动态文案不得在 meta copy 后回退到中文常量')
  assert.doesNotMatch(source, /(?:statusName|statusMessage|auditRemark)\s*\|\|\s*['"`][^'"`]*[\u3400-\u9fff]/, '审核/举报结果不得在服务端文案后回退到中文常量')
  assert.doesNotMatch(source, /(?:error|message)\s*\|\|\s*['"`][^'"`]*[\u3400-\u9fff]/, '未知错误必须回退到 meta copy，不得写死中文')
}

const forbiddenRuntimeFallbacks = [
  '加载失败', '加载失败，请稍后重试', '暂无数据', '暂无公开动态', '暂无社区话题',
  '暂无可用举报原因', '举报已提交', '举报提交失败', '图片尚未上传完成', '上传失败，点击重试',
  '上传中', '网络异常，请稍后重试', '发布失败', '动态未通过审核，可修改后重新提交。',
  '动态暂时无法查看', '评论列表暂时无法加载，请稍后再试', '期待你的评论，发表讨论让动态有更多回应',
]
for (const text of forbiddenRuntimeFallbacks) {
  for (const source of runtimeCopySources) assert.ok(!source.includes(`'${text}'`) && !source.includes(`"${text}"`), `社区运行态文案仍写死：${text}`)
}

for (const source of [family, zhiyin]) {
  assert.doesNotMatch(source, /\/miniapp\/community\/.*(?:mock|local)/i, '社区信息流不得调用 Mock/本地替代接口')
}

console.log('PRD-05 小程序社区真实接口闭环门禁通过')
