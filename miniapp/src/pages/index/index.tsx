import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import qianxunCenterImage from '@/assets/lanhu/pages/qianxun-center.png'
import { prd01Api } from '@/services/prd01'
import { useMessageStore } from '@/stores/messageStore'
import type { BasicProfile, VerificationStatus } from '@/types/prd01'

export default function IndexPage() {
  const unreadCount = useMessageStore(state => state.unread.totalCount)
  const [basic, setBasic] = useState<BasicProfile>()
  const [verification, setVerification] = useState<VerificationStatus>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
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
    const reason = verification?.accessStatus?.blockReasons?.[0] || '完善资料后体验更完整'
    if (reason) await Taro.showToast({ title: reason, icon: 'none' })
  }

  return <View style={{ minHeight: '100vh', background: 'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)', position: 'relative', overflow: 'hidden' }}>
    <TopTabs unreadCount={unreadCount} />
    <CertificationArtwork />
    <View style={{ position: 'absolute', left: '70rpx', right: '70rpx', top: '245rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Text style={headingStyle}>完善资料和认证</Text>
      <Text style={headingStyle}>解锁更多专属权益</Text>
      <Text style={{ color: '#999999', fontSize: '24rpx', lineHeight: '33rpx', marginTop: '26rpx', textAlign: 'center' }}>资料信息越完整，脱单邂逅更高效</Text>
    </View>
    <View style={{ position: 'absolute', left: '44rpx', top: '1085rpx', width: '664rpx', height: '98rpx', borderRadius: '40rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void continueFlow()} hoverClass="btn-hover">
      <Text style={{ color: '#FAFBFC', fontSize: '36rpx', fontWeight: 500, lineHeight: '50rpx' }}>立即完善</Text>
    </View>
    <View style={{ position: 'absolute', left: '0', top: '1208rpx', width: '750rpx', height: '50rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void enterAvailableArea()} hoverClass="btn-hover">
      <Text style={{ color: '#999999', fontSize: '30rpx', fontWeight: 500, lineHeight: '42rpx' }}>稍后再说</Text>
    </View>
  </View>
}

function CertificationArtwork() {
  return (
    <View style={{ position: 'absolute', left: '0', top: '453rpx', width: '750rpx', height: '390rpx' }}>
      <Image src={qianxunCenterImage} mode="aspectFit" style={{ position: 'absolute', left: '90rpx', top: '-44rpx', width: '570rpx', height: '640rpx' }} />
    </View>
  )
}

function TopTabs({ unreadCount }: { unreadCount: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '0',
        top: '68rpx',
        width: '750rpx',
        height: '88rpx',
      }}
    >
      <Text
        style={{
          position: 'absolute',
          left: '32rpx',
          top: '22rpx',
          color: '#0C285A',
          fontSize: '32rpx',
          fontWeight: 500,
          lineHeight: '45rpx',
        }}
      >
        成家
      </Text>
      <View
        style={{
          position: 'absolute',
          left: '32rpx',
          top: '73rpx',
          width: '64rpx',
          height: '8rpx',
          borderRadius: '6rpx',
          background: 'rgba(40,118,255,0.8)',
        }}
      />
      {unreadCount > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: '76rpx',
            top: '11rpx',
            minWidth: '28rpx',
            height: '28rpx',
            borderRadius: '14rpx',
            border: '2rpx solid #FFFFFF',
            background: '#EE2525',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4rpx',
            boxSizing: 'border-box',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '18rpx', fontWeight: 500, lineHeight: '25rpx' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      ) : null}
      <Text style={{ position: 'absolute', left: '123rpx', top: '31rpx', color: '#7F8494', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
        知音
      </Text>
      <Text style={{ position: 'absolute', left: '199rpx', top: '31rpx', color: '#7F8494', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
        立业
      </Text>
    </View>
  )
}

const headingStyle = { color: '#0C285A', fontSize: '48rpx', fontWeight: 600, lineHeight: '67rpx', textAlign: 'center' } as const
async function showError(error: unknown) { const title = error instanceof Error ? error.message : String(error); if (title) await Taro.showToast({ title, icon: 'none' }) }
