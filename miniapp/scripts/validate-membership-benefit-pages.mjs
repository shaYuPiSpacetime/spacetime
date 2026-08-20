import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const miniappRoot = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(miniappRoot, relativePath), 'utf8')
}

const membershipPage = read('src/pages/membership/index.tsx')
const membershipHook = read('src/hooks/useMembership.ts')
const recordsPage = read('src/pages/membership/records.tsx')
const recordDetailPage = read('src/pages/membership/record-detail.tsx')
const profilePage = read('src/pages/profile/index.tsx')
const demoData = JSON.parse(read('src/data/lanhuDemo.json'))
const expectedBenefits = [
  ['heart-list', '心动名单一键揭晓：', '123人'],
  ['visitor-eye', '谁来看过你：', '340位访客'],
  ['yo-message', '每日专属悄悄话1条', ''],
  ['extra-browse', '每日额外浏览10位嘉宾', ''],
  ['filter', '精准筛选功能', ''],
  ['exposure', '曝光度拉满', ''],
  ['stealth', '隐身模式', ''],
  ['replay', '三天回放功能', ''],
  ['daily-heart', '每日多5次心动机会', ''],
]

assert.deepEqual(
  demoData.membership.benefits.map(({ icon, title, value }) => [icon, title, value]),
  expectedBenefits,
  '会员 9 项权益必须和蓝湖完整页的顺序、文案和值一致',
)
assert.equal(new Set(demoData.membership.benefits.map(item => item.icon)).size, 9, '9 项权益图标不能重复')
assert.ok(membershipPage.includes('scrollLeft={railScrollLeft}'), '会员套餐轨道必须像千寻币一样跟随选中卡片滚动')
assert.ok(membershipPage.includes('scrollWithAnimation'), '会员套餐切换必须平滑滚动到完整金额卡')
assert.ok(membershipPage.includes("height: '270rpx'"), '会员套餐轨道必须预留标签高度，不能裁切折扣标签')
assert.ok(membershipPage.includes('index={index + 1}'), '9 项权益卡必须有可核查的顺序标识')
assert.ok(membershipPage.includes('data-benefit-index={index}'), '权益卡必须将顺序标识输出到真实组件')
assert.ok(!membershipPage.includes('member-vip-bg.webp'), '动态会员卡不能使用带头像和文案的背景整图')
assert.ok(membershipPage.includes('plans.some(plan => plan.id === activePlanId)'), '接口套餐替换后必须重新选择有效套餐')
assert.ok(membershipPage.includes('useAuthStore'), '会员中心必须读取当前登录用户的头像和昵称')
assert.ok(recordDetailPage.includes('<ScrollView scrollY'), '会员详情必须在小屏设备可纵向滚动')
assert.ok(recordDetailPage.includes("height: 'calc(100vh - 176rpx)'"), '会员详情滚动区必须避开导航栏')
assert.ok(recordDetailPage.includes('getVipOrders'), '会员详情必须通过真实订单接口查询')
assert.ok(recordDetailPage.includes('if (!recordId)'), '未携带订单 ID 时必须明确展示缺少真实记录')
assert.ok(!recordDetailPage.includes('getDemoPageData'), '会员详情生产路径不得使用演示订单')
assert.ok(!membershipPage.includes('getDemoPageData'), '会员中心生产路径不得使用演示数据')
assert.ok(!membershipHook.includes('getDemoPageData'), '会员 hook 生产路径不得使用演示数据')
assert.ok(recordsPage.includes("maxWidth: '400rpx'"), '会员记录套餐名必须为右侧周期保留空间')
assert.ok(recordsPage.includes("textOverflow: 'ellipsis'"), '会员记录超长套餐名必须截断，不能覆盖周期')
assert.ok(profilePage.includes('ProfileAvatarFrame'), '我的页面头像必须包含蓝湖的浅蓝头像底座与进度标识')
assert.ok(profilePage.includes('{profileScore > 0 && ('), '资料进度徽标必须只在资料完成度大于零时展示')
assert.ok(profilePage.includes("background: profileScore > 0 ? '#E3F1FE' : '#FFFFFF'"), '头像底座必须按资料完成度切换蓝湖的浅蓝或白色样式')
assert.ok(!profilePage.includes('profileVipBanner'), '我的会员横幅不能把带按钮和文案的整图当成交互组件')
assert.ok(profilePage.includes("import vipBannerBg from '@/assets/profile/vip-banner-bg.svg'"), '我的会员横幅必须使用蓝湖原始纯背景矢量切图')
assert.ok(profilePage.includes('src={vipBannerBg}'), '我的会员横幅必须渲染蓝湖纯背景切图')
assert.ok(!profilePage.includes('VipBannerPattern'), '我的会员横幅不能继续使用近似的手绘几何背景')
assert.ok(profilePage.includes('时空邂逅会员已开通，享尊享特权'), '已开通会员横幅文案必须与蓝湖一致')
assert.ok(profilePage.includes('时空邂逅会员已过期'), '过期会员横幅文案必须与蓝湖一致')

console.log('会员权益页面闭环门禁通过')
