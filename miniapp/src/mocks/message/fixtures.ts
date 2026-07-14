import type {
  ChatMessage,
  ConversationSummary,
  MessageHome,
  MessageMockState,
  OfficialChannelMessage,
  WhisperRecord,
} from '../../types/message'

const AVATAR_XIAOYU =
  'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/ce9c1a32157cb601/profile-preview-avatar.png'

const home: MessageHome = {
  whisperEntry: {
    type: 'whisper',
    title: '悄悄话',
    subtitle: '有人想悄悄认识你',
    unreadCount: 2,
    avatarUrls: [AVATAR_XIAOYU, AVATAR_XIAOYU, AVATAR_XIAOYU],
  },
  privateEntry: {
    type: 'private',
    title: '私信',
    subtitle: '配对成功后开启聊天',
    unreadCount: 3,
    avatarUrls: [AVATAR_XIAOYU],
  },
  rows: [
    {
      id: 'liked-me',
      type: 'liked',
      title: '喜欢我的人',
      preview: '看看是谁对你心动了',
      timeText: '',
      unreadCount: 5,
      avatarUrl: AVATAR_XIAOYU,
    },
    {
      id: 'assistant',
      type: 'assistant',
      title: '官方小助手',
      preview: '欢迎来到时空邂逅',
      timeText: '12:30',
      unreadCount: 1,
    },
    {
      id: 'system',
      type: 'system',
      title: '系统消息',
      preview: '你的实名认证已通过',
      timeText: '昨天',
      unreadCount: 1,
    },
    {
      id: 'conversation-lin',
      type: 'conversation',
      title: '林沐',
      preview: '好的呀，那我们晚点聊',
      timeText: '昨天',
      unreadCount: 3,
      avatarUrl: AVATAR_XIAOYU,
      conversationNo: 'conversation-lin',
    },
  ],
}

const conversations: ConversationSummary[] = [
  {
    conversationNo: 'conversation-lin',
    peerUserNo: 'user-lin',
    peerNickname: '林沐',
    peerAvatarUrl: AVATAR_XIAOYU,
    lastMessagePreview: '好的呀，那我们晚点聊',
    lastMessageAt: '2026-07-13T20:18:00+08:00',
    timeText: '昨天',
    unreadCount: 3,
    state: 'active',
  },
  {
    conversationNo: 'conversation-xiaoyu',
    peerUserNo: 'user-xiaoyu',
    peerNickname: '小雨',
    peerAvatarUrl: AVATAR_XIAOYU,
    lastMessagePreview: '很高兴认识你',
    lastMessageAt: '2026-07-12T18:06:00+08:00',
    timeText: '星期日',
    unreadCount: 0,
    state: 'active',
  },
]

const messages: ChatMessage[] = [
  {
    messageNo: 'message-match-notice',
    clientMsgId: 'client-match-notice',
    conversationNo: 'conversation-lin',
    senderUserNo: 'system',
    direction: 'system',
    type: 'match_notice',
    content: '配对成功开启聊天，请真诚友善地交流',
    sentAt: '2026-07-13T19:56:00+08:00',
    timeText: '昨天 19:56',
    sendStatus: 'received',
  },
  {
    messageNo: 'message-incoming-001',
    clientMsgId: 'client-incoming-001',
    conversationNo: 'conversation-lin',
    senderUserNo: 'user-lin',
    direction: 'incoming',
    type: 'text',
    content: '你好呀，很高兴认识你',
    sentAt: '2026-07-13T20:10:00+08:00',
    timeText: '20:10',
    sendStatus: 'received',
  },
  {
    messageNo: 'message-outgoing-001',
    clientMsgId: 'client-outgoing-001',
    conversationNo: 'conversation-lin',
    senderUserNo: 'current-user',
    direction: 'outgoing',
    type: 'text',
    content: '我也是，很开心我们配对成功',
    sentAt: '2026-07-13T20:12:00+08:00',
    timeText: '20:12',
    sendStatus: 'sent',
  },
  {
    messageNo: 'message-incoming-002',
    clientMsgId: 'client-incoming-002',
    conversationNo: 'conversation-lin',
    senderUserNo: 'user-lin',
    direction: 'incoming',
    type: 'text',
    content: '好的呀，那我们晚点聊',
    sentAt: '2026-07-13T20:18:00+08:00',
    timeText: '20:18',
    sendStatus: 'received',
  },
]

