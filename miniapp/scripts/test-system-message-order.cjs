const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const test = require('node:test')
const Module = require('node:module')
const ts = require('typescript')

// 执行真实页面的加载与渲染逻辑，仅替换原生组件、网络和 React 调度。
const file = path.resolve(__dirname, '../src/pages/message/channel.tsx')
let cells = [], cursor = 0, effects = [], requests = []
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
  if (name === '@tarojs/taro') return { __esModule: true, default: {}, useRouter: () => ({ params: { channel: 'system' } }) }
  if (name === '@/services/message') return { messageService: service }
  if (name === '@/services/messagePlatformRuntime') return { messagePlatformRuntime: {} }
  if (name === '@/domain/messageRuntime' || name === './shared' || name.endsWith('.scss')) return {}
  return original.call(this, name, parent, main)
}
const compiled = new Module(file, module)
compiled.filename = file
compiled.paths = Module._nodeModulePaths(path.dirname(file))
try { compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, file) } finally { Module._load = original }
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
