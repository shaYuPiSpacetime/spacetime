import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const miniappRoot = path.join(repoRoot, 'miniapp')
const backendRoot = path.join(repoRoot, 'backend')

function read(relativePath) {
  const fullPath = path.join(repoRoot, relativePath)
  assert.ok(fs.existsSync(fullPath), `文件不存在: ${relativePath}`)
  return fs.readFileSync(fullPath, 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath))
}

const membershipPage = read('miniapp/src/pages/membership/index.tsx')
const membershipHook = read('miniapp/src/hooks/useMembership.ts')
const indexPage = read('miniapp/src/pages/index/index.tsx')
const paymentServiceTs = read('miniapp/src/services/payment.ts')
const configTs = read('miniapp/src/constants/config.ts')
const createOrderVO = read('backend/src/main/java/com/spacetime/miniapp/dto/response/CreateOrderVO.java')
const paymentService = read('backend/src/main/java/com/spacetime/miniapp/service/PaymentService.java')
const paymentServiceImpl = read('backend/src/main/java/com/spacetime/miniapp/service/impl/PaymentServiceImpl.java')
const paymentController = read('backend/src/main/java/com/spacetime/miniapp/controller/PaymentController.java')
const webConfig = read('backend/src/main/java/com/spacetime/common/interceptor/WebConfig.java')
const applicationDev = read('backend/src/main/resources/application-dev.yml')
const applicationProd = read('backend/src/main/resources/application-prod.yml')

assert.ok(exists('miniapp/src/assets/lanhu/pages/qianxun-center.png'), '千寻中心必须接入用户提供的新切图 qianxun-center.png')
assert.ok(indexPage.includes('qianxunCenterImage'), '千寻首页需要引用新的中心图片切图')
assert.ok(indexPage.includes('qianxun-center.png'), '千寻首页需要从 lanhu/pages/qianxun-center.png 引入切图')

assert.ok(configTs.includes("TOKEN_HEADER = 'X-Auth-Token'"), '小程序请求头必须与后端 AuthConstant.TOKEN_HEADER 保持一致')
assert.ok(paymentServiceTs.includes("'/miniapp/payment/create-order'"), '创建订单接口必须调用后端真实 /miniapp/payment/create-order')
assert.ok(paymentServiceTs.includes("orderType: type"), '创建订单请求字段必须使用 orderType')
assert.ok(paymentServiceTs.includes('WechatPayParams'), '前端支付服务必须声明微信支付参数结构')
assert.ok(paymentServiceTs.includes("'/miniapp/vip/packages'"), 'VIP 套餐必须走后端 /miniapp/vip/packages')
assert.ok(paymentServiceTs.includes("'/miniapp/coin/packages'"), '千寻币套餐必须走后端 /miniapp/coin/packages')

assert.ok(paymentServiceTs.includes('Taro.requestPayment'), '支付服务必须唤起微信原生 requestPayment')
assert.ok(membershipHook.includes("createOrder(selectedPlan.id, 'vip')"), '会员支付必须按当前套餐创建真实 VIP 订单')
assert.ok(membershipHook.includes('requestWechatPayment'), '会员支付需要集中封装微信支付调用')
assert.ok(!/confirmPay[\s\S]{0,140}openWechatPay\(\)/.test(membershipHook), '真实确认支付不能再只打开 mock 微信支付面板')
assert.ok(membershipHook.includes('getVipPackages'), '会员套餐 ID 必须优先来自后端，避免 mock ID 支付失败')
assert.ok(membershipHook.includes('getVipStatus'), '会员状态必须能从后端刷新')

assert.ok(membershipPage.includes('memberStatus'), '会员底部栏需要接收会员状态')
assert.ok(membershipPage.includes("memberStatus === 'active'"), '已开通会员底部栏必须有独立效果')
assert.ok(membershipPage.includes("memberStatus === 'expired'"), '已过期会员底部栏必须有独立效果')
assert.ok(membershipPage.includes('getPayButtonText'), '会员按钮文案必须按状态计算')
assert.ok(membershipPage.includes("padding: '6rpx 25rpx 320rpx'"), '会员页滚动内容底部需要预留支付栏空间，避免遮挡')
assert.ok(membershipPage.includes('previewAmount'), '微信支付设计稿直达态允许保留蓝湖预览 fallback')

assert.ok(createOrderVO.includes('WechatPayParamsVO'), '创建订单响应必须返回微信支付参数')
assert.ok(createOrderVO.includes('payAmount'), '创建订单响应必须返回实际支付金额')
assert.ok(createOrderVO.includes('payChannel'), '创建订单响应必须返回支付渠道')
assert.ok(paymentService.includes('handleWechatNotify'), 'PaymentService 必须暴露微信支付回调处理')
assert.ok(paymentServiceImpl.includes('wechatPayService.createJsapiPayParams'), '创建订单必须调用微信 JSAPI 下单')
assert.ok(paymentServiceImpl.includes('resolveEffectivePayAmount'), '后端必须支持测试环境 0.01 支付金额覆盖')
assert.ok(paymentServiceImpl.includes('isForceTestAmount'), '测试金额覆盖必须受配置控制')
assert.ok(paymentServiceImpl.includes('handleWechatNotify'), '支付回调必须落到订单与资产处理')
assert.ok(paymentController.includes('/wechat/notify'), 'PaymentController 必须提供微信支付回调地址')
assert.ok(webConfig.includes('/miniapp/payment/wechat/notify'), '微信支付回调必须放行 token 拦截器')
assert.ok(applicationDev.includes('force-test-amount: ${DEV_WECHAT_PAY_FORCE_TEST_AMOUNT:true}'), 'dev 默认必须启用 0.01 测试支付金额')
assert.ok(applicationDev.includes('test-pay-amount: ${DEV_WECHAT_PAY_TEST_PAY_AMOUNT:0.01}'), 'dev 默认测试支付金额必须为 0.01')
assert.ok(applicationProd.includes('force-test-amount: ${WECHAT_PAY_FORCE_TEST_AMOUNT:false}'), 'prod 默认不能强制 0.01 测试金额')
assert.ok(exists('backend/src/main/java/com/spacetime/common/config/WechatPayProperties.java'), '缺少微信支付配置属性类')
assert.ok(exists('backend/src/main/java/com/spacetime/miniapp/service/WechatPayService.java'), '缺少微信支付服务接口')
assert.ok(exists('backend/src/main/java/com/spacetime/miniapp/service/impl/WechatPayServiceImpl.java'), '缺少微信支付服务实现')
assert.ok(exists('backend/src/main/java/com/spacetime/miniapp/dto/response/WechatPayParamsVO.java'), '缺少微信支付参数响应 VO')

console.log('会员中心真实支付与资源门禁通过')
