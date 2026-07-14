import { Image, ScrollView, Text, View } from '@tarojs/components'
import type { ITouchEvent } from '@tarojs/components/types/common'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { messageService } from '@/services/message'
import type { WhisperDirection, WhisperRecord } from '@/types/message'
import { DotsButton, MESSAGE_AVATAR, MessageNav } from './shared'
import './message.scss'

type WhisperVisualRow = {
  id: string
  name: string
  avatarUrl: string
  status?: string
  actionable?: boolean
}

const receivedPending: WhisperVisualRow[] = [
  { id: 'pending-1', name: '一只筱脑虎', avatarUrl: MESSAGE_AVATAR, actionable: true },
  { id: 'pending-2', name: '愉快', avatarUrl: MESSAGE_AVATAR, actionable: true },
  { id: 'pending-3', name: '其他', avatarUrl: MESSAGE_AVATAR, actionable: true },
]

const receivedHandled: WhisperVisualRow[] = [
  { id: 'handled-1', name: '一只筱脑虎', avatarUrl: MESSAGE_AVATAR, status: '过期自动拒绝' },
  { id: 'handled-2', name: '愉快', avatarUrl: MESSAGE_AVATAR, status: '对方取消申请' },
  { id: 'handled-3', name: '其他', avatarUrl: MESSAGE_AVATAR, status: '过期自动拒绝' },
  { id: 'handled-4', name: '极品ID', avatarUrl: MESSAGE_AVATAR, status: '已回复匹配成功' },
]

const sentRows: WhisperVisualRow[] = [
  { id: 'sent-1', name: '一只筱脑虎', avatarUrl: MESSAGE_AVATAR },
  { id: 'sent-2', name: '愉快', avatarUrl: MESSAGE_AVATAR },
  { id: 'sent-3', name: '其他', avatarUrl: MESSAGE_AVATAR },
  { id: 'sent-4', name: '极品ID', avatarUrl: MESSAGE_AVATAR },
  { id: 'sent-5', name: '极品ID', avatarUrl: MESSAGE_AVATAR },
]

