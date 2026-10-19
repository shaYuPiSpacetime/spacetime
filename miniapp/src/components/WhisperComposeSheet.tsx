import Taro, { useDidHide, useDidShow } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import CommunityWhisperSheet from '@/components/CommunityWhisperSheet'
import { createWhisperIdempotencyCache, resolveWhisperErrorMessage } from '@/domain/whisperRuntime'
import {
  createWhisper,
  precheckWhisper,
  resolveConversationByPeerUserId,
  type WhisperPrecheckCommand,
} from '@/services/message'
import type { WhisperPrecheckResponse } from '@/types/message'
import { getMessageAuthSessionVersion } from '@/domain/messageLifecycle'
import { openPrivateChat } from '@/utils/privateChatNavigation'

export interface WhisperComposeTarget extends WhisperPrecheckCommand {
  nickname: string
  avatar?: string
  meta?: string
}

interface WhisperComposeSheetProps {
  target?: WhisperComposeTarget | null
  visible?: boolean
  onClose: () => void
}

/** 所有发起悄悄话入口复用同一个页内弹窗与预检查、发送流程。 */
export default function WhisperComposeSheet({ target, visible = true, onClose }: WhisperComposeSheetProps) {
  const [content, setContent] = useState('')
  const [precheck, setPrecheck] = useState<WhisperPrecheckResponse>()
  const [readyTargetKey, setReadyTargetKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const idempotencyCache = useRef(createWhisperIdempotencyCache()).current
  const refreshAfterRecharge = useRef(false)
  const pageActive = useRef(true)
  const sourceGeneration = useRef(0)
  const preparedTargetKey = useRef('')
  const [lifecycleVersion, setLifecycleVersion] = useState(0)
  const targetKey = target ? `${target.targetUserNo}:${target.sourceScene}:${target.sourceBizNo || ''}` : ''

  const closeExistingEntry = async (isActive: () => boolean) => {
    await Taro.hideKeyboard().catch(() => undefined)
    if (!isActive()) return false
    onClose()
    return true
  }

  const openExistingEntry = async (result: WhisperPrecheckResponse, sessionVersion: number, isActive: () => boolean) => {
    if (result.existingWhisperNo) {
      if (!await closeExistingEntry(isActive)) return
      await Taro.navigateTo({
        url: `/pages/message/whisper-detail?whisperNo=${encodeURIComponent(result.existingWhisperNo)}`,
      })
      return
    }
    if (result.reasonCode !== 'MATCHED_PRIVATE_CHAT') return
    try {
      const peerUserId = result.targetUserNo.replace(/^USR-/, '')
      const conversation = result.existingConversationNo
        ? { conversationNo: result.existingConversationNo }
        : await resolveConversationByPeerUserId(peerUserId)
      if (!isActive() || sessionVersion !== getMessageAuthSessionVersion()) return
      if (!await closeExistingEntry(isActive)) return
      await openPrivateChat(conversation.conversationNo, sessionVersion)
    } catch (error) {
      if (!isActive() || sessionVersion !== getMessageAuthSessionVersion()) return
      await close()
      await Taro.showToast({
        title: resolveWhisperErrorMessage(error, '私信会话暂不可用，请刷新后重试'),
        icon: 'none',
      })
    }
  }

  useDidHide(() => {
    pageActive.current = false
    sourceGeneration.current += 1
    setLifecycleVersion(value => value + 1)
  })

  useDidShow(() => {
    pageActive.current = true
    sourceGeneration.current += 1
    setLifecycleVersion(value => value + 1)
    refreshAfterRecharge.current = false
  })

  useEffect(() => {
    setReadyTargetKey('')
    if (!target || !visible) {
      preparedTargetKey.current = ''
      return
    }
    if (!pageActive.current) return
    let active = true
    const sessionVersion = getMessageAuthSessionVersion()
    const expectedGeneration = sourceGeneration.current
    const isActive = () => active && pageActive.current
      && expectedGeneration === sourceGeneration.current
      && sessionVersion === getMessageAuthSessionVersion()
    if (preparedTargetKey.current !== targetKey) {
      preparedTargetKey.current = targetKey
      setContent('')
      idempotencyCache.clear()
    }
    setLoading(true)
    setPrecheck(undefined)
    void precheckWhisper({
      targetUserNo: target.targetUserNo,
      sourceScene: target.sourceScene,
      sourceBizNo: target.sourceBizNo,
    }).then(result => {
      if (!isActive()) return
      if (result.existingWhisperNo || result.reasonCode === 'MATCHED_PRIVATE_CHAT') {
        void openExistingEntry(result, sessionVersion, isActive)
        return
      }
      setPrecheck(result)
      setReadyTargetKey(targetKey)
    }).catch(error => {
      if (!isActive()) return
      onClose()
      void Taro.showToast({
        title: resolveWhisperErrorMessage(error, '悄悄话预检查失败，请稍后重试'),
        icon: 'none',
      })
    }).finally(() => {
      if (isActive()) setLoading(false)
    })
    return () => { active = false }
  }, [target?.targetUserNo, target?.sourceScene, target?.sourceBizNo, visible, lifecycleVersion])

  const close = async () => {
    if (submitting) return
    await Taro.hideKeyboard().catch(() => undefined)
    onClose()
  }

  const recharge = () => {
    if (refreshAfterRecharge.current) return
    refreshAfterRecharge.current = true
    setLoading(true)
    void Taro.navigateTo({ url: '/pages/coins/index?sourceScene=whisper' }).catch(error => {
      refreshAfterRecharge.current = false
      setLoading(false)
      void Taro.showToast({ title: resolveWhisperErrorMessage(error, '无法打开充值页，请稍后重试'), icon: 'none' })
    })
  }

  const submit = async () => {
    if (!target) return
    const normalizedContent = content.trim()
    if (submitting || !precheck) return
    if (!precheck.canSend || !precheck.quoteToken) {
      await Taro.showToast({ title: precheck.reasonText || '当前暂时无法发送悄悄话', icon: 'none' })
      return
    }
    if (!normalizedContent || Array.from(normalizedContent).length > precheck.contentMaxLength) {
      await Taro.showToast({ title: `请输入1-${precheck.contentMaxLength}个字`, icon: 'none' })
      return
    }
    const scope = `${target.sourceScene}:${target.sourceBizNo || ''}:${target.targetUserNo}`
    setSubmitting(true)
    try {
      const result = await createWhisper({
        targetUserNo: target.targetUserNo,
        sourceScene: target.sourceScene,
        sourceBizNo: target.sourceBizNo,
        content: normalizedContent,
        quoteToken: precheck.quoteToken,
      }, idempotencyCache.get(scope, normalizedContent))
      idempotencyCache.clear()
      setContent('')
      void Taro.hideKeyboard().catch(() => undefined)
      onClose()
      await Taro.showToast({
        title: result.payType === 'vip_free'
          ? '悄悄话已发送，本次使用免费权益'
          : `悄悄话已发送，消耗${result.coinAmount}千寻币`,
        icon: 'success',
      })
    } catch (error) {
      await Taro.showToast({
        title: resolveWhisperErrorMessage(error, '发送失败，请稍后重试'),
        icon: 'none',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // 遮罩节点常驻：始终渲染同一根组件，仅切换 visible，避免面板开关时
  // 遮罩节点增删触发列表滚动位置重置（表现为信息流弹回顶部）。
  // 先确认关系再展示新建面板，已匹配或待回复用户直接进入已有会话。
  return <CommunityWhisperSheet
    id="global-whisper-compose-sheet"
    visible={visible && target != null && pageActive.current && !loading && precheck != null && readyTargetKey === targetKey}
    avatar={target?.avatar}
    nickname={target?.nickname || ''}
    meta={target?.meta || ''}
    content={content}
    precheck={precheck}
    loading={loading}
    submitting={submitting}
    onContentChange={setContent}
    onClose={() => void close()}
    onSubmit={() => void submit()}
    onRecharge={recharge}
  />
}
