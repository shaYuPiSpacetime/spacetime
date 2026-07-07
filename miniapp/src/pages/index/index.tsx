import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import certAvatarIcon from '@/assets/lanhu/verification/slices/cert-avatar.webp'
import certRealNameIcon from '@/assets/lanhu/verification/slices/cert-realname.webp'
import certEducationIcon from '@/assets/lanhu/verification/slices/cert-education.webp'
import verifyNoteIcon from '@/assets/lanhu/recommend/slices/verify-note.webp'

const NAVY = '#0C285A'
const BLUE = '#2876FF'

export default function IndexPage() {
  const handleComplete = () => {
    Taro.navigateTo({ url: '/pages/verification/basic' })
  }

  return (
    <View
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <TopTabs />
      <CertificationArtwork />

      <View
        style={{
          position: 'absolute',
          left: '183rpx',
          top: '251rpx',
          width: '384rpx',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: NAVY,
            fontSize: '48rpx',
            fontWeight: 600,
            lineHeight: '67rpx',
            textAlign: 'center',
          }}
        >
          完善资料和认证
        </Text>
        <Text
          style={{
            color: NAVY,
            fontSize: '48rpx',
            fontWeight: 600,
            lineHeight: '67rpx',
            textAlign: 'center',
          }}
        >
          解锁更多专属权益
        </Text>
        <Text
          style={{
            color: '#999999',
            fontSize: '24rpx',
            lineHeight: '33rpx',
            marginTop: '26rpx',
          }}
        >
          资料信息越完整，脱单邂逅更高效
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          left: '44rpx',
          top: '1085rpx',
          width: '664rpx',
          height: '98rpx',
          borderRadius: '40rpx',
          background: BLUE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={handleComplete}
        hoverClass="btn-hover"
      >
        <Text style={{ color: '#FAFBFC', fontSize: '36rpx', fontWeight: 500, lineHeight: '50rpx' }}>
          立即完善
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          left: '0',
          top: '1208rpx',
          width: '750rpx',
          height: '50rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => Taro.showToast({ title: '完善资料后体验更完整', icon: 'none' })}
        hoverClass="btn-hover"
      >
        <Text style={{ color: '#999999', fontSize: '30rpx', fontWeight: 500, lineHeight: '42rpx' }}>
          稍后再说
        </Text>
      </View>
    </View>
  )
}

function TopTabs() {
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
          color: NAVY,
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
        <Text style={{ color: '#FFFFFF', fontSize: '18rpx', fontWeight: 500, lineHeight: '25rpx' }}>55</Text>
      </View>
      <Text style={{ position: 'absolute', left: '123rpx', top: '31rpx', color: '#7F8494', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
        知音
      </Text>
      <Text style={{ position: 'absolute', left: '199rpx', top: '31rpx', color: '#7F8494', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
        立业
      </Text>
    </View>
  )
}

function CertificationArtwork() {
  return (
    <View
      style={{
        position: 'absolute',
        left: '0',
        top: '453rpx',
        width: '750rpx',
        height: '390rpx',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '171rpx',
          top: '369rpx',
          width: '391rpx',
          height: '175rpx',
          borderRadius: '50%',
          background: 'rgba(40,118,255,0.4)',
          transform: 'translateY(-175rpx)',
        }}
      />
      <ProfileCompletionArtwork />
      <View
        style={{
          position: 'absolute',
          left: '158rpx',
          top: '0',
          width: '152rpx',
          height: '152rpx',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.8)',
          boxShadow: '0 8rpx 18rpx rgba(40,118,255,0.15)',
        }}
      />
    </View>
  )
}

function ProfileCompletionArtwork() {
  const cards = [
    { icon: certAvatarIcon, label: '头像', left: '142rpx', top: '24rpx' },
    { icon: certRealNameIcon, label: '实名', left: '305rpx', top: '86rpx' },
    { icon: certEducationIcon, label: '学历', left: '468rpx', top: '24rpx' },
  ]

  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: '246rpx',
          top: '70rpx',
          width: '258rpx',
          height: '274rpx',
          borderRadius: '36rpx',
          background: '#FFFFFF',
          boxShadow: '0 18rpx 40rpx rgba(40,118,255,0.20)',
          border: '2rpx solid rgba(255,255,255,0.9)',
        }}
      >
        <View style={{ position: 'absolute', left: '78rpx', top: '34rpx', width: '102rpx', height: '102rpx', borderRadius: '51rpx', background: '#E3F1FE' }}>
          <Image src={verifyNoteIcon} mode="aspectFit" style={{ width: '102rpx', height: '102rpx' }} />
        </View>
        <View style={{ position: 'absolute', left: '48rpx', top: '166rpx', width: '162rpx', height: '20rpx', borderRadius: '10rpx', background: '#DDEBFF' }} />
        <View style={{ position: 'absolute', left: '66rpx', top: '204rpx', width: '126rpx', height: '18rpx', borderRadius: '9rpx', background: '#EEF5FF' }} />
      </View>
      {cards.map((card) => (
        <View
          key={card.label}
          style={{
            position: 'absolute',
            left: card.left,
            top: card.top,
            width: '138rpx',
            height: '138rpx',
            borderRadius: '28rpx',
            background: '#FFFFFF',
            boxShadow: '0 10rpx 26rpx rgba(11,38,90,0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image src={card.icon} mode="aspectFit" style={{ width: '72rpx', height: '72rpx' }} />
          <Text style={{ color: NAVY, fontSize: '22rpx', fontWeight: 600, lineHeight: '31rpx', marginTop: '8rpx' }}>{card.label}</Text>
        </View>
      ))}
    </>
  )
}
