const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const Module = require('node:module')
const ts = require('typescript')

// Run the real component's event handlers; only hooks and native rendering/I/O are hosted here.
const sourcePath = path.resolve(__dirname, '../src/pages/verification/components/LanhuPickerSheet.tsx')
let cells = [], cursor = 0, toasts = [], confirmations = []
let pendingEffects = [], stateVersion = 0
const hooks = {
  useState(initial) {
    const index = cursor++
    if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial
    return [cells[index], value => {
      const next = typeof value === 'function' ? value(cells[index]) : value
      if (!Object.is(next, cells[index])) { cells[index] = next; stateVersion++ }
    }]
  },
  useRef(initial) {
    const index = cursor++
    if (!(index in cells)) cells[index] = { current: initial }
    return cells[index]
  },
  useEffect(effect, deps) {
    const index = cursor++
    const previous = cells[index]
    if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) {
      pendingEffects.push(() => {
        previous?.cleanup?.()
        cells[index] = { deps, cleanup: effect() }
      })
    }
  },
}
const jsx = (type, props) => ({ type, props: props || {} })
const originalLoad = Module._load
Module._load = function(name, parent, main) {
  if (name === 'react') return hooks
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
  if (name === '@tarojs/components') return { ScrollView: 'ScrollView', PickerView: 'PickerView', PickerViewColumn: 'PickerViewColumn', Text: 'Text', View: 'View' }
  if (name === '@tarojs/taro') return { __esModule: true, default: { showToast: item => { toasts.push(item.title); return Promise.resolve() } } }
  if (name === '@/utils/system') return { getWindowMetrics: () => ({ windowWidth: 375 }) }
  if (name === './VerificationShell') return { BottomPicker: 'BottomPicker' }
  return originalLoad.call(this, name, parent, main)
}
const compiled = new Module(sourcePath, module)
compiled.filename = sourcePath
compiled.paths = Module._nodeModulePaths(path.dirname(sourcePath))
try {
  compiled._compile(ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: sourcePath,
  }).outputText, sourcePath)
} finally { Module._load = originalLoad }

const regions = [
  { code: '110000', name: '北京市', children: [{ code: '110100', name: '北京市' }] },
  { code: '120000', name: '天津市', children: [{ code: '120100', name: '天津市' }] },
  { code: '310000', name: '上海市', children: [{ code: '310100', name: '上海市' }] },
]
function mount(overrides = {}) {
  cells = []; toasts = []; confirmations = []
  const props = {
    title: '现居地', regions, provinceCode: '310100', cityCode: '310100', districtCode: '', includeDistrict: false,
    loadDistricts: () => { throw new Error('two-level picker must not load districts') },
    onConfirm: (...codes) => confirmations.push(codes), onClose() {}, ...overrides,
  }
  return () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      cursor = 0; pendingEffects = []
      const version = stateVersion
      const tree = compiled.exports.LanhuRegionSheet(props)
      pendingEffects.forEach(effect => effect())
      if (stateVersion === version) return tree
    }
    throw new Error('component effects failed to stabilize')
  }
}
afterEach(() => cells.forEach(cell => cell?.cleanup?.()))
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return [tree, ...nodes(tree.props?.children)]
}
const wheels = tree => nodes(tree).filter(node => node.type === 'PickerViewColumn')
const options = wheel => nodes(wheel).filter(node => node.type === 'View' && node.props.onClick)

const westernRegions = [
  { code: '610000', name: '陕西省', children: [
    { code: '610100', name: '西安市' }, { code: '610300', name: '宝鸡市' },
  ] },
  { code: '620000', name: '甘肃省', children: [
    { code: '620100', name: '兰州市' }, { code: '620200', name: '嘉峪关市' },
  ] },
  { code: '630000', name: '青海省', children: [{ code: '630100', name: '西宁市' }] },
]
function nativePicker(tree) {
  const pickers = nodes(tree).filter(node => node.type === 'PickerView')
  assert.equal(pickers.length, 1, '省市必须使用同一个原生滚轮，避免两列位置与状态分离')
  return pickers[0]
}

test('家乡陕西切甘肃时丢弃旧城市索引并确认甘肃兰州', () => {
  const render = mount({ title: '家乡偏好', regions: westernRegions, provinceCode: '610000', cityCode: '610300' })
  const picker = nativePicker(render())
  assert.deepEqual(picker.props.value, [0, 1])
  picker.props.onPickStart()
  picker.props.onChange({ detail: { value: [1, 1] } })
  picker.props.onPickEnd()
  assert.deepEqual(nativePicker(render()).props.value, [1, 0])
  render().props.onConfirm()
  assert.deepEqual(confirmations, [['620000', '620100', '']])
})

