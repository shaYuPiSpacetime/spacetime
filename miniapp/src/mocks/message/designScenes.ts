export interface MessageDesignScene {
  designId: string
  name: string
  route: string
  mockScene: string
}

/**
 * 蓝湖 18 稿与运行态的唯一映射表。
 * mockScene 仅用于自动截图稳定复现，正常用户路径仍由真实交互推进状态。
 */
export const messageDesignScenes: readonly MessageDesignScene[] = [
  {
    designId: '626cd513-005e-4df8-8456-b5280872ba23',
    name: '消息',
    route: '/pages/chat/index',
    mockScene: 'home',
  },
  {
    designId: '4eefc2dd-05c7-4a0c-b095-f252741f3781',
    name: 'YO悄悄话-申请我的',
    route: '/pages/message/whisper-list',
    mockScene: 'whisper-received',
  },
  {
    designId: '955469c9-c067-4f6f-97c8-57fcb7fb6ee4',
    name: 'YO悄悄话-全部删除',
    route: '/pages/message/whisper-list',
    mockScene: 'whisper-delete-sheet',
  },
  {
    designId: '57f51864-59c3-4deb-b990-0d946ed5275c',
    name: 'YO悄悄话-我申请的',
    route: '/pages/message/whisper-list',
    mockScene: 'whisper-sent',
  },
  {
    designId: '797ff271-e45a-4262-bd99-9ddb58bfad56',
    name: 'YO悄悄话-详情（申请我的）',
    route: '/pages/message/whisper-detail',
    mockScene: 'whisper-detail-expired',
  },
  {
    designId: '60f5f2a4-ed1b-4a73-8291-ce65dca97a21',
    name: 'YO私信-详情-流程（申请我的）',
    route: '/pages/message/whisper-detail',
    mockScene: 'whisper-detail-matched',
  },
  {
    designId: '5cff0169-1e9c-4f1d-8021-cf19da353ece',
    name: 'YO悄悄话-详情（我申请的）',
    route: '/pages/message/whisper-detail',
    mockScene: 'whisper-detail-sent-expired',
  },
  {
    designId: 'da4cd120-0250-4b6c-9d10-7704106317a2',
    name: 'YO悄悄话-详情',
    route: '/pages/message/whisper-detail',
    mockScene: 'whisper-compose',
  },
  {
    designId: '4ee98b8d-72b5-4c2b-b02e-3567afaf2600',
    name: 'YO私信-详情-举报',
    route: '/pages/message/whisper-detail',
    mockScene: 'whisper-report-sheet',
  },
  {
    designId: 'a3c5e11a-0c8f-4adb-b1f9-e507925d6b74',
    name: '用户举报',
    route: '/pages/message/report',
    mockScene: 'report-form',
  },
  {
    designId: 'fa13c6d0-7d00-4373-80d2-59821eeb6cc4',
    name: '提交成功',
    route: '/pages/message/report',
    mockScene: 'report-success',
  },
  {
    designId: 'aabf0ea4-b22c-4a5c-afc5-f48f291a4046',
    name: '私信',
    route: '/pages/message/private-list',
    mockScene: 'private-list',
  },
  {
    designId: '798b68f9-fda4-4b5d-aca4-b363c29407e3',
    name: '官方小助手',
    route: '/pages/message/channel',
    mockScene: 'channel-assistant',
  },
  {
    designId: 'e3ab4fcf-8f3a-44da-b997-e86d13a295fc',
    name: '私信-消息',
    route: '/pages/message/private-chat',
    mockScene: 'private-chat-default',
  },
  {
    designId: '4a0eaf37-162c-409a-ba83-a62eed00e9c4',
    name: '私信-消息-输入信息',
    route: '/pages/message/private-chat',
    mockScene: 'private-chat-input',
  },
  {
    designId: '5e8feaf3-cd84-4ea5-93ba-b4e181b92a17',
    name: '私信-消息-回复信息',
    route: '/pages/message/private-chat',
    mockScene: 'private-chat-reply',
  },
  {
    designId: '38ecd723-33cd-4961-9b50-59d8c601a1ad',
    name: '私信-消息-失败信息重新发送',
    route: '/pages/message/private-chat',
    mockScene: 'private-chat-retry',
  },
  {
    designId: 'ff867af1-fc44-45b9-b2bc-0f81e51187f9',
    name: '系统消息',
    route: '/pages/message/channel',
    mockScene: 'channel-system',
  },
] as const

export function getMessageDesignScene(mockScene: string): MessageDesignScene | undefined {
  return messageDesignScenes.find(item => item.mockScene === mockScene)
}
