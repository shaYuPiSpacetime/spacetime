import { Button, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { OpenTextDetail } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'
import { loginByWechatPhone } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'
import { normalizeAvatarUrl } from '@/utils/avatar'
import defaultAvatar from '@/assets/profile/default-avatar.webp'
import VerificationRuntimeBoundary from './components/VerificationRuntimeBoundary'
import VerificationShell from './components/VerificationShell'

const VOICE_VARIANTS = new Set(['voice', 'recording', 'exit', 'play', 'complete', 'delete', 'delete-success'])
const MIN_INTRODUCTION_LENGTH = 20

export default function VerificationIntroPage() {
  const router = useRouter()
  const copy = usePrd01Store(state => state.copy)
  const [detail, setDetail] = useState<OpenTextDetail>()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const setLogin = useAuthStore(state => state.setLogin)
  const variant = String(router.params.variant || router.params.voice || '')
  const voiceVariant = VOICE_VARIANTS.has(variant)

  useEffect(() => {
    if (!voiceVariant) return
    void Taro.redirectTo({ url: `/pages/profile/edit?voice=${encodeURIComponent(variant)}` })
  }, [voiceVariant, variant])

  if (voiceVariant) return null

  const loadIntroduction = async () => {
    const result = await prd01Api.getIntroduction()
    setDetail(result)
    setValue(result.latestContent || '')
  }

  const save = async (event: { detail?: { code?: string; errMsg?: string } }) => {
    const content = value.trim()
    if (saving || content.length < MIN_INTRODUCTION_LENGTH || detail?.canSubmit === false) return
    const phoneCode = event.detail?.code
    if (!phoneCode) {
      await Taro.showToast({ title: '需要完成微信授权后继续', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const { code: loginCode } = await Taro.login()
      if (!loginCode) throw new Error('微信登录凭证获取失败，请重试')
      const loginData = await loginByWechatPhone({ loginCode, phoneCode, agreeProtocol: true })
      setLogin(
        loginData.token,
        loginData.userId,
        loginData.nickname || '',
        normalizeAvatarUrl(loginData.avatar, defaultAvatar),
        {
          openid: loginData.openid,
          phone: loginData.phone,
          maskedPhone: loginData.maskedPhone,
          accessStatus: loginData.accessStatus,
        },
      )
      await prd01Api.submitIntroduction(content)
      await Taro.redirectTo({ url: '/pages/verification/triple' })
    } catch (error) {
      await showError(error)
    } finally {
      setSaving(false)
    }
  }

  const active = value.trim().length >= MIN_INTRODUCTION_LENGTH && detail?.canSubmit !== false && !saving

  return (
    <VerificationRuntimeBoundary loadData={loadIntroduction}>
      <VerificationShell
        stage="intro"
        onBack={() => navigateBackOrRedirect('/pages/index/index')}
      >
        <View style={{ position: 'absolute', left: '25rpx', top: '558rpx', width: '700rpx', height: '976rpx', borderRadius: '18rpx', background: '#FFFFFF', padding: '52rpx 30rpx', boxSizing: 'border-box' }}>
          <Text style={{ display: 'block', color: '#0C285A', fontSize: '30rpx', fontWeight: 800, lineHeight: '42rpx' }}>{copy('intro_section_title')}</Text>
          <View style={{ position: 'relative', width: '640rpx', height: '408rpx', borderRadius: '12rpx', border: '4rpx solid #2876FF', marginTop: '44rpx', padding: '28rpx', boxSizing: 'border-box' }}>
            <Textarea
              value={value}
              maxlength={300}
              placeholder={copy('intro_placeholder')}
              placeholderStyle="color:#999999;font-size:28rpx;line-height:48rpx"
              onInput={event => setValue(event.detail.value)}
              style={{ width: '584rpx', height: '320rpx', color: '#333333', fontSize: '28rpx', lineHeight: '48rpx' }}
            />
            <Text style={{ position: 'absolute', right: '28rpx', bottom: '22rpx', color: '#999999', fontSize: '22rpx', lineHeight: '32rpx' }}>{copy('intro_minimum_hint')}</Text>
          </View>
          {detail?.rejectReason ? <Text style={{ display: 'block', color: '#E36A6A', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '12rpx' }}>{detail.rejectReason}</Text> : null}
        </View>
        <Button
          id="verification-intro-wechat-authorize"
          openType="getPhoneNumber"
          disabled={!active}
          onGetPhoneNumber={save}
          style={{
            position: 'fixed', left: '25rpx', right: '25rpx',
            bottom: 'calc(24rpx + env(safe-area-inset-bottom))', height: '98rpx',
            borderRadius: '24rpx', border: 0, padding: 0,
            background: active ? '#2876FF' : '#C9DDF7', color: '#FFFFFF',
            fontSize: '32rpx', fontWeight: 700, lineHeight: '98rpx', zIndex: 20,
          }}
        >
          {saving ? copy('common_submitting_action') : copy('verification_next_action')}
        </Button>
      </VerificationShell>
    </VerificationRuntimeBoundary>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
