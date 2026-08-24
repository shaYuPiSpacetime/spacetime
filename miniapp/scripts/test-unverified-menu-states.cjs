/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const repoRoot = path.resolve(root, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')
const readRepo = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

test('基础准入完成后千寻默认进入成家同城', () => {
  const index = read('src/pages/index/index.tsx')
  const family = read('src/features/qianxun/QianxunFamilyPage.tsx')

  assert.match(index, /coreAccessStatus === 'NON_CORE_ONLY'/, '千寻入口必须允许基础准入完成用户浏览内容')
  assert.match(index, /if \(contentAllowed\) return <QianxunFamilyPage \/>/, '基础准入完成后必须渲染千寻内容页')
  assert.match(family, /readRequestedScene\(\) \|\| 'CITY'/, '千寻成家默认二级 Tab 必须为同城')
  assert.match(family, /useState<Partial<Record<CommunityScene, boolean>>>\(\{ CITY: true \}\)/, '千寻首屏加载态必须与同城默认场景一致')
})

test('共享未认证弹窗只保留一份真实组件实现', () => {
  const modal = read('src/components/UnverifiedCertificationModal.tsx')
  const navigation = read('src/features/verification/navigateToVerification.ts')

  assert.match(modal, /id="common-unverified-modal"/, '共享弹窗缺少稳定运行态节点')
  assert.match(modal, /id="common-unverified-confirm"/, '立即认证按钮缺少稳定运行态节点')
  assert.match(modal, />\s*立即认证\s*</, '共享弹窗必须展示立即认证')
  assert.match(modal, /qianxunVerifyNote/, '共享弹窗必须复用蓝湖未认证插画')
  assert.match(modal, /width: '268rpx', height: '259rpx'/, '蓝湖未认证插画必须按 536×518 的 2x 原始比例渲染')
  assert.doesNotMatch(modal, /opacity:\s*0|transparent.*onClick/s, '共享弹窗禁止使用透明热区冒充可见按钮')
  assert.match(navigation, /resolveVerificationOnboardingRoute/, '统一认证入口必须进入下一未完成认证步骤')

  for (const page of [
    'src/features/qianxun/QianxunFamilyPage.tsx',
    'src/features/qianxun/QianxunZhiyinTab.tsx',
    'src/pages/recommend/index.tsx',
    'src/pages/chat/index.tsx',
    'src/pages/heart/user.tsx',
    'src/pages/qianxun/topic.tsx',
    'src/pages/qianxun/post-detail.tsx',
  ]) {
    const source = read(page)
    assert.match(source, /UnverifiedCertificationModal/, `${page} 必须复用共享未认证弹窗`)
    assert.match(source, /navigateToPendingVerification/, `${page} 的立即认证必须使用统一路由`)
  }
})

test('心动两个 Tab 复用未认证页并直达认证', () => {
  const source = read('src/pages/community/index.tsx')

  assert.match(source, /coreAccessStatus === 'NON_CORE_ONLY'/, '心动页必须识别基础准入完成未认证状态')
  assert.match(source, /function HeartUnverifiedPage/, '心动页缺少共享未认证内容')
  assert.match(source, /对我心动/, '心动页缺少对我心动 Tab')
  assert.match(source, /最近访客/, '心动页缺少最近访客 Tab')
  assert.match(source, /去完善资料和认证/, '心动未认证页缺少认证主按钮')
  assert.match(source, /onRightIconClick=\{onVerify\}/, '未认证状态不得从右上入口绕过认证')
})

test('推荐和理想型业务动作均受未认证弹窗保护', () => {
  const source = read('src/pages/recommend/index.tsx')
  const service = readRepo('backend/src/main/java/com/spacetime/miniapp/service/impl/RecommendServiceImpl.java')

  assert.match(service, /String opposite = GenderEnum\.MALE\.getCode\(\)\.equals\(current\.getGender\(\)\)/, '推荐必须依据准入性别计算异性目标')
  assert.match(service, /\.eq\(AppUser::getGender, opposite\)/, '推荐候选查询必须限制为异性')
  assert.match(source, /const runCertifiedAction =/, '推荐页缺少统一认证动作守卫')
  for (const callback of ['onHistory', 'onPreference', 'onOpen', 'onShare', 'onIp', 'onCertification', 'onSkip', 'onConversation', 'onLike']) {
    assert.match(source, new RegExp(`${callback}=\\{\\(\\) => runCertifiedAction`), `推荐页 ${callback} 未接入认证守卫`)
  }
  assert.match(source, /onChoose=\{\(\) => runCertifiedAction/, '选择理想型必须弹出未认证弹窗')
})

test('消息未认证页保留四类入口并仅拦截悄悄话和私信', () => {
  const source = read('src/pages/chat/index.tsx')

  assert.match(source, /coreAccessStatus === 'NON_CORE_ONLY'/, '消息页必须识别基础准入完成未认证状态')
  for (const label of ['悄悄话', '私信', '官方小助手', '系统消息']) {
    assert.match(source, new RegExp(label), `消息未认证页缺少${label}`)
  }
  assert.match(source, /onRestrictedAction=\{!certified/, '悄悄话和私信必须接入认证弹窗')
  assert.match(source, /onRestrictedAction \? onRestrictedAction\(\) : Taro\.navigateTo/g, '消息双入口必须在未认证时阻断真实列表跳转')
})

test('我的未认证页提供设置、稍后返回同城和立即完善', () => {
  const profile = read('src/pages/profile/index.tsx')
  const view = read('src/features/verification/VerificationEntryView.tsx')
  const uploader = read('scripts/upload-miniapp-oss-icons.mjs')

  assert.match(view, /id="profile-unverified-settings"/, '我的未认证页缺少左上设置按钮')
  assert.match(view, /getNativeNavigationMetrics/, '我的未认证设置按钮必须读取微信原生胶囊坐标')
  assert.match(view, /top: `\$\{nativeNavigationMetrics\.menuTop\}rpx`/, '设置按钮必须与原生胶囊上边线对齐')
  assert.match(view, /height: `\$\{nativeNavigationMetrics\.menuHeight\}rpx`/, '设置按钮必须与原生胶囊垂直居中')
  assert.match(profile, /onSettings=\{\(\) => void goToSettings\(\)\}/, '设置按钮必须进入设置页')
  assert.match(profile, /setStorageSync\('qianxun_requested_scene', 'CITY'\)/, '稍后再说必须指定千寻同城场景')
  assert.match(profile, /switchTab\(\{ url: '\/pages\/index\/index' \}\)/, '稍后再说必须回到千寻首页')
  assert.match(profile, /onContinue=\{\(\) => void continueVerification\(\)\}/, '立即完善必须继续认证流程')
  assert.match(uploader, /qianxunVerifyNote: 'src\/assets\/lanhu\/unverified-modal\/mcp-2026-08-24\/icon-1\.png'/, '未认证插画必须引用本轮蓝湖 MCP 无损切图')
})
