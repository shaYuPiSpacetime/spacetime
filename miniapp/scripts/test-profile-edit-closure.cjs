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

test('主页预览无未定义组件且按产品要求隐藏 MBTI 模块', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')

  assert.doesNotMatch(preview, /<EmptyText\b/, '主页预览禁止引用未定义的 EmptyText')
  assert.doesNotMatch(edit, /<MbtiSection\b/, '编辑资料页必须继续隐藏 MBTI 模块')
  assert.doesNotMatch(preview, /<ProfilePreviewMbti\b/, '主页预览必须继续隐藏 MBTI 模块')
})

test('主页预览空内容和空图片不生成占位模块', () => {
  const visibilityPath = 'src/domain/profilePreviewVisibility.ts'
  assert.ok(fs.existsSync(path.join(root, visibilityPath)), '缺少主页预览真实内容显隐领域模型')

  const { buildProfilePreviewVisibility } = loadTypeScriptModule(visibilityPath)
  const empty = buildProfilePreviewVisibility({
    tags: [],
    introduction: '   ',
    photos: ['', '  '],
    certifications: [{ passed: false }, { passed: false }],
    favoriteSong: '',
  })
  assert.deepEqual(empty.tags, [])
  assert.equal(empty.introduction, '')
  assert.deepEqual(empty.photos, [])
  assert.equal(empty.showCertification, false)
  assert.equal(empty.favoriteSong, '')

  const filled = buildProfilePreviewVisibility({
    tags: [
      { code: ' quiet ', label: ' 安静 ' },
      { code: '', label: '无效标签' },
      { code: 'blank', label: '   ' },
    ],
    introduction: '  喜欢阅读和散步  ',
    photos: [' one.jpg ', '', 'two.jpg', 'three.jpg', 'four.jpg', 'five.jpg'],
    certifications: [{ passed: false }, { passed: true }],
    favoriteSong: '  晴天｜周杰伦  ',
  })
  assert.deepEqual(filled.tags, [{ code: 'quiet', label: '安静' }])
  assert.equal(filled.introduction, '喜欢阅读和散步')
  assert.deepEqual(filled.photos, ['one.jpg', 'two.jpg', 'three.jpg', 'four.jpg'])
  assert.equal(filled.showCertification, true)
  assert.equal(filled.favoriteSong, '晴天｜周杰伦')

  const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')
  assert.match(preview, /buildProfilePreviewVisibility\(model\)/, '主页预览必须统一消费真实内容显隐结果')
  assert.doesNotMatch(preview, /暂未添加标签|暂未填写自我介绍|暂未添加照片|暂未添加喜欢的歌曲/, '主页预览禁止显示空内容占位文案')
  assert.doesNotMatch(preview, /minHeight: '5900rpx'/, '隐藏空模块后禁止保留固定超长页面高度')
})

test('关于我无填写默认三项，有填写时按真实填写条数回显', () => {
  const presentationPath = 'src/domain/profileAboutPresentation.ts'
  assert.ok(fs.existsSync(path.join(root, presentationPath)), '缺少关于我固定摘要领域映射')
  const { PROFILE_ABOUT_SUMMARY_DEFINITIONS, buildProfileAboutSummary } =
    loadTypeScriptModule(presentationPath)

  assert.deepEqual(
    PROFILE_ABOUT_SUMMARY_DEFINITIONS.map(item => [item.key, item.title]),
    [
      ['meetingPreference', '见面便好'],
      ['preferredActivities', '喜欢的见面活动'],
      ['housingStatus', '住房情况'],
    ],
    '关于我未填写时必须按蓝湖默认展示三项'
  )

  const empty = buildProfileAboutSummary([])
  assert.equal(empty.length, 3)
  assert.deepEqual(empty.map(item => item.value), ['', '', ''])
  assert.ok(empty.every(item => item.placeholder), '空值三项必须展示蓝湖引导文案')

  const filled = buildProfileAboutSummary([
    {
      questionKey: 'housingStatus',
      title: '接口乱序住房标题',
      placeholder: '接口住房占位',
      latestContent: '',
      effectiveContent: '',
      canSubmit: true,
    },
    {
      questionKey: 'meetingPreference',
      title: '接口见面标题',
      placeholder: '接口见面占位',
      latestContent: '',
      effectiveContent: '周末喝咖啡或一起散步',
      canSubmit: true,
    },
    {
      questionKey: 'carStatus',
      title: '购车情况',
      placeholder: '购车占位',
      latestContent: '已有代步车',
      canSubmit: true,
    },
  ])

  assert.deepEqual(filled.map(item => item.key), ['meetingPreference', 'carStatus'])
  assert.equal(filled.length, 2, '填写两条时只能展示两条，不得补齐默认占位项')
  assert.equal(filled[0].value, '周末喝咖啡或一起散步', '无最新内容时使用已生效内容')
  assert.equal(filled[1].title, '购车情况', '额外已填写问题必须使用接口标题完整回显')
  assert.equal(filled[1].value, '已有代步车', '本人页优先回显最新填写内容')
})

