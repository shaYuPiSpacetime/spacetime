import type { ReactNode } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'
import bg from '@/assets/lanhu/verification/verification-bg.webp'

export type VerificationStage = 'basic' | 'avatar' | 'intro' | 'triple'

const STAGES: Array<{ key: VerificationStage; label: string; left: string; dot: string }> = [
  { key: 'basic', label: '基本资料', left: '42rpx', dot: '92rpx' },
  { key: 'avatar', label: '添加头像', left: '212rpx', dot: '262rpx' },
  { key: 'intro', label: '自我介绍', left: '382rpx', dot: '432rpx' },
  { key: 'triple', label: '三重认证', left: '552rpx', dot: '602rpx' },
]

interface VerificationShellProps {
  stage: VerificationStage
  children: ReactNode
  primaryText?: string
  primaryActive?: boolean
  onPrimary?: () => void | Promise<void>
  onBack?: () => void
  scroll?: boolean
}

export default function VerificationShell({
  stage,
  children,
  primaryText = '下一步',
  primaryActive = true,
  onPrimary,
  onBack,
  scroll = false,
}: VerificationShellProps) {
  const { submit } = useLogin()
  const contentHeight = scroll && stage === 'basic' ? '1830rpx' : '1678rpx'

  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack()
      return
    }
    Taro.showModal({
      title: '暂不认证',
      content: '可以稍后再完善认证资料，是否先进入首页？',
      confirmText: '进入首页',
      cancelText: '继续认证',
      success: (res) => {
        if (res.confirm) submit()
      },
    })
  }

  const content = (
    <View style={{ position: 'relative', width: '750rpx', minHeight: contentHeight, paddingBottom: onPrimary ? '180rpx' : '0', boxSizing: 'border-box' }}>
      <Header onBack={handleBack} />
      <IntroBlock />
      <Progress stage={stage} />
      {children}
      {onPrimary && (
        <View
          style={{
            position: 'absolute',
            left: '25rpx',
            bottom: '24rpx',
            width: '700rpx',
            height: '98rpx',
            borderRadius: '24rpx',
            background: primaryActive ? '#2876FF' : '#E3F1FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: primaryActive ? '0 12rpx 28rpx rgba(40,118,255,0.25)' : 'none',
          }}
          onClick={onPrimary}
          hoverClass="btn-hover"
        >
          <Text style={{ color: primaryActive ? '#FFFFFF' : '#8CA7D0', fontSize: '32rpx', fontWeight: 700, lineHeight: '45rpx' }}>
            {primaryText}
          </Text>
        </View>
      )}
    </View>
  )

  return (
    <View style={{ minHeight: '100vh', background: '#F3F7FB', position: 'relative', overflow: 'hidden' }}>
      <Image src={bg} mode="widthFix" style={{ position: 'fixed', left: '0', top: '0', width: '750rpx' }} />
      {scroll ? (
        <ScrollView scrollY style={{ height: '100vh', position: 'relative', zIndex: 1 }} showScrollbar={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={{ position: 'relative', zIndex: 1 }}>{content}</View>
      )}
    </View>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  const menu = Taro.getMenuButtonBoundingClientRect?.()
  const system = Taro.getSystemInfoSync()
  const scale = system.windowWidth ? 750 / system.windowWidth : 2
  const top = menu ? `${menu.top * scale}rpx` : '88rpx'
  const height = menu ? `${menu.height * scale}rpx` : '64rpx'
  const arrowTop = menu ? `${((menu.height * scale) - 28) / 2}rpx` : '14rpx'
  const titleTop = menu ? `${menu.top * scale + ((menu.height * scale) - 45) / 2}rpx` : '96rpx'

  return (
    <View style={{ position: 'relative', width: '750rpx', height: '176rpx' }}>
      <View
        style={{ position: 'absolute', left: '20rpx', top, width: '56rpx', height, zIndex: 10 }}
        onClick={onBack}
        hoverClass="btn-hover"
      >
        <View
          style={{
            position: 'absolute',
            left: '14rpx',
            top: arrowTop,
            width: '28rpx',
            height: '28rpx',
            borderLeft: '5rpx solid #697E9C',
            borderBottom: '5rpx solid #697E9C',
            transform: 'rotate(45deg)',
          }}
        />
      </View>
      <Text
        style={{
          position: 'absolute',
          left: '0',
          top: titleTop,
          width: '750rpx',
          color: '#0C285A',
          fontSize: '32rpx',
          fontWeight: 700,
          lineHeight: '45rpx',
          textAlign: 'center',
        }}
      >
        认证
      </Text>
    </View>
  )
}

function IntroBlock() {
  return (
    <View style={{ position: 'absolute', left: '25rpx', top: '224rpx', width: '700rpx' }}>
      <Text style={{ display: 'block', color: '#0C285A', fontSize: '48rpx', fontWeight: 800, lineHeight: '67rpx' }}>
        完善资料和认证
      </Text>
      <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', lineHeight: '38rpx', marginTop: '16rpx' }}>
        时空邂逅是一个严肃、靠谱的交友平台，请认真填写资料
      </Text>
    </View>
  )
}

function Progress({ stage }: { stage: VerificationStage }) {
  const activeIndex = STAGES.findIndex((item) => item.key === stage)
  const progressWidth = `${activeIndex * 170 + 62}rpx`

  return (
    <View
      style={{
        position: 'absolute',
        left: '25rpx',
        top: '382rpx',
        width: '700rpx',
        height: '156rpx',
        borderRadius: '20rpx',
        background: '#FFFFFF',
      }}
    >
      {STAGES.map((item, index) => {
        const isActive = item.key === stage
        return (
          <View key={item.key} style={{ position: 'absolute', left: item.left, top: '34rpx', width: '120rpx', textAlign: 'center' }}>
            <View
              style={{
                height: '40rpx',
                borderRadius: '20rpx',
                background: isActive ? '#2876FF' : 'transparent',
                padding: '0 10rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <Text style={{ color: isActive ? '#FFFFFF' : '#999999', fontSize: '25rpx', lineHeight: '36rpx', whiteSpace: 'nowrap' }}>
                {item.label}
              </Text>
            </View>
            {isActive && (
              <View
                style={{
                  marginLeft: '52rpx',
                  width: '0',
                  height: '0',
                  borderLeft: '8rpx solid transparent',
                  borderRight: '8rpx solid transparent',
                  borderTop: '8rpx solid #2876FF',
                }}
              />
            )}
            {index < STAGES.length - 1 && (
              <View
                style={{
                  position: 'absolute',
                  left: '86rpx',
                  top: '65rpx',
                  width: '4rpx',
                  height: '4rpx',
                  borderRadius: '2rpx',
                  background: '#FFFFFF',
                  zIndex: 3,
                }}
              />
            )}
          </View>
        )
      })}
      <View
        style={{
          position: 'absolute',
          left: '40rpx',
          top: '94rpx',
          width: '620rpx',
          height: '10rpx',
          borderRadius: '5rpx',
          background: '#D3E4FF',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '40rpx',
          top: '94rpx',
          width: progressWidth,
          height: '10rpx',
          borderRadius: '5rpx',
          background: '#2876FF',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: STAGES[activeIndex]?.dot ?? '92rpx',
          top: '84rpx',
          width: '34rpx',
          height: '34rpx',
          borderRadius: '17rpx',
          background: '#2876FF',
          border: '8rpx solid #A8CBFF',
          boxSizing: 'border-box',
          zIndex: 4,
        }}
      />
    </View>
  )
}

export function FieldRow({
  label,
  value,
  onClick,
  last = false,
}: {
  label: string
  value: ReactNode
  onClick?: () => void
  last?: boolean
}) {
  return (
    <View
      style={{
        position: 'relative',
        height: '98rpx',
        borderBottom: last ? '0' : '1rpx solid #EDF2F8',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
      onClick={onClick}
    >
      <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx', width: '190rpx' }}>{label}</Text>
      <View style={{ flex: 1, textAlign: 'right' }}>
        {typeof value === 'string' ? (
          <Text style={{ color: '#999999', fontSize: '26rpx', lineHeight: '38rpx' }}>{value}</Text>
        ) : (
          value
        )}
      </View>
      {onClick && <Text style={{ color: '#999999', fontSize: '62rpx', fontWeight: 300, lineHeight: '76rpx', marginLeft: '14rpx' }}>›</Text>}
    </View>
  )
}

export function BottomPicker({
  title,
  children,
  onConfirm,
  onClose,
}: {
  title: string
  children: ReactNode
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <View
      style={{ position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, background: 'rgba(0,0,0,0.32)', zIndex: 30 }}
      onClick={onClose}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          minHeight: '520rpx',
          borderRadius: '32rpx 32rpx 0 0',
          background: '#FFFFFF',
          padding: '36rpx 50rpx 56rpx',
          boxSizing: 'border-box',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <Text style={{ display: 'block', color: '#333333', fontSize: '30rpx', fontWeight: 700, lineHeight: '42rpx', textAlign: 'center' }}>
          {title}
        </Text>
        {children}
        <View
          style={{
            height: '98rpx',
            borderRadius: '24rpx',
            background: '#2876FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '42rpx',
          }}
          onClick={onConfirm}
          hoverClass="btn-hover"
        >
          <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 700, lineHeight: '45rpx' }}>确定</Text>
        </View>
      </View>
    </View>
  )
}
