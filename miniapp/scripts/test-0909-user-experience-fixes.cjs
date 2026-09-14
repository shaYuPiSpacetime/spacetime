/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

function loadTypeScriptModule(relativePath) {
  const source = read(relativePath)
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  const loaded = { exports: {} }
  Function('module', 'exports', 'require', output)(loaded, loaded.exports, require)
  return loaded.exports
}

function functionSource(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)
  assert.ok(start >= 0, `缺少函数：${startMarker}`)
  assert.ok(end > start, `无法确定函数结束位置：${startMarker}`)
  return source.slice(start, end)
}

test('推荐候选图片右上角不再悬浮转发按钮', () => {
  const source = read('src/pages/recommend/index.tsx')
  const card = functionSource(source, 'function RecommendCandidateCard', 'function ProfileInfoLine')

  assert.doesNotMatch(card, /onShare/, '推荐候选卡不得继续接收分享回调')
  assert.doesNotMatch(card, /profilePreviewShare/, '推荐候选图片右上角不得继续渲染分享图标')
  assert.doesNotMatch(source, /Taro\.showShareMenu/, '推荐页不得保留无可见入口的分享菜单调用')
})

test('推荐等待页的千寻动态入口使用详情页可识别参数并兼容历史链接', () => {
  const waiting = read('src/pages/prd08/recommend/waiting/index.tsx')
  const detail = read('src/pages/qianxun/post-detail.tsx')

  assert.match(waiting, /post-detail\?id=\$\{post\.id\}/, '千寻动态入口必须传递详情页读取的 id 参数')
  assert.doesNotMatch(waiting, /post-detail\?postId=/, '入口不得继续传递不被详情页识别的 postId 参数')
  assert.match(detail, /options\.id\s*\|\|\s*options\.postId/, '详情页必须兼容已分享或已缓存的旧 postId 链接')
})

test('千寻运行配置缺失或返回内部键时始终展示可理解的中文文案', () => {
  const domainPath = 'src/domain/communityCopy.ts'
  assert.equal(fs.existsSync(path.join(root, domainPath)), true, '缺少千寻文案安全降级领域规则')
  const {
    COMMUNITY_COPY_KEYS,
    resolveCommunityCopy,
    resolveCommunityFeedback,
  } = loadTypeScriptModule(domainPath)

  assert.equal(
    resolveCommunityCopy(undefined, COMMUNITY_COPY_KEYS.postUnavailable),
    '这条动态暂时无法查看',
  )
  assert.equal(
    resolveCommunityFeedback(undefined, COMMUNITY_COPY_KEYS.postUnavailable, new Error('community.copy.post_unavailable')),
    '这条动态暂时无法查看',
  )
  assert.equal(
    resolveCommunityFeedback(undefined, COMMUNITY_COPY_KEYS.postUnavailable, new Error('请求失败：community.copy.load_failed')),
    '这条动态暂时无法查看',
  )
  assert.equal(resolveCommunityCopy(undefined, 'unknown_copy_key'), '操作失败，请稍后重试')

  for (const directory of ['src/pages', 'src/features', 'src/components']) {
    const files = walk(path.join(root, directory)).filter(file => /\.(?:ts|tsx)$/.test(file))
    for (const file of files) {
      assert.doesNotMatch(
        fs.readFileSync(file, 'utf8'),
        /community\.copy\.[a-z0-9_.-]+/i,
        `${path.relative(root, file)} 不得把内部文案键写进用户界面`,
      )
    }
  }
})

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}
