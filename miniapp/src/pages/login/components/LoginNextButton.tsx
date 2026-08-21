import type { CSSProperties } from 'react'
import { Image, View } from '@tarojs/components'
import { miniappOssIcons } from '@/constants/ossIcons'

interface LoginNextButtonProps {
  active: boolean
  onClick: () => void | Promise<void>
  className?: string
  style?: CSSProperties
}

/** 登录链路统一下一步按钮：真实圆形按钮配蓝湖白色箭头资源。 */
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
      <Image
        src={miniappOssIcons.loginNextArrow}
        mode="scaleToFill"
        className="login-next-icon"
        style={{
          width: '60rpx',
          height: '48rpx',
        }}
      />
    </View>
  )
}
