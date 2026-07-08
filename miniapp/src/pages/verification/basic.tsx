import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import LanhuSubNav from '@/components/LanhuSubNav'
import { useLogin } from '@/hooks/useLogin'
import { navigateBackOrRedirect } from '@/utils/navigation'
import VerificationShell from './components/VerificationShell'
import BasicInfoCard from './components/BasicInfoCard'

export default function VerificationBasicPage() {
  const router = useRouter()
  const { userInfo, submit } = useLogin()
  const fromProfile = router.params.from === 'profile'

  const handleBack = () => {
    if (fromProfile) {
      navigateBackOrRedirect()
      return
    }
    Taro.showModal({
      title: '暂不认证',
      content: '可以稍后再完善认证资料，是否先进入首页？',
      confirmText: '进入首页',
      cancelText: '继续认证',
      success: (res) => {
        if (res.confirm) submit()
      },
    })
  }

  const handleSave = () => {
    Taro.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => navigateBackOrRedirect(), 500)
  }

  if (fromProfile) {
    return (
      <View style={{ minHeight: '100vh', background: 'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 50%, rgba(248,250,239,0.72) 100%)' }}>
        <LanhuSubNav title="基本资料" onBack={handleBack} />
        <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)', width: '750rpx' }} showScrollbar={false}>
          <View style={{ position: 'relative', width: '750rpx', minHeight: '1848rpx', paddingBottom: '180rpx', boxSizing: 'border-box' }}>
            <View style={{ position: 'absolute', left: '25rpx', top: '62rpx', width: '700rpx' }}>
              <Text style={{ display: 'block', color: '#0C285A', fontSize: '48rpx', lineHeight: '67rpx', fontWeight: 800 }}>
                完善资料
              </Text>
              <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', lineHeight: '38rpx', marginTop: '18rpx' }}>
                时空邂逅是一个严肃、靠谱的交友平台，请认真填写资料
              </Text>
            </View>
            <BasicInfoCard userInfo={userInfo} mode="profileEdit" />
          </View>
        </ScrollView>
        <View
          onClick={handleSave}
          hoverClass="btn-hover"
          style={{
            position: 'fixed',
            left: '25rpx',
            bottom: '48rpx',
            width: '700rpx',
            height: '98rpx',
            borderRadius: '20rpx',
            background: '#2876FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12rpx 28rpx rgba(40,118,255,0.24)',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '36rpx', lineHeight: '50rpx', fontWeight: 500 }}>保存</Text>
        </View>
      </View>
    )
  }

  return (
    <VerificationShell
      stage="basic"
      primaryText="继续认证"
      onPrimary={() => Taro.redirectTo({ url: '/pages/verification/avatar' })}
      onBack={handleBack}
      scroll
    >
      <BasicInfoCard userInfo={userInfo} />
    </VerificationShell>
  )
}
