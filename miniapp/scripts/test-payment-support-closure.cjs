/* eslint-env node */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

function loadPaymentFeedback() {
  const source = read('src/domain/paymentFailureFeedback.ts')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const loaded = { exports: {} }
  Function('module', 'exports', output)(loaded, loaded.exports)
  return loaded.exports.resolvePaymentFailureFeedback
}

test('帮助页和充值须知直接打开微信原生客服会话', () => {
  const help = read('src/pages/settings/help.tsx')
  const coins = read('src/pages/coins/index.tsx')

  assert.match(help, /className="help-service-button"\s+openType="contact"/)
  assert.match(coins, /id="recharge-notice-contact"[\s\S]*?openType="contact"/)
  assert.doesNotMatch(help, /contentUrl\?\.trim\(\)/)
})

test('待支付结果明确允许返回套餐页重新下单', () => {
  const result = read('src/pages/commerce/payment-result.tsx')

  assert.match(result, /order\.orderStatus === 'unpaid'\) return 'unpaid'/)
  assert.match(result, /requested !== 'processing' && requested !== 'success'/)
  assert.match(result, /state === 'unpaid' \? '重新选择套餐'/)
  assert.match(result, /state === 'unpaid' \|\| state === 'failed'/)
  assert.match(result, /state === 'processing' \|\| state === 'unpaid' \|\| state === 'error'/)
  assert.match(result, /confirmWechatPayment\(orderId\)/, '支付成功但服务端确认延迟时应允许主动查单')
  assert.match(result, /if \(state === 'failed'\) return '本次支付未完成/, '支付失败不得误显示确认中')
  assert.match(result, /if \(state === 'unpaid'\) return '服务端显示待支付/, '待支付不得断言微信账单一定未扣款')
})

test('支付调起期间不显示正在加载或支付中的自定义等待文案', () => {
  const membership = read('src/pages/membership/index.tsx')
  const coins = read('src/pages/coins/index.tsx')
  const scene = read('src/pages/coins/unlock-recharge.tsx')

  assert.match(membership, /if \(payState === 'idle' \|\| payState === 'paying'\) return null/)
  assert.match(coins, /if \(payState === 'idle' \|\| payState === 'paying'\) return null/)
  assert.match(scene, /if \(payState === 'idle' \|\| payState === 'paying'/)
  for (const source of [membership, coins, scene]) {
    assert.doesNotMatch(source, /正在打开微信支付|支付中\.\.\.|购买中\.\.\.|开通中\.\.\./)
  }
})

test('原生支付尚未返回时阻止重复创建订单，失败后仍可再次尝试', () => {
  for (const relativePath of ['src/hooks/useMembership.ts', 'src/hooks/useCoins.ts']) {
    const source = read(relativePath)
    assert.match(source, /if \(paymentInFlight\.current\) return/, `${relativePath} 必须防止并发下单`)
    assert.match(source, /paymentInFlight\.current = false/, `${relativePath} 必须在支付尝试结束后允许重试`)
    assert.match(source, /paymentLayerDismissed\.current = true/, `${relativePath} 必须记住用户主动关闭等待层`)
    assert.match(source, /if \(!paymentLayerDismissed\.current\) setPayState\('pay-success'\)/, `${relativePath} 晚到的支付成功回调不能重新弹出等待层`)
  }
})

test('微信商品未配置错误转为用户可理解的客服提示', () => {
  const resolve = loadPaymentFeedback()
  assert.equal(
    resolve({ errMsg: 'requestVirtualPayment:fail product id not configured' }).message,
    '当前支付商品未完成配置，请联系客服处理',
  )
  assert.equal(
    resolve({ errMsg: 'requestVirtualPayment:fail 产品 id 没有配置' }).message,
    '当前支付商品未完成配置，请联系客服处理',
  )
})

test('平台不支持错误不再直接展示 INVALID_PLATFORM', () => {
  const resolve = loadPaymentFeedback()
  const feedback = resolve({ errMsg: 'requestVirtualPayment:fail INVALID_PLATFORM' })
  const coins = read('src/hooks/useCoins.ts')
  const membership = read('src/hooks/useMembership.ts')

  assert.equal(feedback.capabilityRestricted, true)
  assert.equal(feedback.message, '当前设备暂无法发起虚拟支付，请检查微信版本并联系客服确认平台配置')
  assert.match(coins, /if \(!feedback\.capabilityRestricted\) Taro\.showToast\(/)
  assert.match(membership, /if \(!feedback\.cancelled && !feedback\.capabilityRestricted\) Taro\.showToast\(/)
  const scene = read('src/pages/coins/unlock-recharge.tsx')
  assert.match(scene, /<ScenePaymentLayer payState=\{payState\} failureMessage=\{paymentErrorMessage\}/)
})

test('微信支付已成功后的查单与资料刷新失败不会误报支付失败', () => {
  const membership = read('src/hooks/useMembership.ts')
  const coins = read('src/hooks/useCoins.ts')

  assert.match(membership, /payResult = await confirmPaidOrder\(order\.orderId\)\s*\} catch \{[\s\S]*?查单失败只能视为确认中/)
  assert.match(membership, /try \{\s*setMyMembership\(adaptVipStatus\(await getVipStatus\(\)\)\)\s*await fetchRecords\(\)\s*\} catch \{[\s\S]*?刷新失败不改变支付结果/)
  assert.match(coins, /result = await confirmPayment\(order\.orderId\)\s*\} catch \{[\s\S]*?查单失败只能视为确认中/)
  assert.match(coins, /try \{\s*await fetchTransactions\(\)\s*\} catch \{[\s\S]*?刷新失败不改变支付结果/)
})
