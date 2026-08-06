/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9432)
const idePort = Number(process.env.WX_IDE_PORT || 57814)
const outputRoot = process.env.QIANXUN_CAPTURE_ROOT
  ? path.resolve(projectPath, '..', process.env.QIANXUN_CAPTURE_ROOT)
  : path.resolve(projectPath, '../docs/验收报告/截图证据/2026-08-05-千寻互动整体-蓝湖还原')
let connectedMiniProgram

function timeout(promise, label, ms = 30000) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms))])
}

async function connect() {
  try {
    return await timeout(automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }), '连接自动化端口', 4000)
  } catch (_) {
    return automator.launch({ cliPath, projectPath, port: automationPort, args: ['--port', String(idePort)], trustProject: true })
  }
}

async function selectById(page, id, label, waitMs = 700) {
  const target = await page.$(`#${id}`)
  assert.ok(target, `缺少${label}`)
  await target.tap()
  await page.waitFor(waitMs)
}

async function capture(miniProgram, page, outputDir, fileName, label) {
  assert.ok(page, `${label}页面不存在`)
  // 微信开发者工具在路由或 Tab 切换后的首帧偶发截到旧合成层，先预热一次再保留验收截图。
  try {
    await timeout(miniProgram.screenshot({ path: '/tmp/qianxun-capture-warmup.png' }), `${label}截图预热`)
  } catch (_) {
    // 预热帧失败不代表页面失败，保留后续正式截图重试机会。
  }
  await page.waitFor(900)
  const targetPath = path.join(outputDir, fileName)
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await timeout(miniProgram.screenshot({ path: targetPath }), `${label}截图（第${attempt}次）`)
      return
    } catch (error) {
      lastError = error
      await page.waitFor(1200)
    }
  }
  throw lastError
}

;(async () => {
  const miniProgram = await connect()
  connectedMiniProgram = miniProgram
  console.log('[准备] 已连接微信开发者工具')
  const exceptions = []
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  await miniProgram.callWxMethod('setStorageSync', 'token', 'dev-fixed-token-17366629764')
  console.log('[准备] 已写入验收账号 Token')
  const system = await miniProgram.systemInfo()
  const outputDir = path.join(outputRoot, `微信运行-${system.windowWidth}x${system.windowHeight}`)
  fs.mkdirSync(outputDir, { recursive: true })

  const interactions = await timeout(miniProgram.reLaunch('/pages/qianxun/interactions'), '打开千寻互动')
  await interactions.waitFor(3400)
  console.log('[1/3] 已打开千寻互动')
  assert.ok(await interactions.$('#qianxun-interactions-page'), '缺少千寻互动根节点')
  await selectById(interactions, 'qianxun-interactions-filter-commented', '评论过筛选')
  await capture(miniProgram, interactions, outputDir, '06-千寻互动-评论过.png', '评论过')
  await selectById(interactions, 'qianxun-interactions-filter-liked', '点赞过筛选')
  await capture(miniProgram, interactions, outputDir, '06-1-千寻互动-点赞过.png', '点赞过')
  await selectById(interactions, 'qianxun-interactions-filter-unlocked', '解锁过筛选')
  await capture(miniProgram, interactions, outputDir, '06-2-千寻互动-解锁过.png', '解锁过')
  await selectById(interactions, 'qianxun-interactions-tab-history', '浏览记录 Tab', 1200)
  console.log('[1/3] 已切换浏览记录')
  assert.ok(await interactions.$('.qianxun-interaction-date-group'), '浏览记录缺少真实日期分组')
  assert.ok(await interactions.$('.qianxun-gender-icon'), '浏览记录缺少真实性别图标')
  assert.ok(await interactions.$('.qianxun-comment-icon'), '浏览记录缺少评论图标')
  assert.ok(await interactions.$('.qianxun-like-icon'), '浏览记录缺少点赞图标')
  await capture(miniProgram, interactions, outputDir, '06-3-千寻互动-浏览记录.png', '浏览记录')
  await selectById(interactions, 'qianxun-interactions-tab-mine', '我的动态 Tab', 1200)
  await capture(miniProgram, interactions, outputDir, '06-4-千寻互动-我的动态.png', '互动内我的动态')
  console.log('[1/3] 千寻互动三个筛选、浏览记录和我的动态截图通过')

  const myPosts = await timeout(miniProgram.reLaunch('/pages/qianxun/my-posts'), '打开独立我的动态')
  await myPosts.waitFor(3000)
  await capture(miniProgram, myPosts, outputDir, '07-我的动态.png', '独立我的动态')
  console.log('[2/3] 独立我的动态截图通过')

  const home = await timeout(miniProgram.reLaunch('/pages/index/index'), '打开千寻首页')
  await home.waitFor(3600)
  await selectById(home, 'qianxun-scene-HOT', '热门场景', 2600)
  const featuredTopic = await home.$('.qianxun-topic-featured')
  if (featuredTopic) {
    await featuredTopic.tap()
    await home.waitFor(1800)
  } else {
    const firstPost = await home.$('.qianxun-community-card')
    assert.ok(firstPost, '热门场景缺少可进入真实话题的动态')
    await firstPost.tap()
    await home.waitFor(1800)
    const detail = await miniProgram.currentPage()
    const topicEntry = await detail.$('#qianxun-post-topic')
    assert.ok(topicEntry, '动态详情缺少真实话题入口')
    await topicEntry.tap()
    await detail.waitFor(1800)
  }
  assert.equal((await miniProgram.currentPage()).path, 'pages/qianxun/topic', '精选话题必须进入真实话题详情')
  await capture(miniProgram, await miniProgram.currentPage(), outputDir, '05-话题.png', '真实话题详情')

  const zhiyin = await timeout(miniProgram.reLaunch('/pages/index/index'), '打开知音')
  await zhiyin.waitFor(3400)
  await selectById(zhiyin, 'qianxun-primary-kindred', '知音一级 Tab', 2600)
  await selectById(zhiyin, 'qianxun-zhiyin-sincere', '诚意贴二级 Tab', 1800)
  await capture(miniProgram, zhiyin, outputDir, '09-知音-诚意贴.png', '知音诚意贴')
  await selectById(zhiyin, 'qianxun-zhiyin-yuemu', '悦目二级 Tab', 1800)
  await capture(miniProgram, zhiyin, outputDir, '08-知音-悦目.png', '知音悦目')
  console.log('[3/3] 真实话题与知音关联页截图通过')

  assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
  console.log(`千寻互动运行态闭环通过：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
}).finally(() => {
  connectedMiniProgram?.disconnect()
})
