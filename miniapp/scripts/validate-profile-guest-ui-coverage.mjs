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
  { name: '游客模式', route: '/pages/login/index?variant=guest', variant: 'guest' },
  { name: '游客模式-1', route: '/pages/login/index?variant=guest-alt', variant: 'guest-alt' },
  { name: '手机号登录-错误提示', route: '/pages/login/phone?variant=phone-error', variant: 'phone-error' },
]

const REQUIRED_PROFILE_DESIGNS = [
  { name: '主页预览', route: '/pages/profile/index?variant=preview', variant: 'preview' },
  { name: '编辑资料-资料填写', route: '/pages/profile/edit', variant: 'default' },
  { name: '我的标签', route: '/pages/profile-edit/tags', variant: 'default' },
  { name: '自我介绍', route: '/pages/profile-edit/intro', variant: 'default' },
  { name: '爱听的歌曲', route: '/pages/profile-edit/songs', variant: 'default' },
  { name: '爱听的歌曲-添加成功', route: '/pages/profile-edit/songs?variant=added', variant: 'added' },
  { name: '关于我', route: '/pages/profile-edit/about', variant: 'default' },
  { name: '感情状态', route: '/pages/profile/edit?variant=relationship', variant: 'relationship' },
  { name: '见面便好（样式复用）', route: '/pages/profile-edit/about?topic=meet', variant: 'meet' },
  { name: '编辑资料-语音介绍删除提醒', route: '/pages/profile-edit/voice?variant=delete', variant: 'delete' },
  { name: '语音介绍-删除提示', route: '/pages/profile-edit/voice?variant=delete', variant: 'delete' },
  { name: '编辑资料-语音删除成功提示', route: '/pages/profile-edit/voice?variant=delete-success', variant: 'delete-success' },
]

