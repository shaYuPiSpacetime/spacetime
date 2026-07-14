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

  await open('/pages/message/whisper-detail?mockScene=whisper-report-sheet')
  const sheet = page.locator('.message-action-sheet')
  await sheet.getByText('取消', { exact: true }).click()
  if (await sheet.count()) throw new Error('举报操作面板点击取消后未关闭')

  await open('/pages/message/whisper-detail?mockScene=whisper-report-sheet')
  await page.locator('.message-action-sheet').getByText('举报', { exact: true }).click()
  await page.waitForTimeout(200)
  if (!page.url().includes('/pages/message/report')) throw new Error('举报入口未进入举报表单')

  await open('/pages/message/report?mockScene=report-form')
  await page.getByText('头像非本人或无法看清正脸', { exact: true }).click()
  await page.locator('textarea').fill('头像与本人不符')
  await page.getByText('提交', { exact: true }).click()
  await page.getByText('知道啦', { exact: true }).waitFor()
  if ((await page.getByText('提交成功', { exact: true }).count()) < 1)
    throw new Error('举报提交后未显示成功页')

  await page.getByText('知道啦', { exact: true }).click()
  await page.waitForTimeout(200)
  if (!page.url().includes('/pages/chat/index') && !page.url().includes('/pages/message/whisper-detail'))
    throw new Error(`举报成功页返回路径异常：${page.url()}`)

  await browser.close()
  if (failures.length) throw new Error(`页面异常：${[...new Set(failures)].join('；')}`)
  console.log('消息 18 稿举报链路 H5 核心交互验证通过')
})().catch(error => {
  console.error(error && error.stack ? error.stack : error)
  process.exit(1)
})