export default function WhisperListPage() {
  const router = useRouter()
  const scene = router.params.mockScene || 'whisper-received'
  const [direction, setDirection] = useState<WhisperDirection>(
    scene === 'whisper-sent' ? 'sent' : 'received'
  )
  const [showBatchSheet, setShowBatchSheet] = useState(scene === 'whisper-delete-sheet')
  const [records, setRecords] = useState<WhisperRecord[]>([])
  const [hiddenRows, setHiddenRows] = useState<string[]>([])
  const [swipedRow, setSwipedRow] = useState<string>()
  const [touchStart, setTouchStart] = useState(0)

  useEffect(() => {
    void messageService.listWhispers(direction).then(setRecords)
  }, [direction])

  const sentDisplayRows = useMemo(() => {
    if (!records.length) return sentRows
    return sentRows.map((row, index) => ({
      ...row,
      id: records[index]?.whisperNo || row.id,
      name: records[index]?.receiverNickname || row.name,
      avatarUrl: records[index]?.receiverAvatarUrl || row.avatarUrl,
    }))
  }, [records])

  const openDetail = (mockScene: string, whisperNo?: string) => {
    const suffix = whisperNo ? `&whisperNo=${whisperNo}` : ''
    void Taro.navigateTo({ url: `/pages/message/whisper-detail?mockScene=${mockScene}${suffix}` })
  }

  const hideRow = async (id: string) => {
    if (id.startsWith('whisper-')) await messageService.hideWhisper(id)
    setHiddenRows(current => [...current, id])
    setSwipedRow(undefined)
  }

  const hideAll = async () => {
    await messageService.batchHideWhispers(direction)
    setHiddenRows([
      ...receivedPending.map(item => item.id),
      ...receivedHandled.map(item => item.id),
      ...sentDisplayRows.map(item => item.id),
    ])
    setShowBatchSheet(false)
  }

  return (
    <View className="message-page whisper-list-page">
      <MessageNav>
        <View className="whisper-tabs">
          <View
            className={direction === 'received' ? 'whisper-tab whisper-tab--active' : 'whisper-tab'}
            onClick={() => setDirection('received')}
          >
            <Text>申请我的</Text>
          </View>
          <View
            className={direction === 'sent' ? 'whisper-tab whisper-tab--active' : 'whisper-tab'}
            onClick={() => setDirection('sent')}
          >
            <Text>我申请的</Text>
          </View>
        </View>
      </MessageNav>

      <ScrollView scrollY className="whisper-scroll" showScrollbar={false}>
        {direction === 'received' ? (
          <>
            <WhisperSectionHeader title="未处理(4)" first onMore={() => setShowBatchSheet(true)} />
            <View className="whisper-card-list">
              {receivedPending
                .filter(item => !hiddenRows.includes(item.id))
                .map((row, index) => (
                  <WhisperCard
                    key={row.id}
                    row={row}
                    swiped={swipedRow === row.id || (scene === 'whisper-received' && index === 2)}
                    onTouchStart={x => setTouchStart(x)}
                    onTouchEnd={x => setSwipedRow(touchStart - x > 36 ? row.id : undefined)}
                    onDelete={() => void hideRow(row.id)}
                    onOpen={() => openDetail('whisper-compose', records[0]?.whisperNo)}
                  />
                ))}
            </View>
            <WhisperSectionHeader title="已处理(6)" onMore={() => setShowBatchSheet(true)} />
            <View className="whisper-card-list whisper-card-list--handled">
              {receivedHandled
                .filter(item => !hiddenRows.includes(item.id))
                .map((row, index) => (
                  <WhisperCard
                    key={row.id}
                    row={row}
                    onTouchStart={x => setTouchStart(x)}
                    onTouchEnd={x => setSwipedRow(touchStart - x > 36 ? row.id : undefined)}
                    onDelete={() => void hideRow(row.id)}
                    onOpen={() =>
                      openDetail(
                        index === 3
                          ? 'whisper-detail-matched'
                          : index === 1
                            ? 'whisper-detail-cancelled'
                            : 'whisper-detail-expired'
                      )
                    }
                  />
                ))}
            </View>
          </>
        ) : (
          <View className="whisper-card-list whisper-card-list--sent">
            {sentDisplayRows
              .filter(item => !hiddenRows.includes(item.id))
              .map(row => (
                <WhisperCard
                  key={row.id}
                  row={row}
                  onTouchStart={x => setTouchStart(x)}
                  onTouchEnd={x => setSwipedRow(touchStart - x > 36 ? row.id : undefined)}
                  onDelete={() => void hideRow(row.id)}
                  onOpen={() => openDetail('whisper-detail-cancelled', row.id)}
                />
              ))}
          </View>
        )}
      </ScrollView>

      {showBatchSheet ? (
        <View className="message-sheet-mask">
          <View className="message-action-sheet">
            <View
              className="message-action-sheet-item message-action-sheet-item--danger"
              onClick={() => void hideAll()}
            >
              <Text>全部删除</Text>
            </View>
            <View className="message-action-sheet-gap" />
            <View className="message-action-sheet-item" onClick={() => setShowBatchSheet(false)}>
              <Text>取消</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}

function WhisperSectionHeader({
  title,
  first = false,
  onMore,
}: {
  title: string
  first?: boolean
  onMore: () => void
}) {
  return (
    <View
      className={
        first ? 'whisper-section-title whisper-section-title--first' : 'whisper-section-title'
      }
    >
      <Text>{title}</Text>
      <DotsButton onClick={onMore} />
    </View>
  )
}

function WhisperCard({
  row,
  swiped = false,
  onTouchStart,
  onTouchEnd,
  onDelete,
  onOpen,
}: {
  row: WhisperVisualRow
  swiped?: boolean
  onTouchStart: (x: number) => void
  onTouchEnd: (x: number) => void
  onDelete: () => void
  onOpen: () => void
}) {
  return (
    <View
      className="whisper-card-shell"
      onTouchStart={event => onTouchStart((event as ITouchEvent).touches[0]?.clientX || 0)}
      onTouchEnd={event => onTouchEnd((event as ITouchEvent).changedTouches[0]?.clientX || 0)}
    >
      <View
        className={swiped ? 'whisper-card whisper-card--swiped' : 'whisper-card'}
        onClick={onOpen}
      >
        <Image className="whisper-card-avatar" src={row.avatarUrl} mode="aspectFill" />
        <Text className="whisper-card-name">{row.name}</Text>
        {row.actionable ? <Text className="whisper-card-action">回复</Text> : null}
        {row.status ? <Text className="whisper-card-status">{row.status}</Text> : null}
      </View>
      {swiped ? (
        <View className="whisper-delete-button" onClick={onDelete}>
          <Text>删除</Text>
        </View>
      ) : null}
    </View>
  )
}
