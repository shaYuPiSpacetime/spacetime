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

const forbiddenAvatarUrl = 'https://img.zcool.cn/community/01460b5e0f0e64a80121985c3f3e1e.png'

const demoData = read('miniapp/src/data/lanhuDemo.json')
const avatarUtils = read('miniapp/src/utils/avatar.ts')
const loginHook = read('miniapp/src/hooks/useLogin.ts')
const loginPage = read('miniapp/src/pages/login/index.tsx')
const phoneLoginPage = read('miniapp/src/pages/login/phone.tsx')
const profilePage = read('miniapp/src/pages/profile/index.tsx')

assert.ok(!demoData.includes(forbiddenAvatarUrl), '蓝湖 demo 数据不得继续引用会 403 的 zcool 热链头像')
assert.ok(avatarUtils.includes('normalizeAvatarUrl'), '头像工具必须提供 normalizeAvatarUrl 兜底函数')
assert.ok(avatarUtils.includes('img.zcool.cn'), '头像工具必须识别已知会 403 的 zcool 热链域名')
assert.ok(loginHook.includes('normalizeAvatarUrl'), '首登资料提交前必须归一化默认头像')
assert.ok(loginPage.includes('normalizeAvatarUrl'), '微信手机号登录写入 authStore 前必须归一化头像')
assert.ok(phoneLoginPage.includes('normalizeAvatarUrl'), '手机号模拟登录写入登录流程前必须归一化头像')
assert.ok(profilePage.includes('normalizeAvatarUrl'), '个人页渲染旧登录态头像前必须归一化头像')

console.log('头像兜底门禁通过')
