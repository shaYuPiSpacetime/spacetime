import { Button, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import {
  messageService,
  mockMessageService,
  type MessageReportReasonCode,
} from '@/services/message'
import { MessageNav } from './shared'
import './message.scss'

const REPORT_REASONS: ReadonlyArray<{
  code: MessageReportReasonCode
  label: string
  className: string
}> = [
  { code: 'avatar_mismatch', label: '头像非本人或无法看清正脸', className: 'report-reason--avatar' },
  { code: 'false_profile', label: '内容乱填/虚假资料', className: 'report-reason--profile' },
  { code: 'contact_disclosure', label: '资料透露联系方式', className: 'report-reason--contact' },
  { code: 'marriage_agency', label: '婚托、饭托、酒托等', className: 'report-reason--agency' },
  { code: 'spam_ad', label: '垃圾营销广告', className: 'report-reason--spam' },
  { code: 'fraud', label: '虚假中奖消息、诈骗等', className: 'report-reason--fraud' },
  { code: 'harassment', label: '聊天内容不适/骚扰', className: 'report-reason--harassment' },
  { code: 'other', label: '其他', className: 'report-reason--other' },
]

export default function MessageReportPage() {
  const router = useRouter()
  const isDesignForm = router.params.mockScene === 'report-form'
  const blocked = router.params.blocked === '1'
  const service = router.params.mockScene ? mockMessageService : messageService
  const [selectedReason, setSelectedReason] = useState<MessageReportReasonCode | undefined>(
    isDesignForm ? 'avatar_mismatch' : undefined
  )
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(router.params.mockScene === 'report-success')
  const [clientReportId] = useState(
    router.params.clientReportId || `report-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
  )
  const descriptionCount = useMemo(() => Array.from(description).length, [description])

  const backToMessage = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) void Taro.navigateBack()
    else void Taro.switchTab({ url: '/pages/chat/index' })
  }

  const submit = async () => {
    if (!selectedReason) {
      void Taro.showToast({ title: '请选择举报事项类型', icon: 'none' })
      return
    }
    if (submitting) return
    setSubmitting(true)
    try {
      await service.report({
        clientReportId,
        targetType:
          router.params.targetType === 'message' || router.params.targetType === 'conversation'
            ? router.params.targetType
            : 'whisper',
        targetBizNo: router.params.targetBizNo || router.params.targetNo || 'mock-whisper',
        timConversationId: router.params.timConversationId,
        timMessageId: router.params.timMessageId,
        timMsgKey: router.params.timMsgKey,
        reasonCode: selectedReason,
        extraText: description.trim() || undefined,
        sourceType: router.params.targetType,
        conversationNo: router.params.conversationNo,
        whisperNo: router.params.whisperNo,
        messageNo: router.params.messageNo,
      })
      setSuccess(true)
    } catch (error) {
      void Taro.showToast({
        title:
          router.params.blocked === '1'
            ? '已拉黑，举报提交失败，请重试'
            : error instanceof Error
              ? error.message
              : '提交失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <View className="message-page message-page--gray report-success-page">
        <MessageNav title="提交成功" center onBack={backToMessage} />
        <View className="report-success-content">
          <View className="report-success-icon" aria-label="提交成功">
            <View className="report-success-check" />
          </View>
          <Text className="report-success-title">
            {blocked ? '已拉黑并提交举报' : '提交成功'}
          </Text>
          <View className="report-success-description">
            <Text>感谢你的提交，我们会根据</Text>
            <View
              className="report-success-link"
              role="link"
              onClick={() => void Taro.showModal({
                title: '平台违规行为处罚细则',
                content: '平台会依据证据对骚扰、诈骗、虚假资料、违规营销等行为进行审核，并按情节采取警告、限制互动或封禁等措施。',
                showCancel: false,
              })}
            >
              <Text>《平台违规行为处罚细则》</Text>
            </View>
            <Text>对相关举报进行处理。</Text>
          </View>
          <Button className="message-primary-button report-success-button" onClick={backToMessage}>
            知道啦
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className="message-page message-page--gray report-page">
      <MessageNav title="举报" center />
      <ScrollView className="report-scroll" scrollY>
        <View className="report-content">
          <Text className="report-section-title">请选择你要举报的事项类型</Text>
          <View className="report-reasons">
            {REPORT_REASONS.map(reason => (
              <Button
                key={reason.code}
                className={
                  selectedReason === reason.code
                    ? `report-reason ${reason.className} report-reason--active`
                    : `report-reason ${reason.className}`
                }
                aria-label={`选择举报原因：${reason.label}`}
                onClick={() => setSelectedReason(reason.code)}
              >
                {reason.label}
              </Button>
            ))}
          </View>

          <Text className="report-section-title report-description-title">具体描述</Text>
          <View className="report-description-shell">
            <Textarea
              className="report-description-input"
              value={description}
              maxlength={400}
              placeholder="请在这里描述您的问题"
              onInput={event => setDescription(event.detail.value)}
            />
            <Text className="report-description-count">{descriptionCount}/400</Text>
          </View>
          <Text className="report-evidence-note">
            平台将根据消息编号固化必要聊天证据，无需上传聊天截图。
          </Text>
        </View>
      </ScrollView>
      <Button
        className={
          submitting
            ? 'message-primary-button report-submit report-submit--disabled'
            : 'message-primary-button report-submit'
        }
        disabled={submitting}
        onClick={() => void submit()}
      >
        {submitting ? '提交中' : '提交'}
      </Button>
    </View>
  )
}
