window.DEMO_DATA = {
  conversations: [
    {
      id: 'CV202607020001',
      name: '林同学',
      desc: '你好呀，周末也喜欢去看展吗？',
      time: '刚刚',
      unread: 3,
      status: '可聊天',
      avatar: 'A',
      tags: ['已匹配', '同城']
    },
    {
      id: 'CV202607020002',
      name: '许同学',
      desc: '你们已成功匹配，快开始聊天吧',
      time: '10:24',
      unread: 0,
      status: '保护期等待女方',
      avatar: 'B',
      tags: ['女性保护', '系统提示']
    },
    {
      id: 'CV202607020003',
      name: '陈同学',
      desc: '当前会话暂不可继续聊天',
      time: '昨天',
      unread: 0,
      status: '已失效',
      avatar: 'C',
      tags: ['账号冻结']
    }
  ],
  chatMessages: [
    { side: 'system', text: '你们已成功匹配，普通私信已开启。' },
    { side: 'left', name: '林同学', text: '你好呀，看到你也喜欢城市徒步。', time: '10:18' },
    { side: 'right', name: '我', text: '是的，周末常去滨江路线。', time: '10:20' },
    { side: 'right failed', name: '我', text: '这条消息发送失败，可重试。', time: '10:22' }
  ],
  assistantMessages: [
    { type: 'text', title: '认证结果通知', text: '你的学历认证已通过，资料可信度已更新。', time: '09:12' },
    { type: 'card', title: '女生保护机制说明', text: '匹配成功后，保护期内男方需要等待女方先发送真实消息。', action: '查看规则', time: '09:20' },
    { type: 'text', title: '客服引导', text: '官方助手暂不支持直接回复，如需反馈请从对应页面进入举报或客服入口。', time: '09:30' }
  ],
  officialDetail: {
    title: '学历认证已通过',
    source: '官方消息',
    time: '2026-07-02 09:12',
    content: '你的学历认证已通过，已获得学历认证标识。完成实名、头像、学历认证后，可继续使用真实聊天、悄悄话和通知中心能力。',
    jumpType: 'auth_center'
  },
  notifications: [
    {
      id: 'NTF202607020001',
      type: '互动通知',
      bizType: 'match_success',
      title: '你们已成功匹配',
      summary: '快开始一段真实聊天吧',
      time: '5 分钟前',
      read: false,
      jumpType: 'chat',
      target: 'private-chat'
    },
    {
      id: 'NTF202607020002',
      type: '互动通知',
      bizType: 'invite_response',
      title: '你的邀请有新的响应',
      summary: '好友已完成邀请绑定，奖励处理中',
      time: '18 分钟前',
      read: false,
      jumpType: 'invite_response',
      target: 'invite-response'
    },
    {
      id: 'NTF202607020003',
      type: '系统通知',
      bizType: 'auth_result',
      title: '头像审核已通过',
      summary: '你的资料展示已更新',
      time: '1 小时前',
      read: true,
      jumpType: 'notification_detail',
      target: 'notification-detail'
    },
    {
      id: 'NTF202607020004',
      type: '资产通知',
      bizType: 'coin_changed',
      title: '千寻币余额变动',
      summary: '悄悄话消费 6 千寻币',
      time: '昨天',
      read: true,
      jumpType: 'asset',
      target: 'notification-detail'
    }
  ],
  whisper: {
    senderName: '周同学',
    content: '看到你也喜欢纪录片，想问你最近看过哪一部？',
    sentTime: '2026-07-02 08:40',
    cooldown: '2026-07-09 08:40'
  },
  inviteResponse: {
    inviter: '小雨',
    status: '绑定成功',
    reward: '邀请奖励处理中，预计 10 分钟内到账',
    responseNo: 'INV-RSP-20260702001',
    noticeNo: 'NTF202607020002'
  },
  records: [
    {
      recordNo: 'MSG202607020001',
      recordType: 'private_message',
      userNo: 'U100281',
      targetUserNo: 'U100392',
      preview: '你好呀，看到你也喜欢城市徒步。',
      title: '-',
      status: '已发送',
      time: '2026-07-02 10:20:00'
    },
    {
      recordNo: 'WSP202607020002',
      recordType: 'whisper_message',
      userNo: 'U100392',
      targetUserNo: 'U100281',
      preview: '看到你也喜欢纪录片，想问你最近看过哪一部？',
      title: '-',
      status: '等待回应',
      time: '2026-07-02 08:40:00'
    },
    {
      recordNo: 'OFF202607020003',
      recordType: 'official_message',
      userNo: 'U100281',
      targetUserNo: '-',
      preview: '你的学历认证已通过',
      title: '学历认证已通过',
      status: '已读',
      time: '2026-07-02 09:12:00'
    },
    {
      recordNo: 'NTF202607020002',
      recordType: 'notification',
      userNo: 'U100281',
      targetUserNo: '-',
      preview: '好友已完成邀请绑定，奖励处理中',
      title: '你的邀请有新的响应',
      status: '未读',
      time: '2026-07-02 09:50:00'
    }
  ],
  configLogs: [
    { time: '2026-07-02 10:31', user: '运营主管', action: '修改女性保护期天数', detail: '3 天 -> 3 天，确认无变更' },
    { time: '2026-07-02 10:12', user: '超级管理员', action: '开启官方助手入口', detail: '入口开关保持开启' },
    { time: '2026-07-01 18:42', user: '风控', action: '调整悄悄话暂不回应冷却', detail: '7 天；待回应有效期另为 7 天' }
  ],
  reportRows: [
    {
      reportNo: 'RPT202607020011',
      source: '私信聊天',
      reporter: 'U100281',
      target: 'U100392',
      reason: '不当言语',
      status: '待处理',
      context: '会话 CV202607020001，消息 MSG202607020001'
    },
    {
      reportNo: 'RPT202607020012',
      source: '悄悄话',
      reporter: 'U100392',
      target: 'U100518',
      reason: '骚扰',
      status: '处理中',
      context: '悄悄话 WSP202607020002，状态 pending'
    }
  ]
};
