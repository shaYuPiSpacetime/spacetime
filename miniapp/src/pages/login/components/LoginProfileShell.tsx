import type { ReactNode } from 'react'
import { Image, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import profileBg from '@/assets/login/profile-bg.webp'

interface LoginProfileShellProps {
  description: string
  children: ReactNode
  nextActive?: boolean
  onNext: () => void | Promise<void>
}

const pageStyle = {
  minHeight: '100vh',
  overflow: 'hidden',
  position: 'relative',
  background: '#F3F5FB',
} as const

function handleBack() {
  const pages = Taro.getCurrentPages()
  if (pages.length > 1) {
    Taro.navigateBack()
  } else {
    Taro.redirectTo({ url: '/pages/login/index' })
  }
}

/**
 * 蓝湖登录资料页共用壳：无导航标题，只保留返回、内容标题和底部下一步。
 */
export default function LoginProfileShell({
  description,
  children,
  nextActive = false,
  onNext,
}: LoginProfileShellProps) {
  return (
    <View style={pageStyle}>
      <Image
        src={profileBg}
        mode="widthFix"
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          width: '750rpx',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          width: '750rpx',
          height: '1624rpx',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: '20rpx',
            top: '92rpx',
            width: '56rpx',
            height: '56rpx',
            zIndex: 10,
          }}
          onClick={handleBack}
          hoverClass="btn-hover"
        >
          <View
            style={{
              position: 'absolute',
              left: '14rpx',
              top: '7rpx',
              width: '30rpx',
              height: '30rpx',
              borderLeft: '5rpx solid #697E9C',
              borderBottom: '5rpx solid #697E9C',
              transform: 'rotate(45deg)',
            }}
          />
        </View>

        <View
          style={{
            position: 'absolute',
            left: '0',
            top: '247rpx',
            width: '750rpx',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              color: '#0C285A',
              fontSize: '36rpx',
              fontWeight: 500,
              lineHeight: '50rpx',
            }}
          >
            请选择
          </View>
          <View
            style={{
              color: '#999999',
              fontSize: '28rpx',
              fontWeight: 400,
              lineHeight: '40rpx',
              marginTop: '28rpx',
            }}
          >
            {description}
          </View>
        </View>

        {children}

        <View
          style={{
            position: 'absolute',
            left: '312rpx',
            bottom: '164rpx',
            width: '126rpx',
            height: '126rpx',
            borderRadius: '63rpx',
            background: nextActive ? '#2876FF' : '#E3F1FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={onNext}
          hoverClass="btn-hover"
        >
          <View
            style={{
              position: 'relative',
              width: '54rpx',
              height: '40rpx',
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: '4rpx',
                top: '17rpx',
                width: '38rpx',
                height: '7rpx',
                borderRadius: '4rpx',
                background: '#FFFFFF',
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: '3rpx',
                top: '5rpx',
                width: '27rpx',
                height: '27rpx',
                borderTop: '7rpx solid #FFFFFF',
                borderRight: '7rpx solid #FFFFFF',
                transform: 'rotate(45deg)',
              }}
            />
          </View>
        </View>
      </View>
    </View>
  )
}
