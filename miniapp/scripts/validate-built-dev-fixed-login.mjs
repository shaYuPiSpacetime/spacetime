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

console.log(`固定登录产物门禁通过：${fixedLoginEnabled ? '千寻首页 + 开发 Token' : '登录首页 + 无开发 Token'}`)
