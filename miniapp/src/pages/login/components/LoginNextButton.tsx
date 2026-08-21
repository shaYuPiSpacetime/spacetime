import type { CSSProperties } from 'react'
import { Image, View } from '@tarojs/components'
import { miniappOssIcons } from '@/constants/ossIcons'

interface LoginNextButtonProps {
  active: boolean
  onClick: () => void | Promise<void>
  className?: string
  style?: CSSProperties
}

/** 登录链路统一下一步按钮：直接使用蓝湖未点亮/点亮两态完整图标。 */
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
        src={active ? miniappOssIcons.loginNextActive : miniappOssIcons.loginNextDisabled}
        mode="scaleToFill"
        className="login-next-icon"
        style={{
          width: '126rpx',
          height: '126rpx',
        }}
      />
    </View>
  )
}
