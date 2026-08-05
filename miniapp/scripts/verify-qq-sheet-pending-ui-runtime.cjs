/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9451)
const idePort = Number(process.env.WX_IDE_PORT || 14672)
const outputDir = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-08-05-腾讯表格待处理UI闭环')

function timeout(promise, label, ms = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms)),
  ])
}

async function open(miniProgram, route, label, waitMs = 2600) {
  const page = await timeout(miniProgram.reLaunch(route), `${label}跳转`)
  await page.waitFor(waitMs)
  assert.equal((await miniProgram.currentPage()).path, route.split('?')[0].slice(1), `${label}路由错误`)
  return page
}

async function waitForPath(miniProgram, expectedPath, label) {
  for (let index = 0; index < 40; index += 1) {
    const current = await miniProgram.currentPage()
    if (current?.path === expectedPath) return current
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.equal((await miniProgram.currentPage())?.path, expectedPath, `${label}路由错误`)
}

async function waitForElement(page, selector, label) {
  for (let index = 0; index < 50; index += 1) {
    const element = await page.$(selector)
    if (element) return element
    await page.waitFor(100)
  }
  assert.fail(`缺少运行态元素：${label}`)
}

async function screenshot(miniProgram, name) {
  if (process.env.SKIP_SCREENSHOTS === '1') return
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, name) }), `${name}截图`, 45000)
}

async function tapAndReconnect(miniProgram, element, expectedPath, label, exceptions) {
  console.log(`运行态：${label}开始点击`)
  await element.tap().catch(() => undefined)
  console.log(`运行态：${label}点击命令结束`)
  miniProgram.disconnect()
  console.log(`运行态：${label}旧连接已断开`)
  const nextMiniProgram = await timeout(
    automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }),
    `${label}后重连`,
    5000,
  )
  console.log(`运行态：${label}重连完成`)
  nextMiniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  await waitForPath(nextMiniProgram, expectedPath, label)
  console.log(`运行态：${label}路由确认完成`)
  return nextMiniProgram
}

async function tapVisibleTab(miniProgram, key, expectedPath, exceptions) {
  const page = await miniProgram.currentPage()
  const tab = await waitForElement(page, `[id$="app-tab-${key}"]`, `${key} 底部 Tab`)
  return tapAndReconnect(miniProgram, tab, expectedPath, `点击 ${key}`, exceptions)
}

;(async () => {
  let miniProgram
  try {
    miniProgram = await timeout(
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

  try {
    const exceptions = []
    miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
    console.log('运行态：自动化连接完成')
    await miniProgram.callWxMethod('setStorageSync', 'token', 'dev-fixed-token-17366629764')
    console.log('运行态：测试登录态写入完成')
    fs.mkdirSync(outputDir, { recursive: true })

    let page
    if (process.env.NAV_ONLY !== '1') {
      page = await open(miniProgram, '/pages/coins/index?variant=recharge-notice', '千寻币充值须知')
      console.log('运行态：千寻币充值须知已打开')
      await screenshot(miniProgram, '01-千寻币余额背景与充值须知.png')
      console.log('运行态：千寻币充值须知截图完成')
      assert.ok(await waitForElement(page, '#coin-balance-watermarks', '余额卡几何水印'))
      assert.ok(await waitForElement(page, '#recharge-notice-card', '充值须知弹窗'))
      assert.ok(await waitForElement(page, '#recharge-notice-body', '充值须知正文'))

      page = await open(miniProgram, '/pages/coins/detail?variant=empty', '千寻币明细空态')
      console.log('运行态：千寻币明细空态已打开')
      const emptyIllustration = await waitForElement(page, '#coin-empty-illustration', '暂无记录插画')
      assert.match(await emptyIllustration.outerWxml(), /coin-empty-illustration/)
      await screenshot(miniProgram, '02-千寻币明细暂无记录.png')

      page = await open(miniProgram, '/pages/qianxun/interactions', '千寻互动')
      console.log('运行态：千寻互动已打开')
      const mineTab = await waitForElement(page, '#qianxun-interactions-tab-mine', '我的动态 Tab')
      await mineTab.tap()
      await page.waitFor(800)
      const guide = await waitForElement(page, '#qianxun-post-guide', '发布动态书本引导卡')
      assert.match(await guide.outerWxml(), /post-guide-bg\.png/)
      await screenshot(miniProgram, '03-千寻互动书本引导卡.png')
    }

    page = await open(miniProgram, '/pages/profile/index', '我的页面')
    console.log('运行态：我的页面已打开')
    const header = await waitForElement(page, '#profile-header-edit-area', '头像资料整体点击区')
    console.log('运行态：头像资料整体点击区已找到')
    for (const index of [0, 1, 2]) assert.ok(await waitForElement(page, `#profile-stat-${index}`, `统计项 ${index + 1}`))
    console.log('运行态：三个统计项已找到')
    await screenshot(miniProgram, '04-我的页面整体还原.png')

    if (process.env.TAB_ONLY !== '1') {
      // 页面销毁速度快于开发者工具回包时，重连后以最终路由作为唯一成功依据。
      if (process.env.SKIP_HEADER !== '1') {
        miniProgram = await tapAndReconnect(miniProgram, header, 'pages/profile/edit', '点击头像资料区', exceptions)
        if (process.env.HEADER_ONLY === '1') {
          assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
          console.log('腾讯表格头像资料整体点击运行态验收通过')
          return
        }
        page = await open(miniProgram, '/pages/profile/index', '返回我的页面')
      }
      const firstStat = await waitForElement(page, '#profile-stat-0', '我喜欢的统计项')
      miniProgram = await tapAndReconnect(miniProgram, firstStat, 'pages/community/index', '统计项跳转心动', exceptions)
      console.log('运行态：统计项跳转心动完成')
      await screenshot(miniProgram, '05-统计项跳转心动.png')
      if (process.env.STAT_ONLY === '1') {
        assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
        console.log('腾讯表格统计项跳转心动运行态验收通过')
        return
      }
    }

    if ((await miniProgram.currentPage()).path !== 'pages/profile/index') {
      miniProgram = await tapVisibleTab(miniProgram, 'profile', 'pages/profile/index', exceptions)
    }
    miniProgram = await tapVisibleTab(miniProgram, 'recommend', 'pages/recommend/index', exceptions)
    miniProgram = await tapVisibleTab(miniProgram, 'community', 'pages/community/index', exceptions)
    miniProgram = await tapVisibleTab(miniProgram, 'chat', 'pages/chat/index', exceptions)
    miniProgram = await tapVisibleTab(miniProgram, 'profile', 'pages/profile/index', exceptions)
    assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)

    console.log(`腾讯表格 26-31 行微信运行态验收通过，截图：${outputDir}`)
  } finally {
    miniProgram.disconnect()
  }
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
})
