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
const applicationDev = read('../backend/src/main/resources/application-dev.yml')

assert.match(config, /token: 'dev-fixed-token-17366629764'/, '小程序固定 token 必须与后端一致')
assert.match(config, /phone: '17366629764'/, '小程序固定登录手机号必须明确')
assert.match(config, /enabled: API_BASE_URL === 'http:\/\/localhost:8080'/, '固定登录只能在本地 API 地址启用')
assert.match(app, /setLogin\(\s*DEV_FIXED_LOGIN\.token/, '启动时必须写入固定登录态')
assert.doesNotMatch(app, /Taro\.switchTab/, '应用启动阶段禁止调用 switchTab，避免页面栈未就绪时超时')
assert.match(appConfig, /const useDevFixedStartup = process\.env\.MINIAPP_DEV_FIXED_LOGIN === 'true'/, '仅显式开发开关允许固定登录首页启动')
assert.match(appConfig, /const startPage = useDevFixedStartup \? 'pages\/index\/index' : 'pages\/login\/index'/, '开发构建必须直接以首页作为启动页')
assert.match(appConfig, /pages: \[startPage, \.\.\.MAIN_PAGES\.filter\(\(page\) => page !== startPage\)\]/, '启动页必须置于页面清单首位且不得重复')
assert.match(packageJson, /"dev:weapp": "MINIAPP_DEV_FIXED_LOGIN=true npm run build:weapp -- --watch"/, '微信开发监听必须显式启用固定登录首页')
assert.match(taroConfig, /'process\.env\.MINIAPP_DEV_FIXED_LOGIN': JSON\.stringify\(\s*process\.env\.MINIAPP_DEV_FIXED_LOGIN \|\| 'false'\s*\)/, 'Taro 编译配置必须注入固定登录首页开关')
assert.match(applicationDev, /enabled: \$\{DEV_FIXED_LOGIN_ENABLED:true\}/, '后端 dev profile 必须启用固定登录')
assert.match(applicationDev, /token: \$\{DEV_FIXED_LOGIN_TOKEN:dev-fixed-token-17366629764\}/, '后端固定 token 必须与小程序一致')
assert.doesNotMatch(read('../backend/src/main/resources/application-prod.yml'), /dev-fixed-login/, '生产配置禁止出现固定登录')

console.log('本地固定登录门禁通过')
