/* eslint-env node */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')

function loadFunctions(relativePath, names, dependencies = {}) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8')
  const parsed = ts.createSourceFile(relativePath, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX)
  const declarations = names.map(name => {
    const found = parsed.statements.find(statement =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === name
    )
    assert.ok(found, `缺少函数 ${name}`)
    return found.getText(parsed)
  })
  const output = ts.transpileModule(
    `${declarations.join('\n')}\nmodule.exports = { ${names.join(', ')} }`,
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
  ).outputText
  const loaded = { exports: {} }
  Function('module', ...Object.keys(dependencies), output)(
    loaded,
    ...Object.values(dependencies)
  )
  return loaded.exports
}

function loadRegionSheet(showToast) {
  const source = fs.readFileSync(
    path.join(root, 'src/pages/verification/components/LanhuPickerSheet.tsx'),
    'utf8'
  )
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText
  const loaded = { exports: {} }
  const render = (type, props) => ({ type, props })
  const fakeRequire = specifier => {
    if (specifier === 'react/jsx-runtime') return { jsx: render, jsxs: render }
    if (specifier === 'react') {
      return {
        useEffect: () => {},
        useRef: value => ({ current: value }),
        useState: value => [typeof value === 'function' ? value() : value, () => {}],
      }
    }
    if (specifier === '@tarojs/taro') {
      return { __esModule: true, default: { showToast } }
    }
    if (specifier === '@tarojs/components') {
      return { ScrollView: 'ScrollView', Text: 'Text', View: 'View' }
    }
    if (specifier === '@/utils/system') {
      return { getWindowMetrics: () => ({ windowWidth: 375 }) }
    }
    if (specifier === './VerificationShell') {
      return { BottomPicker: 'BottomPicker' }
    }
    throw new Error(`未预期的运行时依赖: ${specifier}`)
  }
  Function('require', 'module', 'exports', output)(fakeRequire, loaded, loaded.exports)
  return loaded.exports.LanhuRegionSheet
}

function findNodes(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => findNodes(child, predicate))
  if (!node || typeof node !== 'object') return []
  const children = node.props?.children
  const nested = (Array.isArray(children) ? children : [children])
    .flatMap(child => findNodes(child, predicate))
  return predicate(node) ? [node, ...nested] : nested
}

const municipalityTree = [{
  code: '500000',
  name: '重庆市',
  level: 'PROVINCE',
  children: [
    { code: '500101', name: '万州区', level: 'CITY', children: [] },
    { code: '500233', name: '忠县', level: 'CITY', children: [] },
  ],
}]

test('历史虚拟市级编码未重新选择时不可默认保存首个区县', () => {
  const toasts = []
  const saved = []
  const LanhuRegionSheet = loadRegionSheet(options => toasts.push(options))
  const sheet = LanhuRegionSheet({
    title: '现居地',
    regions: municipalityTree,
    provinceCode: '500000',
    cityCode: '500200',
    districtCode: '',
    loadDistricts: async () => [],
    onConfirm: (...codes) => saved.push(codes),
    onClose: () => {},
  })

  const cityScroll = findNodes(sheet, node =>
    node.type === 'ScrollView' && node.props?.style?.left === '358rpx'
  )[0]
  assert.ok(cityScroll, '缺少区县滚轮')
  cityScroll.props.onScroll({ detail: { scrollTop: 0 } })
  sheet.props.onConfirm()
  assert.deepEqual(saved, [])
  assert.ok(toasts.length > 0, '应提示用户重新选择真实区县')

  cityScroll.props.onTouchStart()
  sheet.props.onConfirm()
  assert.deepEqual(saved, [], '只触摸滚轮未更换选项也不能视为已选择')
})

test('已保存的真实区县编码可以直接确认', () => {
  const saved = []
  const LanhuRegionSheet = loadRegionSheet(() => {})
  const sheet = LanhuRegionSheet({
    title: '现居地',
    regions: municipalityTree,
    provinceCode: '500000',
    cityCode: '500233',
    districtCode: '',
    loadDistricts: async () => [],
    onConfirm: (...codes) => saved.push(codes),
    onClose: () => {},
  })

  sheet.props.onConfirm()
  assert.deepEqual(saved, [['500000', '500233', '']])
})

