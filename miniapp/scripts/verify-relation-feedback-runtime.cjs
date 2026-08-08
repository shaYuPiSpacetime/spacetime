/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')
const { createRelationFeedbackMockServer } = require('./relation-feedback-mock-server.cjs')

const projectPath = path.resolve(__dirname, '..')
const outputDir = process.env.RELATION_CAPTURE_DIR
  ? path.resolve(process.env.RELATION_CAPTURE_DIR)
  : path.resolve(projectPath, '../docs/验收报告/截图证据/2026-08-04-关系反馈与互动链路-小程序闭环')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const apiPort = Number(process.env.RELATION_MOCK_PORT || 19092)
const automationPort = Number(process.env.WX_AUTO_PORT || 9447)
const idePort = Number(process.env.WX_IDE_PORT || 12005)
const mock = createRelationFeedbackMockServer(apiPort)
const screenshotRequested = process.env.RELATION_CAPTURE_SCREENSHOTS === 'true'
let screenshotSupported = screenshotRequested

function timeout(promise, label, ms = 30000) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms))])
}

async function waitForSelector(page, selector, label, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    const element = await page.$(selector)
    if (element) return element
    await page.waitFor(100)
  }
  throw new Error(`未找到${label}：${selector}`)
}

async function relaunch(miniProgram, route, selector) {
  const page = await timeout(miniProgram.reLaunch(route), `${route}跳转`)
  await waitForSelector(page, selector, route)
  await page.waitFor(300)
  return page
}

async function waitForPagePath(miniProgram, expected, attempts = 40) {
  for (let index = 0; index < attempts; index += 1) {
    const page = await miniProgram.currentPage()
    if (page.path === expected) return page
    await page.waitFor(100)
  }
  return miniProgram.currentPage()
}

function requests(pathname, method) {
  return mock.state.requests.filter(item => item.pathname === pathname && (!method || item.method === method))
}

