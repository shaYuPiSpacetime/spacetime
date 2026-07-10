import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataPath = path.join(rootDir, 'src/data/lanhuDemo.json')
const appConfigPath = path.join(rootDir, 'src/app.config.ts')

const REQUIRED_LOGIN_DESIGNS = [
  { name: '选择脱单目标', route: '/pages/login/gender?variant=goal', variant: 'goal' },
  {
    name: '手机号登录-错误提示',
    route: '/pages/login/phone?variant=phone-error',
    variant: 'phone-error',
  },
]

const REQUIRED_PROFILE_DESIGNS = [
  { name: '主页预览', route: '/pages/profile/index?variant=preview', variant: 'preview' },
  { name: '编辑资料-资料填写', route: '/pages/profile/edit', variant: 'default' },
  { name: '我的标签', route: '/pages/profile-edit/tags', variant: 'default' },
  { name: '自我介绍', route: '/pages/profile-edit/intro', variant: 'default' },
  { name: '爱听的歌曲', route: '/pages/profile-edit/songs', variant: 'default' },
  {
    name: '爱听的歌曲-添加成功',
    route: '/pages/profile-edit/songs?variant=added',
    variant: 'added',
  },
  { name: '关于我', route: '/pages/profile-edit/about', variant: 'default' },
  { name: '感情状态', route: '/pages/profile/edit?variant=relationship', variant: 'relationship' },
  { name: '见面便好（样式复用）', route: '/pages/profile-edit/about?topic=meet', variant: 'meet' },
  {
    name: '编辑资料-语音介绍删除提醒',
    route: '/pages/profile/edit?voice=delete',
    variant: 'delete',
  },
  { name: '语音介绍-删除提示', route: '/pages/profile/edit?voice=delete', variant: 'delete' },
  {
    name: '编辑资料-语音删除成功提示',
    route: '/pages/profile/edit?voice=delete-success',
    variant: 'delete-success',
  },
]

const REQUIRED_VOICE_DESIGNS = [
  { name: '语音介绍', route: '/pages/profile/edit?voice=voice', variant: 'voice' },
  { name: '语音介绍-录制中', route: '/pages/profile/edit?voice=recording', variant: 'recording' },
  { name: '语音介绍-退出录音', route: '/pages/profile/edit?voice=exit', variant: 'exit' },
  { name: '语音介绍-点击播放', route: '/pages/profile/edit?voice=play', variant: 'play' },
  { name: '语音介绍-录制完成', route: '/pages/profile/edit?voice=complete', variant: 'complete' },
  { name: '语音介绍-删除提示', route: '/pages/profile/edit?voice=delete', variant: 'delete' },
]

const REQUIRED_VERIFICATION_DESIGNS = [
  { name: '我的认证', route: '/pages/verification/my-certification', variant: 'my-certification' },
]