test('地区滚轮和基础资料文案保留真实县名且不暴露历史虚拟编码', () => {
  const { trimRegionName } = loadFunctions(
    'src/pages/verification/components/LanhuPickerSheet.tsx', ['trimRegionName']
  )
  const { resolveRegionLabel, trimRegionSuffix } = loadFunctions(
    'src/pages/verification/components/BasicInfoCard.tsx',
    ['resolveRegionLabel', 'trimRegionSuffix']
  )

  assert.equal(trimRegionName('忠县'), '忠县')
  assert.equal(trimRegionName('渝中区'), '渝中')
  assert.equal(resolveRegionLabel(municipalityTree, '500000', '500233', '', ''), '重庆-忠县')
  assert.equal(resolveRegionLabel(municipalityTree, '500000', '500200', '', ''), '重庆')
  assert.equal(trimRegionSuffix('忠县'), '忠县')
})

test('登录地址确认文案完整显示忠县', () => {
  const { formatAddressLabel } = loadFunctions(
    'src/pages/login/address.tsx', ['formatAddressLabel']
  )
  assert.equal(formatAddressLabel('重庆市', '忠县'), '重庆忠县')
  assert.equal(formatAddressLabel('北京市', '北京市'), '北京')
})

test('自治区及特别行政区在地区选择和地址回显中保留完整名称', () => {
  const { trimRegionName } = loadFunctions(
    'src/pages/verification/components/LanhuPickerSheet.tsx', ['trimRegionName']
  )
  const { trimRegionSuffix } = loadFunctions(
    'src/pages/verification/components/BasicInfoCard.tsx', ['trimRegionSuffix']
  )
  const { formatAddressLabel } = loadFunctions(
    'src/pages/login/address.tsx', ['formatAddressLabel']
  )
  const regions = [
    '内蒙古自治区',
    '广西壮族自治区',
    '西藏自治区',
    '宁夏回族自治区',
    '新疆维吾尔自治区',
    '香港特别行政区',
    '澳门特别行政区',
  ]

  for (const name of regions) {
    assert.equal(trimRegionName(name), name)
    assert.equal(trimRegionSuffix(name), name)
    assert.equal(formatAddressLabel(name, ''), name)
    assert.equal(formatAddressLabel(name, '银川市'), `${name}银川`)
  }
})

test('最长自治区名称在省份滚轮内使用可容纳的字号', () => {
  const name = '新疆维吾尔自治区'
  const LanhuRegionSheet = loadRegionSheet(() => {})
  const sheet = LanhuRegionSheet({
    title: '家乡',
    regions: [{
      code: '650000', name, level: 'PROVINCE',
      children: [{ code: '650100', name: '乌鲁木齐市', level: 'CITY', children: [] }],
    }],
    provinceCode: '650000',
    cityCode: '650100',
    districtCode: '',
    loadDistricts: async () => [],
    onConfirm: () => {},
    onClose: () => {},
  })
  const label = findNodes(sheet, node => node.type === 'Text' && node.props?.children === name)[0]

  assert.ok(label, '省份滚轮必须展示完整自治区名称')
  assert.equal(label.props.style.fontSize, '24rpx')
})

test('我的页面按扁平省市树回显新保存的区县', async () => {
  const store = {
    provinceCities: async () => municipalityTree,
    locations: async parentCode => parentCode
      ? [{ code: '500100', label: '市辖区' }, { code: '500200', label: '县' }]
      : [{ code: '500000', label: '重庆市' }],
  }
  const { loadLocationLabel } = loadFunctions('src/hooks/useProfile.ts', ['loadLocationLabel'], {
    usePrd01Store: { getState: () => store },
  })

  assert.equal(await loadLocationLabel({
    profile: { locationProvince: '500000', locationCity: '500233' },
  }), '忠县')
  assert.equal(await loadLocationLabel({
    profile: { locationProvince: '500000', locationCity: '500200' },
  }), '重庆市')
})
