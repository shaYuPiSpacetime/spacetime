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
    { type: 'card', title: '第一次使用悄悄话', text: '付费发送后等待对方回应；对方回复即匹配成功并转为普通私信。', action: '了解规则', time: '09:12' },
    { type: 'text', title: '安全交流提示', text: '请勿泄露验证码、银行卡等敏感信息，遇到异常可在会话内举报。', time: '09:20' },
    { type: 'card', title: '关注服务号', text: '如需在小程序外接收重要提醒，可按需关注平台服务号。', action: '去关注', time: '09:30' }
  ],
  notifications: [
    {
      id: 'NTF202607020001',
      type: '系统通知',
      category: '热点',
      bizType: 'community_hot_topic',
      title: '同城年轻人最近都在聊什么？',
      summary: '本周同城热议话题正在升温，来分享你的看法',
      time: '5 分钟前',
      read: false,
      jumpType: 'h5',
      target: 'community-topic'
    },
    {
      id: 'NTF202607020002',
      type: '系统通知',
      category: '精选',
      bizType: 'featured_content',
      title: '本周精选：如何建立舒服的关系边界',
      summary: '社区高质量讨论精选，已有 326 人参与',
      time: '18 分钟前',
      read: false,
      jumpType: 'h5',
      target: 'community-content'
    },
    {
      id: 'NTF202607020003',
      type: '系统通知',
      category: '活动',
      bizType: 'community_activity',
      title: '城市漫步话题活动开始了',
      summary: '发布你的周末路线，参与社区话题互动',
      time: '1 小时前',
      read: true,
      jumpType: 'notification_detail',
      target: 'community-activity'
    },
    {
      id: 'NTF202607020004',
      type: '系统通知',
      category: '公告',
      bizType: 'platform_announcement',
      title: '社区服务维护公告',
      summary: '今晚 23:00 至 23:30 社区发布功能短暂维护',
      time: '昨天',
      read: true,
      jumpType: 'notification_detail',
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
