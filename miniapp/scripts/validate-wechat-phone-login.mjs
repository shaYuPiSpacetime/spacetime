import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

function read(relativePath) {
  const fullPath = path.join(repoRoot, relativePath)
  assert.ok(fs.existsSync(fullPath), `文件不存在: ${relativePath}`)
  return fs.readFileSync(fullPath, 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath))
}

const authService = read('miniapp/src/services/auth.ts')
const configTs = read('miniapp/src/constants/config.ts')
const taroConfig = read('miniapp/config/index.ts')
const appTsx = read('miniapp/src/app.tsx')
const appConfig = read('miniapp/src/app.config.ts')
const loginPage = read('miniapp/src/pages/login/index.tsx')
const useAuth = read('miniapp/src/hooks/useAuth.ts')
const useLogin = read('miniapp/src/hooks/useLogin.ts')
const userTypes = read('miniapp/src/types/user.ts')
const appUser = read('backend/src/main/java/com/spacetime/common/entity/AppUser.java')
const authImpl = read('backend/src/main/java/com/spacetime/miniapp/service/impl/AuthMiniappServiceImpl.java')
const loginReq = read('backend/src/main/java/com/spacetime/miniapp/dto/request/WechatLoginReq.java')
const loginVO = read('backend/src/main/java/com/spacetime/miniapp/dto/response/WechatLoginVO.java')
const devYml = read('backend/src/main/resources/application-dev.yml')
const prodYml = read('backend/src/main/resources/application-prod.yml')
const appUserSql = read('deploy/sql/prod/010_app_user_schema.sql')
const webConfig = read('backend/src/main/java/com/spacetime/common/interceptor/WebConfig.java')

assert.ok(authService.includes("'/miniapp/auth/wechat-login'"), '微信登录必须调用后端真实 /miniapp/auth/wechat-login')
assert.ok(authService.includes('loginCode'), '登录请求必须传 wx.login 返回的 loginCode')
assert.ok(authService.includes('phoneCode'), '登录请求必须传 getPhoneNumber 返回的 phoneCode')
assert.ok(!authService.includes("'/miniapp/login'"), '不得继续调用旧 /miniapp/login')
assert.ok(configTs.includes("'https://admin.shikongxiehou.com/api'"), '小程序默认接口域名必须指向 https://admin.shikongxiehou.com/api')
assert.ok(taroConfig.includes("'https://admin.shikongxiehou.com/api'"), 'Taro defineConstants 必须注入生产接口域名')
assert.ok(configTs.includes('MOCK_ENABLED = false'), '真实联调阶段默认必须关闭 MOCK_ENABLED')
assert.ok(appConfig.includes("'pages/login/index'") && appConfig.indexOf("'pages/login/index'") < appConfig.indexOf("'pages/login/address'"), '小程序首屏必须是登录页，不得启动到地址页')
assert.ok(appTsx.includes('useDidShow'), '未登录跳转必须延后到 AppDidShow，避免 appLaunch 页面栈异常')
assert.ok(!appTsx.includes('useLaunch(() => {\n    if (MOCK_ENABLED)'), '不得在 AppLaunch 阶段立即按 mock 分支重建页面栈')

assert.ok(loginPage.includes('openType="getPhoneNumber"') || loginPage.includes("openType='getPhoneNumber'"), '微信登录按钮必须使用 getPhoneNumber 授权手机号')
assert.ok(loginPage.includes('onGetPhoneNumber'), '微信登录按钮必须绑定 onGetPhoneNumber')
assert.ok(loginPage.includes('Taro.login'), '手机号授权后必须调用 Taro.login 获取 code')
assert.ok(loginPage.includes('loginByWechatPhone'), '登录页必须调用真实微信手机号登录服务')
assert.ok(loginPage.includes('setLogin('), '真实登录成功后必须写入 authStore')
assert.ok(!loginPage.includes('Taro.getUserProfile'), '微信登录不得再依赖 getUserProfile 作为登录授权')

assert.ok(useAuth.includes('loginByWechatPhone'), 'useAuth 必须改用手机号授权登录服务')
assert.ok(userTypes.includes('phoneCode'), 'LoginReq 类型必须包含 phoneCode')
assert.ok(userTypes.includes('openid'), 'LoginVO 类型必须包含 openid')
assert.ok(useLogin.includes("'/miniapp/profile/init-complete'"), '首登资料完成必须提交后端 /miniapp/profile/init-complete')
assert.ok(!useLogin.includes('mock_token_'), '首登资料提交不能再写 mock token')

assert.ok(exists('backend/src/main/java/com/spacetime/miniapp/service/WechatMiniappClient.java'), '缺少微信小程序接口客户端抽象')
assert.ok(exists('backend/src/main/java/com/spacetime/miniapp/service/impl/WechatMiniappClientImpl.java'), '缺少微信小程序接口客户端实现')
assert.ok(exists('backend/src/main/java/com/spacetime/common/config/WechatMiniappProperties.java'), '缺少微信小程序 appId/appSecret 配置')
assert.ok(loginReq.includes('loginCode'), '后端登录请求 DTO 必须包含 loginCode')
assert.ok(loginReq.includes('phoneCode'), '后端登录请求 DTO 必须包含 phoneCode')
assert.ok(loginVO.includes('openid'), '后端登录响应必须返回 openid')
assert.ok(loginVO.includes('phone'), '后端登录响应必须返回 phone')
assert.ok(loginVO.includes('maskedPhone'), '后端登录响应必须返回 maskedPhone')
assert.ok(authImpl.includes('wechatMiniappClient.code2Session'), '登录服务必须调用微信 jscode2session 客户端')
assert.ok(authImpl.includes('wechatMiniappClient.getPhoneNumber'), '登录服务必须调用微信手机号客户端')
assert.ok(!authImpl.includes('mockCode2Session'), '后端不得保留 mockCode2Session 登录逻辑')

assert.ok(appUser.includes('private String phone;'), 'app_user 实体必须包含 phone')
assert.ok(appUser.includes('private String phoneHash;'), 'app_user 实体必须包含 phoneHash')
assert.ok(appUserSql.includes('phone VARCHAR(30)'), 'app_user DDL 必须包含 phone 字段')
assert.ok(appUserSql.includes('phone_hash'), 'app_user DDL 必须包含 phone_hash 字段')
assert.ok(devYml.includes('wechat-miniapp:'), 'dev 配置必须包含 wechat-miniapp')
assert.ok(prodYml.includes('wechat-miniapp:'), 'prod 配置必须包含 wechat-miniapp')
assert.ok(webConfig.includes('/miniapp/auth/**'), '微信登录接口必须继续放行 token 拦截器')

console.log('微信授权手机号登录门禁通过')
