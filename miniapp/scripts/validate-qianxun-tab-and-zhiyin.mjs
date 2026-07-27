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
const communityService = read('src/services/community.ts')
const appConfig = read('src/app.config.ts')

assert.match(familySource, /useEffect/, '成家信息流必须在组件首次挂载时主动加载，不能只依赖 useDidShow')
assert.match(familySource, /useDidHide/, '成家信息流必须区分首次挂载与页面返回刷新')
assert.match(indexSource, /entryError/, '千寻准入请求失败时必须退出骨架屏并展示可恢复状态')
assert.match(indexSource, /setReady\(true\)[\s\S]{0,180}catch|catch[\s\S]{0,260}setReady\(true\)/, '千寻准入请求失败不得永久停留在骨架屏')
assert.match(indexSource, /setAccessStatus\(verificationResult\.accessStatus\)/, '千寻应缓存服务端准入状态，减少刷新白屏')
assert.match(headerSource, /qianxun-primary-family/, '缺少千寻成家一级 Tab 稳定选择器')
assert.match(headerSource, /qianxun-primary-kindred/, '缺少千寻知音一级 Tab 稳定选择器')
assert.doesNotMatch(familySource, /navigateTo\(\{\s*url:\s*['"]\/pages\/qianxun\/kindred/, '点击知音不得跳出千寻 Tab 页')

assert.ok(exists('src/features/qianxun/QianxunZhiyinTab.tsx'), '缺少知音 Tab 内容组件')
const zhiyinSource = exists('src/features/qianxun/QianxunZhiyinTab.tsx')
  ? read('src/features/qianxun/QianxunZhiyinTab.tsx')
  : ''
assert.match(zhiyinSource, /qianxun-zhiyin-yuemu/, '缺少悦目二级 Tab')
assert.match(zhiyinSource, /qianxun-zhiyin-sincere/, '缺少诚意贴二级 Tab')
assert.match(zhiyinSource, /getYuemuUsers/, '悦目必须读取用户照片候选，不能从动态首图拼接')
assert.match(zhiyinSource, /getSincerePosts/, '诚意贴必须按 sincere_post 独立查询')
assert.match(zhiyinSource, /toggleYuemuLike/, '悦目心动按钮必须绑定真实切换动作')
assert.match(zhiyinSource, /onContact/, '诚意贴申请认识必须有可执行交互')
assert.match(zhiyinSource, /onAuthor/, '诚意贴头像和昵称必须可进入真实用户主页')
assert.match(zhiyinSource, /openType="share"/, '诚意贴分享必须使用微信真实分享按钮')
assert.match(zhiyinSource, /\{'♥'\}/, '悦目心动图标必须按蓝湖稿使用白色实心')
assert.doesNotMatch(zhiyinSource, /getCommunityPosts\(['"]HOT['"]/, '悦目不得继续从热门动态生成照片墙')

assert.match(communityService, /getYuemuUsers/, '社区服务缺少悦目用户候选接口')
assert.match(communityService, /getSincerePosts/, '社区服务缺少诚意贴列表接口')
assert.match(communityService, /toggleYuemuLike/, '社区服务缺少悦目心动接口')

const controllerSource = readRepo('backend/src/main/java/com/spacetime/miniapp/controller/CommunityController.java')
assert.match(controllerSource, /@GetMapping\("\/yuemu"\)/, '后端缺少悦目用户发现接口')
assert.match(controllerSource, /@PostMapping\("\/yuemu\/\{targetUserId\}\/like"\)/, '后端缺少悦目心动切换接口')
assert.ok(existsRepo('backend/src/main/java/com/spacetime/miniapp/dto/response/YuemuUserCardVO.java'), '后端缺少悦目用户卡响应模型')

assert.match(indexSource, /getQianxunHeaderMetrics|QianxunHeader/, '千寻准入态与内容态必须复用胶囊安全区度量')
assert.match(appConfig, /root:\s*'pages\/qianxun'/, '千寻业务页面必须继续保持独立分包')

console.log('千寻刷新、一级 Tab、知音双页与胶囊门禁通过')
