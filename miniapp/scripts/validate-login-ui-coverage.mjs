import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataPath = path.join(rootDir, 'src/data/lanhuDemo.json')
const appConfigPath = path.join(rootDir, 'src/app.config.ts')

const REQUIRED_LOGIN_DESIGNS = [
  '登录-年龄选择',
  '登录-身份',
  '选择脱单目标',
  '登录-性别选择男',
  '登录-性别选择未选中',
  '登录-地址-点亮',
  '登录-地址-手动选择',
  '登录-错误提示',
  '登录-地址',
  '登录-学历',
  '登录-微信授权登录-授权说明',
  '登录-微信授权登录',
  '登录-弹窗',
  '登录-性别选择女性选中',
  '登录-选择登录方式',
  '手机号登录',
  '手机号登录-点亮',
]

const REQUIRED_SOURCE_EVIDENCE = [
  {
    label: '登录首页真实按钮和授权/错误状态',
    route: '/pages/login/index',
    snippets: [
      "variant === 'auth'",
      "variant === 'error'",
      'data-role="login-primary-hit-area"',
      "background: 'transparent'",
      'opacity: 0',
      "left: '115rpx'",
      "立即使用",
    ],
  },
  {
    label: '登录方式选择先于协议',
    route: '/pages/login/index',
    snippets: [
      'LoginMethodSheet',
      'selectedMethod',
      'showMethodSheet',
      'handleSelectMethod',
      'handleAgreeAgreement',
      '阅读并同意',
      '用户服务协议',
      '隐私保护政策',
      'loginDemo.methods.map',
      "borderRadius: '64rpx 64rpx 0 0'",
      "bottom: '0'",
      "height: '124rpx'",
    ],
  },
  {
    label: '手机号登录方式独立页面闭环',
    route: '/pages/login/phone',
    snippets: [
      'PhoneLoginPage',
      'phoneNumber',
      'verificationCode',
      'handlePhoneLogin',
      '你的手机号是',
      '请输入你要登录的手机号',
      '你输入的手机号有误',
      'SmsCodeIcon',
      'CODE_COUNTDOWN_SECONDS = 60',
      'codeCountdown',
      'loginDemo.phoneLogin.codeButtonText',
      "bottom: '164rpx'",
      "Taro.redirectTo({ url: '/pages/login/gender' })",
    ],
  },
  {
    label: '登录方式手机号跳转独立页面',
    route: '/pages/login/index',
    snippets: [
      "Taro.redirectTo({ url: '/pages/login/phone' })",
    ],
  },
  {
    label: '微信授权必须调用手机号授权并处理失败',
    route: '/pages/login/index',
    snippets: [
      'handleWechatPhoneLogin',
      'openType="getPhoneNumber"',
      'onGetPhoneNumber',
      'login-wechat-custom-button',
      'loginByWechatPhone',
      'Taro.login',
      'setWechatAuthPending',
      '微信授权超时，请重试',
    ],
  },
  {
    label: '协议授权说明居中弹窗',
    route: '/pages/login/index',
    snippets: [
      'AgreementDialog',
      'loginDemo.agreement.title',
      '1、未经您的同意',
      '2、您可以随时访问',
      "width: '620rpx'",
      "left: '65rpx'",
      "top: '50%'",
      "transform: 'translateY(-50%)'",
      "borderRadius: '64rpx'",
      '未成年人请勿注册使用本产品。',
      '用户服务协议',
      '隐私保护政策',
    ],
  },
  {
    label: '性别三态和蓝湖切图',
    route: '/pages/login/gender',
    snippets: ["variant === 'none'", "variant === 'female'", "variant === 'male'", 'genderFemale', 'genderMale', "top=\"448rpx\"", "top=\"693rpx\""],
  },
  {
    label: '年龄默认生日来自 demo 数据',
    route: '/pages/login/age',
    snippets: ['getDemoPageData', 'defaultBirthday', "setStep('identity')", '/pages/login/identity'],
  },
  {
    label: '登录身份页独立落地',
    route: '/pages/login/identity',
    snippets: ['LoginIdentityPage', 'identityOptions.map', "setStep('education')", '/pages/login/education'],
  },
  {
    label: '学历选项来自 hook 数据',
    route: '/pages/login/education',
    snippets: ['educationOptions.map', 'educationOptions[1]'],
  },
  {
    label: '地址空态、手动选择和点亮态',
    route: '/pages/login/address',
    snippets: [
      "variant === 'empty'",
      "variant === 'manual'",
      "variant === 'selected'",
      'showManualSheet',
      'handleLocationFail',
      'loadProvinceCities',
      "borderRadius: '64rpx 64rpx 0 0'",
      "height: '756rpx'",
      "margin: '80rpx auto 0'",
      "width: '656rpx'",
      "marginTop: '43rpx'",
      'getWindowMetrics',
      'getAddressScrollTop',
      'handleProvinceScroll',
      'handleCityScroll',
      'scrollWithAnimation',
      "justifyContent: 'center'",
      'locationColor',
      'nextActive={Boolean(selected)}',
    ],
  },
]

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
  assert.equal(typeof route, 'string', `${label} 缺少 route`)
  const cleanRoute = route.split('?')[0]
  assert.ok(routeSet.has(cleanRoute), `${label} 路由未注册: ${route}`)
}

