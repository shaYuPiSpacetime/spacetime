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

test('理想型已有筛选记录时直达最新结果，无记录时才展示落地页', () => {
  const source = read('src/pages/recommend/index.tsx')

  assert.match(source, /getIdealSearchRecords/, '理想型入口必须查询服务端筛选记录')
  assert.match(
    source,
    /items[^\n]*find\([^\n]*status\s*===\s*['"]active['"]\)/,
    '必须读取按时间倒序返回的最新有效筛选快照，不能进入已过期结果'
  )
  assert.match(
    source,
    /\/pages\/prd08\/ideal\/results\/index\?snapshotNo=\$\{encodeURIComponent\([^)]*snapshotNo\)\}/,
    '已有筛选快照时必须进入结果页'
  )
  assert.match(source, /setActiveTab\('ideal'\)/, '没有筛选记录时必须保留理想型落地页')
  const didShowFlow = source.slice(
    source.indexOf('useDidShow(() =>'),
    source.indexOf('usePullDownRefresh(() =>')
  )
  assert.match(
    didShowFlow,
    /router\.params\.tab\s*===\s*['"]ideal['"][\s\S]*openIdealTab\(\)/,
    '通过 tab=ideal 直接进入时也必须执行筛选快照判断'
  )
})

test('推荐偏好居住地使用省市两级联动选择器', () => {
  const source = read('src/pages/prd08/recommend/preference/index.tsx')

  assert.match(source, /mode="multiSelector"/, '居住地偏好必须使用两列选择器')
  assert.match(source, /onColumnChange=/, '切换省份时必须联动刷新城市列')
  assert.match(
    source,
    /normalizeTwoLevelRegionSelection/,
    '省市索引必须复用既有合法范围收敛逻辑'
  )
})

test('推荐页首次送出心动后展示下一位且不写入跳过动作', () => {
  const source = read('src/pages/recommend/index.tsx')
  const toggleLike = source.slice(
    source.indexOf('const toggleLike'),
    source.indexOf('const updateCandidate')
  )

  assert.match(source, /const showNextCandidate = async/, '候选切换必须从跳过动作中拆分出来')
  assert.match(
    toggleLike,
    /wasLiked[\s\S]*await showNextCandidate\(\)/,
    '首次送出心动成功后必须切换下一位'
  )
  assert.doesNotMatch(toggleLike, /recordRecommendSkip/, '心动后切换不得误记为跳过')
  assert.match(toggleLike, /recordRecommendLike/, '首次送出心动必须同步推荐动作记录')

  const queuePath = 'src/domain/recommendCandidateQueue.ts'
  assert.equal(fs.existsSync(path.join(root, queuePath)), true, '缺少推荐候选队列去重规则')
  const { omitSeenRecommendCandidates } = loadTypeScriptModule(queuePath)
  const page = {
    items: [
      { candidateNo: 'current' },
      { candidateNo: 'next' },
      { candidateNo: 'seen-before' },
    ],
    preferenceVersion: 1,
  }
  assert.deepEqual(
    omitSeenRecommendCandidates(page, new Set(['seen-before']), 'current').items,
    [{ candidateNo: 'next' }],
    '即使曝光日志失败，重新拉取推荐时也不得把当前或本次已看用户再次作为下一位'
  )
  assert.match(
    source,
    /omitSeenRecommendCandidates\([\s\S]*?candidate\?\.candidateNo\s*\)/,
    '推荐页必须显式把当前候选交给队列去重规则'
  )
})

test('我的标签中 MBTI 分类保持单选，其他分类仍可多选', () => {
  const domainPath = 'src/domain/profileTagSelection.ts'
  assert.equal(fs.existsSync(path.join(root, domainPath)), true, '缺少标签选择领域规则')

  const { toggleProfileTagSelection } = loadTypeScriptModule(domainPath)
  const selected = ['INTJ', 'running']
  const mbti = toggleProfileTagSelection(selected, 'ENFP', 'MBTI', ['INTJ', 'ENFP'], 16)
  assert.deepEqual(mbti, { codes: ['running', 'ENFP'], limitExceeded: false })

  const hobby = toggleProfileTagSelection(mbti.codes, 'reading', 'HOBBY', ['running', 'reading'], 16)
  assert.deepEqual(hobby, {
    codes: ['running', 'ENFP', 'reading'],
    limitExceeded: false,
  })

  const page = read('src/pages/profile-edit/tags.tsx')
  assert.match(page, /toggleProfileTagSelection/, '标签页必须统一消费可测试的选择规则')
})

test('编辑资料滚动内容按真实高度收口并只保留安全区间距', () => {
  const source = read('src/pages/profile/edit.tsx')

  assert.doesNotMatch(source, /minHeight:\s*'5812rpx'/, '编辑资料不得固定成超长内容高度')
  assert.match(
    source,
    /paddingBottom:\s*'calc\([^']*env\(safe-area-inset-bottom\)[^']*\)'/,
    '编辑资料底部只保留紧凑间距和安全区'
  )
})

test('主页预览保留全部已上传的有效照片', () => {
  const { buildProfilePreviewVisibility } = loadTypeScriptModule(
    'src/domain/profilePreviewVisibility.ts'
  )
  const photos = ['one.jpg', 'two.jpg', '', 'three.jpg', 'four.jpg', 'five.jpg', 'six.jpg']
  const visible = buildProfilePreviewVisibility({
    tags: [],
    introduction: '',
    photos,
    certifications: [],
    favoriteSong: '',
  })

  assert.deepEqual(visible.photos, [
    'one.jpg',
    'two.jpg',
    'three.jpg',
    'four.jpg',
    'five.jpg',
    'six.jpg',
  ])
})

test('本人主页预览展示真实个人动态且空列表不渲染模块', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')
  const sectionPath = 'src/pages/profile/components/ProfileCommunityPostsSection.tsx'

  assert.match(edit, /getMyCommunityPosts/, '编辑资料页必须读取本人真实动态')
  assert.match(edit, /communityPosts/, '本人动态必须注入主页预览模型')
  assert.match(
    edit,
    /filter\([^\n]*status\s*===\s*['"]published['"]\)/,
    '主页预览只能展示已发布的公开动态'
  )
  assert.match(preview, /ProfileCommunityPostsSection/, '共享预览页必须渲染个人动态组件')
  assert.equal(fs.existsSync(path.join(root, sectionPath)), true, '缺少个人动态预览组件')

  const section = read(sectionPath)
  assert.match(section, /if \(!posts\.length\) return null/, '没有个人动态时必须隐藏整个模块')
  assert.match(section, /个人动态/, '有动态时必须显示模块标题')
  assert.match(section, /post\.content/, '动态模块必须展示真实正文')
  assert.match(section, /post\.imageUrls/, '动态模块必须展示真实图片内容')
})
