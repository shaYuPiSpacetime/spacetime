import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import VerificationShell from './components/VerificationShell'
import { miniappOssIcons } from '@/constants/ossIcons'
import { getDemoPageData } from '@/services/lanhuDemo'

const CERT_ICON_MAP: Record<string, string> = {
  头像认证: miniappOssIcons.verificationCertAvatar,
  实名认证: miniappOssIcons.verificationCertRealName,
  学历认证: miniappOssIcons.verificationCertEducation,
}

const verificationDemo = getDemoPageData('verification')
const CERT_ITEMS = verificationDemo.certItems
const COMPLETED_CERT_TITLES = verificationDemo.completedCertTitles

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
            icon={CERT_ICON_MAP[item.title] ?? miniappOssIcons.verificationCertAvatar}
            buttonText={COMPLETED_CERT_TITLES.includes(item.title) ? '已完成' : item.buttonText}
            disabled={Boolean(item.disabled) && !COMPLETED_CERT_TITLES.includes(item.title)}
            completed={COMPLETED_CERT_TITLES.includes(item.title)}
            onClick={() => Taro.redirectTo({ url: item.route })}
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
  completed,
  onClick,
}: {
  title: string
  desc: string
  icon: string
  buttonText: string
  disabled: boolean
  completed: boolean
  onClick: () => void
}) {
  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '168rpx',
        borderRadius: '24rpx',
        background: completed ? '#F5F9FF' : '#FFFFFF',
        marginBottom: '20rpx',
        padding: '42rpx 210rpx 41rpx 174rpx',
        boxSizing: 'border-box',
        border: completed ? '2rpx solid #B9D7FF' : '2rpx solid #FFFFFF',
        boxShadow: '0 12rpx 30rpx rgba(11, 38, 90, 0.06)',
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
          borderRadius: '20rpx',
          background: completed ? '#EAF3FF' : disabled ? '#C8DAF2' : '#2876FF',
          border: completed ? '2rpx solid #2876FF' : '0',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: completed ? '#2876FF' : '#FFFFFF', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx' }}>{buttonText}</Text>
      </View>
      <Image
        src={icon}
        mode="widthFix"
        style={{
          position: 'absolute',
          left: '54rpx',
          top: '34rpx',
          width: '100rpx',
          opacity: disabled ? 0.58 : 1,
        }}
      />
      {completed && (
        <View
          style={{
            position: 'absolute',
            left: '126rpx',
            top: '34rpx',
            width: '34rpx',
            height: '34rpx',
            borderRadius: '17rpx',
            background: '#2876FF',
            border: '4rpx solid #FFFFFF',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '22rpx', lineHeight: '28rpx' }}>✓</Text>
        </View>
      )}
      <Text style={{ display: 'block', color: completed ? '#2876FF' : '#0C285A', fontSize: '28rpx', fontWeight: 800, lineHeight: '40rpx' }}>
        {title}
      </Text>
      <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '33rpx', marginTop: '12rpx' }}>
        {desc}
      </Text>
    </View>
  )
}