const SOURCE_EVIDENCE = [
  {
    label: '登录脱单目标选择',
    route: '/pages/login/gender',
    snippets: [
      'GoalChoicePanel',
      "variant === 'goal'",
      'goalOptions',
      'datingGoal',
      '见面便好',
      "borderRadius: '48rpx'",
      "borderRadius: '98rpx'",
    ],
  },
  {
    label: '手机号登录错误态',
    route: '/pages/login/phone',
    snippets: [
      "variant === 'phone-error'",
      'phoneLoginErrorVisible',
      '你输入的手机号有误',
      "borderRadius: '63rpx'",
      'phoneLoginErrorVisible',
      "borderRadius: '4rpx'",
    ],
  },
  {
    label: '主页预览状态',
    route: '/pages/profile/index',
    snippets: [
      "router.params.variant === 'preview'",
      'ProfilePreviewPage',
      'navigateBackOrRedirect',
    ],
  },
  {
    label: '编辑资料入口页',
    route: '/pages/profile/edit',
    snippets: [
      'profileDemo.editProfile',
      'AboutMeSection',
      'VoiceSection',
      'VoiceIntroSheet',
      'voiceSheet',
      'setVoiceSheet',
      '/pages/profile-edit/intro',
      '/pages/profile-edit/tags',
      '/pages/profile-edit/about?topic=meet',
      '/pages/profile-edit/songs',
      '/pages/verification/my-certification',
      '/pages/verification/basic',
    ],
  },
  {
    label: '自我介绍独立页',
    snippets: [
      'ProfileEditIntroPage',
      'profileDemo.editProfile.intro',
      '>保存</Text>',
      '介绍下自己的性格、习惯、有点、缺点',
      "borderRadius: '8rpx'",
    ],
    route: '/pages/profile-edit/intro',
  },
  {
    label: '我的标签独立页',
    route: '/pages/profile-edit/tags',
    snippets: [
      'ProfileEditTagsPage',
      'profileDemo.tagGroups',
      'selectedTags',
      'activeCategory',
      "width: '206rpx'",
      '展开⌃',
      'navigateBackOrRedirect',
      "borderRadius: '12rpx'",
    ],
  },
  {
    label: '关于我独立页',
    route: '/pages/profile-edit/about',
    snippets: [
      'ProfileEditAboutPage',
      'profileDemo.editProfile.aboutTopics',
      'aboutTabs',
      'activeTopicKey',
      'setActiveTopicKey',
      '见面便好',
      'navigateBackOrRedirect',
    ],
  },
  {
    label: '爱听的歌曲独立页',
    route: '/pages/profile-edit/songs',
    snippets: [
      'ProfileEditSongsPage',
      'profileDemo.editProfile.favoriteSongs',
      "variant === 'added'",
      'searchKeyword',
      'SongRecord',
      'navigateBackOrRedirect',
      "borderRadius: '98rpx'",
    ],
  },
  {
    label: '语音介绍底部弹窗',
    route: '/pages/profile/edit',
    snippets: [
      'VoiceIntroSheet',
      'type VoiceSheetVariant',
      "'recording'",
      "'exit'",
      "'play'",
      "'complete'",
      "'delete'",
      "'delete-success'",
      "borderRadius: '64rpx 64rpx 0 0'",
      'VoiceRoundButton',
      'VoiceActionButton',
    ],
  },
  {
    label: '我的认证新页面',
    route: '/pages/verification/my-certification',
    snippets: [
      'MyCertificationPage',
      '为什么要认证',
      'CertStatusCard',
      'navigateBackOrRedirect',
      '更新认证',
    ],
  },
]

function readJson(filePath) {
  assert.ok(fs.existsSync(filePath), `缺少数据文件: ${path.relative(rootDir, filePath)}`)
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readAppRoutes() {
  const content = fs.readFileSync(appConfigPath, 'utf8')
  const routeSet = new Set()
  const pageMatches = [...content.matchAll(/'([^']+)'/g)].map(match => match[1])
  const topLevelPages = pageMatches.filter(value => value.startsWith('pages/'))
  for (const page of topLevelPages) {
    routeSet.add(`/${page}`)
  }

  const subPackageBlocks = [
    ...content.matchAll(/root:\s*'([^']+)'[\s\S]*?pages:\s*\[([\s\S]*?)\]/g),
  ]
  for (const [, root, pageBlock] of subPackageBlocks) {
    const pages = [...pageBlock.matchAll(/'([^']+)'/g)].map(match => match[1])
    for (const page of pages) {
      routeSet.add(`/${root}/${page}`)
    }
  }

  return routeSet
}

function cleanRoute(route) {
  return route.split('?')[0]
}

function sourcePathForRoute(route) {
  return path.join(rootDir, 'src', `${cleanRoute(route).replace('/pages/', 'pages/')}.tsx`)
}

function assertRoute(routeSet, route, label) {
  assert.equal(typeof route, 'string', `${label} 缺少 route`)
  assert.ok(routeSet.has(cleanRoute(route)), `${label} 路由未注册: ${route}`)
}

