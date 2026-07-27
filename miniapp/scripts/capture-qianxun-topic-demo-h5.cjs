/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('../../frontend/node_modules/playwright')

const baseUrl = process.env.QIANXUN_H5_BASE_URL || 'http://127.0.0.1:10088'
const outputDir = path.resolve(__dirname, '../../docs/验收报告/截图证据/2026-07-22-千寻话题闭环/H5运行-375x812')

;(async () => {
  fs.mkdirSync(outputDir, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--disable-web-security'],
  })
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(token => localStorage.setItem('token', JSON.stringify({ data: token })), 'dev-fixed-token-17366629764')

  await page.goto(`${baseUrl}/#/pages/index/index`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(outputDir, '00-入口诊断.png') })
  const hot = page.locator('#qianxun-scene-HOT')
  await hot.waitFor({ state: 'visible', timeout: 15000 })
  await hot.click()
  await page.locator('#qianxun-topic-spotlight').waitFor({ state: 'visible', timeout: 15000 })
  await page.screenshot({ path: path.join(outputDir, '01-热门-社区话题.png') })

  await page.locator('#qianxun-topic-featured').click()
  await page.locator('#qianxun-topic-page').waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(outputDir, '02-话题详情.png') })

  await page.locator('#qianxun-topic-participate').click()
  await page.locator('#qianxun-compose-page').waitFor({ state: 'visible', timeout: 15000 })
  await page.screenshot({ path: path.join(outputDir, '02-1-参与话题发布.png') })

  await page.goto(`${baseUrl}/#/pages/qianxun/topics`, { waitUntil: 'networkidle' })
  await page.locator('#qianxun-topics-page').waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(outputDir, '03-社区话题列表.png') })

  await browser.close()
  if (errors.length) throw new Error(`H5 页面异常：${[...new Set(errors)].join('；')}`)
  console.log(`千寻话题 Demo H5 诊断截图完成（仅验证路由与交互，不作为小程序像素验收）：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
})
