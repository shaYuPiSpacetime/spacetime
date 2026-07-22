/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const port = Number(process.env.WX_AUTO_PORT || 9430)
const idePort = Number(process.env.WX_IDE_PORT || 14672)
const outputRoot = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-07-22-千寻66稿/运行截图')
let connectedMiniProgram

function timeout(promise, label, ms = 30000) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms))])
}

function sha1(file) {
  return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex')
}

async function selectScene(page, scene) {
  const tab = await page.$(`#qianxun-scene-${scene}`)
  assert.ok(tab, `缺少 ${scene} 二级 Tab`)
  await tab.tap()
  await page.waitFor(2600)
}

async function captureRoute(miniProgram, route, file, label, waitMs = 2800) {
  const page = await timeout(miniProgram.reLaunch(route), `${label}跳转`)
  await page.waitFor(waitMs)
  await timeout(miniProgram.screenshot({ path: file }), `${label}截图`)
  return page
}

;(async () => {
  let miniProgram
  try {
    miniProgram = await timeout(automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` }), '连接自动化端口', 4000)
  } catch (_) {
    miniProgram = await automator.launch({ cliPath, projectPath, port, args: ['--port', String(idePort)], trustProject: true })
  }
  connectedMiniProgram = miniProgram

  const exceptions = []
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  await miniProgram.callWxMethod('setStorageSync', 'token', 'dev-fixed-token-17366629764')
  const system = await miniProgram.systemInfo()
  const outputDir = path.join(outputRoot, `微信运行-${system.windowWidth}x${system.windowHeight}`)
  fs.mkdirSync(outputDir, { recursive: true })

  const page = await timeout(miniProgram.reLaunch('/pages/recommend/index'), '千寻成家跳转')
  await page.waitFor(4200)
  assert.equal((await miniProgram.currentPage()).path, 'pages/recommend/index', '千寻成家路由错误')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '00-千寻-成家-首屏.png') }), '首屏截图')

  await selectScene(page, 'CITY')
  const cityFile = path.join(outputDir, '01-千寻-成家-同城.png')
  await timeout(miniProgram.screenshot({ path: cityFile }), '同城截图')

  await selectScene(page, 'HOT')
  const hotFile = path.join(outputDir, '02-千寻-成家-热门.png')
  await timeout(miniProgram.screenshot({ path: hotFile }), '热门截图')

  assert.notEqual(sha1(cityFile), sha1(hotFile), '同城与热门截图不得相同')

  const firstPost = await page.$('.qianxun-community-card')
  if (firstPost) {
    await firstPost.tap()
    await page.waitFor(2200)
    await timeout(miniProgram.screenshot({ path: path.join(outputDir, '03-动态详情.png') }), '动态详情截图')
  }

  await captureRoute(miniProgram, '/pages/qianxun/compose', path.join(outputDir, '04-发布动态.png'), '发布动态')
  await captureRoute(miniProgram, '/pages/qianxun/topic', path.join(outputDir, '05-话题.png'), '话题')
  await captureRoute(miniProgram, '/pages/qianxun/interactions', path.join(outputDir, '06-千寻互动.png'), '千寻互动')
  await captureRoute(miniProgram, '/pages/qianxun/my-posts', path.join(outputDir, '07-我的动态.png'), '我的动态')
  await captureRoute(miniProgram, '/pages/qianxun/kindred', path.join(outputDir, '08-知音.png'), '知音')

  assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
  console.log(`千寻 66 稿主页面运行截图完成：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
}).finally(() => {
  connectedMiniProgram?.disconnect()
})
