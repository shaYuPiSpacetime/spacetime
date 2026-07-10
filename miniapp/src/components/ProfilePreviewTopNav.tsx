import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getWindowMetrics } from '@/utils/system'

export type ProfilePreviewTab = 'form' | 'preview'

type ProfilePreviewTopNavProps = {
  activeTab: ProfilePreviewTab
  onBack: () => void
  onTabChange: (tab: ProfilePreviewTab) => void
}

const tabs: Array<{ key: ProfilePreviewTab; label: string }> = [
  { key: 'form', label: '编辑资料' },
  { key: 'preview', label: '主页预览' },
]

export default function ProfilePreviewTopNav({
  activeTab,
  onBack,
  onTabChange,
}: ProfilePreviewTopNavProps) {
  const menu = Taro.getMenuButtonBoundingClientRect?.()
  const system = getWindowMetrics()
  const scale = system.windowWidth ? 750 / system.windowWidth : 2
  const menuTop = menu ? menu.top * scale : 82
  const menuHeight = menu ? menu.height * scale : 64
  const menuLeft = menu ? menu.left * scale : 552
  const titleTabsSafeWidth = Math.max(420, menuLeft - 112)
  const navHeight = Math.max(164, menuTop + menuHeight + 24)
  const titleTextLineHeight = 37
  const titleTabsTop = menuTop + (menuHeight - titleTextLineHeight) / 2

  return (
    <View style={{ position: 'relative', width: '750rpx', height: `${navHeight}rpx` }}>
      <View
        onClick={onBack}
        style={{
          position: 'absolute',
          left: '18rpx',
          top: `${menuTop}rpx`,
          width: '86rpx',
          height: `${menuHeight}rpx`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: '24rpx',
            height: '24rpx',
            borderLeft: '4rpx solid #607086',
            borderBottom: '4rpx solid #607086',
            transform: 'rotate(45deg)',
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          left: '112rpx',
          top: `${titleTabsTop}rpx`,
          width: `${titleTabsSafeWidth}rpx`,
          height: '48rpx',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: '248rpx',
            height: '48rpx',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          {tabs.map(tab => {
            const active = activeTab === tab.key
            return (
              <View
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                style={{ position: 'relative', width: '104rpx', height: '48rpx' }}
              >
                <Text
                  style={{
                    display: 'block',
                    color: active ? '#0C285A' : '#8F96A8',
                    fontSize: '26rpx',
                    lineHeight: '37rpx',
                    fontWeight: active ? 800 : 500,
                    textAlign: 'center',
                  }}
                >
                  {tab.label}
                </Text>
                {active ? (
                  <View
                    style={{
                      position: 'absolute',
                      left: '0',
                      bottom: '0',
                      width: '100%',
                      height: '4rpx',
                      borderRadius: '4rpx',
                      background: '#2876FF',
                    }}
                  />
                ) : null}
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}
