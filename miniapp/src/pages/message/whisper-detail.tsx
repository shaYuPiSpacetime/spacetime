import { Image, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import { messageService } from '@/services/message'
import type { WhisperRecord } from '@/types/message'
import { MESSAGE_AVATAR, MessageNav } from './shared'
import './message.scss'

type DetailState = 'expired' | 'matched' | 'cancelled'

const detailCopy: Record<
  DetailState,
  { title: string; description: string; date: string; button: string }
> = {
  expired: {
    title: '过期自动拒绝',
    description: '超时未处理，系统自动拒绝',
    date: '05/16 08:00',
    button: '申请认识',
  },
  matched: {
    title: '配对成功',
    description: '主动回复，匹配成功',
    date: '05/16 08:00',
    button: '私信',
  },
  cancelled: {
    title: '对方解除',
    description: '对方主动解除申请',
    date: '05/16 08:00',
    button: '申请认识',
  },
}

export default function WhisperDetailPage() {
  const router = useRouter()
  const scene = router.params.mockScene || 'whisper-detail-expired'
  const directCompose = router.params.compose === '1'
  const initialState: DetailState = scene.includes('matched') || scene === 'whisper-report-sheet'
    ? 'matched'
    : scene.includes('cancelled')
      ? 'cancelled'
      : 'expired'
  const [record, setRecord] = useState<WhisperRecord>()
  const [showComposer, setShowComposer] = useState(scene === 'whisper-compose' || directCompose)
  const [showReportSheet, setShowReportSheet] = useState(scene === 'whisper-report-sheet')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const copy = detailCopy[initialState]
  const isDesignScene = Boolean(router.params.mockScene)
  const isSentExpired = scene === 'whisper-detail-sent-expired'

  useEffect(() => {
    const whisperNo = router.params.whisperNo
    const request = whisperNo
      ? messageService.getWhisper(whisperNo)
      : messageService.listWhispers('received').then(items => items[0])
    void request.then(setRecord).catch(() => undefined)
  }, [router.params.whisperNo])

  const targetAvatar = router.params.avatar ? decodeURIComponent(router.params.avatar) : ''
  const targetNickname = router.params.nickname ? decodeURIComponent(router.params.nickname) : ''
  const targetMeta = router.params.meta ? decodeURIComponent(router.params.meta) : ''
  const avatarUrl = directCompose ? targetAvatar || MESSAGE_AVATAR : isDesignScene ? MESSAGE_AVATAR : record?.applicantAvatarUrl || MESSAGE_AVATAR
  const profileName = directCompose ? targetNickname || '用户' : isDesignScene ? '一只筱脑虎' : record?.applicantNickname || '一只筱脑虎'
  const profileMeta = directCompose ? targetMeta || '资料待完善' : '97年丨163cm丨双鱼座'
  const quoteContent = isDesignScene
    ? '你好，希望能和你认识一下～'
    : record?.content || '你好，希望能和你认识一下～'
  const timelineIcon =
    initialState === 'expired' || initialState === 'cancelled'
      ? miniappOssIcons.messageTimelineExpired
      : miniappOssIcons.messageTimelineMatched

  const submit = async () => {
    if (submitting) return
    if (!content.trim()) {
      void Taro.showToast({ title: '写点什么再申请', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      await messageService.createWhisper(
        { receiverUserNo: router.params.receiverUserNo || record?.applicantUserNo || 'user-lin', content, costCoins: 100 },
        `whisper-${Date.now()}`
      )
      setShowComposer(false)
      void Taro.showToast({ title: '申请已发送', icon: 'success' })
    } catch (error) {
      const title = error instanceof Error ? error.message : String(error || '发送失败')
      void Taro.showToast({ title, icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const openPrimary = () => {
    if (initialState === 'matched') {
      void Taro.navigateTo({ url: '/pages/message/private-chat?mockScene=private-chat-default' })
    } else {
      setShowComposer(true)
    }
  }

  const openReport = () => {
    setShowReportSheet(false)
    const targetNo = record?.whisperNo || 'mock-whisper'
    void Taro.navigateTo({
      url: `/pages/message/report?targetType=whisper&targetNo=${encodeURIComponent(targetNo)}`,
    })
  }

  return (
    <View className="message-page whisper-detail-page">
      <MessageNav />
      <View
        className="whisper-profile"
        onClick={() => void Taro.navigateTo({ url: `/pages/heart/user?userId=${encodeURIComponent(router.params.receiverUserNo || record?.applicantUserNo || '')}` })}
      >
        <Image className="whisper-profile-avatar" src={avatarUrl} mode="aspectFill" />
        <View className="whisper-profile-copy">
          <Text className="whisper-profile-name">{profileName}</Text>
          <Text className="whisper-profile-meta">{profileMeta}</Text>
        </View>
        <View className="whisper-profile-chevron" />
      </View>

      <View className="whisper-quote">
        <Text className="whisper-quote-mark">“</Text>
        <Text className="whisper-quote-content">{quoteContent}</Text>
        <View
          className="whisper-report"
          role="button"
          aria-label="举报这条悄悄话"
          onClick={() => setShowReportSheet(true)}
        >
          <Image
            className="whisper-report-icon"
            src={miniappOssIcons.messageReport}
            mode="aspectFit"
          />
          <Text>举报</Text>
        </View>
      </View>

      <View className="whisper-timeline">
        <TimelineRow
          icon={timelineIcon}
          title={copy.title}
          description={copy.description}
          date={copy.date}
          active
        />
        {initialState === 'matched' ? (
          <TimelineRow
            icon={miniappOssIcons.messageTimelineView}
            title="查看申请"
            date="05/13 07:59"
          />
        ) : null}
        <TimelineRow
          icon={miniappOssIcons.messageTimelineYo}
          title={isSentExpired ? '发起申请' : '收到申请'}
          date={initialState === 'expired' ? '05/09 07:59' : '05/12 07:59'}
        />
      </View>

      <View className="whisper-detail-primary message-primary-button" onClick={openPrimary}>
        <Text>{copy.button}</Text>
      </View>

      {showComposer ? (
        <WhisperComposer
          avatarUrl={avatarUrl}
          profileName={profileName}
          profileMeta={profileMeta}
          content={content}
          submitting={submitting}
          onInput={setContent}
          onClose={() => setShowComposer(false)}
          onSubmit={() => void submit()}
        />
      ) : null}

      {showReportSheet ? (
        <View className="message-sheet-mask" onClick={() => setShowReportSheet(false)}>
          <View
            className="message-action-sheet whisper-report-sheet"
            onClick={event => event.stopPropagation()}
          >
            <View className="message-action-sheet-item message-action-sheet-item--report" onClick={openReport}>
              <Text>举报</Text>
            </View>
            <View className="message-action-sheet-gap" />
            <View className="message-action-sheet-item" onClick={() => setShowReportSheet(false)}>
              <Text>取消</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}

function TimelineRow({
  icon,
  title,
  description,
  date,
  active = false,
}: {
  icon?: string
  title: string
  description?: string
  date: string
  active?: boolean
}) {
  return (
    <View className="whisper-timeline-row">
      <View className="whisper-timeline-axis">
        {icon ? <Image className="whisper-timeline-icon" src={icon} mode="aspectFit" /> : null}
        <View className="whisper-timeline-line" />
      </View>
      <View className="whisper-timeline-copy">
        <Text
          className={
            active
              ? 'whisper-timeline-title whisper-timeline-title--active'
              : 'whisper-timeline-title'
          }
        >
          {title}
        </Text>
        {description ? <Text className="whisper-timeline-description">{description}</Text> : null}
      </View>
      <Text className="whisper-timeline-date">{date}</Text>
    </View>
  )
}

function WhisperComposer({
  avatarUrl,
  profileName,
  profileMeta,
  content,
  submitting,
  onInput,
  onClose,
  onSubmit,
}: {
  avatarUrl: string
  profileName: string
  profileMeta: string
  content: string
  submitting: boolean
  onInput: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  const count = useMemo(() => Array.from(content).length, [content])
  return (
    <View className="whisper-composer-mask" onClick={onClose}>
      <View className="whisper-composer" onClick={event => event.stopPropagation()}>
        <View className="whisper-composer-profile">
          <Image className="whisper-composer-avatar" src={avatarUrl} mode="aspectFill" />
          <View>
            <Text className="whisper-composer-name">{profileName}</Text>
            <Text className="whisper-composer-meta">{profileMeta}</Text>
          </View>
        </View>
        <View className="whisper-textarea-shell">
          <Textarea
            className="whisper-textarea"
            value={content}
            maxlength={60}
            placeholder="写点什么···"
            onInput={event => onInput(event.detail.value)}
          />
          <Text className="whisper-textarea-count">{count}/60</Text>
        </View>
        <View className="whisper-pay-row">
          <View>
            <View className="whisper-coin">
              <Image
                className="whisper-coin-icon"
                src={miniappOssIcons.messageQianxunCoin}
                mode="aspectFit"
              />
              <Text>100</Text>
            </View>
            <Text className="whisper-pay-note">私信直达，配对率翻倍</Text>
          </View>
          <View className="whisper-submit message-primary-button" onClick={onSubmit}>
            <Text>{submitting ? '提交中' : '立即申请'}</Text>
          </View>
        </View>
        <View className="whisper-member-tip">
          <Image
            src={miniappOssIcons.messageMemberBadge}
            className="whisper-member-badge"
            mode="aspectFit"
          />
          <Text>开通时空邂逅会员每天免费申请一次</Text>
        </View>
      </View>
    </View>
  )
}
