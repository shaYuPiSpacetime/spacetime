/* eslint-env node */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')
const importDomain = async relativePath => import(
  `data:text/javascript;base64,${Buffer.from(read(relativePath)).toString('base64')}`
)

test('推荐浏览成功后本地剩余额度减一，重复或无效页不误扣', async () => {
  const { applyRecommendViewToPage } = await importDomain('src/domain/recommendBadge.js')
  const page = { items: [{ candidateNo: 'U-1' }], remainingBrowseCount: 3 }
  assert.equal(applyRecommendViewToPage(page, 'U-1').remainingBrowseCount, 2)
  assert.equal(applyRecommendViewToPage(page, 'U-2').remainingBrowseCount, 3)
  assert.equal(applyRecommendViewToPage({ ...page, remainingBrowseCount: 0 }, 'U-1').remainingBrowseCount, 0)
  assert.equal(applyRecommendViewToPage({ ...page, remainingBrowseCount: null }, 'U-1').remainingBrowseCount, null)
  assert.equal(applyRecommendViewToPage(null, 'U-1'), null)

  const recommend = read('src/pages/recommend/index.tsx')
  assert.match(recommend, /recordRecommendView\([\s\S]*?\.then\(\(\) => \{[\s\S]*?applyRecommendViewToPage\(/)
})

test('推荐候选耗尽后，本轮再次进入直达等待页，跨中午重置后正常刷新', async () => {
  const { shouldShowRecommendWaiting, hasRecommendCycleExpired } = await importDomain('src/domain/recommendBrowseCycle.js')
  const cycle = '2026-10-01T12:00:00'
  assert.equal(shouldShowRecommendWaiting({ items: [], waitingReason: 'browse_limit', nextResetAt: cycle }), true)
  assert.equal(shouldShowRecommendWaiting({ items: [], waitingReason: 'no_candidate', nextResetAt: cycle }, cycle), true)
  assert.equal(shouldShowRecommendWaiting({ items: [], waitingReason: null, nextResetAt: cycle }, cycle), true)
  assert.equal(shouldShowRecommendWaiting({ items: [], waitingReason: 'no_candidate', nextResetAt: cycle }, '2026-09-30T12:00:00'), false)
  assert.equal(shouldShowRecommendWaiting({ items: [{ candidateNo: 'U-1' }], nextResetAt: cycle }, cycle), false)
  assert.equal(shouldShowRecommendWaiting({ items: [], nextCursor: 'next', nextResetAt: cycle }, cycle), false)
  assert.equal(hasRecommendCycleExpired(cycle, Date.parse('2026-10-01T04:00:00Z')), true)

  const recommend = read('src/pages/recommend/index.tsx')
  const waiting = read('src/pages/prd08/recommend/waiting/index.tsx')
  assert.match(recommend, /useDidShow\([\s\S]*?shouldShowRecommendWaiting\(/)
  assert.doesNotMatch(recommend, /<RecommendLimit\b/)
  assert.match(waiting, /shouldShowRecommendWaiting\(/)
  assert.match(waiting, /<AppTabBar active="recommend" recommendBadgeCount=\{0\}/)
})

test('非会员可添加第三个目标城市，高级筛选灰化且滑动不误开会员页', () => {
  const preference = read('src/pages/prd08/recommend/preference/index.tsx')
  assert.doesNotMatch(preference, /!model\.vipEffective\s*&&\s*model\.targetCities\.length\s*>=\s*2/)
  assert.match(preference, /useDidShow\(/, '从会员页返回必须刷新权益')
  assert.match(preference, /onTouchMove=\{markAdvancedGestureMove\}/)
  assert.match(preference, /opacity:\s*model\.advancedFilterEffective\s*\?\s*1\s*:\s*0\.45/)
})

test('非会员仅模糊历史日期头像，会员及今天保持清晰', async () => {
  const { shouldBlurReplayAvatar } = await importDomain('src/domain/recommendReplay.js')
  assert.equal(shouldBlurReplayAvatar('2026-09-29', '2026-09-30', false), true)
  assert.equal(shouldBlurReplayAvatar('2026-09-30', '2026-09-30', false), false)
  assert.equal(shouldBlurReplayAvatar('2026-09-29', '2026-09-30', true), false)
  const replay = read('src/pages/prd08/recommend/replay/index.tsx')
  assert.match(replay, /shouldBlurReplayAvatar\(/)
  assert.match(replay, /filter: blurAvatar \? 'blur\(/)
})
