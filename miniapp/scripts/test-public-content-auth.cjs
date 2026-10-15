const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

function setup(route, storedToken = '') {
  const storage = new Map([['token', storedToken]]), redirects = [], modules = new Map()
  let resolveResponse
  const taro = {
    getStorageSync: key => storage.get(key), removeStorageSync: key => storage.delete(key),
    getCurrentPages: () => [{ route }], reLaunch: async options => redirects.push(options.url),
    request: () => new Promise(resolve => { resolveResponse = resolve }),
  }
  function load(file) {
    if (modules.has(file)) return modules.get(file)
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText
    const module = { exports: {} }
    Function('require', 'module', 'exports', code)(name => {
      if (name === '@tarojs/taro') return { default: taro }
      if (name === '@/constants/config') return { API_BASE_URL: '', TOKEN_HEADER: 'Authorization', TOKEN_KEY: 'token', USER_INFO_KEY: 'user' }
      if (name === '@/utils/errorMessage') return { getErrorMessage: () => '网络错误' }
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`)
      throw new Error(name)
    }, module, module.exports)
    modules.set(file, module.exports)
    return module.exports
  }
  return { storage, redirects, load, respond: () => resolveResponse({ data: { code: 401 }, statusCode: 401 }) }
}

for (const route of ['pages/settings/content', 'pages/login/phone']) {
  test(`${route} 阅读期间后台401不跳转`, async () => {
    const h = setup(route)
    const pending = h.load('src/services/request.ts').get('/private/background')
    h.respond()
    await assert.rejects(pending)
    assert.deepEqual(h.redirects, [])
  })
}
test('受保护页面401仍跳转登录', async () => {
  const h = setup('pages/settings/index', 'expired')
  const pending = h.load('src/services/request.ts').get('/private')
  h.respond(); await assert.rejects(pending)
  assert.equal(h.redirects.length, 1)
  assert.equal(h.storage.has('token'), false)
})
test('旧请求401不能清除新登录态', async () => {
  const h = setup('pages/settings/index', 'old')
  const pending = h.load('src/services/request.ts').get('/private')
  h.storage.set('token', 'new')
  h.respond(); await assert.rejects(pending)
  assert.equal(h.storage.get('token'), 'new')
  assert.deepEqual(h.redirects, [])
})
test('全局前台守卫复用精确公开路由判断', () => {
  const h = setup('')
  const { isPublicReadingRoute } = h.load('src/domain/publicReadingRoute.ts')
  assert.equal(isPublicReadingRoute('/pages/settings/content?contentCode=user_agreement'), true)
  assert.equal(isPublicReadingRoute('pages/settings/index'), false)
  assert.equal(isPublicReadingRoute('pages/settings/content-other'), false)
  const app = fs.readFileSync(path.join(__dirname, '../src/app.tsx'), 'utf8')
  assert.match(app, /isPublicReadingRoute\(currentRoute/)
})
