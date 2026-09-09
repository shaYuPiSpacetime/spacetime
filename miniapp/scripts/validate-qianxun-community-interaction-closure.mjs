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
assert.match(zhiyin, /post\.followingAuthor\s*\?\s*['"]已关注['"]\s*:\s*['"]\+ 关注['"]/, '知音动态未关注按钮必须显示 + 关注')

assert.match(spotlight, /\bSwiper\b/, '热门社区话题必须使用真实 Swiper')
assert.match(spotlight, /\bSwiperItem\b/, '热门社区话题必须按页渲染 SwiperItem')
assert.match(spotlight, /onChange=/, '热门社区话题必须响应滑动并更新页码')
assert.match(spotlight, /qianxun-topic-indicator-/, '热门社区话题必须提供跟随当前页的指示点')

assert.match(zhiyin, /QianxunActionStat kind="comment"/, '知音动态评论必须使用统一结构化图标组件')
assert.match(zhiyin, /QianxunActionStat kind="like"/, '知音动态心动必须使用统一结构化图标组件')
assert.match(communityIcons, /miniappOssIcons\.qianxunComment/, '评论结构化图标必须使用 OSS 切图')
assert.match(communityIcons, /miniappOssIcons\.qianxunLikeActive\s*:\s*miniappOssIcons\.qianxunLike/, '心动结构化图标必须区分已心动和未心动 OSS 切图')
assert.equal((zhiyin.match(/<ZhiyinPostContent/g) || []).length, 2, '心灵搭子与时空站台必须各复用一次统一动态列表')
assert.match(zhiyin, /className="qianxun-zhiyin-post-card qianxun-sincere-card"/, '两个知音页必须共用同一个动态卡片运行态结构')
assert.match(zhiyin, /updatePostCollections/, '两个知音页的关注、心动和隐藏状态必须同步更新')
assert.match(zhiyin, /stationPublishAllowed/, '时空站台发布入口必须受服务端工作人员能力控制')
assert.doesNotMatch(zhiyin, /qianxun-yuemu-like-|qianxunYuemuHeart|toggleYuemuLike/, '心灵搭子不得继续使用旧照片墙心动交互')
assert.match(zhiyin, /UnverifiedCertificationModal/, '知音动态无准入权限时必须提供共享未认证弹窗')
assert.match(communityIcons, /height:\s*'88rpx'[\s\S]{0,120}alignItems:\s*'center'/, '知音动态图标必须挂载在固定高度且垂直居中的操作区')

const packageJson = read('package.json')
assert.match(packageJson, /prebuild:weapp[^\n]+validate-qianxun-community-interaction-closure/, '社区互动闭环门禁必须进入正式小程序预构建')

console.log('千寻社区互动闭环静态门禁通过')