const whispers: WhisperRecord[] = [
  {
    whisperNo: 'whisper-received-pending',
    direction: 'received',
    state: 'pending',
    visible: true,
    applicantUserNo: 'user-lin',
    applicantNickname: '林沐',
    applicantAvatarUrl: AVATAR_XIAOYU,
    receiverUserNo: 'current-user',
    receiverNickname: '我',
    receiverAvatarUrl: AVATAR_XIAOYU,
    content: '在人群里一眼就注意到了你，想认识一下。',
    createdAt: '2026-07-14T10:20:00+08:00',
    timeText: '10:20',
    costCoins: 100,
    timeline: [
      {
        id: 'timeline-created-pending',
        type: 'created',
        title: '对方申请认识你',
        description: '等待你的回复',
        occurredAt: '2026-07-14T10:20:00+08:00',
        timeText: '今天 10:20',
        completed: true,
      },
    ],
  },
  {
    whisperNo: 'whisper-received-matched',
    direction: 'received',
    state: 'matched',
    visible: true,
    applicantUserNo: 'user-xiaoyu',
    applicantNickname: '小雨',
    applicantAvatarUrl: AVATAR_XIAOYU,
    receiverUserNo: 'current-user',
    receiverNickname: '我',
    receiverAvatarUrl: AVATAR_XIAOYU,
    content: '喜欢你的笑容，希望有机会认识你。',
    createdAt: '2026-07-13T16:30:00+08:00',
    timeText: '昨天',
    costCoins: 100,
    timeline: [
      {
        id: 'timeline-created-matched',
        type: 'created',
        title: '对方申请认识你',
        occurredAt: '2026-07-13T16:30:00+08:00',
        timeText: '昨天 16:30',
        completed: true,
      },
      {
        id: 'timeline-matched',
        type: 'matched',
        title: '你们已互相喜欢',
        description: '已开启私信聊天',
        occurredAt: '2026-07-13T17:02:00+08:00',
        timeText: '昨天 17:02',
        completed: true,
      },
    ],
  },
  {
    whisperNo: 'whisper-sent-pending',
    direction: 'sent',
    state: 'pending',
    visible: true,
    applicantUserNo: 'current-user',
    applicantNickname: '我',
    applicantAvatarUrl: AVATAR_XIAOYU,
    receiverUserNo: 'user-xiaoyu',
    receiverNickname: '小雨',
    receiverAvatarUrl: AVATAR_XIAOYU,
    content: '很喜欢你的个人介绍，想进一步认识你。',
    createdAt: '2026-07-14T09:18:00+08:00',
    timeText: '09:18',
    costCoins: 100,
    timeline: [
      {
        id: 'timeline-created-sent',
        type: 'created',
        title: '已申请认识对方',
        description: '等待对方回复',
        occurredAt: '2026-07-14T09:18:00+08:00',
        timeText: '今天 09:18',
        completed: true,
      },
    ],
  },
]

const assistantMessages: OfficialChannelMessage[] = [
  {
    messageNo: 'assistant-welcome',
    channel: 'assistant',
    title: '欢迎来到时空邂逅',
    content: '在这里认真展示自己，真诚地认识同频的人。遇到问题可以随时联系我们。',
    actionText: '联系客服',
    actionType: 'customer_service',
    sentAt: '2026-07-14T09:00:00+08:00',
    dateText: '今天 09:00',
    read: false,
  },
]

const systemMessages: OfficialChannelMessage[] = [
  {
    messageNo: 'system-certification',
    channel: 'system',
    title: '实名认证已通过',
    content: '你的实名认证已审核通过，现在可以体验完整功能。',
    actionText: '社区规则',
    actionType: 'community_rules',
    sentAt: '2026-07-13T15:20:00+08:00',
    dateText: '昨天 15:20',
    read: false,
  },
]

/** 每次调用都返回深拷贝，确保小程序重启或测试重置时恢复初始夹具。 */
export function createInitialMessageState(): MessageMockState {
  return JSON.parse(
    JSON.stringify({
      home,
      conversations,
      messagesByConversation: {
        'conversation-lin': messages,
        'conversation-xiaoyu': [],
      },
      whispers,
      channels: {
        assistant: assistantMessages,
        system: systemMessages,
      },
      unread: {
        totalCount: 12,
        whisperCount: 2,
        privateMessageCount: 3,
        likedCount: 5,
        assistantCount: 1,
        systemCount: 1,
      },
      contentMaxLength: 60,
      idempotencyWhisperNos: {},
    })
  ) as MessageMockState
}
