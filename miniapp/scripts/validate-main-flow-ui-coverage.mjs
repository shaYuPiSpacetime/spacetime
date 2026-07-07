import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataPath = path.join(rootDir, 'src/data/lanhuDemo.json')
const appConfigPath = path.join(rootDir, 'src/app.config.ts')

const REQUIRED_UI_DESIGNS = {
  verification: [
    '认证-基本资料',
    '认证-添加头像',
    '认证-添加头像-选择相册',
    '认证-添加头像-裁剪照片',
    '认证-添加头像-头像审核',
    '认证-自我介绍',
    '认证-自我介绍-填写内容',
    '认证-三重认证',
    '三重认证-实名认证-身份证',
    '三重认证-学历认证在校学生',
    '三重认证-学历认证中国大陆',
    '学信网验证编码',
    '毕业证或者学位证书编号',
    '上传毕业证或学位证书',
  ],
  membership: [
    '会员中心-会员未开通，支付按钮固定下方',
    '会员中心-已开通',
    '会员中心-已过期',
    '会员中心-连续包年',
    '会员记录',
  ],
  coins: [
    '千寻币',
    '千寻币-协议勾选',
    '千寻币-点支付未勾选协议',
    '千寻币明细',
    '千寻币明细-暂无数据',
  ],
  profile: [
    '我的',
    '我的会员开通状态',
    '我的会员已过期状态',
    '我的标签',
  ],
}

