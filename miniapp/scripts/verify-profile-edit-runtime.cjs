/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9425)
const idePort = Number(process.env.WX_IDE_PORT || 57814)

function withTimeout(promise, label, timeout = 20000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), timeout)),
  ])
}

async function allTexts(page) {
  const elements = await withTimeout(page.$$('text'), '读取页面文本')
  return Promise.all(elements.map(element => element.text()))
}

async function assertTexts(page, expected) {
  const text = (await allTexts(page)).join('|')
  for (const value of expected) assert.ok(text.includes(value), `页面缺少文本：${value}`)
  return text
}

async function findTextElement(page, value) {
  const elements = await page.$$('text')
  for (const element of elements) {
    if ((await element.text()) === value) return element
  }
  return undefined
}

async function waitForElementText(page, selector, matcher, label, timeout = 6000) {
  const startedAt = Date.now()
  let lastText = ''
  while (Date.now() - startedAt < timeout) {
    const element = await page.$(selector)
    const text = element ? await element.text() : ''
    lastText = text
    if (matcher.test(text)) return { element, text }
    await page.waitFor(200)
  }
  throw new Error(`${label}未在${timeout}ms内出现，最后文本：${lastText || '空'}`)
}

async function waitForPageText(page, value, label, timeout = 6000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    const element = await findTextElement(page, value)
    if (element) return element
    await page.waitFor(200)
  }
  throw new Error(`${label}未在${timeout}ms内出现`)
}

async function waitForElement(page, selector, label, timeout = 6000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    const element = await page.$(selector)
    if (element) return element
    await page.waitFor(200)
  }
  throw new Error(`${label}未在${timeout}ms内出现`)
}

async function open(miniProgram, route) {
  let page = await withTimeout(miniProgram.reLaunch(route), `${route} 跳转`)
  await page.waitFor(4200)
  let current = await miniProgram.currentPage()
  const expectedPath = route.split('?')[0].slice(1)
  if (current.path !== expectedPath) {
    page = await withTimeout(miniProgram.navigateTo(route), `${route} 二次跳转`)
    await page.waitFor(1800)
    current = await miniProgram.currentPage()
  }
  assert.equal(current.path, expectedPath, `${route} 路由不一致`)
  return page
}

;(async () => {
  let miniProgram
  try {
    miniProgram = await withTimeout(
      automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }),
      '连接微信自动化端口',
      5000,
    )
  } catch (_) {
    miniProgram = await automator.launch({
      cliPath,
      projectPath,
      port: automationPort,
      args: ['--port', String(idePort)],
      trustProject: true,
    })
  }

  const exceptions = []
  const consoleErrors = []
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  miniProgram.on('console', message => {
    if (message?.type === 'error') consoleErrors.push(JSON.stringify(message))
  })

  // 自动化进程使用本地开发固定账号，避免全新开发者工具实例被登录守卫重定向。
  await miniProgram.callWxMethod('setStorageSync', 'token', 'dev-fixed-token-17366629764')

  let page = await open(miniProgram, '/pages/profile/edit')
  const editTexts = await assertTexts(page, ['编辑资料', '主页预览', '基础资料', '我的标签', '关于我', '爱听的歌曲', '见面便好', '喜欢的见面活动', '住房情况'])
  const backButton = await page.$('.profile-edit-back')
  assert.ok(backButton, '编辑资料页缺少可点击返回按钮')
  await backButton.tap()
  await page.waitFor(1200)
  assert.equal((await miniProgram.currentPage()).path, 'pages/profile/index', '单页栈点击返回必须进入“我的”页面')

  page = await open(miniProgram, '/pages/profile/edit')
  const previewTab = await findTextElement(page, '主页预览')
  if (previewTab) await previewTab.tap()
  await page.waitFor(1200)
  assert.equal(exceptions.length, 0, `主页预览存在运行异常：${exceptions.join('；')}`)
  assert.ok(editTexts.includes('主页预览'))

  page = await open(miniProgram, '/pages/profile/edit?voice=voice')
  const recordButton = await page.$('#voice-round-button')
  assert.ok(recordButton, '语音录制浮层缺少可点击录音按钮')
  await recordButton.tap()
  await waitForElementText(page, '#voice-duration', /^00:10$/, '语音录制动态读秒与最小时长', 14000)
  const stopButton = await page.$('#voice-round-button')
  assert.ok(stopButton, '录音开始后缺少停止按钮')
  await stopButton.tap()
  await waitForPageText(page, '录制完成', '录音停止后的完成态')
  const playButton = await page.$('#voice-round-button')
  assert.ok(playButton, '录制完成后缺少试听按钮')
  await playButton.tap()
  await waitForPageText(page, '试听语音', '本地录音试听态')
  const pauseButton = await page.$('#voice-round-button')
  assert.ok(pauseButton, '试听中缺少暂停按钮')
  await pauseButton.tap()
  await waitForPageText(page, '录制完成', '暂停后的完成态')
  const deleteButton = await findTextElement(page, '删除')
  assert.ok(deleteButton, '录制完成后缺少删除入口')
  await deleteButton.tap()
  await waitForPageText(page, '删除提示', '本地录音删除确认态')
  const confirmDelete = await page.$('#voice-confirm-left')
  assert.ok(confirmDelete, '删除确认弹层缺少蓝湖删除按钮')
  await confirmDelete.tap()
  await page.waitFor(500)
  assert.equal(await page.$('#voice-confirm-left'), null, '删除本地录音后弹层未关闭')
  await waitForPageText(page, '使用语音介绍特别的你', '删除本地录音后的初始态恢复')

  page = await open(miniProgram, '/pages/verification/my-certification')
  await assertTexts(page, ['我的认证', '为什么要认证', '头像认证', '实名认证', '学历认证'])

  page = await open(miniProgram, '/pages/profile-edit/tags')
  await assertTexts(page, ['我的标签', '全部', '已添加'])

  page = await open(miniProgram, '/pages/profile-edit/about')
  await assertTexts(page, ['关于我', '全部', '我是谁', '我的日常', '我的故事', '我热爱的'])

  page = await open(miniProgram, '/pages/profile-edit/songs')
  const songTexts = await assertTexts(page, ['爱听的歌曲'])
  assert.ok(!songTexts.includes('没有找到相关歌曲'), '歌曲页首屏推荐数据仍为空')
  assert.ok(await page.$('input'), '歌曲页缺少搜索输入框')

  page = await open(miniProgram, '/pages/verification/avatar')
  await assertTexts(page, ['添加头像'])

  miniProgram.disconnect()
  assert.equal(exceptions.length, 0, `小程序运行异常：${exceptions.join('；')}`)
  assert.equal(consoleErrors.length, 0, `小程序控制台异常：${consoleErrors.join('；')}`)
  console.log('编辑资料闭环微信运行态验证通过')
  process.exit(0)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
})
