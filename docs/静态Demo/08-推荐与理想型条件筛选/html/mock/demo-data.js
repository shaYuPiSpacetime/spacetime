window.PRD08_DATA = {
  demoDate: '2026-08-09',
  config: { unitUnlockPrice: 80, batchMax: 5, replayDays: 3, targetCityMax: 3, demoCities: ['杭州','宁波','上海'], nextRecommendResetAt: '2026-08-10 00:00' },
  routes: {
    communityCityUrl: '../../05-推荐模块（朋友、社区与内容互动）/html/miniapp.html#APP-05-PAGE-community-city',
    whisperMessageUrl: '../../03-消息、私信与通知中心/html/miniapp.html#APP-03-PAGE-whisper-message'
  },
  defaultAssets: {
    noData: 'https://lanhu-oss-2537-2.lanhuapp.com/SketchPng12d856510a769fecf7cf5091f43bfb35e7e48df18c6f85f675ac61e113c1c3a2',
    emptyPerson: 'https://lanhu-oss-2537-2.lanhuapp.com/SketchPng0f7c32bdf6420f4d391ed3ac2197126ce6375ad17544aa6ce9f2cc17a7c0246a',
    loadFailed: 'https://lanhu-oss-2537-2.lanhuapp.com/SketchPng4051565776b692bee37d4f3ce2b5f1c217e0debd52975105f6c22974a9b90a82',
    networkFailed: 'https://lanhu-oss-2537-2.lanhuapp.com/SketchPng067d92063cdc7ee314f3dbcd906e02067d5d91bb6d2db6b12fbfdda0c9182a91',
    searchEmpty: 'https://lanhu-oss-2537-2.lanhuapp.com/SketchPng8064b5ed11a40071254131263a6ec02e7071bd7c00f79f21c7ce7304c11aa733'
  },
  profile: { city: '杭州', ageMin: 25, ageMax: 31, isVip: false, isCertified: true, profileComplete: true, balance: 260 },
  candidates: [
    { no:'U8001201', name:'林知夏', age:27, birthYear:1999, city:'杭州', school:'浙江大学', job:'品牌策划', height:'168cm', tags:['喜欢旅行','有运动习惯','认真生活'], photo:'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85' },
    { no:'U8001202', name:'周予安', age:29, birthYear:1997, city:'杭州', school:'同济大学', job:'建筑设计师', height:'170cm', tags:['喜欢小动物','喜欢美食','周末徒步'], photo:'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=85' },
    { no:'U8001203', name:'沈听澜', age:28, birthYear:1998, city:'绍兴', school:'浙江工业大学', job:'产品经理', height:'166cm', tags:['喜欢旅行','有运动习惯','阅读'], photo:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85' }
  ],
  replayDays: [
    { date:'2026-08-06', recommendedCount:10, skippedCount:8, candidateIndexes:[0,1] },
    { date:'2026-08-05', recommendedCount:0, skippedCount:0, candidateIndexes:[] },
    { date:'2026-08-04', recommendedCount:6, skippedCount:3, candidateIndexes:[2] }
  ],
  idealGroups: [
    { name:'外在条件', items:[['height_165','身高165+']] },
    { name:'教育背景', items:[['school_tier','985/211'],['doctor','博士学历'],['overseas','留学海归'],['alumni','校友','school']] },
    { name:'经济实力', items:[['home_owner','已购房'],['car_owner','已购车']] },
    { name:'家庭背景', items:[['only_child','独生子女'],['public_family','体制内家庭'],['local','本地人']] },
    { name:'兴趣爱好', items:[['sports','有运动习惯'],['animals','喜欢小动物'],['food','喜欢美食'],['travel','喜欢旅行'],['interest_similar','兴趣相似','interest']] },
    { name:'感情与经历', items:[['view_compatible','感情观相合','relationship'],['marry_2y','想2年内结婚']] }
  ],
  idealResults: [
    { no:'I08001', ageBand:'26–28岁', city:'杭州', summary:['985/211','喜欢旅行'], clearName:'许清和', photo:'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=75' },
    { no:'I08002', ageBand:'27–30岁', city:'杭州', summary:['已购房','有运动习惯'], clearName:'唐予宁', photo:'https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?auto=format&fit=crop&w=600&q=75' },
    { no:'I08003', ageBand:'25–28岁', city:'杭州', summary:['留学海归','喜欢小动物'], clearName:'陈星遥', photo:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=75' },
    { no:'I08004', ageBand:'28–31岁', city:'杭州', summary:['博士学历','感情观相合'], clearName:'宋晚晴', photo:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=75' }
  ],
  filterRecords: [
    { no:'S08021', date:'今天 10:08', summary:'杭州 · 25–31 · 5项', count:12, status:'active' },
    { no:'S08020', date:'7月12日 21:32', summary:'杭州 · 26–32 · 3项', count:7, status:'active' },
    { no:'S07982', date:'4月10日 09:15', summary:'宁波 · 25–30 · 4项', count:4, status:'expired' }
  ],
  unlockedHistory: [
    { no:'U08011', name:'顾嘉言', time:'7月15日 20:16', status:'active', summary:'杭州 · 28岁 · 已查看公开资料' },
    { no:'U08009', name:'匿名用户', time:'6月28日 11:40', status:'expired', summary:'账号已失效，保留解锁记录' }
  ]
};
