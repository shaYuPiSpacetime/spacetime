const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

function harness() {
  const requests = []
  let token = '账号甲的会话'
  const taro = {
    getStorageSync: () => token,
    removeStorageSync: () => {},
    getCurrentPages: () => [],
    reLaunch: async () => {},
    request: options => new Promise((resolve, reject) => requests.push({ options, resolve, reject })),
  }
  const module = { exports: {} }
  const source = fs.readFileSync(path.resolve(__dirname, '../src/services/request.ts'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText
  Function('require', 'module', 'exports', compiled)(name => {
    if (name === '@tarojs/taro') return taro
    if (name === '@/constants/config') return { API_BASE_URL: 'https://fixture.invalid', TOKEN_HEADER: 'X-Auth-Token', TOKEN_KEY: 'token' }
    if (name === '@/utils/errorMessage') return { getErrorMessage: error => error.message }
    if (name === '@/domain/publicReadingRoute') return { isPublicReadingRoute: () => false }
    throw new Error(`未配置测试依赖：${name}`)
  }, module, module.exports)
  return {
    ...module.exports, requests,
    switchAccount: value => { token = value },
    resolve: (index, data = index) => requests[index].resolve({ statusCode: 200, data: { code: 200, data } }),
  }
}

test('多个 Tab 同时读取相同资料只发送一次，完成后再次进入仍取最新数据', async () => {
  const h = harness()
  const first = h.get('/miniapp/profile/basic')
  const second = h.get('/miniapp/profile/basic')
  assert.equal(h.requests.length, 1)
  h.resolve(0, { nickname: '当前资料' })
  assert.deepEqual(await first, await second)
  const next = h.get('/miniapp/profile/basic')
  assert.equal(h.requests.length, 2)
  h.resolve(1, { nickname: '更新资料' })
  assert.deepEqual(await next, { nickname: '更新资料' })
})

test('查询参数顺序不影响请求合并，分页和筛选不同必须各自请求', async () => {
  const h = harness()
  const tasks = [h.get('/list', { page: 1, size: 20 }), h.get('/list', { size: 20, page: 1 }), h.get('/list', { page: 2, size: 20 })]
  assert.equal(h.requests.length, 2)
  h.resolve(0); h.resolve(1)
  await Promise.all(tasks)
})

test('切换账号与请求头不同不能复用其他会话的结果', async () => {
  const h = harness()
  const first = h.get('/miniapp/profile/basic')
  h.switchAccount('账号乙的会话')
  const second = h.get('/miniapp/profile/basic')
  const third = h.request({ url: '/miniapp/profile/basic', header: { 'X-Variant': 'new' } })
  assert.equal(h.requests.length, 3)
  h.resolve(0, '甲'); h.resolve(1, '乙'); h.resolve(2, '另一种响应')
  assert.deepEqual(await Promise.all([first, second, third]), ['甲', '乙', '另一种响应'])
})

test('失败请求退出合并队列，手动重试会重新发送', async () => {
  const h = harness()
  const first = h.get('/miniapp/profile/basic')
  const second = h.get('/miniapp/profile/basic')
  assert.equal(h.requests.length, 1)
  const results = Promise.allSettled([first, second])
  h.requests[0].reject(new Error('临时断网'))
  assert.ok((await results).every(item => item.status === 'rejected'))
  const retry = h.get('/miniapp/profile/basic')
  assert.equal(h.requests.length, 2)
  h.resolve(1)
  await retry
})

test('修改资料或余额期间及完成后不复用写操作之前的读取请求', async () => {
  const h = harness()
  const old = h.get('/miniapp/profile/basic')
  const save = h.put('/miniapp/profile/basic', { nickname: '新昵称' })
  const during = h.get('/miniapp/profile/basic')
  h.resolve(1)
  await save
  const after = h.get('/miniapp/profile/basic')
  assert.equal(h.requests.length, 4)
  h.resolve(0, '旧'); h.resolve(2, '进行中'); h.resolve(3, '新')
  assert.deepEqual(await Promise.all([old, during, after]), ['旧', '进行中', '新'])
})

test('写请求不会合并，保持原有服务端业务与幂等校验', async () => {
  const h = harness()
  const first = h.post('/action', { requestId: '一' })
  const second = h.post('/action', { requestId: '二' })
  assert.equal(h.requests.length, 2)
  h.resolve(0); h.resolve(1)
  await Promise.all([first, second])
})
