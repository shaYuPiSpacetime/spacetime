import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { AvatarDetail } from '@/types/prd01'
import VerificationRuntimeBoundary from './components/VerificationRuntimeBoundary'
import VerificationShell from './components/VerificationShell'

export default function VerificationAvatarReviewPage() {
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [detail, setDetail] = useState<AvatarDetail>()

  return (
    <VerificationRuntimeBoundary loadData={async () => setDetail(await prd01Api.getAvatar())}>
      <VerificationShell
        stage="avatar"
        primaryText={copy('verification_next_action')}
        onPrimary={() => Taro.redirectTo({ url: '/pages/verification/intro' })}
        onBack={() => Taro.redirectTo({ url: '/pages/verification/avatar' })}
      >
        {detail?.latestAvatarUrl ? (
          <View style={{ position: 'absolute', left: '111rpx', top: '668rpx', width: '528rpx', height: '528rpx', borderRadius: '18rpx', overflow: 'hidden' }}>
            <Image src={detail.latestAvatarUrl} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
            <View style={{ position: 'absolute', left: '0', right: '0', bottom: '0', height: '76rpx', background: 'rgba(12,40,90,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 600 }}>{optionLabel('auditStatus', detail.auditStatus)}</Text>
            </View>
          </View>
        ) : null}
        {detail?.rejectReason ? (
          <Text style={{ position: 'absolute', left: '70rpx', top: '1228rpx', width: '610rpx', color: '#E36A6A', fontSize: '24rpx', lineHeight: '36rpx', textAlign: 'center' }}>
            {detail.rejectReason}
          </Text>
        ) : null}
      </VerificationShell>
    </VerificationRuntimeBoundary>
  )
}
