import type { CSSProperties } from 'react'
import { View } from '@tarojs/components'

interface LoginNextButtonProps {
  active: boolean
  onClick: () => void | Promise<void>
  className?: string
  style?: CSSProperties
}

/** 登录链路统一下一步按钮：真实圆形按钮配蓝湖弯向右箭头。 */
export default function LoginNextButton({
  active,
  onClick,
  className = '',
  style,
}: LoginNextButtonProps) {
  return (
    <View
      className={`login-next-button ${className}`.trim()}
      style={{
        width: '126rpx',
        height: '126rpx',
        borderRadius: '63rpx',
        background: active ? '#2876FF' : '#E3F1FE',
        boxShadow: active ? '0 18rpx 36rpx rgba(40, 118, 255, 0.25)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        ...style,
      }}
      onClick={() => {
        if (!active) return
        void onClick()
      }}
      hoverClass={active ? 'btn-hover' : 'none'}
    >
      <View
        style={{
          position: 'relative',
          width: '60rpx',
          height: '48rpx',
        }}
      >
        <View
          className="login-next-icon__curve"
          style={{
            position: 'absolute',
            left: '5rpx',
            top: '17rpx',
            width: '37rpx',
            height: '24rpx',
            borderTop: '9rpx solid #FFFFFF',
            borderRadius: '34rpx 0 0 0',
            boxSizing: 'border-box',
            transform: 'skewX(-18deg)',
          }}
        />
        <View
          className="login-next-icon__head"
          style={{
            position: 'absolute',
            right: '1rpx',
            top: '6rpx',
            width: 0,
            height: 0,
            borderTop: '18rpx solid transparent',
            borderBottom: '18rpx solid transparent',
            borderLeft: '25rpx solid #FFFFFF',
          }}
        />
      </View>
    </View>
  )
}
