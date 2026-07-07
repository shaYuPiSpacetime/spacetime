import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const sourceFiles = [
  'src/pages/login/age.tsx',
  'src/pages/verification/components/BasicInfoCard.tsx',
  'src/pages/verification/components/BasicPickerPage.tsx',
  'src/pages/verification/education-student.tsx',
  'src/pages/verification/education-diploma-no.tsx',
  'src/pages/verification/education-certificate-upload.tsx',
]

function read(relativePath) {
  const fullPath = path.join(rootDir, relativePath)
  assert.ok(fs.existsSync(fullPath), `文件不存在: ${relativePath}`)
  return fs.readFileSync(fullPath, 'utf8')
}

for (const relativePath of sourceFiles) {
  const source = read(relativePath)
  assert.ok(!/<Picker\b|<PickerView\b|<PickerViewColumn\b/.test(source), `${relativePath} 仍残留原生 Picker/PickerView JSX`)
  assert.ok(!/from '@tarojs\/components'[^\n]*\bPicker(View|ViewColumn)?\b/.test(source), `${relativePath} 仍从 Taro 引入原生 Picker/PickerView`)
}

const sharedPicker = read('src/pages/verification/components/LanhuPickerSheet.tsx')
const shellSource = read('src/pages/verification/components/VerificationShell.tsx')
assert.ok(sharedPicker.includes('LanhuOptionSheet'), '缺少蓝湖单列选择弹窗')
assert.ok(sharedPicker.includes('LanhuDualColumnSheet'), '缺少蓝湖双列选择弹窗')
assert.ok(sharedPicker.includes('LanhuDateSheet'), '缺少蓝湖日期选择弹窗')
assert.ok(shellSource.includes("borderRadius: '64rpx 64rpx 0 0'"), '蓝湖选择弹窗圆角不符合稿件')
assert.ok(sharedPicker.includes("'#E3F1FE'"), '蓝湖选择弹窗缺少选中横条样式')

const tabsSource = read('src/pages/verification/components/EducationVerificationShared.tsx')
assert.ok(tabsSource.includes('completedKeys'), '认证状态 Tabs 需要支持前序完成态')
assert.ok(tabsSource.includes("active === 'realName'") && tabsSource.includes("active === 'education'"), '认证状态 Tabs 缺少实名/学历前序点亮逻辑')

const realNameSource = read('src/pages/verification/real-name.tsx')
assert.ok(realNameSource.includes('DEFAULT_REAL_NAME'), '实名认证页需要默认测试姓名')
assert.ok(realNameSource.includes('DEFAULT_ID_CARD'), '实名认证页需要默认测试身份证号')
assert.ok(realNameSource.includes('useState(true)'), '实名认证协议需要默认勾选')

const educationStudentSource = read('src/pages/verification/education-student.tsx')
assert.ok(educationStudentSource.includes('DEFAULT_SCHOOL_NAME'), '学历认证页需要默认测试学校')
assert.ok(educationStudentSource.includes('DEFAULT_UPLOAD_PATH'), '学历认证页需要默认上传占位')
assert.ok(educationStudentSource.includes('LanhuOptionSheet'), '学历认证页需要使用自定义蓝湖弹窗')

const appTabSource = read('src/components/AppTabBar/index.tsx')
assert.ok(appTabSource.includes('TAB_ICON_COLORS'), '底部 icon 需要按蓝湖状态重绘/着色')
assert.ok(appTabSource.includes('TabIcon'), '底部 icon 需要使用统一图标组件')

const indexSource = read('src/pages/index/index.tsx')
assert.ok(indexSource.includes('CertificationArtwork'), '未认证首页需要使用专门认证插画组件')
assert.ok(indexSource.includes('ProfileCompletionArtwork'), '完善资料切图需要独立组件')

const profileEditSource = read('src/pages/profile/edit.tsx')
const appConfigSource = read('src/app.config.ts')
const editProfileAssetPath = path.join(rootDir, 'src/assets/lanhu/profile/edit-profile-blueprint-750.png')
assert.ok(!fs.existsSync(editProfileAssetPath), '编辑资料页禁止整页切图，需使用可接后台的动态组件')
assert.ok(!profileEditSource.includes('edit-profile-blueprint-750.png'), '编辑资料页禁止引用整页蓝湖截图')
assert.ok(!/mode="widthFix"[\s\S]{0,120}editProfileBlueprint|editProfileBlueprint[\s\S]{0,120}mode="widthFix"/.test(profileEditSource), '编辑资料页禁止整页 Image 等比铺图')
assert.ok(profileEditSource.includes('profileDemo.editProfile'), '编辑资料页需要使用结构化资料数据，方便后续接后台')
assert.ok(profileEditSource.includes('<Input'), '编辑资料页微信号等字段需要保留可输入能力')
assert.ok(profileEditSource.includes('handleProfileAction'), '编辑资料页所有按钮需要统一点击处理，不能只展示')
assert.ok(profileEditSource.includes('handlePhotoClick'), '更多照片每一个上传位都需要可点击')
assert.ok(profileEditSource.includes('onChangePhoto'), '顶部更换照片按钮需要可点击')
assert.ok(profileEditSource.includes('profilePhotos'), '更多照片需要使用结构化状态承载上传结果')
assert.ok(profileEditSource.includes('Taro.chooseImage'), '头像和更多照片点击后需要走选择图片能力')
assert.ok(!profileEditSource.includes('TextEditSheet'), '关于我必须跳转独立页面，编辑资料页禁止临时文本弹窗')
assert.ok(!profileEditSource.includes('TagSheet'), '我的标签必须跳转独立页面，编辑资料页禁止临时标签弹窗')
assert.ok(!/profile\/edit\?variant=(songs|about|voice-delete|voice-delete-success|profile)/.test(profileEditSource), '歌曲/关于我/语音删除/资料填写禁止继续塞进 profile/edit variant')
assert.ok(profileEditSource.includes("/pages/profile-edit/intro"), '自我介绍需要跳转独立页面')
assert.ok(profileEditSource.includes("/pages/profile-edit/tags"), '我的标签需要跳转独立页面')
assert.ok(profileEditSource.includes("/pages/profile-edit/about?topic=meet"), '关于我见面便好需要跳转独立页面')
assert.ok(profileEditSource.includes("/pages/profile-edit/songs"), '爱听的歌曲需要跳转独立页面')
assert.ok(profileEditSource.includes("/pages/profile-edit/voice?variant=voice"), '语音介绍需要跳转独立页面')
assert.ok(profileEditSource.includes("/pages/verification/basic"), '基础资料需要跳转基本资料 UI')
assert.ok(profileEditSource.includes('data-role="hero-main-photo"'), '头像区需要还原主照片结构')
assert.ok(profileEditSource.includes('data-role="hero-mini-avatar"'), '头像区需要还原小头像结构')
for (const componentName of [
  'EditProfileNavBar',
  'ProfileScoreCard',
  'ProfileHeroCard',
  'PhotoUploadGrid',
  'ProfileSection',
  'BasicInfoSection',
  'CertificationSection',
  'AboutMeSection',
  'SongSection',
  'WechatSection',
]) {
  assert.ok(profileEditSource.includes(componentName), `编辑资料页缺少动态模块组件: ${componentName}`)
}
assert.ok(appConfigSource.indexOf("'pages/profile/edit'") < appConfigSource.indexOf("'pages/login/index'"), '小程序启动页需要优先进入编辑资料')

console.log('认证与编辑资料 UI 静态校验通过')
