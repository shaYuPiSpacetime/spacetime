import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { usePrd01Store } from '@/stores/prd01Store'
import VerificationRuntimeBoundary from './components/VerificationRuntimeBoundary'
import VerificationSubShell from './components/VerificationSubShell'

const METHOD_ROUTES: Record<string, string> = {
  CHSI: '/pages/verification/education-chsi-help',
  DIPLOMA_NO: '/pages/verification/education-diploma-no',
  MATERIAL_UPLOAD: '/pages/verification/education-certificate-upload',
}

export default function VerificationEducationMainlandPage() {
  const options = usePrd01Store(state => state.profileOptions?.educationMethod || [])
  const copy = usePrd01Store(state => state.copy)

  return (
    <VerificationRuntimeBoundary>
      <VerificationSubShell title={copy('verification_nav_title')}>
      <View style={{ position: 'absolute', left: '25rpx', top: '226rpx', width: '700rpx' }}>
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '48rpx', fontWeight: 700 }}>{copy('education_method_select_title')}</Text>
        <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '14rpx' }}>{copy('education_notice')}</Text>
      </View>
      <View style={{ position: 'absolute', left: '25rpx', top: '390rpx', width: '700rpx', borderRadius: '24rpx', background: '#FFFFFF', padding: '30rpx', boxSizing: 'border-box' }}>
        {options.filter(option => option.code !== 'STUDENT_CARD').map(option => (
          <View key={option.code} style={{ position: 'relative', width: '640rpx', minHeight: '132rpx', borderRadius: '16rpx', background: '#F7F9FC', marginBottom: '20rpx', padding: '30rpx 80rpx 30rpx 30rpx', boxSizing: 'border-box' }} onClick={async () => {
            const route = METHOD_ROUTES[option.code]
            if (route) await Taro.redirectTo({ url: route })
            else await Taro.showToast({ title: copy('education_method_unavailable'), icon: 'none' })
          }}>
            <Text style={{ display: 'block', color: '#0C285A', fontSize: '28rpx', fontWeight: 700 }}>{option.label}</Text>
            <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '10rpx' }}>{copy(`education_method_${option.code.toLowerCase()}_desc`)}</Text>
          </View>
        ))}
      </View>
      </VerificationSubShell>
    </VerificationRuntimeBoundary>
  )
}
