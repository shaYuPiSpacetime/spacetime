import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getWindowMetrics } from '@/utils/system'

const BLUE = '#2876FF'
const NAVY = '#0C285A'
const QIANXUN_SECONDARY_TAB_OFFSET = 70
const PROFILE_TOUCH_SIZE = 64
const PROFILE_MENU_GAP = 12
const PROFILE_MIN_LEFT = 379

export type QianxunPrimaryTab = 'FAMILY' | 'KINDRED' | 'CAREER'

export interface QianxunHeaderMetrics {
  primaryTop: number
  avatarLeft: number
  avatarAnchorLeft?: number
  avatarCenterTop?: number
  secondaryTop: number
  contentTop: number
}

export function getQianxunHeaderMetrics(): QianxunHeaderMetrics {
  const system = getWindowMetrics()
  const scale = system.windowWidth ? 750 / system.windowWidth : 2
  let menu: ReturnType<typeof Taro.getMenuButtonBoundingClientRect> | undefined
  try {
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) menu = Taro.getMenuButtonBoundingClientRect()
  } catch {
    // 胶囊 API 暂不可用时使用安全位置，避免遮挡一级导航。
  }
  const menuLeft = menu ? menu.left * scale : 598
  const validMenu = menu && Number.isFinite(menu.top) && menu.top >= 0 &&
    Number.isFinite(menu.height) && menu.height > 0 && menu.width > 0 &&
    Number.isFinite(menu.left) && menu.left < system.windowWidth && menu.right > menu.left &&
    menuLeft >= PROFILE_MIN_LEFT + PROFILE_TOUCH_SIZE + PROFILE_MENU_GAP
  if (!validMenu) menu = undefined
  const primaryTop = menu ? menu.top * scale + (menu.height * scale - 45) / 2 : 90
  const avatarLeft = (menu ? menuLeft : 598) - PROFILE_TOUCH_SIZE - PROFILE_MENU_GAP
  const secondaryTop = primaryTop + QIANXUN_SECONDARY_TAB_OFFSET
  return {
    primaryTop, avatarLeft, secondaryTop, contentTop: secondaryTop + 82,
    avatarAnchorLeft: menu?.left,
    avatarCenterTop: menu ? menu.top + menu.height / 2 : undefined,
  }
}

interface QianxunHeaderProps {
  active: QianxunPrimaryTab
  avatar: string
  metrics: QianxunHeaderMetrics
  onChange: (tab: QianxunPrimaryTab) => void
  onProfile: () => void
}

const primaryTabs: Array<{ id: string; tab: QianxunPrimaryTab; label: string; left: number }> = [
  { id: 'qianxun-primary-family', tab: 'FAMILY', label: '成家', left: 32 },
  { id: 'qianxun-primary-kindred', tab: 'KINDRED', label: '时空邂逅', left: 123 },
  { id: 'qianxun-primary-career', tab: 'CAREER', label: '立业', left: 285 },
]

export function QianxunHeader({ active, avatar, metrics, onChange, onProfile }: QianxunHeaderProps) {
  // 头像直接锚定原生胶囊像素坐标，避免窗口宽度兜底导致 rpx 换算后重叠。
  const profileLeft = metrics.avatarAnchorLeft === undefined ? `${metrics.avatarLeft}rpx` : `calc(${metrics.avatarAnchorLeft}px - ${PROFILE_TOUCH_SIZE + PROFILE_MENU_GAP}rpx)`
  const profileTop = metrics.avatarCenterTop === undefined ? `${metrics.primaryTop + (45 - PROFILE_TOUCH_SIZE) / 2}rpx` : `calc(${metrics.avatarCenterTop}px - ${PROFILE_TOUCH_SIZE / 2}rpx)`
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
          </View>
        )
      })}
      <View id="qianxun-profile-entry" onClick={onProfile} style={{ position: 'absolute', left: profileLeft, top: profileTop, width: `${PROFILE_TOUCH_SIZE}rpx`, height: `${PROFILE_TOUCH_SIZE}rpx`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src={avatar} mode="aspectFill" style={{ width: '48rpx', height: '48rpx', borderRadius: '24rpx', background: '#EEF3F8' }} />
      </View>
    </View>
  )
}

export { BLUE as QIANXUN_BLUE, NAVY as QIANXUN_NAVY }
