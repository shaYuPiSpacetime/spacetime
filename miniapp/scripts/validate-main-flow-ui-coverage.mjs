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
      'FIELD_OPTION_KEYS',
      'profileOptions',
      "copy('common_select_placeholder')",
      "borderRadius: '36rpx'",
      'verificationCardStyle',
    ],
  },
  {
    label: '认证头像切图',
    route: '/pages/verification/avatar',
    snippets: ['miniappOssIcons.verificationAvatarGuidePortrait', 'chooseAndCropAvatar', 'AvatarExampleCard', "copy('avatar_invalid_title')", 'profileOptions?.avatarSource'],
  },
  {
    label: '实名认证点亮态',
    route: '/pages/verification/real-name',
    snippets: ['getRealName', 'submitRealName', 'VerificationRuntimeBoundary', "copy('real_name_id_placeholder')", 'real-name-submit-button'],
  },
  {
    label: '三重认证切图和分支',
    file: 'src/pages/verification/components/VerificationCenterPage.tsx',
    snippets: ['miniappOssIcons.verificationCertAvatar', 'miniappOssIcons.verificationCertRealName', 'miniappOssIcons.verificationCertEducation', 'CERT_ITEMS', "auditStatus === 'APPROVED'", '<RoundCheck />'],
  },
  {
    label: '学信网步骤切图',
    file: 'src/pages/verification/components/EducationSubmitPage.tsx',
    snippets: ['verificationChsiStep1', 'verificationChsiStep2', 'verificationChsiStep3', 'verificationChsiStep4'],
  },
  {
    label: '上传证书切图入口',
    file: 'src/pages/verification/components/EducationSubmitPage.tsx',
    snippets: ['UploadProofBox', 'materialPreviewUrls', 'verificationUploadCamera', 'prd01Api.uploadEducation'],
  },
  {
    label: '会员中心状态和支付闭环',
    route: '/pages/membership/index',
    snippets: [
      'miniappOssIcons.memberBenefitMatch',
      'useMembership',
      "status === 'expired'",
      'confirmPay',
      "payState === 'paying'",
      'agreementChecked',
    ],
  },
  {
    label: '会员记录列表和退款态',
    route: '/pages/membership/records',
    snippets: ['已退款', 'RecordCard', 'filteredRecords'],
  },
  {
    label: '千寻币协议和支付闭环',
    route: '/pages/coins/index',
    snippets: [
      'miniappOssIcons.coinGold',
      'agreementChecked',
      'agreementError',
      "purchase('coins')",
      "payState === 'paying'",
    ],
  },
  {
    label: '千寻币明细空态',
    route: '/pages/coins/detail',
    snippets: ['transactions', 'filtered.length === 0', '<CoinNoDataState />', 'qianxunEmptyChart'],
  },
  {
    label: '我的页切图和会员状态',
    route: '/pages/profile/index',
    snippets: [
      'miniappOssIcons.profileCertification',
      'miniappOssIcons.profileBoostButton',
      'membershipVariant',
      "membershipVariant === 'none'",
      "status === 'expired'",
    ],
  },
  {
    label: '我的编辑资料闭环',
    route: '/pages/profile/edit',
    snippets: ['ProfilePreviewTopNav', 'prd01Api.getHomeDetail', 'mergeAlbumSlots', 'PROFILE_UPDATED_EVENT', 'selectedTags', 'handlePhotoClick', '/pages/profile-edit/tags', 'ProfilePreviewPage'],
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
  if (variant === 'my-certification') {
    const requiredSnippets = [
      'VerificationRuntimeBoundary',
      "copy('verification_detail_heading')",
      'data-role="certification-detail-card"',
      'prd01Api.getVerificationStatus()',
    ]
    for (const snippet of requiredSnippets) {
      assert.ok(source.includes(snippet), `${label} 独立页面缺少源码证据: ${snippet}`)
    }
    return
  }
  if (variant === 'wechat-pay' && source.includes('payState') && source.includes("payState === 'paying'")) return
  if (variant === 'paid' && source.includes('orderStatusLabel') && source.includes("status === 'success'")) return
  if (variant === 'checked' && source.includes('agreementChecked')) return
  if (variant === 'unchecked-error' && source.includes('agreementError')) return
  if (variant === 'empty' && source.includes('filtered.length === 0') && source.includes('<EmptyState />')) return
  if (variant === 'preview' && source.includes('setShowPreview(true)') && source.includes('<ProfilePreviewPage')) return
  if (variant === 'added' && source.includes('saveFavoriteSong') && source.includes("title: '保存成功'")) return
  if (cleanRoute(route) === '/pages/profile-edit/about' && source.includes('router.params.topic') && source.includes('activeTopicKey')) return
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
