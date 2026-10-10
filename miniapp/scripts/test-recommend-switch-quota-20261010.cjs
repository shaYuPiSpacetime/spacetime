const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const domain = () => import('data:text/javascript;base64,' + Buffer.from(read('src/domain/recommendBadge.js')).toString('base64'))
const page = (count, changes = {}) => ({ items: Array.from({length: count}, (_, i) => ({candidateNo: String(i)})), remainingBrowseCount: count, nextResetAt: '2026-10-11 12:00:00', preferenceVersion: 1, ...changes })

test('U-01: 等待只改变内容状态，理想型点击不触发主路由导航', () => {
  const source = read('src/pages/recommend/index.tsx')
  const start = source.indexOf('  const openWaitingPage =')
  const snippet = ts.transpileModule(source.slice(start, source.indexOf('  const loadCandidates =', start)), {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText
  let state
  const open = Function('setState', snippet + '; return openWaitingPage')(value => { state = value })
  open()
  assert.equal(state, 'limit')
  assert.ok(source.includes('<RecommendWaitingContent'))
  assert.ok(!source.includes("'/pages/prd08/recommend/waiting/index'"))
  const content = read('src/components/RecommendWaitingContent/index.tsx')
  assert.ok(content.includes('onClick={openIdeal}'))
  assert.ok(!content.includes('AppTabBar'))
})

test('U-02: 同周期切 Tab 刷新不能加回已扣人数，新周期与偏好变化可重算', async () => {
  const {createRecommendBadgeRuntime} = await domain()
  let result = page(20)
  const runtime = createRecommendBadgeRuntime({fetchPage:async () => result, now:() => 100000})
  runtime.publishPage(50, page(17))
  await runtime.refresh(50, true)
  assert.equal(runtime.getSnapshot().count, 17)
  runtime.publishPage(50, page(16))
  await runtime.refresh(50, true)
  assert.equal(runtime.getSnapshot().count, 16)
  result = page(20, {nextResetAt:'2026-10-12 12:00:00'})
  await runtime.refresh(50, true)
  assert.equal(runtime.getSnapshot().count, 20)
  result = page(18, {nextResetAt:'2026-10-12 12:00:00',preferenceVersion:2})
  await runtime.refresh(50, true)
  assert.equal(runtime.getSnapshot().count, 18)
})

test('U-03: 收集分页过程中额度变化拒绝旧额度混合结果', async () => {
  const {collectRecommendCandidatePages} = await domain()
  await assert.rejects(collectRecommendCandidatePages(async cursor => cursor ? page(1, {remainingBrowseCount:1}) : page(1, {remainingBrowseCount:2,nextCursor:'next'})), /条件已变化/)
})

function viewHarness() {
  const source = read('src/pages/recommend/index.tsx')
  const start = source.indexOf('  const ensureCandidateView =')
  const snippet = ts.transpileModule(source.slice(start, source.indexOf('  useEffect(', start)), {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText
  let tick
  const model = {calls:0,updates:0}
  const deps = {
    currentViewTaskRef:{current:null}, viewedCandidates:{current:new Set()}, browseCycleRef:{current:'cycle'}, candidateRequestGenerationRef:{current:1},
    pageVisibleRef:{current:true}, activeTabRef:{current:'recommend'}, createRequestId:() => 'request',
    Taro:{nextTick:callback => {tick = callback}}, recordRecommendView:async () => {model.calls++},
    setPage:() => {model.updates++}, applyRecommendViewToPage:() => {},
  }
  const view = Function(...Object.keys(deps), snippet + '; return ensureCandidateView')(...Object.values(deps))
  return {view, model, deps, tick:() => tick()}
}

test('U-04: 切理想型或隐藏发生在 nextTick 前时不写曝光且可重新浏览', async () => {
  for (const hidden of ['tab','page','generation']) {
    const h = viewHarness()
    const candidate = {candidateNo:'1'}
    const pending = h.view(candidate,1)
    if (hidden === 'tab') h.deps.activeTabRef.current = 'ideal'
    if (hidden === 'page') h.deps.pageVisibleRef.current = false
    if (hidden === 'generation') h.deps.candidateRequestGenerationRef.current++
    h.tick()
    assert.equal(await pending, false)
    assert.equal(h.model.calls,0)
    assert.equal(h.model.updates,0)
    h.deps.activeTabRef.current = 'recommend'
    h.deps.pageVisibleRef.current = true
    const retry = h.view(candidate,1)
    h.tick()
    assert.equal(await retry,true)
    assert.equal(h.model.calls,1)
    assert.equal(await h.view(candidate,1),true)
    assert.equal(h.model.calls,1)
  }
})
