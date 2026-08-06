/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9462)
const idePort = Number(process.env.WX_IDE_PORT || 14683)
const mockPort = Number(process.env.LOGIN_PROFILE_MOCK_PORT || 3922)
const outputBaseDir = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-08-05-登录协议与我的未认证-蓝湖还原/微信运行')
const productionApi = 'https://admin.shikongxiehou.com/api'

let profileMode = 'initial'
let server
let connectedMiniProgram

function timeout(promise, label, ms = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms)),
  ])
}

function ok(data) {
  return JSON.stringify({ code: 200, msg: 'success', data })
}

function accessStatus() {
  return {
    canBrowseCards: false,
    canMatch: false,
    canMessage: false,
    canCommunity: false,
    canBeExposed: false,
    coreAccessStatus: 'CORE_BLOCKED',
    blockReasons: ['完成认证后即可使用完整功能'],
  }
}

function verificationStatus() {
  return {
    avatarVerifyStatus: 'NOT_SUBMITTED',
    openTextAuditStatus: 'NOT_SUBMITTED',
    verifyLevel: 0,
    coreAccessStatus: 'CORE_BLOCKED',
    accessStatus: accessStatus(),
  }
}

function localResponse(pathname) {
  if (pathname === '/api/miniapp/profile/home-detail') {
    return {
      profile: {},
      fieldSettings: [],
      verificationStatus: verificationStatus(),
      accessStatus: accessStatus(),
      profileOptionsPath: '/miniapp/dict/profile-options',
      locationOptionsPath: '/miniapp/dict/locations',
      runtimeConfig: {},
    }
  }
  if (pathname === '/api/miniapp/profile/basic') {
    return {
      basicProfileCompleted: profileMode === 'partial',
      missingRequiredFields: profileMode === 'partial' ? [] : ['height'],
      fieldSettings: [],
    }
  }
  if (pathname === '/api/miniapp/profile/introduction') {
    return { auditStatus: 'NOT_SUBMITTED', canSubmit: true }
  }
  if (pathname === '/api/miniapp/verify/status') return verificationStatus()
  return undefined
}

async function proxyOrMock(request, response) {
  const requestUrl = new URL(request.url || '/', `http://127.0.0.1:${mockPort}`)
  const local = localResponse(requestUrl.pathname)
  if (local !== undefined) {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(ok(local))
    return
  }

  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const headers = { 'Content-Type': request.headers['content-type'] || 'application/json' }
  if (request.headers['x-auth-token']) headers['X-Auth-Token'] = request.headers['x-auth-token']
  const upstream = await fetch(`${productionApi}${requestUrl.pathname.replace(/^\/api/, '')}${requestUrl.search}`, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method || 'GET') ? undefined : Buffer.concat(chunks),
  })
  const body = Buffer.from(await upstream.arrayBuffer())
  response.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8' })
  response.end(body)
}

async function waitForElement(page, selector, label) {
  for (let index = 0; index < 60; index += 1) {
    const element = await page.$(selector)
    if (element) return element
    await page.waitFor(100)
  }
  assert.fail(`缺少运行态元素：${label}`)
}

async function open(miniProgram, route, label, waitMs = 2200) {
  let page
  try {
    page = await timeout(miniProgram.reLaunch(route), `${label}跳转`, 12000)
  } catch (error) {
    await new Promise(resolve => setTimeout(resolve, 1200))
    const current = await timeout(miniProgram.currentPage(), `${label}读取当前页`, 8000)
    if (current?.path !== route.split('?')[0].slice(1)) throw error
    page = current
    console.warn(`${label}跳转回执超时，但目标页已就绪，继续验收`)
  }
  await page.waitFor(waitMs)
  assert.equal((await miniProgram.currentPage()).path, route.split('?')[0].slice(1), `${label}路由错误`)
  return page
}

async function screenshot(miniProgram, outputDir, filename) {
  if (process.env.SKIP_RUNTIME_SCREENSHOTS === 'true') return
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, filename) }), `${filename}截图`, 45000)
}

async function assertRect(element, expected, label, tolerance = 2) {
  const [offset, size] = await Promise.all([element.offset(), element.size()])
  const actual = { left: offset.left, top: offset.top, width: size.width, height: size.height }
  for (const key of Object.keys(expected)) {
    assert.ok(Math.abs(actual[key] - expected[key]) <= tolerance, `${label}${key}偏差：期望 ${expected[key]}，实际 ${actual[key]}`)
  }
}

