const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { act } = React
const dom = new JSDOM('<html><body></body></html>')
global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
async function mount(t, fetchPage) {
  const source = fs.readFileSync(path.join(__dirname, '../src/hooks/useCoins.ts'), 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }, calls = []
  Function('require','module','exports',output)(name => {
    if (name === 'react') return React
    if (name === '@tarojs/taro') return { default: {} }
    if (name === '@/constants/ossIcons') return { miniappOssIcons: {} }
    if (name === '@/domain/paymentFailureFeedback') return {}
    if (name === '@/services/payment') return { getCoinFlows: (...args) => { calls.push(args); return fetchPage(...args) } }
    throw Error(name)
  },module,module.exports)
  let state
  function Hook() { state = module.exports.useCoins(); return null }
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(React.createElement(Hook)))
  t.after(async () => act(async () => root.unmount()))
  return { state: () => state, calls }
}
const page = (n, type) => ({ current: n, size: 20, total: 45, pages: 3, records: Array.from({ length: n === 3 ? 5 : 20 }, (_, i) => ({ id: (n-1)*20+i+1, changeAmount: type === 'expense' ? -1 : 1 })) })
test('千寻币明细连续分页到第45条，重复触底不重复加载', async t => {
 const h = await mount(t, async (n, size, type) => page(n,type))
 await act(async () => h.state().fetchTransactions())
 assert.equal(h.state().transactions.length,20)
 assert.equal(h.state().transactionsHasMore,true)
 await act(async () => Promise.all([h.state().loadMoreTransactions(),h.state().loadMoreTransactions()]))
 assert.equal(h.state().transactions.length,40)
 await act(async () => h.state().loadMoreTransactions())
 assert.equal(h.state().transactions.length,45)
 assert.equal(h.state().transactionsHasMore,false)
 await act(async () => h.state().loadMoreTransactions())
 assert.deepEqual(h.calls.map(x=>x[0]),[1,2,3])
})
test('切换消耗分类使用服务端过滤，旧分类迟到不覆盖；翻页失败可重试', async t => {
 let resolveOld, failMore = true
 const h = await mount(t, (n,size,type) => {
  if (!type) return new Promise(resolve=>{resolveOld=resolve})
  if(n===2&&failMore){failMore=false;return Promise.reject(Error('网络失败'))}
  return Promise.resolve(page(n,type))
 })
 let old
 await act(async()=>{old=h.state().fetchTransactions()})
 await act(async()=>h.state().fetchTransactions('expense'))
 await act(async()=>{resolveOld(page(1));await old})
 assert.ok(h.state().transactions.every(x=>x.type==='expense'))
 await act(async()=>assert.rejects(h.state().loadMoreTransactions(),/网络失败/))
 await act(async()=>h.state().loadMoreTransactions())
 assert.equal(h.state().transactions.length,40)
 assert.deepEqual(h.calls.slice(1),[[1,20,'expense'],[2,20,'expense'],[2,20,'expense']])
})