test('快速跨省和城市事件使用最新选择，即使 React 尚未重新渲染', () => {
  const render = mount({ regions: westernRegions, provinceCode: '610000', cityCode: '610100' })
  const picker = nativePicker(render())
  picker.props.onPickStart()
  picker.props.onChange({ detail: { value: [1, 1] } })
  picker.props.onChange({ detail: { value: [1, 1] } })
  picker.props.onPickEnd()
  render().props.onConfirm()
  assert.deepEqual(confirmations, [['620000', '620200', '']])
  const next = nativePicker(render())
  next.props.onPickStart()
  next.props.onChange({ detail: { value: [2, 99] } })
  next.props.onPickEnd()
  render().props.onConfirm()
  assert.deepEqual(confirmations.at(-1), ['630000', '630100', ''])
})

test('原生滚轮未停止时禁止确认，停止后使用新选择', () => {
  const render = mount({ regions: westernRegions, provinceCode: '610000', cityCode: '610100' })
  const picker = nativePicker(render())
  picker.props.onPickStart()
  render().props.onConfirm()
  assert.deepEqual(confirmations, [])
  assert.equal(toasts.at(-1), '请等待地区滚动结束')
  picker.props.onChange({ detail: { value: [1, 0] } })
  picker.props.onPickEnd()
  render().props.onConfirm()
  assert.deepEqual(confirmations, [['620000', '620100', '']])
})

test('程序初始化的 change 事件不能修改地区或恢复失效编码', () => {
  const render = mount({ regions: westernRegions, provinceCode: 'obsolete', cityCode: 'obsolete' })
  nativePicker(render()).props.onChange({ detail: { value: [1, 1] } })
  render().props.onConfirm()
  assert.deepEqual(confirmations, [])
  assert.equal(toasts.at(-1), '地区选项已更新，请重新选择省市')
})

test('只触摸而未改变原生滚轮选项不能授权失效历史编码', () => {
  const render = mount({ provinceCode: 'obsolete', cityCode: 'obsolete' })
  const picker = nativePicker(render())
  picker.props.onPickStart()
  picker.props.onChange({ detail: { value: [0, 0] } })
  picker.props.onPickEnd()
  render().props.onConfirm()
  assert.deepEqual(confirmations, [])
  assert.equal(toasts.at(-1), '地区选项已更新，请重新选择省市')
})

