import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getWindowMetrics } from '@/utils/system'

const BLUE = '#2876FF'
const NAVY = '#0C285A'
const QIANXUN_SECONDARY_TAB_OFFSET = 70

export type QianxunPrimaryTab = 'FAMILY' | 'KINDRED' | 'CAREER'

export interface QianxunHeaderMetrics {
  primaryTop: number
  avatarRight: number
  secondaryTop: number
  contentTop: number
}

export function getQianxunHeaderMetrics(): QianxunHeaderMetrics {
  const system = getWindowMetrics()
  const scale = system.windowWidth ? 750 / system.windowWidth : 2
  const menu = Taro.getEnv() === Taro.ENV_TYPE.WEAPP ? Taro.getMenuButtonBoundingClientRect() : undefined
  const primaryTop = menu ? menu.top * scale + (menu.height * scale - 45) / 2 : 90
  const avatarRight = menu ? (system.windowWidth - menu.left) * scale + 18 : 190
  const secondaryTop = primaryTop + QIANXUN_SECONDARY_TAB_OFFSET
  return { primaryTop, avatarRight, secondaryTop, contentTop: secondaryTop + 82 }
}

interface QianxunHeaderProps {
  active: QianxunPrimaryTab
  avatar: string
  unreadCount: number
  metrics: QianxunHeaderMetrics
  onChange: (tab: QianxunPrimaryTab) => void
  onProfile: () => void
}

const primaryTabs: Array<{ id: string; tab: QianxunPrimaryTab; label: string; left: number }> = [
  { id: 'qianxun-primary-family', tab: 'FAMILY', label: '成家', left: 32 },
  { id: 'qianxun-primary-kindred', tab: 'KINDRED', label: '时空邂逅', left: 123 },
  { id: 'qianxun-primary-career', tab: 'CAREER', label: '立业', left: 285 },
]

export function QianxunHeader({ active, avatar, unreadCount, metrics, onChange, onProfile }: QianxunHeaderProps) {
  return (
    <View style={{ position: 'relative', width: '750rpx', height: `${metrics.contentTop}rpx` }}>
      {primaryTabs.map(item => {
        const selected = active === item.tab
        return (
          <View
            key={item.tab}
            id={item.id}
            onClick={() => onChange(item.tab)}
            style={{ position: 'absolute', left: `${item.left - 12}rpx`, top: `${metrics.primaryTop - 22}rpx`, width: item.tab === 'KINDRED' ? '160rpx' : '88rpx', height: '88rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: selected ? NAVY : '#7F8494', fontSize: selected ? '32rpx' : '28rpx', lineHeight: selected ? '45rpx' : '40rpx', fontWeight: 500 }}>{item.label}</Text>
            {selected ? <View style={{ position: 'absolute', left: item.tab === 'KINDRED' ? '20rpx' : '12rpx', top: '67rpx', width: item.tab === 'KINDRED' ? '120rpx' : '64rpx', height: '8rpx', borderRadius: '6rpx', background: 'rgba(40,118,255,0.8)' }} /> : null}
            {item.tab === 'FAMILY' && unreadCount > 0 ? (
              <View style={{ position: 'absolute', left: '55rpx', top: '8rpx', minWidth: '28rpx', height: '28rpx', borderRadius: '14rpx', border: '2rpx solid #FFFFFF', background: '#EE2525', padding: '0 4rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                <Text style={{ color: '#FFFFFF', fontSize: '18rpx', lineHeight: '25rpx' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            ) : null}
          </View>
        )
      })}
      <View onClick={onProfile} style={{ position: 'absolute', right: `${metrics.avatarRight - 15}rpx`, top: `${metrics.primaryTop - 16}rpx`, width: '88rpx', height: '88rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src={avatar} mode="aspectFill" style={{ width: '58rpx', height: '58rpx', borderRadius: '29rpx', background: '#EEF3F8' }} />
      </View>
    </View>
  )
}

export { BLUE as QIANXUN_BLUE, NAVY as QIANXUN_NAVY }
