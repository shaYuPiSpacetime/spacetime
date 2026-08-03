/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const miniappRoot = path.resolve(__dirname, '..')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  })
  module._compile(output.outputText, filename)
}

function read(relativePath) {
  return fs.readFileSync(path.join(miniappRoot, relativePath), 'utf8')
}

function requireLoginRuntime() {
  const file = path.join(miniappRoot, 'src/domain/loginRuntime.ts')
  assert.ok(fs.existsSync(file), '缺少登录错误与表单校验领域函数')
  delete require.cache[file]
  return require(file)
}

test('登录背景使用远程静音循环视频并保留静态兜底', () => {
  const login = read('src/pages/login/index.tsx')
  const mediaFile = path.join(miniappRoot, 'src/constants/ossMedia.ts')

  assert.ok(fs.existsSync(mediaFile), '缺少 OSS 媒体清单')
  assert.match(read('src/constants/ossMedia.ts'), /loginBackgroundVideo:\s*'https:\/\//)
  assert.match(login, /import \{[^}]*Video[^}]*\} from '@tarojs\/components'/)
  assert.match(login, /miniappOssMedia\.loginBackgroundVideo/)
  assert.match(login, /autoplay/)
  assert.match(login, /loop/)
  assert.match(login, /muted/)
  assert.match(login, /controls=\{false\}/)
  assert.match(login, /objectFit="cover"/)
  assert.match(login, /onError=\{[^}]*setVideoUnavailable/)
  assert.match(login, /src=\{loginSceneBg\}/)

  const packagedVideos = fs
    .readdirSync(path.join(miniappRoot, 'src'), { recursive: true })
    .filter(file => String(file).toLowerCase().endsWith('.mp4'))
  assert.deepEqual(packagedVideos, [], '登录视频不得进入小程序主包')
})

test('登录视频播放时仍显示蓝湖品牌 Logo', () => {
  const login = read('src/pages/login/index.tsx')
  const iconManifest = read('src/constants/ossIcons.ts')
  const logoSource = path.join(miniappRoot, 'src/assets/lanhu/login/login-brand.png')

  assert.ok(fs.existsSync(logoSource), '缺少从蓝湖登录稿拆出的无损品牌 Logo')
  assert.match(iconManifest, /loginBrand:\s*'https:\/\//, '品牌 Logo 必须使用 OSS 公网地址')
  assert.match(login, /import \{[^}]*CoverImage[^}]*CoverView[^}]*\} from '@tarojs\/components'/, '视频上层 Logo 必须使用原生覆盖组件')
  assert.match(login, /className="login-brand-logo"/, '登录页缺少独立品牌 Logo 图层')
  assert.match(login, /src=\{miniappOssIcons\.loginBrand\}/, '登录页没有引用品牌 Logo OSS 切图')
  assert.match(login, /className="login-brand-logo"[\s\S]{0,500}zIndex:\s*2/, '品牌 Logo 必须位于视频图层之上')
})

