import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import VerificationShell from './components/VerificationShell'
import avatarIcon from '@/assets/lanhu/verification/slices/cert-avatar.png'
import realNameIcon from '@/assets/lanhu/verification/slices/cert-realname.png'
import educationIcon from '@/assets/lanhu/verification/slices/cert-education.png'

const CERT_ITEMS = [
  {
    title: '头像认证',
    desc: '守护每一段真实的社交关系',
    icon: avatarIcon,
    buttonText: '审核中',
    disabled: true,
    action: () => Taro.redirectTo({ url: '/pages/verification/avatar-review' }),
  },
  {
    title: '实名认证',
    desc: '提供真实可信的交友环境',
    icon: realNameIcon,
    buttonText: '去认证',
    action: () => Taro.redirectTo({ url: '/pages/verification/real-name' }),
  },
  {
    title: '学历认证',
    desc: '优秀的学历人群都在这里',
    icon: educationIcon,
    buttonText: '去认证',
    action: () => Taro.redirectTo({ url: '/pages/verification/education-student' }),
  },
]

export default function VerificationTriplePage() {
  return (
    <VerificationShell
      stage="triple"
      onBack={() => Taro.redirectTo({ url: '/pages/verification/intro-edit' })}
    >
      <View style={{ position: 'absolute', left: '25rpx', top: '558rpx', width: '700rpx' }}>
        {CERT_ITEMS.map((item) => (
          <CertEntry
            key={item.title}
            title={item.title}
            desc={item.desc}
            icon={item.icon}
            buttonText={item.buttonText}
            disabled={Boolean(item.disabled)}
            onClick={item.action}
          />
        ))}
        <Text
          style={{
            display: 'block',
            width: '700rpx',
            color: '#999999',
            fontSize: '24rpx',
            lineHeight: '40rpx',
            marginTop: '31rpx',
          }}
        >
          确保信息真实才可在平台交友，与官方数据联网比对，承诺保障信息安全
        </Text>
      </View>
    </VerificationShell>
  )
}

function CertEntry({
  title,
  desc,
  icon,
  buttonText,
  disabled,
  onClick,
}: {
  title: string
  desc: string
  icon: string
  buttonText: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '168rpx',
        borderRadius: '8rpx',
        background: '#FFFFFF',
        marginBottom: '20rpx',
        padding: '42rpx 210rpx 41rpx 174rpx',
        boxSizing: 'border-box',
      }}
      onClick={onClick}
    >
      <View
        style={{
          position: 'absolute',
          right: '29rpx',
          top: '50rpx',
          width: '148rpx',
          height: '68rpx',
          borderRadius: '8rpx',
          background: disabled ? '#C8DAF2' : '#2876FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx' }}>{buttonText}</Text>
      </View>
      <Image
        src={icon}
        mode="widthFix"
        style={{
          position: 'absolute',
          left: '54rpx',
          top: '34rpx',
          width: '100rpx',
        }}
      />
      <Text style={{ display: 'block', color: '#0C285A', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
        {title}
      </Text>
      <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '33rpx', marginTop: '12rpx' }}>
        {desc}
      </Text>
    </View>
  )
}
