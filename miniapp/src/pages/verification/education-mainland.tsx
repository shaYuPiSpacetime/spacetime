import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { usePrd01Store } from '@/stores/prd01Store'
import VerificationRuntimeBoundary from './components/VerificationRuntimeBoundary'
import VerificationSubShell from './components/VerificationSubShell'
import { EducationHero, EducationTabs, VerificationStatusTabs } from './components/EducationVerificationShared'

const METHOD_ROUTES: Record<string, string> = {
  CHSI: '/pages/verification/education-chsi-help',
  DIPLOMA_NO: '/pages/verification/education-diploma-no',
  MATERIAL_UPLOAD: '/pages/verification/education-certificate-upload',
}

const METHOD_DESCRIPTION_KEYS: Record<string, string> = {
  CHSI: 'education_method_chsi_desc',
  DIPLOMA_NO: 'education_method_diploma_no_desc',
  MATERIAL_UPLOAD: 'education_method_material_upload_desc',
}

export default function VerificationEducationMainlandPage() {
  const options = usePrd01Store(state => state.profileOptions?.educationMethod || [])
  const copy = usePrd01Store(state => state.copy)
  const methods = options.filter(option => METHOD_ROUTES[option.code])

  return (
    <VerificationRuntimeBoundary>
      <VerificationSubShell title={copy('verification_nav_title')} contentHeight="1450rpx" scroll>
        <EducationHero copy={copy} />
        <VerificationStatusTabs active="education" copy={copy} />
        <EducationTabs active="mainland" copy={copy} />

        <View style={{ position: 'absolute', left: '25rpx', top: '500rpx', width: '700rpx', borderRadius: '0 0 18rpx 18rpx', background: '#FFFFFF', padding: '32rpx 30rpx 8rpx', boxSizing: 'border-box' }}>
          <Text style={{ display: 'block', color: '#0C285A', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx', marginBottom: '10rpx' }}>{copy('education_method_section_title')}</Text>
          {methods.map((option, index) => (
            <View
              key={option.code}
              style={{ position: 'relative', width: '640rpx', minHeight: '164rpx', padding: '32rpx 58rpx 30rpx 0', boxSizing: 'border-box', borderBottom: index < methods.length - 1 ? '2rpx solid #F1F2F5' : '0' }}
              onClick={async () => {
                const route = METHOD_ROUTES[option.code]
                if (route) await Taro.redirectTo({ url: route })
                else await Taro.showToast({ title: copy('education_method_unavailable'), icon: 'none' })
              }}
            >
              <View style={{ display: 'flex', alignItems: 'center' }}>
                <Text style={{ color: '#0C285A', fontSize: '27rpx', fontWeight: 600, lineHeight: '38rpx' }}>{option.label}</Text>
                <Text style={{ marginLeft: '12rpx', color: option.code === 'CHSI' ? '#FFFFFF' : '#999999', background: option.code === 'CHSI' ? '#2876FF' : 'transparent', borderRadius: '8rpx', padding: option.code === 'CHSI' ? '2rpx 8rpx' : '0', fontSize: '20rpx', lineHeight: '30rpx' }}>
                  {copy(option.code === 'CHSI' ? 'education_method_recommended_badge' : 'education_method_slow_badge')}
                </Text>
              </View>
              <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '12rpx' }}>{copy(METHOD_DESCRIPTION_KEYS[option.code])}</Text>
              <View style={{ position: 'absolute', right: '8rpx', top: '69rpx', width: '18rpx', height: '18rpx', borderTop: '3rpx solid #999999', borderRight: '3rpx solid #999999', transform: 'rotate(45deg)' }} />
            </View>
          ))}
        </View>
      </VerificationSubShell>
    </VerificationRuntimeBoundary>
  )
}
