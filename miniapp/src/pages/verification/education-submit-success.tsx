import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { MiniappBackIcon, getNativeNavigationMetrics } from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'

const REQUESTED_PRIMARY_TAB_KEY = 'qianxun_requested_primary_tab'
const REQUESTED_SCENE_KEY = 'qianxun_requested_scene'

export default function EducationSubmitSuccessPage() {
  const { menuTop, menuHeight, titleTop } = getNativeNavigationMetrics()

  const goToQianxunCity = async () => {
    Taro.setStorageSync(REQUESTED_PRIMARY_TAB_KEY, 'FAMILY')
    Taro.setStorageSync(REQUESTED_SCENE_KEY, 'CITY')
    await Taro.switchTab({ url: '/pages/index/index' })
  }

  return (
    <View id="education-submit-success-page" style={{ position: 'relative', width: '750rpx', minHeight: '100vh', background: '#F2F2F2', overflow: 'hidden' }}>
      <View
        id="education-submit-success-back"
        style={{ position: 'absolute', left: 0, top: `${Math.max(0, menuTop - 20)}rpx`, width: '112rpx', height: `${menuHeight + 40}rpx`, paddingLeft: '28rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box', zIndex: 2 }}
        onClick={() => Taro.redirectTo({ url: '/pages/verification/triple' })}
      >
        <MiniappBackIcon color="#637595" />
      </View>

      <Text style={{ position: 'absolute', left: 0, top: `${titleTop}rpx`, width: '750rpx', color: '#0C285A', fontSize: '32rpx', fontWeight: 500, lineHeight: '45rpx', textAlign: 'center' }}>
        提交成功
      </Text>

      <Image
        src={miniappOssIcons.verificationEducationSubmitSuccess}
        mode="aspectFit"
        style={{ position: 'absolute', left: '291rpx', top: '345rpx', width: '168rpx', height: '164rpx' }}
      />
      <Text style={{ position: 'absolute', left: 0, top: '522rpx', width: '750rpx', color: '#0C285A', fontSize: '30rpx', fontWeight: 600, lineHeight: '42rpx', textAlign: 'center' }}>
        提交成功
      </Text>
      <Text style={{ position: 'absolute', left: 0, top: '590rpx', width: '750rpx', color: '#333333', fontSize: '26rpx', fontWeight: 400, lineHeight: '37rpx', textAlign: 'center' }}>
        你的头像正在审核，请耐心等待
      </Text>
      <View
        id="education-submit-success-city-button"
        style={{ position: 'absolute', left: '155rpx', top: '644rpx', width: '440rpx', height: '84rpx', borderRadius: '10rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => void goToQianxunCity()}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>去千寻同城看看</Text>
      </View>
    </View>
  )
}
