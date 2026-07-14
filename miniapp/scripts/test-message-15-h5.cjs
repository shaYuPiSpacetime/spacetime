/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const { chromium } = require('../../frontend/node_modules/playwright')

const baseUrl = 'http://127.0.0.1:10087/#'

;(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  })
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  const failures = []
  page.on('pageerror', error => failures.push(error.message))

  const open = async route => {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(250)
  }

  const verifyHomeEntry = async (label, expectedPath) => {
    await open('/pages/chat/index?mockScene=home')
    await page.getByText(label, { exact: true }).first().click()
    await page.waitForTimeout(250)
    if (!page.url().includes(expectedPath)) throw new Error(`首页“${label}”跳转失败：${page.url()}`)
  }

  await verifyHomeEntry('悄悄话', '/pages/message/whisper-list')
  await verifyHomeEntry('私信', '/pages/message/private-list')
  await verifyHomeEntry('官方小助手', '/pages/message/channel')
  await verifyHomeEntry('系统消息', '/pages/message/channel')

  await open('/pages/message/whisper-list?mockScene=whisper-received')
  await page.getByText('我申请的', { exact: true }).click()
  await page.waitForTimeout(150)
  if (await page.getByText('未处理(4)', { exact: true }).count())
    throw new Error('悄悄话 Tab 未切换到“我申请的”')

  await open('/pages/message/whisper-list?mockScene=whisper-received')
  await page.getByText('一只筱脑虎', { exact: true }).first().click()
  await page.getByText('立即申请', { exact: true }).waitFor()

  await open('/pages/message/whisper-list?mockScene=whisper-delete-sheet')
  await page.getByText('全部删除', { exact: true }).click()
  await page.waitForTimeout(150)
  if (await page.getByText('全部删除', { exact: true }).count())
    throw new Error('全部删除操作面板未关闭')

  await open('/pages/message/private-list?mockScene=private-list')
  await page.getByText('一只筱脑虎', { exact: true }).click()
  await page.waitForTimeout(250)
  if (!page.url().includes('/pages/message/private-chat')) throw new Error('私信会话跳转失败')

  await open('/pages/message/private-chat?mockScene=private-chat-reply')
  await page.locator('input').fill('测试失败')
  await page.getByText('发送', { exact: true }).click()
  await page.getByText('重新发送', { exact: true }).waitFor()
  await page.getByText('重新发送', { exact: true }).click()
  await page.waitForTimeout(200)
  if (await page.getByText('重新发送', { exact: true }).count())
    throw new Error('失败消息重试弹层未关闭')

  await browser.close()
  if (failures.length) throw new Error(`页面异常：${[...new Set(failures)].join('；')}`)
  console.log('消息 15 稿 H5 核心交互验证通过')
})().catch(error => {
  console.error(error && error.stack ? error.stack : error)
  process.exit(1)
})
