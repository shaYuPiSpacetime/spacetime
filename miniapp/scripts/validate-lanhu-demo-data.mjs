import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataPath = path.join(rootDir, 'src/data/lanhuDemo.json')
const appConfigPath = path.join(rootDir, 'src/app.config.ts')

function readJson(filePath) {
  assert.ok(fs.existsSync(filePath), `缺少数据文件: ${path.relative(rootDir, filePath)}`)
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readAppRoutes() {
  const content = fs.readFileSync(appConfigPath, 'utf8')
  const routeSet = new Set()
  const pageMatches = [...content.matchAll(/'([^']+)'/g)].map((match) => match[1])
  const topLevelPages = pageMatches.filter((value) => value.startsWith('pages/'))
  for (const page of topLevelPages) {
    routeSet.add(`/${page}`)
  }

  const subPackageBlocks = [...content.matchAll(/root:\s*'([^']+)'[\s\S]*?pages:\s*\[([\s\S]*?)\]/g)]
  for (const [, root, pageBlock] of subPackageBlocks) {
    const pages = [...pageBlock.matchAll(/'([^']+)'/g)].map((match) => match[1])
    for (const page of pages) {
      routeSet.add(`/${root}/${page}`)
    }
  }

  return routeSet
}

function assertRoute(routeSet, route, label) {
  if (!route) return
  const cleanRoute = route.split('?')[0]
  assert.ok(routeSet.has(cleanRoute), `${label} 路由未注册: ${route}`)
}

function assertAsset(assetRef) {
  const assetPath = path.join(rootDir, assetRef)
  assert.ok(fs.existsSync(assetPath), `引用资产不存在: ${assetRef}`)
}

const data = readJson(dataPath)
const routeSet = readAppRoutes()

assert.equal(data.projectName, '时空邂逅0625', '项目名称应来自蓝湖项目')
assert.equal(data.totalDesigns, 91, '蓝湖设计稿总数应为 91')
assert.ok(Array.isArray(data.designs), 'designs 必须是数组')
assert.equal(data.designs.length, 91, 'designs 数组必须包含 91 张设计稿')

const indexes = new Set()
for (const design of data.designs) {
  assert.equal(typeof design.id, 'string', `第 ${design.index} 张设计稿缺少 id`)
  assert.equal(typeof design.name, 'string', `第 ${design.index} 张设计稿缺少名称`)
  assert.equal(typeof design.flow, 'string', `第 ${design.index} 张设计稿缺少 flow`)
  assert.ok(['todo', 'ready', 'implemented'].includes(design.status), `${design.name} 状态不合法`)
  indexes.add(design.index)
  assertRoute(routeSet, design.route, `${design.name}`)
  for (const assetRef of design.assetRefs ?? []) {
    assertAsset(assetRef)
  }
}
assert.equal(indexes.size, 91, '设计稿 index 不应重复')
assert.ok(indexes.has(1) && indexes.has(91), '设计稿 index 应覆盖 1 到 91')

assert.ok(Array.isArray(data.flows?.main), 'flows.main 必须是数组')
assert.ok(data.flows.main.length >= 8, '主链路至少覆盖登录、资料、认证、会员/成家币/我的页')
for (const step of data.flows.main) {
  assert.equal(typeof step.key, 'string', '流程步骤缺少 key')
  assert.equal(typeof step.title, 'string', `${step.key} 缺少标题`)
  assertRoute(routeSet, step.route, `${step.key}`)
  assertRoute(routeSet, step.nextRoute, `${step.key} nextRoute`)
  assertRoute(routeSet, step.fallbackRoute, `${step.key} fallbackRoute`)
  assert.ok(Array.isArray(step.designNames), `${step.key} designNames 必须是数组`)
  for (const name of step.designNames) {
    assert.ok(data.designs.some((design) => design.name === name), `${step.key} 引用了不存在的设计稿: ${name}`)
  }
}

assert.ok(data.login?.educationOptions?.length > 0, '登录学历选项不能为空')
assert.ok(data.login?.provinceCityMap && Object.keys(data.login.provinceCityMap).length > 0, '登录省市数据不能为空')
assert.ok(data.verification?.certItems?.length >= 3, '三重认证项至少 3 个')
assert.ok(data.membership?.plans?.length >= 3, '会员套餐至少 3 个')
assert.ok(data.coins?.packages?.length >= 3, '成家币套餐至少 3 个')
assert.ok(data.profile?.nickname, '我的页 profile.nickname 不能为空')

console.log('蓝湖 demo 数据校验通过')
