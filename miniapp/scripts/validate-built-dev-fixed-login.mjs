import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appJsonPath = path.join(rootDir, 'dist/app.json')
const fixedLoginEnabled = process.env.MINIAPP_DEV_FIXED_LOGIN === 'true'
const fixedToken = 'dev-fixed-token-17366629764'

assert.equal(fs.existsSync(appJsonPath), true, '构建产物缺少 dist/app.json')

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'))
const expectedStartPage = fixedLoginEnabled ? 'pages/index/index' : 'pages/login/index'
assert.equal(appJson.pages?.[0], expectedStartPage, `构建首页必须与固定登录开关一致: ${expectedStartPage}`)

function listJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return listJavaScriptFiles(entryPath)
    return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : []
  })
}

const compiledJavaScript = listJavaScriptFiles(path.join(rootDir, 'dist'))
  .map(file => fs.readFileSync(file, 'utf8'))
  .join('\n')

if (fixedLoginEnabled) {
  assert.ok(compiledJavaScript.includes(fixedToken), '固定登录构建产物缺少开发 Token')
} else {
  assert.ok(!compiledJavaScript.includes(fixedToken), '发布构建产物禁止包含开发 Token')
}

const compiledAgeJavaScript = fs.readFileSync(path.join(rootDir, 'dist/pages/login/age.js'), 'utf8')
const compiledAgeStyles = fs.readFileSync(path.join(rootDir, 'dist/pages/login/age.wxss'), 'utf8')
assert.equal((compiledAgeJavaScript.match(/onPickStart:/g) || []).length, 3, '出生日期年月日必须使用三个物理隔离的原生单列滚轮')
assert.match(compiledAgeJavaScript, /login-age-picker--year/, '出生日期构建产物缺少年份单列滚轮')
assert.match(compiledAgeJavaScript, /login-age-picker--month/, '出生日期构建产物缺少月份单列滚轮')
assert.match(compiledAgeJavaScript, /login-age-picker--day/, '出生日期构建产物缺少日期单列滚轮')
assert.match(compiledAgeJavaScript, /column--picking/, '出生日期滑动中必须只展开当前列')
assert.match(compiledAgeStyles, /item--above\{top:-46rpx\}/, '出生日期必须保留蓝湖上方行位置')
assert.match(compiledAgeStyles, /item--below\{top:44\.5rpx\}/, '出生日期必须保留蓝湖下方行位置')
assert.match(compiledAgeStyles, /item--outer\{visibility:hidden\}/, '出生日期静止态必须保留蓝湖五行视觉')
assert.match(compiledAgeStyles, /column--picking[^}]*[\s\S]*visibility:visible/, '出生日期当前滑动列必须显示后续数值')

const compiledAddress = fs.readFileSync(path.join(rootDir, 'dist/pages/login/address.js'), 'utf8')
assert.match(compiledAddress, /loginCityLocation/, '选择城市必须使用用户指定的 OSS 定位切图')

const compiledCoinDetail = fs.readFileSync(path.join(rootDir, 'dist/pages/coins/detail.js'), 'utf8')
assert.match(compiledCoinDetail, /qianxunEmptyChart/, '千寻币暂无数据构建产物必须使用蓝湖 OSS 切图')
assert.match(compiledCoinDetail, /334rpx/, '千寻币暂无数据切图宽度必须为 334rpx')
assert.match(compiledCoinDetail, /251rpx/, '千寻币暂无数据切图高度必须为 251rpx')

console.log(`小程序产物门禁通过：${fixedLoginEnabled ? '千寻首页 + 开发 Token' : '登录首页 + 无开发 Token'}，出生日期蓝湖五行样式 + 当前列连续滑动，选择城市 OSS 切图，千寻币蓝湖空态生效`)
