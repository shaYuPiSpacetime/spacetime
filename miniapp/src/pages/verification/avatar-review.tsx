import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { AvatarDetail } from '@/types/prd01'
import VerificationSubShell from './components/VerificationSubShell'

export default function VerificationAvatarReviewPage() {
  const copy = usePrd01Store(state => state.copy)
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [detail, setDetail] = useState<AvatarDetail>()

  useEffect(() => { void (async () => { try { await bootstrap(); setDetail(await prd01Api.getAvatar()) } catch (error) { await showError(error) } })() }, [])

  return (
    <VerificationSubShell title={copy('verification_nav_title')}>
      {detail?.latestAvatarUrl ? <Image src={detail.latestAvatarUrl} mode="aspectFill" style={{ position: 'absolute', left: '112rpx', top: '360rpx', width: '526rpx', height: '526rpx', borderRadius: '16rpx' }} /> : null}
      <Text style={{ position: 'absolute', left: '25rpx', top: '920rpx', width: '700rpx', color: '#2876FF', fontSize: '30rpx', textAlign: 'center' }}>{optionLabel('auditStatus', detail?.auditStatus)}</Text>
      {detail?.rejectReason ? <Text style={{ position: 'absolute', left: '50rpx', top: '980rpx', width: '650rpx', color: '#E36A6A', fontSize: '24rpx', lineHeight: '36rpx', textAlign: 'center' }}>{detail.rejectReason}</Text> : null}
      <View style={{ position: 'absolute', left: '25rpx', top: '1120rpx', width: '700rpx', height: '98rpx', borderRadius: '24rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => Taro.redirectTo({ url: '/pages/verification/triple' })}>
        <Text style={{ color: '#FFFFFF', fontSize: '34rpx' }}>{copy('verification_back_center_action')}</Text>
      </View>
    </VerificationSubShell>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
