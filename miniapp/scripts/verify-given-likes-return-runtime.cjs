/* eslint-env node */
// 微信原生运行夹具；只接受显式 E2E 回环构建，不代理任何生产请求。
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const automator = require(process.env.WX_AUTOMATOR_MODULE || '../../.runtime/recommend-automator/node_modules/miniprogram-automator')
const root = path.resolve(__dirname, '..')
const output = path.resolve(root, '../.runtime/given-likes-return-20261010')
const project = path.join(output, 'project')
const apiPort = 19341
const requests = [], evidence = []
const access = { accountStatus: 'NORMAL', coreAccessStatus: 'CORE_ALLOWED', canBrowseCards: true, canMatch: true, canMessage: true, canCommunity: true, canBeExposed: true, blockReasons: [] }
let app

function payload(url) {
  if (url.pathname.endsWith('/access-status')) return access
  if (url.pathname.endsWith('/likes-given')) {
    const current = Number(url.searchParams.get('page') || 1)
    return { current, size: 20, total: 60, pages: 3, hasMore: current < 3,
      records: Array.from({ length: 20 }, (_, index) => { const id = (current - 1) * 20 + index + 1; return { likeNo: `LIK-FIXTURE-${id}`, userId: 10000 + id, nickname: `测试嘉宾${id}`, age: 25, matched: false, canEnterConversation: false } }) }
  }
  if (/\/profile\/public\/\d+$/.test(url.pathname)) return { userId: Number(url.pathname.split('/').pop()), nickname: '测试嘉宾主页', photos: [], tags: [], certifications: [], liked: true, matched: false, canEnterConversation: false, communicationMode: 'WHISPER' }
  if (url.pathname.endsWith('/match-popup/pending')) return null
  if (url.pathname.endsWith('/visits')) return { visitNo: 'VIS-FIXTURE', deduplicated: true }
  return { records: [], list: [], fieldSettings: [], initFields: [], tabs: [], total: 0, hasMore: false }
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${apiPort}`)
  requests.push({ method: req.method, url: url.pathname + url.search })
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ code: 200, msg: 'fixture', data: payload(url) }))
})
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function waitElement(page, selector) {
  for (let index = 0; index < 40; index++) {
    const element = await page.$(selector)
    if (element) return element
    await pause(100)
  }
  throw new Error(`未找到 ${selector}`)
}
async function snapshot(page, label) {
  const rootElement = await waitElement(page, '#my-likes-page')
  const text = await rootElement.text()
  const scroll = await page.$('scroll-view')
  const result = { label, count: (text.match(/测试嘉宾\d+/g) || []).length, hasSecondPage: text.includes('测试嘉宾40'), scrollTop: await scroll.property('scrollTop'), scrollHeight: await scroll.scrollHeight(), listRequests: requests.filter(item => item.url.includes('/likes-given')) }
  evidence.push(result)
  console.log(JSON.stringify(result))
  await app.screenshot({ path: path.join(output, `${label}.png`) })
  return result
}

;(async () => {
  fs.mkdirSync(project, { recursive: true })
  // 此测试项目与日常开发项目分开，源码构建以本机 E2E 环境变量切换接口。
  const builtJs = fs.readdirSync(path.join(root, 'dist')).filter(file => file.endsWith('.js')).map(file => fs.readFileSync(path.join(root, 'dist', file), 'utf8')).join('\n')
  assert.ok(builtJs.includes(`http://127.0.0.1:${apiPort}/api`), '必须先生成回环接口 E2E 构建')
  fs.cpSync(path.join(root, 'dist'), path.join(project, 'dist'), { recursive: true })
  const config = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'))
  config.projectname = 'given-likes-return-fixture'
  fs.writeFileSync(path.join(project, 'project.config.json'), JSON.stringify(config, null, 2))
  await new Promise(resolve => server.listen(apiPort, '127.0.0.1', resolve))
  const cliPath = process.env.WX_CLI_PATH || 'C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat'
  if (process.platform === 'win32') {
    const quote = value => `'${value.replace(/'/g, "''")}'`
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `& ${quote(cliPath)} auto --project ${quote(project)} --auto-port 9431 --trust-project`], { windowsHide: true, stdio: 'inherit', timeout: 45000 })
    app = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9431' })
  } else {
    app = await automator.launch({ cliPath, projectPath: project, port: 9431, trustProject: true })
  }
  // 自动化端口就绪不等于启动页已完成路由；避免与启动重定向并发。
  await pause(3000)
  await app.callWxMethod('removeStorageSync', 'given-likes-return-v2')
  console.log('进入我喜欢的夹具页面')
  let page = await app.reLaunch('/pages/heart/my-likes')
  await waitElement(page, '#my-likes-load-more')
  await (await page.$('#my-likes-load-more')).tap()
  await pause(600)
  await (await page.$('scroll-view')).scrollTo(0, 2300)
  await pause(400)
  const before = await snapshot(page, 'before')
  assert.equal(before.count, 40)
  for (let round = 1; round <= 2; round++) {
    const labels = await page.$$('text')
    const texts = await Promise.all(labels.map(label => label.text()))
    const buttons = labels.filter((_, index) => texts[index] === '查看主页')
    await buttons[26].tap()
    await pause(600)
    assert.equal((await app.currentPage()).path, 'pages/heart/user')
    await app.navigateBack()
    await pause(800)
    page = await app.currentPage()
    const after = await snapshot(page, `after-${round}`)
    assert.equal(after.count, 40)
    assert.ok(after.hasSecondPage)
    assert.ok(Math.abs(Number(after.scrollTop) - Number(before.scrollTop)) < 2, `返回后滚动偏移变化：${before.scrollTop} -> ${after.scrollTop}`)
  }
  // 模拟原生返回后视图被重新创建，不能靠原 React 实例存活才能保留分页。
  await app.reLaunch('/pages/heart/my-likes')
  await pause(800)
  page = await app.currentPage()
  const rebuilt = await snapshot(page, 'rebuilt-after-return')
  assert.equal(rebuilt.count, 40, '返回后重建页面仍必须保留两页数据')
  assert.ok(Math.abs(Number(rebuilt.scrollTop) - Number(before.scrollTop)) < 2)
  await (await page.$('#my-likes-load-more')).tap()
  await pause(400)
  assert.ok(requests.some(item => item.url.includes('/likes-given?page=3')))
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => {
  fs.writeFileSync(path.join(output, 'runtime-evidence.json'), JSON.stringify({ evidence, requests }, null, 2))
  if (app) app.disconnect()
  server.close()
})
