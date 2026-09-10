/* global console */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const miniappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(miniappRoot, '..')
const read = relativePath => fs.readFileSync(path.join(miniappRoot, relativePath), 'utf8')
const readRepo = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
const exists = relativePath => fs.existsSync(path.join(miniappRoot, relativePath))

const familySource = read('src/features/qianxun/QianxunFamilyPage.tsx')
const headerSource = read('src/features/qianxun/QianxunHeader.tsx')
const indexSource = read('src/pages/index/index.tsx')
const verificationEntrySource = read('src/features/verification/VerificationEntryView.tsx')
const communityService = read('src/services/community.ts')
const appConfig = read('src/app.config.ts')
const postActionSheetSource = read('src/components/CommunityPostActionSheet.tsx')

assert.match(familySource, /useEffect/, '成家信息流必须在组件首次挂载时主动加载，不能只依赖 useDidShow')
assert.match(familySource, /useDidHide/, '成家信息流必须区分首次挂载与页面返回刷新')
assert.match(indexSource, /entryError/, '千寻准入请求失败时必须退出骨架屏并展示可恢复状态')
assert.match(indexSource, /setReady\(true\)[\s\S]{0,180}catch|catch[\s\S]{0,260}setReady\(true\)/, '千寻准入请求失败不得永久停留在骨架屏')
assert.match(indexSource, /setAccessStatus\(verificationResult\.accessStatus\)/, '千寻应缓存服务端准入状态，减少刷新白屏')
assert.match(headerSource, /qianxun-primary-family/, '缺少千寻成家一级 Tab 稳定选择器')
assert.match(headerSource, /qianxun-primary-kindred/, '缺少千寻知音一级 Tab 稳定选择器')
assert.match(headerSource, /label: '时空邂逅'/, '千寻知音一级 Tab 必须展示新名称“时空邂逅”')
assert.doesNotMatch(familySource, /navigateTo\(\{\s*url:\s*['"]\/pages\/qianxun\/kindred/, '点击知音不得跳出千寻 Tab 页')

assert.ok(exists('src/features/qianxun/QianxunZhiyinTab.tsx'), '缺少知音 Tab 内容组件')
const zhiyinSource = exists('src/features/qianxun/QianxunZhiyinTab.tsx')
  ? read('src/features/qianxun/QianxunZhiyinTab.tsx')
  : ''
assert.match(zhiyinSource, /qianxun-zhiyin-yuemu/, '缺少悦目二级 Tab')
assert.match(zhiyinSource, /qianxun-zhiyin-sincere/, '缺少诚意贴二级 Tab')
assert.match(zhiyinSource, /label: '心灵搭子'/, '悦目二级 Tab 必须展示新名称“心灵搭子”')
assert.match(zhiyinSource, /label: '时空站台'/, '诚意贴二级 Tab 必须展示新名称“时空站台”')
assert.match(zhiyinSource, /getSoulmatePosts/, '心灵搭子必须读取后台配置手机号对应作者的普通动态')
assert.match(zhiyinSource, /getSincerePosts/, '诚意贴必须按 sincere_post 独立查询')
assert.equal((zhiyinSource.match(/<ZhiyinPostContent/g) || []).length, 2, '心灵搭子与时空站台必须各复用一次统一动态列表组件')
assert.equal((zhiyinSource.match(/function ZhiyinPostContent/g) || []).length, 1, '知音动态列表组件只能保留一份实现')
assert.equal((zhiyinSource.match(/function ZhiyinPostCard/g) || []).length, 1, '知音动态卡片组件只能保留一份实现')
assert.doesNotMatch(zhiyinSource, /YuemuContent|YuemuCard|getYuemuUsers|toggleYuemuLike|qianxunYuemuHeart/, '心灵搭子不得继续保留旧照片墙实现')
assert.match(zhiyinSource, /stationPublishAllowed/, '时空站台发布按钮必须消费服务端派生的工作人员能力')
assert.match(
  zhiyinSource,
  /activeTab === 'YUEMU'[\s\S]{0,500}id="qianxun-soulmate-publish"[\s\S]{0,500}url: '\/pages\/qianxun\/compose'/,
  '心灵搭子必须向所有具备普通发帖资格的用户提供普通动态发布入口',
)
assert.match(
  zhiyinSource,
  /activeTab === 'SINCERE' && config\?\.stationPublishAllowed[\s\S]{0,500}id="qianxun-sincere-publish"[\s\S]{0,500}postType=sincere_post/,
  '时空站台必须仅向服务端确认的工作人员提供专属发布入口',
)
assert.match(zhiyinSource, /onContact/, '两个知音动态列表的申请认识必须有可执行交互')
assert.match(zhiyinSource, /onAuthor/, '两个知音动态列表的头像和昵称必须可进入真实用户主页')
assert.match(zhiyinSource, /CommunityPostActionSheet/, '两个知音动态列表必须复用统一动态操作弹窗')
assert.match(postActionSheetSource, /openType="share"/, '诚意贴分享必须使用微信真实分享按钮')
assert.doesNotMatch(zhiyinSource, /getCommunityPosts\(['"]HOT['"]/, '悦目不得继续从热门动态生成照片墙')
assert.match(
  familySource,
  /linear-gradient\(90deg, rgba\(233,253,251,0\.6\) 0%, rgba\(234,238,249,0\.6\) 48\.5%, rgba\(248,250,239,0\.6\) 100%\)/,
  '千寻页面背景必须与蓝湖消息、资料页共用同一组三段渐变'
)
assert.match(zhiyinSource, /width: '700rpx'.*borderRadius: '18rpx'/s, '两个知音动态列表必须复用 700rpx 动态卡片基线')

assert.match(communityService, /getSoulmatePosts/, '社区服务缺少心灵搭子动态接口')
assert.match(communityService, /getSincerePosts/, '社区服务缺少诚意贴列表接口')
assert.match(communityService, /stationPublishAllowed/, '社区 Meta 必须暴露时空站台发布能力')

const controllerSource = readRepo('backend/src/main/java/com/spacetime/miniapp/controller/CommunityController.java')
assert.match(controllerSource, /@GetMapping\("\/soulmate-posts"\)/, '后端缺少心灵搭子动态接口')

assert.match(verificationEntrySource, /getQianxunHeaderMetrics|QianxunHeader/, '千寻准入态与内容态必须复用胶囊安全区度量')
assert.match(appConfig, /root:\s*'pages\/qianxun'/, '千寻业务页面必须继续保持独立分包')

console.log('千寻刷新、一级 Tab、知音双页与胶囊门禁通过')
