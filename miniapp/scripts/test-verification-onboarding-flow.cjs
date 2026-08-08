/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

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
  const verificationEntry = read('src/features/verification/VerificationEntryView.tsx')
  const basic = read('src/pages/verification/basic.tsx')
  const avatar = read('src/pages/verification/avatar.tsx')
  const avatarReview = read('src/pages/verification/avatar-review.tsx')
  const intro = read('src/pages/verification/intro.tsx')
  const triple = read('src/pages/verification/triple.tsx')

  assert.match(index, /useDidShow/)
  assert.match(index, /getIntroduction\(\)/)
  assert.match(index, /VerificationEntryView/)
  assert.match(verificationEntry, /PartialCertificationPanel/)
  assert.match(index, /resolveVerificationOnboardingRoute/)
  assert.doesNotMatch(index, /basicProfileCompleted === false[\s\S]{0,160}pages\/profile\/edit/)

  assert.match(basic, /stage="basic"/)
  assert.match(basic, /primaryText=.*verification_next_action/)
  assert.match(basic, /navigateBackOrRedirect\('\/pages\/index\/index'\)/)
  assert.doesNotMatch(basic, /title: '暂不认证'/)

  assert.match(avatar, /VerificationShell/)
  assert.match(avatar, /stage="avatar"/)
  assert.match(avatar, /AvatarGuide/)
  assert.match(avatar, /navigateBackOrRedirect\('\/pages\/index\/index'\)/)
  assert.doesNotMatch(avatar, /VerificationSubShell/)

  assert.match(avatarReview, /pages\/verification\/intro/)
  assert.doesNotMatch(avatarReview, /pages\/verification\/triple/)

  assert.match(intro, /VerificationShell/)
  assert.match(intro, /stage="intro"/)
  assert.match(intro, /getIntroduction\(\)/)
  assert.match(intro, /submitIntroduction/)
  assert.match(intro, /pages\/verification\/triple/)
  assert.match(intro, /navigateBackOrRedirect\('\/pages\/index\/index'\)/)
  assert.doesNotMatch(intro, /pages\/profile-edit\/intro/)

  assert.match(triple, /VerificationCenterPage onboarding/)
  assert.doesNotMatch(triple, /VerificationSubShell/)

  const verificationCenter = read('src/pages/verification/components/VerificationCenterPage.tsx')
  assert.match(verificationCenter, /VerificationShell stage="triple"/)
  assert.match(verificationCenter, /onboarding/)
  assert.match(verificationCenter, /navigateBackOrRedirect\('\/pages\/index\/index'\)/)
})

test('蓝湖关键几何尺寸和构建门禁不可回退', () => {
  const shell = read('src/pages/verification/components/VerificationShell.tsx')
  const verificationEntry = read('src/features/verification/VerificationEntryView.tsx')
  const packageJson = JSON.parse(read('package.json'))
  const prebuild = packageJson.scripts['prebuild:weapp']

  assert.match(shell, /top: '382rpx'/)
  assert.match(shell, /width: '700rpx'/)
  assert.match(shell, /height: '156rpx'/)
  assert.match(shell, /width: '620rpx'/)
  assert.match(verificationEntry, /id="verification-entry-actions"[\s\S]{0,220}marginTop: '1098rpx'/)
  assert.doesNotMatch(verificationEntry, /id="verification-entry-actions"[\s\S]{0,220}position: 'absolute'/)
  assert.match(prebuild, /test-verification-onboarding-flow\.cjs/)
  assert.match(prebuild, /validate-page-entry-isolation\.mjs/)
})

test('认证后半段使用真实裁剪、审核态和安全区固定按钮', () => {
  const shell = read('src/pages/verification/components/VerificationShell.tsx')
  const crop = read('src/pages/verification/avatar-crop.tsx')
  const review = read('src/pages/verification/avatar-review.tsx')
  const avatar = read('src/pages/verification/avatar.tsx')

  assert.match(shell, /position: 'fixed'/)
  assert.match(shell, /safe-area-inset-bottom/)
  assert.match(crop, /MovableArea/)
  assert.match(crop, /MovableView/)
  assert.match(crop, /Canvas/)
  assert.match(crop, /canvasToTempFilePath/)
  assert.doesNotMatch(crop, /uploadAvatar\(path\)/)
  assert.match(review, /VerificationShell/)
  assert.match(review, /stage="avatar"/)
  assert.match(avatar, /verificationAvatarInvalidNonPerson/)
  assert.match(avatar, /verificationAvatarInvalidLandscape/)
  assert.match(avatar, /verificationAvatarInvalidBlurred/)
  assert.match(avatar, /verificationAvatarInvalidNoFace/)
})

