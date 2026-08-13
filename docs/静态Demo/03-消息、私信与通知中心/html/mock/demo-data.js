window.DEMO_DATA = {
  conversations: [
    {
      id: 'CV202607310001',
      name: '林同学',
      desc: '你好呀，周末也喜欢去看展吗？',
      time: '刚刚',
      unread: 3,
      status: '有效会话',
      canSend: true,
      avatar: '林'
    },
    {
      id: 'CV202607310002',
      name: '许同学',
      desc: '你们已成功匹配，快开始聊天吧',
      time: '10:24',
      unread: 0,
      status: '有效会话',
      canSend: false,
      protectStatus: '等待女方真实回复',
      avatar: '许'
    },
    {
      id: 'CV202607310003',
      name: '周同学',
      desc: '纪录片清单已经发给你啦',
      time: '昨天',
      unread: 1,
      status: '有效会话',
      canSend: true,
      avatar: '周'
    },
    {
      id: 'CV202607300011',
      name: '陆同学',
      desc: '下次可以一起城市徒步',
      time: '周三',
      unread: 0,
      status: '有效会话',
      canSend: true,
      avatar: '陆'
    },
    {
      id: 'CV202607290018',
      name: '苏同学',
      desc: '[系统提示] 会话安全提醒',
      time: '周二',
      unread: 0,
      status: '有效会话',
      canSend: true,
      avatar: '苏'
    }
  ],
  chatMessages: [
    { id: 'TIP202607310001', side: 'system', text: '你们已成功匹配，普通私信已开启。' },
    { id: 'MSG202607310001', side: 'left', name: '林同学', text: '你好呀，看到你也喜欢城市徒步。', time: '10:18', reportable: true },
    { id: 'MSG202607310002', side: 'right', name: '我', text: '是的，周末常去滨江路线。', time: '10:20', reportable: true },
    { id: 'MSG202607310003', side: 'right failed', name: '我', text: '周末一起去看展吗？', time: '10:22', reportable: true }
  ],
  assistantMessages: [
    { type: 'card', title: '第一次使用悄悄话', text: '发送后等待对方回应；回复、匹配与普通会话会一次完成。', action: '了解规则', time: '09:12' },
    { type: 'text', title: '安全交流提示', text: '请勿泄露验证码、银行卡等敏感信息，遇到异常可在会话内举报。', time: '09:20' },
    { type: 'card', title: '关注服务号', text: '如需在小程序外接收重要提醒，可按需关注平台服务号。', action: '去关注', time: '09:30' }
  ],
  whisperApplications: {
    received: [
      { id: 'W01', name: '林晓雨', direction: 'received', status: 'pending', action: '回复', content: '看到你也喜欢看展，想认识一下。' },
      { id: 'W07', name: '周语桐', direction: 'received', status: 'pending', action: '回复重试', content: '你分享的纪录片清单很有意思。', replyWillFail: true },
      { id: 'W04', name: '陆清和', direction: 'received', status: 'replied', action: '已回复并匹配', content: '我们都喜欢城市徒步，可以聊聊吗？' },
      { id: 'W05', name: '苏同学', direction: 'received', status: 'expired', action: '申请已结束', content: '想和你认识一下。', canReverse: true },
      { id: 'W06', name: '沈同学', direction: 'received', status: 'invalid', action: '申请已结束', content: '你好，希望有机会认识。' }
    ],
    sent: [
      { id: 'S01', name: '许安然', direction: 'sent', status: 'pending', action: '等待回应', content: '看到你也喜欢城市徒步，想认识一下。' },
      { id: 'S02', name: '陈知行', direction: 'sent', status: 'replied', action: '已回复并匹配', content: '你最近看过什么纪录片？' },
      { id: 'S03', name: '赵同学', direction: 'sent', status: 'expired', action: '申请已结束', content: '想聊聊你分享的书单。' }
    ]
  },
  notifications: [
    {
      id: 'NTF202607310001',
      notificationType: 'governance',
      category: '治理结果',
      bizType: 'report_result',
      title: '你的举报已处理',
      content: '平台已完成核查并采取必要措施，感谢你的反馈。为保护各方隐私，不展示具体处罚细节。',
      time: '5 分钟前',
      read: false,
      jumpType: 'none',
      actionLabel: ''
    },
    {
      id: 'NTF202607310002',
      notificationType: 'asset',
      category: '资产结果',
      bizType: 'asset_result',
      title: '千寻币补偿已到账',
      content: '因悄悄话未有效送达，100 千寻币已原路补回，可在千寻币流水中查看。',
      time: '18 分钟前',
      read: false,
      jumpType: 'asset',
      actionLabel: '查看资产明细'
    },
    {
      id: 'NTF202607310003',
      notificationType: 'invite',
      category: '邀请结果',
      bizType: 'invite_result',
      title: '邀请奖励已发放',
      content: '好友已完成注册，本次邀请奖励已发放至你的千寻币账户。',
      time: '1 小时前',
      read: true,
      jumpType: 'invite_center',
      actionLabel: '查看邀请记录'
    },
    {
      id: 'NTF202607310004',
      notificationType: 'community',
      category: '社区运营',
      bizType: 'community_interaction_summary',
      title: '你的社区互动有新进展',
      content: '过去 6 小时共有 8 次点赞、2 条评论和 1 个新关注，已为你聚合展示。',
      time: '昨天',
      read: true,
      jumpType: 'community',
      actionLabel: '查看社区互动'
    },
    {
      id: 'NTF202607310005',
      notificationType: 'platform',
      category: '平台与安全',
      bizType: 'account_security',
      title: '账号安全提醒',
      content: '检测到新的登录环境。若非本人操作，请立即修改登录凭证并提交安全申诉。',
      time: '周一',
      read: true,
      jumpType: 'appeal',
      actionLabel: '进入安全申诉',
      restrictedVisible: true
    }
  ],
  records: [
    {
      recordNo: 'MSG202607310001',
      recordType: 'private_message',
      userNo: 'U100281',
      targetUserNo: 'U100392',
      messageType: 'text',
      status: '已发送',
      time: '2026-07-31 10:20:00'
    },
    {
      recordNo: 'WSP202607310002',
      recordType: 'whisper_message',
      userNo: 'U100392',
      targetUserNo: 'U100281',
      messageType: 'whisper',
      status: '等待回应',
      time: '2026-07-31 08:40:00'
    },
    {
      recordNo: 'NTF202607310003',
      recordType: 'system_message',
      userNo: 'U100281',
      targetUserNo: '-',
      messageType: 'invite_result',
      status: '未读',
      time: '2026-07-31 09:50:00'
    }
  ],
  configLogs: [
    { time: '2026-07-31 10:31', user: '运营主管', action: '发布配置版本 MSG-CFG-20260731-03', detail: '保护期 3 天、悄悄话有效期 7 天、冷却 7 天；仅影响新对象' },
    { time: '2026-07-31 09:42', user: '安全管理员', action: '验证全局发送安全开关', detail: '关闭后立即阻断新私信和悄悄话，历史对象状态不改写' }
  ],
  reportRows: [
    {
      reportNo: 'RPT202607310011',
      caseNo: 'CASE202607310021',
      source: '私信消息',
      reporter: 'U100281',
      target: 'U100392',
      reason: '不当言语',
      status: '待处理',
      context: '会话 CV202607310001 / 消息 MSG202607310001',
      evidencePreview: '案件冻结证据：文本消息 1 条，哈希 9f2a...c817'
    },
    {
      reportNo: 'RPT202607310012',
      caseNo: 'CASE202607310024',
      source: '悄悄话',
      reporter: 'U100392',
      target: 'U100518',
      reason: '骚扰',
      status: '处理中',
      context: '悄悄话 WSP202607310002 / 状态 pending',
      evidencePreview: '案件冻结证据：悄悄话 1 条，哈希 1be4...22a0'
    }
  ]
};
