import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { AvatarDetail } from '@/types/prd01'
import VerificationRuntimeBoundary from './components/VerificationRuntimeBoundary'
import VerificationSubShell from './components/VerificationSubShell'

export default function VerificationAvatarReviewPage() {
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [detail, setDetail] = useState<AvatarDetail>()

  return (
    <VerificationRuntimeBoundary loadData={async () => setDetail(await prd01Api.getAvatar())}>
      <VerificationSubShell title={copy('verification_nav_title')} onBack={() => Taro.redirectTo({ url: '/pages/verification/avatar' })}>
      {detail?.latestAvatarUrl ? <Image src={detail.latestAvatarUrl} mode="aspectFill" style={{ position: 'absolute', left: '112rpx', top: '360rpx', width: '526rpx', height: '526rpx', borderRadius: '16rpx' }} /> : null}
      <Text style={{ position: 'absolute', left: '25rpx', top: '920rpx', width: '700rpx', color: '#2876FF', fontSize: '30rpx', textAlign: 'center' }}>{optionLabel('auditStatus', detail?.auditStatus)}</Text>
      {detail?.rejectReason ? <Text style={{ position: 'absolute', left: '50rpx', top: '980rpx', width: '650rpx', color: '#E36A6A', fontSize: '24rpx', lineHeight: '36rpx', textAlign: 'center' }}>{detail.rejectReason}</Text> : null}
      <View style={{ position: 'absolute', left: '25rpx', top: '1120rpx', width: '700rpx', height: '98rpx', borderRadius: '24rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => Taro.redirectTo({ url: '/pages/verification/intro' })}>
        <Text style={{ color: '#FFFFFF', fontSize: '34rpx' }}>{copy('verification_next_action')}</Text>
      </View>
      </VerificationSubShell>
    </VerificationRuntimeBoundary>
  )
}