;(async () => {
  server = http.createServer((request, response) => {
    void proxyOrMock(request, response).catch(error => {
      response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify({ code: 502, msg: String(error?.message || error), data: null }))
    })
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(mockPort, '127.0.0.1', resolve)
  })

  if (process.env.LOGIN_PROFILE_SKIP_E2E_BUILD !== 'true') {
    execFileSync('npx', ['taro', 'build', '--type', 'weapp'], {
      cwd: projectPath,
      env: {
        ...process.env,
        MINIAPP_E2E_MODE: 'true',
        MINIAPP_E2E_API_BASE_URL: `http://127.0.0.1:${mockPort}/api`,
        MINIAPP_DEV_FIXED_LOGIN: 'true',
      },
      stdio: 'inherit',
    })
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  try {
    connectedMiniProgram = await timeout(
      automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }),
      '连接现有微信自动化端口',
      4000,
    )
  } catch {
    connectedMiniProgram = await automator.launch({
      cliPath,
      projectPath,
      port: automationPort,
      args: ['--port', String(idePort)],
      trustProject: true,
    })
  }

  const miniProgram = connectedMiniProgram
  console.log('微信自动化连接完成')
  const systemInfo = await miniProgram.systemInfo()
  console.log('模拟器信息', JSON.stringify(systemInfo))
  const outputDir = `${outputBaseDir}-${systemInfo.windowWidth}x${systemInfo.windowHeight}`
  fs.mkdirSync(outputDir, { recursive: true })

  let page = await open(miniProgram, '/pages/login/index?variant=dialog', '登录协议弹窗')
  console.log('登录协议弹窗已打开')
  const dialog = await waitForElement(page, '.login-agreement-dialog', '登录协议弹窗')
  const dialogCard = await waitForElement(page, '#login-agreement-card', '登录协议卡片')
  const dialogLogo = await waitForElement(page, '.login-brand-logo--dialog', '遮罩下品牌 Logo')
  assert.ok(dialog && dialogLogo)
  await assertRect(dialog, { left: 0, top: 0, width: 390, height: 844 }, '登录协议遮罩')
  await assertRect(dialogLogo, { left: 49.4, top: 156, width: 291.2, height: 135.2 }, '遮罩下品牌 Logo')
  const dialogCardSize = await dialogCard.size()
  assert.ok(Math.abs(dialogCardSize.width - 322.4) <= 2, `登录协议卡片宽度偏差：${dialogCardSize.width}`)
  assert.ok(dialogCardSize.height >= 437, `登录协议卡片高度不足：${dialogCardSize.height}`)
  assert.equal(await page.$('cover-image'), null, '协议弹窗打开时原生 CoverImage Logo 必须卸载')
  assert.equal(await page.$('video'), null, '协议弹窗打开时原生 Video 必须卸载')
  await screenshot(miniProgram, outputDir, '01-登录协议弹窗-Logo位于遮罩下.png')
  console.log('登录协议弹窗截图完成')

  profileMode = 'initial'
  page = await open(miniProgram, '/pages/profile/index', '我的未认证初始态')
  console.log('我的未认证初始态已打开')
  const initialRoot = await waitForElement(page, '#profile-unverified', '我的未认证节点')
  const artwork = await waitForElement(page, '#verification-entry-artwork', '我的未认证插画')
  const initialContinue = await waitForElement(page, '#profile-unverified-continue', '我的未认证主按钮')
  await assertRect(initialRoot, { left: 0, top: 0, width: 390, height: 844 }, '我的未认证根节点')
  await assertRect(artwork, { left: 0, top: 235.56, width: 390, height: 202.8 }, '我的未认证插画')
  await assertRect(initialContinue, { left: 22.88, top: 570.96, width: 345.28, height: 50.96 }, '我的未认证主按钮')
  const profileTab = await waitForElement(page, '[id$="app-tab-profile"]', '我的底部 Tab')
  assert.match(await profileTab.outerWxml(), /tab-profile-active\.png[^>]*opacity:\s*1/, '我的未认证节点必须保持我的 Tab 点亮')
  await screenshot(miniProgram, outputDir, '02-我的-未认证.png')
  console.log('我的未认证初始态截图完成')

  profileMode = 'partial'
  page = await open(miniProgram, '/pages/profile/index', '我的部分资料态')
  console.log('我的部分资料态已打开')
  await waitForElement(page, '#profile-unverified', '我的部分资料节点')
  const checklist = await waitForElement(page, '#verification-entry-checklist', '我的部分资料认证清单')
  const partialContinue = await waitForElement(page, '#profile-unverified-continue', '我的部分资料主按钮')
  await assertRect(checklist, { left: 13, top: 238.16, width: 364 }, '我的部分资料认证清单')
  await assertRect(partialContinue, { left: 22.88, top: 570.96, width: 345.28, height: 50.96 }, '我的部分资料主按钮')
  assert.equal(await page.$('#profile-header-edit-area'), null, '核心认证未完成前不得渲染普通我的页面')
  await screenshot(miniProgram, outputDir, '03-我的-未认证-填完部分资料.png')

  console.log(process.env.SKIP_RUNTIME_SCREENSHOTS === 'true'
    ? '登录协议与我的未认证运行态 DOM/几何验收通过（本机截图权限未开放）'
    : `登录协议与我的未认证运行态验收通过，截图：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exitCode = 1
}).finally(async () => {
  connectedMiniProgram?.disconnect()
  if (server) await new Promise(resolve => server.close(resolve))
})
