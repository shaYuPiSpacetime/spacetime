import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

export interface CustomNavBarProps {
  /** 标题文字，不传则无标题 */
  title?: string
  /** 背景色，默认白色 */
  bgColor?: string
  /** 是否显示返回按钮，默认 false */
  showBack?: boolean
  /** 标题文字颜色，默认黑色 */
  titleColor?: string
}

/**
 * 自定义导航栏 — 配合 navigationStyle: 'custom' 使用
 *
 * 消除默认导航栏的底部横线，背景可延伸到状态栏区域。
 * 高度 = 状态栏高度 + 导航内容区高度 (44px)，适配所有机型。
 */
export default function CustomNavBar({
  title,
  bgColor = '#FFFFFF',
  showBack = false,
  titleColor = '#000000',
}: CustomNavBarProps) {
  const systemInfo = Taro.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight ?? 20

  const handleBack = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack()
    } else {
      Taro.switchTab({ url: '/pages/index/index' })
    }
  }

  return (
    <View
      style={{
        paddingTop: `${statusBarHeight}px`,
        background: bgColor,
      }}
    >
      {/* 导航内容区 */}
      <View
        className="flex items-center relative"
        style={{ height: '44px' }}
      >
        {/* 返回按钮 */}
        {showBack && (
          <View
            className="flex items-center justify-center absolute left-0"
            style={{
              width: '44px',
              height: '44px',
              zIndex: 10,
            }}
            onClick={handleBack}
          >
            <Text style={{ fontSize: '20px', color: titleColor }}>‹</Text>
          </View>
        )}

        {/* 标题 — 居中 */}
        {title ? (
          <View className="flex-1 flex items-center justify-center">
            <Text
              style={{
                fontSize: '17px',
                fontWeight: 600,
                color: titleColor,
                lineHeight: '44px',
              }}
            >
              {title}
            </Text>
          </View>
        ) : (
          <View className="flex-1" />
        )}
      </View>
    </View>
  )
}
