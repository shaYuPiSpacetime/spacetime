/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const addressPath = path.resolve(__dirname, '../src/pages/login/address.tsx')
const matcherPath = path.resolve(__dirname, '../src/domain/locationRegion.ts')
const servicePath = path.resolve(__dirname, '../src/services/prd01.ts')

function loadRegionMatcher() {
  const source = fs.readFileSync(matcherPath, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    fileName: matcherPath,
  }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', compiled)(module, module.exports)
  return module.exports.matchLocationRegion
}

function loadLocationHandler(dependencies) {
  const source = fs.readFileSync(addressPath, 'utf8')
  const file = ts.createSourceFile(addressPath, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX)
  let handler

  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'handleLocation') {
      handler = node.initializer?.getText(file)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  assert.ok(handler, '地址页缺少定位处理函数')

  const compiled = ts.transpileModule(`return (${handler})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
    fileName: 'handle-location.ts',
  }).outputText
  return new Function(...Object.keys(dependencies), compiled)(...Object.values(dependencies))
}

const regions = [
  { code: '310000', name: '上海市', level: 'PROVINCE', children: [
    { code: '310100', name: '上海市', level: 'CITY', children: [] },
  ] },
  { code: '640000', name: '宁夏回族自治区', level: 'PROVINCE', children: [
    { code: '640100', name: '银川市', level: 'CITY', children: [] },
  ] },
]

test('腾讯地图返回上海省市后自动选中现有字典项', async () => {
  const state = { manual: false, location: true, loading: false, selected: null }
  const reverseCalls = []
  const handleLocation = loadLocationHandler({
    locationLoading: false,
    setLocationLoading: value => { state.loading = value },
    setShowLocationSheet: value => { state.location = value },
    setShowManualSheet: value => { state.manual = value },
    ensureUserLocationAuthorized: async () => true,
    handleLocationFail: () => { throw new Error('有效坐标不应进入定位失败分支') },
    provinces: regions,
    loadProvinceCities: async () => regions,
    setProvinces: () => {},
    prd01Api: {
      reverseGeocode: async coords => {
        reverseCalls.push(coords)
        return { province: '上海市', city: '上海市' }
      },
    },
    matchLocationRegion: loadRegionMatcher(),
    handleManualConfirm: (province, city) => {
      state.selected = [province.code, city.code]
      state.location = false
    },
    Taro: {
      getLocation: async () => ({ latitude: 31.2304, longitude: 121.4737 }),
    },
  })

  await handleLocation()

  assert.equal(state.location, false)
  assert.equal(state.manual, false)
  assert.equal(state.loading, false)
  assert.deepEqual(state.selected, ['310000', '310100'])
  assert.deepEqual(reverseCalls, [{ latitude: 31.2304, longitude: 121.4737 }])
})

test('自治区名称完整匹配，不误删自治或回族字样', () => {
  const match = loadRegionMatcher()(regions, '宁夏回族自治区', '银川市')
  assert.equal(match?.province.code, '640000')
  assert.equal(match?.city.code, '640100')
})

test('地图城市未进入字典时不猜测首个城市', () => {
  assert.equal(loadRegionMatcher()(regions, '宁夏回族自治区', '石嘴山市'), null)
})

test('地图服务失败时仍然打开手选面板', async () => {
  const state = { manual: false, location: true, loading: false, toast: '' }
  const handleLocationFail = message => {
    state.location = false
    state.manual = true
    state.toast = message || '定位失败，请手动选择'
  }
  const handleLocation = loadLocationHandler({
    locationLoading: false,
    setLocationLoading: value => { state.loading = value },
    ensureUserLocationAuthorized: async () => true,
    handleLocationFail,
    provinces: regions,
    prd01Api: { reverseGeocode: async () => { throw new Error('服务端暂不可用') } },
    Taro: { getLocation: async () => ({ latitude: 31.2304, longitude: 121.4737 }) },
  })
  await handleLocation()
  assert.equal(state.manual, true)
  assert.equal(state.location, false)
  assert.equal(state.loading, false)
  assert.match(state.toast, /手动选择/)
})

test('精确经纬度通过请求体发送，不放进 URL 查询参数', () => {
  const source = fs.readFileSync(servicePath, 'utf8')
  assert.match(source, /reverseGeocode:[\s\S]*?post<ReverseGeocodeResult>\(PRD01_API_PATHS\.reverseGeocode, coordinates\)/)
  assert.doesNotMatch(source, /get<ReverseGeocodeResult>\(PRD01_API_PATHS\.reverseGeocode, coordinates\)/)
})
