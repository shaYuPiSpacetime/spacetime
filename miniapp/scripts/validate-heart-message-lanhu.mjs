/* eslint-env node */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const repoDir = path.resolve(rootDir, '..')
const read = relativePath => fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
const readOptional = relativePath => {
  const file = path.join(rootDir, relativePath)
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
}

const chat = read('src/pages/chat/index.tsx')
const heart = read('src/pages/community/index.tsx')
const mutual = read('src/pages/heart/mutual.tsx')
const user = read('src/pages/heart/user.tsx')
const heartHeader = read('src/components/HeartMessageHeader.tsx')
const heartMembership = readOptional('src/pages/heart/membership-unlock.tsx')
const heartCoinRecharge = readOptional('src/pages/coins/unlock-recharge.tsx')
const appConfig = read('src/app.config.ts')
const runtime = `${chat}\n${heart}\n${mutual}\n${user}\n${heartMembership}\n${heartCoinRecharge}`

for (const asset of ['heart-person.webp', 'heart-person-blur.webp', 'heart-avatar.webp']) {
  const file = path.join(rootDir, 'src/assets/lanhu/heart-message', asset)
  assert.equal(fs.existsSync(file), true, `心动/消息切图 ${asset} 必须存在`)
  assert.ok(fs.statSync(file).size < 200 * 1024, `心动/消息切图 ${asset} 必须小于 200KB`)
}

assert.match(chat, /router\.params\.variant === 'unverified'/, '消息页必须识别未认证兼容参数')
assert.match(chat, /!forcedUnverified && access\.status\?\.coreAccessStatus === 'CORE_ALLOWED'/, '消息页未认证兼容参数必须关闭认证态')
assert.match(chat, /悄悄话/, '新版消息首页必须提供悄悄话入口')
assert.match(chat, /私信/, '新版消息首页必须提供私信入口')
assert.match(chat, /喜欢我的人\(119人\)/, '消息列表人数文案必须与新版蓝湖一致')
assert.match(chat, /官方小助手/, '新版消息首页必须提供官方小助手入口')
assert.match(chat, /系统消息/, '新版消息首页必须提供系统消息入口')

