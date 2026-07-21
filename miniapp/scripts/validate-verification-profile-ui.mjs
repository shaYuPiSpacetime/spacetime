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

const profileEditPages = [
  'src/pages/profile-edit/intro.tsx',
  'src/pages/profile-edit/tags.tsx',
  'src/pages/profile-edit/about.tsx',
  'src/pages/profile-edit/songs.tsx',
]

function read(relativePath) {
  const fullPath = path.join(rootDir, relativePath)
  assert.ok(fs.existsSync(fullPath), `文件不存在: ${relativePath}`)
  return fs.readFileSync(fullPath, 'utf8')
}

function getJpegSize(filePath) {
  const buffer = fs.readFileSync(filePath)
  let offset = 2
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = buffer[offset + 1]
    const length = buffer.readUInt16BE(offset + 2)
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      }
    }
    offset += 2 + length
  }
  throw new Error(`无法读取 JPEG 尺寸: ${filePath}`)
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
assert.ok(realNameSource.includes('getRealName'), '实名认证页必须从接口回显姓名和状态')
assert.ok(realNameSource.includes("useState('')"), '实名认证页禁止内置测试身份信息')
assert.ok(realNameSource.includes("copy('real_name_name_placeholder')"), '实名认证姓名提示必须读取运行时文案')
assert.ok(realNameSource.includes("copy('real_name_id_placeholder')"), '实名认证证件提示必须读取运行时文案')
assert.ok(realNameSource.includes('useState(false)'), '实名认证协议不得替用户默认勾选')

const educationStudentSource = read('src/pages/verification/education-student.tsx')
const educationSubmitSource = read('src/pages/verification/components/EducationSubmitPage.tsx')
assert.ok(educationStudentSource.includes('EducationSubmitPage'), '学历认证学生页必须复用接口驱动提交页')
assert.ok(educationSubmitSource.includes('getEducation'), '学历认证页必须从接口回显表单和审核状态')
assert.ok(educationSubmitSource.includes('profileOptions?.educationLevel'), '学历枚举必须读取接口字典')
assert.ok(educationSubmitSource.includes('LanhuOptionSheet'), '学历认证页需要使用自定义蓝湖弹窗')

const appTabSource = read('src/components/AppTabBar/index.tsx')
const appConfigSource = read('src/app.config.ts')
assert.ok(appTabSource.includes("import tabHomeIcon from '@/assets/icons/tab-home.png'"), '底部千寻 icon 必须使用蓝湖切图')
assert.ok(appTabSource.includes("import tabHomeActiveIcon from '@/assets/icons/tab-home-active.png'"), '底部千寻点亮态必须使用蓝湖切图')
assert.ok(appTabSource.includes("import tabWorkIcon from '@/assets/icons/tab-work.png'"), '底部心动 icon 必须使用蓝湖切图')
assert.ok(appTabSource.includes("import tabWorkActiveIcon from '@/assets/icons/tab-work-active.png'"), '底部心动点亮态必须使用蓝湖心电爱心切图，禁止误用公文包 SVG')
assert.ok(appTabSource.includes("import tabRecommendIcon from '@/assets/icons/tab-recommend.png'"), '底部推荐 icon 必须使用蓝湖切图')
assert.ok(appTabSource.includes("import tabMessageIcon from '@/assets/icons/tab-message.png'"), '底部消息 icon 必须使用蓝湖切图')
assert.ok(appTabSource.includes("import tabMessageActiveIcon from '@/assets/icons/tab-message-active.png'"), '底部消息点亮态必须使用蓝湖切图')
assert.ok(appTabSource.includes("import tabProfileIcon from '@/assets/icons/tab-profile.png'"), '底部我的普通态 icon 必须使用蓝湖切图')
assert.ok(appTabSource.includes("import tabProfileActiveIcon from '@/assets/icons/tab-profile-active.png'"), '底部我的点亮态 icon 必须使用蓝湖切图')
assert.ok(
  appTabSource.includes("key: 'community', label: '心动', path: '/pages/community/index', iconPath: tabWorkIcon, activeIconPath: tabWorkActiveIcon"),
  '底部心动必须按普通态/点亮态映射两套蓝湖切图',
)
assert.doesNotMatch(appTabSource, /showActiveDot|width: '18rpx'[\s\S]{0,100}background: '#2876FF'/, '点亮切图已自带蓝色高光，禁止再叠加通用蓝点')
assert.match(appConfigSource, /pagePath: 'pages\/community\/index'[\s\S]{0,180}selectedIconPath: 'assets\/icons\/tab-work-active\.png'/, '原生 Tab 配置的心动点亮态也必须指向蓝湖切图')
assert.ok(
  appTabSource.includes("key: 'profile', label: '我的', path: '/pages/profile/index', iconPath: tabProfileIcon, activeIconPath: tabProfileActiveIcon"),
  '底部我的 icon 必须按普通态/点亮态映射蓝湖切图',
)
assert.ok(appTabSource.includes('<Image'), '底部 icon 必须渲染切图 Image')
assert.ok(appTabSource.includes('mode="aspectFit"'), '底部 icon 切图必须完整展示')
assert.ok(!appTabSource.includes('function TabIcon'), '底部 icon 禁止继续使用手绘 TabIcon')
assert.ok(!appTabSource.includes('TAB_ICON_COLORS'), '底部 icon 禁止继续用颜色重绘替代切图')

