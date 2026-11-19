const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const test = require('node:test')
const Module = require('node:module')
const ts = require('typescript')

// 执行真实页面的加载与渲染逻辑，仅替换原生组件、网络和 React 调度。
const file = path.resolve(__dirname, '../src/pages/message/channel.tsx')
let cells = [], cursor = 0, effects = [], requests = []
const destinations = [], storage = new Map()
const taro = {
  getCurrentPages: () => [{ route: 'pages/message/channel' }],
  switchTab: async ({ url }) => destinations.push(['切换', url]),
  navigateTo: async ({ url }) => destinations.push(['打开', url]),
  setStorageSync: (key, value) => storage.set(key, value),
  showToast: async ({ title }) => destinations.push(['提示', title]),
}
const hooks = {
  useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = initial; return [cells[i], v => { cells[i] = typeof v === 'function' ? v(cells[i]) : v }] },
  useRef(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i] },
  useEffect(fn, deps) { const i = cursor++; if (!cells[i] || deps.some((d, j) => d !== cells[i][j])) { cells[i] = deps; effects.push(fn) } },
}
const message = n => ({ noticeNo: `N${n}`, createdTime: `2026-10-${String(n).padStart(2, '0')} 12:00:00`, title: `消息${n}`, content: '正文' })
const service = {
  async listSystemMessages(after) { requests.push(after); return { list: after ? [message(10), message(9)] : [message(12), message(11)], hasMore: !after, nextCursor: after ? null : 'older' } },
  async readSystemMessages() { return { acceptedNos: [] } },
}
const jsx = (type, props) => ({ type, props: props || {} })
const original = Module._load
Module._load = function(name, parent, main) {
  if (name === 'react') return hooks
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
  if (name === '@tarojs/components') return { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Button: 'Button' }
  if (name === '@tarojs/taro') return { __esModule: true, default: taro, useRouter: () => ({ params: { channel: 'system' } }) }
  if (name === '@/services/message') return { messageService: service }
  if (name === '@/services/messagePlatformRuntime') return { messagePlatformRuntime: {} }
  if (name === '@/domain/messageRuntime' || name === '@/utils/navigation') return compile(path.resolve(__dirname, '../src', name.slice(2) + '.ts')).exports
  if (name === './shared' || name.endsWith('.scss')) return {}
  return original.call(this, name, parent, main)
}
function compile(filename) {
  const unit = new Module(filename, module)
  unit.filename = filename
  unit.paths = Module._nodeModulePaths(path.dirname(filename))
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } })
  unit._compile(source.outputText, filename)
  return unit
}
let compiled
try { compiled = compile(file) } finally { Module._load = original }
function render() { cursor = 0; effects = []; const tree = compiled.exports.default(); effects.forEach(fn => fn()); return tree }
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)] }
const titles = tree => nodes(tree).filter(n => n.props.className === 'channel-card-title').map(n => n.props.children)
const scroll = tree => nodes(tree).find(n => n.type === 'ScrollView')
const flush = () => new Promise(resolve => setImmediate(resolve))
test('系统消息按旧到新展示，首屏定位最新，向上加载历史并保留锚点', async () => {
  render(); await flush(); let tree = render()
  assert.deepEqual(titles(tree), ['消息11', '消息12'])
  assert.ok(scroll(tree).props.scrollIntoView)
  assert.equal(scroll(tree).props.onScrollToLower, undefined)
  scroll(tree).props.onScrollToUpper(); await flush(); tree = render()
  assert.deepEqual(requests, [undefined, 'older'])
  assert.deepEqual(titles(tree), ['消息9', '消息10', '消息11', '消息12'])
  assert.ok(nodes(tree).some(n => n.props.id === scroll(tree).props.scrollIntoView))
})

test('系统消息按目标打开底部栏目与普通页面，非法目标仍然被拦截', async t => {
  const urls = ['/pages/community/index?tab=visitors', '/pages/profile/index', '/pages/chat/index', '/pages/settings/index', '/unknown']
  cells = []
  t.mock.method(service, 'listSystemMessages', async () => ({ list: urls.map((url, i) => ({
    ...message(i + 1), jumpType: 'miniapp_page', jumpValue: url,
  })), hasMore: false }))
  render()
  await flush()
  const actions = nodes(render()).filter(n => n.props.className === 'channel-card-action')
  assert.equal(actions.length, urls.length)
  for (const action of actions) { action.props.onClick(); await flush() }
  assert.deepEqual(destinations.filter(item => item[0] === '切换').map(item => item[1]).sort(),
    ['/pages/chat/index', '/pages/community/index', '/pages/profile/index'])
  assert.equal(storage.get('community_requested_tab'), 'visitors')
  assert.deepEqual(destinations.filter(item => item[0] === '打开'), [['打开', '/pages/settings/index']])
  assert.equal(destinations.filter(item => item[0] === '提示').length, 1)
})
