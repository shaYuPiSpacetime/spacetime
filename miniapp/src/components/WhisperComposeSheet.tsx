import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import CommunityWhisperSheet from '@/components/CommunityWhisperSheet'
import { createWhisperIdempotencyCache, resolveWhisperErrorMessage } from '@/domain/whisperRuntime'
import {
  createWhisper,
  precheckWhisper,
  type WhisperPrecheckCommand,
} from '@/services/message'
import type { WhisperPrecheckResponse } from '@/types/message'

export interface WhisperComposeTarget extends WhisperPrecheckCommand {
  nickname: string
  avatar?: string
  meta?: string
}

interface WhisperComposeSheetProps {
  target: WhisperComposeTarget
  onClose: () => void
}

/** 所有发起悄悄话入口复用同一个页内弹窗与预检查、发送流程。 */
export default function WhisperComposeSheet({ target, onClose }: WhisperComposeSheetProps) {
  const [content, setContent] = useState('')
  const [precheck, setPrecheck] = useState<WhisperPrecheckResponse>()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const idempotencyCache = useRef(createWhisperIdempotencyCache()).current

  useEffect(() => {
    let active = true
    setLoading(true)
    setPrecheck(undefined)
    void precheckWhisper({
      targetUserNo: target.targetUserNo,
      sourceScene: target.sourceScene,
      sourceBizNo: target.sourceBizNo,
    }).then(result => {
      if (active) setPrecheck(result)
    }).catch(error => {
      if (!active) return
      onClose()
      void Taro.showToast({
        title: resolveWhisperErrorMessage(error, '悄悄话预检查失败，请稍后重试'),
        icon: 'none',
      })
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [target.targetUserNo, target.sourceScene, target.sourceBizNo])

  const close = () => {
    if (submitting) return
    void Taro.hideKeyboard().catch(() => undefined)
    onClose()
  }

  const submit = async () => {
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

  return <CommunityWhisperSheet
    id="global-whisper-compose-sheet"
    avatar={target.avatar}
    nickname={target.nickname}
    meta={target.meta || ''}
    content={content}
    precheck={precheck}
    loading={loading}
    submitting={submitting}
    onContentChange={setContent}
    onClose={close}
    onSubmit={() => void submit()}
  />
}
