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

test('互动记录按真实互动日期稳定分组并显示蓝湖日期文本', () => {
  const domainPath = 'src/domain/qianxunInteractionPresentation.ts'
  assert.ok(fs.existsSync(path.join(root, domainPath)), '缺少千寻互动日期展示领域模型')

  const {
    formatInteractionCardDate,
    formatInteractionGroupDate,
    groupCommunityInteractions,
    shouldDisplayMyCommunityPost,
  } = loadTypeScriptModule(domainPath)

  const records = [
    { id: '1', interactionTime: '2026-07-15 18:20:00' },
    { id: '2', interactionTime: '2026-07-15T08:00:00' },
    { id: '3', interactionTime: '2026-07-14 23:59:00' },
    { id: '4' },
  ]
  const groups = groupCommunityInteractions(records)

  assert.deepEqual(groups.map(group => group.label), ['2026年07月15日', '2026年07月14日', '日期未知'])
  assert.deepEqual(groups[0].items.map(item => item.id), ['1', '2'])
  assert.equal(formatInteractionGroupDate('2026-07-05 12:00:00'), '2026年07月05日')
  assert.equal(formatInteractionCardDate('2026-07-05 12:00:00'), '07-05')
  assert.equal(formatInteractionCardDate(''), '')
  assert.equal(shouldDisplayMyCommunityPost('published'), true)
  assert.equal(shouldDisplayMyCommunityPost('pending_manual'), true)
  assert.equal(shouldDisplayMyCommunityPost('deleted'), false)
  assert.equal(shouldDisplayMyCommunityPost('BLOCKED'), false)
})

test('互动页消费真实 viewed 互动接口并保留关联动态和互动时间', () => {
  const source = read('src/pages/qianxun/interactions.tsx')

  assert.match(source, /getCommunityInteractions\('viewed',\s*1,\s*50\)/, '浏览记录必须读取包含 viewedAt 的真实互动接口')
  assert.doesNotMatch(source, /getCommunityViewHistory/, '互动页禁止继续使用缺少浏览时间的旧列表接口')
  assert.match(source, /interactionTime:\s*item\.interactionTime/, '互动映射必须保留服务端 interactionTime')
  assert.match(source, /post:\s*item\.post/, '互动映射必须保留服务端关联动态')
  assert.match(source, /groupCommunityInteractions\(/, '浏览记录和动态互动必须按真实日期分组')
  assert.match(source, /data-section-panel="history"/, '浏览记录面板必须继续保持挂载')
})

test('千寻动态卡统一使用 OSS 性别评论点赞图标', () => {
  const sources = [
    'src/pages/qianxun/interactions.tsx',
    'src/pages/qianxun/my-posts.tsx',
    'src/pages/qianxun/post-detail.tsx',
    'src/pages/qianxun/topic.tsx',
    'src/features/qianxun/QianxunZhiyinTab.tsx',
  ].map(relativePath => [relativePath, read(relativePath)])

  for (const [relativePath, source] of sources) {
    assert.doesNotMatch(source, /[◯♡♥♀♂]/, `${relativePath} 禁止继续使用字体字符冒充性别、评论或点赞图标`)
  }

  const shared = read('src/components/QianxunCommunityIcons.tsx')
  for (const icon of ['qianxunGenderFemale', 'qianxunGenderMale', 'qianxunComment', 'qianxunLike', 'qianxunLikeActive']) {
    assert.match(shared, new RegExp(`miniappOssIcons\\.${icon}`), `共享组件缺少 ${icon} OSS 图标`)
  }
  assert.match(shared, /gender === 'female'|normalized === 'female'/, '女性图标必须按真实字段映射')
  assert.match(shared, /gender === 'male'|normalized === 'male'/, '男性图标必须按真实字段映射')
  assert.match(shared, /return null/, '未知性别必须不渲染，禁止默认男性')
})

test('互动首页关键纵向基线与单一导航符合蓝湖稿', () => {
  const source = read('src/pages/qianxun/interactions.tsx')

  assert.equal((source.match(/<SimpleHeader title="千寻互动"/g) || []).length, 1, '千寻互动只能有一个返回导航，禁止双箭头')
  assert.match(source, /top:\s*'430rpx'/, '白色主面板顶部必须回到蓝湖 430rpx 基线')
  assert.match(source, /top:\s*'226rpx'/, '用户资料行顶部必须回到蓝湖 226rpx 基线')
  assert.match(source, /top:\s*'356rpx'/, '统计行顶部必须回到蓝湖 356rpx 基线')
  assert.doesNotMatch(source, />\s*清空\s*</, '浏览记录禁止用额外清空行破坏上下间距')
})