async function waitForMockRequest(pathname, startIndex = 0, attempts = 50) {
  for (let index = 0; index < attempts; index += 1) {
    const requestIndex = mock.state.requests.findIndex((item, itemIndex) => itemIndex >= startIndex && item.pathname === pathname)
    if (requestIndex >= 0) return requestIndex
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return -1
}

async function captureEvidence(miniProgram, filename, label) {
  if (!screenshotSupported) return
  try {
    // 页面切换后等待开发者工具模拟器稳定，避免截到过渡中的裁切画面。
    const page = await miniProgram.currentPage()
    await page.waitFor(700)
    await timeout(miniProgram.screenshot({ path: path.join(outputDir, filename) }), `${label}截图`, 5000)
  } catch (error) {
    screenshotSupported = false
    const reason = `微信开发者工具截图接口不可用，运行态业务断言继续执行：${error?.message || error}`
    fs.writeFileSync(path.join(outputDir, '截图限制说明.txt'), `${reason}\n`, 'utf8')
    console.warn(reason)
  }
}

async function assertEmptyStateLayout(page, label) {
  const state = await waitForSelector(page, '#relation-empty-state', `${label}空态`)
  const illustration = await waitForSelector(page, '#relation-empty-illustration', `${label}空态插画`)
  const image = await illustration.$('image')
  const message = await state.$('text')
  assert.ok(image, `${label}空态必须展示插画`)
  assert.ok(message, `${label}空态必须展示文案`)
  const [stateOffset, stateSize, imageOffset, imageSize, messageOffset, messageSize, stateWxml] = await Promise.all([
    state.offset(),
    state.size(),
    image.offset(),
    image.size(),
    message.offset(),
    message.size(),
    state.outerWxml(),
  ])
  const stateCenter = stateOffset.left + stateSize.width / 2
  const imageCenter = imageOffset.left + imageSize.width / 2
  assert.ok(Math.abs(stateCenter - imageCenter) <= 1, `${label}空态插画必须水平居中`)
  assert.ok(imageOffset.top - stateOffset.top <= 90, `${label}空态插画必须靠上展示，不能整体垂直居中`)
  assert.ok(messageOffset.top > imageOffset.top + imageSize.height, `${label}空态文案必须位于插画下方`)
  assert.equal(await page.$('#relation-membership-entry'), null, `${label}无数据时不得展示会员入口按钮`)
  assert.doesNotMatch(stateWxml, /重新加载/, `${label}空态不得展示重新加载按钮`)
}

;(async () => {
  let miniProgram
  try {
    await mock.start()
    fs.mkdirSync(outputDir, { recursive: true })
    if (!screenshotRequested) {
      fs.writeFileSync(
        path.join(outputDir, '截图限制说明.txt'),
        '当前微信开发者工具窗口禁止屏幕共享且 screenshot 自动化指令超时，本次仅执行完整运行态业务断言；设置 RELATION_CAPTURE_SCREENSHOTS=true 可在工具恢复后补采。\n',
        'utf8',
      )
    }
    if (process.env.RELATION_SKIP_BUILD !== 'true') {
      execFileSync('npm', ['run', 'build:weapp'], {
        cwd: projectPath,
        stdio: 'inherit',
        env: {
          ...process.env,
          MINIAPP_E2E_MODE: 'true',
          MINIAPP_E2E_API_BASE_URL: `http://127.0.0.1:${apiPort}/api`,
          MINIAPP_DEV_FIXED_LOGIN: 'true',
        },
      })
      // 外部构建完成后，给微信开发者工具留出重新编译模拟器产物的时间。
      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    try {
      miniProgram = await timeout(automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }), '连接现有微信自动化端口', 5000)
    } catch {
      miniProgram = await automator.launch({ cliPath, projectPath, port: automationPort, args: ['--port', String(idePort)], trustProject: true })
    }
    console.log('已连接微信自动化端口')
    const exceptions = []
    const collectException = error => exceptions.push(String(error?.message || error))
    miniProgram.on('exception', collectException)

    let page = await relaunch(miniProgram, '/pages/community/index?tab=likes', '#relation-feedback-page')
    console.log('开始校验喜欢列表')
    await waitForSelector(page, '#relation-likes-panel', '喜欢列表')
    console.log('喜欢列表已渲染')
    const likesRequest = requests('/miniapp/relation/likes-me', 'GET')[0]
    const readRequest = requests('/miniapp/relation/likes-me/read', 'POST')[0]
    assert.ok(likesRequest && readRequest, '喜欢列表和已读确认都必须发出')
    assert.ok(likesRequest.at <= readRequest.at, '已读确认不得早于喜欢列表响应后的渲染')
    assert.equal(readRequest.body.readCursor, 'read-cursor-1', '已读确认必须使用接口 readCursor')
    console.log('喜欢列表请求时序通过，开始截图')
    await captureEvidence(miniProgram, '01-喜欢列表真实数据.png', '喜欢列表')
    console.log('喜欢列表截图完成')

    const loadMore = await waitForSelector(page, '#relation-load-more', '喜欢列表加载更多')
    await loadMore.tap()
    await page.waitFor(500)
    const secondPage = requests('/miniapp/relation/likes-me', 'GET').find(item => item.query.page === '2')
    assert.equal(secondPage?.query.snapshotCursor, 'read-cursor-1', '喜欢列表翻页必须复用首屏快照游标')

    const lockedCard = await waitForSelector(page, '#relation-card-LIK-BLUR', '模糊喜欢卡片')
    console.log('开始校验单人解锁')
    await lockedCard.tap()
    await waitForSelector(page, '#relation-unlock-sheet', '单人解锁弹层')
    assert.equal(requests('/miniapp/asset/unlock/quote', 'POST').length, 0, '打开首层弹窗不得请求报价')
    let unlockButton = await waitForSelector(page, '#unlock-one-button', '只看 Ta')
    await unlockButton.tap()
    await page.waitFor(400)
    assert.equal(requests('/miniapp/asset/unlock/quote', 'POST').length, 1, '只看 Ta 必须只请求一次报价')
    unlockButton = await waitForSelector(page, '#unlock-one-button', '确认解锁')
    await Promise.all([unlockButton.tap(), unlockButton.tap().catch(() => undefined)])
    await page.waitFor(700)
    const confirms = requests('/miniapp/asset/unlock/confirm', 'POST')
    assert.equal(confirms.length, 1, '重复点击只能提交一次解锁确认')
    assert.equal(confirms[0].body.requestId.startsWith('unlock-LIK-BLUR-'), true, '解锁确认必须携带稳定 requestId')
    await captureEvidence(miniProgram, '02-单人解锁成功.png', '解锁成功')

    page = await relaunch(miniProgram, '/pages/community/index?tab=visitors', '#relation-feedback-page')
    console.log('开始校验访客分组')
    await waitForSelector(page, '#relation-visitors-panel', '访客列表')
    await waitForSelector(page, '#relation-card-VIS-TODAY', '今天来访分组')
    await waitForSelector(page, '#relation-card-VIS-YESTERDAY', '昨天来访分组')
    await waitForSelector(page, '#relation-card-VIS-EARLIER', '更早来访分组')
    await captureEvidence(miniProgram, '03-访客分组.png', '访客分组')

    mock.state.likesMode = 'empty'
    console.log('开始校验空态与错误态')
    page = await relaunch(miniProgram, '/pages/community/index?tab=likes', '#relation-feedback-page')
    await assertEmptyStateLayout(page, '喜欢列表')
    await captureEvidence(miniProgram, '04-喜欢列表空态.png', '喜欢空态')

    mock.state.visitorsMode = 'empty'
    page = await relaunch(miniProgram, '/pages/community/index?tab=visitors', '#relation-feedback-page')
    await assertEmptyStateLayout(page, '访客列表')
    await captureEvidence(miniProgram, '04b-访客列表空态.png', '访客空态')
    mock.state.visitorsMode = 'ready'

    mock.state.likesMode = 'error'
    page = await relaunch(miniProgram, '/pages/community/index?tab=likes', '#relation-feedback-page')
    await waitForSelector(page, '#relation-error-state', '喜欢列表错误态')
    await captureEvidence(miniProgram, '05-喜欢列表错误重试态.png', '喜欢错误态')

    mock.state.likesMode = 'ready'
    mock.state.matchPopup = null
    page = await relaunch(miniProgram, '/pages/heart/mutual', '#mutual-likes-page')
    console.log('开始校验相互喜欢分页')
    await waitForSelector(page, '#mutual-load-more', '相互喜欢分页')
    await (await page.$('#mutual-load-more')).tap()
    await page.waitFor(400)
    assert.equal(requests('/miniapp/relation/mutual-matches', 'GET').some(item => item.query.page === '2'), true, '相互喜欢必须支持分页')
    await captureEvidence(miniProgram, '07-相互喜欢真实分页.png', '相互喜欢')

    mock.state.matchPopup = { matchNo: 'MAT-101', matchedUserId: 101, nickname: '清风', avatar: null, matchSource: 'double_like', matchTime: '2026-08-04 17:00:00', canEnterConversation: true, popupStatus: 'pending' }
    mock.state.failMatchAckOnce = true
    page = await relaunch(miniProgram, '/pages/community/index?tab=likes', '#relation-feedback-page')
    console.log('开始校验匹配弹窗与公开资料')
    await waitForSelector(page, '#relation-match-popup', '匹配弹窗')
    const profileTab = await waitForSelector(page, '[id$="app-tab-profile"]', '匹配弹窗下的底部我的 Tab')
    await profileTab.tap()
    page = await waitForPagePath(miniProgram, 'pages/profile/index')
    assert.equal(page.path, 'pages/profile/index', '匹配弹窗展示时仍必须允许切换底部 Tab')
    page = await relaunch(miniProgram, '/pages/community/index?tab=likes', '#relation-feedback-page')
    await waitForSelector(page, '#relation-match-popup', '重新进入心动页后的匹配弹窗')
    let profileButton = await waitForSelector(page, '#match-profile-button', '匹配资料按钮')
    await profileButton.tap()
    console.log('匹配回执失败请求已触发')
    await page.waitFor(1800)
    assert.ok(await page.$('#relation-match-popup'), '回执失败时匹配弹窗必须保留')
    console.log('匹配回执失败后弹窗保留通过')
    profileButton = await waitForSelector(page, '#match-profile-button', '匹配资料重试按钮')
    const beforeProfileRequests = mock.state.requests.length
    await profileButton.tap()
    console.log('匹配回执重试已触发')
    page = await waitForPagePath(miniProgram, 'pages/heart/user')
    console.log(`匹配回执重试后的页面：${page.path}`)
    assert.equal(page.path, 'pages/heart/user', '匹配回执成功后必须进入公开资料页')
    await waitForSelector(page, '#public-profile-page', '公开资料页')
    console.log('公开资料页已渲染')
    const profileIndex = await waitForMockRequest('/miniapp/profile/public/101', beforeProfileRequests)
    const visitIndex = await waitForMockRequest('/miniapp/relation/visits', beforeProfileRequests)
    console.log(`公开资料请求序号=${profileIndex}，访问上报请求序号=${visitIndex}`)
    assert.ok(profileIndex >= 0 && visitIndex > profileIndex, '必须先成功加载公开资料，再上报访问')
    await captureEvidence(miniProgram, '06-真实公开资料页.png', '公开资料')

    assert.equal(exceptions.length, 0, `微信运行异常：${exceptions.join('；')}`)
    const evidenceStatus = screenshotSupported ? `截图：${outputDir}` : `截图受微信开发者工具限制，说明：${path.join(outputDir, '截图限制说明.txt')}`
    console.log(`关系反馈与互动链路微信运行态自动化通过，${evidenceStatus}`)
  } finally {
    if (miniProgram) miniProgram.disconnect()
    await mock.close().catch(() => undefined)
  }
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
})
