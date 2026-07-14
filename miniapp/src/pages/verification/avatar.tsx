import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { chooseAndCropAvatar } from '@/utils/avatar'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { AvatarDetail } from '@/types/prd01'
import VerificationSubShell from './components/VerificationSubShell'
import goodAvatar from '@/assets/lanhu/verification/avatar-good.webp'

export default function VerificationAvatarPage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [detail, setDetail] = useState<AvatarDetail>()
  const [choosing, setChoosing] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        setDetail(await prd01Api.getAvatar())
      } catch (error) {
        await showError(error)
      }
    })()
  }, [])

  const handleChoose = async (source: string) => {
    const option = profileOptions?.avatarSource?.find(item => item.code === source)
    if (!option || choosing || detail?.canSubmit === false) return
    setChoosing(true)
    try {
      const avatarPath = await chooseAndCropAvatar(option.code)
      if (!avatarPath) return
      await Taro.redirectTo({ url: `/pages/verification/avatar-crop?source=${encodeURIComponent(option.code)}&path=${encodeURIComponent(avatarPath)}` })
    } catch (error) {
      await showError(error)
    } finally {
      setChoosing(false)
    }
  }

  return (
    <VerificationSubShell title={copy('verification_nav_title')}>
      <View style={{ position: 'absolute', left: '25rpx', top: '226rpx', width: '700rpx' }}>
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '48rpx', fontWeight: 700 }}>{copy('avatar_title')}</Text>
        <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '38rpx', marginTop: '12rpx' }}>{copy('avatar_notice')}</Text>
      </View>
      <Image src={detail?.latestAvatarUrl || goodAvatar} mode="aspectFill" style={{ position: 'absolute', left: '175rpx', top: '430rpx', width: '400rpx', height: '400rpx', borderRadius: '28rpx' }} />
      {detail?.auditStatus ? <Text style={{ position: 'absolute', left: '25rpx', top: '860rpx', width: '700rpx', color: '#2876FF', fontSize: '28rpx', textAlign: 'center' }}>{optionLabel('auditStatus', detail.auditStatus)}</Text> : null}
      {detail?.rejectReason ? <Text style={{ position: 'absolute', left: '50rpx', top: '920rpx', width: '650rpx', color: '#E36A6A', fontSize: '24rpx', lineHeight: '36rpx', textAlign: 'center' }}>{detail.rejectReason}</Text> : null}
      {detail?.canSubmit !== false ? (
        <View style={{ position: 'absolute', left: '25rpx', top: '1030rpx', width: '700rpx' }}>
          {(profileOptions?.avatarSource || []).map(option => (
            <View key={option.code} style={{ height: '92rpx', borderRadius: '24rpx', background: '#2876FF', marginBottom: '20rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void handleChoose(option.code)}>
              <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 700 }}>{choosing ? copy('avatar_choosing_action') : option.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </VerificationSubShell>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
