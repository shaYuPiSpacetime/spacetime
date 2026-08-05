import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const exists = (file) => fs.existsSync(path.join(root, file))
const failures = []

function check(condition, message) {
  if (!condition) failures.push(message)
}

const payment = read('miniapp/src/services/payment.ts')
const coinsHook = read('miniapp/src/hooks/useCoins.ts')
const adminPage = read('frontend/src/pages/commercial/CommercialManagement.tsx')
const coinsPage = read('miniapp/src/pages/coins/index.tsx')
const adminRouter = read('frontend/src/router/index.tsx')
const commercialApi = read('frontend/src/api/commercial.ts')
const oneTimeMigrationPath = 'deploy/sql/prod/064_vip_packages_one_time_purchase.sql'
const oneTimeMigration = exists(oneTimeMigrationPath) ? read(oneTimeMigrationPath) : ''

check(payment.includes('originAmount?: number'), '小程序币包契约缺少原价')
check(payment.includes('discountAmount?: number'), '小程序币包契约缺少优惠价')
check(payment.includes('mobileTag?: string'), '小程序币包契约缺少移动端标签')
check(coinsHook.includes('originalPrice:'), '币包适配未向蓝湖价格卡传入原价')
check(coinsHook.includes('discountLabel:'), '币包适配未向蓝湖价格卡传入折扣标签')
check(coinsHook.includes('recommended:'), '币包适配未保留推荐档')
check(coinsHook.includes('miniappOssIcons'), '消费场景图标未映射到 OSS 图标清单')
check(adminPage.includes('CoinSceneModal'), '消费场景缺少可回显的编辑弹窗')
check(adminPage.includes('.commerce-demo-page {\n  --bg:'), '商业化页面设计 token 未绑定实际根节点类名')
check(adminPage.includes('max-height: calc(100vh - 32px)'), '编辑弹窗未限制视口高度，底部操作区可能无法点击')
check(adminPage.includes('overflow-y: auto'), '编辑弹窗未提供小视口滚动能力')
check(!adminPage.includes('await load();\n  };'), '切换配置 Tab 仍会重新请求并覆盖未保存编辑')
check(!coinsPage.includes('{usage.price} 千寻币'), '千寻币用途区仍展示蓝湖稿中不存在的价格副文案')
check(!adminRouter.includes('element={<VipBenefitManagement />}'), '旧会员权益 CRUD 页面仍绕过聚合配置审计')
check(!adminRouter.includes('element={<VipPackageManagement />}'), '旧会员套餐 CRUD 页面仍绕过聚合配置审计')
check(!adminRouter.includes('element={<CoinPackageManagement />}'), '旧千寻币套餐 CRUD 页面仍绕过聚合配置审计')
check(commercialApi.includes('export interface CommercialSettings'), '管理后台接口契约缺少数据库通用参数')
check(!adminPage.includes('后台接口暂未返回社交与订单参数配置'), '社交与订单参数仍是占位空态')
check(!adminPage.includes('后台接口暂未返回曝光包预留配置'), '曝光包预留仍是占位空态')
check(adminPage.includes('updateCommercialSettings'), '后台通用参数未绑定聚合保存状态')
check(adminPage.includes('会员套餐（一次性购买）'), '会员套餐页未明确一次性购买')
check(adminPage.includes('value="普通套餐" readOnly'), '会员套餐类型未固定为普通套餐')
check(adminPage.includes('value="一次性购买" readOnly'), '会员套餐购买方式未固定为一次性购买')
check(!adminPage.includes('<option value="continuous">'), '会员套餐页仍可选择连续订阅套餐')
check(!adminPage.includes('<option value="month">'), '会员套餐页仍可选择自动续费周期')
check(exists(oneTimeMigrationPath), '缺少 VIP 套餐一次性购买生产迁移')
check(oneTimeMigration.includes("package_type = 'normal'"), '生产迁移未归一化普通套餐类型')
check(oneTimeMigration.includes("subscription_type = 'once'"), '生产迁移未归一化一次性购买方式')
check(oneTimeMigration.includes('wechat_product_id = NULL'), '生产迁移未清理微信连续订阅商品')
check(oneTimeMigration.includes('agreement_config = NULL'), '生产迁移未清理连续订阅协议配置')

if (failures.length) {
  console.error(failures.map((item) => `FAIL: ${item}`).join('\n'))
  process.exit(1)
}

console.log('商业化后台数据库闭环静态检查通过')
