/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = '/Users/bobo/IdeaProjects/shayupi/spacetime/miniapp'
const outputBaseDir = path.join(
  projectPath,
  '../docs/验收报告/截图证据/2026-07-14-消息18稿/微信运行'
)
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = process.env.WX_AUTO_PORT || '9420'

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

function withTimeout(promise, label, timeout = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} 超时`)), timeout)),
  ])
}

;(async () => {
  let miniProgram
  try {
    miniProgram = await withTimeout(
      automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }),
      '连接微信自动化端口',
      5000
    )
  } catch (_) {
    miniProgram = await automator.launch({
      cliPath,
      projectPath,
      port: Number(automationPort),
      args: ['--port', '9527'],
    })
  }

  miniProgram.on('exception', error => console.log('小程序异常', JSON.stringify(error)))
  const systemInfo = await miniProgram.systemInfo()
  const outputDir = `${outputBaseDir}-${systemInfo.windowWidth}x${systemInfo.windowHeight}`
  fs.mkdirSync(outputDir, { recursive: true })
  console.log('模拟器信息', JSON.stringify(systemInfo))

  for (const [designId, route, name] of scenesToCapture) {
    const page = await withTimeout(miniProgram.reLaunch(route), `${name} reLaunch`)
    await page.waitFor(name.includes('输入态') ? 1800 : 1100)
    const current = await miniProgram.currentPage()
    if (current.path !== route.split('?')[0].slice(1)) {
      throw new Error(`${name} 路由错误：${current.path}`)
    }
    await withTimeout(
      miniProgram.screenshot({ path: path.join(outputDir, `${designId}-${name}.png`) }),
      `${name} screenshot`
    )
    console.log('已截图', designId, name)
  }

  miniProgram.disconnect()
  if (scenesToCapture.length !== (requestedIds.length || 18)) {
    throw new Error(`请求场景与实际截图数量不一致：${scenesToCapture.length}`)
  }
  console.log(`消息 18 稿微信运行截图完成：${outputDir}`)
})().catch(error => {
  console.error(error && error.stack ? error.stack : error)
  process.exit(1)
})
