const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('资料刷新保留理想型未保存草稿，只移除已不可用条件', async () => {
  const file = 'src/domain/idealFilterDraft.js'
  assert.ok(fs.existsSync(path.join(root, file)), '缺少理想型草稿合并逻辑')
  const { mergeIdealFilterDraft } = await import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`)
  const meta = { preferenceVersion: 2, targetCities: [{ code: '310100' }], minAge: 20, maxAge: 35,
    lastConditionCodes: ['old'], conditions: [{ code: 'love', available: true }, { code: 'old', available: false }] }
  const draft = { preferenceVersion: 2, targetCities: [{ code: '320100' }], minAge: 24, maxAge: 30, selectedConditionCodes: ['love', 'old'] }
  const updated = mergeIdealFilterDraft(draft, meta)
  assert.deepEqual(updated.targetCities, draft.targetCities)
  assert.equal(updated.minAge, 24)
  assert.deepEqual(updated.selectedConditionCodes, ['love'])
  const changed = mergeIdealFilterDraft(draft, { ...meta, preferenceVersion: 3 })
  assert.deepEqual(changed.targetCities, meta.targetCities)
  assert.equal(changed.minAge, 20)
  assert.deepEqual(changed.selectedConditionCodes, ['love'])
})

test('推荐切理想型只切内容，底部入口保持单图标共享组件', () => {
  const source = read('src/pages/recommend/index.tsx')
  const openIdeal = source.slice(source.indexOf('const openIdealTab'), source.indexOf('const handleTabChange'))
  assert.doesNotMatch(openIdeal, /Taro\.navigateTo/, '切换理想型不能跳离推荐页替换底部导航')
  assert.match(source, /<IdealResultsContent/, '有结果时应内嵌内容而不是重挂导航')
  const bar = read('src/components/AppTabBar/index.tsx')
  assert.doesNotMatch(bar, /opacity: isOn \?/, '每项只渲染一个图标，不叠两张透明图')
  assert.match(bar, /src=\{isOn \? tab\.activeIconPath : tab\.iconPath\}/)
})

test('修改共享城市或年龄后不恢复旧理想型结果', async () => {
  const file = 'src/domain/idealFilterDraft.js'
  const { isIdealSnapshotForPreference } = await import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`)
  assert.equal(typeof isIdealSnapshotForPreference, 'function', '缺少快照与当前条件一致性判断')
  const preference = { minAge: 24, maxAge: 30, targetCities: [{ code: '310100' }] }
  const record = { status: 'active', summary: { ...preference } }
  assert.equal(isIdealSnapshotForPreference(record, preference), true)
  assert.equal(isIdealSnapshotForPreference({ ...record, summary: { ...record.summary, minAge: 18 } }, preference), false)
  assert.equal(isIdealSnapshotForPreference({ ...record, summary: { ...record.summary, targetCities: [{ code: '320100' }] } }, preference), false)
  assert.equal(isIdealSnapshotForPreference({ ...record, status: 'expired' }, preference), false)
})

test('理想型返回刷新依赖资料且共享基础条件保存后通知推荐', () => {
  const source = read('src/pages/prd08/ideal/filter/index.tsx')
  assert.match(source, /useDidShow\(/, '返回必须刷新标签能力')
  assert.match(source, /mergeIdealFilterDraft\(/, '刷新不能丢失草稿')
  assert.match(source, /if \(!condition\.available\) continue/, '未填对应资料时不展示不可用条件')
  assert.match(source, /setStorageSync\(RECOMMEND_PREFERENCE_REFRESH_STORAGE_KEY, true\)/)
})

test('城市可替换且高级条件可清空，保存前拒绝空城市草稿', () => {
  const source = read('src/pages/prd08/recommend/preference/index.tsx')
  assert.doesNotMatch(source, /removable=\{index > 0\}/, '默认城市也要能替换')
  assert.ok(source.includes('请至少选择一个城市'), '空城市不能提交')
  assert.ok(/onReset=\{\(\) => patchAdvanced\(\{ minHeight: null, maxHeight: null/.test(source), '身高要能恢复不限')
  assert.ok(/onReset=\{\(\) => patchAdvanced\(\{ minWeight: null, maxWeight: null/.test(source), '体重要能恢复不限')
  assert.ok(source.includes('patchAdvanced({ hometowns: [] })'), '家乡要能恢复不限')
})

test('进入标签编辑时刷新后台字典，不沿用新增爱情标签前的缓存', () => {
  assert.ok(/await bootstrap\(true\)/.test(read('src/pages/profile-edit/tags.tsx')), '标签编辑必须读取当前后台选项')
})
