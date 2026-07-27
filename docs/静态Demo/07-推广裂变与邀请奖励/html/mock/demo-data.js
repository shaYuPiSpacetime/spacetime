window.PRD07_DATA = {
  config: {
    version: 'V4.0', updatedAt: '2026-07-17 16:20', updatedBy: '运营管理员 林夏',
    normal: {
      mode: 'ladder',
      events: [
        { key: 'register', name: '完成注册', amount: 20, enabled: true, required: true },
        { key: 'profile', name: '完善资料', amount: 30, enabled: true },
        { key: 'verify', name: '认证完成', amount: 50, enabled: true },
        { key: 'firstVip', name: '首次会员', amount: 80, enabled: true },
        { key: 'firstRecharge', name: '首次充值', amount: 20, enabled: false }
      ],
      ladders: [{ count: 5, amount: 50 }, { count: 10, amount: 100 }, { count: 20, amount: 150 }]
    },
    agent: {
      mode: 'ladder',
      events: [
        { key: 'register', name: '完成注册', amount: 20, enabled: true, required: true },
        { key: 'profile', name: '完善资料', amount: 30, enabled: true },
        { key: 'verify', name: '认证完成', amount: 50, enabled: true },
        { key: 'firstVip', name: '首次会员', amount: 80, enabled: true },
        { key: 'firstRecharge', name: '首次充值', amount: 20, enabled: false }
      ],
      ladders: [{ count: 5, amount: 50 }, { count: 10, amount: 100 }, { count: 20, amount: 150 }]
    }
  },
  mobile: {
    registerReward: 20,
    successCount: 10,
    rewardTotal: 330,
    currentLadderCount: 10,
    maxLadderCount: 20,
    shareLink: '/invite/U100086',
    ladders: [
      { count: 5, amount: 50, achieved: true },
      { count: 10, amount: 100, achieved: true },
      { count: 20, amount: 200, achieved: false }
    ],
    recentInvites: [
      { name: '用户9876', time: '07-15 11:06', status: '注册成功', reward: 20 },
      { name: '用户0976', time: '07-15 11:06', status: '注册成功', reward: 20 },
      { name: '用户0976', time: '07-15 11:06', status: '注册成功', reward: 20 }
    ]
  },
  relations: [
    { id: 'IR202607160018', sourceObject: 'U100086 / 林夏', invitee: 'U100326 / 林**', sourceType: '普通用户', boundAt: '2026-07-16 20:18', paidReward: 20 },
    { id: 'IR202607150012', sourceObject: 'U100086 / 林夏', invitee: 'U100319 / 周**', sourceType: '普通用户', boundAt: '2026-07-15 11:06', paidReward: 70 },
    { id: 'IR202607140009', sourceObject: 'A00012 / 陈舟', invitee: 'U100308 / 陈**', sourceType: '校园代理', boundAt: '2026-07-14 18:32', paidReward: 20 },
    { id: 'IR202607120006', sourceObject: 'A00008 / 许安', invitee: 'U100287 / 唐**', sourceType: '校园代理', boundAt: '2026-07-12 09:45', paidReward: 100 }
  ],
  rewards: [
    { id: 'RW202607160088', relationId: 'IR202607160018', rewardObject: 'U100086 / 林夏', relatedUser: 'U100326 / 林**', event: '完成注册', amount: 20, createdAt: '2026-07-16 20:18', status: '已发放' },
    { id: 'RW202607150067', relationId: 'IR202607150012', rewardObject: 'U100086 / 林夏', relatedUser: 'U100319 / 周**', event: '完成注册', amount: 20, createdAt: '2026-07-15 11:08', status: '已发放' },
    { id: 'RW202607150068', relationId: 'IR202607150012', rewardObject: 'U100086 / 林夏', relatedUser: 'U100319 / 周**', event: '阶梯奖励-累计5人', amount: 50, createdAt: '2026-07-15 11:08', status: '已发放' },
    { id: 'RW202607140051', relationId: 'IR202607140009', rewardObject: 'A00012 / 陈舟', relatedUser: 'U100308 / 陈**', event: '完成注册', amount: 20, createdAt: '2026-07-14 18:33', status: '发放失败' },
    { id: 'RW202607120029', relationId: 'IR202607120006', rewardObject: 'A00008 / 许安', relatedUser: 'U100287 / 唐**', event: '阶梯奖励-累计10人', amount: 100, createdAt: '2026-07-12 10:18', status: '待发放' }
  ],
  agents: [
    { id: 'A00012', name: '陈舟', campus: '时空大学 / 本部校区', scans: 1260, registers: 98, payable: 18620, paid: 15940, pending: 2680, status: '启用', qrCode: 'AGENT-A00012' },
    { id: 'A00008', name: '许安', campus: '千寻大学 / 东校区', scans: 820, registers: 70, payable: 12350, paid: 11000, pending: 1350, status: '启用', qrCode: 'AGENT-A00008' },
    { id: 'A00019', name: '林澄', campus: '星河学院 / 南校区', scans: 340, registers: 25, payable: 4480, paid: 4000, pending: 480, status: '停用', qrCode: 'AGENT-A00019' },
    { id: 'A00023', name: '顾宁', campus: '时空大学 / 新城校区', scans: 170, registers: 15, payable: 1620, paid: 1000, pending: 620, status: '启用', qrCode: 'AGENT-A00023' }
  ],
  settlements: [
    { id: 'ST202606-0012', agent: 'A00012 / 陈舟', campus: '时空大学 / 本部校区', period: '2026-06-01 至 2026-06-30', amount: 3120, generatedAt: '2026-07-01 01:00', confirmedAt: '—', status: '待确定' },
    { id: 'ST202606-0008', agent: 'A00008 / 许安', campus: '千寻大学 / 东校区', period: '2026-06-01 至 2026-06-30', amount: 2860, generatedAt: '2026-07-01 01:00', confirmedAt: '2026-07-02 10:20', status: '已确定' },
    { id: 'ST202605-0012', agent: 'A00012 / 陈舟', campus: '时空大学 / 本部校区', period: '2026-05-01 至 2026-05-31', amount: 2540, generatedAt: '2026-06-01 01:00', confirmedAt: '2026-06-03 09:16', status: '已确定' }
  ],
  auditLogs: [
    { time: '2026-07-17 16:20', operator: '林夏', action: '发布普通邀请与校园代理阶梯奖励 V4.0' },
    { time: '2026-07-02 10:20', operator: '李静', action: '确定结算单 ST202606-0008' }
  ]
};
