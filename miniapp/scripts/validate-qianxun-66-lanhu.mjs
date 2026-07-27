import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const miniappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(miniappRoot, '..')
const read = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
const exists = relativePath => fs.existsSync(path.join(repoRoot, relativePath))

const manifestPath = 'docs/验收报告/截图证据/2026-07-22-千寻66稿/蓝湖基线/designs.json'
const manifest = JSON.parse(read(manifestPath))
const appConfig = read('miniapp/src/app.config.ts')
const packageJson = read('miniapp/package.json')

assert.equal(manifest.count, 66, '千寻蓝湖基线必须固定为 66 稿')
assert.equal(manifest.designs.length, 66, '千寻蓝湖基线明细数量必须为 66')
assert.equal(new Set(manifest.designs.map(item => item.id)).size, 66, '千寻蓝湖 UUID 必须唯一')
assert.ok(manifest.designs.every(item => item.positionY >= 3800), '66 稿必须来自千寻画布坐标区域')

const groupFor = design => {
  const x = Math.round(design.positionX)
  if (x < 1000) return 'assets'
  if (x < 1400) return 'following'
  if (x < 1800) return /知音/.test(design.name) ? 'kindred' : 'city'
  if (x < 2300) return 'hot-topic'
  if (x < 2750) return 'dialogs'
  if (x < 3200) return 'publish'
  if (x < 3700) return 'detail'
  if (x < 4200) return 'interactions'
  if (x < 4700) return 'my-posts'
  return 'message-commerce'
}

const expectedGroups = {
  assets: 1,
  following: 3,
  city: 3,
  kindred: 1,
  'hot-topic': 6,
  dialogs: 4,
  publish: 13,
  detail: 9,
  interactions: 13,
  'my-posts': 5,
  'message-commerce': 8,
}
const actualGroups = Object.fromEntries(Object.keys(expectedGroups).map(key => [key, 0]))
manifest.designs.forEach(design => {
  actualGroups[groupFor(design)] += 1
})
assert.deepEqual(actualGroups, expectedGroups, '千寻 66 稿必须稳定拆成 11 个页面组')

assert.match(appConfig, /root:\s*'pages\/qianxun'/, '必须注册 pages/qianxun 独立分包')
for (const page of ['compose', 'post-detail', 'topic', 'interactions', 'my-posts', 'kindred']) {
  const pagePath = `miniapp/src/pages/qianxun/${page}.tsx`
  const configPath = `miniapp/src/pages/qianxun/${page}.config.ts`
  assert.ok(exists(pagePath), `缺少千寻分包页面：${pagePath}`)
  assert.ok(exists(configPath), `缺少千寻分包页面配置：${configPath}`)
  assert.match(read(configPath), /navigationStyle:\s*'custom'/, `${page} 必须使用自定义导航栏`)
}

assert.doesNotMatch(appConfig, /'pages\/recommend\/post'/, '发布动态页不得继续占用主包')
assert.match(packageJson, /validate-qianxun-66-lanhu\.mjs/, '构建前必须执行千寻 66 稿门禁')

const sourcePaths = [
  'miniapp/src/features/qianxun/QianxunFamilyPage.tsx',
  'miniapp/src/features/qianxun/QianxunHeader.tsx',
  'miniapp/src/features/qianxun/QianxunZhiyinTab.tsx',
  ...['compose', 'post-detail', 'topic', 'interactions', 'my-posts', 'kindred']
    .map(page => `miniapp/src/pages/qianxun/${page}.tsx`),
]
const source = sourcePaths.map(read).join('\n')
assert.doesNotMatch(source, /\.lanhu-ref|alipic\.lanhuapp|SketchCover/, '运行代码不得引用蓝湖参考图或 CDN')
assert.doesNotMatch(source, /opacity:\s*['"]?0(?:['";,}]|\s)/, '禁止用透明控件覆盖设计稿')
assert.doesNotMatch(source, /variant=|mockScene=/, '千寻生产路由不得通过 query 注入 mock 状态')
assert.doesNotMatch(source, /qianxun-center\.png/, '主包不得继续打入 526KiB 的千寻中心插画')
for (const id of [
  'qianxun-compose-page',
  'qianxun-post-detail-page',
  'qianxun-topic-page',
  'qianxun-interactions-page',
  'qianxun-my-posts-page',
  'qianxun-kindred-page',
]) {
  assert.ok(source.includes(id), `缺少运行态稳定选择器：${id}`)
}

console.log('千寻 66 稿覆盖、分包与静态还原门禁通过')
