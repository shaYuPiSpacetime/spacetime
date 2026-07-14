import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect } from 'react'

type BasicPickerKind = 'height-weight' | 'hometown' | 'career' | 'income'

interface BasicPickerPageProps {
  kind: BasicPickerKind
}

/**
 * 兼容旧路由：统一回到运行时字段配置驱动的基本资料页，
 * 避免旧页面继续维护本地枚举。
 */
export default function BasicPickerPage({ kind }: BasicPickerPageProps) {
  useEffect(() => {
    void Taro.redirectTo({ url: `/pages/verification/basic?field=${kind}` })
  }, [kind])

  return (
    <View style={{ minHeight: '100vh', background: '#F3F5FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#999999', fontSize: '28rpx' }}>正在加载基本资料...</Text>
    </View>
  )
}
