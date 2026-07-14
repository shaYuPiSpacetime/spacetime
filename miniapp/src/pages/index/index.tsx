import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import qianxunCenterImage from '@/assets/lanhu/pages/qianxun-center.png'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { BasicProfile, VerificationStatus } from '@/types/prd01'

export default function IndexPage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const copy = usePrd01Store(state => state.copy)
  const [basic, setBasic] = useState<BasicProfile>()
  const [verification, setVerification] = useState<VerificationStatus>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        const [basicResult, verificationResult] = await Promise.all([
          prd01Api.getBasicProfile(),
          prd01Api.getVerificationStatus(),
        ])
        setBasic(basicResult)
        setVerification(verificationResult)
      } catch (error) {
        await showError(error)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const continueFlow = async () => {
    if (loading) return
    const route = basic?.basicProfileCompleted === false
      ? '/pages/profile/edit'
      : '/pages/verification/my-certification'
    await Taro.navigateTo({ url: route })
  }

  const enterAvailableArea = async () => {
    if (verification?.accessStatus?.canBrowseCards) {
      await Taro.switchTab({ url: '/pages/recommend/index' })
      return
    }
    if (verification?.accessStatus?.canCommunity) {
      await Taro.switchTab({ url: '/pages/community/index' })
      return
    }
    const reason = verification?.accessStatus?.blockReasons?.[0] || copy('home_completion_later_notice')
    if (reason) await Taro.showToast({ title: reason, icon: 'none' })
  }

  return <View style={{ minHeight: '100vh', background: 'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)', position: 'relative', overflow: 'hidden' }}>
    <View style={{ position: 'absolute', left: '0', top: '453rpx', width: '750rpx', height: '390rpx' }}>
      <Image src={qianxunCenterImage} mode="aspectFit" style={{ position: 'absolute', left: '90rpx', top: '-44rpx', width: '570rpx', height: '640rpx' }} />
    </View>
    <View style={{ position: 'absolute', left: '70rpx', right: '70rpx', top: '245rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Text style={headingStyle}>{copy('home_completion_heading_line1')}</Text>
      <Text style={headingStyle}>{copy('home_completion_heading_line2')}</Text>
      <Text style={{ color: '#697E9C', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '24rpx', textAlign: 'center' }}>{copy('home_completion_notice')}</Text>
    </View>
    <View style={{ position: 'absolute', left: '44rpx', top: '1085rpx', width: '664rpx', height: '98rpx', borderRadius: '40rpx', background: loading ? '#B7CBE8' : '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void continueFlow()}>
      <Text style={{ color: '#FAFBFC', fontSize: '36rpx', fontWeight: 500 }}>{copy(loading ? 'access_checking_title' : basic?.basicProfileCompleted === false ? 'home_complete_profile_action' : 'home_complete_verification_action')}</Text>
    </View>
    <View style={{ position: 'absolute', left: '0', top: '1208rpx', width: '750rpx', height: '50rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void enterAvailableArea()}>
      <Text style={{ color: '#999999', fontSize: '30rpx', fontWeight: 500 }}>{copy('home_later_action')}</Text>
    </View>
  </View>
}

const headingStyle = { color: '#0C285A', fontSize: '48rpx', fontWeight: 600, lineHeight: '67rpx', textAlign: 'center' } as const
async function showError(error: unknown) { const title = error instanceof Error ? error.message : String(error); if (title) await Taro.showToast({ title, icon: 'none' }) }
