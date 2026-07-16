/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const port = Number(process.env.WX_AUTO_PORT || 9430)
const outputDir = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-07-16-底部Tab稳定性')
let connectedMiniProgram

function timeout(promise, label, ms = 30000) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms))])
}

async function waitForPath(miniProgram, expectedPath, label) {
  for (let index = 0; index < 30; index += 1) {
    const page = await miniProgram.currentPage()
    if (page?.path === expectedPath) return page
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const current = await miniProgram.currentPage()
  assert.equal(current?.path, expectedPath, `${label}路由错误`)
  return current
}

async function tapTab(miniProgram, tabKey, expectedPath) {
  const page = await miniProgram.currentPage()
  const tab = await waitForTab(page, tabKey)
  assert.ok(tab, `缺少底部 Tab：${tabKey}`)
  await tab.tap()
  return waitForPath(miniProgram, expectedPath, `点击 ${tabKey}`)
}

async function waitForTab(page, tabKey) {
  for (let index = 0; index < 30; index += 1) {
    const tab = await page.$(`[id$="app-tab-${tabKey}"]`)
    if (tab) return tab
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return null
}

;(async () => {
  let miniProgram
  try {
    miniProgram = await timeout(automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` }), '连接自动化端口', 4000)
  } catch (_) {
    miniProgram = await automator.launch({ cliPath, projectPath, port, args: ['--port', '9527'] })
  }
  connectedMiniProgram = miniProgram

  const exceptions = []
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  await miniProgram.callWxMethod('setStorageSync', 'token', 'dev-fixed-token-17366629764')
  fs.mkdirSync(outputDir, { recursive: true })

  await miniProgram.reLaunch('/pages/index/index')
  await waitForPath(miniProgram, 'pages/index/index', '进入千寻')
  await tapTab(miniProgram, 'community', 'pages/community/index')

  const heartPage = await miniProgram.currentPage()
  const heartTab = await waitForTab(heartPage, 'community')
  assert.ok(heartTab, '心动页缺少底部心动 Tab')
  const heartWxml = await heartTab.outerWxml()
  assert.match(heartWxml, /tab-work-active\.png[^>]*opacity: 1/, '心动点亮态未显示蓝湖 PNG')
  assert.doesNotMatch(heartWxml, /tab-work-active\.svg/, '心动点亮态仍误用公文包 SVG')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '01-心动点亮态.png') }), '心动点亮态截图')

  await tapTab(miniProgram, 'recommend', 'pages/recommend/index')
  await tapTab(miniProgram, 'chat', 'pages/chat/index')
  await tapTab(miniProgram, 'profile', 'pages/profile/index')
  await tapTab(miniProgram, 'index', 'pages/index/index')
  await new Promise(resolve => setTimeout(resolve, 500))

  const rapidPage = await miniProgram.currentPage()
  const firstTab = await waitForTab(rapidPage, 'community')
  const secondTab = await waitForTab(rapidPage, 'profile')
  assert.ok(firstTab && secondTab, '快速点击回归缺少目标 Tab')
  const firstTap = firstTab.tap()
  const secondTap = secondTab.tap().catch(() => undefined)
  await Promise.all([firstTap, secondTap])
  await waitForPath(miniProgram, 'pages/community/index', '快速连续点击首个目标')
  await new Promise(resolve => setTimeout(resolve, 500))
  assert.equal((await miniProgram.currentPage()).path, 'pages/community/index', '快速连续点击后发生二次乱跳')

  assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
  console.log(`底部 Tab 运行态回归通过，截图：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
}).finally(() => {
  connectedMiniProgram?.disconnect()
})
