const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const ts = require('typescript')

// 只执行上传器的纯选择/合并函数，绝不导入其 CLI runner 或访问凭证。
function loadFunctions() {
  const file = path.resolve(__dirname, 'upload-miniapp-oss-icons.mjs')
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const names = ['selectAssets', 'mergeManifestEntries', 'parseManifestEntries']
  const functions = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text))
  assert.equal(functions.length, names.length, '上传器缺少只选择和合并清单函数')
  const js = ts.transpileModule(functions.map(node => node.getText(source)).join('\n'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(js, { module, exports: module.exports })
  return module.exports
}

test('S07：指定资源只选择该资源，默认全选', () => {
  const { selectAssets } = loadFunctions()
  const assets = { old: 'missing.png', poster: 'poster.jpg' }
  assert.deepEqual(JSON.parse(JSON.stringify(selectAssets(assets, ['--only=poster']))), [['poster', 'poster.jpg']])
  assert.deepEqual(JSON.parse(JSON.stringify(selectAssets(assets, []))), Object.entries(assets))
})

test('S07：未知或空选择在上传前拒绝', () => {
  const { selectAssets } = loadFunctions()
  assert.throws(() => selectAssets({ poster: 'a.jpg' }, ['--only=unknown']), /unknown/)
  assert.throws(() => selectAssets({ poster: 'a.jpg' }, ['--only=']), /only/)
})

test('S07：局部清单更新保留其他 URL 与顺序', () => {
  const { mergeManifestEntries } = loadFunctions()
  const existing = [{ key: 'old', url: 'https://a/old.png' }, { key: 'poster', url: 'https://a/previous.jpg' }]
  const merged = mergeManifestEntries(existing, [{ key: 'poster', url: 'https://a/new.jpg' }, { key: 'another', url: 'https://a/another.png' }])
  assert.deepEqual(JSON.parse(JSON.stringify(merged)), [existing[0], { key: 'poster', url: 'https://a/new.jpg' }, { key: 'another', url: 'https://a/another.png' }])
  assert.equal(existing[1].url, 'https://a/previous.jpg', '不原地修改源清单')
})

test('S07：上传链路只读取 DEV_OSS 配置，不能回退到其他环境密钥', () => {
  const source = fs.readFileSync(path.resolve(__dirname, 'upload-miniapp-oss-icons.mjs'), 'utf8')
  assert.doesNotMatch(source, /requiredEnv\(env,[^\n]*,\s*'OSS_/)
  assert.doesNotMatch(source, /env\.OSS_CDN_DOMAIN/)
})

test('S07：局部清单必须完整解析，单个条目格式异常或重复不得静默删除', () => {
  const { parseManifestEntries } = loadFunctions()
  const manifest = body => `export const miniappOssIcons = Object.freeze({\n${body}\n} as const)`
  assert.deepEqual(JSON.parse(JSON.stringify(parseManifestEntries(manifest("  old: 'https://a/old.png',")))), [{ key: 'old', url: 'https://a/old.png' }])
  assert.throws(() => parseManifestEntries(manifest("  old: 'https://a/old.png',\n  next: \"https://a/next.png\",")), /格式/)
  assert.throws(() => parseManifestEntries(manifest("  old: 'https://a/old.png',\n  old: 'https://a/next.png',")), /重复/)
})
