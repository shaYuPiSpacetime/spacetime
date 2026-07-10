import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import LanhuSubNav from '@/components/LanhuSubNav'
import { miniappOssIcons } from '@/constants/ossIcons'
import { getDemoPageData } from '@/services/lanhuDemo'
import { navigateBackOrRedirect } from '@/utils/navigation'

type VerificationDemo = {
  realNameActive: {
    realName: string
    idCard: string
  }
}

type CertStatusCardProps = {
  icon: string
  title: string
  desc: string
  detail?: Array<{ label: string; value: string }>
  actionText?: string
  onAction?: () => void
}

const verificationDemo = getDemoPageData('verification') as VerificationDemo
const mainBlue = '#2876FF'
const titleColor = '#0C285A'
const designVariant = 'my-certification'
const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 50%, rgba(248,250,239,0.72) 100%)'

export default function MyCertificationPage() {
  const handleBack = () => {
    navigateBackOrRedirect()
  }

  return (
    <View data-variant={designVariant} style={{ minHeight: '100vh', background: pageBackground }}>
      <LanhuSubNav title="我的认证" onBack={handleBack} />
      <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)', width: '750rpx' }} showScrollbar={false}>
        <View style={{ width: '750rpx', padding: '52rpx 25rpx 170rpx', boxSizing: 'border-box' }}>
          <Text style={{ display: 'block', color: titleColor, fontSize: '48rpx', lineHeight: '67rpx', fontWeight: 800 }}>
            为什么要认证
          </Text>
          <Text style={{ display: 'block', color: '#999999', fontSize: '28rpx', lineHeight: '40rpx', marginTop: '19rpx' }}>
            头像/学历/实名认证，让千万用户安心交友
          </Text>

          <View style={{ marginTop: '64rpx' }}>
            <CertStatusCard icon={miniappOssIcons.verificationCertAvatar} title="头像认证" desc="真人真照，大胆心动" />
            <CertStatusCard
              icon={miniappOssIcons.verificationCertRealName}
              title="实名认证"
              desc="真实身份，放心交友"
              detail={[
                { label: '姓名', value: maskName(verificationDemo.realNameActive.realName) },
                { label: '证件号', value: maskIdCard(verificationDemo.realNameActive.idCard) },
              ]}
            />
            <CertStatusCard
              icon={miniappOssIcons.verificationCertEducation}
              title="学历认证"
              desc="真实学历，同频社交"
              detail={[
                { label: '学校', value: '浙江工商大学' },
                { label: '学历', value: '硕士' },
              ]}
              actionText="更新认证"
              onAction={() => Taro.navigateTo({ url: '/pages/verification/education-student' })}
            />
          </View>

          <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', lineHeight: '48rpx', marginTop: '31rpx' }}>
            确保信息真实才可在平台交友，与官方数据联网比对，承诺保障信息安全
          </Text>
          <View
            onClick={() => Taro.showToast({ title: '联系客服', icon: 'none' })}
            style={{
              width: '700rpx',
              height: '64rpx',
              marginTop: '468rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: '34rpx',
                height: '34rpx',
                borderRadius: '17rpx',
                border: `3rpx solid ${mainBlue}`,
                boxSizing: 'border-box',
                marginRight: '14rpx',
              }}
            />
            <Text style={{ color: mainBlue, fontSize: '32rpx', lineHeight: '45rpx' }}>联系客服</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function CertStatusCard({ icon, title, desc, detail, actionText, onAction }: CertStatusCardProps) {
  return (
    <View
      style={{
        width: '700rpx',
        minHeight: detail ? '298rpx' : '168rpx',
        borderRadius: '8rpx',
        background: '#FFFFFF',
        marginBottom: '24rpx',
        padding: '48rpx 36rpx 32rpx 98rpx',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <Image src={icon} mode="aspectFit" style={{ position: 'absolute', left: '26rpx', top: '58rpx', width: '58rpx', height: '58rpx' }} />
      <Text style={{ display: 'block', color: titleColor, fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 800 }}>{title}</Text>
      <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', lineHeight: '37rpx', marginTop: '12rpx' }}>{desc}</Text>
      <Text style={{ position: 'absolute', right: '42rpx', top: '60rpx', color: '#666666', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 700 }}>
        已认证
      </Text>

      {detail ? (
        <View
          style={{
            minHeight: '120rpx',
            borderRadius: '8rpx',
            background: '#F7F8FB',
            marginTop: '36rpx',
            padding: '18rpx 26rpx',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {detail.map((item) => (
            <Text key={item.label} style={{ display: 'block', color: '#666666', fontSize: '28rpx', lineHeight: '45rpx' }}>
              {item.label}： {item.value}
            </Text>
          ))}
          {actionText ? (
            <View
              onClick={onAction}
              style={{
                position: 'absolute',
                right: '20rpx',
                top: '28rpx',
                width: '148rpx',
                height: '72rpx',
                borderRadius: '8rpx',
                background: mainBlue,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 700 }}>{actionText}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function maskName(value: string) {
  if (!value) return '赵*达'
  return `${value.slice(0, 1)}*${value.slice(-1)}`
}

function maskIdCard(value: string) {
  if (!value || value.length < 8) return '410185********0588'
  return `${value.slice(0, 6)}********${value.slice(-4)}`
}
