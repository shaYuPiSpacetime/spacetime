import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'
import { getNativeNavigationMetrics, MiniappBackIcon } from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'

type HeaderProps = {
  title?: string
  align?: 'left' | 'center'
  underline?: boolean
  showBack?: boolean
  onBack?: () => void
  rightIcon?: 'clean' | 'folder'
  onRightIconClick?: () => void
  children?: ReactNode
}

const designRpx = (value: number) =>
  Taro.getEnv() === Taro.ENV_TYPE.WEAPP ? `${value}rpx` : `${value / 2}px`

export function getLanhuNavigationMetrics() {
  const { menuTop, menuHeight } = getNativeNavigationMetrics()
  return { menuTop, menuHeight }
}

export default function HeartMessageHeader({
  title,
  align = 'left',
  underline = false,
  showBack = false,
  onBack,
  rightIcon,
  onRightIconClick,
  children,
}: HeaderProps) {
  const { menuTop, menuHeight } = getLanhuNavigationMetrics()
  const titleTop = menuTop + (menuHeight - 45) / 2
  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      void Taro.navigateBack()
    } else {
      void Taro.switchTab({ url: '/pages/community/index' })
    }
  }

  return (
    <View
      style={{
        position: 'relative',
        width: Taro.getEnv() === Taro.ENV_TYPE.WEAPP ? '750rpx' : '100%',
        height: designRpx(176),
        flexShrink: 0,
      }}
    >
      {showBack ? (
        <View
          onClick={handleBack}
          style={{
            position: 'absolute',
            left: designRpx(24),
            top: designRpx(menuTop),
            width: designRpx(54),
            height: designRpx(menuHeight),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            zIndex: 2,
          }}
        >
          <MiniappBackIcon color="#607086" size={22} />
        </View>
      ) : null}

      {title ? (
        <View
          style={{
            position: 'absolute',
            left: designRpx(align === 'left' ? 25 : 160),
            top: designRpx(titleTop),
            width: designRpx(align === 'left' ? 210 : 430),
            height: designRpx(54),
            display: 'flex',
            justifyContent: align === 'left' ? 'flex-start' : 'center',
          }}
        >
          {underline ? (
            <View
              style={{
                position: 'absolute',
                left: '0',
                top: designRpx(37),
                width: designRpx(Math.max(64, title.length * 32)),
                height: designRpx(8),
                borderRadius: designRpx(6),
                background: 'rgba(40,118,255,0.8)',
              }}
            />
          ) : null}
          <Text
            style={{
              position: 'relative',
              zIndex: 1,
              color: '#0C285A',
              fontFamily: 'PingFangSC-Medium, PingFang SC, sans-serif',
              fontSize: designRpx(32),
              fontWeight: 500,
              lineHeight: designRpx(45),
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Text>
        </View>
      ) : null}

      {rightIcon === 'clean' ? <CleanIcon top={titleTop - 2} /> : null}
      {rightIcon === 'folder' ? (
        <HeartFolderIcon top={titleTop - 11} onClick={onRightIconClick} />
      ) : null}
      {children}
    </View>
  )
}

function CleanIcon({ top }: { top: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: designRpx(516),
        top: designRpx(top),
        width: designRpx(52),
        height: designRpx(48),
        transform: 'rotate(18deg)',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: designRpx(29),
          top: '0',
          width: designRpx(7),
          height: designRpx(30),
          borderRadius: designRpx(4),
          background: '#999999',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: designRpx(8),
          top: designRpx(24),
          width: designRpx(36),
          height: designRpx(19),
          borderLeft: `${designRpx(7)} solid #999999`,
          borderRight: `${designRpx(7)} solid #999999`,
          borderBottom: `${designRpx(7)} solid #999999`,
          borderRadius: `0 0 ${designRpx(24)} ${designRpx(24)}`,
          boxSizing: 'border-box',
        }}
      />
    </View>
  )
}

function HeartFolderIcon({ top, onClick }: { top: number; onClick?: () => void }) {
  return (
    <Image
      onClick={onClick}
      src={miniappOssIcons.heartMutualLikes}
      mode="aspectFit"
      style={{
        position: 'absolute',
        left: designRpx(506),
        top: designRpx(top),
        width: designRpx(64),
        height: designRpx(64),
      }}
    />
  )
}
