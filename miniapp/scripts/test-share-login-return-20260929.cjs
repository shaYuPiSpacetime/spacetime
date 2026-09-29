const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')

test('登录前保存的动态和用户主页分享目标只能是受支持的安全路径', async () => {
  const domainPath = path.join(root, 'src/domain/pendingShareRoute.js')
  assert.ok(fs.existsSync(domainPath), '缺少分享目标路径规则')
  const source = fs.readFileSync(domainPath, 'utf8')
  const { resolvePendingShareRoute } = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  )

  assert.equal(resolvePendingShareRoute('pages/qianxun/post-detail', { id: '12' }), '/pages/qianxun/post-detail?id=12')
  assert.equal(resolvePendingShareRoute('/pages/heart/user?targetUserId=34'), '/pages/heart/user?targetUserId=34')
  assert.equal(resolvePendingShareRoute('pages/heart/user', { userId: '35' }), '/pages/heart/user?targetUserId=35')
  assert.equal(resolvePendingShareRoute('pages/settings/index', { id: '12' }), null)
  assert.equal(resolvePendingShareRoute('pages/qianxun/post-detail', { id: '-1' }), null)
  assert.equal(resolvePendingShareRoute('pages/qianxun/post-detail?id=12&redirect=https://example.com'), '/pages/qianxun/post-detail?id=12')

  const app = fs.readFileSync(path.join(root, 'src/app.tsx'), 'utf8')
  const login = fs.readFileSync(path.join(root, 'src/hooks/useLogin.ts'), 'utf8')
  assert.match(app, /PENDING_SHARE_ROUTE_KEY/, '未登录重定向前必须保存分享目标')
  assert.match(login, /navigateAfterAuthentication/, '登录完成必须恢复分享目标')
})
