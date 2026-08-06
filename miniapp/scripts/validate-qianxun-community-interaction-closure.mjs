/* global console */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(scriptDir, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

const compose = read('src/pages/qianxun/compose.tsx')
const communityService = read('src/services/community.ts')
const family = read('src/features/qianxun/QianxunFamilyPage.tsx')
const spotlight = read('src/features/qianxun/QianxunTopicSpotlight.tsx')
const zhiyin = read('src/features/qianxun/QianxunZhiyinTab.tsx')
const communityIcons = read('src/components/QianxunCommunityIcons.tsx')

assert.doesNotMatch(compose, /if\s*\(\s*!topicId\s*\)\s*\{[^}]*setTopicSheetVisible/s, '发布动态不得强制先选择话题')
assert.match(compose, /const canPublish = Boolean\(content\.trim\(\)\s*&&\s*!publishing\s*&&\s*!hasIncompleteImage\)/, '发布按钮可用态不得依赖话题')
assert.match(communityService, /topicId\??:\s*number/, '发布接口 topicId 必须为可选参数')

assert.match(family, /post\.followingAuthor\s*\?\s*['"]已关注['"]\s*:\s*['"]\+ 关注['"]/, '成家未关注按钮必须显示 + 关注')
assert.match(zhiyin, /post\.followingAuthor\s*\?\s*['"]已关注['"]\s*:\s*['"]\+ 关注['"]/, '诚意贴未关注按钮必须显示 + 关注')

assert.match(spotlight, /\bSwiper\b/, '热门社区话题必须使用真实 Swiper')
assert.match(spotlight, /\bSwiperItem\b/, '热门社区话题必须按页渲染 SwiperItem')
assert.match(spotlight, /onChange=/, '热门社区话题必须响应滑动并更新页码')
assert.match(spotlight, /qianxun-topic-indicator-/, '热门社区话题必须提供跟随当前页的指示点')

assert.match(zhiyin, /QianxunActionStat kind="comment"/, '诚意贴评论必须使用统一结构化图标组件')
assert.match(zhiyin, /QianxunActionStat kind="like"/, '诚意贴心动必须使用统一结构化图标组件')
assert.match(communityIcons, /miniappOssIcons\.qianxunComment/, '评论结构化图标必须使用 OSS 切图')
assert.match(communityIcons, /miniappOssIcons\.qianxunLikeActive\s*:\s*miniappOssIcons\.qianxunLike/, '心动结构化图标必须区分已心动和未心动 OSS 切图')
assert.match(zhiyin, /likingUserIds/, '悦目心动必须有防重复提交状态')
assert.match(zhiyin, /qianxun-yuemu-like-/, '悦目心动按钮必须提供稳定运行态节点')
assert.match(zhiyin, /className="qianxun-yuemu-like"/, '悦目心动按钮必须提供运行态测试选择器')
assert.match(zhiyin, /已心动|已取消心动/, '悦目心动成功后必须提供明确反馈')
assert.match(zhiyin, /qianxun-uncertified-sheet/, '悦目无准入权限时必须提供明确认证反馈')
assert.match(communityIcons, /height:\s*'88rpx'[\s\S]{0,120}alignItems:\s*'center'/, '诚意贴图标必须挂载在固定高度且垂直居中的操作区')

const packageJson = read('package.json')
assert.match(packageJson, /prebuild:weapp[^\n]+validate-qianxun-community-interaction-closure/, '社区互动闭环门禁必须进入正式小程序预构建')

console.log('千寻社区互动闭环静态门禁通过')
