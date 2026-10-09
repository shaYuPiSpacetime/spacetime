/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('../../frontend/node_modules/playwright')

const outputPath = path.resolve(
  __dirname,
  '../../docs/验收报告/截图证据/2026-10-09-全局消息红色角标/H5运行-390x844/626cd513-消息首页.png'
)

;(async () => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.addInitScript(token => {
    localStorage.setItem('token', JSON.stringify({ data: token }))
  }, 'dev-fixed-token-17366629764')

  await page.goto('http://127.0.0.1:10087/#/pages/chat/index?mockScene=home', { waitUntil: 'networkidle' })
  const badges = page.locator('[data-role="notification-badge"]')
  await badges.first().waitFor()
  const metrics = await badges.evaluateAll(nodes =>
    nodes.map(node => {
      const style = getComputedStyle(node)
      const rect = node.getBoundingClientRect()
      return {
        value: node.getAttribute('data-notification-value'),
        width: rect.width,
        height: rect.height,
        fontSize: style.fontSize,
        backgroundColor: style.backgroundColor,
      }
    })
  )

  assert.ok(metrics.length >= 4, `消息首页数字角标数量不足：${metrics.length}`)
  for (const metric of metrics) {
    assert.equal(metric.height, 14, `角标 ${metric.value} 高度不是 14px（微信端对应 28rpx）`)
    if ((metric.value || '').length <= 2) {
      assert.equal(metric.width, 14, `角标 ${metric.value} 宽度不是 14px（微信端对应 28rpx）`)
    }
    assert.equal(metric.fontSize, '9px', `角标 ${metric.value} 字号不是 9px（微信端对应 18rpx）`)
    assert.equal(metric.backgroundColor, 'rgb(238, 37, 37)', `角标 ${metric.value} 背景色错误`)
  }

  await page.screenshot({ path: outputPath })
  await browser.close()
  assert.deepEqual(pageErrors, [], `页面运行异常：${pageErrors.join('；')}`)
  console.log(`全局消息红色角标运行态验收通过（${metrics.length} 个角标）：${outputPath}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
})
