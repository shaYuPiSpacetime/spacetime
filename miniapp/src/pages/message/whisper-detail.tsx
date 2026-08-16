import { Image, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  createWhisperIdempotencyCache,
  resolveStableWhisperTargetUserNo,
  resolveWhisperErrorMessage,
  resolveWhisperRouteSourceScene,
  resolveWhisperStatusDescription,
  shouldInlineWhisperSubmitError,
} from '@/domain/whisperRuntime'
import { messageService, mockMessageService } from '@/services/message'
import { messagePlatformRuntime } from '@/services/messagePlatformRuntime'
import { getApiErrorCode } from '@/services/request'
import type {
  MessageWhisperDetail,
  WhisperPrecheckResponse,
} from '@/types/message'
import { MESSAGE_AVATAR, MessageNav } from './shared'
import './message.scss'

function createRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function WhisperDetailPage() {
  const router = useRouter()
  const isMockScene = Boolean(router.params.mockScene)
  const directCompose = router.params.compose === '1'
  const service = isMockScene ? mockMessageService : messageService
  const [record, setRecord] = useState<MessageWhisperDetail>()
  const [quote, setQuote] = useState<WhisperPrecheckResponse>()
  const [messageContent, setMessageContent] = useState('')
  const [showComposer, setShowComposer] = useState(
    router.params.mockScene === 'whisper-compose' || directCompose,
  )
  const [showReportSheet, setShowReportSheet] = useState(
    router.params.mockScene === 'whisper-report-sheet',
  )
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const idempotencyCache = useRef(createWhisperIdempotencyCache()).current

  const targetUserNo = router.params.receiverUserNo || ''
  const sourceScene = resolveWhisperRouteSourceScene(router.params.sourceScene)
  const sourceBizNo = router.params.sourceBizNo || undefined

  const load = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      if (directCompose) {
        const nextQuote = await service.precheckWhisper({
          targetUserNo,
          sourceScene,
          sourceBizNo,
        })
        setQuote(nextQuote)
        if (!nextQuote.canSend) setErrorMessage(nextQuote.reasonText || '当前暂时无法发送悄悄话')
        return
      }

      let whisperNo = router.params.whisperNo
      if (!whisperNo && isMockScene) {
        const page = await service.listWhispers('received', 'pending', undefined, 1)
        whisperNo = page.list[0]?.whisperNo
      }
      if (!whisperNo) throw new Error('悄悄话编号缺失')
      const nextRecord = await service.getWhisper(whisperNo)
      setRecord(nextRecord)
      setMessageContent(nextRecord.contentAvailable ? nextRecord.content || '' : '')
    } catch (error) {
      setErrorMessage(resolveWhisperErrorMessage(error, '悄悄话加载失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [router.params.whisperNo, directCompose, isMockScene, targetUserNo, sourceScene, sourceBizNo])

  const avatarUrl = directCompose
    ? (router.params.avatar ? decodeURIComponent(router.params.avatar) : MESSAGE_AVATAR)
    : record?.peerUser.avatarUrl || MESSAGE_AVATAR
  const profileName = directCompose
    ? (router.params.nickname ? decodeURIComponent(router.params.nickname) : '用户')
    : record?.peerUser.nickname || '用户已注销'
  const profileMeta = router.params.meta ? decodeURIComponent(router.params.meta) : '资料待完善'
  const statusTitle = record?.displayStatus || (directCompose ? '发起申请' : '等待处理')
  const statusDescription = resolveWhisperStatusDescription(
    directCompose,
    record?.status,
    record?.direction,
  )

  const composeTargetUserNo = directCompose
    ? targetUserNo
    : resolveStableWhisperTargetUserNo(undefined, record?.peerUser.userId)
  const composeSourceScene = directCompose ? sourceScene : 'whisper_reverse'
  const composeSourceBizNo = directCompose ? sourceBizNo : record?.whisperNo

  const precheckCompose = async (): Promise<WhisperPrecheckResponse> => {
    const nextQuote = await service.precheckWhisper({
      targetUserNo: composeTargetUserNo,
      sourceScene: composeSourceScene,
      sourceBizNo: composeSourceBizNo,
    })
    setQuote(nextQuote)
    return nextQuote
  }

  const prepareComposer = async () => {
    if (record?.actions.canReply) {
      setShowComposer(true)
      return
    }
    if (!directCompose && !record?.actions.canReverseApply) return
    try {
      const activeQuote = quote || await precheckCompose()
      if (!activeQuote.canSend || !activeQuote.quoteToken) {
        await Taro.showToast({ title: activeQuote.reasonText || '当前暂时无法申请', icon: 'none' })
        return
      }
      setShowComposer(true)
    } catch (error) {
      await Taro.showToast({ title: resolveWhisperErrorMessage(error, '预检失败，请稍后重试'), icon: 'none' })
    }
  }

  const submit = async () => {
    const normalized = content.trim()
    if (!normalized || submitting) {
      if (!normalized) void Taro.showToast({ title: '写点什么再申请', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      if (record?.actions.canReply) {
        const requestId = idempotencyCache.get(`reply:${record.whisperNo}`, normalized)
        const result = await service.replyWhisper(
          record.whisperNo,
          { requestId, content: normalized },
          requestId,
        )
        setShowComposer(false)
        await Taro.showToast({ title: '回复成功，已开启私信', icon: 'success' })
        if (result.conversationNo) {
          await Taro.redirectTo({
            url: `/pages/message/private-chat?conversationNo=${encodeURIComponent(result.conversationNo)}${isMockScene ? '&mockScene=private-chat-default' : ''}`,
          })
        }
        idempotencyCache.clear()
      } else {
        const activeQuote = quote || await precheckCompose()
        if (!activeQuote.canSend || !activeQuote.quoteToken) throw new Error(activeQuote.reasonText || '当前暂时无法申请')
        const requestId = idempotencyCache.get(
          `create:${composeTargetUserNo}:${composeSourceScene}:${composeSourceBizNo || ''}`,
          `${normalized}:${activeQuote.quoteToken}`,
        )
        await service.createWhisper(
          {
            targetUserNo: composeTargetUserNo,
            sourceScene: composeSourceScene,
            sourceBizNo: composeSourceBizNo,
            content: normalized,
            quoteToken: activeQuote.quoteToken,
          },
          requestId,
        )
        setShowComposer(false)
        idempotencyCache.clear()
        await Taro.showToast({ title: '申请已发送', icon: 'success' })
      }
      setErrorMessage('')
      setContent('')
      if (!isMockScene) await messagePlatformRuntime.onForeground()
    } catch (error) {
      if (getApiErrorCode(error) === 30021) {
        idempotencyCache.clear()
        setQuote(undefined)
        try {
          await precheckCompose()
        } catch {
          // 保留原正文，用户点击重试时重新预检。
        }
        await Taro.showToast({ title: '报价已变化，请重新确认后提交', icon: 'none' })
        return
      }
      if (shouldInlineWhisperSubmitError(getApiErrorCode(error))) {
        setErrorMessage(resolveWhisperErrorMessage(error, '提交失败，请稍后重试'))
        return
      }
      await Taro.showToast({
        title: resolveWhisperErrorMessage(error, '提交失败，请稍后重试'),
        icon: 'none',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openPrimary = () => {
    if (record?.actions.canEnterConversation && record.conversationNo) {
      void Taro.navigateTo({ url: `/pages/message/private-chat?conversationNo=${encodeURIComponent(record.conversationNo)}` })
      return
    }
    if (directCompose || record?.actions.canReply || record?.actions.canReverseApply) void prepareComposer()
  }

  const openReport = () => {
    if (!record) return
    setShowReportSheet(false)
    const clientReportId = createRequestId('report')
    void Taro.navigateTo({
      url: `/pages/message/report?sourceType=whisper&targetId=${encodeURIComponent(record.whisperNo)}&whisperNo=${encodeURIComponent(record.whisperNo)}&clientReportId=${clientReportId}${isMockScene ? '&mockScene=report-form' : ''}`,
    })
  }

  const deleteRecord = async () => {
    if (!record?.actions.canDelete) return
    const confirmed = await Taro.showModal({
      title: '删除悄悄话',
      content: '删除后该申请将不再显示，确定删除吗？',
      confirmText: '删除',
      confirmColor: '#F52B2B',
    })
    if (!confirmed.confirm) return
    try {
      await service.hideWhisper(record.whisperNo)
      await Taro.showToast({ title: '已删除', icon: 'success' })
      await Taro.navigateBack()
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : '删除失败，请稍后重试', icon: 'none' })
    }
  }

  const canAct = directCompose
    || Boolean(record?.actions.canReply)
    || Boolean(record?.actions.canEnterConversation)
    || Boolean(record?.actions.canReverseApply)
  const actionText = record?.actions.canEnterConversation && record.conversationNo
    ? '私信'
    : record?.actions.canReply
      ? '回复并认识'
      : record?.actions.canReverseApply
        ? '重新申请'
        : '发起申请'

  return (
    <View className="message-page whisper-detail-page">
      <MessageNav />
      <View className="whisper-profile" onClick={() => {
        const userId = record?.peerUser.userId || router.params.receiverUserId
        if (userId && (directCompose || record?.actions.canOpenProfile)) {
          void Taro.navigateTo({ url: `/pages/heart/user?userId=${encodeURIComponent(userId)}` })
        }
      }}>
        <Image className="whisper-profile-avatar" src={avatarUrl} mode="aspectFill" />
        <View className="whisper-profile-copy">
          <Text className="whisper-profile-name">{profileName}</Text>
          <Text className="whisper-profile-meta">{profileMeta}</Text>
        </View>
        <View className="whisper-profile-chevron" />
      </View>

      {!directCompose ? (
        <View className="whisper-quote">
          <Text className="whisper-quote-mark">“</Text>
          <Text className="whisper-quote-content">{messageContent || (loading ? '内容加载中...' : '悄悄话内容暂不可用')}</Text>
          <View className="whisper-report" role="button" aria-label="举报这条悄悄话" onClick={() => setShowReportSheet(true)}>
            <Image className="whisper-report-icon" src={miniappOssIcons.messageReport} mode="aspectFit" />
            <Text>举报</Text>
          </View>
        </View>
      ) : null}

      <View className="whisper-timeline">
        <TimelineRow icon={record?.status === 'pending' || directCompose ? miniappOssIcons.messageTimelineYo : miniappOssIcons.messageTimelineExpired} title={statusTitle} description={statusDescription} date={formatDate(record?.createdTime)} active />
        {!directCompose ? <TimelineRow icon={miniappOssIcons.messageTimelineView} title={record?.direction === 'sent' ? '发起申请' : '收到申请'} date={formatDate(record?.createdTime)} /> : null}
      </View>

      {errorMessage ? <Text className="message-inline-error" onClick={() => void load()}>{errorMessage}，点击重试</Text> : null}
      {canAct ? <View className="whisper-detail-primary message-primary-button" onClick={openPrimary}><Text>{actionText}</Text></View> : null}

      {showComposer ? (
        <WhisperComposer
          avatarUrl={avatarUrl}
          profileName={profileName}
          profileMeta={profileMeta}
          content={content}
          submitting={submitting}
          maxLength={record?.actions.canReply ? 500 : quote?.contentMaxLength || 60}
          coinAmount={record?.actions.canReply ? 0 : quote?.coinAmount || 0}
          isReply={Boolean(record?.actions.canReply)}
          onInput={setContent}
          onClose={() => setShowComposer(false)}
          onSubmit={() => void submit()}
        />
      ) : null}

      {showReportSheet ? (
        <View className="message-sheet-mask" onClick={() => setShowReportSheet(false)}>
          <View className="message-action-sheet whisper-report-sheet" onClick={event => event.stopPropagation()}>
            <View className="message-action-sheet-item message-action-sheet-item--report" onClick={openReport}><Text>举报</Text></View>
            {record?.actions.canDelete ? <View className="message-action-sheet-item message-action-sheet-item--danger" onClick={() => void deleteRecord()}><Text>删除申请</Text></View> : null}
            <View className="message-action-sheet-gap" />
            <View className="message-action-sheet-item" onClick={() => setShowReportSheet(false)}><Text>取消</Text></View>
          </View>
        </View>
      ) : null}
    </View>
  )
}

function TimelineRow({ icon, title, description, date, active = false }: { icon?: string; title: string; description?: string; date: string; active?: boolean }) {
  return (
    <View className="whisper-timeline-row">
      <View className="whisper-timeline-axis">{icon ? <Image className="whisper-timeline-icon" src={icon} mode="aspectFit" /> : null}<View className="whisper-timeline-line" /></View>
      <View className="whisper-timeline-copy">
        <Text className={active ? 'whisper-timeline-title whisper-timeline-title--active' : 'whisper-timeline-title'}>{title}</Text>
        {description ? <Text className="whisper-timeline-description">{description}</Text> : null}
      </View>
      <Text className="whisper-timeline-date">{date}</Text>
    </View>
  )
}

function WhisperComposer({ avatarUrl, profileName, profileMeta, content, submitting, maxLength, coinAmount, isReply, onInput, onClose, onSubmit }: { avatarUrl: string; profileName: string; profileMeta: string; content: string; submitting: boolean; maxLength: number; coinAmount: number; isReply: boolean; onInput: (value: string) => void; onClose: () => void; onSubmit: () => void }) {
  const count = useMemo(() => Array.from(content).length, [content])
  return (
    <View className="whisper-composer-mask" onClick={onClose}>
      <View className="whisper-composer" onClick={event => event.stopPropagation()}>
        <View className="whisper-composer-profile"><Image className="whisper-composer-avatar" src={avatarUrl} mode="aspectFill" /><View><Text className="whisper-composer-name">{profileName}</Text><Text className="whisper-composer-meta">{profileMeta}</Text></View></View>
        <View className="whisper-textarea-shell"><Textarea className="whisper-textarea" value={content} maxlength={maxLength} placeholder="写点什么···" onInput={event => onInput(event.detail.value)} /><Text className="whisper-textarea-count">{count}/{maxLength}</Text></View>
        <View className="whisper-pay-row">
          {!isReply ? <View><View className="whisper-coin"><Image className="whisper-coin-icon" src={miniappOssIcons.messageQianxunCoin} mode="aspectFit" /><Text>{coinAmount}</Text></View><Text className="whisper-pay-note">私信直达，配对率翻倍</Text></View> : <Text className="whisper-pay-note">回复后双方将开启私信</Text>}
          <View className="whisper-submit message-primary-button" onClick={onSubmit}><Text>{submitting ? '提交中' : isReply ? '确认回复' : '立即申请'}</Text></View>
        </View>
        {!isReply ? <View className="whisper-member-tip"><Image src={miniappOssIcons.messageMemberBadge} className="whisper-member-badge" mode="aspectFit" /><Text>开通时空邂逅会员每天免费申请一次</Text></View> : null}
      </View>
    </View>
  )
}
