import type { ReactNode } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getNativeNavigationMetrics, MiniappBackIcon } from '@/components/NativeNavigation'
import profileBg from '@/assets/login/profile-bg.webp'

interface LoginProfileShellProps {
  description: string
  children: ReactNode
  nextActive?: boolean
  loading?: boolean
  error?: string
  onRetry?: () => void | Promise<void>
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
  loading = false,
  error,
  onRetry,
  onNext,
}: LoginProfileShellProps) {
  const { menuTop, menuHeight } = getNativeNavigationMetrics()
  const canContinue = nextActive && !loading && !error
  const handleRetry = async () => {
    try {
      await onRetry?.()
    } catch {
      // 错误信息由运行时 Store 更新并在当前页面展示。
    }
  }

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
            left: 0,
            top: `${Math.max(0, menuTop - 20)}rpx`,
            width: '112rpx',
            height: `${menuHeight + 40}rpx`,
            paddingLeft: '28rpx',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            zIndex: 10,
          }}
          onClick={handleBack}
          hoverClass="btn-hover"
        >
          <MiniappBackIcon color="#607086" />
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
          <Text
            style={{
              color: '#0C285A',
              fontSize: '36rpx',
              fontWeight: 500,
              lineHeight: '50rpx',
            }}
          >
            请选择
          </Text>
          <Text
            style={{
              color: '#999999',
              fontSize: '28rpx',
              fontWeight: 400,
              lineHeight: '40rpx',
              marginTop: '28rpx',
            }}
          >
            {description}
          </Text>
        </View>

        {error ? (
          <View
            style={{
              position: 'absolute',
              left: '75rpx',
              top: '448rpx',
              width: '600rpx',
              minHeight: '260rpx',
              borderRadius: '32rpx',
              background: 'rgba(255,255,255,0.84)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '42rpx',
              boxSizing: 'border-box',
            }}
          >
            <Text style={{ color: '#0C285A', fontSize: '32rpx', fontWeight: 600 }}>
              加载失败
            </Text>
            <Text
              style={{
                color: '#8A93A5',
                fontSize: '26rpx',
                lineHeight: '40rpx',
                textAlign: 'center',
                marginTop: '20rpx',
              }}
            >
              {error}
            </Text>
            <View
              style={{
                minWidth: '216rpx',
                height: '76rpx',
                borderRadius: '38rpx',
                background: '#2876FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '32rpx',
                padding: '0 36rpx',
                boxSizing: 'border-box',
              }}
              onClick={() => void handleRetry()}
              hoverClass="btn-hover"
            >
              <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500 }}>
                重新加载
              </Text>
            </View>
          </View>
        ) : loading ? (
          <View
            style={{
              position: 'absolute',
              left: '0',
              top: '500rpx',
              width: '750rpx',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#8A93A5', fontSize: '28rpx' }}>正在加载...</Text>
          </View>
        ) : children}

        <View
          style={{
            position: 'absolute',
            left: '312rpx',
            bottom: '164rpx',
            width: '126rpx',
            height: '126rpx',
            borderRadius: '63rpx',
            background: canContinue ? '#2876FF' : '#E3F1FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => {
            if (canContinue) void onNext()
          }}
          hoverClass={canContinue ? 'btn-hover' : 'none'}
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
