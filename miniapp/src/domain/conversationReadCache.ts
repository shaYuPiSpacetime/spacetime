import type { MessageConversationItem } from '@/types/message'

const locallyReadMessageNos = new Map<string, string>()

export function rememberConversationRead(conversationNo: string, lastMessageNo = ''): void {
  locallyReadMessageNos.set(conversationNo, lastMessageNo)
}

export function applyConversationReadCache(rows: MessageConversationItem[]): MessageConversationItem[] {
  return rows.map(row => {
    const watermark = locallyReadMessageNos.get(row.conversationNo)
    if (watermark === undefined) return row
    if (row.lastMessage?.messageNo && watermark && row.lastMessage.messageNo !== watermark) {
      locallyReadMessageNos.delete(row.conversationNo)
      return row
    }
    return { ...row, unreadCount: 0 }
  })
}

export function clearConversationReadCache(): void {
  locallyReadMessageNos.clear()
}
