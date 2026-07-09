import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const loginSourcePath = path.join(rootDir, 'src/pages/login/index.tsx')
const phoneSourcePath = path.join(rootDir, 'src/pages/login/phone.tsx')
const appConfigPath = path.join(rootDir, 'src/app.config.ts')
const dataPath = path.join(rootDir, 'src/data/lanhuDemo.json')
const loginMethodIconPaths = [
  'src/assets/lanhu/login/login-method-wechat.png',
  'src/assets/lanhu/login/login-method-phone.png',
]

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `文件不存在: ${path.relative(rootDir, filePath)}`)
  return fs.readFileSync(filePath, 'utf8')
}

function assertIncludes(source, label, snippets) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} 缺少源码证据: ${snippet}`)
  }
}

const source = read(loginSourcePath)
const appConfigSource = read(appConfigPath)
const data = JSON.parse(read(dataPath))

assertIncludes(source, '选择登录方式蓝湖底部弹层', [
  'LoginMethodSheet',
  'loginMethodWechatIcon',
  'loginMethodPhoneIcon',
  '选择登录方式',
  'loginDemo.methods.map',
  '阅读并同意',
  '用户服务协议',
  '隐私保护政策',
  "borderRadius: '64rpx 64rpx 0 0'",
  "height: '124rpx'",
])

assertIncludes(source, '协议居中弹窗', [
  'AgreementDialog',
  'loginDemo.agreement.title',
  '未成年人请勿注册使用本产品。',
  '1、未经您的同意',
  '2、您可以随时访问',
  "left: '65rpx'",
  "top: '50%'",
  "transform: 'translateY(-50%)'",
  "width: '620rpx'",
  "borderRadius: '64rpx'",
])

assertIncludes(source, '微信自定义手机号授权按钮', [
  'openType="getPhoneNumber"',
  'onGetPhoneNumber',
  'handleWechatPhoneLogin',
  'loginByWechatPhone',
  'Taro.login',
  'login-wechat-custom-button',
])
assertIncludes(source, '登录页立即使用透明热区', [
  'data-role="login-primary-hit-area"',
  "background: 'transparent'",
  'opacity: 0',
  '立即使用',
])
assertIncludes(source, '微信登录切图按 @2x 尺寸展示', [
  "width: '48rpx'",
  "height: '48rpx'",
])

assertIncludes(source, '手机号登录跳转独立页面', [
  "Taro.redirectTo({ url: '/pages/login/phone' })",
])
assert.ok(!source.includes('renderPhoneLoginPage'), '登录入口页不得内联手机号登录页面')
assertIncludes(appConfigSource, '手机号登录页面注册', ["'pages/login/phone'"])

const phoneSource = read(phoneSourcePath)
assertIncludes(phoneSource, '手机号登录独立页面态', [
  'PhoneLoginPage',
  '你的手机号是',
  '请输入你要登录的手机号',
  '你输入的手机号有误',
  'SmsCodeIcon',
  'CODE_COUNTDOWN_SECONDS = 60',
  'codeCountdown',
  'handleGetCode',
  'loginDemo.phoneLogin.codeButtonText',
  "borderRadius: '63rpx'",
  "borderRadius: '4rpx'",
  "bottom: '164rpx'",
  "Taro.redirectTo({ url: '/pages/login/gender' })",
])

const loginUiDesigns = data.login?.uiDesigns ?? []
assert.ok(data.login?.methods?.some((item) => item.key === 'wechat' && item.title === '使用微信登录'), '登录方式文案必须包含“使用微信登录”')
assert.ok(data.login?.methods?.some((item) => item.key === 'phone' && item.title === '手机号登录'), '登录方式文案必须包含“手机号登录”')
assert.equal(data.login?.agreement?.title, '用户协议和隐私政策', '协议标题必须匹配蓝湖弹窗')
assert.ok(data.login?.agreement?.content?.includes('1、未经您的同意'), '协议文案缺少蓝湖编号说明 1')
assert.ok(data.login?.agreement?.content?.includes('2、您可以随时访问'), '协议文案缺少蓝湖编号说明 2')

for (const assetPath of loginMethodIconPaths) {
  assert.ok(fs.existsSync(path.join(rootDir, assetPath)), `登录方式切图不存在: ${assetPath}`)
}

for (const designName of ['登录-选择登录方式', '登录-弹窗', '登录-微信授权登录', '手机号登录', '手机号登录-错误提示']) {
  const item = loginUiDesigns.find((candidate) => candidate.designName === designName)
  assert.ok(item, `login.uiDesigns 缺少设计稿: ${designName}`)
  if (designName.startsWith('手机号登录')) {
    assert.ok(item.route.startsWith('/pages/login/phone'), `${designName} 必须落在独立手机号页面`)
  } else {
    assert.ok(item.route.startsWith('/pages/login/index'), `${designName} 必须落在登录入口路由`)
  }
}

for (const designName of ['登录-选择登录方式', '登录-微信授权登录']) {
  const design = data.designs.find((candidate) => candidate.name === designName)
  assert.ok(design, `manifest 缺少设计稿: ${designName}`)
  for (const assetPath of loginMethodIconPaths) {
    assert.ok(design.assetRefs?.includes(assetPath), `${designName} 缺少切图引用: ${assetPath}`)
  }
}

console.log('登录蓝湖关键 UI 校验通过')
