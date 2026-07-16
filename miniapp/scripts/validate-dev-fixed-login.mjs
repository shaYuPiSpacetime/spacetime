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
const startDevScript = read('../backend/scripts/start-dev.sh')
const hasLocalApplicationDev = fs.existsSync(path.join(rootDir, '../backend/src/main/resources/application-dev.yml'))
const applicationDev = hasLocalApplicationDev
  ? read('../backend/src/main/resources/application-dev.yml')
  : read('../backend/src/main/resources/application-dev.yml.example')

assert.match(config, /token: 'dev-fixed-token-17366629764'/, '小程序固定 token 必须与后端一致')
assert.match(config, /phone: '17366629764'/, '小程序固定登录手机号必须明确')
assert.match(config, /enabled: process\.env\.MINIAPP_DEV_FIXED_LOGIN === 'true'/, '运行态固定登录必须与启动页共用环境变量')
assert.match(app, /setLogin\(\s*DEV_FIXED_LOGIN\.token/, '启动时必须写入固定登录态')
assert.doesNotMatch(app, /Taro\.switchTab/, '应用启动阶段禁止调用 switchTab，避免页面栈未就绪时超时')
assert.match(appConfig, /const useDevFixedStartup = process\.env\.MINIAPP_DEV_FIXED_LOGIN === 'true'/, '仅显式开发开关允许固定登录首页启动')
assert.match(appConfig, /const startPage = useDevFixedStartup \? 'pages\/index\/index' : 'pages\/login\/index'/, '开发构建必须直接以首页作为启动页')
assert.match(appConfig, /pages: \[startPage, \.\.\.MAIN_PAGES\.filter\(\(?page\)? => page !== startPage\)\]/, '启动页必须置于页面清单首位且不得重复')
assert.match(packageJson, /"dev:weapp": "MINIAPP_DEV_FIXED_LOGIN=true npm run build:weapp -- --watch"/, '默认微信开发监听必须开启固定登录')
assert.match(packageJson, /"dev:weapp:login": "MINIAPP_DEV_FIXED_LOGIN=false npm run build:weapp -- --watch"/, '真实登录联调必须提供显式关闭固定登录的脚本')
assert.match(taroConfig, /'process\.env\.MINIAPP_DEV_FIXED_LOGIN': JSON\.stringify\(\s*process\.env\.MINIAPP_DEV_FIXED_LOGIN \|\| 'false'\s*\)/, 'Taro 编译配置必须注入固定登录首页开关')
assert.match(applicationDev, /dev-fixed-login:/, '后端 dev 配置模板必须声明固定登录配置')
if (hasLocalApplicationDev) {
  assert.ok(applicationDev.includes('enabled: ${DEV_FIXED_LOGIN_ENABLED:true}'), '后端 dev profile 必须启用固定登录')
  assert.ok(applicationDev.includes('token: ${DEV_FIXED_LOGIN_TOKEN:dev-fixed-token-17366629764}'), '后端固定 token 必须与小程序一致')
}
assert.doesNotMatch(read('../backend/src/main/resources/application-prod.yml'), /dev-fixed-login/, '生产配置禁止出现固定登录')
assert.match(startDevScript, /\$\{PID\}/, '后台启动脚本输出 PID 时必须使用明确变量边界')
assert.doesNotMatch(startDevScript, /\$PID，/, '后台启动脚本不得把中文标点解析进 PID 变量名')
assert.match(startDevScript, /nohup mvn spring-boot:run/, '后台启动必须脱离当前终端，避免启动 shell 退出后服务被停止')
assert.match(startDevScript, /< \/dev\/null/, '后台启动必须关闭标准输入，避免持续占用启动终端')

console.log('本地固定登录门禁通过')
