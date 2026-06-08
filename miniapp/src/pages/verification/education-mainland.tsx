import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import VerificationSubShell from './components/VerificationSubShell'
import { EducationHero, EducationTabs, VerificationStatusTabs } from './components/EducationVerificationShared'

const METHODS = [
  { title: '学信网在线验证码', desc: '学信网在线验证报告验证码', tag: '推荐', route: '/pages/verification/education-chsi-help', active: true },
  { title: '毕业证或者学位证书编号', desc: '填写证书编号和证书姓名', tag: '较慢', route: '/pages/verification/education-diploma-no' },
  { title: '上传毕业证或学位证书', desc: '上传清晰证书照片等待审核', tag: '较慢', route: '/pages/verification/education-certificate-upload' },
]

export default function VerificationEducationMainlandPage() {
  return (
    <VerificationSubShell title="认证">
      <VerificationStatusTabs active="education" />
      <EducationHero />
      <EducationTabs active="mainland" />
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '568rpx',
          width: '700rpx',
          height: '912rpx',
          borderRadius: '0 0 18rpx 18rpx',
          background: '#FFFFFF',
          padding: '30rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx' }}>
          选择认证方式
        </Text>
        {METHODS.map((item) => (
          <View
            key={item.title}
            style={{
              position: 'relative',
              width: '640rpx',
              height: '168rpx',
              borderRadius: '12rpx',
              background: '#FCFCFC',
              marginTop: '20rpx',
              padding: '34rpx 86rpx 34rpx 30rpx',
              boxSizing: 'border-box',
            }}
            onClick={() => Taro.redirectTo({ url: item.route })}
          >
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx' }}>
                {item.title}
              </Text>
              <View
                style={{
                  height: '28rpx',
                  borderRadius: '14rpx',
                  background: item.active ? '#2876FF' : '#F3F3F3',
                  padding: '0 10rpx',
                  marginLeft: '10rpx',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: item.active ? '#FFFFFF' : '#999999', fontSize: '20rpx', lineHeight: '28rpx' }}>{item.tag}</Text>
              </View>
            </View>
            <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '12rpx' }}>
              {item.desc}
            </Text>
            <View
              style={{
                position: 'absolute',
                right: '30rpx',
                top: '70rpx',
                width: '26rpx',
                height: '26rpx',
                borderTop: '4rpx solid #999999',
                borderRight: '4rpx solid #999999',
                transform: 'rotate(45deg)',
              }}
            />
          </View>
        ))}
      </View>
    </VerificationSubShell>
  )
}
