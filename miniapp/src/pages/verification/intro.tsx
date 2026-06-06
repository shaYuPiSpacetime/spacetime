import { Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import VerificationShell from './components/VerificationShell'

export default function VerificationIntroPage() {
  return (
    <VerificationShell
      stage="intro"
      primaryText="下一步"
      primaryActive={false}
      onPrimary={() => Taro.navigateTo({ url: '/pages/verification/intro-edit' })}
    >
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '558rpx',
          width: '700rpx',
          height: '974rpx',
          borderRadius: '18rpx',
          background: '#FFFFFF',
          padding: '52rpx 30rpx',
          boxSizing: 'border-box',
        }}
        onClick={() => Taro.navigateTo({ url: '/pages/verification/intro-edit' })}
        hoverClass="btn-hover"
      >
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '30rpx', fontWeight: 800, lineHeight: '42rpx' }}>
          自我描述
        </Text>
        <View
          style={{
            width: '640rpx',
            height: '408rpx',
            borderRadius: '12rpx',
            border: '4rpx solid #2876FF',
            marginTop: '44rpx',
            padding: '28rpx',
            boxSizing: 'border-box',
          }}
        >
          <Textarea
            disabled
            value=""
            placeholder="简单描述下自己是怎么一个人，性格、习惯、爱好、有点、缺点等，不少于20字"
            placeholderStyle="color:#999999;font-size:28rpx;line-height:48rpx"
            style={{ width: '584rpx', height: '320rpx', color: '#333333', fontSize: '28rpx', lineHeight: '48rpx' }}
          />
          <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', lineHeight: '32rpx', textAlign: 'right' }}>最少20字</Text>
        </View>
      </View>
    </VerificationShell>
  )
}
