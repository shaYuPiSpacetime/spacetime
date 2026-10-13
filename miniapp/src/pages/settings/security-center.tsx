import { Button, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import SettingsShell from './components/SettingsShell'

/** 设置安全中心：安全内容的独立入口，不影响账号和隐私设置。 */
export default function SecurityCenterPage() {
  return (
    <SettingsShell title="安全中心" scroll>
      <View className="settings-main-card">
        <Button
          className="settings-row"
          hoverClass="settings-hover"
          onClick={() => void Taro.navigateTo({ url: '/pages/settings/anti-fraud-guide' })}
        >
          <View className="settings-row__label">反诈指南</View>
          <View className="settings-row__arrow" />
        </Button>
      </View>
    </SettingsShell>
  )
}