const indexSource = read('src/pages/index/index.tsx')
assert.ok(indexSource.includes('CertificationArtwork'), '未认证首页需要使用专门认证插画组件')
assert.ok(indexSource.includes('qianxunCenterImage'), '千寻首页中心图必须使用用户提供的新切图')
assert.ok(indexSource.includes('qianxun-center.png'), '千寻首页中心图必须从 lanhu/pages/qianxun-center.png 引入')

const profileEditSource = read('src/pages/profile/edit.tsx')
const myCertificationSource = read('src/pages/verification/my-certification.tsx')
const navigationSource = read('src/utils/navigation.ts')
const subNavSource = read('src/components/LanhuSubNav.tsx')
const profileTopNavSource = read('src/components/ProfilePreviewTopNav.tsx')
const basicSource = read('src/pages/verification/basic.tsx')
const editProfileAssetPath = path.join(rootDir, 'src/assets/lanhu/profile/edit-profile-blueprint-750.png')
const editHeroPhotoAssetPath = path.join(rootDir, 'src/assets/lanhu/profile/edit-hero-photo.jpg')
assert.ok(!fs.existsSync(editProfileAssetPath), '编辑资料页禁止整页切图，需使用可接后台的动态组件')
assert.ok(!profileEditSource.includes('edit-profile-blueprint-750.png'), '编辑资料页禁止引用整页蓝湖截图')
assert.ok(fs.existsSync(editHeroPhotoAssetPath), '编辑资料主照片 demo 切片缺失')
const editHeroPhotoSize = getJpegSize(editHeroPhotoAssetPath)
assert.deepEqual(editHeroPhotoSize, { width: 716, height: 520 }, '编辑资料主照片必须使用无“更换照片”源按钮的干净 716x520 裁图')
assert.ok(profileEditSource.includes('editHeroPhoto'), '编辑资料主照片默认态必须使用独立照片切片而不是整页截图')
assert.ok(!/mode="widthFix"[\s\S]{0,120}editProfileBlueprint|editProfileBlueprint[\s\S]{0,120}mode="widthFix"/.test(profileEditSource), '编辑资料页禁止整页 Image 等比铺图')
assert.ok(profileEditSource.includes('profileDemo.editProfile'), '编辑资料页需要使用结构化资料数据，方便后续接后台')
assert.ok(profileEditSource.includes('<Input'), '编辑资料页微信号等字段需要保留可输入能力')
assert.ok(profileEditSource.includes('handleProfileAction'), '编辑资料页所有按钮需要统一点击处理，不能只展示')
assert.ok(profileEditSource.includes('handlePhotoClick'), '更多照片每一个上传位都需要可点击')
assert.ok(profileEditSource.includes('onChangePhoto'), '顶部更换照片按钮需要可点击')
assert.ok(profileEditSource.includes('profilePhotos'), '更多照片需要使用结构化状态承载上传结果')
assert.ok(profileEditSource.includes('Taro.chooseImage'), '头像和更多照片点击后需要走选择图片能力')
const forbiddenTextSheet = ['TextEdit', 'Sheet'].join('')
const forbiddenTagPanel = ['Tag', 'Sheet'].join('')
assert.ok(!profileEditSource.includes(forbiddenTextSheet), '关于我必须跳转独立页面，编辑资料页禁止临时文本弹窗')
assert.ok(!profileEditSource.includes(forbiddenTagPanel), '我的标签必须跳转独立页面，编辑资料页禁止临时标签弹窗')
assert.ok(!/profile\/edit\?variant=(songs|about|voice-delete|voice-delete-success|profile)/.test(profileEditSource), '歌曲/关于我/语音删除/资料填写禁止继续塞进 profile/edit variant')
assert.ok(profileEditSource.includes("/pages/profile-edit/intro"), '自我介绍需要跳转独立页面')
assert.ok(profileEditSource.includes("/pages/profile-edit/tags"), '我的标签需要跳转独立页面')
assert.ok(profileEditSource.includes("/pages/profile-edit/about?topic=meet"), '关于我见面便好需要跳转独立页面')
assert.ok(profileEditSource.includes("/pages/profile-edit/songs"), '爱听的歌曲需要跳转独立页面')
const forbiddenVoiceRoute = ['/pages/profile-edit', '/voice'].join('')
assert.ok(!profileEditSource.includes(forbiddenVoiceRoute), '语音介绍必须是编辑资料页蓝湖底部弹窗，禁止从编辑资料跳转语音独立页')
assert.ok(profileEditSource.includes('VoiceIntroSheet'), '语音介绍缺少蓝湖底部弹窗组件')
assert.ok(profileEditSource.includes('setVoiceSheet'), '语音介绍缺少弹窗状态流转')
assert.ok(profileEditSource.includes("/pages/verification/basic?from=profile"), '基础资料编辑入口需要跳转基本资料编辑态')
assert.ok(profileEditSource.includes("/pages/verification/my-certification"), '更新认证必须进入我的认证新 UI')
assert.ok(profileEditSource.includes('data-role="hero-main-photo"'), '头像区需要还原主照片结构')
assert.ok(profileEditSource.includes('data-role="hero-mini-avatar"'), '头像区需要还原小头像结构')
for (const componentName of [
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
assert.ok(appConfigSource.indexOf("'pages/login/index'") < appConfigSource.indexOf("'pages/profile/edit'"), '小程序启动页需要优先进入登录页')
assert.ok(appConfigSource.includes("'my-certification'"), '我的认证页面必须注册到 verification 分包')
assert.ok(!appConfigSource.includes("'voice'"), '语音介绍独立页不应再作为 profile-edit 可达页面注册')

const verificationCenterSource = read('src/pages/verification/components/VerificationCenterPage.tsx')
assert.ok(myCertificationSource.includes('CertificationDetailCard'), '我的认证页面缺少蓝湖独立详情卡片')
assert.ok(myCertificationSource.includes("copy('verification_detail_heading')"), '我的认证主标题必须读取运行时文案')
assert.ok(myCertificationSource.includes('getRealName()'), '我的认证页面缺少实名详情回显')
assert.ok(myCertificationSource.includes('getEducation()'), '我的认证页面缺少学历详情回显')
assert.ok(verificationCenterSource.includes('CERT_ITEMS'), '认证强引导中心缺少认证卡片配置')
assert.ok(navigationSource.includes('navigateBackOrRedirect'), '缺少统一返回工具')
assert.ok(navigationSource.includes('Taro.getCurrentPages()'), '统一返回工具必须先检查页面栈')
assert.ok(navigationSource.includes('Taro.navigateBack'), '统一返回工具必须优先 navigateBack')
assert.ok(navigationSource.includes('Taro.redirectTo'), '统一返回工具必须提供编辑资料兜底')
assert.ok(navigationSource.includes('Promise.resolve(backResult)'), '统一返回工具必须兼容 navigateBack 非 Promise 返回值')
assert.ok(myCertificationSource.includes('navigateBackOrRedirect'), '我的认证页面左上角必须使用统一返回工具')
assert.ok(subNavSource.includes('getMenuButtonBoundingClientRect'), '二级页导航必须按微信胶囊位置垂直对齐')
assert.ok(subNavSource.includes('getWindowMetrics'), '二级页导航必须使用窗口宽度换算 rpx')
assert.ok(subNavSource.includes('menuLeft'), '二级页标题必须按胶囊左侧预留安全区')
assert.ok(subNavSource.includes('zIndex: 99'), '二级页返回按钮需要高层级点击热区')
assert.ok(subNavSource.includes("left: '0'"), '二级页标题必须按整屏居中，不能被返回按钮或胶囊挤偏')
assert.ok(subNavSource.includes("width: '750rpx'"), '二级页标题必须保留整屏宽度以确保视觉居中')
assert.ok(subNavSource.includes("width: '24rpx'"), '二级页返回箭头需要按蓝湖尺寸缩小')
assert.ok(subNavSource.includes("height: '24rpx'"), '二级页返回箭头高度需要按蓝湖尺寸缩小')
const forbiddenCapsuleDots = ['•', '•', '•'].join('')
assert.ok(!myCertificationSource.includes(forbiddenCapsuleDots), '我的认证页面禁止自绘右上胶囊')
assert.ok(myCertificationSource.includes('LanhuSubNav'), '我的认证页面必须使用蓝湖二级导航外壳')
assert.ok(basicSource.includes("router.params.from === 'profile'"), '基本资料页需要识别编辑资料入口')
assert.ok(basicSource.includes("<LanhuSubNav title={copy('profile_basic_nav_title')}"), '基本资料编辑态标题必须读取运行时文案')
assert.ok(basicSource.includes("mode={fromProfile ? 'profileEdit' : 'verification'}"), '基本资料编辑态需要复用 BasicInfoCard 编辑布局')
assert.ok(basicSource.includes("copy('common_save_action')"), '基本资料编辑态底部按钮文案必须读取运行时配置')

for (const relativePath of profileEditPages) {
  const source = read(relativePath)
  assert.ok(source.includes('navigateBackOrRedirect'), `${relativePath} 必须支持左上角返回并兜底回编辑资料`)
  assert.ok(source.includes('LanhuSubNav'), `${relativePath} 必须使用共享二级导航，避免胶囊错位`)
  const forbiddenLocalSubNav = ['ProfileEdit', 'SubNav'].join('')
  assert.ok(!source.includes(forbiddenLocalSubNav), `${relativePath} 禁止保留本地二级导航副本`)
  assert.ok(!source.includes('Taro.redirectTo({ url: \'/pages/profile-edit'), `${relativePath} 页面内部禁止 redirectTo 破坏返回栈`)
}

const introSource = read('src/pages/profile-edit/intro.tsx')
assert.ok(introSource.includes('认真介绍自己，让 TA 更快了解你'), '自我介绍页面缺少蓝湖标题描述')
assert.ok(introSource.includes('写下你的自我介绍'), '自我介绍页面缺少输入提示')
assert.ok(introSource.includes(": '保存'"), '自我介绍页面按钮文案必须是保存')
const forbiddenIntroButtonText = ['保存自我', '介绍'].join('')
assert.ok(!introSource.includes(forbiddenIntroButtonText), '自我介绍页面禁止使用旧按钮文案')

const aboutSource = read('src/pages/profile-edit/about.tsx')
assert.ok(aboutSource.includes('aboutTabs'), '关于我页面需要顶部 tab 切换')
assert.ok(aboutSource.includes('activeTopicKey'), '关于我页面需要使用当前 tab 状态')
assert.ok(aboutSource.includes('setActiveTopicKey'), '关于我页面 tab 切换必须在当前页内完成')
assert.ok(aboutSource.includes('activeCategoryKey'), '关于我列表顶部分类 tab 需要独立状态，不能和编辑 topic 混用')
assert.ok(aboutSource.includes("title: '我是谁'"), '关于我顶部 tab 文案需要按蓝湖稿使用“我是谁”')
assert.ok(aboutSource.includes("title: '我的日常'"), '关于我顶部 tab 文案需要按蓝湖稿使用“我的日常”')
assert.ok(aboutSource.includes("title: '我的故事'"), '关于我顶部 tab 文案需要按蓝湖稿使用“我的故事”')
assert.ok(aboutSource.includes("title: '我热爱的'"), '关于我顶部 tab 文案需要按蓝湖稿使用“我热爱的”')
assert.ok(aboutSource.includes("const isAllTopic = activeTopicKey === 'all'"), '关于我页面需要区分列表态和编辑态，避免编辑态继续显示 tab 撑高页面')
assert.ok(aboutSource.includes("title={isAllTopic ? '关于我' : ''}"), '关于我编辑态顶部导航不应显示居中标题，需按见面便好稿展示大标题')
assert.ok(aboutSource.includes('{isAllTopic ? ('), '关于我顶部 tab 只应在列表态显示')
assert.ok(aboutSource.includes("height: 'calc(100vh - 260rpx)'"), '关于我列表态滚动区高度需要按蓝湖 tab 页释放')
assert.ok(aboutSource.includes("height: 'calc(100vh - 164rpx)'"), '关于我编辑态滚动区不应预留 tab 高度')
assert.ok(aboutSource.includes("padding: '0 25rpx 172rpx'"), '关于我列表态内容白卡需要紧贴分类区，禁止额外顶部空隙')
assert.ok(!aboutSource.includes("padding: '22rpx 25rpx 172rpx'"), '关于我列表态禁止保留 22rpx 顶部空隙')
assert.ok(aboutSource.includes("minHeight: '160rpx'"), '关于我列表卡片高度需要按蓝湖稿收紧')
assert.ok(!aboutSource.includes("minHeight: '168rpx'"), '关于我列表卡片禁止保留过高的 168rpx')
assert.ok(aboutSource.includes('data-role="about-topic-edit"'), '关于我编辑态需要独立容器按见面便好稿还原')

const tagsSource = read('src/pages/profile-edit/tags.tsx')
assert.ok(tagsSource.includes('activeCategory'), '我的标签页面需要蓝湖顶部分类 tab')
assert.ok(tagsSource.includes('selectedTags'), '我的标签页面需要可点击选中态')
assert.ok(tagsSource.includes("width: '206rpx'"), '我的标签必须是蓝湖三列卡片宽度')
assert.ok(tagsSource.includes("marginRight: (index + 1) % 3 === 0 ? '0' : '14rpx'"), '我的标签必须按三列排列')
assert.ok(tagsSource.includes("height: 'calc(100vh - 370rpx)'"), '我的标签内容滚动区高度需要按蓝湖稿释放，不能被旧 392rpx 压低')
assert.ok(!tagsSource.includes("height: 'calc(100vh - 392rpx)'"), '我的标签内容滚动区禁止保留旧 392rpx 高度')
assert.ok(tagsSource.includes("margin: '0 auto'"), '我的标签白色内容框必须紧贴分类区，禁止额外顶部空隙')
assert.ok(!tagsSource.includes("margin: '22rpx auto 0'"), '我的标签白色内容框禁止保留 22rpx 顶部空隙')
assert.ok(!tagsSource.includes('>保存</Text>'), '我的标签底部浮层不应出现保存按钮')

const songsSource = read('src/pages/profile-edit/songs.tsx')
assert.ok(songsSource.includes('searchKeyword'), '爱听歌曲页面需要搜索框状态')
assert.ok(songsSource.includes('SongRecord'), '爱听歌曲页面需要列表项组件化还原')
assert.ok(!songsSource.includes("Taro.redirectTo({ url: '/pages/profile-edit"), '爱听歌曲保存/成功态禁止 redirectTo 到 profile-edit 破坏返回栈')
assert.ok(profileEditSource.includes("justifyContent: 'space-between'"), '编辑资料添加行必须左文案右加号')
assert.ok(profileEditSource.includes('一段深情的告白'), '语音介绍描述必须对齐蓝湖文案')
assert.ok(profileEditSource.includes('ProfilePreviewTopNav'), '编辑资料顶部必须复用资料填写/主页预览双标题组件')
assert.ok(profileEditSource.includes('activeTab="form"'), '编辑资料顶部双标题需要正确标记编辑态')
assert.ok(profileTopNavSource.includes('menuTop'), '编辑资料顶部双标题需要读取微信胶囊 top 对齐中心')
assert.ok(profileTopNavSource.includes('menuHeight'), '编辑资料顶部双标题需要读取微信胶囊 height 对齐中心')
assert.ok(profileTopNavSource.includes('titleTabsTop'), '编辑资料顶部双标题需要按胶囊中心计算 top')
assert.ok(profileTopNavSource.includes('const activeLineHeight = 45'), '编辑资料顶部双标题文字行高必须纳入中心线计算')
assert.ok(profileTopNavSource.includes('const titleTabsTop = menuTop + (menuHeight - activeLineHeight) / 2'), '编辑资料顶部双标题必须按文字视觉中心对齐微信胶囊')
assert.ok(profileTopNavSource.includes("top: `${Math.max(0, menuTop - 20)}rpx`"), '编辑资料返回按钮点击热区需要从微信胶囊顶部向上扩展 20rpx')
assert.ok(profileTopNavSource.includes("height: `${menuHeight + 40}rpx`"), '编辑资料返回按钮点击热区需要上下对称扩展并保持与微信胶囊垂直同中心')
assert.ok(profileTopNavSource.includes("top: `${titleTabsTop}rpx`"), '编辑资料顶部双标题必须垂直对齐微信胶囊中心')
assert.ok(profileTopNavSource.includes("width: '22rpx'"), '编辑资料顶部返回箭头宽度必须匹配蓝湖尺寸')
assert.ok(!profileEditSource.includes('onMenu'), '编辑资料页禁止自绘右上胶囊，微信原生胶囊已存在')
assert.ok(!profileEditSource.includes('capsuleRight'), '编辑资料页禁止再计算并绘制右上胶囊')
assert.ok(!profileEditSource.includes("width: '174rpx'"), '编辑资料页禁止保留自绘右上胶囊尺寸')
assert.ok(profileEditSource.includes("background: 'rgba(0,0,0,0.58)'"), '更换照片按钮必须是黑底浮层')
assert.ok(profileEditSource.includes("color: '#FFFFFF'"), '更换照片按钮必须是白色文案')
assert.ok(profileEditSource.includes('HeroCertBadge'), '编辑资料头像区需要使用认证勾切图/组件')
assert.ok(profileEditSource.includes("mode=\"aspectFit\""), '编辑资料小头像必须完整展示，不能只显示左上角裁切')
assert.ok(!profileEditSource.includes("background: 'rgba(255,255,255,0.9)'"), '编辑资料照片底部信息禁止使用白色浮层')
assert.ok(profileEditSource.includes('SectionTitleDot'), '编辑资料每个模块标题必须带蓝色圆点')
assert.ok(profileEditSource.includes('PhotoUploadPlus'), '更多照片加号必须按蓝湖单独组件还原')
assert.ok(profileEditSource.includes('AddPromptPlus'), '脱单目标/我的标签加号必须按蓝湖单独组件还原')
assert.ok(profileEditSource.includes('BasicInfoIcon'), '基础资料缺少两行左侧图标')
assert.ok(profileEditSource.includes('CertificationIcon'), '认证信息缺少三行左侧切图')
assert.ok(profileEditSource.includes('miniappOssIcons.verificationCertAvatar'), '头像认证必须使用蓝湖头像认证切图')
assert.ok(profileEditSource.includes('miniappOssIcons.verificationCertRealName'), '实名认证必须使用蓝湖实名切图')
assert.ok(profileEditSource.includes('miniappOssIcons.verificationCertEducation'), '学历认证必须使用蓝湖学历切图')
assert.ok(profileEditSource.includes('CertifiedStatusIcon'), '认证信息右侧已认证必须使用独立蓝色盾牌勾状态图标')
assert.ok(!profileEditSource.includes('<HeroCertBadge compact />'), '认证信息右侧禁止复用头像区认证勾组件')
assert.ok(profileEditSource.includes('添加脱单目标，为你推荐目标一致的人'), '脱单目标文案必须按蓝湖稿')
assert.ok(!profileEditSource.includes('MbtiOrbChart'), '产品要求隐藏编辑资料 MBTI 模块')
assert.ok(profileEditSource.includes('fontFamily'), '编辑资料页必须显式使用蓝湖稿一致的字体族')
assert.ok(profileEditSource.includes('AboutStoryChips'), '关于我下方必须还原“补充更多关于我的故事”横向 chips')
assert.ok(profileEditSource.includes('data-role="about-detail-list"'), '关于我首个内容列表需要独立容器控制标题下方间距')
assert.match(profileEditSource, /data-role="about-detail-list"[\s\S]{0,80}marginTop: '8rpx'/, '关于我标题到首个内容的距离必须按蓝湖收紧')
assert.ok(profileEditSource.includes("padding=\"24rpx 26rpx\""), '我的标签/关于我模块需要使用紧凑卡片内边距，避免整体高度过高')
assert.match(profileEditSource, /data-role="profile-tag-list"[\s\S]{0,220}minHeight: '72rpx'/, '我的标签容器高度必须按蓝湖收紧，不能继续使用 88rpx 通用高度')
assert.match(profileEditSource, /data-role="profile-tag-list"[\s\S]{0,260}padding: '12rpx 20rpx'/, '我的标签容器上下 padding 必须压缩，避免模块过高')
assert.match(profileEditSource, /data-role="profile-tag-list"[\s\S]{0,320}flexWrap: 'wrap'/, '我的标签必须按完整色块换行')
assert.ok(profileEditSource.includes("minHeight: '104rpx'"), '关于我列表行高必须按蓝湖收紧，不能继续使用 122rpx')
assert.ok(!profileEditSource.includes("minHeight: '122rpx'"), '关于我列表行禁止保留过高的 122rpx')
assert.ok(profileEditSource.includes("lineHeight: '36rpx'"), '关于我描述行高需要收紧，避免列表整体过高')
assert.ok(profileEditSource.includes("height: '86rpx'"), '关于我去添加按钮高度需要按蓝湖收紧')
assert.ok(!profileEditSource.includes("height: '98rpx'"), '关于我去添加按钮禁止保留过高的 98rpx')
assert.ok(profileEditSource.includes('AboutStoryChipPlus'), '关于我故事 chips 的加号必须用独立图形居中，不能用文字字符')
assert.ok(profileEditSource.includes('data-role="about-story-chip-plus"'), '关于我故事 chips 加号必须有独立可校验图形节点')
assert.ok(profileEditSource.includes('data-role="about-action-text"'), '关于我列表右侧去填写必须是蓝湖文字操作，不是旧胶囊按钮')
assert.match(profileEditSource, /data-role="profile-tag-list"[\s\S]{0,220}marginTop: '10rpx'/, '我的标签标题到标签容器的距离必须按蓝湖继续收紧')
assert.ok(!profileEditSource.includes('去修改'), '编辑资料关于我主屏默认态右侧必须按蓝湖显示“去填写”')
assert.ok(!profileEditSource.includes("background: '#F5F8FF'"), '关于我列表右侧操作禁止旧胶囊底色')
assert.ok(profileEditSource.includes('MusicDiscIcon'), '最新听的歌必须包含蓝湖蓝色唱片/音符切图组件')
assert.ok(profileEditSource.includes('`${songName}｜${artistName}`'), '最新听的歌标题分隔符必须按蓝湖稿使用全角竖线并由接口数据拼接')
assert.ok(!profileEditSource.includes('告白气球丨周杰伦'), '最新听的歌禁止使用旧分隔符')
assert.ok(profileEditSource.includes('data-role="wechat-input-box"'), '添加微信必须使用蓝湖灰底输入框容器')
assert.ok(profileEditSource.includes("background: '#F7F8FA'"), '添加微信输入框背景必须为蓝湖浅灰底')
assert.ok(!profileEditSource.includes("borderBottom: '1rpx solid #EFF2F7'"), '添加微信输入框禁止使用旧下划线样式')

console.log('认证与编辑资料 UI 静态校验通过')
