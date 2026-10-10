const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '../src')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

function load(file, api = {}, timers = {}) {
  const exports = {}
  const code = ts.transpileModule(read(file), { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  } }).outputText
  const requireMock = name => {
    if (name === '@tarojs/taro') return api
    if (name.endsWith('.png')) return name.replace('@/', '/')
    throw new Error(`Unexpected import: ${name}`)
  }
  Function('exports', 'require', 'setTimeout', 'clearTimeout', code)(exports, requireMock,
    timers.setTimeout || setTimeout, timers.clearTimeout || clearTimeout)
  return exports
}
const domain = load('domain/sharePresentation.ts')
const fixture = { id: 42, authorName: '小夏', content: '今天的晚霞', imageUrls: ['https://cdn.test/post.jpg'] }

test('S-01: 本人和他人主页使用公开主页，空昵称和无 ID 也有合理目标', () => {
  assert.equal(domain.profileShare(7, '小夏').path, '/pages/heart/user?targetUserId=7')
  assert.equal(domain.profileShare(7, '小夏').title, '小夏的主页')
  for (const id of [0, -1, NaN, '1e2', '7&foo=1', undefined]) {
    assert.equal(domain.profileShare(id).path, '/pages/index/index')
  }
  assert.ok(domain.profileShare(7, ' ').title.trim())
})

test('S-02: 每种场景同步返回本地图，不等待网络也不使用页面截图', () => {
  const { shareMessage } = load('utils/shareMessage.ts')
  for (const kind of ['profile', 'post', 'topic', 'invite']) {
    const message = shareMessage({ kind, title: '分享', path: '/pages/index/index', images: [] })
    assert.equal(message.imageUrl, `/assets/share/${kind}.png`)
    assert.equal(message.promise, undefined)
  }
})

test('S-02: HTTPS 图片必须实际加载成功，返回本地 PNG/JPEG 路径', async () => {
  const calls = []
  const { shareMessage } = load('utils/shareMessage.ts', { getImageInfo: async ({ src }) => {
    calls.push(src)
    return { path: 'wxfile://verified.jpg', type: 'jpeg', width: 600, height: 800 }
  } })
  const share = shareMessage(domain.postShare(fixture))
  assert.equal(share.imageUrl, '/assets/share/post.png')
  assert.equal((await share.promise).imageUrl, 'wxfile://verified.jpg')
  assert.deepEqual(calls, fixture.imageUrls)
})

test('S-02: WebP、GIF、无尺寸和加载失败均有兜底', async () => {
  for (const result of [{ type: 'webp' }, { type: 'gif' }, { type: 'png', width: 0 }, null]) {
    const { shareMessage } = load('utils/shareMessage.ts', { getImageInfo: async () => {
      if (!result) throw new Error('403')
      return { path: 'wxfile://bad', width: 500, height: 400, ...result }
    } })
    const share = shareMessage(domain.postShare(fixture))
    assert.equal((await share.promise).imageUrl, '/assets/share/post.png')
  }
})

test('S-02: 第一张失败继续选择后续可用图，拒绝草稿本地文件', async () => {
  const calls = []
  const { shareMessage } = load('utils/shareMessage.ts', { getImageInfo: async ({ src }) => {
    calls.push(src)
    if (src.endsWith('bad')) throw new Error('404')
    return { path: 'wxfile://ok.png', type: 'png', width: 1000, height: 800 }
  } })
  const share = shareMessage(domain.profileShare(7, '小夏', ['wxfile://draft', 'data:image/png;base64,x', 'http://bad', 'https://cdn.test/bad', 'https://cdn.test/ok']))
  assert.equal((await share.promise).imageUrl, 'wxfile://ok.png')
  assert.deepEqual(calls, ['https://cdn.test/bad', 'https://cdn.test/ok'])
})

test('S-02: 网络挂起在三秒前结束，已有次选图片仍能使用', async () => {
  let expire, duration
  const { shareMessage } = load('utils/shareMessage.ts', { getImageInfo: ({ src }) => src.endsWith('slow')
    ? new Promise(() => {})
    : Promise.resolve({ path: 'wxfile://fast.png', type: 'png', width: 500, height: 400 })
  }, { setTimeout: (callback, ms) => { expire = callback; duration = ms; return 1 }, clearTimeout: () => {} })
  const result = shareMessage(domain.profileShare(7, '小夏', ['https://cdn.test/slow', 'https://cdn.test/fast']))
  await Promise.resolve()
  expire()
  assert.ok(duration < 3000)
  assert.equal((await result.promise).imageUrl, 'wxfile://fast.png')
})