function assertCoverage(data, section, requiredItems) {
  const uiDesigns = data[section]?.uiDesigns
  assert.ok(Array.isArray(uiDesigns), `${section}.uiDesigns 必须是数组`)

  for (const required of requiredItems) {
    const item = uiDesigns.find(candidate => candidate.designName === required.name)
    assert.ok(item, `${section}.uiDesigns 缺少设计稿: ${required.name}`)
    assert.equal(item.route, required.route, `${required.name} route 必须为 ${required.route}`)
    assert.equal(
      item.variant,
      required.variant,
      `${required.name} variant 必须为 ${required.variant}`
    )

    const design = data.designs.find(candidate => candidate.name === required.name)
    assert.ok(design, `manifest 缺少设计稿: ${required.name}`)
    assert.equal(design.status, 'implemented', `${required.name} 必须标记为 implemented`)
    assert.equal(
      design.route,
      required.route,
      `${required.name} manifest route 必须和 uiDesigns 一致`
    )
  }
}

function assertSourceEvidence() {
  for (const item of SOURCE_EVIDENCE) {
    const sourcePath = sourcePathForRoute(item.route)
    assert.ok(
      fs.existsSync(sourcePath),
      `${item.label} 页面文件不存在: ${path.relative(rootDir, sourcePath)}`
    )
    const source = fs.readFileSync(sourcePath, 'utf8')
    for (const snippet of item.snippets) {
      assert.ok(source.includes(snippet), `${item.label} 缺少源码证据: ${snippet}`)
    }
  }
}

const data = readJson(dataPath)
const routeSet = readAppRoutes()

for (const item of [
  ...REQUIRED_LOGIN_DESIGNS,
  ...REQUIRED_PROFILE_DESIGNS,
  ...REQUIRED_VOICE_DESIGNS,
]) {
  assertRoute(routeSet, item.route, item.name)
}

assertCoverage(data, 'login', REQUIRED_LOGIN_DESIGNS)
assertCoverage(data, 'profile', REQUIRED_PROFILE_DESIGNS)
assertCoverage(data, 'verification', REQUIRED_VOICE_DESIGNS)
assertCoverage(data, 'verification', REQUIRED_VERIFICATION_DESIGNS)

assert.ok(data.login?.guestMode?.variants?.guest, 'login.guestMode.variants.guest 缺失')
assert.ok(data.login?.guestMode?.variants?.['guest-alt'], 'login.guestMode.variants.guest-alt 缺失')
assert.ok(data.login?.phoneLogin?.errorText, 'login.phoneLogin.errorText 缺失')
const loginIndexSource = fs.readFileSync(sourcePathForRoute('/pages/login/index'), 'utf8')
assert.ok(!loginIndexSource.includes('GuestModePanel'), '登录页禁止恢复游客模式入口组件')
assert.ok(!loginIndexSource.includes("variant === 'guest'"), '登录页禁止恢复游客模式 variant')
assert.ok(
  !loginIndexSource.includes("variant === 'guest-alt'"),
  '登录页禁止恢复游客模式二次 variant'
)
assert.ok(data.profile?.preview?.ctaText, 'profile.preview.ctaText 缺失')
assert.ok(
  data.profile?.editProfile?.basicFields?.length > 0,
  'profile.editProfile.basicFields 缺失'
)
assert.ok(
  data.profile?.editProfile?.favoriteSongs?.options?.length > 0,
  'profile.editProfile.favoriteSongs.options 缺失'
)
assert.ok(data.profile?.editProfile?.aboutMe?.value, 'profile.editProfile.aboutMe.value 缺失')
assert.ok(data.profile?.editProfile?.intro?.value, 'profile.editProfile.intro.value 缺失')
assert.ok(
  data.profile?.editProfile?.aboutTopics?.length > 0,
  'profile.editProfile.aboutTopics 缺失'
)
assert.ok(
  data.profile?.editProfile?.relationshipStatus?.options?.length > 0,
  'profile.editProfile.relationshipStatus.options 缺失'
)
assert.ok(
  data.profile?.editProfile?.voiceIntro?.deleteConfirmText,
  'profile.editProfile.voiceIntro.deleteConfirmText 缺失'
)
assert.ok(
  data.profile?.editProfile?.voiceIntro?.states?.complete?.duration,
  'profile.editProfile.voiceIntro.states.complete.duration 缺失'
)
assert.equal(
  data.profile?.editProfile?.voiceIntro?.states?.recording?.title,
  '录制中',
  '语音录制中状态文案缺失'
)
assert.equal(
  data.profile?.editProfile?.voiceIntro?.states?.exit?.title,
  '退出录音',
  '语音退出录音状态文案缺失'
)
assert.equal(
  data.profile?.editProfile?.voiceIntro?.states?.complete?.title,
  '录制完成',
  '语音录制完成状态文案缺失'
)

