import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { CSSProperties } from 'react'

interface NotificationBadgeProps {
  value: number | string
  id?: string
  className?: string
  bordered?: boolean
  style?: CSSProperties
}

function formatBadgeValue(value: number | string): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return ''
    return value > 99 ? '99+' : String(Math.floor(value))
  }
  return value.trim()
}

function designUnit(value: number): string {
  return Taro.getEnv() === Taro.ENV_TYPE.WEAPP ? `${value}rpx` : `${value / 2}px`
}

/**
 * 全局数字消息角标：单/双位数字固定为 32rpx 圆形，99+ 按内容自适应宽度。
 */
export default function NotificationBadge({
  value,
  id,
  className,
  bordered = false,
  style,
}: NotificationBadgeProps) {
  const label = formatBadgeValue(value)
  if (!label) return null

  return (
    <View
      id={id}
      className={className}
      data-role="notification-badge"
      data-notification-value={label}
      style={{
        minWidth: designUnit(32),
        height: designUnit(32),
        padding: label.length > 2 ? `0 ${designUnit(5)}` : '0',
        border: bordered ? `${designUnit(2)} solid #FFFFFF` : 'none',
        borderRadius: designUnit(16),
        background: '#EE2525',
        color: '#FFFFFF',
        fontSize: designUnit(22),
        fontWeight: 500,
        lineHeight: designUnit(32),
        textAlign: 'center',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {label}
    </View>
  )
}
