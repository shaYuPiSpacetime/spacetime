/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const outputBaseDir = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-08-04-地址两级联动闭环/微信运行')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9420)
const idePort = Number(process.env.WX_IDE_PORT || 9527)
const scenes = [
  ['01', '/pages/index/index', '未认证入口'],
  ['02', '/pages/verification/basic', '认证-基本资料'],
  ['03', '/pages/verification/avatar', '认证-添加头像'],
  ['04', '/pages/verification/intro', '认证-自我介绍'],
  ['05', '/pages/verification/triple', '认证-三重认证'],
  ['06', '/pages/verification/basic', '认证-基本资料-家乡'],
  ['07', '/pages/login/address?variant=manual', '首登-现居地-省市'],
]
const requestedIds = String(process.env.VERIFICATION_SCENE_IDS || '').split(',').filter(Boolean)
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
      args: ['--port', String(idePort)],
      trustProject: true,
    })
  }

  const testToken = String(process.env.WX_TEST_TOKEN || '').trim()
  if (testToken) {
    await miniProgram.callWxMethod('setStorageSync', 'token', testToken)
  }

  const exceptions = []
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  miniProgram.on('console', message => console.log('小程序控制台', JSON.stringify(message)))
  const systemInfo = await miniProgram.systemInfo()
  const outputDir = `${outputBaseDir}-${systemInfo.windowWidth}x${systemInfo.windowHeight}`
  fs.mkdirSync(outputDir, { recursive: true })
  console.log('模拟器信息', JSON.stringify(systemInfo))

  for (const [id, route, name] of scenesToCapture) {
    let page
    try {
      page = await withTimeout(miniProgram.reLaunch(route), `${name}跳转`)
    } catch (error) {
      const current = await miniProgram.currentPage()
      const expectedPath = route.slice(1).split('?')[0]
      if (current.path !== expectedPath) throw error
      page = current
      console.warn(`${name}重载回执超时，运行页已就绪，继续截图`)
    }
    await page.waitFor(1600)
    const current = await miniProgram.currentPage()
    const expectedPath = route.slice(1).split('?')[0]
    if (current.path !== expectedPath) throw new Error(`${name}路由错误：${current.path}`)
    if (id === '06') {
      const texts = await page.$$('text')
      let hometownRow
      for (const textNode of texts) {
        if ((await textNode.text()) === '家乡') {
          hometownRow = textNode
          break
        }
      }
      if (!hometownRow) throw new Error('未找到家乡字段')
      await hometownRow.tap()
      await page.waitFor(1200)
    }
    await withTimeout(miniProgram.screenshot({ path: path.join(outputDir, `${id}-${name}.png`) }), `${name}截图`, 30000)
    console.log('已截图', name)
  }

  miniProgram.disconnect()
  if (exceptions.length) throw new Error(`运行异常：${exceptions.join('；')}`)
  console.log(`认证强引导微信运行截图完成：${outputDir}`)
  process.exit(0)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
})
