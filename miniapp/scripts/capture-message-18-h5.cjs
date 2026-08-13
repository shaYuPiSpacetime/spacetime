/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('../../frontend/node_modules/playwright')

const scenes = [
  ['626cd513', '/pages/chat/index?mockScene=home', '消息首页'],
  ['4eefc2dd', '/pages/message/whisper-list?mockScene=whisper-received', '悄悄话-申请我的'],
  ['955469c9', '/pages/message/whisper-list?mockScene=whisper-delete-sheet', '悄悄话-全部删除'],
  ['57f51864', '/pages/message/whisper-list?mockScene=whisper-sent', '悄悄话-我申请的'],
  ['797ff271', '/pages/message/whisper-detail?mockScene=whisper-detail-expired', '悄悄话-申请我的详情'],
  ['60f5f2a4', '/pages/message/whisper-detail?mockScene=whisper-detail-matched', '悄悄话-匹配成功'],
  ['5cff0169', '/pages/message/whisper-detail?mockScene=whisper-detail-sent-expired', '悄悄话-我申请的详情'],
  ['da4cd120', '/pages/message/whisper-detail?mockScene=whisper-compose', '悄悄话-申请编辑'],
  ['4ee98b8d', '/pages/message/whisper-detail?mockScene=whisper-report-sheet', '悄悄话-举报面板'],
  ['a3c5e11a', '/pages/message/report?mockScene=report-form', '用户举报'],
  ['fa13c6d0', '/pages/message/report?mockScene=report-success', '举报提交成功'],
  ['aabf0ea4', '/pages/message/private-list?mockScene=private-list', '私信列表'],
  ['798b68f9', '/pages/message/channel?mockScene=channel-assistant', '官方小助手'],
  ['e3ab4fcf', '/pages/message/private-chat?mockScene=private-chat-default', '私信-默认聊天'],
  ['4a0eaf37', '/pages/message/private-chat?mockScene=private-chat-input', '私信-输入态'],
  ['5e8feaf3', '/pages/message/private-chat?mockScene=private-chat-reply', '私信-回复态'],
  ['38ecd723', '/pages/message/private-chat?mockScene=private-chat-retry', '私信-失败重发'],
  ['ff867af1', '/pages/message/channel?mockScene=channel-system', '系统消息'],
]

const requestedIds = (process.env.MESSAGE_SCENE_IDS || '').split(',').filter(Boolean)
const scenesToCapture = requestedIds.length
  ? scenes.filter(([designId]) => requestedIds.includes(designId))
  : scenes
const [width, height] = (process.env.MESSAGE_VIEWPORT || '375x812').split('x').map(Number)
const outputDir = process.env.MESSAGE_CAPTURE_OUTPUT_DIR
  ? path.resolve(process.env.MESSAGE_CAPTURE_OUTPUT_DIR)
  : path.resolve(
      __dirname,
      `../../docs/验收报告/截图证据/2026-07-14-消息18稿/H5运行-${width}x${height}`
    )

;(async () => {
  fs.mkdirSync(outputDir, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  })
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(token => {
    localStorage.setItem('token', JSON.stringify({ data: token }))
  }, 'dev-fixed-token-17366629764')

  for (const [designId, route, name] of scenesToCapture) {
    await page.goto(`http://127.0.0.1:10087/#${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(name.includes('输入态') ? 1000 : 500)
    await page.screenshot({ path: path.join(outputDir, `${designId}-${name}.png`) })
    console.log(`已截图 ${designId} ${name}`)
  }

  await browser.close()
  if (errors.length) throw new Error(`H5 页面异常：${[...new Set(errors)].join('；')}`)
  if (scenesToCapture.length !== (requestedIds.length || 18)) {
    throw new Error(`请求场景与实际截图数量不一致：${scenesToCapture.length}`)
  }
  console.log(`消息 18 稿 H5 固定视口截图完成：${outputDir}`)
})().catch(error => {
  console.error(error && error.stack ? error.stack : error)
  process.exit(1)
})