function assertVariantImplemented(route, variant, label) {
  if (variant === 'default') return
  const cleanRoute = route.split('?')[0]
  const sourcePath = path.join(rootDir, 'src', `${cleanRoute.replace('/pages/', 'pages/')}.tsx`)
  assert.ok(fs.existsSync(sourcePath), `${label} 页面文件不存在: ${path.relative(rootDir, sourcePath)}`)
  const source = fs.readFileSync(sourcePath, 'utf8')
  assert.ok(
    source.includes(`'${variant}'`) || source.includes(`"${variant}"`),
    `${label} 页面未显式处理 variant=${variant}`,
  )
}

function sourcePathForRoute(route) {
  return path.join(rootDir, 'src', `${route.replace('/pages/', 'pages/')}.tsx`)
}

function assertSourceEvidence() {
  for (const item of REQUIRED_SOURCE_EVIDENCE) {
    const sourcePath = sourcePathForRoute(item.route)
    assert.ok(fs.existsSync(sourcePath), `${item.label} 页面文件不存在: ${path.relative(rootDir, sourcePath)}`)
    const source = fs.readFileSync(sourcePath, 'utf8')
    for (const snippet of item.snippets) {
      assert.ok(source.includes(snippet), `${item.label} 缺少源码证据: ${snippet}`)
    }
  }
}

function assertAddressSheetScrollIsNotLocked() {
  const source = fs.readFileSync(sourcePathForRoute('/pages/login/address'), 'utf8')
  assert.ok(source.includes('releaseControlledAddressScroll'), '地址选择弹窗点击定位后必须释放 scrollTop 控制权，避免滚动被拉回')
  assert.ok(!source.includes('setProvinceScrollTop(scrollTop)'), '省份列滚动时不能把实时 scrollTop 写回受控属性')
  assert.ok(!source.includes('setCityScrollTop(scrollTop)'), '城市列滚动时不能把实时 scrollTop 写回受控属性')
  assert.ok(!source.includes('onTouchEnd={snapProvinceScroll}'), '省份列不能在松手时强制吸附回旧选中项')
  assert.ok(!source.includes('onTouchEnd={snapCityScroll}'), '城市列不能在松手时强制吸附回旧选中项')
}

const data = readJson(dataPath)
const routeSet = readAppRoutes()
const loginUiDesigns = data.login?.uiDesigns

assert.ok(Array.isArray(loginUiDesigns), 'login.uiDesigns 必须是数组')
assert.ok(loginUiDesigns.length >= REQUIRED_LOGIN_DESIGNS.length, `登录 UI 稿覆盖数量至少为 ${REQUIRED_LOGIN_DESIGNS.length}`)

const names = new Set(loginUiDesigns.map((item) => item.designName))
for (const designName of REQUIRED_LOGIN_DESIGNS) {
  assert.ok(names.has(designName), `缺少登录 UI 稿覆盖: ${designName}`)
}

assert.ok(Array.isArray(data.login?.methods), 'login.methods 必须是数组')
assert.ok(data.login.methods.some((method) => method.key === 'wechat' && method.title === '使用微信登录'), 'login.methods 缺少使用微信登录')
assert.ok(data.login.methods.some((method) => method.key === 'phone' && method.title === '手机号登录'), 'login.methods 缺少手机号登录')
assert.ok(data.login?.agreement?.title, 'login.agreement 缺少协议弹窗配置')
assert.equal(data.login.agreement.title, '用户协议和隐私政策', 'login.agreement 标题必须匹配蓝湖弹窗')
assert.ok(data.login.agreement.content.includes('1、未经您的同意'), 'login.agreement 缺少蓝湖编号说明 1')
assert.ok(data.login.agreement.content.includes('2、您可以随时访问'), 'login.agreement 缺少蓝湖编号说明 2')
assert.ok(data.login?.phoneLogin?.defaultPhone, 'login.phoneLogin 缺少手机号登录配置')

const routeKeys = new Set()
for (const item of loginUiDesigns) {
  if (item.variant === 'guest' || item.variant === 'guest-alt') {
    continue
  }
  assert.equal(typeof item.key, 'string', `${item.designName} 缺少 key`)
  assert.equal(typeof item.variant, 'string', `${item.designName} 缺少 variant`)
  assertRoute(routeSet, item.route, item.designName)
  routeKeys.add(item.route)
  const design = data.designs.find((candidate) => candidate.name === item.designName)
  assert.ok(design, `manifest 缺少设计稿: ${item.designName}`)
  assert.equal(design.status, 'implemented', `${item.designName} 必须标记为 implemented`)
  assert.equal(design.route, item.route, `${item.designName} manifest route 必须和 login.uiDesigns 一致`)
  assertVariantImplemented(item.route, item.variant, item.designName)
}

assert.ok(!fs.readFileSync(sourcePathForRoute('/pages/login/index'), 'utf8').includes("variant === 'guest'"), '登录页禁止恢复游客模式 variant')
assertSourceEvidence()
assertAddressSheetScrollIsNotLocked()

console.log('登录 UI 覆盖校验通过')