const REQUIRED_VOICE_DESIGNS = [
  { name: '语音介绍', route: '/pages/profile-edit/voice?variant=voice', variant: 'voice' },
  { name: '语音介绍-录制中', route: '/pages/profile-edit/voice?variant=recording', variant: 'recording' },
  { name: '语音介绍-退出录音', route: '/pages/profile-edit/voice?variant=exit', variant: 'exit' },
  { name: '语音介绍-点击播放', route: '/pages/profile-edit/voice?variant=play', variant: 'play' },
  { name: '语音介绍-录制完成', route: '/pages/profile-edit/voice?variant=complete', variant: 'complete' },
  { name: '语音介绍-删除提示', route: '/pages/profile-edit/voice?variant=delete', variant: 'delete' },
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
    label: '登录游客模式',
    route: '/pages/login/index',
    snippets: [
      'GuestModePanel',
      "variant === 'guest'",
      "variant === 'guest-alt'",
      'loginDemo.guestMode',
      "borderRadius: '98rpx'",
      "borderRadius: '58rpx'",
      "borderRadius: '48rpx'",
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
      'PreviewProfileCard',
      'profileDemo.preview',
      "borderRadius: '64rpx'",
      "borderRadius: '98rpx'",
    ],
  },
  {
    label: '编辑资料入口页',
    route: '/pages/profile/edit',
    snippets: [
      'profileDemo.editProfile',
      'AboutMeSection',
      'VoiceSection',
      "/pages/profile-edit/intro",
      "/pages/profile-edit/tags",
      "/pages/profile-edit/about?topic=meet",
      "/pages/profile-edit/songs",
      "/pages/profile-edit/voice?variant=voice",
      "/pages/verification/basic",
    ],
  },
  {
    label: '自我介绍独立页',
    snippets: [
      'ProfileEditIntroPage',
      'profileDemo.editProfile.intro',
      '保存自我介绍',
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
      "borderRadius: '12rpx'",
    ],
  },
  {
    label: '关于我独立页',
    route: '/pages/profile-edit/about',
    snippets: [
      'ProfileEditAboutPage',
      'profileDemo.editProfile.aboutTopics',
      'topic ===',
      '见面便好',
    ],
  },
  {
    label: '爱听的歌曲独立页',
    route: '/pages/profile-edit/songs',
    snippets: [
      'ProfileEditSongsPage',
      'profileDemo.editProfile.favoriteSongs',
      "variant === 'added'",
      "borderRadius: '98rpx'",
    ],
  },
  {
    label: '语音介绍录制状态',
    route: '/pages/profile-edit/voice',
    snippets: [
      'ProfileEditVoicePage',
      'profileDemo.editProfile.voiceIntro',
      "variant === 'voice'",
      "variant === 'recording'",
      "variant === 'exit'",
      "variant === 'play'",
      "variant === 'complete'",
      "variant === 'delete'",
      "borderRadius: '64rpx 64rpx 0 0'",
      "borderRadius: '98rpx'",
      '录制中',
      '退出录音',
      '录制完成',
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
  const pageMatches = [...content.matchAll(/'([^']+)'/g)].map((match) => match[1])
  const topLevelPages = pageMatches.filter((value) => value.startsWith('pages/'))
  for (const page of topLevelPages) {
    routeSet.add(`/${page}`)
  }

  const subPackageBlocks = [...content.matchAll(/root:\s*'([^']+)'[\s\S]*?pages:\s*\[([\s\S]*?)\]/g)]
  for (const [, root, pageBlock] of subPackageBlocks) {
    const pages = [...pageBlock.matchAll(/'([^']+)'/g)].map((match) => match[1])
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
    const item = uiDesigns.find((candidate) => candidate.designName === required.name)
    assert.ok(item, `${section}.uiDesigns 缺少设计稿: ${required.name}`)
    assert.equal(item.route, required.route, `${required.name} route 必须为 ${required.route}`)
    assert.equal(item.variant, required.variant, `${required.name} variant 必须为 ${required.variant}`)

    const design = data.designs.find((candidate) => candidate.name === required.name)
    assert.ok(design, `manifest 缺少设计稿: ${required.name}`)
    assert.equal(design.status, 'implemented', `${required.name} 必须标记为 implemented`)
    assert.equal(design.route, required.route, `${required.name} manifest route 必须和 uiDesigns 一致`)
  }
}

function assertSourceEvidence() {
  for (const item of SOURCE_EVIDENCE) {
    const sourcePath = sourcePathForRoute(item.route)
    assert.ok(fs.existsSync(sourcePath), `${item.label} 页面文件不存在: ${path.relative(rootDir, sourcePath)}`)
    const source = fs.readFileSync(sourcePath, 'utf8')
    for (const snippet of item.snippets) {
      assert.ok(source.includes(snippet), `${item.label} 缺少源码证据: ${snippet}`)
    }
  }
}

const data = readJson(dataPath)
const routeSet = readAppRoutes()

for (const item of [...REQUIRED_LOGIN_DESIGNS, ...REQUIRED_PROFILE_DESIGNS, ...REQUIRED_VOICE_DESIGNS]) {
  assertRoute(routeSet, item.route, item.name)
}

assertCoverage(data, 'login', REQUIRED_LOGIN_DESIGNS)
assertCoverage(data, 'profile', REQUIRED_PROFILE_DESIGNS)
assertCoverage(data, 'verification', REQUIRED_VOICE_DESIGNS)

assert.ok(data.login?.guestMode?.variants?.guest, 'login.guestMode.variants.guest 缺失')
assert.ok(data.login?.guestMode?.variants?.['guest-alt'], 'login.guestMode.variants.guest-alt 缺失')
assert.ok(data.login?.phoneLogin?.errorText, 'login.phoneLogin.errorText 缺失')
assert.ok(data.profile?.preview?.ctaText, 'profile.preview.ctaText 缺失')
assert.ok(data.profile?.editProfile?.basicFields?.length > 0, 'profile.editProfile.basicFields 缺失')
assert.ok(data.profile?.editProfile?.favoriteSongs?.options?.length > 0, 'profile.editProfile.favoriteSongs.options 缺失')
assert.ok(data.profile?.editProfile?.aboutMe?.value, 'profile.editProfile.aboutMe.value 缺失')
assert.ok(data.profile?.editProfile?.intro?.value, 'profile.editProfile.intro.value 缺失')
assert.ok(data.profile?.editProfile?.aboutTopics?.length > 0, 'profile.editProfile.aboutTopics 缺失')
assert.ok(data.profile?.editProfile?.relationshipStatus?.options?.length > 0, 'profile.editProfile.relationshipStatus.options 缺失')
assert.ok(data.profile?.editProfile?.voiceIntro?.deleteConfirmText, 'profile.editProfile.voiceIntro.deleteConfirmText 缺失')
assert.ok(data.profile?.editProfile?.voiceIntro?.states?.complete?.duration, 'profile.editProfile.voiceIntro.states.complete.duration 缺失')

assertSourceEvidence()

console.log('资料/游客/语音 UI 覆盖校验通过')
