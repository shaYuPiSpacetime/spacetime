import { useState } from 'react'
import { View, Text } from '@tarojs/components'

/** 消息会话 Mock 数据 */
interface ChatItem {
  id: number
  nickname: string
  avatar: string
  lastMessage: string
  time: string
  unreadCount: number
  isOnline: boolean
}

const MOCK_CHATS: ChatItem[] = [
  {
    id: 1,
    nickname: '小甜心',
    avatar: '😊',
    lastMessage: '好的呀，周末一起去那家甜品店吧！',
    time: '刚刚',
    unreadCount: 3,
    isOnline: true,
  },
  {
    id: 2,
    nickname: '阳光男孩',
    avatar: '🌞',
    lastMessage: '今天的落日好美，发你一张照片',
    time: '5分钟前',
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: 3,
    nickname: '文艺青年',
    avatar: '📖',
    lastMessage: '推荐你读一下那本书，真的很不错',
    time: '28分钟前',
    unreadCount: 1,
    isOnline: false,
  },
  {
    id: 4,
    nickname: '运动达人',
    avatar: '🏃',
    lastMessage: '明天早上6点操场见，不要迟到哦',
    time: '1小时前',
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: 5,
    nickname: '音乐精灵',
    avatar: '🎵',
    lastMessage: '[分享了一首歌] 晴天 - 周杰伦',
    time: '2小时前',
    unreadCount: 5,
    isOnline: true,
  },
  {
    id: 6,
    nickname: '摄影爱好者',
    avatar: '📷',
    lastMessage: '这张构图怎么样？求指点～',
    time: '昨天',
    unreadCount: 0,
    isOnline: false,
  },
]

/**
 * 消息列表页面
 * 展示会话列表，每项包含头像、昵称、最后消息预览、时间和未读角标
 */
export default function ChatPage() {
  // 1. 状态管理
  const [chats] = useState<ChatItem[]>(MOCK_CHATS)

  // 2. 空状态
  if (chats.length === 0) {
    return (
      <View className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Text className="text-4xl mb-4">💬</Text>
        <Text className="text-sm text-gray-400">暂无消息</Text>
        <Text className="text-xs text-gray-300 mt-1">
          去社区认识新朋友吧
        </Text>
      </View>
    )
  }

  // 3. 计算总未读数
  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0)

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 消息列表 */}
      <View className="pt-2 pb-4">
        {chats.map((chat) => (
          <View
            key={chat.id}
            className="mx-3 mt-3 bg-white rounded-card px-4 py-4"
          >
            <View className="flex items-center">
              {/* 头像区域 */}
              <View className="relative flex-shrink-0">
                <View className="w-12 h-12 bg-brand-blue-bg rounded-full flex items-center justify-center">
                  <Text className="text-xl">{chat.avatar}</Text>
                </View>
                {/* 在线状态指示点 */}
                {chat.isOnline && (
                  <View className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                )}
              </View>

              {/* 中间信息 */}
              <View className="ml-3 flex-1 min-w-0">
                {/* 昵称 + 时间 */}
                <View className="flex items-center justify-between">
                  <Text className="text-sm font-medium text-text-dark">
                    {chat.nickname}
                  </Text>
                  <Text className="text-xs text-gray-300 flex-shrink-0 ml-2">
                    {chat.time}
                  </Text>
                </View>

                {/* 最后消息预览 */}
                <View className="mt-1.5 flex items-center justify-between">
                  <Text className="text-xs text-gray-400 truncate block flex-1 pr-2">
                    {chat.lastMessage}
                  </Text>

                  {/* 未读角标 */}
                  {chat.unreadCount > 0 && (
                    <View className="bg-primary rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center flex-shrink-0">
                      <Text className="text-xs text-white leading-none">
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* 底部提示 */}
        <View className="flex items-center justify-center py-6">
          <Text className="text-xs text-gray-300">— 共 {totalUnread} 条未读消息 —</Text>
        </View>
      </View>
    </View>
  )
}
