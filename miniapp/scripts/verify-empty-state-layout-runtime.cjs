/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9443)
const idePort = Number(process.env.WX_IDE_PORT || 14672)
const outputRoot = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-08-05-小程序空态原布局回退')
let connectedMiniProgram

function timeout(promise, label, ms = 30000) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms))])
}

async function connect() {
  try {
    return await timeout(automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }), '连接自动化端口', 5000)
  } catch (_) {
    return automator.launch({ cliPath, projectPath, port: automationPort, args: ['--port', String(idePort)], trustProject: true })
  }
}

async function tap(page, selector, label, waitMs = 2600) {
  const target = await page.$(selector)
  assert.ok(target, `缺少${label}：${selector}`)
  await target.tap()
  await page.waitFor(waitMs)
}

function assertRpxStyle(style, property, expectedRpx, viewportWidth, label) {
  const rpxMatch = style.match(new RegExp(`${property}:\\s*([\\d.]+)rpx`))
  if (rpxMatch) {
    assert.equal(Number(rpxMatch[1]), expectedRpx, label)
    return
  }
  const pxMatch = style.match(new RegExp(`${property}:\\s*([\\d.]+)px`))
  assert.ok(pxMatch, `${label}：运行样式未包含 ${property}`)
  const expectedPx = expectedRpx * viewportWidth / 750
  assert.ok(Math.abs(Number(pxMatch[1]) - expectedPx) <= 1, `${label}：期望约 ${expectedPx.toFixed(2)}px，实际 ${pxMatch[1]}px`)
}

;(async () => {
  const miniProgram = await connect()
  connectedMiniProgram = miniProgram
  const exceptions = []
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  await miniProgram.callWxMethod('setStorageSync', 'token', 'dev-fixed-token-17366629764')

  const system = await miniProgram.systemInfo()
  const outputDir = path.join(outputRoot, `微信运行-${system.windowWidth}x${system.windowHeight}`)
  fs.mkdirSync(outputDir, { recursive: true })

  const page = await timeout(miniProgram.reLaunch('/pages/index/index'), '打开千寻首页')
  await page.waitFor(4200)
  await tap(page, '#qianxun-scene-CITY', '同城二级 Tab')
  const cityEmpty = await page.$('#qianxun-family-empty-state')
  assert.ok(cityEmpty, '当前固定测试账号应呈现同城空态')
  const cityStyle = await cityEmpty.attribute('style')
  console.log(`同城空态运行样式：${cityStyle}`)
  assertRpxStyle(cityStyle, 'padding-top', 128, system.windowWidth, '同城空态必须恢复 128rpx 顶部留白')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '01-成家-同城-原布局.png') }), '同城原布局截图')

  await tap(page, '#qianxun-primary-kindred', '知音一级 Tab', 3200)
  await tap(page, '#qianxun-zhiyin-sincere', '诚意贴二级 Tab', 3200)
  const sincereEmpty = await page.$('#qianxun-zhiyin-empty-state')
  assert.ok(sincereEmpty, '当前固定测试账号应呈现诚意贴空态')
  const sincereStyle = await sincereEmpty.attribute('style')
  console.log(`诚意贴空态运行样式：${sincereStyle}`)
  assertRpxStyle(sincereStyle, 'padding-top', 120, system.windowWidth, '诚意贴空态必须恢复 120rpx 顶部留白')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '02-知音-诚意贴-原布局.png') }), '诚意贴原布局截图')

  assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
  console.log(`同城与诚意贴空态原布局运行态复验通过：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
}).finally(() => {
  connectedMiniProgram?.disconnect()
})
