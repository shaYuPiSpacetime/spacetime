/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9432)
const idePort = Number(process.env.WX_IDE_PORT || 57815)
const outputRoot = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-10-09-千寻互动正文排版统一')
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

async function screenshot(miniProgram, page, outputDir, filename) {
  await page.waitFor(700)
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, filename) }), `${filename}截图`, 45000)
}

function assertRpxStyle(style, property, expectedRpx, windowWidth, label) {
  const match = style.match(new RegExp(`${property}:\\s*([\\d.]+)(rpx|px)`))
  assert.ok(match, `${label}缺少 ${property}：${style}`)
  const actual = Number(match[1])
  const expected = match[2] === 'rpx' ? expectedRpx : expectedRpx * windowWidth / 750
  assert.ok(Math.abs(actual - expected) <= 1, `${label}${property}期望 ${expectedRpx}rpx，实际 ${actual}${match[2]}`)
}

async function assertBodyTypography(page, selector, label, windowWidth) {
  const body = await page.$(selector)
  assert.ok(body, `${label}缺少动态正文`)
  const style = String(await body.attribute('style'))
  assertRpxStyle(style, 'font-size', 28, windowWidth, `${label}正文`)
  assertRpxStyle(style, 'line-height', 54, windowWidth, `${label}正文`)
  return body
}

async function openInteractionsSection(miniProgram, section) {
  const page = await timeout(miniProgram.reLaunch('/pages/qianxun/interactions'), '打开千寻互动', 30000)
  await page.waitFor(3200)
  const tab = await page.$(`#qianxun-interactions-tab-${section}`)
  assert.ok(tab, `缺少${section}页签`)
  await tab.tap()
  await page.waitFor(1800)
  return page
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

  const historyPage = await openInteractionsSection(miniProgram, 'history')
  const historyBody = await assertBodyTypography(historyPage, '.qianxun-interaction-body', '浏览记录', system.windowWidth)
  await screenshot(miniProgram, historyPage, outputDir, '01-浏览记录-正文28rpx行高54rpx.png')

  const historyCard = await historyPage.$('.qianxun-interaction-post-card')
  assert.ok(historyCard, '浏览记录缺少可进入详情的动态卡片')
  await historyBody.tap()
  await new Promise(resolve => setTimeout(resolve, 2600))
  const detailPage = await miniProgram.currentPage()
  assert.equal(detailPage.path, 'pages/qianxun/post-detail', `动态详情路由错误：${detailPage.path}`)
  await assertBodyTypography(detailPage, '.qianxun-detail-body', '动态详情', system.windowWidth)
  await screenshot(miniProgram, detailPage, outputDir, '02-动态详情-正文28rpx行高54rpx.png')

  const minePage = await openInteractionsSection(miniProgram, 'mine')
  await assertBodyTypography(minePage, '.qianxun-interaction-body', '我的动态', system.windowWidth)
  await screenshot(miniProgram, minePage, outputDir, '03-我的动态-正文28rpx行高54rpx.png')

  const homePage = await timeout(miniProgram.reLaunch('/pages/index/index'), '打开千寻首页', 30000)
  await homePage.waitFor(3200)
  const familyTab = await homePage.$('#qianxun-primary-family')
  assert.ok(familyTab, '缺少千寻成家页签')
  await familyTab.tap()
  await homePage.waitFor(1000)
  const hotTab = await homePage.$('#qianxun-scene-HOT')
  assert.ok(hotTab, '缺少千寻热门页签')
  await hotTab.tap()
  await homePage.waitFor(2200)
  await assertBodyTypography(homePage, '.qianxun-family-body', '千寻推荐流', system.windowWidth)
  await screenshot(miniProgram, homePage, outputDir, '04-千寻推荐流-正文28rpx行高54rpx.png')

  const kindredTab = await homePage.$('#qianxun-primary-kindred')
  assert.ok(kindredTab, '缺少千寻知音页签')
  await kindredTab.tap()
  await homePage.waitFor(2400)
  await assertBodyTypography(homePage, '.qianxun-zhiyin-body', '千寻知音流', system.windowWidth)
  await screenshot(miniProgram, homePage, outputDir, '05-千寻知音流-正文28rpx行高54rpx.png')

  const composePage = await timeout(miniProgram.reLaunch('/pages/qianxun/compose'), '打开发布动态', 30000)
  await composePage.waitFor(1800)
  await assertBodyTypography(composePage, '.qianxun-compose-body', '发布动态', system.windowWidth)
  await screenshot(miniProgram, composePage, outputDir, '06-发布动态-正文28rpx行高54rpx.png')

  assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
  console.log(`千寻互动正文排版运行态验收通过：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
}).finally(() => {
  connectedMiniProgram?.disconnect()
})