test('编辑资料地区优先展示接口标签，缺标签时按省市树回显中文', () => {
  const presentationPath = 'src/domain/basicProfilePresentation.ts'
  const { buildBasicProfileLocationText } = loadTypeScriptModule(presentationPath)
  const regionTree = [
    {
      code: '140000',
      name: '山西省',
      level: 'PROVINCE',
      children: [{ code: '140200', name: '大同市', level: 'CITY', children: [] }],
    },
    {
      code: '110000',
      name: '北京市',
      level: 'PROVINCE',
      children: [{ code: '110100', name: '北京市', level: 'CITY', children: [] }],
    },
  ]

  assert.equal(
    buildBasicProfileLocationText({
      locationCity: '140200',
      locationCityLabel: '大同市',
      hometownProvince: '110000',
      hometownProvinceLabel: '北京市',
      hometownCityLabel: '北京市',
    }),
    '现居大同丨北京人'
  )
  assert.equal(
    buildBasicProfileLocationText(
      { locationProvince: '140000', locationCity: '140200', hometownProvince: '110000' },
      regionTree
    ),
    '现居大同丨北京人',
    '接口暂未返回中文标签时也必须用已加载的省市树回显已有资料'
  )
  assert.equal(
    buildBasicProfileLocationText(
      {
        locationProvince: '140000',
        locationProvinceLabel: '山西省',
        locationCity: '140200',
        hometownProvince: '110000',
        hometownProvinceLabel: '北京市',
      },
      regionTree
    ),
    '现居大同丨北京人',
    '有城市 code 时必须优先解析城市，不能被省份标签降级覆盖'
  )
  assert.equal(
    buildBasicProfileLocationText(
      { locationProvince: '999999', locationCity: '999998', hometownProvince: '999997' },
      regionTree
    ),
    '',
    '未知地区编码不得直接展示给用户'
  )
})

