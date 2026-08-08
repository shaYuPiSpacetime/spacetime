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
const automationPort = Number(process.env.WX_AUTO_PORT || 9438)
const idePort = Number(process.env.WX_IDE_PORT || 57814)
const mockPort = Number(process.env.QIANXUN_COMPOSE_MOCK_PORT || 3940)
const captureScreenshots = process.env.WX_CAPTURE_SCREENSHOTS === 'true'
const outputRoot = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-08-08-发布动态图片预览顺畅交互')
let connectedMiniProgram
let server
let builtE2e = false

const previewImage = `http://127.0.0.1:${mockPort}/preview.webp`
const previewImageFile = path.join(projectPath, 'src/assets/lanhu/recommend/slices/city-night.webp')

function success(data) {
  return JSON.stringify({ code: 200, msg: 'success', data })
}

function responseFor(requestUrl) {
  const url = new URL(requestUrl, `http://127.0.0.1:${mockPort}`)
  if (url.pathname === '/api/miniapp/community/meta') {
    return {
      postMaxImages: 9,
      postMaxTextLength: 500,
      reportEntryEnabled: true,
      topics: [{ code: '1', label: '城市漫步' }],
      reportReasons: [],
      homeTabs: [],
      copy: { uploading: '上传中', publish_failed_title: '发布失败' },
    }
  }
  if (url.pathname === '/api/miniapp/community/drafts/community_post') {
    return {
      contentType: 'community_post',
      content: '城市晚风，云朵作伴，平凡的小美好。',
      topicId: 1,
      images: [{ url: previewImage, objectKey: 'runtime/city-night.webp' }],
      version: 1,
    }
  }
  return null
}

function timeout(promise, label, ms = 30000) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms))])
}

async function connect() {
  try {
    return await timeout(automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }), '连接自动化端口', 5000)
  } catch (_) {
    return automator.launch({ cliPath, projectPath, port: automationPort, args: ['--port', String(idePort)], trustProject: true })
  }
}

async function openCompose(miniProgram) {
  await miniProgram.callWxMethod('reLaunch', { url: '/pages/qianxun/compose' })
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 500))
    try {
      const page = await miniProgram.currentPage()
      if (page?.path === 'pages/qianxun/compose') return page
    } catch (_) {
      // 重新编译后的短暂空页面属于开发者工具正常过渡，继续等待即可。
    }
  }
  throw new Error('打开发布动态超时')
}

;(async () => {
  server = http.createServer((request, response) => {
    if (request.url === '/preview.webp') {
      response.writeHead(200, { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store' })
      response.end(fs.readFileSync(previewImageFile))
      return
    }
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(success(responseFor(request.url || '/')))
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(mockPort, '127.0.0.1', resolve)
  })

  if (process.env.QIANXUN_SKIP_E2E_BUILD !== 'true') {
    execFileSync('npx', ['taro', 'build', '--type', 'weapp'], {
      cwd: projectPath,
      env: {
        ...process.env,
        MINIAPP_E2E_MODE: 'true',
        MINIAPP_E2E_API_BASE_URL: `http://127.0.0.1:${mockPort}/api`,
      },
      stdio: 'inherit',
    })
    builtE2e = true
    execFileSync(cliPath, ['auto', '--project', projectPath, '--port', String(idePort), '--trust-project'], {
      stdio: 'inherit',
    })
    await new Promise(resolve => setTimeout(resolve, 4000))
  }

  const miniProgram = await connect()
  connectedMiniProgram = miniProgram
  console.log('已连接微信开发者工具')
  const exceptions = []
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  await miniProgram.callWxMethod('setStorageSync', 'token', 'qianxun-compose-e2e-token')
  console.log('已写入隔离测试登录态')

  const system = await miniProgram.systemInfo()
  const outputDir = path.join(outputRoot, `微信运行-${system.windowWidth}x${system.windowHeight}`)
  fs.mkdirSync(outputDir, { recursive: true })

  const page = await openCompose(miniProgram)
  await page.waitFor(3200)
  console.log('发布动态隔离单图草稿已加载')
  assert.ok(await page.$('#qianxun-compose-page'), '发布动态页面根节点不存在')
  const thumbnail = await page.$('#qianxun-compose-image-thumbnail-0')
  assert.ok(thumbnail, '当前测试账号缺少可用于预览验收的单图草稿')
  if (captureScreenshots) await timeout(miniProgram.screenshot({ path: path.join(outputDir, '01-发布动态-单图态.png') }), '单图态截图')

  await thumbnail.tap()
  await page.waitFor(500)
  console.log('已点击图片并等待预览层')
  const preview = await page.$('#qianxun-compose-image-preview')
  assert.ok(preview, '点击成功图片后未打开受控预览层')
  assert.ok(await page.$('#qianxun-compose-image-preview-close'), '受控预览层缺少关闭按钮')
  const movableView = await page.$('movable-view')
  assert.ok(movableView, '受控预览层缺少原生缩放容器')
  assert.equal(await movableView.attribute('scale-min'), '1', '预览最小缩放不是 1 倍')
  assert.equal(await movableView.attribute('scale-max'), '3', '预览最大缩放不是 3 倍')
  assert.equal(await movableView.attribute('scale-value'), '1', '首次打开预览没有从 1 倍开始')
  assert.deepEqual(await preview.size(), { width: system.windowWidth, height: system.windowHeight }, '预览层没有覆盖完整小程序视口')
  if (captureScreenshots) await timeout(miniProgram.screenshot({ path: path.join(outputDir, '02-发布动态-受控大图预览.png') }), '大图预览截图')

  await (await page.$('#qianxun-compose-image-preview-close')).tap()
  await page.waitFor(300)
  console.log('已关闭预览层')
  assert.equal(await page.$('#qianxun-compose-image-preview'), null, '关闭预览后预览层仍然存在')

  await thumbnail.tap()
  await page.waitFor(300)
  const reopenedMovableView = await page.$('movable-view')
  assert.equal(await reopenedMovableView.attribute('scale-value'), '1', '再次打开预览没有复位到 1 倍')
  await (await page.$('#qianxun-compose-image-preview-close')).tap()
  await page.waitFor(200)
  assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
  console.log(`发布动态图片预览运行态通过${captureScreenshots ? `：${outputDir}` : '（本轮截图采集未启用，仅执行结构与交互验收）'}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exitCode = 1
}).finally(async () => {
  connectedMiniProgram?.disconnect()
  if (server) {
    server.closeAllConnections?.()
    await new Promise(resolve => server.close(resolve))
  }
  if (builtE2e) {
    execFileSync('npx', ['taro', 'build', '--type', 'weapp'], { cwd: projectPath, env: process.env, stdio: 'inherit' })
    console.log('已恢复正常接口的小程序构建产物')
  }
})
