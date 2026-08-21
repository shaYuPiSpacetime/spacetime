import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8')

const config = read('src/constants/config.ts')
const app = read('src/app.tsx')
const appConfig = read('src/app.config.ts')
const packageJson = read('package.json')
const taroConfig = read('config/index.ts')
const builtLoginGatePath = path.join(rootDir, 'scripts/validate-built-dev-fixed-login.mjs')
const startDevScript = read('../backend/scripts/start-dev.sh')
const hasLocalApplicationDev = fs.existsSync(path.join(rootDir, '../backend/src/main/resources/application-dev.yml'))
const applicationDev = hasLocalApplicationDev
  ? read('../backend/src/main/resources/application-dev.yml')
  : read('../backend/src/main/resources/application-dev.yml.example')

assert.match(config, /token: process\.env\.MINIAPP_DEV_FIXED_TOKEN \|\| ''/, '小程序固定 token 必须由构建期注入，禁止常驻发布代码')
assert.match(config, /phone: '17366629764'/, '小程序固定登录手机号必须明确')
assert.match(config, /enabled: process\.env\.MINIAPP_DEV_FIXED_LOGIN === 'true'/, '运行态固定登录必须与启动页共用环境变量')
assert.match(app, /setLogin\(\s*DEV_FIXED_LOGIN\.token/, '启动时必须写入固定登录态')
assert.match(app, /if \(DEV_FIXED_LOGIN\.enabled\)[\s\S]{0,520}setLogin\([\s\S]{0,320}bootstrapPrd01\(\)/, '固定登录必须先写入 Token 再发起运行时请求，避免无 Token 的 401 回包反向清空登录态')
assert.doesNotMatch(app, /Taro\.switchTab/, '应用启动阶段禁止调用 switchTab，避免页面栈未就绪时超时')
assert.match(appConfig, /const useDevFixedStartup = process\.env\.MINIAPP_DEV_FIXED_LOGIN === 'true'/, '仅显式开发开关允许固定登录首页启动')
assert.match(appConfig, /const startPage = useDevFixedStartup \? 'pages\/index\/index' : 'pages\/login\/index'/, '开发构建必须直接以首页作为启动页')
assert.match(appConfig, /pages: \[startPage, \.\.\.MAIN_PAGES\.filter\(\(?page\)? => page !== startPage\)\]/, '启动页必须置于页面清单首位且不得重复')
assert.match(packageJson, /"dev:weapp": "MINIAPP_DEV_FIXED_LOGIN=false npm run build:weapp -- --watch"/, '默认微信开发监听必须使用真实登录，禁止开发 Token 请求生产接口')
assert.match(packageJson, /"build:weapp:dev": "MINIAPP_DEV_FIXED_LOGIN=false npm run build:weapp"/, '本地非 watch 构建必须默认使用真实登录')
assert.match(packageJson, /"dev:weapp:login": "MINIAPP_DEV_FIXED_LOGIN=false npm run build:weapp -- --watch"/, '真实登录联调必须提供显式关闭固定登录的脚本')
assert.match(packageJson, /"dev:weapp:fixed-local": "MINIAPP_DEV_FIXED_LOGIN=true MINIAPP_E2E_MODE=true MINIAPP_E2E_API_BASE_URL=http:\/\/127\.0\.0\.1:8080\/api npm run build:weapp -- --watch"/, '固定登录仅允许通过本机后端专用监听命令启用')
assert.match(packageJson, /"build:weapp:fixed-local": "MINIAPP_DEV_FIXED_LOGIN=true MINIAPP_E2E_MODE=true MINIAPP_E2E_API_BASE_URL=http:\/\/127\.0\.0\.1:8080\/api npm run build:weapp"/, '固定登录仅允许通过本机后端专用构建命令启用')
assert.match(packageJson, /validate-built-dev-fixed-login\.mjs/, '构建后必须校验最终首页和固定 Token 是否与构建开关一致')
assert.match(taroConfig, /'process\.env\.MINIAPP_DEV_FIXED_LOGIN': JSON\.stringify\(\s*process\.env\.MINIAPP_DEV_FIXED_LOGIN \|\| 'false'\s*\)/, 'Taro 编译配置必须注入固定登录首页开关')
assert.match(taroConfig, /if \(devFixedLoginEnabled && !devFixedLoginUsesLoopbackApi\)/, '固定登录构建必须拒绝连接生产接口')
assert.match(taroConfig, /devFixedLoginEnabled[\s\S]{0,180}'dev-fixed-token-17366629764'/, '开启固定登录时构建配置必须提供与后端一致的默认 Token')
assert.match(taroConfig, /'process\.env\.MINIAPP_DEV_FIXED_TOKEN': JSON\.stringify\(devFixedLoginToken\)/, 'Taro 编译配置必须按开关注入或清空固定 Token')
assert.equal(fs.existsSync(builtLoginGatePath), true, '缺少固定登录构建产物门禁')
const builtLoginGate = fs.readFileSync(builtLoginGatePath, 'utf8')
assert.match(builtLoginGate, /dist\/app\.json/, '固定登录产物门禁必须读取 dist app.json')
assert.match(builtLoginGate, /pages\/index\/index/, '固定登录产物必须以千寻为首页')
assert.match(builtLoginGate, /dev-fixed-token-17366629764/, '固定登录产物必须校验编译后 Token')
assert.match(applicationDev, /dev-fixed-login:/, '后端 dev 配置模板必须声明固定登录配置')
if (hasLocalApplicationDev) {
  assert.match(applicationDev, /enabled:\s*(?:true|\$\{DEV_FIXED_LOGIN_ENABLED:true\})/, '后端 dev profile 必须启用固定登录')
  const frontendDefaultToken = taroConfig.match(/process\.env\.DEV_FIXED_LOGIN_TOKEN \|\| '([^']+)'/)?.[1]
  const backendTokenSource = applicationDev.match(/^\s*token:\s*['"]?([^'"\s]+)['"]?\s*$/m)?.[1]
  const backendDefaultToken = backendTokenSource?.match(/^\$\{DEV_FIXED_LOGIN_TOKEN:([^}]+)\}$/)?.[1]
    || backendTokenSource
  assert.ok(
    frontendDefaultToken && backendDefaultToken && frontendDefaultToken === backendDefaultToken,
    '后端 dev profile 固定登录 Token 必须与小程序默认值一致',
  )
}
assert.doesNotMatch(read('../backend/src/main/resources/application-prod.yml'), /dev-fixed-login/, '生产配置禁止出现固定登录')
assert.match(startDevScript, /\$\{PID\}/, '后台启动脚本输出 PID 时必须使用明确变量边界')
assert.doesNotMatch(startDevScript, /\$PID，/, '后台启动脚本不得把中文标点解析进 PID 变量名')
assert.match(startDevScript, /nohup mvn spring-boot:run/, '后台启动必须脱离当前终端，避免启动 shell 退出后服务被停止')
assert.match(startDevScript, /< \/dev\/null/, '后台启动必须关闭标准输入，避免持续占用启动终端')

console.log('本地固定登录门禁通过')
