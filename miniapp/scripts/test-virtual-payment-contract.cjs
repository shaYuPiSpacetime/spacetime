/* eslint-env node */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('创建订单前刷新微信会话并把登录凭证交给后端签名', () => {
  const service = read('src/services/payment.ts')

  assert.match(service, /await Taro\.login\(\)/, '虚拟支付必须使用本次支付前新获取的微信登录凭证')
  assert.match(service, /loginCode:\s*loginResult\.code/, '创建订单请求必须携带本次微信登录凭证')
  assert.match(service, /paymentMode.*wechat_virtual/, '创建订单响应必须声明虚拟支付模式')
  assert.match(service, /virtualPayParams/, '创建订单响应必须承载虚拟支付签名参数')
})

test('支付服务按后端模式调用微信虚拟支付并保留普通支付兼容', () => {
  const service = read('src/services/payment.ts')

  assert.match(service, /wx\.requestVirtualPayment\(/, '虚拟商品必须调用微信 requestVirtualPayment')
  assert.match(service, /signData:/, '虚拟支付必须传递 signData')
  assert.match(service, /paySig:/, '虚拟支付必须传递 paySig')
  assert.match(service, /signature:/, '虚拟支付必须传递用户签名')
  assert.match(service, /mode:/, '虚拟支付必须传递道具直购模式')
  assert.match(service, /Taro\.requestPayment\(/, '功能开关关闭时必须继续兼容普通微信支付')
  assert.match(service, /paymentMode\s*===\s*['"]wechat_virtual['"]/, '支付分发必须以后端模式为准')
})

test('会员和千寻币购买都把完整订单交给统一支付分发器', () => {
  for (const relativePath of ['src/hooks/useMembership.ts', 'src/hooks/useCoins.ts']) {
    const source = read(relativePath)
    assert.match(source, /requestWechatPayment\(order\)/, `${relativePath} 必须支持虚拟支付订单`)
    assert.doesNotMatch(source, /requestWechatPayment\(order\.payParams\)/, `${relativePath} 不得绕过支付模式分发`)
  }
})

test('虚拟支付失败信息也会被归一化为中文反馈', () => {
  const feedback = read('src/domain/paymentFailureFeedback.ts')

  assert.match(feedback, /requestVirtualPayment/, '失败反馈必须识别微信虚拟支付 API 前缀')
  assert.match(feedback, /暂不支持虚拟支付/, '不支持虚拟支付时必须给出中文说明')
})
