import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { messageService } from '@/services/message'
import type { ConversationSummary } from '@/types/message'
import { MESSAGE_AVATAR, MessageNav } from './shared'
import './message.scss'

const designRows = [
  { name: '一只筱脑虎', preview: '你好，可以认识一下吗？', time: '05月12日' },
  { name: '山里', preview: '我们运动类型还挺像的，有兴趣认识下吗？', time: '05月12日' },
  { name: '城居', preview: '很想认识你，快来找我聊天吧！', time: '04月28日' },
  { name: '欢欢', preview: '我性格活泼，热爱运动，想认识你', time: '04月15日' },
]

export default function PrivateListPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  useEffect(() => {
    void messageService.listConversations().then(setConversations)
  }, [])

  const rows = useMemo(
    () =>
      designRows.map((row, index) => ({
        ...row,
        conversationNo: conversations[index]?.conversationNo || 'conversation-lin',
        avatarUrl: conversations[index]?.peerAvatarUrl || MESSAGE_AVATAR,
      })),
    [conversations]
  )

  return (
    <View className="message-page private-list-page">
      <MessageNav title="私信" center />
      <ScrollView scrollY className="private-list-scroll" showScrollbar={false}>
        {rows.map(row => (
          <View
            className="private-list-row"
            key={`${row.name}-${row.time}`}
            onClick={() =>
              void Taro.navigateTo({
                url: `/pages/message/private-chat?mockScene=private-chat-default&conversationNo=${row.conversationNo}`,
              })
            }
          >
            <Image className="private-list-avatar" src={row.avatarUrl} mode="aspectFill" />
            <View className="private-list-copy">
              <Text className="private-list-name">{row.name}</Text>
              <Text className="private-list-preview">{row.preview}</Text>
            </View>
            <Text className="private-list-time">{row.time}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
