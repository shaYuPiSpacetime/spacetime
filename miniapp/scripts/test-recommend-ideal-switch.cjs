const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

function createSwitcher(recordsLoader) {
  const source = read('src/pages/recommend/index.tsx')
  const loadStart = source.indexOf('  const loadIdealTab =')
  const start = loadStart >= 0 ? loadStart : source.indexOf('  const openIdealTab =')
  const end = source.indexOf('  const handleTabChange =', start)
  assert.ok(start >= 0 && end > start, '应执行真实理想型切换函数')
  const snippet = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText
  const model = { tab: 'recommend', snapshotNo: null, resolved: false, error: '', calls: 0 }
  const activeTabRef = { current: 'recommend' }
  const deps = {
    activeTabRef,
    idealTabSubmitting: { current: false },
    idealTabResolvedRef: { current: false },
    idealTabExpiresAtRef: { current: null },
    idealTabTaskRef: { current: null },
    idealRequestGenerationRef: { current: 0 },
    setActiveTab: value => { model.tab = value },
    setIdealSnapshotNo: value => { model.snapshotNo = value },
    setIdealTabResolved: value => { model.resolved = value },
    setIdealTabError: value => { model.error = value },
    getIdealSearchRecords: async () => { model.calls++; return { items: await recordsLoader() } },
    getRecommendPreferences: async () => ({}),
    isIdealSnapshotForPreference: record => record.status === 'active',
    Taro: { showToast: async () => {} },
  }
  const handlers = Function(...Object.keys(deps), `${snippet}; return { openIdealTab, loadIdealTab: typeof loadIdealTab === 'undefined' ? null : loadIdealTab }`)(...Object.values(deps))
  return { ...handlers, model, leave: () => { activeTabRef.current = 'recommend'; model.tab = 'recommend' } }
}

const activeRecord = () => ({ status: 'active', snapshotNo: 'snapshot-1', expiresAt: new Date(Date.now() + 3600000).toISOString() })

test('推荐与理想型重复往返不重查相同快照', async () => {
  const switcher = createSwitcher(async () => [activeRecord()])
  await switcher.openIdealTab()
  switcher.leave()
  await switcher.openIdealTab()
  assert.equal(switcher.model.calls, 1)
  assert.equal(switcher.model.snapshotNo, 'snapshot-1')
})

test('离开理想型期间完成的请求仍可复用且不会强制切回理想型', async () => {
  let resolve
  let first = true
  const switcher = createSwitcher(() => {
    if (!first) return Promise.resolve([activeRecord()])
    first = false
    return new Promise(done => { resolve = done })
  })
  const pending = switcher.openIdealTab()
  switcher.leave()
  resolve([activeRecord()])
  await pending
  assert.equal(switcher.model.tab, 'recommend')
  await switcher.openIdealTab()
  assert.equal(switcher.model.calls, 1)
  assert.equal(switcher.model.snapshotNo, 'snapshot-1')
})

test('无筛选记录也缓存查询结果，偏好变化后可强制刷新', async () => {
  let records = []
  const switcher = createSwitcher(async () => records)
  await switcher.openIdealTab()
  await switcher.openIdealTab()
  assert.equal(switcher.model.calls, 1)
  assert.equal(switcher.model.resolved, true)
  assert.ok(switcher.loadIdealTab, '必须支持条件变更后的刷新')
  records = [activeRecord()]
  await switcher.loadIdealTab(true)
  assert.equal(switcher.model.calls, 2)
  assert.equal(switcher.model.snapshotNo, 'snapshot-1')
})

test('并发点击复用同一个请求', async () => {
  let resolve
  const switcher = createSwitcher(() => new Promise(done => { resolve = done }))
  const first = switcher.openIdealTab()
  const second = switcher.openIdealTab()
  resolve([activeRecord()])
  await Promise.all([first, second])
  assert.equal(switcher.model.calls, 1)
})

test('条件改变后的新请求不被旧响应覆盖', async () => {
  let resolve
  let first = true
  const switcher = createSwitcher(() => {
    if (!first) return Promise.resolve([{ ...activeRecord(), snapshotNo: 'new-snapshot' }])
    first = false
    return new Promise(done => { resolve = done })
  })
  const old = switcher.openIdealTab()
  await switcher.loadIdealTab(true)
  resolve([activeRecord()])
  await old
  assert.equal(switcher.model.snapshotNo, 'new-snapshot')
})

test('读取失败保留错误态并允许重新加载，不伪装无筛选记录', async () => {
  let fails = true
  const switcher = createSwitcher(async () => {
    if (fails) throw new Error('网络不可用')
    return [activeRecord()]
  })
  await switcher.openIdealTab()
  assert.equal(switcher.model.resolved, false)
  assert.equal(switcher.model.error, '网络不可用')
  fails = false
  await switcher.openIdealTab()
  assert.equal(switcher.model.snapshotNo, 'snapshot-1')
  assert.equal(switcher.model.error, '')
})

test('到期快照不作为有效结果复用', async () => {
  const switcher = createSwitcher(async () => [{ ...activeRecord(), expiresAt: new Date(Date.now() - 1000).toISOString() }])
  await switcher.openIdealTab()
  assert.equal(switcher.model.snapshotNo, null)
})

test('切换时保留内容面板，加载未知结果不能先显示引导页', () => {
  const source = read('src/pages/recommend/index.tsx')
  assert.match(source, /id="recommend-content-panel"/, '推荐内容必须常驻')
  assert.match(source, /id="ideal-content-panel"/, '理想型内容必须常驻')
  assert.doesNotMatch(source, /if \(activeTab === 'ideal' && idealSnapshotNo\)/, '禁止切换时提前返回另一棵页面树')
  assert.match(source, /resolvingSnapshot=\{!idealTabResolved\}/, '必须明确区分未加载和无筛选记录')
  assert.match(read('src/pages/prd08/ideal/filter/index.tsx'), /setStorageSync\('idealResultsRefreshRequired', true\)/, '新筛选必须使旧缓存失效')
})
