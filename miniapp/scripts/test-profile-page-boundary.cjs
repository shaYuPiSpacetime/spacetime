const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const React = require('react')
const { createRoot } = require('react-dom/client')
const { JSDOM } = require('jsdom')
const { act } = React

test('PREVIEW-04: 渲染失败显示重试和返回，重试可恢复真实内容', async t => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>')
  global.window = dom.window
  global.document = dom.window.document
  global.IS_REACT_ACT_ENVIRONMENT = true
  const navigation = []
  const host = tag => ({ children, onClick }) => React.createElement(tag, { onClick }, children)
  const module = { exports: {} }
  const file = path.resolve(__dirname, '../src/components/ProfilePageBoundary.tsx')
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  Function('require', 'module', 'exports', code)(name => {
    if (name === '@tarojs/components') return { View: host('div'), Text: host('span'), Button: host('button') }
    if (name === '@tarojs/taro') return { switchTab: async options => { navigation.push(options.url) } }
    return require(name)
  }, module, module.exports)
  const Boundary = module.exports.default
  let fail = true
  const Child = () => { if (fail) throw new Error('fixture rendering failure'); return React.createElement('span', null, '我的主页已恢复') }
  const root = createRoot(document.getElementById('root'))
  const previousError = console.error
  const errors = []
  console.error = (...args) => errors.push(args)
  t.after(async () => { await act(async () => root.unmount()); console.error = previousError; dom.window.close() })
  await act(async () => root.render(React.createElement(Boundary, null, React.createElement(Child))))
  assert.match(document.body.textContent, /主页暂时无法显示/)
  const buttons = [...document.querySelectorAll('button')]
  await act(async () => buttons.find(button => button.textContent === '返回我的').click())
  assert.deepEqual(navigation, ['/pages/profile/index'])
  fail = false
  await act(async () => buttons.find(button => button.textContent === '重新加载').click())
  assert.match(document.body.textContent, /我的主页已恢复/)
  assert.doesNotMatch(document.body.textContent, /主页暂时无法显示/)
  assert.ok(errors.some(args => args[0] === '[profile-page-render]'))
})
