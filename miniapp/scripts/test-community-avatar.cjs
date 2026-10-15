const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
test('社区小头像按两倍显示尺寸请求，签名地址、外域和静态图标保持原样', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/domain/communityAvatar.ts'), 'utf8')
  const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  Function('exports', out)(exports)
  const base = 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/'
  assert.equal(exports.communityAvatarUrl(base + 'miniapp/1017/album/a.png'), base + 'miniapp/1017/album/a.png?x-oss-process=image/resize,m_fill,w_160,h_160/format,webp')
  for (const url of ['', 'avatar.png', 'https://example.com/a.png', base + 'icons/a.png', base + 'miniapp/1017/avatar/a.png?Signature=sample']) assert.equal(exports.communityAvatarUrl(url), url)
})
