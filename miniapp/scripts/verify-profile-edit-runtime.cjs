/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9425)

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

async function open(miniProgram, route) {
  const page = await withTimeout(miniProgram.reLaunch(route), `${route} 跳转`)
  await page.waitFor(4200)
  const current = await miniProgram.currentPage()
  assert.equal(current.path, route.slice(1), `${route} 路由不一致`)
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
      args: ['--port', '9527'],
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
  const editTexts = await assertTexts(page, ['编辑资料', '主页预览', '基础资料', '我的标签', '关于我', '爱听的歌曲'])
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

  page = await open(miniProgram, '/pages/verification/my-certification')
  await assertTexts(page, ['我的认证', '为什么要认证', '头像认证', '实名认证', '学历认证'])

  page = await open(miniProgram, '/pages/profile-edit/tags')
  await assertTexts(page, ['我的标签', '全部', '已添加'])

  page = await open(miniProgram, '/pages/profile-edit/about')
  await assertTexts(page, ['关于我', '全部', '我是谁', '我的日常', '我的故事', '我热爱的'])

  page = await open(miniProgram, '/pages/profile-edit/songs')
  const songTexts = await assertTexts(page, ['添加爱听的歌曲'])
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