assert.match(heart, /accessMode !== 'VIP_ALL_CLEAR'/, '心动页会员状态必须以后端 accessMode 为准')
assert.doesNotMatch(heart, /router\.params\.member/, '心动页不得使用 URL 参数伪造会员状态')
assert.match(heart, /router\.params\.tab === 'visitors'/, '心动页必须覆盖对我心动和访客 Tab')
assert.match(heart, /quoteRelationUnlock/, '心动页必须从真实接口获取单人解锁报价')
assert.match(heart, /confirmRelationUnlock/, '心动页必须通过真实接口确认单人解锁')
assert.match(heart, /quote\?\.unitPrice/, '单人解锁币值必须来自实时报价')
assert.doesNotMatch(heart, /只看ta\(100|只看 Ta\(100/, '单人解锁不得硬编码币值')
assert.match(heart, /\/pages\/heart\/mutual/, '胶囊左侧图标必须跳转相互喜欢页')
assert.match(
  heart,
  /\/pages\/coins\/unlock-recharge\?sourceScene=\$\{currentUnlockScene\}/,
  '余额不足必须按当前关系场景进入专属充值页'
)
assert.doesNotMatch(
  heart,
  /\/pages\/coins\/index\?sourceScene=likes_unlock_one/,
  '单人解锁场景不得复用“我的-千寻币”通用页面'
)
assert.match(heart, /\/pages\/heart\/membership-unlock/, '“解锁全部访客”必须进入独立会员页')
assert.match(heart, /await markMatchPopupRead/, '匹配弹层必须等待动作回执成功')
assert.doesNotMatch(
  heart,
  /onUnlock=\{\(\) => setUnlockStage\('success'\)\}/,
  '单人解锁不能在未扣币时伪造解锁成功'
)
assert.match(heartHeader, /onRightIconClick/, '头部右侧图标必须暴露真实点击事件')
assert.match(
  heartHeader,
  /miniappOssIcons\.heartMutualLikes/,
  '相互喜欢入口必须使用蓝湖无损 OSS 图标'
)
assert.match(heartHeader, /menuLeft/, '心动右上图标必须读取原生胶囊实时左边界')
assert.match(heartHeader, /menuLeft - width - gap/, '心动右上图标必须按胶囊左边界预留安全间距')
assert.match(heartHeader, /id="heart-mutual-entry-icon"/, '心动右上图标必须保留运行态几何验收标识')
assert.doesNotMatch(heartHeader, /left: designRpx\(506\)/, '心动右上图标禁止写死坐标')
assert.match(mutual, /page\?\.total \|\| 0/, '相互喜欢页标题必须使用真实总数')
assert.match(mutual, /useAccessStatus\('canCommunity'\)/, '相互喜欢页必须接入关系准入')
assert.doesNotMatch(mutual, /fallbackPeople|MAT-DEMO/, '相互喜欢页不得使用假数据')
assert.match(user, /getPublicProfile/, '用户主页必须读取已审核公开资料')
assert.match(user, /profile\.age/, '用户主页基础资料必须使用真实公开字段')
assert.match(user, /liked \? '取消喜欢' : '喜欢'/, '用户主页必须按最新关系状态展示喜欢/取消喜欢')
assert.match(
  user,
  /profile\.communicationMode === 'PRIVATE_MESSAGE' \? '私信' : '悄悄话'/,
  '用户主页主按钮必须使用服务端沟通模式展示私信/悄悄话',
)
assert.doesNotMatch(user, /matched \? '聊天' : '打招呼'/, '用户主页不得再按匹配状态猜测沟通入口')

assert.match(appConfig, /root: 'pages\/heart'/, '相互喜欢和用户主页必须注册心动分包')
assert.match(appConfig, /'mutual'/, '相互喜欢页面必须注册')
assert.match(appConfig, /'user'/, '用户主页必须注册')
assert.match(appConfig, /'membership-unlock'/, '访客解锁会员独立页必须注册')
assert.match(appConfig, /'unlock-recharge'/, '单人解锁专属充值页必须注册')
assert.match(heartMembership, /时空邂逅会员/, '独立会员页标题必须与蓝湖一致')
assert.match(heartMembership, /免费解锁全部对你心动的人/, '独立会员页主标题必须与蓝湖一致')
assert.match(heartMembership, /心动名单一键揭晓/, '独立会员页必须还原心动名单权益卡')
assert.match(heartMembership, /谁来看过你/, '独立会员页必须还原访客权益卡')
assert.match(heartMembership, /activePlan\.id <= 0/, '蓝湖展示套餐不得使用占位 ID 创建真实支付订单')
assert.doesNotMatch(
  heartMembership,
  /pages\/membership\/index|MembershipHero|MembershipPaymentBar/,
  '访客解锁会员页不得复用“我的-开通会员”视觉组件'
)
assert.match(heartCoinRecharge, /Ta也喜欢了你!/, '专属充值页必须还原关系情境标题')
assert.match(heartCoinRecharge, /解锁后立即和ta配对聊天/, '专属充值页必须还原解锁结果文案')
assert.match(heartCoinRecharge, /本次消耗/, '专属充值页必须展示本次消耗')
assert.match(heartCoinRecharge, /充值千寻币/, '专属充值页必须展示独立充值卡')
assert.match(heartCoinRecharge, /《时空邂逅充值协议》/, '专属充值页协议名称必须与蓝湖一致')
assert.match(heartCoinRecharge, /activePackage\.id <= 0/, '蓝湖兜底千寻币套餐不得创建真实支付订单')
assert.doesNotMatch(
  heartCoinRecharge,
  /BalanceCard|UsageCard|pages\/coins\/index/,
  '专属充值页不得复用通用资产页视觉结构'
)
assert.equal(
  fs.existsSync(path.join(rootDir, 'src/assets/lanhu/heart-message/heart-mutual-likes.png')),
  true,
  '相互喜欢入口的蓝湖 2x 无损图标源文件必须存在'
)
assert.doesNotMatch(
  runtime,
  /lanhuapp\.com|alipic\.lanhuapp|\.lanhu-ref/,
  '运行代码禁止引用蓝湖 CDN 或参考图目录'
)
assert.doesNotMatch(runtime, /letterSpacing:\s*['"]-/, '蓝湖还原禁止负字距')

const contract = path.join(
  repoDir,
  'docs/技术方案/2026-07-10-心动消息10稿-蓝湖还原与接口闭环-tcdesign.md'
)
assert.equal(fs.existsSync(contract), true, '第二阶段必须引用的心动/消息接口闭环文档必须存在')
const contractContent = fs.readFileSync(contract, 'utf8')
assert.match(contractContent, /\/miniapp\/heart\/home/, '接口闭环文档必须定义心动聚合接口')
assert.match(contractContent, /\/miniapp\/messages\/home/, '接口闭环文档必须定义消息聚合接口')
assert.match(contractContent, /"unlockScene": "likes"/, '接口闭环文档必须保留资产解锁场景语义')

console.log('心动/消息 10 稿蓝湖视觉与流程门禁通过')
