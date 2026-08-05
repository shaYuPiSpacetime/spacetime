/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9431)
const idePort = Number(process.env.WX_IDE_PORT || 57814)
const outputRoot = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-08-05-话题列表与发布动态UI')
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

async function openRoute(miniProgram, route, rootSelector, label) {
  const page = await timeout(miniProgram.reLaunch(route), `打开${label}`)
  await page.waitFor(2400)
  assert.ok(await page.$(rootSelector), `${label}缺少页面根节点`)
  return page
}

;(async () => {
  const miniProgram = await connect()
  connectedMiniProgram = miniProgram
  await miniProgram.callWxMethod('setStorageSync', 'token', 'dev-fixed-token-17366629764')
  const system = await miniProgram.systemInfo()
  const outputDir = path.join(outputRoot, `微信运行-${system.windowWidth}x${system.windowHeight}`)
  fs.mkdirSync(outputDir, { recursive: true })

  let page = await openRoute(miniProgram, '/pages/qianxun/topics', '#qianxun-topics-page', '社区话题列表')
  const topicsConfig = JSON.parse(fs.readFileSync(path.join(projectPath, 'dist/pages/qianxun/topics.json'), 'utf8'))
  assert.equal(topicsConfig.navigationStyle, 'custom', '社区话题列表编译产物必须关闭微信原生导航')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '01-社区话题列表-单导航.png') }), '社区话题列表截图')

  page = await openRoute(miniProgram, '/pages/qianxun/compose', '#qianxun-compose-page', '发布动态')
  for (const id of ['qianxun-compose-tool-image', 'qianxun-compose-tool-video', 'qianxun-compose-tool-smile', 'qianxun-compose-topic-leading-icon', 'qianxun-compose-topic-trailing-icon']) {
    assert.ok(await page.$(`#${id}`), `发布动态缺少 ${id}`)
  }
  const screenshotName = await page.$('#qianxun-compose-add-image-icon') ? '02-发布动态-单图态.png' : '02-发布动态-空白态.png'
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, screenshotName) }), '发布动态截图')

  console.log(`话题列表与发布动态 UI 运行态通过：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
}).finally(() => {
  connectedMiniProgram?.disconnect()
})
