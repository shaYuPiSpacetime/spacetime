import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')
const sha256 = relativePath => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relativePath))).digest('hex')

const lanhuAssets = {
  'src/assets/icons/tab-home.png': 'fcb3dc636c4af167617598743fc47d20a9bd96835462fc4341f3509a13fd1a64',
  'src/assets/icons/tab-home-active.png': 'b447e2a7e2b03ea3fc941fd751acf511e57cfd3781b7de72694caaca67790ade',
  'src/assets/icons/tab-work.png': '8e8edda2e7e3f8d9f794b994c11cb15d6e34afc5866fc1b42ffa55ed860affd1',
  'src/assets/icons/tab-work-active.png': 'c3192ff03de11b083be52b807c385b01e1dae022a54358a7050be35dc1970d24',
  'src/assets/icons/tab-recommend.png': 'fef477879a18c4b6c4aa620642845cb29143a068c01825ae02589d352172865f',
  'src/assets/icons/tab-message.png': '1c5550eeca4e41c7a2906ebb69acfc541aac6fb49643efe2154ad54b926bcfd3',
  'src/assets/icons/tab-message-active.png': '2c678a018719a914d99b214adb663bcc69f761fcdcbc998611158b06dca4fc50',
  'src/assets/icons/tab-profile.png': '3e29c8c5bef3d49d31ee4d4b63b91ffcffbd010895dcb690383c424deace9a07',
  'src/assets/icons/tab-profile-active.png': 'ef6a7c924a8df839b9c6a148d0f9bd3cc5579e22c61d888df4a4f3c58eaade75',
}

for (const [relativePath, expectedHash] of Object.entries(lanhuAssets)) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `缺少蓝湖 Tab 切图：${relativePath}`)
  assert.equal(sha256(relativePath), expectedHash, `蓝湖 Tab 切图内容不一致：${relativePath}`)
}

const appTabBar = read('src/components/AppTabBar/index.tsx')
const customTabBar = read('src/custom-tab-bar/index.tsx')
const sharedState = read('src/custom-tab-bar/tabState.ts')
const appConfig = read('src/app.config.ts')
const projectConfig = read('project.config.json')

for (const iconName of ['tab-home', 'tab-home-active', 'tab-work', 'tab-work-active', 'tab-recommend', 'tab-message', 'tab-message-active', 'tab-profile', 'tab-profile-active']) {
  assert.match(appTabBar, new RegExp(`assets/icons/${iconName}\\.png`), `${iconName} 必须直接使用蓝湖 PNG 切图`)
}
assert.doesNotMatch(appTabBar, /assets\/icons\/tab-[^']+\.svg/, '底部 Tab 禁止继续混用旧 SVG')
assert.doesNotMatch(appTabBar, /showActiveDot|background: '#2876FF'[\s\S]{0,120}width: '18rpx'/, '点亮蓝点已包含在蓝湖 active 切图内，禁止重复绘制')
assert.match(appTabBar, /const isOn = tab\.key === active/, '同一 TabBar 必须只由唯一 active key 推导点亮态')
assert.match(appTabBar, /src=\{tab\.iconPath\}[\s\S]{0,280}opacity: isOn \? 0 : 1[\s\S]{0,420}src=\{tab\.activeIconPath\}[\s\S]{0,280}opacity: isOn \? 1 : 0/, '普通态和点亮态切图必须常驻，切换时只改可见性')

assert.match(appTabBar, /id="app-tab-recommend-outer-arc"[\s\S]{0,180}left: '300rpx'[\s\S]{0,120}top: '0'[\s\S]{0,120}width: '150rpx'[\s\S]{0,120}height: '150rpx'[\s\S]{0,120}borderRadius: '75rpx'/, '推荐按钮必须保留位于中间的 150rpx 白色外圆弧')
assert.match(appTabBar, /id="app-tab-recommend-blue-circle"[\s\S]{0,360}left: '12rpx'[\s\S]{0,160}top: '12rpx'[\s\S]{0,180}width: `\$\{tab\.iconWidth\}rpx`[\s\S]{0,160}height: `\$\{tab\.iconHeight\}rpx`/, '推荐蓝色内圆必须相对外圆下移并保持 12rpx 环宽')
assert.match(appTabBar, /key: 'recommend'[\s\S]{0,180}iconWidth: 126, iconHeight: 126/, '推荐蓝色内圆必须按蓝湖 126rpx 尺寸渲染')
assert.match(appTabBar, /id="app-tab-recommend-label"[\s\S]{0,300}top: '84rpx'/, '推荐文案必须贴近星形图标，恢复蓝湖 84rpx 基线')

assert.match(sharedState, /const listeners = new Set/, 'Tab 点亮态必须具备跨缓存页面实例的订阅集合')
assert.match(sharedState, /export function setActiveTabKey\([\s\S]{0,260}listeners\.forEach/, '更新点亮态时必须广播到所有缓存 TabBar 实例')
assert.match(customTabBar, /subscribeActiveTabKey\(setActiveKey\)/, '每个缓存 TabBar 实例必须订阅共享点亮态')
assert.match(customTabBar, /setActiveTabKey\(key\)/, '点击 Tab 必须同步更新跨页面共享点亮态')
assert.match(customTabBar, /PATH_TO_TAB\[getCurrentRoute\(\)\] \?\? getActiveTabKey\(\)/, '首次显示必须优先由真实路由确定点亮态')
assert.doesNotMatch(customTabBar, /lastActiveKey/, '禁止使用只更新当前实例的遗留点亮态兜底')
assert.doesNotMatch(appConfig, /lazyCodeLoading:\s*['"]requiredComponents['"]/, '应用配置禁止对自定义 TabBar 启用组件懒加载')
assert.doesNotMatch(projectConfig, /"lazyCodeLoading"\s*:\s*"requiredComponents"/, '微信开发者工具配置禁止覆盖应用设置并延迟自定义 TabBar')

for (const [pagePath, normal, active] of [
  ['pages/index/index', 'tab-home.png', 'tab-home-active.png'],
  ['pages/community/index', 'tab-work.png', 'tab-work-active.png'],
  ['pages/recommend/index', 'tab-recommend.png', 'tab-recommend.png'],
  ['pages/chat/index', 'tab-message.png', 'tab-message-active.png'],
  ['pages/profile/index', 'tab-profile.png', 'tab-profile-active.png'],
]) {
  const blockPattern = new RegExp(`pagePath: '${pagePath.replaceAll('/', '\\/')}'[\\s\\S]{0,180}iconPath: 'assets/icons/${normal.replace('.', '\\.')}'[\\s\\S]{0,120}selectedIconPath: 'assets/icons/${active.replace('.', '\\.')}'`)
  assert.match(appConfig, blockPattern, `${pagePath} 的原生兜底图标映射错误`)
}

console.log('底部 Tab 蓝湖切图与互斥切换门禁通过')
