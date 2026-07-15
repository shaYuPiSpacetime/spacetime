window.PRD10_DATA = {
  config: { enabled: true, version: 3, cycleDays: 7, baseReward: 10, extras: [0, 0, 5, 10, 15, 20, 30], ruleContent: { title: '签到规则', url: 'https://h5.spacetime.example/welfare/signin-rule', version: 'v1.2', published: true } },
  records: [
    { user: 'U10001234', date: '2026-07-15', time: '09:42:16', streak: 4, reward: 20, status: 'success', flow: 'QXB202607150001' },
    { user: 'U10005678', date: '2026-07-15', time: '09:20:08', streak: 7, reward: 40, status: 'success', flow: 'QXB202607150002' },
    { user: 'U10009123', date: '2026-07-15', time: '08:55:31', streak: 2, reward: 10, status: 'pending', flow: '—' },
    { user: 'U10003456', date: '2026-07-14', time: '22:10:03', streak: 3, reward: 15, status: 'failed', flow: '—' },
    { user: 'U10007890', date: '2026-07-14', time: '20:33:42', streak: 6, reward: 30, status: 'success', flow: 'QXB202607140018' },
    { user: 'U10008821', date: '2026-07-13', time: '18:06:19', streak: 1, reward: 10, status: 'success', flow: 'QXB202607130012' }
  ],
  logs: [
    { time: '2026-07-14 16:20:08', operator: 'OP-0086', action: '发布规则', detail: 'v2 → v3，周期 7 天，基础奖励 10' },
    { time: '2026-07-10 10:02:31', operator: 'OP-0012', action: '开启活动', detail: '活动状态：关闭 → 开启' }
  ]
};
