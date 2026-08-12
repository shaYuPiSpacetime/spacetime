const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('推荐与理想型客户端接口完整绑定 PRD-08 后端', () => {
  const recommend = read('src/services/recommend.ts')
  const ideal = read('src/services/ideal.ts')

  for (const endpoint of [
    '/miniapp/recommend/preferences',
    '/miniapp/recommend/candidates',
    '/miniapp/recommend/replay',
    '/miniapp/recommend/meeting-preference',
  ]) {
    assert.match(recommend, new RegExp(endpoint.replaceAll('/', '\\/')), `推荐服务缺少 ${endpoint}`)
  }

  for (const endpoint of [
    '/miniapp/ideal/meta',
    '/miniapp/ideal/search',
    '/miniapp/ideal/unlock/quote',
    '/miniapp/ideal/unlock-all/quote',
    '/miniapp/ideal/unlock/confirm',
    '/miniapp/ideal/search-records',
    '/miniapp/ideal/unlocks',
    '/miniapp/ideal/help',
  ]) {
    assert.match(ideal, new RegExp(endpoint.replaceAll('/', '\\/')), `理想型服务缺少 ${endpoint}`)
  }
})

test('推荐首页由真实推荐状态驱动并禁止继续复用家园页', () => {
  const source = read('src/pages/recommend/index.tsx')

  assert.doesNotMatch(source, /QianxunFamilyPage/, '推荐 Tab 不能再渲染家园页')
  assert.match(source, /getRecommendCandidates/, '推荐首页必须读取真实候选接口')
  assert.match(
    source,
    /waitingReason === 'browse_limit'/,
    '每日上限必须由服务端 waitingReason 驱动'
  )
  assert.match(
    source,
    /waitingReason === 'no_candidate'/,
    '暂无推荐必须由服务端 waitingReason 驱动'
  )
  assert.match(source, /暂时还没有推荐/, '空态文案必须与蓝湖稿一致')
  assert.doesNotMatch(source, /重新加载/, '暂无推荐页不得出现重新加载按钮')
  assert.match(
    source,
    /communicationMode === 'PRIVATE_MESSAGE'/,
    '沟通按钮必须使用服务端 communicationMode'
  )
  assert.match(source, /recordRecommendView/, '候选有效曝光后必须写入真实浏览日志')
  assert.match(source, /recordRecommendSkip/, '跳过必须写入真实跳过日志')
})

test('推荐主页与本人预览共用资料组件，未解锁和已解锁文案闭环', () => {
  const publicPage = read('src/pages/heart/user.tsx')
  const shared = read('src/pages/profile/components/ProfilePreviewPage.tsx')

  assert.match(publicPage, /<ProfilePreviewPage/, '公开主页必须复用主页预览组件')
  assert.match(
    publicPage,
    /PRIVATE_MESSAGE' \? '私信' : '悄悄话'/,
    '公开主页沟通文案必须按解锁态切换'
  )
  assert.match(shared, /buildProfilePreviewVisibility/, '共享资料组件必须隐藏未填写模块')
  assert.doesNotMatch(shared, /暂未填写自我介绍/, '公开资料组件不得渲染空白占位模块')
})

test('推荐非底部静态素材全部来自 OSS 常量', () => {
  const icons = read('src/constants/ossIcons.ts')
  for (const key of [
    'recommendSkip',
    'recommendLike',
    'recommendWhisper',
    'recommendVipBadge',
    'recommendVipBanner',
    'idealHeroBackground',
    'idealHeaderBackground',
    'idealFilter',
    'recommendReplay',
    'recommendPreference',
    'idealHistory',
  ]) {
    assert.match(icons, new RegExp(`${key}: 'https://`), `OSS 常量缺少 ${key}`)
  }
})