test('invalid legacy province is recovered only from its uniquely owned city', () => {
  const render = mount()
  render().props.onConfirm()
  assert.deepEqual(confirmations, [['310000', '310100', '']])
  assert.deepEqual(toasts, [])
})
test('scrolling to a single-city municipality can confirm without extra city click', () => {
  const render = mount()
  const picker = nativePicker(render())
  picker.props.onPickStart()
  picker.props.onChange({ detail: { value: [1, 0] } })
  picker.props.onPickEnd()
  render().props.onConfirm()
  assert.deepEqual(confirmations, [['120000', '120100', '']])
})
test('clicking province explicitly replaces stale city with its valid default', () => {
  const render = mount({ provinceCode: '110000', cityCode: 'obsolete' })
  options(wheels(render())[0])[1].props.onClick()
  render().props.onConfirm()
  assert.deepEqual(confirmations, [['120000', '120100', '']])
})
test('unrecoverable legacy codes cannot silently save default Beijing', () => {
  const render = mount({ provinceCode: 'obsolete', cityCode: '' })
  render().props.onConfirm()
  assert.deepEqual(confirmations, [])
  assert.equal(toasts.at(-1), '地区选项已更新，请重新选择省市')
})
test('programmatic initial scroll to same row does not authorize an unknown selection', () => {
  const render = mount({ provinceCode: 'obsolete', cityCode: 'obsolete' })
  nativePicker(render()).props.onChange({ detail: { value: [0, 0] } })
  render().props.onConfirm()
  assert.deepEqual(confirmations, [])
})
test('programmatic province scroll is not an explicit recovery choice', () => {
  const render = mount({ provinceCode: 'obsolete', cityCode: 'obsolete' })
  nativePicker(render()).props.onChange({ detail: { value: [1, 0] } })
  render().props.onConfirm()
  assert.deepEqual(confirmations, [])
})
test('valid existing selection and empty new form remain confirmable', () => {
  let render = mount({ provinceCode: '310000' })
  render().props.onConfirm()
  assert.deepEqual(confirmations, [['310000', '310100', '']])
  render = mount({ provinceCode: '', cityCode: '' })
  render().props.onConfirm()
  assert.deepEqual(confirmations, [['110000', '110100', '']])
})
test('explicit same-province or city click allows recovery', () => {
  let render = mount({ provinceCode: '110000', cityCode: 'obsolete' })
  options(wheels(render())[0])[0].props.onClick()
  render().props.onConfirm()
  assert.deepEqual(confirmations, [['110000', '110100', '']])
  render = mount({ provinceCode: '110000', cityCode: 'obsolete' })
  options(wheels(render())[1])[0].props.onClick()
  render().props.onConfirm()
  assert.deepEqual(confirmations, [['110000', '110100', '']])
})
test('empty region tree or city column does not confirm', () => {
  for (const tree of [[], [{ code: '110000', name: '北京市', children: [] }]]) {
    const render = mount({ regions: tree, provinceCode: '', cityCode: '' })
    render().props.onConfirm()
    assert.deepEqual(confirmations, [])
  }
})
test('an ambiguous city cannot recover an unknown province', () => {
  const render = mount({ regions: [...regions, { code: 'duplicate', name: '歧义省', children: regions[2].children }] })
  render().props.onConfirm()
  assert.deepEqual(confirmations, [])
})
test('three-level picker blocks loading/failure and keeps district on repeated current selection', async () => {
  let resolve, reject
  const render = mount({ provinceCode: '310000', includeDistrict: true,
    districtCode: '310104', loadDistricts: () => new Promise((yes, no) => { resolve = yes; reject = no }) })
  render().props.onConfirm()
  assert.deepEqual(confirmations, [])
  assert.equal(toasts.at(-1), '区县加载中，请稍候')
  resolve([{ code: '310104', name: '徐汇区' }])
  await Promise.resolve(); await Promise.resolve()
  render().props.onConfirm()
  assert.deepEqual(confirmations.at(-1), ['310000', '310100', '310104'])
  options(wheels(render())[1])[0].props.onClick()
  render().props.onConfirm()
  assert.deepEqual(confirmations.at(-1), ['310000', '310100', '310104'])
  options(wheels(render())[0])[2].props.onClick()
  render().props.onConfirm()
  assert.deepEqual(confirmations.at(-1), ['310000', '310100', '310104'])
  options(wheels(render())[0])[1].props.onClick()
  render().props.onConfirm()
  assert.equal(toasts.at(-1), '区县加载中，请稍候')
  reject(new Error('fixture network error'))
  await Promise.resolve(); await Promise.resolve()
  render().props.onConfirm()
  assert.equal(toasts.at(-1), '区县加载失败，请重新选择城市')
})
test('old district response cannot overwrite a newly selected city', async () => {
  const pending = new Map()
  const render = mount({ provinceCode: '310000', includeDistrict: true,
    loadDistricts: code => new Promise(resolve => pending.set(code, resolve)) })
  render()
  options(wheels(render())[0])[1].props.onClick()
  render()
  pending.get('120100')([{ code: '120101', name: '和平区' }])
  await Promise.resolve(); await Promise.resolve()
  render().props.onConfirm()
  assert.deepEqual(confirmations.at(-1), ['120000', '120100', '120101'])
  pending.get('310100')([{ code: '310104', name: '徐汇区' }])
  await Promise.resolve(); await Promise.resolve()
  render().props.onConfirm()
  assert.deepEqual(confirmations.at(-1), ['120000', '120100', '120101'])
})
test('scrolling the city wheel starts district loading and rejects the old city response', async () => {
  const pending = new Map()
  const render = mount({ regions: [{ code: '330000', name: '浙江省', children: [
    { code: '330100', name: '杭州市' }, { code: '330200', name: '宁波市' },
  ] }], provinceCode: '330000', cityCode: '330100', includeDistrict: true,
    loadDistricts: code => new Promise(resolve => pending.set(code, resolve)) })
  render()
  const picker = nativePicker(render())
  picker.props.onPickStart()
  picker.props.onChange({ detail: { value: [0, 1, 0] } })
  picker.props.onPickEnd()
  render().props.onConfirm()
  assert.deepEqual(confirmations, [])
  assert.equal(toasts.at(-1), '区县加载中，请稍候')
  pending.get('330200')([{ code: '330203', name: '海曙区' }])
  pending.get('330100')([{ code: '330106', name: '西湖区' }])
  await Promise.resolve(); await Promise.resolve()
  render().props.onConfirm()
  assert.deepEqual(confirmations, [['330000', '330200', '330203']])
})
