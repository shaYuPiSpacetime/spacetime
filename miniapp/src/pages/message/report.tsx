import { Button, Image, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import {
  messageService,
  mockMessageService,
  type MessageReportReasonCode,
} from '@/services/message'
import { uploadDirectToOss } from '@/services/ossUpload'
import { MessageNav } from './shared'
import './message.scss'

const REASON_CLASS_NAMES = [
  'report-reason--avatar',
  'report-reason--profile',
  'report-reason--contact',
  'report-reason--agency',
  'report-reason--spam',
  'report-reason--fraud',
  'report-reason--harassment',
  'report-reason--other',
]

export default function MessageReportPage() {
  const router = useRouter()
  const isDesignForm = router.params.mockScene === 'report-form'
  const blocked = router.params.blocked === '1'
  const service = router.params.mockScene ? mockMessageService : messageService
  const [reasons, setReasons] = useState<Array<{ code: string; label: string; className: string }>>([])
  const [configError, setConfigError] = useState('')
  const [selectedReason, setSelectedReason] = useState<MessageReportReasonCode | undefined>(
    isDesignForm ? 'avatar_mismatch' : undefined
  )
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [evidenceImageUrls, setEvidenceImageUrls] = useState<string[]>([])
  const [success, setSuccess] = useState(router.params.mockScene === 'report-success')
  const [clientReportId] = useState(
    router.params.clientReportId || `report-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
  )
  const descriptionCount = useMemo(() => Array.from(description).length, [description])

  useEffect(() => {
    let cancelled = false
    void service.getCommunityReportConfig()
      .then(config => {
        if (cancelled) return
        if (!config.reportEntryEnabled) {
          setConfigError('当前暂未开放举报入口')
          return
        }
        const next = [...config.reportReasons]
          .sort((left, right) => left.sort - right.sort)
          .map((reason, index) => ({
            code: reason.code,
            label: reason.label,
            className: REASON_CLASS_NAMES[index % REASON_CLASS_NAMES.length],
          }))
        if (next.length === 0) {
          setConfigError('举报原因暂不可用，请稍后重试')
          return
        }
        setReasons(next)
        if (isDesignForm && next.length > 0) {
          setSelectedReason(current => current || next[0].code)
        }
      })
      .catch(error => {
        if (!cancelled) setConfigError(error instanceof Error ? error.message : '举报原因加载失败')
      })
    return () => { cancelled = true }
  }, [isDesignForm, service])

  const chooseEvidence = async () => {
    if (uploadingEvidence || evidenceImageUrls.length >= 3) return
    try {
      const result = await Taro.chooseMedia({
        count: 3 - evidenceImageUrls.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
      })
      setUploadingEvidence(true)
      const uploaded = [...evidenceImageUrls]
      for (const file of result.tempFiles) {
        const item = await uploadDirectToOss(
          '/miniapp/file/upload-ticket/report-evidence',
          file.tempFilePath,
        )
        uploaded.push(item.url)
      }
      setEvidenceImageUrls(uploaded.slice(0, 3))
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (!/cancel/i.test(message)) {
        await Taro.showToast({ title: '凭证图片上传失败，请重试', icon: 'none' })
      }
    } finally {
      setUploadingEvidence(false)
    }
  }

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
    if (configError) {
      void Taro.showToast({ title: configError, icon: 'none' })
      return
    }
    if (uploadingEvidence) {
      void Taro.showToast({ title: '凭证图片上传中，请稍候', icon: 'none' })
      return
    }
    if (submitting) return
    setSubmitting(true)
    try {
      const sourceType = router.params.sourceType === 'whisper' || router.params.whisperNo
        ? 'whisper'
        : 'private_chat'
      const targetId = router.params.targetId
        || router.params.targetBizNo
        || router.params.targetNo
        || (sourceType === 'whisper' ? router.params.whisperNo : router.params.conversationNo)
        || (isDesignForm ? 'mock-whisper' : '')
      if (!targetId) throw new Error('举报入口已失效，请返回后重试')
      await service.report({
        clientReportId,
        targetType: 'chat',
        targetId,
        timConversationId: router.params.timConversationId,
        timMessageId: router.params.timMessageId,
        timMsgKey: router.params.timMsgKey,
        reasonCode: selectedReason,
        extraText: description.trim() || undefined,
        evidenceImageUrls,
        sourceType,
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
            {reasons.map(reason => (
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
          <View className="report-evidence-header">
            <Text className="report-section-title">凭证图片（选填，最多3张）</Text>
            <Button className="report-evidence-add" disabled={uploadingEvidence || evidenceImageUrls.length >= 3} onClick={() => void chooseEvidence()}>
              {uploadingEvidence ? '上传中' : '添加图片'}
            </Button>
          </View>
          <View className="report-evidence-list">
            {evidenceImageUrls.map(url => (
              <View className="report-evidence-item" key={url}>
                <Image className="report-evidence-image" src={url} mode="aspectFill" />
                <View className="report-evidence-remove" role="button" aria-label="移除凭证图片" onClick={() => setEvidenceImageUrls(current => current.filter(item => item !== url))}><Text>×</Text></View>
              </View>
            ))}
          </View>
          {configError ? <Text className="message-inline-error">{configError}</Text> : null}
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
