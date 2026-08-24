/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
/* global wx */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9476)
const idePort = Number(process.env.WX_IDE_PORT || 19517)
const outputDir = path.resolve(
  projectPath,
  '../docs/验收报告/截图证据/2026-08-24-未认证弹窗与设置按钮/微信运行',
)

let connectedMiniProgram

async function timeout(promise, label, ms = 30000) {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}超时`)), ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function waitForElement(page, selector, label) {
  for (let index = 0; index < 60; index += 1) {
    const element = await page.$(selector)
    if (element) return element
    await page.waitFor(100)
  }
  assert.fail(`缺少运行态元素：${label}`)
}

async function open(miniProgram, route, label) {
  const page = await timeout(miniProgram.reLaunch(route), `${label}跳转`, 15000)
  await page.waitFor(2600)
  return page
}

async function capture(miniProgram, fileName) {
  fs.mkdirSync(outputDir, { recursive: true })
  await timeout(
    miniProgram.screenshot({ path: path.join(outputDir, fileName) }),
    `${fileName}截图`,
    45000,
  )
}

;(async () => {
  try {
    connectedMiniProgram = await timeout(
      automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }),
      '连接现有微信自动化端口',
      4000,
    )
  } catch {
    connectedMiniProgram = await automator.launch({
      cliPath,
      projectPath,
      port: automationPort,
      args: ['--port', String(idePort)],
      trustProject: true,
    })
  }

  const miniProgram = connectedMiniProgram
  const system = await miniProgram.systemInfo()
  const scale = 750 / system.windowWidth

  let page = await open(miniProgram, '/pages/profile/index', '我的未认证页')
  const root = await waitForElement(page, '#profile-unverified', '我的未认证页')
  assert.ok(root)
  const settings = await waitForElement(page, '#profile-unverified-settings', '左上设置按钮')
  const [settingsOffset, settingsSize, menu] = await Promise.all([
    settings.offset(),
    settings.size(),
    miniProgram.evaluate(() => wx.getMenuButtonBoundingClientRect()),
  ])
  const settingsCenter = settingsOffset.top + settingsSize.height / 2
  const menuCenter = menu.top + menu.height / 2
  assert.ok(
    Math.abs(settingsCenter - menuCenter) <= 1.5,
    `设置按钮与原生胶囊未对齐：设置中心 ${settingsCenter}，胶囊中心 ${menuCenter}`,
  )
  assert.ok(Math.abs(settingsSize.height * scale - menu.height * scale) <= 2, '设置按钮点击区高度必须与原生胶囊一致')
  await capture(miniProgram, '01-我的未认证-设置按钮对齐.png')

  page = await open(miniProgram, '/pages/recommend/index?tab=ideal', '理想型未认证页')
  const choose = await waitForElement(page, '#ideal-choose-button', '选择理想型按钮')
  await choose.tap()
  await page.waitFor(700)
  const modal = await waitForElement(page, '#common-unverified-modal', '通用未认证弹窗')
  const confirm = await waitForElement(page, '#common-unverified-confirm', '立即认证按钮')
  assert.ok(modal && confirm)
  const modalWxml = await modal.outerWxml()
  assert.match(modalWxml, /84fb941f630accaf\/icon-1\.png/, '弹窗未加载本轮蓝湖 MCP 切图')
  await capture(miniProgram, '02-通用未认证弹窗-蓝湖切图.png')

  console.log(`未认证弹窗与设置按钮微信运行验收通过：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exitCode = 1
}).finally(() => {
  connectedMiniProgram?.disconnect()
})
