const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')

test('没有可浏览候选时推荐角标必须清零，仍有候选时显示剩余额度', async () => {
  const domainPath = path.join(root, 'src/domain/recommendBadge.js')
  assert.ok(fs.existsSync(domainPath), '缺少推荐角标的统一计算规则')
  const source = fs.readFileSync(domainPath, 'utf8')
  const { resolveRecommendBadgeCount } = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  )

  assert.equal(resolveRecommendBadgeCount({ remainingBrowseCount: 10, items: [] }), 0)
  assert.equal(resolveRecommendBadgeCount({ remainingBrowseCount: 9, items: [{}] }), 9)
  assert.equal(resolveRecommendBadgeCount({ remainingBrowseCount: 0, items: [{}] }), 0)
  assert.equal(resolveRecommendBadgeCount(null), 0)

  const tabBar = fs.readFileSync(path.join(root, 'src/components/AppTabBar/index.tsx'), 'utf8')
  assert.match(tabBar, /resolveRecommendBadgeCount\(page\)/, 'TabBar 不能只按额度显示角标')
})