const profileEditSource = fs.readFileSync(sourcePathForRoute('/pages/profile/edit'), 'utf8')
const forbiddenVoiceRoute = ['/pages/profile-edit', '/voice'].join('')
assert.ok(
  !profileEditSource.includes(forbiddenVoiceRoute),
  '编辑资料页禁止再跳转语音独立页面，语音介绍必须使用蓝湖底部弹窗'
)
const forbiddenProfileVariantPrefix = ['profile/edit', '?variant='].join('')
assert.ok(
  !profileEditSource.includes(`${forbiddenProfileVariantPrefix}songs`),
  '爱听歌曲禁止回退到编辑页 variant'
)
assert.ok(
  !profileEditSource.includes(`${forbiddenProfileVariantPrefix}about`),
  '关于我禁止回退到编辑页 variant'
)
assert.ok(
  profileEditSource.includes('ProfilePreviewTopNav'),
  '编辑资料与主页预览必须复用顶部双标签组件'
)
assert.ok(
  profileEditSource.includes('/pages/profile/index?variant=preview'),
  '编辑资料页主页预览标签必须进入预览路由'
)

const profilePreviewSource = fs.readFileSync(sourcePathForRoute('/pages/profile/index'), 'utf8')
assert.ok(
  !profilePreviewSource.includes('.lanhu-ref/lanhu-full-2026-07-07/images/03-主页预览.webp'),
  '主页预览禁止运行时引用整页蓝湖参考图'
)
assert.ok(
  !profilePreviewSource.includes('PreviewProfileCard'),
  '主页预览不能继续使用简化提示卡代替完整公开资料页'
)

const profilePreviewComponentPath = path.join(
  rootDir,
  'src/pages/profile/components/ProfilePreviewPage.tsx'
)
assert.ok(fs.existsSync(profilePreviewComponentPath), '主页预览缺少独立长页组件')
const profilePreviewComponentSource = fs.readFileSync(profilePreviewComponentPath, 'utf8')
for (const snippet of [
  'ProfilePreviewTopNav',
  'ProfilePreviewHero',
  'ProfilePreviewBasicInfo',
  'ProfilePreviewTagSection',
  'ProfilePreviewPhoto',
  'ProfilePreviewCertification',
  'ProfilePreviewSong',
  'ProfilePreviewMbti',
  'profileDemo.preview',
  "borderRadius: '24rpx'",
  "borderRadius: '98rpx'",
]) {
  assert.ok(profilePreviewComponentSource.includes(snippet), `主页预览长页缺少结构证据: ${snippet}`)
}
assert.ok(
  !profilePreviewComponentSource.includes(
    '.lanhu-ref/lanhu-full-2026-07-07/images/03-主页预览.webp'
  ),
  '主页预览组件禁止引用整页蓝湖参考图'
)

const profilePreviewNavPath = path.join(rootDir, 'src/components/ProfilePreviewTopNav.tsx')
assert.ok(fs.existsSync(profilePreviewNavPath), '编辑资料与主页预览缺少共享顶部双标签组件')
const profilePreviewNavSource = fs.readFileSync(profilePreviewNavPath, 'utf8')
assert.ok(
  profilePreviewNavSource.includes('getMenuButtonBoundingClientRect'),
  '共享顶部导航必须按微信胶囊计算安全区'
)
assert.ok(profilePreviewNavSource.includes("label: '主页预览'"), '共享顶部导航缺少主页预览标签')

assertSourceEvidence()

console.log('资料/游客/语音 UI 覆盖校验通过')
