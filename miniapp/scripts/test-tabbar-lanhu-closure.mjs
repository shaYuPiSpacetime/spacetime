import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')
const sha256 = relativePath => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relativePath))).digest('hex')

const lanhuAssets = {
  "src/assets/icons/tab-encounter-active.png": "34d8c3c095fdce2e6fe9fb94b71db8caf5269767dfb08b781d111d0575b90c04",
  "src/assets/icons/tab-encounter.png": "3d66af1bb0bf17886d02eb67791528ca073527f9bbe80729a644718b35a3b5bd",
  "src/assets/icons/tab-home-active.png": "f4af67cd2fde034193a8800ca030f612c7e43efc535bb2cdc0030cf448ac3b89",
  "src/assets/icons/tab-home.png": "bba53de4bc392196e42f6f76c6a2c537929d4c72d31fee70c8e04b049244cc37",
  "src/assets/icons/tab-message-active.png": "2c0af6e0fc95741595f8913a1075c34df8211803ee534b988176652fcb329f5a",
  "src/assets/icons/tab-message.png": "c40285f381892b9d37f35502a72a04ba483c9c617c14167bc7b7e8d4ec0076e4",
  "src/assets/icons/tab-profile-active.png": "e8aa11f070bed73e1b87a6305a81a8b8ddbfae7ed6be9db6d23e40fce7dc887d",
  "src/assets/icons/tab-profile.png": "d792fa7e444eb38cf4721663d5813b37d59ef7508fa3584ba3dd6fa1e7012445",
  "src/assets/icons/tab-recommend-active.png": "b89b17ee9de601a5b325000edee8fdca9feea8ae833a1a42bdbc5d9181536bd5",
  "src/assets/icons/tab-recommend.png": "4ed4b85bfded15da920e8b2e1b293d71a4d9f040cced1a3ff105d2f7b1e0e84f",
  "src/assets/icons/tab-work-active.png": "ec38106c7d2c6f30b4313ecfc9ad011a56c9691040dfeb2da4e3a6e7abaaade2",
  "src/assets/icons/tab-work.png": "6bbe60e45f77022b9599f2537b01524dde94ee989344654763b1c3340f9e7e6a"
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

for (const iconName of ['tab-encounter', 'tab-encounter-active', 'tab-recommend-active', 'tab-home', 'tab-home-active', 'tab-work', 'tab-work-active', 'tab-recommend', 'tab-message', 'tab-message-active', 'tab-profile', 'tab-profile-active']) {
  assert.match(appTabBar, new RegExp(`assets/icons/${iconName}\\.png`), `${iconName} 必须直接使用蓝湖 PNG 切图`)
}
assert.doesNotMatch(appTabBar, /assets\/icons\/tab-[^']+\.svg/, '底部 Tab 禁止继续混用旧 SVG')
assert.doesNotMatch(appTabBar, /showActiveDot|background: '#2876FF'[\s\S]{0,120}width: '18rpx'/, '点亮蓝点已包含在蓝湖 active 切图内，禁止重复绘制')
assert.match(appTabBar, /const isOn = tab\.key === active/, '同一 TabBar 必须只由唯一 active key 推导点亮态')
assert.doesNotMatch(appTabBar, /src=\{isOn \? tab\.activeIconPath : tab\.iconPath\}/, '切 Tab 不得替换图标资源造成闪烁')
assert.match(appTabBar, /src=\{tab\.iconPath\}[\s\S]{0,260}opacity: isOn \? 0 : 1[\s\S]{0,360}src=\{tab\.activeIconPath\}[\s\S]{0,260}opacity: isOn \? 1 : 0/, '普通态与点亮态图标常驻且互斥显示，点击仍由可见 Tab 控件处理')

assert.match(appTabBar, /key: 'recommend'[^\n]+iconWidth: 40, iconHeight: 40/, '推荐必须使用与其他入口同尺寸的星形切图')

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
  ['pages/recommend/index', 'tab-recommend.png', 'tab-recommend-active.png'],
  ['pages/chat/index', 'tab-message.png', 'tab-message-active.png'],
  ['pages/profile/index', 'tab-profile.png', 'tab-profile-active.png'],
]) {
  const blockPattern = new RegExp(`pagePath: '${pagePath.replaceAll('/', '\\/')}'[\\s\\S]{0,180}iconPath: 'assets/icons/${normal.replace('.', '\\.')}'[\\s\\S]{0,120}selectedIconPath: 'assets/icons/${active.replace('.', '\\.')}'`)
  assert.match(appConfig, blockPattern, `${pagePath} 的原生兜底图标映射错误`)
}

console.log('底部 Tab 蓝湖切图与互斥切换门禁通过')

const tabEntries = [...appTabBar.matchAll(/key: '(\w+)', label: '([^']+)'/g)]
assert.deepEqual(tabEntries.map(item => [item[1], item[2]]), [
  ['kindred', '时空邂逅'], ['index', '千寻'], ['community', '心动'],
  ['recommend', '推荐'], ['chat', '消息'], ['profile', '我的'],
])
assert.equal([...appConfig.matchAll(/pagePath:/g)].length, 5, '六个逻辑入口必须兼容五个原生 Tab')
assert.match(appTabBar, /index \* 125/, '六项必须等宽')
assert.doesNotMatch(appTabBar, /app-tab-recommend-outer-arc|app-tab-recommend-blue-circle/, '推荐改为平齐星形图标')
assert.match(customTabBar, /getActiveTabKey\(\) === 'kindred'/, '共用路由必须保留时空邂逅点亮态')
const family = read('src/features/qianxun/QianxunFamilyPage.tsx')
assert.match(family, /subscribeActiveTabKey/, '底部入口必须驱动实际内容')
assert.doesNotMatch(read('src/features/qianxun/QianxunHeader.tsx'), /id: 'qianxun-primary-kindred'/, '顶部不重复绘制时空邂逅入口')
