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
const outputRoot = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-10-09-我的动态发布失败蓝湖还原')
let connectedMiniProgram

function timeout(promise, label, ms = 30000) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms))])
}

function assertNear(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}期望 ${expected}，实际 ${actual}`)
}

async function connect() {
  try {
    return await timeout(automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }), '连接自动化端口', 5000)
  } catch (_) {
    return automator.launch({ cliPath, projectPath, port: automationPort, args: ['--port', String(idePort)], trustProject: true })
  }
}

async function screenshot(miniProgram, page, outputDir, filename) {
  await page.waitFor(900)
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, filename) }), `${filename}截图`, 45000)
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

  const page = await timeout(miniProgram.reLaunch('/pages/qianxun/interactions'), '打开千寻互动')
  await page.waitFor(3200)
  const mineTab = await page.$('#qianxun-interactions-tab-mine')
  assert.ok(mineTab, '缺少我的动态 Tab')
  await mineTab.tap()
  await page.waitFor(1200)

  const scroll = await page.$('#qianxun-mine-scroll')
  assert.ok(scroll, '缺少我的动态滚动容器')
  await scroll.scrollTo(0, 520)
  await page.waitFor(1200)

  const pending = await page.$('.qianxun-my-post-status')
  const rejected = await page.$('.qianxun-my-post-status-rejected')
  assert.ok(pending, '缺少审核中状态标签')
  assert.ok(rejected, '缺少发布失败状态标签')
  assert.equal(await rejected.text(), '发布失败', '驳回状态必须展示为发布失败')
  for (const [element, label] of [[pending, '审核中标签'], [rejected, '发布失败标签']]) {
    const size = await element.size()
    assertNear(size.width, 88 * system.windowWidth / 750, 1, `${label}宽度`)
    assertNear(size.height, 48 * system.windowWidth / 750, 1, `${label}高度`)
  }
  const minePanel = await page.$('#qianxun-interactions-panel-mine')
  assert.doesNotMatch(await minePanel.outerWxml(), /内容未通过安全审核，请修改后重新提交/, '列表不得内联展示失败原因')
  await screenshot(miniProgram, page, outputDir, '01-我的动态-审核与失败状态.png')

  await rejected.tap()
  await page.waitFor(500)
  const dialog = await page.$('#qianxun-publish-failure-dialog')
  const reason = await page.$('#qianxun-publish-failure-reason')
  assert.ok(dialog, '点击发布失败后必须显示弹窗')
  assert.ok(reason, '发布失败弹窗必须显示失败原因')
  assert.ok((await reason.text()).trim(), '发布失败原因不能为空')
  const dialogSize = await dialog.size()
  assertNear(dialogSize.width, 620 * system.windowWidth / 750, 1, '发布失败弹窗宽度')
  assertNear(dialogSize.height, 538 * system.windowWidth / 750, 1, '发布失败弹窗高度')
  await screenshot(miniProgram, page, outputDir, '02-我的动态-发布失败弹窗.png')

  assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
  console.log(`千寻互动我的动态发布失败运行态验收通过：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
}).finally(() => {
  connectedMiniProgram?.disconnect()
})