test('实名提交续接学历分流且学历页面保留三步与双分段', () => {
  const flow = read('src/domain/verificationOnboardingFlow.ts')
  const realName = read('src/pages/verification/real-name.tsx')
  const student = read('src/pages/verification/education-student.tsx')
  const mainland = read('src/pages/verification/education-mainland.tsx')
  const educationSubmit = read('src/pages/verification/components/EducationSubmitPage.tsx')

  assert.match(flow, /resolveEducationEntryRoute/)
  assert.match(realName, /VerificationStatusTabs/)
  assert.match(realName, /resolveEducationEntryRoute/)
  assert.match(realName, /getEducation\(\)/)
  assert.doesNotMatch(realName, /redirectTo\(\{ url: '\/pages\/verification\/triple'/)
  assert.match(student, /EducationSubmitPage/)
  assert.match(educationSubmit, /VerificationStatusTabs/)
  assert.match(educationSubmit, /EducationTabs/)
  assert.match(mainland, /VerificationStatusTabs/)
  assert.match(mainland, /EducationTabs/)
  assert.match(mainland, /education_method_chsi_desc/)
  assert.match(mainland, /education_method_diploma_no_desc/)
  assert.match(mainland, /education_method_material_upload_desc/)
})

test('在校学生学历认证严格保持资料卡、提交、协议、客服的蓝湖顺序', () => {
  const educationSubmit = read('src/pages/verification/components/EducationSubmitPage.tsx')
  const educationShared = read('src/pages/verification/components/EducationVerificationShared.tsx')
  const standardFormStart = educationSubmit.indexOf('function StandardForm')
  const studentForm = educationSubmit.slice(standardFormStart)

  assert.ok(educationSubmit.indexOf('<SubmitButton') < educationSubmit.indexOf('<AgreementRow'), '提交按钮必须渲染在协议上方')
  assert.match(educationSubmit, /STUDENT_CARD:\s*'1258rpx'/, '在校学生提交按钮纵坐标必须对齐蓝湖')
  assert.match(educationSubmit, /STUDENT_CARD:\s*'1382rpx'/, '在校学生协议纵坐标必须对齐蓝湖')
  assert.match(educationShared, /position:\s*'absolute'/, '学历提交按钮必须跟随页面内容定位')
  assert.doesNotMatch(educationShared, /position:\s*'fixed'[\s\S]{0,180}safe-area-inset-bottom/, '学历提交按钮不得固定覆盖协议和客服区')
  assert.match(studentForm, /isStudent[\s\S]{0,800}<UploadProofBox/, '在校学生无材料时必须使用蓝湖大尺寸上传区')
  assert.match(studentForm, /minHeight:\s*isStudent\s*\?\s*'725rpx'/, '在校学生资料卡必须保留蓝湖背景分割高度')
})

test('部分资料态图标全部来自蓝湖官方切图并走 OSS 常量', () => {
  const verificationEntry = read('src/features/verification/VerificationEntryView.tsx')
  const icons = read('src/constants/ossIcons.ts')

  assert.match(verificationEntry, /miniappOssIcons\.verificationProfileBasic/)
  assert.match(verificationEntry, /miniappOssIcons\.verificationProfileAvatarIntro/)
  assert.match(verificationEntry, /miniappOssIcons\.verificationProfileTriple/)
  assert.doesNotMatch(verificationEntry, /function ChecklistIcon/)
  assert.match(icons, /verificationProfileBasic/)
  assert.match(icons, /verificationProfileAvatarIntro/)
  assert.match(icons, /verificationProfileTriple/)
})
