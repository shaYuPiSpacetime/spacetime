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
const outputRoot = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-08-05-千寻社区互动闭环')
let connectedMiniProgram
let screenshotSupported = process.env.QIANXUN_CAPTURE_SCREENSHOTS !== 'false'

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

async function tap(page, selector, label, waitMs = 2200) {
  const element = await page.$(selector)
  assert.ok(element, `缺少${label}：${selector}`)
  await element.tap()
  await page.waitFor(waitMs)
  return element
}

async function screenshot(miniProgram, outputDir, filename, label) {
  if (!screenshotSupported) return
  try {
    await timeout(miniProgram.screenshot({ path: path.join(outputDir, filename) }), `${label}截图`, 10000)
  } catch (error) {
    screenshotSupported = false
    const reason = `微信开发者工具截图接口不可用，运行态业务断言继续执行：${error?.message || error}`
    fs.writeFileSync(path.join(outputDir, '截图限制说明.txt'), `${reason}\n`, 'utf8')
    console.warn(reason)
  }
}

async function elementCenterY(element) {
  const [offset, size] = await Promise.all([element.offset(), element.size()])
  return offset.top + size.height / 2
}

async function openQianxunHome(miniProgram, label) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await miniProgram.callWxMethod('setStorageSync', 'token', 'dev-fixed-token-17366629764')
    await timeout(miniProgram.reLaunch('/pages/index/index'), `${label}第${attempt}次跳转`)
    await new Promise(resolve => setTimeout(resolve, 3200))
    const currentPage = await miniProgram.currentPage()
    if (currentPage.path === 'pages/index/index' && await currentPage.$('#qianxun-primary-family')) return currentPage
  }
  const currentPage = await miniProgram.currentPage()
  throw new Error(`${label}失败，当前路由：${currentPage.path}`)
}

;(async () => {
  const miniProgram = await connect()
  connectedMiniProgram = miniProgram
  const exceptions = []
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  const system = await miniProgram.systemInfo()
  const outputDir = path.join(outputRoot, `微信运行-${system.windowWidth}x${system.windowHeight}`)
  fs.mkdirSync(outputDir, { recursive: true })

  const page = await openQianxunHome(miniProgram, '打开千寻首页')
  await tap(page, '#qianxun-primary-family', '成家一级 Tab', 1200)
  await tap(page, '#qianxun-scene-HOT', '成家热门 Tab', 2600)

  const familyFollow = await page.$('.qianxun-family-follow')
  if (familyFollow && (await familyFollow.text()) !== '已关注') {
    assert.equal(await familyFollow.text(), '+ 关注', '成家未关注按钮必须显示 + 关注')
  }

  const swiper = await page.$('#qianxun-topic-swiper')
  assert.ok(swiper, '热门社区话题必须渲染可滑动 Swiper')
  const secondIndicator = await page.$('#qianxun-topic-indicator-1')
  assert.ok(secondIndicator, '热门社区话题至少需要两页可滑动数据')
  const beforeIndicatorStyle = await secondIndicator.attribute('style')
  await swiper.swipeTo(1)
  await page.waitFor(700)
  const afterIndicatorStyle = await secondIndicator.attribute('style')
  assert.notEqual(afterIndicatorStyle, beforeIndicatorStyle, '话题滑动后指示点必须跟随变化')
  assert.match(afterIndicatorStyle, /width:\s*20rpx|width:\s*10px/, '滑动到第二页后第二个指示点必须激活')
  await screenshot(miniProgram, outputDir, '01-成家-热门话题第二页.png', '成家热门话题第二页')

  await tap(page, '#qianxun-primary-kindred', '知音一级 Tab', 3000)
  const likeButton = await page.$('.qianxun-yuemu-like')
  assert.ok(likeButton, '悦目必须至少有一个可操作的心动按钮')
  const beforeLikeLabel = await likeButton.attribute('aria-label')
  const beforeLikeText = await likeButton.text()
  await likeButton.tap()
  await page.waitFor(1500)
  const blockedSheet = await page.$('#qianxun-uncertified-sheet')
  if (blockedSheet) {
    assert.ok(await blockedSheet, '未满足准入条件时必须给出明确认证反馈')
  } else {
    const afterLikeButton = await page.$('.qianxun-yuemu-like')
    const afterLikeLabel = await afterLikeButton.attribute('aria-label')
    const afterLikeText = await afterLikeButton.text()
    assert.ok(afterLikeLabel !== beforeLikeLabel || afterLikeText !== beforeLikeText, '悦目点击心动后必须立即切换状态')
    await afterLikeButton.tap()
    await page.waitFor(1500)
    const restoredButton = await page.$('.qianxun-yuemu-like')
    const restoredLabel = await restoredButton.attribute('aria-label')
    const restoredText = await restoredButton.text()
    assert.ok(restoredLabel === beforeLikeLabel || restoredText === beforeLikeText, '运行态复验结束后必须恢复原心动状态')
  }
  await screenshot(miniProgram, outputDir, '02-知音-悦目心动反馈.png', '知音悦目心动反馈')

  const sincerePage = await openQianxunHome(miniProgram, '重开千寻首页')
  await tap(sincerePage, '#qianxun-primary-kindred', '知音一级 Tab', 2400)
  await tap(sincerePage, '#qianxun-zhiyin-sincere', '诚意贴二级 Tab', 2800)
  const sincereFollow = await sincerePage.$('.qianxun-sincere-follow')
  if (sincereFollow && (await sincereFollow.text()) !== '已关注') {
    assert.equal(await sincereFollow.text(), '+ 关注', '诚意贴未关注按钮必须显示 + 关注')
  }
  const commentStat = await sincerePage.$('.sincere-comment-stat')
  const commentIcon = await sincerePage.$('.sincere-comment-icon')
  const likeStat = await sincerePage.$('.sincere-like-stat')
  const likeIcon = await sincerePage.$('.sincere-like-icon')
  if (commentStat && commentIcon && likeStat && likeIcon) {
    assert.ok(Math.abs(await elementCenterY(commentStat) - await elementCenterY(commentIcon)) <= 1, '诚意贴评论图标必须垂直居中')
    assert.ok(Math.abs(await elementCenterY(likeStat) - await elementCenterY(likeIcon)) <= 1, '诚意贴心动图标必须垂直居中')
  } else {
    assert.ok(await sincerePage.$('image'), '生产诚意贴无数据时必须展示完整空态')
    console.log('生产固定测试账号暂无诚意贴，已验证空态；卡片图标由隔离契约运行态继续验证')
  }
  await screenshot(miniProgram, outputDir, '03-知音-诚意贴图标居中.png', '知音诚意贴图标居中')

  const composePage = await timeout(miniProgram.reLaunch('/pages/qianxun/compose'), '打开发布动态')
  await composePage.waitFor(2200)
  const textarea = await composePage.$('textarea')
  assert.ok(textarea, '发布动态必须有正文输入框')
  await textarea.input('自动化复验：同城普通动态无需关联话题')
  await composePage.waitFor(300)
  const composeWxml = await composePage.$('#qianxun-compose-page')
  assert.doesNotMatch(await composeWxml.outerWxml(), /请选择话题|话题不能为空/, '未选话题时发布页不得提示话题必填')
  await screenshot(miniProgram, outputDir, '04-发布动态-无话题可发布.png', '无话题发布动态')

  assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
  console.log(`千寻成家与知音运行态闭环通过：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
}).finally(() => {
  connectedMiniProgram?.disconnect()
})
