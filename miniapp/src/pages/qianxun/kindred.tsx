import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

const REQUESTED_PRIMARY_TAB_KEY = 'qianxun_requested_primary_tab'

/**
 * 兼容旧的知音分包深链；知音实际内容统一承载在千寻一级 Tab 中。
 */
export default function QianxunKindredRedirectPage() {
  useLoad(() => {
    Taro.setStorageSync(REQUESTED_PRIMARY_TAB_KEY, 'KINDRED')
    void Taro.switchTab({ url: '/pages/index/index' })
  })

  return <View id="qianxun-kindred-page" style={{ minHeight: '100vh', background: 'linear-gradient(100deg, #F1FEFC 0%, #F2F5FF 52%, #FCFDF3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#7F8494', fontSize: '26rpx' }}>正在进入知音…</Text></View>
}
