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
const automationPort = Number(process.env.WX_AUTO_PORT || 9431)
const idePort = Number(process.env.WX_IDE_PORT || 57814)
const mockPort = Number(process.env.QIANXUN_MOCK_PORT || 3916)
const outputDir = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-09-09-知音双动态')
let connectedMiniProgram
let server

function ok(data) {
  return JSON.stringify({ code: 200, msg: 'success', data })
}

function accessStatus() {
  return {
    canBrowseCards: true,
    canMatch: true,
    canMessage: true,
    canCommunity: true,
    canBeExposed: true,
    coreAccessStatus: 'CORE_ALLOWED',
    blockReasons: [],
  }
}

function responseFor(requestUrl) {
  const url = new URL(requestUrl, `http://127.0.0.1:${mockPort}`)
  if (url.pathname === '/api/miniapp/profile/access-status') return accessStatus()
  if (url.pathname === '/api/miniapp/profile/home-detail') {
    return { profile: { avatar: '' }, fieldSettings: [], verificationStatus: {}, accessStatus: accessStatus(), profileOptionsPath: '', locationOptionsPath: '', runtimeConfig: {} }
  }
  if (url.pathname === '/api/miniapp/community/meta') {
    return {
      postMaxImages: 9,
      postMaxTextLength: 500,
      reportEntryEnabled: true,
      topics: [],
      reportReasons: [],
      homeTabs: [
        { entryKey: 'following', entryName: '关注', sort: 1 },
        { entryKey: 'same_city', entryName: '同城', sort: 2 },
        { entryKey: 'hot', entryName: '热门', sort: 3 },
      ],
      copy: {},
      capabilities: { stationPublishAllowed: true },
    }
  }
  if (url.pathname === '/api/miniapp/community/following/count') return 0
  if (url.pathname === '/api/miniapp/community/soulmate-posts') return postPage('community_post', 80001, '心灵搭子布局复验')
  if (url.pathname === '/api/miniapp/community/posts' && url.searchParams.get('postType') === 'sincere_post') {
    return postPage('sincere_post', 90001, '时空站台布局复验')
  }
  if (url.pathname === '/api/miniapp/community/posts') return { records: [], total: 0, size: 10, current: 1, pages: 0 }
  if (url.pathname === '/api/miniapp/community/topics/home') return null
  return {}
}

function postPage(postType, id, title) {
  return {
    records: [{
      id,
      postNo: `POST-E2E-${id}`,
      authorId: 90002,
      authorUserNo: 'U90002',
      authorName: '布局复验用户',
      authorAvatar: '',
      authorGender: 'FEMALE',
      authorAge: 28,
      authorCity: '310100',
      authorProfession: '设计师',
      postType,
      contentType: postType,
      title,
      content: '这是一条只在本地契约环境渲染的知音动态，用于验证两个页面复用完全一致的卡片布局。',
      imageUrls: [],
      likeCount: 12,
      commentCount: 8,
      liked: false,
      followingAuthor: false,
      activityText: '刚刚活跃',
      contactAction: 'WHISPER',
      createTime: '2026-09-09 18:00:00',
      status: 'published',
    }],
    total: 1,
    size: 20,
    current: 1,
    pages: 1,
  }
}

async function connect() {
  try {
    return await automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` })
  } catch (_) {
    return automator.launch({ cliPath, projectPath, port: automationPort, args: ['--port', String(idePort)], trustProject: true })
  }
}

async function setStorageWhenReady(miniProgram, key, value) {
  let latestError
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await miniProgram.callWxMethod('setStorageSync', key, value)
      return
    } catch (error) {
      latestError = error
      if (!String(error?.message || error).includes('too early')) throw error
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  throw latestError
}

;(async () => {
  server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(ok(responseFor(request.url || '/')))
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
  }
  await new Promise(resolve => setTimeout(resolve, 4000))

  fs.mkdirSync(outputDir, { recursive: true })
  const miniProgram = await connect()
  connectedMiniProgram = miniProgram
  await setStorageWhenReady(miniProgram, 'token', 'qianxun-e2e-token')
  await setStorageWhenReady(miniProgram, 'userInfo', {
    userId: 1,
    nickname: '运行态复验账号',
    avatar: '',
    accessStatus: accessStatus(),
  })
  const page = await miniProgram.reLaunch('/pages/index/index')
  await page.waitFor(4200)
  const kindred = await page.$('#qianxun-primary-kindred')
  assert.ok(kindred, '隔离运行态缺少知音一级 Tab')
  await kindred.tap()
  await page.waitFor(1600)
  const soulmateContent = await page.$('#qianxun-soulmate-content')
  const soulmateCard = await page.$('.qianxun-zhiyin-post-card')
  assert.ok(soulmateContent && soulmateCard, '心灵搭子必须渲染统一动态卡片')
  const soulmateStyle = await soulmateCard.attribute('style')
  const soulmateSize = await soulmateCard.size()
  assert.match(await soulmateCard.outerWxml(), /qianxun-comment-icon[\s\S]*qianxun-like-icon/, '心灵搭子卡片必须包含评论和心动操作')
  await miniProgram.screenshot({ path: path.join(outputDir, '01-心灵搭子.png') })

  const sincere = await page.$('#qianxun-zhiyin-sincere')
  assert.ok(sincere, '隔离运行态缺少时空站台二级 Tab')
  await sincere.tap()
  await page.waitFor(1600)

  const content = await page.$('#qianxun-sincere-content')
  const stationCard = await page.$('.qianxun-zhiyin-post-card')
  const follow = await page.$('.qianxun-sincere-follow')
  assert.ok(content && stationCard && follow, '时空站台契约卡片必须完整渲染')
  assert.equal(await follow.text(), '+ 关注', '时空站台未关注按钮必须显示 + 关注')
  assert.equal(await stationCard.attribute('style'), soulmateStyle, '两个知音页的卡片样式必须完全一致')
  assert.deepEqual(await stationCard.size(), soulmateSize, '相同夹具下两个知音页的卡片尺寸必须完全一致')
  assert.match(await stationCard.outerWxml(), /qianxun-comment-icon[\s\S]*qianxun-like-icon/, '时空站台卡片必须包含评论和心动操作')
  assert.ok(await page.$('#qianxun-sincere-publish'), '工作人员必须看到时空站台发布入口')
  await miniProgram.screenshot({ path: path.join(outputDir, '02-时空站台.png') })
  console.log(`知音双动态隔离运行态布局复验通过：${outputDir}`)
})().catch(error => {
  console.error(error?.stack || error)
  process.exitCode = 1
}).finally(async () => {
  connectedMiniProgram?.disconnect()
  if (server) await new Promise(resolve => server.close(resolve))
})
