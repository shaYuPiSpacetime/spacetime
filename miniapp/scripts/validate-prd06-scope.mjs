import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

const appConfig = read('src/app.config.ts')
const settings = read('src/pages/settings/index.tsx')
const privacy = read('src/pages/settings/privacy.tsx')
const help = read('src/pages/settings/help.tsx')
const searchHome = read('src/pages/search/index.tsx')
const searchResult = read('src/pages/search/result.tsx')
const content = read('src/pages/settings/content.tsx')
const cancellation = read('src/pages/settings/account-cancel.tsx')
const settingsService = read('src/services/settings.ts')
const profileHook = read('src/hooks/useProfile.ts')

for (const route of ['privacy', 'help']) {
  assert.match(appConfig, new RegExp(`['"]${route}['"]`), `设置分包缺少 ${route} 页面`)
}
assert.match(appConfig, /root:\s*['"]pages\/search['"]/)
assert.match(appConfig, /pages:\s*\[['"]index['"],\s*['"]result['"]\]/)

const orderedSettingsLabels = [
  '手机号绑定',
  '微信绑定',
  '隐私设置',
  '第三方信息共享清单',
  '个人信息收集清单',
  '关于我们',
  '退出登录',
]
let lastIndex = -1
for (const label of orderedSettingsLabels) {
  const index = settings.indexOf(label)
  assert.ok(index > lastIndex, `设置菜单缺少或顺序错误：${label}`)
  lastIndex = index
}
assert.doesNotMatch(settings, /注销账号/)
assert.doesNotMatch(settings, /通知设置|软件更新|去给好评|黑名单|关键词屏蔽/)
assert.match(settings, /settingsApi\.publicConfig/)
assert.doesNotMatch(settings, /确定要退出登录|内容暂未配置|当前入口暂不可用/)
assert.match(privacy, /注销账号/)

assert.match(searchHome, /sourceScene/)
assert.match(searchHome, /searchHistoryStorageKey/)
assert.match(searchHome, /pushSearchHistory/)
assert.match(searchHome, /violationText/)
assert.match(searchResult, /searchTabsForScene/)
assert.doesNotMatch(`${searchHome}\n${searchResult}`, /热门搜索|搜索热词|身高筛选|测评报告/)

assert.match(content, /contentCode/)
assert.match(content, /complianceDetail/)
assert.match(content, /resolveCompliancePresentation/)
assert.match(content, /content\.missing_text/)
assert.match(content, /content\.effective_time_suffix/)
assert.doesNotMatch(content, /生效/)
assert.doesNotMatch(content, /内容暂不可查看|内容加载失败|重新加载/)
assert.match(settingsService, /cancelCheck/)
assert.match(cancellation, /settingsApi\.cancelCheck/)
assert.match(cancellation, /async function openCancelDialog[\s\S]*settingsApi\.cancelCheck/)
assert.match(cancellation, /recheckToken/)
assert.match(cancellation, /hardBlocks/)
assert.match(cancellation, /risks/)
assert.match(cancellation, /settingsApi\.publicConfig/)
assert.doesNotMatch(cancellation, /本次注销有|注销期间，你的资料将被下架|为了避免频繁操作/)
assert.doesNotMatch(cancellation, /账号注销后，资料将被清空且无法恢复|请先阅读并同意用户注销协议|已撤销注销申请/)
assert.match(privacy, /settingsApi\.publicConfig/)
assert.doesNotMatch(privacy, /你可以查看隐私政策与个人信息清单/)
assert.match(help, /detail\?\.title/)
assert.doesNotMatch(help, /encodeURIComponent\(['"]联系客服['"]\)/)
assert.match(help, /settingsApi\.publicConfig/)
assert.doesNotMatch(help, /客服暂不可用，请稍后再试|遇到账号、认证或使用问题/)
assert.doesNotMatch(help, /问题反馈|反馈箱/)
assert.match(searchHome, /settingsApi\.searchConfig/)
assert.match(searchResult, /settingsApi\.searchConfig/)
assert.doesNotMatch(`${searchHome}\n${searchResult}`, /搜索内容不支持展示|请输入搜索内容|暂无搜索历史|搜索失败，请稍后重试|确定清空全部搜索历史吗/)
assert.match(profileHook, /pages\/settings\/help/)
assert.doesNotMatch(profileHook, /帮助与客服功能即将开放/)

console.log('PRD-06 小程序范围门禁通过')
