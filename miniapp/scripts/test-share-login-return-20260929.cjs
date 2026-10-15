const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')

test('登录前保存的动态和用户主页分享目标只能是受支持的安全路径', async () => {
  const domainPath = path.join(root, 'src/domain/pendingShareRoute.js')
  assert.ok(fs.existsSync(domainPath), '缺少分享目标路径规则')
  const source = fs.readFileSync(domainPath, 'utf8')
  const { resolvePendingShareRoute } = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  )

  assert.equal(resolvePendingShareRoute('pages/qianxun/post-detail', { id: '12' }), '/pages/qianxun/post-detail?id=12')
  assert.equal(resolvePendingShareRoute('/pages/heart/user?targetUserId=34'), '/pages/heart/user?targetUserId=34')
  assert.equal(resolvePendingShareRoute('pages/heart/user', { userId: '35' }), '/pages/heart/user?targetUserId=35')
  assert.equal(resolvePendingShareRoute('pages/settings/index', { id: '12' }), null)
  assert.equal(resolvePendingShareRoute('pages/qianxun/post-detail', { id: '-1' }), null)
  assert.equal(resolvePendingShareRoute('pages/qianxun/post-detail?id=12&redirect=https://example.com'), '/pages/qianxun/post-detail?id=12')
  assert.equal(resolvePendingShareRoute('pages/index/index', { postId: '12', scene: 'CITY' }), '/pages/qianxun/post-detail?id=12')
  assert.equal(resolvePendingShareRoute('pages/index/index?postId=12'), '/pages/qianxun/post-detail?id=12')
  assert.equal(resolvePendingShareRoute('pages/index/index', { postId: '-1' }), null)

  const app = fs.readFileSync(path.join(root, 'src/app.tsx'), 'utf8')
  const login = fs.readFileSync(path.join(root, 'src/hooks/useLogin.ts'), 'utf8')
  assert.match(app, /PENDING_SHARE_ROUTE_KEY/, '未登录重定向前必须保存分享目标')
  assert.match(login, /navigateAfterAuthentication/, '登录完成必须恢复分享目标')
})

test('热启动旧分享卡片直达对应动态，未登录时新卡片优先于缓存页面', async () => {
  const ts = require('typescript')
  const source = fs.readFileSync(path.join(root, 'src/app.tsx'), 'utf8')
  const domainSource = fs.readFileSync(path.join(root, 'src/domain/pendingShareRoute.js'), 'utf8')
  const domain = await import(`data:text/javascript;base64,${Buffer.from(domainSource).toString('base64')}`)
  let show
  let token = 'logged-in'
  const writes = new Map()
  const routes = []
  const taro = {
    getStorageSync: key => key === 'token' ? token : writes.get(key),
    setStorageSync: (key, value) => writes.set(key, value),
    getCurrentPages: () => [{ route: 'pages/heart/user', options: { targetUserId: '100' } }],
    reLaunch: async opts => { routes.push(opts.url) },
    eventCenter: { trigger: () => {} },
    useLaunch: () => {}, useDidHide: () => {}, useDidShow: fn => { show = fn },
  }
  const requireMock = name => {
    if (name === 'react') return { useRef: value => ({ current: value }) }
    if (name === '@tarojs/taro') return { __esModule: true, default: taro, ...taro }
    if (name.endsWith('authStore')) return { useAuthStore: () => ({ setLogin: () => {}, checkLogin: () => {} }) }
    if (name.endsWith('prd01Store')) return { usePrd01Store: selector => selector({ bootstrap: async () => {} }) }
    if (name.endsWith('config')) return { DEV_FIXED_LOGIN: { enabled: false }, MOCK_ENABLED: false, TOKEN_KEY: 'token' }
    if (name.endsWith('promotionAttribution')) return { capturePromotionSource: async () => {} }
    if (name.endsWith('messagePlatformRuntime')) return { messagePlatformRuntime: { onForeground: async () => {}, stop: () => {} } }
    if (name.endsWith('pendingShareRoute')) return domain
    if (name.endsWith('publicReadingRoute')) return { isPublicReadingRoute: () => false }
    return {}
  }
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'setTimeout', compiled)(module, module.exports, requireMock, fn => fn())
  module.exports.default({ children: null })
  show({ path: 'pages/index/index', query: { postId: '42' }, scene: 1007 })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(routes[0], '/pages/qianxun/post-detail?id=42')
  token = ''
  show({ path: 'pages/qianxun/post-detail', query: { id: '43' }, scene: 1007 })
  assert.equal(writes.get(domain.PENDING_SHARE_ROUTE_KEY), '/pages/qianxun/post-detail?id=43')
})
