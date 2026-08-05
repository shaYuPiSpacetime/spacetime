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

test('主页预览无未定义组件且隐藏 MBTI 模块', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')

  assert.doesNotMatch(preview, /<EmptyText\b/, '主页预览禁止引用未定义的 EmptyText')
  assert.doesNotMatch(edit, /<MbtiSection\b/, '编辑资料页必须隐藏 MBTI 模块')
  assert.doesNotMatch(preview, /<ProfilePreviewMbti\b/, '主页预览必须隐藏 MBTI 模块')
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

test('现居地提交省市区，家乡保持省市两级', () => {
  const regionDomainPath = 'src/domain/basicProfileRegion.ts'
  assert.ok(fs.existsSync(path.join(root, regionDomainPath)), '缺少基本资料省市选择领域模型')
  const { buildRegionPatch, normalizeTwoLevelRegionFieldSettings, buildBasicProfileSavePayload } =
    loadTypeScriptModule(regionDomainPath)

  assert.deepEqual(buildRegionPatch('location', '320000', '320600', '320602'), {
    locationProvince: '320000',
    locationCity: '320600',
    locationDistrict: '320602',
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
    ['locationProvince', 'locationCity', 'locationDistrict', 'hometownProvince', 'hometownCity'],
    '现居区县必须保留，家乡区县必须强制退役'
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
      locationDistrict: '110105',
      hometownProvince: '410000',
      hometownCity: '410100',
    },
    '保存请求必须提交现居区县，但不得提交家乡历史区县'
  )

  const card = read('src/pages/verification/components/BasicInfoCard.tsx')
  const picker = read('src/pages/verification/components/LanhuPickerSheet.tsx')
  const basic = read('src/pages/verification/basic.tsx')
  assert.match(card, /includeDistrict=\{editor\.rowId === 'location'\}/, '只有现居地必须启用区县列')
  assert.match(card, /districtCode=/, '资料选择器必须反显现居区县')
  assert.match(
    picker,
    /selectedDistrict|districtLoading|includeDistrict/,
    '现居地选择器必须维护区县状态'
  )
  assert.match(basic, /normalizeTwoLevelRegionFieldSettings/, '页面必须继续防御家乡区县可见配置')
  assert.match(
    basic,
    /buildBasicProfileSavePayload/,
    '页面保存必须使用现居三级、家乡两级字段白名单'
  )
})

test('现居地和家乡共用选择器并按场景切换三级或两级', () => {
  const card = read('src/pages/verification/components/BasicInfoCard.tsx')
  const picker = read('src/pages/verification/components/LanhuPickerSheet.tsx')

  assert.match(
    card,
    /buildRegionPatch\(editor\.rowId, provinceCode, cityCode, districtCode/,
    '两处地区确认必须走统一地区 patch'
  )
  assert.match(
    picker,
    /onConfirm\(selectedProvince\.code, selectedCity\.code, selectedDistrict\?\.code \|\| ''\)/,
    '现居地必须回传省市区 code'
  )
  assert.equal(
    (picker.match(/enhanced\s+showScrollbar=\{false\}/g) || []).length,
    3,
    '现居地必须支持省、市、区三列'
  )
})

test('地区路径异常不得向用户暴露三级行政区技术文案', () => {
  const regionDomainPath = 'src/domain/basicProfileRegion.ts'
  const { toTwoLevelRegionErrorMessage } = loadTypeScriptModule(regionDomainPath)
  assert.equal(
    toTwoLevelRegionErrorMessage(
      new Error('REGION_NOT_SUPPORTED：现居地必须使用有效的中国大陆省市区编码')
    ),
    '地区选项已更新，请重新选择省市区'
  )

  const loginAddress = read('src/pages/login/address.tsx')
  const basic = read('src/pages/verification/basic.tsx')
  assert.match(loginAddress, /toTwoLevelRegionErrorMessage/, '首登地址页必须转换地区业务错误')
  assert.match(basic, /toTwoLevelRegionErrorMessage/, '基础资料页必须转换地区业务错误')
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
  const index = read('src/pages/index/index.tsx')
  assert.match(
    index,
    /top: '1098rpx'[\s\S]{0,180}borderRadius: '27rpx'/,
    '未认证“立即完善”按钮圆角必须为 27rpx'
  )
  assert.doesNotMatch(
    index,
    /top: '1098rpx'[\s\S]{0,180}borderRadius: '40rpx'/,
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
    /durationText=\{formatVoiceDuration\(recordingSeconds\)\}/,
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
