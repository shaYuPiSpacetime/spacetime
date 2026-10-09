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
    /const activeRecord = \(data\.items \|\| \[\]\)\.find\(item =>[\s\S]*isIdealSnapshotForPreference\(item, preference\)[\s\S]*Date\.parse\(item\.expiresAt\) > Date\.now\(\)\)/,
    '必须读取与当前推荐偏好匹配且未过期的最新筛选快照'
  )
  assert.match(
    source,
    /<IdealResultsContent[\s\S]*snapshotNo=\{idealSnapshotNo \|\| ''\}[\s\S]*embedded/,
    '已有筛选快照时必须在理想型页签内直接展示结果内容'
  )
  assert.match(source, /setActiveTab\('ideal'\)/, '没有筛选记录时必须保留理想型落地页')
  const didShowFlow = source.slice(
    source.indexOf('useDidShow(() =>'),
    source.indexOf('usePullDownRefresh(() =>')
  )
  assert.match(
    didShowFlow,
    /const requestedByRoute =[^\n]*router\.params\.tab === 'ideal'[\s\S]*requestedByRoute[\s\S]*activeTabRef\.current =[^\n]*'ideal'/,
    '通过 tab=ideal 直接进入时必须先激活理想型页签'
  )
  assert.match(
    didShowFlow,
    /activeTabRef\.current === 'ideal'[\s\S]*void loadIdealTab\(\)/,
    '理想型页签显示时必须执行筛选快照判断'
  )
})

test('推荐偏好居住地使用省市两级联动选择器', () => {
  const source = read('src/pages/prd08/recommend/preference/index.tsx')

  assert.match(source, /import \{ LanhuRegionSheet \}/, '居住地偏好必须复用统一省市联动弹层')
  assert.match(source, /prd01Api\.getProvinceCities\(\)/, '省市选项必须读取完整地区树')
  assert.match(
    source,
    /<LanhuRegionSheet[\s\S]*title="居住地偏好"[\s\S]*regions=\{cities\}[\s\S]*provinceCode=\{citySheetSelection\.provinceCode\}[\s\S]*cityCode=\{citySheetSelection\.cityCode\}[\s\S]*onConfirm=\{\(provinceCode, cityCode\) => confirmTargetCity\(provinceCode, cityCode\)\}/,
    '居住地偏好必须通过统一弹层联动选择省和市'
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
    /wasLiked[\s\S]*await showNextCandidate\(candidateGeneration,\s*true\)/,
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
  assert.match(source, /awaitCurrentCandidateView/, '切换候选前必须等待当前曝光扣减额度')
  assert.match(
    source,
    /navigateToOrRedirect\(['"]\/pages\/prd08\/recommend\/waiting\/index['"]\)/,
    '额度用完后必须自动进入推荐等待聚合页'
  )
})

test('高级推荐偏好按后端有效权益在交互和提交两层锁定', () => {
  const source = read('src/pages/prd08/recommend/preference/index.tsx')
  const saveStart = source.indexOf('const save = async')
  const saveFlow = source.slice(saveStart, source.indexOf('  return (', saveStart))

  assert.match(source, /disabled=\{!model\.advancedFilterEffective\}/, '后端判定高级筛选未生效时滑块必须禁用')
  assert.match(source, /if \(model\.advancedFilterEffective\) return/, '高级筛选交互必须以后端有效权益为准')
  assert.match(
    saveFlow,
    /\.\.\.\(model\.advancedFilterEffective\s*\?[\s\S]*minHeight[\s\S]*:\s*\{\}\)/,
    '后端判定高级筛选未生效时必须从请求中剔除全部高级条件'
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
