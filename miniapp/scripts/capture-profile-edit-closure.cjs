/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const outputBaseDir = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-07-15-编辑资料闭环/微信运行')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9420)
const scenes = [
  ['01', '/pages/profile/edit', '编辑资料'],
  ['02', '/pages/verification/my-certification', '我的认证'],
  ['03', '/pages/profile-edit/tags', '我的标签'],
  ['04', '/pages/profile-edit/about', '关于我'],
  ['05', '/pages/profile-edit/songs', '爱听的歌曲'],
  ['06', '/pages/verification/avatar', '添加头像'],
  ['07', '/pages/verification/avatar', '添加头像-选择来源'],
]
const requestedIds = String(process.env.PROFILE_EDIT_SCENE_IDS || '').split(',').filter(Boolean)
const scenesToCapture = requestedIds.length ? scenes.filter(([id]) => requestedIds.includes(id)) : scenes

function withTimeout(promise, label, timeout = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), timeout)),
  ])
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
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  miniProgram.on('console', message => {
    const text = JSON.stringify(message)
    if (/error|ReferenceError|TypeError/i.test(text)) console.error('小程序控制台异常', text)
  })

  const systemInfo = await miniProgram.systemInfo()
  const outputDir = `${outputBaseDir}-${systemInfo.windowWidth}x${systemInfo.windowHeight}`
  fs.mkdirSync(outputDir, { recursive: true })
  console.log('模拟器信息', JSON.stringify(systemInfo))

  for (const [id, route, name] of scenesToCapture) {
    const page = await withTimeout(miniProgram.reLaunch(route), `${name}跳转`)
    await page.waitFor(name === '编辑资料' ? 3200 : 4200)
    const current = await miniProgram.currentPage()
    const expectedPath = route.slice(1)
    if (current.path !== expectedPath) throw new Error(`${name}路由错误：期望 ${expectedPath}，实际 ${current.path}`)
    if (id === '07') {
      const elements = await page.$$('text')
      let trigger
      for (const element of elements) {
        if ((await element.text()).includes('去选照片')) {
          trigger = element
          break
        }
      }
      if (!trigger) throw new Error('未找到头像来源选择入口')
      await trigger.tap()
      await page.waitFor(500)
    }
    await withTimeout(
      miniProgram.screenshot({ path: path.join(outputDir, `${id}-${name}.png`) }),
      `${name}截图`,
      30000,
    )
    console.log('已截图', name)
  }

  miniProgram.disconnect()
  if (exceptions.length) throw new Error(`运行异常：${exceptions.join('；')}`)
  console.log(`编辑资料闭环微信运行截图完成：${outputDir}`)
  process.exit(0)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
})
