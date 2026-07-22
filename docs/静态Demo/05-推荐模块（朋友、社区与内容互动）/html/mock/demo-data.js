const PRD05_AVATAR = (skin, bgStart, bgEnd, hair) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bgStart}"/><stop offset="1" stop-color="${bgEnd}"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#bg)"/><circle cx="60" cy="52" r="24" fill="${skin}"/><path d="M28 106c7-24 23-37 32-37s25 13 32 37" fill="${skin}"/><path d="M35 45c8-26 44-34 56-4-11-7-24-9-36-5-9 3-15 7-20 9z" fill="${hair}"/></svg>`)}`;
const PRD05_TOPIC_COVER = (bgStart, bgEnd, accent) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 136"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bgStart}"/><stop offset="1" stop-color="${bgEnd}"/></linearGradient></defs><rect width="240" height="136" rx="18" fill="url(#bg)"/><circle cx="190" cy="36" r="24" fill="${accent}" opacity=".72"/><path d="M0 102c38-26 70-30 108-8 45 27 83 19 132-15v57H0z" fill="#fff" opacity=".33"/><path d="M18 92c35-26 73-28 110-7 38 22 71 19 94-2" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".62"/></svg>`)}`;

window.PRD05_DEMO_DATA = {
  currentUser: {
    id: 'U10021',
    name: '林浅',
    city: '杭州',
    citySource: '已审核资料',
    cityReadOnly: true,
    coreAccess: '已通过三项认证',
    coinBalance: 180,
    freeWhisper: 1
  },
  yuemuUsers: [
    { id: 'U-YM-01', name: '周予安', photo: '湖边人像', avatar: PRD05_AVATAR('#f7c6a7', '#1f2937', '#64748b', '#111827'), fateLabel: '同专业，超有缘', educationSchool: '硕士 · 南京大学', onlineText: '2 小时前在线' },
    { id: 'U-YM-02', name: '许知意', photo: '城市人像', avatar: PRD05_AVATAR('#f2b8a2', '#0f766e', '#67e8f9', '#3f2a24'), fateLabel: '兴趣相投', educationSchool: '本科 · 浙江大学', onlineText: '刚刚在线' },
    { id: 'U-YM-03', name: '孟夏', photo: '咖啡店人像', avatar: PRD05_AVATAR('#f1b79d', '#f97316', '#fb7185', '#4a2c22'), fateLabel: '同城生活家', educationSchool: '硕士 · 浙江工商大学', onlineText: '1 小时前在线' },
    { id: 'U-YM-04', name: '顾清和', photo: '建筑展人像', avatar: PRD05_AVATAR('#c88b6a', '#334155', '#0ea5e9', '#0f172a'), fateLabel: '审美同频', educationSchool: '本科 · 同济大学', onlineText: '今天在线' }
  ],
  tabs: ['关注', '同城', '热门', '话题'],
  topics: [
    { id: 'T-1001', name: '周末去哪里', desc: '城市周末活动和约会灵感', cover: PRD05_TOPIC_COVER('#60a5fa', '#0f766e', '#facc15'), hot: 982, count: 128, status: '启用', recommended: true, sort: 10, participantCount: 86, viewCount: 3260, participantAvatars: [PRD05_AVATAR('#f7c6a7', '#1f2937', '#64748b', '#111827'), PRD05_AVATAR('#f2b8a2', '#0f766e', '#67e8f9', '#3f2a24')], updatedBy: '运营admin', updatedTime: '2026-07-06 10:20', scenes: ['热门入口', '话题列表', '发布页'] },
    { id: 'T-1002', name: '认真找对象', desc: '真诚关系和长期主义', cover: PRD05_TOPIC_COVER('#fb7185', '#7c3aed', '#fde68a'), hot: 875, count: 96, status: '启用', recommended: true, sort: 20, participantCount: 64, viewCount: 2880, participantAvatars: [PRD05_AVATAR('#d9a47f', '#2563eb', '#8b5cf6', '#1e293b'), PRD05_AVATAR('#d6a27f', '#7c3aed', '#db2777', '#1f2937')], updatedBy: '运营admin', updatedTime: '2026-07-06 10:12', scenes: ['热门入口', '话题列表', '发布页'] },
    { id: 'T-1003', name: '下班后的生活', desc: '生活方式、运动、读书和小店', cover: PRD05_TOPIC_COVER('#22c55e', '#0369a1', '#bbf7d0'), hot: 621, count: 77, status: '启用', recommended: true, sort: 30, updatedBy: '运营admin', updatedTime: '2026-07-05 18:32', scenes: ['话题列表', '发布页'] },
    { id: 'T-1004', name: '同城饭搭子', desc: '饭搭子、展览、徒步和咖啡', cover: PRD05_TOPIC_COVER('#f97316', '#be123c', '#fef3c7'), hot: 512, count: 51, status: '启用', recommended: false, sort: 40, updatedBy: '运营admin', updatedTime: '2026-07-05 16:08', scenes: ['话题列表', '发布页'] },
    { id: 'T-1005', name: '树洞慢聊', desc: '轻量表达情绪和生活片段', cover: PRD05_TOPIC_COVER('#64748b', '#312e81', '#c4b5fd'), hot: 92, count: 12, status: '停用', recommended: false, sort: 90, updatedBy: '运营admin', updatedTime: '2026-07-04 11:40', scenes: ['话题列表'] }
  ],
  posts: [
    {
      id: 'P-240701',
      type: 'community_post',
      author: '周予安',
      avatar: PRD05_AVATAR('#f7c6a7', '#1f2937', '#64748b', '#111827'),
      gender: '♀',
      city: '杭州',
      topic: '周末去哪里',
      profile: '97年 · 杭州 · 设计行业',
      text: '周六想去良渚看展，结束后找一家安静的咖啡店坐坐。喜欢慢一点的安排，也欢迎推荐小众路线。',
      images: ['良渚展览', '手冲咖啡'],
      likeCount: 86,
      commentCount: 12,
      interactionCount: 92,
      commentPreview: ['林浅：良渚路线我也记下了。', '周予安：收到，谢谢推荐。'],
      status: 'published',
      time: '18 分钟前',
      activeText: '刚刚活跃',
      followed: true,
      yuemu: true,
      width: 720,
      height: 960
    },
    {
      id: 'P-240702',
      type: 'community_post',
      author: '许知意',
      avatar: PRD05_AVATAR('#f2b8a2', '#0f766e', '#67e8f9', '#3f2a24'),
      gender: '♀',
      city: '杭州',
      topic: '下班后的生活',
      profile: '95年 · 杭州 · 内容运营',
      text: '最近开始固定夜跑，发现规律生活比一时兴起更难，但也更让人安心。',
      images: ['夜跑路线'],
      likeCount: 64,
      commentCount: 9,
      interactionCount: 68,
      commentPreview: ['孟夏：夜跑路线很舒服。'],
      status: 'published',
      time: '42 分钟前',
      activeText: '2 小时前活跃',
      followed: false,
      yuemu: true,
      width: 720,
      height: 540
    },
    {
      id: 'P-240703',
      type: 'sincere_post',
      author: '沈澈',
      avatar: PRD05_AVATAR('#d9a47f', '#2563eb', '#8b5cf6', '#1e293b'),
      gender: '♂',
      city: '上海',
      topic: '认真找对象',
      profile: '93年 · 上海 · 产品经理',
      text: '我在上海做产品，平时喜欢做饭、看纪录片和短途旅行。希望关系里能坦诚表达，也能给彼此空间。比起热闹，我更在意稳定的相处节奏。',
      images: ['厨房晚餐', '江边散步'],
      likeCount: 142,
      commentCount: 31,
      interactionCount: 155,
      commentPreview: ['许知意：稳定回应真的很重要。'],
      status: 'published',
      time: '今天 09:20',
      activeText: '今天 09:20',
      followed: false,
      yuemu: false,
      width: 720,
      height: 900
    },
    {
      id: 'P-240704',
      type: 'community_post',
      author: '孟夏',
      avatar: PRD05_AVATAR('#f1b79d', '#f97316', '#fb7185', '#4a2c22'),
      gender: '♀',
      city: '杭州',
      topic: '同城饭搭子',
      profile: '96年 · 杭州 · 金融行业',
      text: '今天发现一家小面馆，辣度刚刚好。一个人吃也很自在，但如果有人一起分享会更好。',
      images: ['小面馆'],
      likeCount: 49,
      commentCount: 6,
      interactionCount: 52,
      status: 'published',
      time: '昨天 21:08',
      activeText: '昨天活跃',
      followed: true,
      yuemu: true,
      width: 720,
      height: 720
    },
    {
      id: 'P-240705',
      type: 'community_post',
      author: '顾清和',
      avatar: PRD05_AVATAR('#c88b6a', '#334155', '#0ea5e9', '#0f172a'),
      gender: '♂',
      city: '杭州',
      topic: '周末去哪里',
      profile: '94年 · 杭州 · 建筑设计',
      text: '把西湖边常走的路线换成了运河边，晚风和桥洞的灯都刚刚好。',
      images: ['运河夜色'],
      likeCount: 73,
      commentCount: 14,
      interactionCount: 80,
      status: 'published',
      time: '昨天 19:22',
      activeText: '今天活跃',
      followed: false,
      yuemu: true,
      width: 900,
      height: 600
    },
    {
      id: 'P-240706',
      type: 'sincere_post',
      author: '陆景明',
      avatar: PRD05_AVATAR('#d6a27f', '#7c3aed', '#db2777', '#1f2937'),
      gender: '♂',
      city: '杭州',
      topic: '认真找对象',
      profile: '92年 · 杭州 · 软件工程师',
      text: '工作日节奏规律，周末喜欢做饭、骑行和逛书店。希望先从认真聊天开始，慢慢确认三观、边界和生活习惯是否合拍。',
      images: ['书店角落'],
      likeCount: 98,
      commentCount: 18,
      interactionCount: 106,
      status: 'published',
      time: '昨天 16:10',
      activeText: '昨天 16:10',
      followed: true,
      yuemu: false,
      width: 720,
      height: 900
    }
  ],
  comments: [
    { id: 'C-8001', source: '动态 P-240701', author: '林浅', authorId: 'U10021', text: '良渚路线我也记下了，展后咖啡可以去瓶窑那家小店。', status: 'published', time: '12 分钟前', createTime: '2026-07-06 10:25', likes: 12, reports: 0 },
    { id: 'C-8002', source: '动态 P-240701', author: '周予安', authorId: 'U2088', text: '收到，我查一下路线，谢谢推荐。', status: 'published', time: '8 分钟前', createTime: '2026-07-06 10:31', likes: 8, reports: 0 },
    { id: 'C-8003', source: '诚意贴 P-240703', author: '系统提示', authorId: 'SYS', text: '评论机审通过后公开，人工复核可在后台评论审核中处理。', status: 'pending_machine', time: '刚刚', createTime: '2026-07-06 10:42', likes: 0, reports: 1 }
  ],
  reports: [
    { id: 'RPT-0501', type: '动态', target: '动态 P-240701', reason: '疑似联系方式', status: '待处理', reporter: 'U10021 / 林浅', targetUser: 'U2088 / 周予安', time: '2026-07-06 09:22', replied: false },
    { id: 'RPT-0502', type: '评论', target: '评论 C-8003', reason: '攻击辱骂', status: '处理中', reporter: 'U10088 / 许知意', targetUser: 'SYS / 系统提示', time: '2026-07-06 10:12', replied: true },
    { id: 'RPT-0503', type: '用户', target: '用户 U2088', reason: '头像违规', status: '举报成立', reporter: 'U10035 / 孟夏', targetUser: 'U2088 / 周予安', time: '2026-07-05 18:44', replied: true }
  ],
  audits: [
    {
      id: 'AUD-501',
      contentId: 'P-240703',
      title: '想认真认识一个愿意一起生活的人',
      content: '我在上海做产品，平时喜欢做饭、看纪录片和短途旅行。希望关系里能坦诚表达。',
      type: '诚意贴',
      module: '知音 / 诚意贴',
      author: 'U2088 / 沈澈',
      authorId: 'U2088',
      mediaType: '图文',
      views: 804,
      likes: 142,
      comments: 31,
      machine: '通过',
      status: '待人工复核',
      risk: '低',
      violationTag: '-',
      time: '2026-07-06 09:20',
      logs: ['系统提交人工复核', '机审通过', '等待审核员处理']
    },
    {
      id: 'AUD-502',
      contentId: 'P-240701',
      title: '周六良渚看展',
      content: '周六想去良渚看展，结束后找一家安静的咖啡店坐坐。',
      type: '动态',
      module: '成家 / 同城',
      author: 'U10021 / 周予安',
      authorId: 'U10021',
      mediaType: '图文',
      views: 1258,
      likes: 86,
      comments: 12,
      machine: '通过',
      status: '已公开',
      risk: '低',
      violationTag: '-',
      time: '2026-07-06 08:58',
      logs: ['机审通过', '内容公开', '进入抽检池']
    },
    {
      id: 'AUD-503',
      contentId: 'P-240707',
      title: '图片疑似二维码',
      content: '图片中疑似包含二维码或联系方式，需要人工确认是否广告引流。',
      type: '动态',
      module: '成家 / 热门',
      author: 'U3099 / 匿名用户',
      authorId: 'U3099',
      mediaType: '图片',
      views: 356,
      likes: 12,
      comments: 3,
      machine: '不确定',
      status: '待人工复核',
      risk: '中',
      violationTag: '联系方式',
      time: '2026-07-06 08:30',
      logs: ['图片安全命中疑似二维码', '进入人工复核']
    }
  ],
  config: {
    tabs: ['关注', '同城', '热门', '话题'],
    reportReasons: ['色情低俗', '广告引流', '联系方式', '攻击辱骂', '诈骗风险'],
    maxImages: 9,
    machineAudit: '启用',
    sampleRate: '10%',
    mutePeriods: ['1 天', '3 天', '7 天', '30 天'],
    ipBlock: '启用',
    ipBlockPeriods: ['1 小时', '24 小时', '72 小时', '7 天']
  },
  uploadSamples: ['展馆门口', '咖啡窗边', '散步路线', '晚餐照片', '书店角落', '城市夜景', '手写便签', '周末计划', '展览海报'],
  publishDraft: {
    contentType: 'community_post',
    content: '下班后想去运河边散步，顺便找一家安静的小店。',
    topic: '下班后的生活',
    images: [{ label: '运河晚风', uploadStatus: 'success' }],
    updatedAt: '今天 09:18'
  },
  interactionHistory: {
    commented: [
      { id: 'H-C-01', title: '周六良渚看展', summary: '你评论：良渚路线我也记下了。', time: '12 分钟前' },
      { id: 'H-C-02', title: '夜跑后的生活', summary: '你评论：这条路线很适合慢跑。', time: '昨天 21:10' }
    ],
    liked: [
      { id: 'H-L-01', title: '希望关系里有稳定回应', summary: '已点赞 · 142 赞', time: '今天 09:26' }
    ],
    unlocked: [
      { id: 'H-U-01', title: '解锁诚意资料', summary: '解锁仍有效，资产结果由 PRD-04 提供', time: '7 月 18 日' }
    ],
    viewed: [
      { id: 'H-V-01', title: '运河夜色', summary: '浏览动态 P-240705', time: '3 分钟前' },
      { id: 'H-V-02', title: '同城饭搭子', summary: '浏览话题和动态', time: '35 分钟前' }
    ]
  },
  receivedLikeStats: { posts: 286, comments: 42, total: 328 },
  followRelations: {
    following: [
      { name: '周予安', profile: '97年 · 杭州 · 设计行业', activeText: '刚刚活跃', followed: true, avatar: PRD05_AVATAR('#f7c6a7', '#1f2937', '#64748b', '#111827') },
      { name: '孟夏', profile: '96年 · 杭州 · 金融行业', activeText: '昨天活跃', followed: true, avatar: PRD05_AVATAR('#f1b79d', '#f97316', '#fb7185', '#4a2c22') }
    ],
    followers: [
      { name: '许知意', profile: '95年 · 杭州 · 内容运营', activeText: '2 小时前活跃', followed: false, avatar: PRD05_AVATAR('#f2b8a2', '#0f766e', '#67e8f9', '#3f2a24') },
      { name: '顾清和', profile: '94年 · 杭州 · 建筑设计', activeText: '今天活跃', followed: true, avatar: PRD05_AVATAR('#c88b6a', '#334155', '#0ea5e9', '#0f172a') }
    ]
  },
  postInteractors: {
    liked: [{ name: '许知意', detail: '18 分钟前点赞', followed: false }, { name: '孟夏', detail: '24 分钟前点赞', followed: true }],
    commented: [{ name: '林浅', detail: '最近评论：良渚路线我也记下了', followed: true }, { name: '周予安', detail: '最近回复：收到，谢谢推荐', followed: true }]
  },
  otherUserProfile: {
    name: '周予安',
    birthYear: '97年',
    city: '杭州',
    occupation: '设计行业',
    bio: '认真生活，也认真认识愿意分享日常的人。',
    followingCount: 18,
    followerCount: 26,
    receivedLikeCount: 328
  },
  myPosts: [
    { id: 'MY-0501', type: 'community_post', summary: '刚提交的展览动态，等待审核结果。', topic: '周末去哪里', status: 'pending_machine', statusText: '待复核', time: '刚刚', images: ['展馆门口'] },
    { id: 'MY-0502', type: 'sincere_post', summary: '诚意贴已进入人工复核，暂未公开。', topic: '认真找对象', status: 'pending_manual', statusText: '待复核', time: '今天 10:18', images: ['书店角落'] },
    { id: 'MY-0503', type: 'community_post', summary: '图片疑似包含联系方式，已驳回，可修改后重提。', topic: '同城饭搭子', status: 'rejected', statusText: '已驳回', time: '昨天 22:10', images: ['手写便签'] },
    { id: 'MY-0504', type: 'community_post', summary: '周六想去良渚看展，结束后找一家安静的咖啡店坐坐。', topic: '周末去哪里', status: 'published', statusText: '已公开', time: '昨天 18:40', images: ['良渚展览'] }
  ]
};
