const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const src = path.resolve(__dirname, '../src')
const read = file => fs.readFileSync(path.join(src, file), 'utf8')

test('从互动页发布动态后返回原有互动页，不再叠加新页面', () => {
  const compose = read('pages/qianxun/compose.tsx')
  const publish = compose.match(/const handlePublish = async \(\) => \{([\s\S]*?)\n  \}\n\n  const showFailureFeedback/)
  assert.ok(publish, '未找到发帖成功处理逻辑')
  assert.match(publish[1], /Taro\.getCurrentPages\(\)/, '发帖后必须检查当前页面栈')
  assert.match(publish[1], /pages\[pages\.length - 2\]\.route === 'pages\/qianxun\/interactions'/, '仅已有互动页是上一层时原路返回')
  assert.match(publish[1], /await Taro\.navigateBack\(\)/, '发帖后必须复用已有互动页')
  assert.match(publish[1], /await Taro\.redirectTo\(/, '从其他入口发帖仍应打开我的动态')
})

test('我的动态独立加载，不等待其他互动接口且不被其失败阻断', () => {
  const interactions = read('pages/qianxun/interactions.tsx')
  const loadPageStart = interactions.indexOf('const loadPage = async () => {')
  const loadMyPostsStart = interactions.indexOf('const loadMyPosts = async () => {')
  assert.ok(loadPageStart >= 0 && loadMyPostsStart > loadPageStart, '未找到独立的互动页与我的动态加载逻辑')
  assert.doesNotMatch(interactions.slice(loadPageStart, loadMyPostsStart), /getMyCommunityPosts\(1, 50\)/, '我的动态不能继续置于多接口 Promise.all 中')
  assert.match(interactions, /const loadMyPosts = async \(\) => \{[\s\S]*?getMyCommunityPosts\(1, 50\)/, '我的动态必须独立请求')
  assert.match(interactions, /void loadMyPosts\(\)/, '页面展示时必须触发我的动态请求')
  assert.match(interactions, /<MinePanel loading=\{myPostsLoading\}/, '我的动态必须使用独立加载状态')
})

test('推荐页原生下拉刷新背景与页面浅蓝底一致', () => {
  const config = read('pages/recommend/index.config.ts')
  assert.match(config, /enablePullDownRefresh:\s*true/, '推荐页需要继续支持下拉刷新')
  assert.match(config, /backgroundColor:\s*'#EDF6FB'/, '原生下拉区域需显式设置浅蓝背景，避免露白')
})
