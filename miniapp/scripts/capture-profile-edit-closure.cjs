/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const outputBaseDir = process.env.PROFILE_EDIT_CAPTURE_DIR
  ? path.resolve(process.env.PROFILE_EDIT_CAPTURE_DIR)
  : path.resolve(projectPath, '../docs/验收报告/截图证据/2026-07-15-编辑资料闭环/微信运行')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9420)
const idePort = Number(process.env.WX_IDE_PORT || 9527)
const scenes = [
  ['01', '/pages/profile/edit', '编辑资料'],
  ['02', '/pages/verification/my-certification', '我的认证'],
  ['03', '/pages/profile-edit/tags', '我的标签'],
  ['04', '/pages/profile-edit/about', '关于我'],
  ['05', '/pages/profile-edit/songs', '爱听的歌曲'],
  ['06', '/pages/verification/avatar', '添加头像'],
  ['07', '/pages/verification/avatar', '添加头像-选择来源'],
  ['08', '/pages/verification/basic?from=profile', '编辑基本资料'],
  ['09', '/pages/verification/basic?from=profile', '编辑基本资料-职业资料与保存'],
  ['10', '/pages/profile-edit/intro', '自我介绍'],
  ['11', '/pages/profile/edit', '编辑资料-基础认证'],
  ['12', '/pages/profile/edit', '编辑资料-标签语音关于我'],
  ['13', '/pages/profile/edit', '编辑资料-歌曲微信'],
  ['14', '/pages/profile/edit', '主页预览-真实内容'],
  ['15', '/pages/profile/edit?voice=voice', '语音介绍-初始态'],
  ['16', '/pages/profile/edit?voice=recording', '语音介绍-录制中'],
  ['17', '/pages/profile/edit?voice=complete', '语音介绍-完成态'],
  ['18', '/pages/profile/edit?voice=delete', '语音介绍-删除确认'],
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
      args: ['--port', String(idePort)],
      trustProject: true,
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

  // 截图脚本只在本地开发产物中使用固定账号，避免发布构建登录守卫干扰页面基线采集。
  await miniProgram.callWxMethod('setStorageSync', 'token', 'dev-fixed-token-17366629764')

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
    await page.waitFor(name.startsWith('编辑资料') ? 3200 : 4200)
    const current = await miniProgram.currentPage()
    const expectedPath = route.slice(1).split('?')[0]
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
    if (id === '09') {
      const scrollView = await page.$('scroll-view')
      if (!scrollView) throw new Error('未找到编辑基本资料滚动容器')
      await scrollView.scrollTo(0, 1400)
      await page.waitFor(900)
    }
    if (id === '11' || id === '12' || id === '13') {
      const scrollView = await page.$('scroll-view')
      if (!scrollView) throw new Error('未找到编辑资料滚动容器')
      const scrollTop = id === '11' ? 820 : id === '12' ? 1500 : 2300
      await scrollView.scrollTo(0, scrollTop)
      await page.waitFor(900)
    }
    if (id === '14') {
      const elements = await page.$$('text')
      let previewTab
      for (const element of elements) {
        if ((await element.text()) === '主页预览') {
          previewTab = element
          break
        }
      }
      if (!previewTab) throw new Error('未找到主页预览页签')
      await previewTab.tap()
      await page.waitFor(1200)
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