test('S-02: 全部网络挂起时返回品牌图', async () => {
  let expire
  const { shareMessage } = load('utils/shareMessage.ts', { getImageInfo: () => new Promise(() => {}) }, {
    setTimeout: callback => { expire = callback; return 1 }, clearTimeout: () => {},
  })
  const result = shareMessage(domain.postShare(fixture))
  expire()
  assert.equal((await result.promise).imageUrl, '/assets/share/post.png')
})

test('S-03: 图文、纯文字、空文字、超长 emoji 文案', () => {
  assert.equal(domain.postShare(fixture).path, '/pages/qianxun/post-detail?id=42')
  assert.deepEqual(domain.postShare(fixture).images, fixture.imageUrls)
  assert.equal(domain.postShare({ ...fixture, content: '  ', imageUrls: [] }).title, '小夏分享了新动态')
  const title = domain.shareText('😀'.repeat(50), '')
  assert.equal(Array.from(title).length, 36)
  assert.equal(title, '😀'.repeat(35) + '…')
  assert.equal(domain.shareText('  今天\n 很开心 ', ''), '今天 很开心')
})

function callback(file, end, deps) {
  const source = read(file)
  const start = source.indexOf('  useShareAppMessage(')
  const code = source.slice(start, source.indexOf(end, start))
  let share
  const values = { ...domain, shareMessage: value => value, useShareAppMessage: cb => { share = cb }, ...deps }
  Function(...Object.keys(values), code)(...Object.values(values))
  return share
}

test('S-04: 家人/知音由一个页面回调处理，菜单忽略已选动态', () => {
  const file = 'features/qianxun/QianxunFamilyPage.tsx'
  for (const primaryTab of ['FAMILY', 'KINDRED']) {
    const share = callback(file, '  const tabs =', { primaryTab, sheet: 'actions', selectedPost: fixture, zhiyinSharePost: { ...fixture, id: 88 } })
    assert.equal(share({ from: 'button' }).path, `/pages/qianxun/post-detail?id=${primaryTab === 'FAMILY' ? 42 : 88}`)
    assert.equal(share({ from: 'menu' }).path, '/pages/index/index')
  }
  assert.doesNotMatch(read('features/qianxun/QianxunZhiyinTab.tsx'), /useShareAppMessage/)
})

test('S-05: 话题菜单分享话题，按钮分享所选动态', () => {
  const share = callback('pages/qianxun/topic.tsx', '  const loadTopic', {
    selectedOwnPost: fixture, topic: { name: '秋日生活', coverUrl: 'https://cdn.test/topic.png' }, topicId: 9,
  })
  assert.equal(share({ from: 'button' }).path, '/pages/qianxun/post-detail?id=42')
  assert.equal(share({ from: 'menu' }).path, '/pages/qianxun/topic?topicId=9')
  assert.equal(share({ from: 'menu' }).title, '秋日生活')
})

test('S-05: 未登录话题目标可保存，登录后仍回原话题', () => {
  const { resolvePendingShareRoute } = load('domain/pendingShareRoute.js')
  assert.equal(resolvePendingShareRoute('pages/qianxun/topic', { topicId: '9' }), '/pages/qianxun/topic?topicId=9')
  assert.equal(resolvePendingShareRoute('/pages/qianxun/topic?topicId=9'), '/pages/qianxun/topic?topicId=9')
  assert.equal(resolvePendingShareRoute('/pages/qianxun/topic', { topicId: '-1' }), null)
})

test('S-06: 邀请卡保留归因路径，资料尚未就绪时禁用原生按钮分享', () => {
  const target = { title: '一起遇见好缘分', path: '/pages/login/index?sourceType=normal_user&sourceToken=fixture' }
  const share = callback('pages/promotion/invite-home.tsx', '  const loadHome', { shareTarget: target, EMPTY_SHARE: {} })
  assert.equal(share().path, target.path)
  assert.equal(share().kind, 'invite')
  assert.match(read('pages/promotion/invite-home.tsx'), /shareAvailable=\{nativeShareReady\}/)
})

test('S-07: 四类兜底封面真实 PNG、1000×800，不引用网络', () => {
  for (const kind of ['profile', 'post', 'topic', 'invite']) {
    const png = fs.readFileSync(path.join(root, `assets/share/${kind}.png`))
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png.readUInt32BE(16), 1000)
    assert.equal(png.readUInt32BE(20), 800)
    assert.ok(png.length > 10000)
  }
})

test('S-01/S-08: 所有页面分享均接入有保底图的统一实现', () => {
  const files = ['pages/profile/edit.tsx', 'pages/heart/user.tsx', 'pages/qianxun/post-detail.tsx',
    'pages/qianxun/topic.tsx', 'pages/promotion/invite-home.tsx', 'features/qianxun/QianxunFamilyPage.tsx']
  for (const file of files) assert.match(read(file), /shareMessage\(/, file)
})
