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
assert.match(verificationShell, /if \(res\.confirm\) void enterHome\(\)/, '认证流程返回首页必须直接切换首页')
assert.match(verificationBasic, /if \(res\.confirm\) void enterHome\(\)/, '基本资料认证页返回首页必须直接切换首页')
assert.doesNotMatch(verificationShell, /if \(res\.confirm\) submit\(\)/, '认证流程返回首页禁止重复提交首登资料')
assert.doesNotMatch(verificationBasic, /if \(res\.confirm\) submit\(\)/, '基本资料认证页返回首页禁止重复提交首登资料')

console.log('认证流程进入首页幂等门禁通过')