test('主页预览按出生年份和真实性别展示资料，并按蓝湖拉开头像文字间距', () => {
  const presentationPath = 'src/domain/basicProfilePresentation.ts'
  const { buildBasicProfileBirthYearText } = loadTypeScriptModule(presentationPath)
  const edit = read('src/pages/profile/edit.tsx')
  const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')

  assert.equal(buildBasicProfileBirthYearText('1997-06-18'), '97年')
  assert.equal(buildBasicProfileBirthYearText(''), '')
  assert.match(edit, /buildBasicProfileBirthYearText\(String\(basic\.birthday \|\| ''\)\)/, '主页预览必须读取出生年份')
  assert.doesNotMatch(
    edit,
    /const genderAgeHeight = \[[\s\S]{0,180}basic\.age/,
    '主页预览禁止继续按当前年龄展示'
  )
  assert.match(
    edit,
    /const genderAgeHeight = \[[\s\S]{0,260}basic\.zodiac/,
    '主页预览资料首行必须按蓝湖在身高后展示星座'
  )
  assert.match(edit, /gender:\s*String\(basic\.gender \|\| ''\)/, '主页预览模型必须携带真实性别 code')
  assert.match(
    preview,
    /model\.gender === 'MALE'[\s\S]{0,180}qianxunGenderMale[\s\S]{0,180}profilePreviewGender/,
    '男性必须使用蓝色男性图标，女性继续使用蓝湖红色图标'
  )
  assert.match(
    preview,
    /data-role="profile-preview-identity"[\s\S]{0,300}left: '238rpx'[\s\S]{0,220}alignItems: 'flex-start'/,
    '昵称和感情状态必须同左边缘，并与头像保留蓝湖 20rpx 间距'
  )
})

test('编辑资料主页面按蓝湖比例和真实组件展示关键模块', () => {
  const edit = read('src/pages/profile/edit.tsx')

  assert.match(edit, /buildProfileAboutSummary\(/, '初始化和局部更新必须复用关于我摘要映射')
  assert.match(edit, /data-role="profile-score-track"/, '资料评分必须使用蓝湖浮标进度条')
  assert.doesNotMatch(edit, />\s*资料完整度\s*</, '蓝湖评分区不展示额外的“资料完整度”标题')
  assert.match(edit, /margin: '0 auto'/, '评分卡必须紧接蓝湖顶部导航，不得额外下移')
  assert.match(edit, /margin: '-105rpx auto 0'/, '更多照片卡必须按蓝湖覆盖主图底部 105rpx')
  assert.match(edit, /function SectionTitleDecoration/, '卡片标题必须使用蓝湖浅蓝圆形装饰')
  assert.doesNotMatch(edit, /function SectionTitleDot/, '禁止继续使用标题左侧实心蓝点替代设计装饰')
  assert.match(edit, /item\.value \|\| item\.placeholder/, '关于我空值必须展示固定三项引导文案')
  assert.match(edit, /height: '138rpx'/, '评分卡高度必须匹配蓝湖 138rpx')
  assert.match(edit, /width: '128rpx'[\s\S]{0,80}height: '43rpx'/, '评分胶囊必须匹配蓝湖 128×43rpx')
  assert.match(edit, /height: '10rpx'[\s\S]{0,100}marginTop: '19rpx'/, '评分轨道必须匹配蓝湖 10rpx 与 19rpx 间距')
  assert.match(edit, /margin: '20rpx auto 0'[\s\S]{0,100}background: mainBlue/, '真实性提示顶部间距必须为 20rpx')
  assert.match(edit, /width: '198rpx'[\s\S]{0,80}height: '198rpx'/, '照片六宫格单格必须为 198×198rpx')
  assert.match(edit, /isLastInRow \? '0' : '27rpx'/, '照片六宫格列间距必须为 27rpx')
})

test('编辑资料与主页预览共用同一背景图内容、裁切和高度', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')
  const hero = read('src/pages/profile/components/ProfileHeroImage.tsx')

  assert.match(hero, /PROFILE_HERO_WIDTH = '700rpx'/, '共享主图宽度必须匹配蓝湖 700rpx')
  assert.match(hero, /PROFILE_HERO_HEIGHT = '828rpx'/, '共享主图高度必须匹配蓝湖 828rpx')
  assert.match(hero, /PROFILE_HERO_RADIUS = '32rpx'/, '共享主图圆角必须匹配蓝湖 32rpx')
  assert.match(hero, /mode="aspectFill"/, '编辑资料与主页预览必须使用同一 aspectFill 裁切方式')
  assert.match(edit, /<ProfileHeroImage\s+src=\{heroImageUrl\}/, '编辑资料必须复用共享主图组件')
  assert.match(preview, /<ProfileHeroImage\s+src=\{model\.heroImageUrl/, '主页预览必须复用共享主图组件')
  assert.match(edit, /const profileHeroImage = profileBackground \|\| editHeroPhoto/, '两种状态必须解析为同一背景图来源')
  assert.match(edit, /heroImageUrl:\s*profileHeroImage,/, '主页预览模型必须接收编辑资料当前显示的同一背景图')
  assert.match(edit, /heroImageUrl=\{profileHeroImage\}/, '编辑资料主图必须接收与主页预览一致的背景图')
})

test('背景图加高后更多照片卡片及头像姓名仍保持蓝湖前后层级', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const heroWrapper = edit.match(/data-role="profile-edit-hero"[\s\S]*?<ProfileHeroImage/)?.[0]

  assert.ok(heroWrapper, '编辑资料主图容器缺少稳定验收节点')
  assert.doesNotMatch(heroWrapper, /zIndex:/, '主图外层不得创建层叠上下文压住更多照片标题')
  assert.match(edit, /data-role="profile-photo-grid"[\s\S]{0,420}zIndex: 2/, '更多照片卡片必须覆盖主图底部')
  assert.match(edit, /left: '30rpx',[\s\S]{0,180}zIndex: 5/, '圆头像必须继续显示在更多照片卡片之上')
  assert.match(edit, /left: '238rpx',[\s\S]{0,160}zIndex: 4/, '姓名必须继续显示在更多照片卡片之上')
})

test('自我介绍、语音和歌曲在空态与已填写状态都能正确回显', () => {
  const edit = read('src/pages/profile/edit.tsx')

  assert.match(
    edit,
    /value \|\| '介绍下自己的性格、习惯、优点、缺点'/,
    '自我介绍未填写时必须展示蓝湖引导文案'
  )
  assert.match(edit, /<VoiceSection\s+voice=\{voiceDetail\}/, '语音卡片必须接收当前已保存语音')
  assert.match(edit, /voice\?\.voiceIntroUrl/, '语音卡片必须按已保存地址切换空态和回显态')
  assert.match(edit, /voice\.voiceIntroDuration \|\| 0/, '语音卡片必须回显已保存时长')
  assert.match(
    edit,
    /song \|\| '添加一首喜欢的歌曲'/,
    '歌曲未填写时必须展示可理解的空态文案'
  )
})

test('认证、标签和关于我按最新蓝湖稿展示正确入口与间距', () => {
  const edit = read('src/pages/profile/edit.tsx')

  for (const iconKey of [
    'profileEditCertAvatar',
    'profileEditCertRealName',
    'profileEditCertEducation',
  ]) {
    assert.match(edit, new RegExp(`miniappOssIcons\\.${iconKey}`), `认证信息缺少正确图标：${iconKey}`)
  }
  assert.match(
    edit,
    /<ProfileSection[\s\S]{0,100}title="我的标签"[\s\S]{0,100}action="编辑"/,
    '我的标签卡片右上角必须始终展示编辑按钮'
  )
  assert.match(
    edit,
    /data-role="about-detail-list"[\s\S]{0,180}marginTop: '28rpx'/,
    '关于我标题与第一项见面偏好之间必须保留 28rpx 间距'
  )
})

test('编辑资料和主页预览在真实头像与空头像状态都使用同一来源', () => {
  const edit = read('src/pages/profile/edit.tsx')

  assert.match(edit, /profileAvatar=\{profileAvatar \|\| defaultAvatar\}/, '编辑资料圆头像必须使用统一兜底头像')
  assert.match(edit, /avatarUrl:\s*profileAvatar \|\| defaultAvatar/, '主页预览模型必须复用编辑资料的同一兜底头像')
})

test('编辑资料背景图与头像分别上传并独立回显', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const backgroundHandler = edit.match(/const onChangeBackground = \(\) => \{[\s\S]*?\n  \}\n\n  const onChangeAvatar/)?.[0]
  const avatarHandler = edit.match(/const onChangeAvatar = \(\) => \{[\s\S]*?\n  \}\n\n  const handlePhotoClick/)?.[0]

  assert.ok(backgroundHandler, '缺少独立的背景图上传处理器')
  assert.match(backgroundHandler, /prd01Api\.uploadBackground/, '背景图必须调用背景上传接口')
  assert.match(backgroundHandler, /prd01Api\.saveBackground/, '背景图上传后必须保存为主页背景')
  assert.match(backgroundHandler, /setProfileBackground/, '背景图上传后必须独立更新背景状态')
  assert.doesNotMatch(backgroundHandler, /setHeroPhoto/, '背景图不得再维护第二份易分叉的展示状态')
  assert.doesNotMatch(backgroundHandler, /uploadAvatar|submitAvatar|setProfileAvatar/, '修改背景图不得修改头像')

  assert.ok(avatarHandler, '缺少独立的头像上传处理器')
  assert.match(avatarHandler, /prd01Api\.uploadAvatar/, '头像必须调用头像上传接口')
  assert.match(avatarHandler, /prd01Api\.submitAvatar/, '头像上传后必须提交头像审核')
  assert.match(avatarHandler, /setProfileAvatar/, '头像上传后必须独立更新圆头像')
  assert.doesNotMatch(avatarHandler, /uploadBackground|saveBackground|setProfileBackground/, '修改头像不得修改背景图')

  assert.match(edit, /dataRole="hero-main-photo"[\s\S]{0,120}onClick=\{onChangeBackground\}/, '主页背景点击必须只触发背景上传')
  assert.match(edit, /data-role="hero-mini-avatar"[\s\S]{0,180}onChangeAvatar\(\)/, '圆头像点击必须只触发头像上传')
  assert.match(edit, /const profileHeroImage = profileBackground \|\| editHeroPhoto/, '初始化时两页主图必须解析同一背景来源')
  assert.match(edit, /heroImageUrl:\s*profileHeroImage,/, '主页预览背景必须读取当前统一主图')
  assert.doesNotMatch(edit, /heroImageUrl:\s*profileHeroImage[^\n]*profileAvatar/, '头像不得作为主页背景兜底，避免修改头像时连带修改背景')
})

test('语音卡片与录音浮层按蓝湖完成态展示时限、短条、X 和管理入口', () => {
  const edit = read('src/pages/profile/edit.tsx')

  assert.match(
    edit,
    /<ProfileSection title="语音介绍" action=\{hasVoice \? '管理' : '录音'\}/,
    '已有录音时必须展示管理入口'
  )
  assert.match(edit, /id="voice-intro-saved-bar"/, '已录音短条缺少稳定验收节点')
  assert.match(
    edit,
    /id="voice-intro-saved-bar"[\s\S]{0,260}width: '270rpx'[\s\S]{0,120}height: '48rpx'/,
    '已录音短条必须匹配蓝湖 270×48rpx 尺寸'
  )
  assert.match(edit, /id="voice-intro-delete"/, '已录音态缺少独立 X 删除按钮')
  assert.match(
    edit,
    /id="voice-intro-delete"[\s\S]{0,220}width: '48rpx'[\s\S]{0,100}height: '48rpx'/,
    'X 删除按钮必须匹配蓝湖 48×48rpx 尺寸'
  )
  assert.match(edit, /height: 'calc\(548rpx \+ env\(safe-area-inset-bottom\)\)'/, '录音底部面板必须匹配蓝湖约 548rpx 高度')
  assert.match(edit, /id="voice-recording-limit"/, '录音浮层必须明确展示动态最大时长')
  assert.match(edit, /minDuration=\{config\?\.uploadLimits\.voiceMinDuration \|\| 10\}/, '录音浮层最短时限必须读取运行时配置')
  assert.match(edit, /maxDuration=\{config\?\.uploadLimits\.voiceMaxDuration \|\| 60\}/, '录音浮层时限必须读取运行时配置')
  assert.match(edit, /id="voice-complete-actions"/, '录制完成态必须提供单组删除、播放、完成控件')
  assert.match(
    edit,
    /if \(elapsed >= maxDuration && !recordingStopRequested\.current\)[\s\S]{0,180}recorder\.current\.stop\(\)/,
    '达到最大时长时必须主动停止录音，不能只把界面计时封顶'
  )
})

test('微信号保持空白时失焦不提交也不展示接口错误', () => {
  const domainPath = 'src/domain/profileWechat.ts'
  assert.ok(fs.existsSync(path.join(root, domainPath)), '缺少可独立验证的可选微信号保存规则')

  const { normalizeOptionalWechatId } = loadTypeScriptModule(domainPath)
  assert.equal(normalizeOptionalWechatId(''), null)
  assert.equal(normalizeOptionalWechatId('   '), null)
  assert.equal(normalizeOptionalWechatId(' wx_user_01 '), 'wx_user_01')

  const edit = read('src/pages/profile/edit.tsx')
  assert.match(
    edit,
    /const normalizedWechatId = normalizeOptionalWechatId\(wechatId\)[\s\S]{0,100}if \(normalizedWechatId === null\) return/,
    '微信号为空时必须在请求前静默结束'
  )
  assert.match(
    edit,
    /prd01Api\.saveWechatId\(normalizedWechatId\)/,
    '非空微信号必须提交规范化后的值'
  )
})

test('编辑资料返回按钮具备足够点击区域且单页栈回到我的页面', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const nav = read('src/components/ProfilePreviewTopNav.tsx')

  assert.match(
    edit,
    /Taro\.switchTab\(\{ url: '\/pages\/profile\/index' \}\)/,
    '编辑资料单页直达时必须回到“我的”Tab'
  )
  assert.match(nav, /data-role="profile-edit-back"/, '返回按钮必须提供稳定的运行态点击标识')
  assert.match(nav, /width: '112rpx'/, '返回按钮点击宽度不得只等于箭头宽度')
  assert.match(nav, /zIndex: 10/, '返回按钮必须高于页面标题和滚动内容')
})

