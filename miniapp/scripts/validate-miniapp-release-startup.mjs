/* eslint-env node */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

function read(relativePath) {
  const fullPath = path.join(rootDir, relativePath)
  assert.ok(fs.existsSync(fullPath), `文件不存在: ${relativePath}`)
  return fs.readFileSync(fullPath, 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath))
}

const loginPage = read('src/pages/login/index.tsx')
const configTs = read('src/constants/config.ts')
const appConfig = read('src/app.config.ts')

assert.ok(
  appConfig.includes("'pages/login/index'") &&
    appConfig.indexOf("'pages/login/index'") < appConfig.indexOf("'pages/login/address'"),
  '体验版启动页必须是 pages/login/index'
)
assert.ok(
  configTs.includes("API_BASE_URL = 'https://admin.shikongxiehou.com/api'") ||
    configTs.includes("API_BASE_URL = 'http://localhost:8080'"),
  '体验版发布包默认接口域名必须是生产域名（或本地开发域名 localhost:8080）'
)
assert.ok(
  !loginPage.includes("login-bg.webp") && !loginPage.includes("login-bg.jpg"),
  '登录首屏不能继续使用包含按钮的整页截图作为背景，按钮必须由组件真实绘制'
)
assert.ok(
  loginPage.includes("login-scene-bg.jpg"),
  '登录首屏必须使用不含按钮/表单/可点击控件的场景背景图'
)
assert.ok(
  exists('src/assets/login/login-scene-bg.jpg'),
  '缺少登录首屏场景背景资产 src/assets/login/login-scene-bg.jpg'
)
assert.ok(
  loginPage.includes('miniappOssMedia.loginBackgroundVideo') &&
    loginPage.includes('<Video') &&
    loginPage.includes('autoplay') &&
    loginPage.includes('loop') &&
    loginPage.includes('muted') &&
    loginPage.includes('controls={false}') &&
    loginPage.includes('onError={() => setVideoUnavailable(true)}'),
  '登录首屏必须使用远程静音循环视频，并在加载失败时回退静态场景图'
)
assert.ok(
  !fs.readdirSync(path.join(rootDir, 'src'), { recursive: true })
    .some(file => String(file).toLowerCase().endsWith('.mp4')),
  '登录背景 MP4 禁止进入小程序主包'
)
assert.ok(
  loginPage.includes("className=\"relative w-full h-screen overflow-hidden\"") &&
    loginPage.includes("width: '100%'") &&
    (loginPage.includes("height: '100%'") || loginPage.includes("height: 'calc(100% - 88rpx)'")),
  '登录首屏背景必须按视口 100% 铺满，避免高屏设备底部露白'
)
assert.ok(
  !loginPage.includes("data-role=\"login-primary-hit-area\"") && !loginPage.includes('opacity: 0'),
  '登录首屏禁止透明点击热区，所有按钮必须真实可见并由组件承载点击事件'
)
assert.ok(
  loginPage.includes("background: '#FFFFFF'") &&
    loginPage.includes("boxShadow: '0 18rpx 42rpx rgba(11, 48, 96, 0.16)'") &&
    loginPage.includes('onClick={handleUse}'),
  '登录首屏“立即使用”必须是真实白底按钮组件，并绑定点击事件'
)

console.log('小程序体验版启动页门禁通过')
