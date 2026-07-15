const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const miniappRoot = path.resolve(__dirname, '..')
const flowPath = path.join(miniappRoot, 'src/domain/verificationOnboardingFlow.ts')

function read(relativePath) {
  return fs.readFileSync(path.join(miniappRoot, relativePath), 'utf8')
}

async function loadFlowModule() {
  assert.ok(fs.existsSync(flowPath), '缺少认证强引导状态机')
  const source = fs.readFileSync(flowPath, 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('未认证入口严格按基本资料、头像、自我介绍、三重认证续传', async () => {
  const { resolveVerificationOnboardingRoute } = await loadFlowModule()

  assert.equal(resolveVerificationOnboardingRoute({ basicCompleted: false }), '/pages/verification/basic')
  assert.equal(resolveVerificationOnboardingRoute({ basicCompleted: true, avatarStatus: 'NOT_SUBMITTED' }), '/pages/verification/avatar')
  assert.equal(resolveVerificationOnboardingRoute({ basicCompleted: true, avatarStatus: 'REJECTED' }), '/pages/verification/avatar')
  assert.equal(resolveVerificationOnboardingRoute({ basicCompleted: true, avatarStatus: 'PENDING', introductionStatus: 'NOT_SUBMITTED' }), '/pages/verification/intro')
  assert.equal(resolveVerificationOnboardingRoute({ basicCompleted: true, avatarStatus: 'APPROVED', introductionStatus: 'REJECTED' }), '/pages/verification/intro')
  assert.equal(resolveVerificationOnboardingRoute({ basicCompleted: true, avatarStatus: 'PENDING', introductionStatus: 'PENDING' }), '/pages/verification/triple')
  assert.equal(resolveVerificationOnboardingRoute({ basicCompleted: true, avatarStatus: 'APPROVED', introductionStatus: 'APPROVED' }), '/pages/verification/triple')
})

test('部分资料态排除首登轻量字段并由接口字段配置计算', async () => {
  const { hasPartialBasicProfile } = await loadFlowModule()
  const initFields = [
    { submitFields: ['gender'] },
    { submitFields: ['birthday'] },
    { submitFields: ['locationProvince', 'locationCity'] },
  ]
  const fieldSettings = [
    { fieldId: 'gender', visible: true },
    { fieldId: 'birthday', visible: true },
    { fieldId: 'nickname', visible: true },
    { fieldId: 'occupation', visible: true },
    { fieldId: 'hiddenField', visible: false },
  ]

  assert.equal(hasPartialBasicProfile({ gender: 'FEMALE', birthday: '1997-03-06' }, fieldSettings, initFields), false)
  assert.equal(hasPartialBasicProfile({ gender: 'FEMALE', nickname: '千寻' }, fieldSettings, initFields), true)
  assert.equal(hasPartialBasicProfile({ occupation: 'DESIGNER' }, fieldSettings, initFields), true)
  assert.equal(hasPartialBasicProfile({ hiddenField: 'ignored' }, fieldSettings, initFields), false)
})

test('首页三项勾选严格使用真实完成状态', async () => {
  const { resolveCertificationChecklist } = await loadFlowModule()

  assert.deepEqual(
    resolveCertificationChecklist({
      basicCompleted: true,
      avatarStatus: 'APPROVED',
      introductionStatus: 'PENDING',
      verifyLevel: 2,
    }),
    { basic: true, avatarIntro: true, triple: false },
  )
  assert.deepEqual(
    resolveCertificationChecklist({
      basicCompleted: true,
      avatarStatus: 'PENDING',
      introductionStatus: 'REJECTED',
      verifyLevel: 3,
    }),
    { basic: true, avatarIntro: false, triple: true },
  )
})

test('六个蓝湖状态必须保留既有四步外壳和返回刷新', () => {
  const index = read('src/pages/index/index.tsx')
  const basic = read('src/pages/verification/basic.tsx')
  const avatar = read('src/pages/verification/avatar.tsx')
  const avatarReview = read('src/pages/verification/avatar-review.tsx')
  const intro = read('src/pages/verification/intro.tsx')
  const triple = read('src/pages/verification/triple.tsx')

  assert.match(index, /useDidShow/)
  assert.match(index, /getIntroduction\(\)/)
  assert.match(index, /PartialCertificationPanel/)
  assert.match(index, /resolveVerificationOnboardingRoute/)
  assert.doesNotMatch(index, /basicProfileCompleted === false[\s\S]{0,160}pages\/profile\/edit/)

  assert.match(basic, /stage="basic"/)
  assert.match(basic, /primaryText=.*verification_next_action/)
  assert.match(basic, /navigateBackOrRedirect\('\/pages\/index\/index'\)/)
  assert.doesNotMatch(basic, /title: '暂不认证'/)

  assert.match(avatar, /VerificationShell/)
  assert.match(avatar, /stage="avatar"/)
  assert.match(avatar, /AvatarGuide/)
  assert.doesNotMatch(avatar, /VerificationSubShell/)

  assert.match(avatarReview, /pages\/verification\/intro/)
  assert.doesNotMatch(avatarReview, /pages\/verification\/triple/)

  assert.match(intro, /VerificationShell/)
  assert.match(intro, /stage="intro"/)
  assert.match(intro, /getIntroduction\(\)/)
  assert.match(intro, /submitIntroduction/)
  assert.match(intro, /pages\/verification\/triple/)
  assert.doesNotMatch(intro, /pages\/profile-edit\/intro/)

  assert.match(triple, /VerificationCenterPage onboarding/)
  assert.doesNotMatch(triple, /VerificationSubShell/)

  const verificationCenter = read('src/pages/verification/components/VerificationCenterPage.tsx')
  assert.match(verificationCenter, /VerificationShell stage="triple"/)
  assert.match(verificationCenter, /onboarding/)
})

test('蓝湖关键几何尺寸和构建门禁不可回退', () => {
  const shell = read('src/pages/verification/components/VerificationShell.tsx')
  const index = read('src/pages/index/index.tsx')
  const packageJson = JSON.parse(read('package.json'))
  const prebuild = packageJson.scripts['prebuild:weapp']

  assert.match(shell, /top: '382rpx'/)
  assert.match(shell, /width: '700rpx'/)
  assert.match(shell, /height: '156rpx'/)
  assert.match(shell, /width: '620rpx'/)
  assert.match(index, /top: '1098rpx'/)
  assert.match(prebuild, /test-verification-onboarding-flow\.cjs/)
  assert.match(prebuild, /validate-page-entry-isolation\.mjs/)
})
