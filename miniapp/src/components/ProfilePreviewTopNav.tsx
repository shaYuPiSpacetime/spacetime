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
  const menu = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
    ? Taro.getMenuButtonBoundingClientRect()
    : undefined
  const system = getWindowMetrics()
  const scale = system.windowWidth ? 750 / system.windowWidth : 2
  const menuTop = menu ? menu.top * scale : 99
  const menuHeight = menu ? menu.height * scale : 48
  const activeLineHeight = 45
  const titleTabsTop = menuTop + (menuHeight - activeLineHeight) / 2

  return (
    <View style={{ position: 'relative', width: '750rpx', height: '182rpx' }}>
      <View
        onClick={onBack}
        style={{
          position: 'absolute',
          left: '24rpx',
          top: `${menuTop}rpx`,
          width: '48rpx',
          height: `${menuHeight}rpx`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        <View
          style={{
            width: '22rpx',
            height: '22rpx',
            borderLeft: '4rpx solid #607086',
            borderBottom: '4rpx solid #607086',
            transform: 'rotate(45deg)',
            boxSizing: 'border-box',
          }}
        />
      </View>

      <View
        style={{
          position: 'absolute',
          left: '217rpx',
          top: `${titleTabsTop}rpx`,
          width: '287rpx',
          height: '56rpx',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        {tabs.map(tab => {
          const active = activeTab === tab.key
          return (
            <View
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              style={{
                position: 'relative',
                width: active ? '128rpx' : '112rpx',
                height: '56rpx',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: active ? '#0C285A' : '#7F8494',
                  fontSize: active ? '32rpx' : '28rpx',
                  lineHeight: active ? '45rpx' : '40rpx',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Text>
              {active ? (
                <View
                  style={{
                    position: 'absolute',
                    left: '0',
                    top: '45rpx',
                    width: '128rpx',
                    height: '8rpx',
                    borderRadius: '6rpx',
                    background: 'rgba(40,118,255,0.8)',
                  }}
                />
              ) : null}
            </View>
          )
        })}
      </View>
    </View>
  )
}
