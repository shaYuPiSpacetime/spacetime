import { Image, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'

export default function VerificationAvatarCropPage() {
  const router = useRouter()
  const copy = usePrd01Store(state => state.copy)
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const path = decodeURIComponent(String(router.params.path || ''))
  const source = decodeURIComponent(String(router.params.source || ''))
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!path || submitting) return
    setSubmitting(true)
    try {
      await bootstrap()
      const sourceOption = profileOptions?.avatarSource?.find(option => option.code === source)
        || usePrd01Store.getState().profileOptions?.avatarSource?.find(option => option.code === source)
      if (!sourceOption) throw new Error(copy('avatar_source_invalid'))
      const uploaded = await prd01Api.uploadAvatar(path)
      await prd01Api.submitAvatar({ avatarSource: sourceOption.code, avatarUrl: uploaded.url })
      await Taro.redirectTo({ url: '/pages/verification/avatar-review' })
    } catch (error) {
      await showError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={{ minHeight: '100vh', background: '#4B4B4B', position: 'relative', overflow: 'hidden' }}>
      <Image src={path} mode="aspectFill" style={{ position: 'absolute', left: '94rpx', top: '360rpx', width: '562rpx', height: '812rpx', opacity: 0.78 }} />
      <View style={{ position: 'absolute', left: '108rpx', top: '464rpx', width: '534rpx', height: '534rpx', border: '6rpx dashed #FFFFFF', borderRadius: '12rpx', boxSizing: 'border-box' }} />
      <Text style={{ position: 'absolute', left: '50rpx', top: '1040rpx', width: '650rpx', color: '#FFFFFF', fontSize: '24rpx', lineHeight: '36rpx', textAlign: 'center' }}>{copy('avatar_crop_notice')}</Text>
      <Text style={{ position: 'absolute', left: '54rpx', bottom: '54rpx', color: '#FFFFFF', fontSize: '28rpx', fontWeight: 700 }} onClick={() => Taro.redirectTo({ url: '/pages/verification/avatar' })}>{copy('common_cancel_action')}</Text>
      <View style={{ position: 'absolute', right: '25rpx', bottom: '34rpx', minWidth: '148rpx', height: '68rpx', borderRadius: '8rpx', background: '#2876FF', padding: '0 20rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void handleConfirm()}>
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 700 }}>{copy(submitting ? 'common_submitting_action' : 'common_confirm_action')}</Text>
      </View>
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
