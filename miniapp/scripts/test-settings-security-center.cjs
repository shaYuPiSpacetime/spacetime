const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, 'src', file), 'utf8')

// 执行真实页面/行组件，平台原生组件与网络接口仅作为边界替身。
function pageHarness(file) {
  const slots = []
  let cursor = 0
  const calls = { navigation: [], preview: [], toast: [] }
  const taro = {
    navigateTo: async value => calls.navigation.push(value),
    previewImage: async value => calls.preview.push(value),
    showToast: async value => calls.toast.push(value),
  }
  const jsx = (type, props, key) => ({ type, props: props || {}, key })
  const cache = new Map()
  function load(relative) {
    assert.ok(fs.existsSync(path.join(root, 'src', relative)), `缺少页面 ${relative}`)
    if (cache.has(relative)) return cache.get(relative)
    const module = { exports: {} }
    cache.set(relative, module.exports)
    const js = ts.transpileModule(read(relative), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText
    const requireBoundary = name => {
      if (name.endsWith('.scss')) return {}
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' }
      if (name === 'react') return {
        useEffect() {},
        useState(initial) {
          const index = cursor++
          if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
          return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
        },
      }
      if (name === '@tarojs/taro') return { __esModule: true, default: taro }
      if (name === '@tarojs/components') return new Proxy({}, { get: (_, key) => key })
      if (name === '@/services/settings') return { settingsApi: {} }
      if (name === '@/stores/authStore') return { useAuthStore: {} }
      if (name === '@/utils/navigation') return { navigateBackOrRedirect() {} }
      if (name === '@/components/LanhuSubNav') return { __esModule: true, default: 'Nav' }
      if (name === './components/SettingsDialog') return { __esModule: true, default: 'Dialog' }
      const target = name.startsWith('@/') ? name.slice(2) : path.posix.join(path.posix.dirname(relative), name)
      const resolved = ['.tsx', '.ts'].map(ext => target + ext).find(candidate => fs.existsSync(path.join(root, 'src', candidate)))
      assert.ok(resolved, `未处理依赖 ${name}`)
      return load(resolved)
    }
    vm.runInNewContext(js, { require: requireBoundary, module, exports: module.exports, process: { env: {} }, definePageConfig: value => value, defineAppConfig: value => value })
    return module.exports
  }
  const page = load(file).default
  function expand(node) {
    if (!node || typeof node !== 'object') return node
    if (Array.isArray(node)) return node.map(expand)
    if (typeof node.type === 'function') return expand(node.type(node.props))
    return { ...node, props: { ...node.props, children: expand(node.props.children) } }
  }
  function render() { cursor = 0; return expand(page()) }
  function nodes(tree, type) {
    if (!tree || typeof tree !== 'object') return []
    if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, type))
    return [...(tree.type === type ? [tree] : []), ...nodes(tree.props.children, type)]
  }
  return { render, nodes, calls, taro, load }
}

test('S01：设置在隐私之后加入安全中心，保留原顺序且小屏可滚动', async () => {
  const h = pageHarness('pages/settings/index.tsx')
  const tree = h.render()
  const buttons = h.nodes(tree, 'Button')
  const label = button => h.nodes(button, 'Text')[0]?.props.children
  assert.deepEqual(buttons.map(label), ['手机号绑定', '微信绑定', '隐私设置', '安全中心', '第三方信息共享清单', '个人信息收集清单', '关于我们', '退出登录'])
  await buttons.find(button => label(button) === '安全中心').props.onClick()
  assert.equal(h.calls.navigation[0].url, '/pages/settings/security-center')
  assert.equal(h.nodes(tree, 'ScrollView')[0]?.props.scrollY, true)
})

test('S02：安全中心仅展示反诈指南真实按钮并跳转', async () => {
  const h = pageHarness('pages/settings/security-center.tsx')
  const tree = h.render()
  assert.equal(h.nodes(tree, 'Nav')[0].props.title, '安全中心')
  const buttons = h.nodes(tree, 'Button')
  assert.equal(buttons.length, 1)
  assert.equal(h.nodes(buttons[0], 'View').find(node => node.props.className === 'settings-row__label')?.props.children, '反诈指南')
  await buttons[0].props.onClick()
  assert.equal(h.calls.navigation[0].url, '/pages/settings/anti-fraud-guide')
})

test('S10：设置可滚动但退出登录弹层位于滚动容器外', () => {
  const h = pageHarness('pages/settings/index.tsx')
  const buttons = h.nodes(h.render(), 'Button')
  buttons[buttons.length - 1].props.onClick()
  const tree = h.render()
  assert.equal(h.nodes(tree, 'Dialog')[0].props.open, true)
  assert.equal(h.nodes(h.nodes(tree, 'ScrollView')[0], 'Dialog').length, 0, '固定弹层不能随滚动内容被裁剪')
})

test('S03：两页在设置分包注册，使用自定义导航', () => {
  const h = pageHarness('pages/settings/index.tsx')
  const config = h.load('app.config.ts').default
  const sub = config.subPackages.find(pkg => pkg.root === 'pages/settings')
  for (const page of ['security-center', 'anti-fraud-guide']) {
    assert.ok(sub.pages.includes(page), `分包缺少 ${page}`)
    assert.equal(h.load(`pages/settings/${page}.config.ts`).default.navigationStyle, 'custom')
  }
})

test('S04/S05：原图加载、失败重试与原生放大预览', async () => {
  const h = pageHarness('pages/settings/anti-fraud-guide.tsx')
  let tree = h.render()
  assert.equal(h.nodes(tree, 'Nav')[0].props.title, '反诈指南')
  assert.equal(h.nodes(tree, 'ScrollView')[0].props.scrollY, true)
  let image = h.nodes(tree, 'Image')[0]
  const src = image.props.src
  assert.match(src, /^https:\/\//)
  assert.doesNotMatch(src, /\?|x-oss-process|signature=/i)
  assert.equal(image.props.mode, 'widthFix')
  await image.props.onClick()
  assert.equal(h.calls.preview.length, 0, '尚未加载时不打开预览')
  image.props.onError()
  tree = h.render()
  assert.match(JSON.stringify(tree), /图片加载失败/)
  assert.equal(h.nodes(tree, 'Image').length, 0)
  const retry = h.nodes(tree, 'Button')[0]
  retry.props.onClick()
  image = h.nodes(h.render(), 'Image')[0]
  assert.ok(image)
  assert.equal(image.props.src, src, '重试不追加图片处理/签名参数')
  image.props.onLoad()
  image = h.nodes(h.render(), 'Image')[0]
  await image.props.onClick()
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls.preview[0])), { current: src, urls: [src] })
})

test('S06：原生放大预览失败给予提示', async () => {
  const h = pageHarness('pages/settings/anti-fraud-guide.tsx')
  h.nodes(h.render(), 'Image')[0].props.onLoad()
  h.taro.previewImage = async () => { throw new Error('platform unavailable') }
  await h.nodes(h.render(), 'Image')[0].props.onClick()
  assert.equal(h.calls.toast.length, 1)
  assert.equal(h.calls.toast[0].icon, 'none')
})
