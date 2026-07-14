import { Button, Image, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  messageService,
  type MessageReportReasonCode,
} from '@/services/message'
import { MessageNav } from './shared'
import './message.scss'

const REPORT_REASONS: ReadonlyArray<{
  code: MessageReportReasonCode
  label: string
  className: string
}> = [
  { code: 'AVATAR_MISMATCH', label: '头像非本人或无法看清正脸', className: 'report-reason--avatar' },
  { code: 'FALSE_PROFILE', label: '内容乱填/虚假资料', className: 'report-reason--profile' },
  { code: 'CONTACT_DISCLOSURE', label: '资料透露连续方式', className: 'report-reason--contact' },
  { code: 'MARRIAGE_AGENCY', label: '婚托、饭托、酒托等', className: 'report-reason--agency' },
  { code: 'SPAM_AD', label: '垃圾营销广告', className: 'report-reason--spam' },
  { code: 'FRAUD', label: '虚假中奖消息、诈骗等', className: 'report-reason--fraud' },
  { code: 'HARASSMENT', label: '聊天内容不适/骚扰', className: 'report-reason--harassment' },
  { code: 'OTHER', label: '其他', className: 'report-reason--other' },
]

export default function MessageReportPage() {
  const router = useRouter()
  const isDesignForm = router.params.mockScene === 'report-form'
  const [selectedReason, setSelectedReason] = useState<MessageReportReasonCode | undefined>(
    isDesignForm ? 'AVATAR_MISMATCH' : undefined
  )
  const [description, setDescription] = useState('')
  const [evidencePath, setEvidencePath] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(router.params.mockScene === 'report-success')
  const descriptionCount = useMemo(() => Array.from(description).length, [description])

  const backToMessage = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) void Taro.navigateBack()
    else void Taro.switchTab({ url: '/pages/chat/index' })
  }

  const chooseEvidence = async () => {
    try {
      const result = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
      })
      setEvidencePath(result.tempFiles[0]?.tempFilePath || '')
    } catch {
      // 用户取消选择时保持当前页面，不展示错误提示。
    }
  }

  const submit = async () => {
    if (!selectedReason) {
      void Taro.showToast({ title: '请选择举报事项类型', icon: 'none' })
      return
    }
    if (submitting) return
    setSubmitting(true)
    try {
      await messageService.report({
        targetType: 'whisper',
        targetNo: router.params.targetNo || 'mock-whisper',
        reasonCode: selectedReason,
        description: description.trim() || undefined,
        evidenceUrls: evidencePath ? [evidencePath] : undefined,
      })
      setSuccess(true)
    } catch (error) {
      void Taro.showToast({
        title: error instanceof Error ? error.message : '提交失败，请稍后重试',
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
          <Text className="report-success-title">提交成功</Text>
          <View className="report-success-description">
            <Text>感谢你的提交，我们会根据</Text>
            <View
              className="report-success-link"
              role="link"
              onClick={() => void Taro.showToast({ title: '处罚细则页面待接入', icon: 'none' })}
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

          <Text className="report-section-title report-upload-title">上传凭证图片</Text>
          <Button className="report-upload" onClick={() => void chooseEvidence()}>
            {evidencePath ? (
              <Image className="report-upload-preview" src={evidencePath} mode="aspectFill" />
            ) : (
              <>
                <Image
                  className="report-upload-icon"
                  src={miniappOssIcons.verificationUploadCamera}
                  mode="aspectFit"
                />
                <Text className="report-upload-copy">上传材料</Text>
              </>
            )}
          </Button>
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