test('相册严格按 sortOrder 回显到六个固定槽位', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const sql = read('../deploy/sql/prod/054_prd01_profile_album_six_slots.sql')
  assert.match(
    edit,
    /const preferredIndex = normalizeAlbumSlot\(media\.sortOrder/,
    '相册必须按接口 sortOrder 定位槽位'
  )
  assert.doesNotMatch(edit, /\)\[index\]/, '相册禁止按返回数组下标压缩到第一行')
  assert.match(
    edit,
    /findIndex\(slot => !slot\.mediaId\)/,
    '重复或非法 sortOrder 必须稳定回填第一个空槽'
  )
  assert.match(edit, /isChooseImageCancelled/, '用户取消选图和接口保存失败必须分别处理')
  assert.match(edit, /await showError\(error\)/, '相册上传或保存失败必须展示真实接口错误')
  assert.match(sql, /"key":"album"[\s\S]*?"maxCount":"6"/, '运行时相册上限必须由数据库配置为六张')
  assert.doesNotMatch(
    sql,
    /UPDATE\s+app_config[\s\S]*config_value\s*=\s*'\{"rows"/i,
    '迁移不得整段覆盖其他上传规则'
  )
})

test('子页面保存后通过事件回传局部数据且不整页刷新', () => {
  const edit = read('src/pages/profile/edit.tsx')
  assert.match(
    edit,
    /events:\s*\{[\s\S]{0,80}\[PROFILE_UPDATED_EVENT\]:/,
    '编辑资料页需要监听子页局部更新事件'
  )
  assert.match(edit, /onScroll=/, '编辑资料页需要记录滚动位置')

  for (const file of ['tags.tsx', 'about.tsx', 'songs.tsx', 'intro.tsx']) {
    const source = read(`src/pages/profile-edit/${file}`)
    assert.match(source, /emitProfileUpdated\(/, `${file} 保存后必须回传最新数据`)
    assert.doesNotMatch(
      source,
      /redirectTo\(\{ url: '\/pages\/profile\/edit/,
      `${file} 禁止通过重定向刷新父页`
    )
  }

  const certification = read('src/pages/verification/my-certification.tsx')
  assert.match(certification, /useDidShow\(/, '我的认证返回深层页面后必须重新读取局部认证状态')
  assert.match(
    certification,
    /emitProfileUpdated\(\{ type: 'verification'/,
    '我的认证必须向编辑资料页回传最新状态'
  )
})

test('头像来源浮层完整遮盖底部主按钮', () => {
  const avatar = read('src/pages/verification/avatar.tsx')
  assert.match(
    avatar,
    /onPrimary=\{sourceSheetVisible \? undefined :/,
    '来源浮层打开时必须隐藏底部主按钮'
  )
  assert.match(avatar, /zIndex: 40/, '来源浮层层级必须高于认证底部按钮')
})

test('基本资料输入型字段不复用“请选择”占位', () => {
  const card = read('src/pages/verification/components/BasicInfoCard.tsx')
  assert.match(card, /common_input_placeholder/, '输入型字段占位必须读取独立动态文案')
  assert.match(card, /resolveFieldPlaceholder/, '展示值必须按字段类型选择占位文案')
})

test('基本资料严格按蓝湖组合行和两组卡片展示', () => {
  const presentationPath = 'src/domain/basicProfilePresentation.ts'
  assert.ok(fs.existsSync(path.join(root, presentationPath)), '缺少基本资料蓝湖分组领域模型')
  const {
    ensureBasicProfileNickname,
    PROFILE_PRIMARY_ROW_IDS,
    PROFILE_SECONDARY_ROW_IDS,
    VERIFICATION_ROW_IDS,
  } = loadTypeScriptModule(presentationPath)

  assert.equal(ensureBasicProfileNickname({ userId: 7, nickname: '' }).nickname, '用户0007')
  assert.equal(ensureBasicProfileNickname({ userId: 7, nickname: '星河' }).nickname, '星河')

  assert.deepEqual(PROFILE_PRIMARY_ROW_IDS, [
    'nickname',
    'gender',
    'birthday',
    'location',
    'heightWeight',
    'hometown',
    'identity',
    'maritalStatus',
  ])
  assert.deepEqual(PROFILE_SECONDARY_ROW_IDS, [
    'school',
    'educationLevel',
    'industry',
    'occupation',
    'company',
    'annualIncome',
  ])
  assert.deepEqual(VERIFICATION_ROW_IDS.slice(0, 7), [
    'nickname',
    'gender',
    'birthday',
    'location',
    'heightWeight',
    'hometown',
    'identity',
  ])

  const card = read('src/pages/verification/components/BasicInfoCard.tsx')
  assert.doesNotMatch(
    card,
    /splitIndex|visibleSettings\.slice\(/,
    '禁止再按接口数组下标机械切分资料卡片'
  )
  assert.match(card, /LanhuRegionSheet/, '现居地和家乡必须使用组合地区选择器')
  assert.match(card, /LanhuDualColumnSheet/, '身高和体重必须使用同一个双列选择器')
  assert.match(card, /borderRadius: '36rpx'/, '资料白卡圆角必须对应蓝湖 18px')

  const picker = read('src/pages/verification/components/LanhuPickerSheet.tsx')
  assert.match(picker, /海外地区国家/, '地区选择器缺少蓝湖国内/海外页签结构')
  assert.match(picker, /width: '656rpx'/, '地区选择器缺少蓝湖双列滚轮宽度')
  assert.match(picker, /background: '#E3F1FE'/, '地区选择器缺少跨双列选中横条')
  assert.equal(
    (picker.match(/enhanced\s+showScrollbar=\{false\}/g) || []).length,
    3,
    '地区省市区滚轮必须启用增强滚动并隐藏原生滚动条'
  )
})

test('现居地和家乡都提交省市两级', () => {
  const regionDomainPath = 'src/domain/basicProfileRegion.ts'
  assert.ok(fs.existsSync(path.join(root, regionDomainPath)), '缺少基本资料省市选择领域模型')
  const { buildRegionPatch, normalizeTwoLevelRegionFieldSettings, buildBasicProfileSavePayload } =
    loadTypeScriptModule(regionDomainPath)

  assert.deepEqual(buildRegionPatch('location', '320000', '320600', '320602'), {
    locationProvince: '320000',
    locationCity: '320600',
    locationDistrict: '',
  })
  assert.deepEqual(buildRegionPatch('hometown', '410000', '410100'), {
    hometownProvince: '410000',
    hometownCity: '410100',
    hometownDistrict: '',
  })

  const legacyFieldSettings = [
    { fieldId: 'locationProvince', visible: true },
    { fieldId: 'locationCity', visible: true },
    { fieldId: 'locationDistrict', visible: true },
    { fieldId: 'hometownProvince', visible: true },
    { fieldId: 'hometownCity', visible: true },
    { fieldId: 'hometownDistrict', visible: true },
  ]
  assert.deepEqual(
    normalizeTwoLevelRegionFieldSettings(legacyFieldSettings).map(item => item.fieldId),
    ['locationProvince', 'locationCity', 'hometownProvince', 'hometownCity'],
    '现居和家乡区县都必须强制退役'
  )
  assert.deepEqual(
    buildBasicProfileSavePayload(legacyFieldSettings, {
      locationProvince: '320000',
      locationCity: '320600',
      locationDistrict: '110105',
      hometownProvince: '410000',
      hometownCity: '410100',
      hometownDistrict: '330106',
    }),
    {
      locationProvince: '320000',
      locationCity: '320600',
      hometownProvince: '410000',
      hometownCity: '410100',
    },
    '保存请求不得提交现居或家乡历史区县'
  )

  const card = read('src/pages/verification/components/BasicInfoCard.tsx')
  const picker = read('src/pages/verification/components/LanhuPickerSheet.tsx')
  const basic = read('src/pages/verification/basic.tsx')
  assert.match(card, /includeDistrict=\{false\}/, '现居地和家乡都必须关闭区县列')
  assert.match(
    picker,
    /selectedDistrict|districtLoading|includeDistrict/,
    '现居地选择器必须维护区县状态'
  )
  assert.match(basic, /normalizeTwoLevelRegionFieldSettings/, '页面必须防御两个区县字段的历史可见配置')
  assert.match(
    basic,
    /buildBasicProfileSavePayload/,
    '页面保存必须使用现居和家乡两级字段白名单'
  )
})

test('现居地和家乡共用省市两级选择器', () => {
  const card = read('src/pages/verification/components/BasicInfoCard.tsx')
  const picker = read('src/pages/verification/components/LanhuPickerSheet.tsx')

  assert.match(
    card,
    /buildRegionPatch\(editor\.rowId, provinceCode, cityCode, districtCode/,
    '两处地区确认必须走统一地区 patch'
  )
  assert.match(
    picker,
    /includeDistrict \? selectedDistrict\?\.code \|\| '' : ''/,
    '关闭区县列时必须只回传省市 code'
  )
})

test('地区路径异常不得向用户暴露三级行政区技术文案', () => {
  const regionDomainPath = 'src/domain/basicProfileRegion.ts'
  const { toTwoLevelRegionErrorMessage } = loadTypeScriptModule(regionDomainPath)
  assert.equal(
    toTwoLevelRegionErrorMessage(
      new Error('REGION_NOT_SUPPORTED：现居地必须使用有效的中国大陆省市区编码')
    ),
    '地区选项已更新，请重新选择省市'
  )

  const loginAddress = read('src/pages/login/address.tsx')
  const basic = read('src/pages/verification/basic.tsx')
  assert.match(loginAddress, /toTwoLevelRegionErrorMessage/, '首登地址页必须转换地区业务错误')
  assert.match(basic, /toTwoLevelRegionErrorMessage/, '基础资料页必须转换地区业务错误')
})

test('主页预览移除语音播放入口并按蓝湖展示三重认证和单行副文案', () => {
  const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')
  assert.doesNotMatch(preview, /createInnerAudioContext|▶/, '主页预览不得保留播放声音按钮或播放逻辑')
  assert.match(preview, />\s*三重认证\s*</, '主页预览认证徽标必须显示“三重认证”')
  assert.match(
    preview,
    /data-role="profile-preview-subtitle"[\s\S]{0,520}whiteSpace: 'nowrap'/,
    '头像右侧名称下方文案必须完整单行展示'
  )
})

test('编辑资料保存按钮按蓝湖位于第二张卡片之后，字段弹层打开时只保留确认按钮', () => {
  const basic = read('src/pages/verification/basic.tsx')
  const card = read('src/pages/verification/components/BasicInfoCard.tsx')

  assert.match(card, /onEditorVisibilityChange/, '基本资料卡片必须向页面报告字段弹层开关状态')
  assert.match(
    basic,
    /const \[editorVisible, setEditorVisible\] = useState\(false\)/,
    '基本资料页缺少弹层可见状态'
  )
  assert.match(
    basic,
    /onEditorVisibilityChange=\{setEditorVisible\}/,
    '基本资料页必须监听字段弹层开关'
  )
  assert.match(basic, /\{!editorVisible \? \(/, '字段弹层打开时必须隐藏页面级保存按钮')
  assert.match(basic, /data-role="profile-basic-save"/, '编辑资料保存按钮缺少稳定运行态标识')
  assert.match(
    basic,
    /data-role="profile-basic-save"[\s\S]{0,420}position: 'relative'/,
    '编辑资料保存按钮必须跟随第二张卡片排版，禁止固定悬浮遮挡字段'
  )
  assert.match(
    basic,
    /data-role="profile-basic-save"[\s\S]{0,420}borderRadius: '40rpx'/,
    '编辑资料保存按钮圆角必须对应蓝湖 20px'
  )
  assert.doesNotMatch(
    basic,
    /fromProfile[\s\S]{0,2200}<VerificationBottomAction/,
    '编辑资料禁止继续使用固定底部操作遮挡第二组字段'
  )
  assert.match(
    basic,
    /onPrimary=\{editorVisible \? undefined :/,
    '认证态字段弹层打开时必须隐藏“下一步”'
  )
})

test('未认证主按钮圆角与蓝湖 13.5px 基线一致', () => {
  const verificationEntry = read('src/features/verification/VerificationEntryView.tsx')
  assert.match(
    verificationEntry,
    /id="verification-entry-actions"[\s\S]{0,220}marginTop: '1098rpx'[\s\S]{0,320}borderRadius: '27rpx'/,
    '未认证“立即完善”按钮圆角必须为 27rpx'
  )
  assert.doesNotMatch(
    verificationEntry,
    /id="verification-entry-actions"[\s\S]{0,520}borderRadius: '40rpx'/,
    '未认证按钮禁止保留过圆的 40rpx'
  )
})

test('四个蓝湖二级页具备独立结构和首屏数据', () => {
  const certification = read('src/pages/verification/my-certification.tsx')
  const tags = read('src/pages/profile-edit/tags.tsx')
  const about = read('src/pages/profile-edit/about.tsx')
  const songs = read('src/pages/profile-edit/songs.tsx')

  assert.match(
    certification,
    /copy\('verification_detail_heading'\)/,
    '我的认证页缺少接口动态主标题'
  )
  assert.match(certification, /data-role="certification-detail-card"/, '我的认证页缺少独立详情卡片')
  assert.match(tags, /data-role="selected-tag-drawer"/, '我的标签页缺少底部已选区')
  assert.match(tags, /width: '206rpx'/, '我的标签页必须为三列布局')
  assert.match(about, /const aboutTabs/, '关于我页面缺少顶部分类')
  assert.match(about, /question\.placeholder/, '关于我卡片必须展示接口副标题')
  assert.match(songs, /void searchSongs\(''\)/, '歌曲页首屏必须主动加载推荐数据')
  assert.match(songs, /function SongRecord/, '歌曲列表必须按蓝湖独立组件还原')
})

test('标签在编辑页、选择页和主页预览按完整色块换行', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const tags = read('src/pages/profile-edit/tags.tsx')
  const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')
  const chip = read('src/components/ProfileTagChip.tsx')
  const tagDomain = read('src/utils/profileTags.ts')

  assert.match(edit, /ProfileTagChip/, '编辑资料必须按标签块回显')
  assert.match(edit, /useState<ProfileTagItem\[\]>/, '编辑资料必须保留标签 code 和 label')
  assert.doesNotMatch(edit, /selectedTags\.join\('、'\)/, '编辑资料禁止把标签拼成普通文案')
  assert.match(preview, /flexWrap: 'wrap'/, '主页预览必须按完整标签块换行')
  assert.doesNotMatch(preview, /previewTagWidths/, '主页预览禁止按位置写死标签宽度')
  assert.match(tags, /categoryCode !== 'ALL'/, '接口已有 ALL 分组时必须过滤重复“全部”')
  assert.match(tags, /ProfileTagChip/, '标签页必须复用统一标签色块')
  assert.match(chip, /whiteSpace: 'nowrap'/, '标签文字禁止在色块内部换行')
  assert.match(chip, /flexShrink: 0/, '标签块必须整体换行')
  assert.match(tagDomain, /stableTagHash\(item\.code\)/, '颜色必须按标签 code 稳定映射')
})

test('标签连续点击立即反馈并按顺序保存，不得在请求期间吞掉操作', () => {
  const tags = read('src/pages/profile-edit/tags.tsx')

  assert.doesNotMatch(tags, /if \(saving\) return/, '保存期间不能直接丢弃用户后续点击')
  assert.match(tags, /selectedTagsRef\.current = next[\s\S]{0,100}setSelectedTags\(next\)/, '点击后必须先乐观更新选中态')
  assert.match(tags, /saveQueueRef\.current/, '连续保存必须通过队列保持服务端最终顺序')
})

test('编辑资料二级页沿用渐变导航并严格使用蓝湖歌曲与关于我内容', () => {
  const nav = read('src/components/LanhuSubNav.tsx')
  const songs = read('src/pages/profile-edit/songs.tsx')
  const edit = read('src/pages/profile/edit.tsx')

  assert.match(nav, /background="transparent"/, '二级导航必须透出页面渐变背景')
  assert.match(songs, /title="爱听的歌曲"/, '歌曲页标题必须与蓝湖一致')
  assert.doesNotMatch(songs, /song\.coverUrl/, '歌曲列表必须统一使用蓝湖音乐圆盘图标')
  assert.match(edit, /const aboutStoryPrompts = \['购车情况\?', '是否想要孩子\?', '有无子女\?'\]/, '关于我补充项只能展示蓝湖明确的三项')
  assert.match(edit, /function RightChevron/, '页面右箭头必须使用稳定图形组件')
  assert.match(edit, /function VoiceActionIcon/, '语音操作图标必须使用稳定图形组件')
})

test('语音录制时长按真实开始时间递增并受接口最大时长限制', () => {
  const utilityPath = 'src/utils/voiceRecording.ts'
  assert.ok(fs.existsSync(path.join(root, utilityPath)), '缺少可独立验证的录音计时领域函数')
  const { formatVoiceDuration, getVoiceRecordingSeconds, resolveVoiceDuration } =
    loadTypeScriptModule(utilityPath)

  assert.equal(formatVoiceDuration(0), '00:00')
  assert.equal(formatVoiceDuration(9), '00:09')
  assert.equal(formatVoiceDuration(65), '01:05')
  assert.equal(getVoiceRecordingSeconds(1_000, 3_499, 60), 2)
  assert.equal(getVoiceRecordingSeconds(1_000, 90_000, 60), 60)
  assert.equal(resolveVoiceDuration(10_400, 9, 60), 10)
  assert.equal(resolveVoiceDuration(0, 12, 60), 12)
})

test('语音录制弹窗使用动态计时且只在录音管理器确认开始后读秒', () => {
  const edit = read('src/pages/profile/edit.tsx')

  assert.match(
    edit,
    /const \[recordingSeconds, setRecordingSeconds\] = useState\(0\)/,
    '录音页缺少实时秒数状态'
  )
  assert.match(
    edit,
    /manager\.onStart\([\s\S]{0,120}activeVoiceRecorderSession\?\.onStart/,
    '全局录音管理器必须把 onStart 转发给当前页面会话'
  )
  assert.match(
    edit,
    /onStart:\s*\(\)\s*=>\s*\{[\s\S]{0,220}startVoiceTimer\(\)/,
    '必须收到当前录音会话 onStart 后才开始计时'
  )
  assert.match(
    edit,
    /setInterval\([\s\S]{0,220}getVoiceRecordingSeconds/,
    '录音中必须按真实开始时间持续刷新秒数'
  )
  assert.match(edit, /clearInterval\(/, '停止、失败、离页时必须清理录音定时器')
  assert.match(
    edit,
    /recordingSeconds=\{recordingSeconds\}/,
    '录制中弹窗必须渲染动态秒数，禁止继续显示演示 00:00'
  )
  assert.match(
    edit,
    /activeVoiceRecorderSession/,
    '全局唯一录音管理器必须只转发给当前页面，避免重进页面重复回调'
  )
})

test('语音录制完成后支持真实试听、确认上传、删除与退出恢复', () => {
  const edit = read('src/pages/profile/edit.tsx')

  assert.match(edit, /Taro\.createInnerAudioContext\(\)/, '语音试听必须使用真实音频上下文')
  assert.match(edit, /audio\.play\(\)/, '点击播放必须真实开始音频')
  assert.match(edit, /audio\.pause\(\)/, '点击暂停必须真实暂停音频')
  assert.match(edit, /audio\?\.destroy\(\)/, '页面离开时必须销毁音频上下文')
  assert.match(
    edit,
    /setVoiceTempPath\(result\.tempFilePath\)/,
    '停止录音后必须保留本地文件用于试听'
  )
  assert.match(
    edit,
    /confirmVoiceRecording[\s\S]{0,1200}prd01Api\.uploadVoice[\s\S]{0,500}prd01Api\.submitVoiceIntro/,
    '点击完成后必须直传 OSS 并保存语音接口'
  )
  assert.match(
    edit,
    /onCancelConfirm=\{cancelVoiceConfirm\}/,
    '退出或删除确认弹层必须支持取消并恢复原状态'
  )
  assert.match(
    edit,
    /onConfirmExit=\{confirmDiscardRecording\}/,
    '确认退出时必须停止并丢弃本次录音'
  )
  assert.match(
    edit,
    /onConfirmDelete=\{confirmDeleteVoice\}/,
    '确认删除必须区分本地未保存录音与服务端已有语音'
  )
  assert.match(
    edit,
    /const confirmDiscardRecording[\s\S]{0,500}setVoiceSheet\(null\)/,
    '确认退出录音后必须关闭录音浮层'
  )
  assert.match(
    edit,
    /const closeVoiceSheet[\s\S]{0,400}voiceTempPath[\s\S]{0,120}resetVoiceDraft\(\)/,
    '关闭完成态浮层时必须清理未保存的本地录音'
  )
  assert.match(
    edit,
    /voiceDetailRef\.current\?\.voiceIntroUrl \? 'complete' : 'voice'/,
    '重新录音过短时必须恢复服务端已有语音的完成态'
  )
})
