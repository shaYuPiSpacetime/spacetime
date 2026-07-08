import { Text, View } from '@tarojs/components'
import type { ReactNode } from 'react'

export type CommerceIconVariant = 'coin' | 'member'

interface CommercePlaceholderIconProps {
  variant: CommerceIconVariant
  kind: string
  size?: string
}

const COIN_BLUE = '#2E7BFF'
const COIN_BLUE_LIGHT = '#7298FF'
const GOLD = '#C4913F'

export default function CommercePlaceholderIcon({
  variant,
  kind,
  size,
}: CommercePlaceholderIconProps) {
  const iconKey = kind || 'placeholder'
  const iconSize = size ?? (variant === 'coin' ? '98rpx' : '88rpx')

  return (
    <View
      style={{
        position: 'relative',
        width: iconSize,
        height: iconSize,
        borderRadius: variant === 'coin' ? iconSize : '0',
        background: variant === 'coin' ? `linear-gradient(180deg, ${COIN_BLUE_LIGHT} 0%, ${COIN_BLUE} 100%)` : 'transparent',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {variant === 'coin' ? renderCoinGlyph(iconKey) : renderMemberGlyph(iconKey)}
    </View>
  )
}

function renderCoinGlyph(iconKey: string): ReactNode {
  switch (iconKey) {
    case 'yo-message':
      return (
        <Text style={{ position: 'absolute', left: '20rpx', top: '24rpx', color: '#FFFFFF', fontSize: '38rpx', fontWeight: 700, fontStyle: 'italic' }}>
          yo
        </Text>
      )
    case 'heart-signal':
      return (
        <>
          <Text style={{ position: 'absolute', left: '20rpx', top: '23rpx', color: '#FFFFFF', fontSize: '46rpx', fontWeight: 700, transform: 'rotate(-18deg)' }}>♡</Text>
          <Text style={{ position: 'absolute', right: '17rpx', top: '30rpx', color: '#FFFFFF', fontSize: '40rpx', fontWeight: 700, transform: 'rotate(16deg)' }}>♡</Text>
        </>
      )
    case 'ideal-profile':
      return <PersonGlyph color="#FFFFFF" lock={false} />
    case 'popularity-bolt':
      return <BoltGlyph color="#FFFFFF" />
    case 'featured-wand':
      return <WandGlyph color="#FFFFFF" />
    case 'recommend-star':
      return <StarGlyph color="#FFFFFF" />
    case 'anonymous-lock':
      return <PersonGlyph color="#FFFFFF" lock />
    case 'limited-gift':
      return <GiftGlyph color="#FFFFFF" />
    default:
      return <Text style={{ position: 'absolute', left: '30rpx', top: '20rpx', color: '#FFFFFF', fontSize: '48rpx', fontWeight: 700 }}>•</Text>
  }
}

function renderMemberGlyph(iconKey: string): ReactNode {
  switch (iconKey) {
    case 'heart-list':
      return (
        <>
          <View style={{ position: 'absolute', left: '5rpx', top: '18rpx', width: '54rpx', height: '44rpx', borderRadius: '28rpx 28rpx 20rpx 20rpx', border: `10rpx solid ${GOLD}`, borderRight: '0', transform: 'rotate(28deg)' }} />
          <View style={{ position: 'absolute', left: '39rpx', top: '18rpx', width: '38rpx', height: '38rpx', borderRadius: '28rpx', border: `10rpx solid ${GOLD}`, borderLeft: '0', transform: 'rotate(-24deg)' }} />
        </>
      )
    case 'visitor-eye':
      return <EyeGlyph color={GOLD} />
    case 'yo-message':
      return (
        <View style={{ position: 'absolute', left: '4rpx', top: '14rpx', width: '72rpx', height: '62rpx', borderRadius: '34rpx 34rpx 34rpx 12rpx', background: GOLD }}>
          <Text style={{ position: 'absolute', left: '14rpx', top: '13rpx', color: '#211D1E', fontSize: '30rpx', fontWeight: 700, fontStyle: 'italic' }}>yo</Text>
        </View>
      )
    case 'extra-browse':
      return <StarGlyph color={GOLD} />
    case 'filter':
      return (
        <>
          <View style={{ position: 'absolute', left: '15rpx', top: '12rpx', width: '58rpx', height: '18rpx', borderRadius: '10rpx 10rpx 4rpx 4rpx', background: GOLD }} />
          <View style={{ position: 'absolute', left: '25rpx', top: '28rpx', width: '38rpx', height: '36rpx', background: GOLD, transform: 'skewX(18deg)' }} />
          <View style={{ position: 'absolute', left: '46rpx', top: '60rpx', width: '12rpx', height: '26rpx', borderRadius: '6rpx', background: GOLD }} />
        </>
      )
    case 'exposure':
      return <BulbGlyph color={GOLD} />
    case 'stealth':
      return (
        <>
          <EyeGlyph color={GOLD} />
          <View style={{ position: 'absolute', left: '8rpx', top: '42rpx', width: '78rpx', height: '9rpx', borderRadius: '5rpx', background: '#211D1E', transform: 'rotate(43deg)' }} />
          <View style={{ position: 'absolute', left: '11rpx', top: '40rpx', width: '74rpx', height: '6rpx', borderRadius: '4rpx', background: GOLD, transform: 'rotate(43deg)' }} />
        </>
      )
    case 'replay':
      return (
        <>
          <View style={{ position: 'absolute', left: '8rpx', top: '8rpx', width: '66rpx', height: '66rpx', borderRadius: '36rpx', border: `11rpx solid ${GOLD}` }} />
          <Text style={{ position: 'absolute', left: '33rpx', top: '25rpx', color: '#211D1E', fontSize: '30rpx', fontWeight: 700 }}>▷</Text>
        </>
      )
    case 'daily-heart':
      return <PersonGlyph color={GOLD} lock={false} />
    default:
      return <Text style={{ position: 'absolute', left: '26rpx', top: '12rpx', color: GOLD, fontSize: '58rpx', fontWeight: 700 }}>•</Text>
  }
}

function EyeGlyph({ color }: { color: string }) {
  return (
    <>
      <View style={{ position: 'absolute', left: '7rpx', top: '25rpx', width: '74rpx', height: '42rpx', borderRadius: '50%', background: color }} />
      <View style={{ position: 'absolute', left: '33rpx', top: '33rpx', width: '24rpx', height: '24rpx', borderRadius: '12rpx', background: '#211D1E' }} />
    </>
  )
}

function PersonGlyph({ color, lock }: { color: string; lock: boolean }) {
  return (
    <>
      <View style={{ position: 'absolute', left: '34rpx', top: '18rpx', width: '30rpx', height: '30rpx', borderRadius: '15rpx', background: color }} />
      <View style={{ position: 'absolute', left: '24rpx', top: '54rpx', width: '50rpx', height: '30rpx', borderRadius: '26rpx 26rpx 10rpx 10rpx', background: color }} />
      {lock && (
        <>
          <View style={{ position: 'absolute', right: '17rpx', bottom: '15rpx', width: '24rpx', height: '22rpx', borderRadius: '4rpx', background: color }} />
          <View style={{ position: 'absolute', right: '22rpx', bottom: '34rpx', width: '14rpx', height: '14rpx', borderRadius: '9rpx 9rpx 0 0', border: `5rpx solid ${color}`, borderBottom: '0' }} />
        </>
      )}
    </>
  )
}

function BoltGlyph({ color }: { color: string }) {
  return (
    <>
      <View style={{ position: 'absolute', left: '42rpx', top: '14rpx', width: '25rpx', height: '44rpx', background: color, transform: 'skewX(-20deg)' }} />
      <View style={{ position: 'absolute', left: '27rpx', top: '48rpx', width: '29rpx', height: '40rpx', background: color, transform: 'skewX(-20deg)' }} />
    </>
  )
}

function WandGlyph({ color }: { color: string }) {
  return (
    <>
      <View style={{ position: 'absolute', left: '27rpx', top: '44rpx', width: '58rpx', height: '16rpx', borderRadius: '8rpx', background: color, transform: 'rotate(-45deg)' }} />
      <Text style={{ position: 'absolute', left: '14rpx', top: '16rpx', color, fontSize: '26rpx', fontWeight: 700 }}>✦</Text>
      <Text style={{ position: 'absolute', right: '14rpx', top: '18rpx', color, fontSize: '22rpx', fontWeight: 700 }}>✦</Text>
    </>
  )
}

function StarGlyph({ color }: { color: string }) {
  return (
    <Text style={{ position: 'absolute', left: '13rpx', top: '4rpx', color, fontSize: '72rpx', fontWeight: 700 }}>
      ★
    </Text>
  )
}

function GiftGlyph({ color }: { color: string }) {
  return (
    <>
      <View style={{ position: 'absolute', left: '21rpx', top: '38rpx', width: '56rpx', height: '42rpx', borderRadius: '4rpx', background: color }} />
      <View style={{ position: 'absolute', left: '17rpx', top: '30rpx', width: '64rpx', height: '14rpx', borderRadius: '4rpx', background: color }} />
      <View style={{ position: 'absolute', left: '47rpx', top: '30rpx', width: '7rpx', height: '50rpx', background: COIN_BLUE }} />
      <View style={{ position: 'absolute', left: '27rpx', top: '15rpx', width: '21rpx', height: '20rpx', borderRadius: '16rpx 16rpx 4rpx 16rpx', border: `6rpx solid ${color}` }} />
      <View style={{ position: 'absolute', right: '24rpx', top: '15rpx', width: '21rpx', height: '20rpx', borderRadius: '16rpx 16rpx 16rpx 4rpx', border: `6rpx solid ${color}` }} />
    </>
  )
}