test('地址选择恢复蓝湖省市同层联动且不依赖下级地区接口', () => {
  const source = read('src/pages/login/address.tsx')

  assert.match(source, /loadProvinceCities\(/, '地址页应一次加载省市树')
  assert.match(source, /ManualAddressSheet/, '地址页缺少原有省市双列弹层')
  assert.equal(source.includes('AddressOptionSheet'), false, '地址页不应再拆成省、市、区县三个弹层')
  assert.equal(source.includes('loadLocations('), false, '地址选择不应再请求不适配的下级地区接口')
  assert.match(source, /locationProvince:/, '地址提交必须保留省级行政区 code')
  assert.match(source, /locationCity:/, '地址提交必须保留市级行政区 code')
})

test('手机号和验证码错误提示按真实原因区分', () => {
  const { isValidLoginPhone, resolvePhoneLoginError } = requireLoginRuntime()

  assert.equal(isValidLoginPhone('17366629764'), true)
  assert.equal(isValidLoginPhone('1736662976'), false)
  assert.equal(isValidLoginPhone('12345678900'), false)
  assert.equal(
    resolvePhoneLoginError('登录失败，请稍后重试', new Error('短信验证码错误')),
    '验证码错误，请重新输入'
  )
  assert.equal(
    resolvePhoneLoginError('登录失败，请稍后重试', { message: 'verification code invalid' }),
    '验证码错误，请重新输入'
  )
  assert.equal(
    resolvePhoneLoginError('登录失败，请稍后重试', new Error('手机号格式不正确')),
    '你输入的手机号有误'
  )
  assert.equal(
    resolvePhoneLoginError('登录失败，请稍后重试', new Error('服务暂时不可用')),
    '服务暂时不可用'
  )
})

test('手机号登录错误只通过页面错误浮层展示一次', () => {
  const phone = read('src/pages/login/phone.tsx')
  const showError = phone.match(
    /const showError = \(fallback: string, error\?: unknown\) => \{[\s\S]*?\n\s{2}\}/
  )?.[0]

  assert.ok(showError, '手机号页缺少统一错误处理函数')
  assert.match(showError, /setErrorText\(message\)/, '错误信息应交给页面错误浮层展示')
  assert.doesNotMatch(showError, /Taro\.showToast/, '同一错误不得再叠加原生 Toast')
  assert.match(phone, /\{errorText \? \([\s\S]*phone-login-error/, '页面应保留唯一错误浮层')
})

test('首次勾选协议必须先展示协议弹窗，同意后才更新状态', () => {
  const login = read('src/pages/login/index.tsx')

  assert.match(
    login,
    /const handleToggleAgreement = \(\) => \{[\s\S]*if \(agreementAccepted\)[\s\S]*setAgreementAccepted\(false\)[\s\S]*setShowDialog\(true\)/
  )
  assert.match(
    login,
    /const handleAgreeAgreement = async \(\) => \{[\s\S]*setAgreementAccepted\(true\)/
  )
  assert.doesNotMatch(
    login,
    /const handleToggleAgreement = \(\) => \{[\s\S]{0,120}setAgreementAccepted\(\(checked\) => !checked\)/
  )
})

test('手机号页和首登资料页共享底部圆形按钮及弯向右箭头', () => {
  const buttonPath = path.join(miniappRoot, 'src/pages/login/components/LoginNextButton.tsx')
  assert.ok(fs.existsSync(buttonPath), '缺少登录链路共享底部按钮')

  const button = fs.readFileSync(buttonPath, 'utf8')
  const phone = read('src/pages/login/phone.tsx')
  const shell = read('src/pages/login/components/LoginProfileShell.tsx')
  const phoneStyles = read('src/pages/login/phone.scss')

  assert.match(button, /width: '126rpx'/)
  assert.match(button, /height: '126rpx'/)
  assert.match(button, /borderRadius: '63rpx'/)
  assert.match(button, /login-next-icon__curve/)
  assert.match(button, /login-next-icon__head/)
  assert.match(button, /if \(!active\) return/)
  assert.match(phone, /<LoginNextButton/)
  assert.match(shell, /<LoginNextButton/)
  assert.doesNotMatch(phone, /phone-login-next-arrow/)
  assert.doesNotMatch(phoneStyles, /\.phone-login-next-arrow/)
})

test('登录方式、手机号和性别图标在运行态使用真实组件', () => {
  const login = read('src/pages/login/index.tsx')
  const phone = read('src/pages/login/phone.tsx')
  const gender = read('src/pages/login/gender.tsx')

  assert.match(login, /miniappOssIcons\.loginMethodWechat/)
  assert.match(login, /miniappOssIcons\.loginMethodPhone/)
  assert.match(login, /使用微信登录/)
  assert.match(phone, /miniappOssIcons\.loginMethodPhone/)
  assert.match(phone, /function SmsCodeIcon\(\)/)
  assert.match(gender, /miniappOssIcons\.genderFemale/)
  assert.match(gender, /miniappOssIcons\.genderMale/)
  assert.match(gender, /我是女生/)
  assert.match(gender, /我是男生/)
})

test('出生日期已有有效默认值时进入页面即点亮', () => {
  const age = read('src/pages/login/age.tsx')

  assert.match(age, /const hasValidDate = Boolean\(/)
  assert.match(age, /nextActive=\{hasValidDate \|\| field\?\.required === false\}/)
  assert.doesNotMatch(age, /field\?\.required && !touched/)
})

test('登录专项门禁已接入开发和发布构建', () => {
  const packageJson = JSON.parse(read('package.json'))

  assert.equal(
    packageJson.scripts['validate:login-closure'],
    'node --test scripts/test-login-pending-items-closure.cjs'
  )
  assert.match(packageJson.scripts['predev:weapp'], /validate:login-closure/)
  assert.match(packageJson.scripts['prebuild:weapp'], /validate:login-closure/)
})