test('推荐与理想型右上角图标按蓝湖 18px 基线渲染并保留足够点击热区', () => {
  const source = read('src/pages/recommend/index.tsx')
  const waiting = read('src/pages/prd08/recommend/waiting/index.tsx')
  const results = read('src/pages/prd08/ideal/results/index.tsx')
  const recommendHeader = source.slice(
    source.indexOf('function RecommendHeader'),
    source.indexOf('function RecommendCandidateCard')
  )
  const idealLanding = source.slice(
    source.indexOf('function IdealLanding'),
    source.indexOf('function RecommendWaiting')
  )

  assert.match(recommendHeader, /actionSize:\s*70/, '推荐页点击热区必须保持 70rpx')
  for (const icon of ['recommendReplay', 'recommendPreference']) {
    assert.match(
      recommendHeader,
      new RegExp(`${icon}[\\s\\S]{0,180}width: '36rpx', height: '36rpx'`),
      `${icon} 可见尺寸必须还原蓝湖 18px，即 36rpx`
    )
  }
  assert.match(idealLanding, /actionSize:\s*72/, '理想型点击热区必须保持 72rpx')
  assert.match(
    idealLanding,
    /idealHistory[\s\S]{0,180}width: '36rpx', height: '36rpx'/,
    '理想型历史图标可见尺寸必须还原蓝湖 18px，即 36rpx'
  )
  assert.match(waiting, /getCapsuleLeftActionsLayout/, '每日上限页右上操作区必须避让真实胶囊')
  assert.doesNotMatch(waiting, /left:\s*['"](?:470|535)rpx['"]/, '每日上限页不得写死操作区横坐标')
  for (const icon of ['recommendReplay', 'recommendPreference']) {
    assert.match(
      waiting,
      new RegExp(`${icon}[\\s\\S]{0,180}width: '36rpx', height: '36rpx'`),
      `每日上限页 ${icon} 必须保持 36rpx`
    )
  }
  assert.match(
    results,
    /idealHistory[\s\S]{0,180}width: '36rpx', height: '36rpx'/,
    '理想型结果页历史图标必须保持 36rpx'
  )
})

test('推荐等待聚合页的悄悄话和同城入口使用设计图标', () => {
  const waiting = read('src/pages/prd08/recommend/waiting/index.tsx')

  assert.match(waiting, /miniappOssIcons\.recommendWhisper/, '悄悄话入口必须显示设计图标')
  assert.match(waiting, /<SameCityIcon\s*\/>/, '同城入口必须显示独立的可见图标')
  assert.match(waiting, /miniappOssIcons\.recommendVipBadge/, '会员横幅必须显示蓝湖会员徽章')
})

test('PRD-08 子页面全部注册且使用自定义导航', () => {
  const config = read('src/app.config.ts')
  assert.doesNotMatch(
    config,
    /root:\s*'pages\/recommend'/,
    'TabBar 推荐页目录不能同时作为分包根目录'
  )
  assert.match(config, /root:\s*'pages\/prd08'/, 'PRD-08 子页面必须进入独立分包目录')
  for (const route of [
    "'recommend/waiting/index'",
    "'recommend/replay/index'",
    "'recommend/preference/index'",
    "'ideal/filter/index'",
    "'ideal/results/index'",
    "'ideal/records/index'",
    "'ideal/unlocks/index'",
    "'ideal/help/index'",
  ]) {
    assert.match(config, new RegExp(route.replaceAll('/', '\\/')), `app.config 缺少 ${route}`)
  }
})

test('三天回看与偏好设置均由真实接口和会员态驱动', () => {
  const replay = read('src/pages/prd08/recommend/replay/index.tsx')
  const preference = read('src/pages/prd08/recommend/preference/index.tsx')

  assert.match(replay, /getRecommendReplay/, '三天回看必须读取真实接口')
  assert.match(replay, /getApiErrorCode\(error\) === 403/, '非会员必须按后端 403 展示会员门禁')
  assert.match(replay, /dateGroup/, '回看必须使用真实日期分组')
  assert.doesNotMatch(replay, /2026-08-02/, '回看日期不得写死设计数据')

  assert.match(preference, /getRecommendPreferences/, '偏好页必须加载真实偏好')
  assert.match(preference, /saveRecommendPreferences/, '偏好页必须保存到后端')
  assert.match(preference, /vipEffective/, '高级筛选必须由会员权益控制')
  assert.match(preference, /<Slider/, '年龄、身高或体重范围必须可滑动')
})

test('理想型筛选、结果、报价、确认、历史和帮助形成完整闭环', () => {
  const filter = read('src/pages/prd08/ideal/filter/index.tsx')
  const results = read('src/pages/prd08/ideal/results/index.tsx')
  const unlocks = read('src/pages/prd08/ideal/unlocks/index.tsx')
  const help = read('src/pages/prd08/ideal/help/index.tsx')

  assert.match(filter, /getIdealMeta/, '筛选页必须读取服务端元数据')
  assert.match(filter, /createIdealSearch/, '选好了必须生成服务端快照')
  assert.match(filter, /condition\.available/, '不可用条件必须按服务端依赖禁用')

  assert.match(results, /getIdealResults/, '结果页必须读取快照结果')
  assert.match(results, /quoteIdealUnlock/, '单个解锁必须由后端报价')
  assert.match(results, /quoteAllIdealUnlock/, '解锁全部必须由后端报价')
  assert.match(results, /confirmIdealUnlock/, '解锁必须经过确认扣币')
  assert.match(results, /balanceEnough/, '余额不足必须由报价结果判断')
  assert.doesNotMatch(results, /payableCost\s*=|originalCost\s*\*/, '客户端不得自行计算批量折扣')

  assert.match(unlocks, /getIdealUnlocks/, '历史解锁必须读取真实接口')
  assert.doesNotMatch(unlocks, /重新加载/, '历史解锁空态不得显示重新加载按钮')
  assert.match(help, /getIdealHelp/, '帮助正文和价格必须动态读取')
  assert.doesNotMatch(help, />200</, '帮助页不得写死单价')
})

test('理想型结果首卡不被原生滚动容器裁剪且筛选面板尺寸对齐设计稿', () => {
  const filter = read('src/pages/prd08/ideal/filter/index.tsx')
  const results = read('src/pages/prd08/ideal/results/index.tsx')
  const addressSheet = filter.slice(
    filter.indexOf('function AddressSheet'),
    filter.indexOf('function AgeSheet')
  )

  assert.doesNotMatch(
    results,
    /margin:\s*['"]-194rpx auto 0['"]/,
    '结果卡片不能用负边距越过 ScrollView 顶部，否则微信端会裁掉头像和标题'
  )
  assert.match(results, /top:\s*['"]184rpx['"]/, '结果滚动视口必须从设计稿卡片顶部开始')
  assert.match(results, /minHeight:\s*['"]468rpx['"]/, '结果卡片高度必须容纳两行命中条件')
  assert.doesNotMatch(results, /linear-gradient\(135deg/, '结果卡片不应出现设计稿外的蓝色渐变')
  assert.match(filter, /height:\s*['"]756rpx['"]/, '地址面板高度必须对齐设计稿')
  assert.match(
    addressSheet,
    /id="ideal-address-country-tabs"/,
    '地址面板必须按设计稿独立显示中国/海外地区国家 Tab'
  )
  assert.equal(
    (addressSheet.match(/<PickerViewColumn>/g) || []).length,
    2,
    '地址滚轮只能承载省/市两列，国家类型不能混入第一列'
  )
  assert.match(
    addressSheet,
    /id="ideal-address-picker-selection"/,
    '滚轮选中行背景必须放在原生 PickerView 下层，避免盖住当前文字'
  )
  assert.doesNotMatch(
    addressSheet,
    /indicatorStyle="[^"]*background:\s*#E4F1FF/,
    '原生 indicatorStyle 不能绘制不透明背景，否则微信端会遮挡选中文字'
  )
  assert.match(filter, /height:\s*['"]496rpx['"]/, '年龄面板高度必须对齐设计稿')
  assert.match(filter, /marginTop:\s*['"]61rpx['"]/, '年龄确认按钮必须对齐设计稿底部间距')
})

test('跨页面导航与充值回跳不会丢失状态或重复确认过期报价', () => {
  const home = read('src/pages/recommend/index.tsx')
  const waiting = read('src/pages/prd08/recommend/waiting/index.tsx')
  const results = read('src/pages/prd08/ideal/results/index.tsx')

  assert.doesNotMatch(
    waiting,
    /switchTab\(\{\s*url:\s*['"]\/pages\/recommend\/index\?tab=ideal/,
    'tabBar 跳转不得依赖会被微信忽略的 query'
  )
  assert.match(
    waiting,
    /setStorageSync\(RECOMMEND_TAB_STORAGE_KEY,\s*'ideal'\)/,
    '进入理想型前必须持久化目标 Tab'
  )
  assert.match(home, /useDidShow/, '推荐首页必须在 tabBar 回显时恢复目标 Tab')
  assert.match(
    home,
    /removeStorageSync\(RECOMMEND_TAB_STORAGE_KEY\)/,
    '目标 Tab 消费后必须清理临时状态'
  )
  assert.match(
    results,
    /catch \(error\) \{\s*Taro\.removeStorageSync\(PENDING_QUOTE_KEY\)/,
    '报价确认失败后必须清理过期报价，避免每次返回重复弹错'
  )
})

test('推荐与理想型页面不得使用文字字符冒充设计图标', () => {
  const sources = [
    'src/pages/recommend/index.tsx',
    'src/pages/prd08/recommend/waiting/index.tsx',
    'src/pages/prd08/recommend/preference/index.tsx',
    'src/pages/prd08/ideal/filter/index.tsx',
    'src/pages/prd08/ideal/results/index.tsx',
  ]
    .map(read)
    .join('\n')

  assert.doesNotMatch(sources, /[⌕⌖⟳◇]/, '搜索、定位、换一批和会员标识必须使用真实 Image/CSS 图标')
})

test('理想型充值成功只回到结果页，不会再叠加支付结果页', () => {
  const useCoins = read('src/hooks/useCoins.ts')
  const recharge = read('src/pages/coins/unlock-recharge.tsx')

  assert.match(useCoins, /navigateOnSuccess/, '通用支付流程必须允许来源页接管成功后的导航')
  assert.match(
    recharge,
    /idealScene\s*\?\s*\{\s*navigateOnSuccess:\s*false\s*\}\s*:\s*undefined/,
    '只有理想型充值覆盖默认成功导航'
  )
})

test('取消喜欢后必须使用服务端权限降级为悄悄话', () => {
  const recommend = read('src/pages/recommend/index.tsx')
  const publicProfile = read('src/pages/heart/user.tsx')

  assert.match(
    recommend,
    /relation\.canEnterConversation\s*\?\s*'PRIVATE_MESSAGE'\s*:\s*'WHISPER'/,
    '推荐页取消喜欢后不能保留旧私信态'
  )
  assert.match(
    publicProfile,
    /data\.canEnterConversation\s*\?\s*'PRIVATE_MESSAGE'\s*:\s*'WHISPER'/,
    '公开主页取消喜欢后不能保留旧私信态'
  )
})

test('筛选记录和历史解锁支持真实游标分页', () => {
  const records = read('src/pages/prd08/ideal/records/index.tsx')
  const unlocks = read('src/pages/prd08/ideal/unlocks/index.tsx')

  for (const [name, source] of [
    ['筛选记录', records],
    ['历史解锁', unlocks],
  ]) {
    assert.match(source, /nextCursor/, `${name}必须保存服务端下一页游标`)
    assert.match(source, /onScrollToLower/, `${name}必须在滚动到底时加载下一页`)
    assert.match(
      source,
      /\.\.\.current,\s*\.\.\.\(data\.items/,
      `${name}翻页必须追加而不是覆盖现有记录`
    )
  }
})

test('见面偏好独立页有真实接口、错误态和保存失败反馈', () => {
  const meeting = read('src/pages/prd08/recommend/meeting-preference/index.tsx')

  assert.match(meeting, /getMeetingPreference/, '见面偏好独立页必须读取真实接口')
  assert.match(meeting, /saveMeetingPreference/, '见面偏好独立页必须保存真实接口')
  assert.match(meeting, /setMessage/, '见面偏好加载失败不能只留下空白页')
  assert.match(meeting, /保存失败/, '见面偏好保存失败必须给出明确反馈')
})

test('三天回看可直接喜欢，公开主页可执行不再推荐和拉黑', () => {
  const replay = read('src/pages/prd08/recommend/replay/index.tsx')
  const publicProfile = read('src/pages/heart/user.tsx')
  const settings = read('src/services/settings.ts')

  assert.match(replay, /sendRelationLike/, '三天回看必须支持真实喜欢接口')
  assert.match(replay, /recordRecommendLike/, '三天回看喜欢后必须记录推荐动作')
  assert.match(replay, /miniappOssIcons\.recommendLike/, '三天回看喜欢必须使用设计图标')
  assert.match(publicProfile, /neverRecommendCandidate/, '公开主页必须支持不再推荐')
  assert.match(publicProfile, /settingsApi\.addBlacklist/, '公开主页必须支持拉黑')
  assert.match(
    settings,
    /\/miniapp\/settings\/blocks\/blacklist/,
    '小程序设置服务必须对接真实黑名单接口'
  )
})
