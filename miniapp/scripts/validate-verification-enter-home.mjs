import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8')

const loginHook = read('src/hooks/useLogin.ts')
const verificationShell = read('src/pages/verification/components/VerificationShell.tsx')
const verificationBasic = read('src/pages/verification/basic.tsx')

assert.match(loginHook, /const enterHome = async/, '登录流程必须提供独立首页入口')
assert.match(loginHook, /await Taro\.switchTab\(\{ url: '\/pages\/index\/index' \}\)/, '首页入口必须切换到首页 Tab')
assert.match(verificationShell, /Taro\.redirectTo\(\{ url: '\/pages\/index\/index' \}\)/, '认证流程无页面栈时必须直接回首页')
assert.match(verificationBasic, /navigateBackOrRedirect\('\/pages\/index\/index'\)/, '基本资料认证页返回必须回到可刷新的未认证页')
assert.doesNotMatch(verificationShell, /showModal|res\.confirm/, '认证流程返回禁止保留旧确认弹窗')
assert.doesNotMatch(verificationBasic, /showModal|res\.confirm/, '基本资料认证页返回禁止保留旧确认弹窗')

console.log('认证流程进入首页幂等门禁通过')
