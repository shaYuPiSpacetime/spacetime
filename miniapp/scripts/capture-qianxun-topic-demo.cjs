/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const port = Number(process.env.WX_AUTO_PORT || 9430)
const idePort = Number(process.env.WX_IDE_PORT || 14672)
const outputRoot = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-07-22-千寻话题闭环')
let connectedMiniProgram

function timeout(promise, label, ms = 30000) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms))])
}

async function connect() {
  try {
    return await timeout(automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` }), '连接自动化端口', 4000)
  } catch (_) {
    return automator.launch({ cliPath, projectPath, port, args: ['--port', String(idePort)], trustProject: true })
  }
}

async function openHot(miniProgram) {
  const page = await timeout(miniProgram.reLaunch('/pages/index/index'), '打开千寻')
  await page.waitFor(4200)
  const hot = await page.$('#qianxun-scene-HOT')
  assert.ok(hot, '缺少热门 Tab')
  await hot.tap()
  await page.waitFor(3200)
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

  let page = await openHot(miniProgram)
  assert.ok(await page.$('#qianxun-topic-spotlight'), '热门页缺少社区话题板块')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '01-热门-社区话题.png') }), '热门页截图')

  const featured = await page.$('#qianxun-topic-featured')
  assert.ok(featured, '缺少精选话题入口')
  await featured.tap()
  await page.waitFor(2800)
  assert.equal((await miniProgram.currentPage()).path, 'pages/qianxun/topic', '精选话题未进入详情')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '02-话题详情.png') }), '话题详情截图')

  const detailPage = await miniProgram.currentPage()
  const participate = await detailPage.$('#qianxun-topic-participate')
  assert.ok(participate, '缺少参与话题按钮')
  await participate.tap()
  await detailPage.waitFor(1200)
  assert.equal((await miniProgram.currentPage()).path, 'pages/qianxun/compose', '参与话题未进入发布页')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '02-1-参与话题发布.png') }), '参与话题截图')

  page = await openHot(miniProgram)
  const allTopics = await page.$('#qianxun-topic-all')
  assert.ok(allTopics, '缺少全部话题入口')
  await allTopics.tap()
  await page.waitFor(2600)
  assert.equal((await miniProgram.currentPage()).path, 'pages/qianxun/topics', '全部话题未进入列表')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '03-社区话题列表.png') }), '话题列表截图')

  assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
  console.log(`千寻话题 Demo 运行截图完成：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
}).finally(() => {
  connectedMiniProgram?.disconnect()
})
