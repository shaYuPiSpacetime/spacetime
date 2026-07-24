import { Text, View } from '@tarojs/components'
import { getNativeNavigationMetrics, MiniappBackIcon } from '@/components/NativeNavigation'

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
  const { menuTop, menuHeight } = getNativeNavigationMetrics()
  const activeLineHeight = 45
  const titleTabsTop = menuTop + (menuHeight - activeLineHeight) / 2

  return (
    <View style={{ position: 'relative', width: '750rpx', height: '182rpx' }}>
      <View
        className="profile-edit-back"
        data-role="profile-edit-back"
        onClick={onBack}
        hoverClass="btn-hover"
        style={{
          position: 'absolute',
          left: '0',
          top: `${Math.max(0, menuTop - 20)}rpx`,
          width: '112rpx',
          height: `${menuHeight + 40}rpx`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: '24rpx',
          boxSizing: 'border-box',
          zIndex: 10,
        }}
      >
        <MiniappBackIcon color="#607086" size={22} />
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
