/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const http = require('node:http')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const automationPort = Number(process.env.WX_AUTO_PORT || 9431)
const mockPort = Number(process.env.QIANXUN_MOCK_PORT || 3916)
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
    }
  }
  if (url.pathname === '/api/miniapp/community/following/count') return 0
  if (url.pathname === '/api/miniapp/community/yuemu') return { records: [], total: 0, size: 30, current: 1, pages: 0 }
  if (url.pathname === '/api/miniapp/community/posts' && url.searchParams.get('postType') === 'sincere_post') {
    return {
      records: [{
        id: 90001,
        postNo: 'POST-E2E-SINCERE-90001',
        authorId: 90002,
        authorUserNo: 'U90002',
        authorName: '布局复验用户',
        authorAvatar: '',
        authorGender: 'FEMALE',
        authorAge: 28,
        authorCity: '310100',
        authorProfession: '设计师',
        postType: 'sincere_post',
        contentType: 'sincere_post',
        title: '诚意贴运行态布局复验',
        content: '这是一条只在本地契约环境渲染的诚意贴，用于验证底部评论与心动图标垂直居中。',
        imageUrls: [],
        likeCount: 12,
        commentCount: 8,
        liked: false,
        followingAuthor: false,
        activityText: '刚刚活跃',
        contactAction: 'WHISPER',
        createTime: '2026-08-05 15:00:00',
        status: 'published',
      }],
      total: 1,
      size: 20,
      current: 1,
      pages: 1,
    }
  }
  if (url.pathname === '/api/miniapp/community/posts') return { records: [], total: 0, size: 10, current: 1, pages: 0 }
  if (url.pathname === '/api/miniapp/community/topics/home') return null
  return {}
}

async function centerY(element) {
  const [offset, size] = await Promise.all([element.offset(), element.size()])
  return offset.top + size.height / 2
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

  const miniProgram = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` })
  connectedMiniProgram = miniProgram
  await miniProgram.callWxMethod('setStorageSync', 'token', 'qianxun-e2e-token')
  const page = await miniProgram.reLaunch('/pages/index/index')
  await page.waitFor(4200)
  const kindred = await page.$('#qianxun-primary-kindred')
  assert.ok(kindred, '隔离运行态缺少知音一级 Tab')
  await kindred.tap()
  await page.waitFor(800)
  const sincere = await page.$('#qianxun-zhiyin-sincere')
  assert.ok(sincere, '隔离运行态缺少诚意贴二级 Tab')
  await sincere.tap()
  await page.waitFor(1600)

  const content = await page.$('#qianxun-sincere-content')
  const follow = await page.$('.qianxun-sincere-follow')
  const commentStat = await page.$('.sincere-comment-stat')
  const commentIcon = await page.$('.sincere-comment-icon')
  const likeStat = await page.$('.sincere-like-stat')
  const likeIcon = await page.$('.sincere-like-icon')
  assert.ok(content && follow && commentStat && commentIcon && likeStat && likeIcon, '诚意贴契约卡片和底部结构化图标必须完整渲染')
  assert.equal(await follow.text(), '+ 关注', '诚意贴未关注按钮必须显示 + 关注')
  assert.ok(Math.abs(await centerY(commentStat) - await centerY(commentIcon)) <= 1, '诚意贴评论图标必须垂直居中')
  assert.ok(Math.abs(await centerY(likeStat) - await centerY(likeIcon)) <= 1, '诚意贴心动图标必须垂直居中')
  console.log('知音诚意贴隔离运行态布局复验通过')
})().catch(error => {
  console.error(error?.stack || error)
  process.exitCode = 1
}).finally(async () => {
  connectedMiniProgram?.disconnect()
  if (server) await new Promise(resolve => server.close(resolve))
})