const SOURCE_EVIDENCE = [
  {
    label: '认证基础资料到头像',
    route: '/pages/verification/basic',
    snippets: ["stage=\"basic\"", "/pages/verification/avatar", 'BasicInfoCard'],
  },
  {
    label: '基本资料底部弹层样式',
    file: 'src/pages/verification/components/VerificationShell.tsx',
    snippets: [
      'BottomPicker',
      "borderRadius: '64rpx 64rpx 0 0'",
      "boxShadow: '0 -10rpx 30rpx rgba(11, 38, 90, 0.10)'",
      "borderRadius: '28rpx'",
    ],
  },
  {
    label: '基本资料行和选择器提示',
    file: 'src/pages/verification/components/BasicInfoCard.tsx',
    snippets: [
      'PICKER_HINTS',
      'renderPickerHint',
      "borderRadius: '24rpx'",
      "background: '#F6F9FE'",
    ],
  },
  {
    label: '认证头像切图',
    route: '/pages/verification/avatar',
    snippets: ['avatar-good.webp', 'avatar-bad.webp', 'chooseAndCropAvatar', 'AvatarExampleCard', '审核不通过示例'],
  },
  {
    label: '实名认证点亮态',
    route: '/pages/verification/real-name',
    snippets: ['useRouter', "variant === 'active'", 'realNameCompleted', 'verificationDemo.realNameActive', '实名认证已点亮', '请输入身份证号'],
  },
  {
    label: '三重认证切图和分支',
    route: '/pages/verification/triple',
    snippets: ['cert-avatar.webp', 'cert-realname.webp', 'cert-education.webp', 'CERT_ITEMS', 'COMPLETED_CERT_TITLES', 'completed={COMPLETED_CERT_TITLES.includes(item.title)}', '已完成'],
  },
  {
    label: '学信网步骤切图',
    route: '/pages/verification/education-chsi-help',
    snippets: ['chsi-step-1.webp', 'chsi-step-2.webp', 'chsi-step-3.webp', 'chsi-step-4.webp'],
  },
  {
    label: '上传证书切图入口',
    route: '/pages/verification/education-certificate-upload',
    snippets: ['UploadProofBox', 'educationUploadLocalPath'],
  },
  {
    label: '会员中心状态变体和 mock 支付',
    route: '/pages/membership/index',
    snippets: ['member-vip-bg.webp', 'variant ===', 'expiredMembership', 'confirmPay', '立即续费'],
  },
  {
    label: '会员记录列表和退款态',
    route: '/pages/membership/records',
    snippets: ['已退款', 'RecordCard', 'filteredRecords'],
  },
  {
    label: '成家币协议变体和 mock 支付',
    route: '/pages/coins/index',
    snippets: ['coin-balance-bg.webp', 'agreementChecked', 'unchecked-error', 'purchase'],
  },
  {
    label: '成家币明细空态',
    route: '/pages/coins/detail',
    snippets: ['variant ===', 'forceEmpty', '暂无交易记录'],
  },
  {
    label: '我的页切图和会员状态',
    route: '/pages/profile/index',
    snippets: ['profile-bg.webp', 'vip-banner.webp', 'variant ===', 'membershipVariant'],
  },
  {
    label: '我的编辑资料闭环',
    route: '/pages/profile/edit',
    snippets: ['ProfileEditPage', 'submitProfile', 'navigateBack', 'MY_TAG_GROUPS', 'profileDemo.tagGroups', 'profileDemo.defaultSelectedTags', 'selectedTags', 'toggleTag', '保存标签'],
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

function assertVariantImplemented(route, variant, label) {
  if (!variant || variant === 'default') return
  const sourcePath = sourcePathForRoute(route)
  assert.ok(fs.existsSync(sourcePath), `${label} 页面文件不存在: ${path.relative(rootDir, sourcePath)}`)
  const source = fs.readFileSync(sourcePath, 'utf8')
  assert.ok(
    source.includes(`'${variant}'`) || source.includes(`"${variant}"`),
    `${label} 页面未显式处理 variant=${variant}`,
  )
}

function assertAsset(assetRef, label) {
  const assetPath = path.join(rootDir, assetRef)
  assert.ok(fs.existsSync(assetPath), `${label} 引用资产不存在: ${assetRef}`)
}

function assertSourceEvidence() {
  for (const item of SOURCE_EVIDENCE) {
    const sourcePath = item.file ? path.join(rootDir, item.file) : sourcePathForRoute(item.route)
    assert.ok(fs.existsSync(sourcePath), `${item.label} 页面文件不存在: ${path.relative(rootDir, sourcePath)}`)
    const source = fs.readFileSync(sourcePath, 'utf8')
    for (const snippet of item.snippets) {
      assert.ok(source.includes(snippet), `${item.label} 缺少源码证据: ${snippet}`)
    }
  }
}

const data = readJson(dataPath)
const routeSet = readAppRoutes()

for (const [section, designNames] of Object.entries(REQUIRED_UI_DESIGNS)) {
  const uiDesigns = data[section]?.uiDesigns
  assert.ok(Array.isArray(uiDesigns), `${section}.uiDesigns 必须是数组`)
  assert.ok(uiDesigns.length >= designNames.length, `${section}.uiDesigns 数量不足`)

  const coveredNames = new Set(uiDesigns.map((item) => item.designName))
  for (const designName of designNames) {
    assert.ok(coveredNames.has(designName), `${section}.uiDesigns 缺少设计稿: ${designName}`)
  }

  for (const item of uiDesigns) {
    assert.equal(typeof item.key, 'string', `${section}.${item.designName} 缺少 key`)
    assert.equal(typeof item.variant, 'string', `${section}.${item.designName} 缺少 variant`)
    assert.equal(typeof item.description, 'string', `${section}.${item.designName} 缺少 description`)
    assertRoute(routeSet, item.route, `${section}.${item.designName}`)
    assertVariantImplemented(item.route, item.variant, `${section}.${item.designName}`)

    const design = data.designs.find((candidate) => candidate.name === item.designName)
    assert.ok(design, `manifest 缺少设计稿: ${item.designName}`)
    assert.equal(design.status, 'implemented', `${item.designName} 必须标记为 implemented`)
    assert.equal(design.route, item.route, `${item.designName} manifest route 必须和 uiDesigns 一致`)
    assert.ok(Array.isArray(design.assetRefs), `${item.designName} assetRefs 必须是数组`)
    assert.ok(design.assetRefs.length > 0, `${item.designName} 必须关联至少 1 个切图或蓝湖参考资产`)
    for (const assetRef of design.assetRefs) {
      assertAsset(assetRef, item.designName)
    }
  }
}

assertSourceEvidence()
assert.ok(Array.isArray(data.verification?.completedCertTitles), 'verification.completedCertTitles 必须是数组')
assert.ok(data.verification?.realNameActive?.realName, 'verification.realNameActive.realName 不能为空')
assert.ok(data.profile?.tagGroups?.length > 0, 'profile.tagGroups 不能为空')
assert.ok(data.profile?.defaultSelectedTags?.length > 0, 'profile.defaultSelectedTags 不能为空')

console.log('主闭环 UI 覆盖校验通过')
