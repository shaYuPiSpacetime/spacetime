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
const existsRepo = relativePath => fs.existsSync(path.join(repoRoot, relativePath))

const familySource = read('src/features/qianxun/QianxunFamilyPage.tsx')
const headerSource = read('src/features/qianxun/QianxunHeader.tsx')
const indexSource = read('src/pages/index/index.tsx')
const verificationEntrySource = read('src/features/verification/VerificationEntryView.tsx')
const communityService = read('src/services/community.ts')
const appConfig = read('src/app.config.ts')

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
assert.match(zhiyinSource, /getYuemuUsers/, '悦目必须读取用户照片候选，不能从动态首图拼接')
assert.match(zhiyinSource, /getSincerePosts/, '诚意贴必须按 sincere_post 独立查询')
assert.match(zhiyinSource, /toggleYuemuLike/, '悦目心动按钮必须绑定真实切换动作')
assert.match(zhiyinSource, /onContact/, '诚意贴申请认识必须有可执行交互')
assert.match(zhiyinSource, /onAuthor/, '诚意贴头像和昵称必须可进入真实用户主页')
assert.match(zhiyinSource, /openType="share"/, '诚意贴分享必须使用微信真实分享按钮')
assert.match(zhiyinSource, /src=\{miniappOssIcons\.qianxunYuemuHeart\}/, '悦目右下角必须使用用户指定的完整圆形心动 OSS 切图')
assert.match(zhiyinSource, /已心动|已取消心动/, '悦目心动操作必须提供可感知反馈')
assert.doesNotMatch(zhiyinSource, /getCommunityPosts\(['"]HOT['"]/, '悦目不得继续从热门动态生成照片墙')
assert.match(
  familySource,
  /linear-gradient\(90deg, rgba\(233,253,251,0\.6\) 0%, rgba\(234,238,249,0\.6\) 48\.5%, rgba\(248,250,239,0\.6\) 100%\)/,
  '千寻页面背景必须与蓝湖消息、资料页共用同一组三段渐变'
)
assert.match(zhiyinSource, /width: '340rpx', height: '458rpx'/, '悦目卡片必须按蓝湖保持 340×458rpx')
assert.match(zhiyinSource, /height: '116rpx'.*linear-gradient/s, '悦目卡片底部遮罩必须收敛到蓝湖 116rpx')
assert.match(zhiyinSource, /height: '39rpx'.*borderRadius: '19rpx'/s, '悦目缘分标签高度和圆角必须按蓝湖还原')
assert.match(zhiyinSource, /miniappOssIcons\.qianxunYuemuHeart[\s\S]{0,180}width: '54rpx', height: '54rpx'/, '悦目完整心动切图必须按 54×54rpx 展示')
assert.doesNotMatch(zhiyinSource, /qianxunLikeActive[\s\S]{0,180}filter: 'brightness\(0\) invert\(1\)'/, '悦目不得再用旧点赞图标和 CSS 滤镜拼接心动按钮')
assert.doesNotMatch(zhiyinSource, /height: '570rpx'|width: '92rpx', height: '92rpx'/, '悦目不得保留过高卡片或 92rpx 大心动按钮')

const uploadIconSource = read('scripts/upload-miniapp-oss-icons.mjs')
assert.match(uploadIconSource, /qianxunYuemuHeart: 'src\/assets\/lanhu\/qianxun-community\/yuemu-heart\.png'/, '用户指定的悦目心动原图必须进入无损 OSS 上传清单')

assert.match(communityService, /getYuemuUsers/, '社区服务缺少悦目用户候选接口')
assert.match(communityService, /getSincerePosts/, '社区服务缺少诚意贴列表接口')
assert.match(communityService, /toggleYuemuLike/, '社区服务缺少悦目心动接口')

const controllerSource = readRepo('backend/src/main/java/com/spacetime/miniapp/controller/CommunityController.java')
assert.match(controllerSource, /@GetMapping\("\/yuemu"\)/, '后端缺少悦目用户发现接口')
assert.match(controllerSource, /@PostMapping\("\/yuemu\/\{targetUserId\}\/like"\)/, '后端缺少悦目心动切换接口')
assert.ok(existsRepo('backend/src/main/java/com/spacetime/miniapp/dto/response/YuemuUserCardVO.java'), '后端缺少悦目用户卡响应模型')

assert.match(verificationEntrySource, /getQianxunHeaderMetrics|QianxunHeader/, '千寻准入态与内容态必须复用胶囊安全区度量')
assert.match(appConfig, /root:\s*'pages\/qianxun'/, '千寻业务页面必须继续保持独立分包')

console.log('千寻刷新、一级 Tab、知音双页与胶囊门禁通过')
