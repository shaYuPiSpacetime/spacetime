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
const outputRoot = process.env.QIANXUN_CAPTURE_ROOT
  ? path.resolve(projectPath, '..', process.env.QIANXUN_CAPTURE_ROOT)
  : path.resolve(projectPath, '../docs/验收报告/截图证据/2026-07-22-千寻66稿/运行截图')
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

async function selectById(page, id, label, waitMs = 2600) {
  const target = await page.$(`#${id}`)
  assert.ok(target, `缺少 ${label}`)
  await target.tap()
  await page.waitFor(waitMs)
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
  console.log('[1/8] 已连接微信开发者工具')

  const exceptions = []
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  await miniProgram.callWxMethod('setStorageSync', 'token', 'dev-fixed-token-17366629764')
  const system = await miniProgram.systemInfo()
  console.log('[2/8] 已写入测试登录态并读取设备信息')
  const outputDir = path.join(outputRoot, `微信运行-${system.windowWidth}x${system.windowHeight}`)
  fs.mkdirSync(outputDir, { recursive: true })

  const page = await timeout(miniProgram.reLaunch('/pages/index/index'), '千寻成家刷新跳转')
  await page.waitFor(4200)
  assert.equal((await miniProgram.currentPage()).path, 'pages/index/index', '千寻成家路由错误')
  console.log('[3/8] 千寻成家首页已就绪')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '00-千寻-成家-首屏.png') }), '首屏截图')
  assert.ok(await page.$('#qianxun-scene-FOLLOWING'), '刷新后成家二级 Tab 必须立即渲染')

  await selectScene(page, 'CITY')
  const cityFile = path.join(outputDir, '01-千寻-成家-同城.png')
  await timeout(miniProgram.screenshot({ path: cityFile }), '同城截图')

  await selectScene(page, 'HOT')
  const hotFile = path.join(outputDir, '02-千寻-成家-热门.png')
  await timeout(miniProgram.screenshot({ path: hotFile }), '热门截图')

  assert.notEqual(sha1(cityFile), sha1(hotFile), '同城与热门截图不得相同')
  console.log('[4/8] 成家场景截图完成')

  const firstPost = await page.$('.qianxun-community-card')
  if (firstPost) {
    await firstPost.tap()
    await page.waitFor(2200)
    await timeout(miniProgram.screenshot({ path: path.join(outputDir, '03-动态详情.png') }), '动态详情截图')
  }

  await captureRoute(miniProgram, '/pages/qianxun/compose', path.join(outputDir, '04-发布动态.png'), '发布动态')
  const topicHome = await timeout(miniProgram.reLaunch('/pages/index/index'), '话题入口跳转')
  await topicHome.waitFor(3600)
  await selectScene(topicHome, 'HOT')
  await selectById(topicHome, 'qianxun-topic-featured', '精选话题入口', 1600)
  assert.equal((await miniProgram.currentPage()).path, 'pages/qianxun/topic', '精选话题必须进入真实话题详情')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '05-话题.png') }), '话题截图')
  console.log('[5/8] 动态详情、发布与真实话题截图完成')
  const interactionsPage = await captureRoute(miniProgram, '/pages/qianxun/interactions', path.join(outputDir, '06-千寻互动-评论过.png'), '千寻互动')
  await selectById(interactionsPage, 'qianxun-interactions-filter-commented', '互动评论过筛选', 500)
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '06-千寻互动-评论过.png') }), '互动评论过截图')
  await selectById(interactionsPage, 'qianxun-interactions-filter-liked', '互动点赞过筛选', 300)
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '06-1-千寻互动-点赞过.png') }), '互动点赞过截图')
  await selectById(interactionsPage, 'qianxun-interactions-filter-unlocked', '互动解锁过筛选', 300)
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '06-2-千寻互动-解锁过.png') }), '互动解锁过截图')
  await selectById(interactionsPage, 'qianxun-interactions-tab-history', '互动浏览记录 Tab', 900)
  assert.ok(await interactionsPage.$('#qianxun-interactions-panel-history'), '浏览记录内容区必须保持挂载')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '06-3-千寻互动-浏览记录.png') }), '互动浏览记录截图')
  await selectById(interactionsPage, 'qianxun-interactions-tab-mine', '互动我的动态 Tab', 900)
  assert.ok(await interactionsPage.$('#qianxun-interactions-panel-mine'), '我的动态内容区必须保持挂载')
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '06-4-千寻互动-我的动态.png') }), '互动我的动态截图')
  console.log('[6/8] 千寻互动各筛选与浏览记录截图完成')
  await captureRoute(miniProgram, '/pages/qianxun/my-posts', path.join(outputDir, '07-我的动态.png'), '我的动态')
  const zhiyinPage = await timeout(miniProgram.reLaunch('/pages/index/index'), '知音 Tab 跳转')
  await zhiyinPage.waitFor(3800)
  await selectById(zhiyinPage, 'qianxun-primary-kindred', '千寻知音一级 Tab', 3200)
  await selectById(zhiyinPage, 'qianxun-zhiyin-sincere', '知音诚意贴二级 Tab', 3200)
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '09-知音-诚意贴.png') }), '知音诚意贴截图')
  await selectById(zhiyinPage, 'qianxun-zhiyin-yuemu', '知音悦目二级 Tab', 3200)
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, '08-知音-悦目.png') }), '知音悦目截图')
  console.log('[7/8] 我的动态与知音截图完成')

  assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
  console.log('[8/8] 运行异常检查通过')
  console.log(`千寻 66 稿主页面运行截图完成：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
}).finally(() => {
  connectedMiniProgram?.disconnect()
})
