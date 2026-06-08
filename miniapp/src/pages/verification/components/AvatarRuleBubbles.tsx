import { Text, View } from '@tarojs/components'

const RULES = [
  { text: '本人照片', left: '346rpx', top: '90rpx' },
  { text: '能看清长相', left: '441rpx', top: '185rpx' },
  { text: '展示完美的你', left: '389rpx', top: '280rpx' },
]

export default function AvatarRuleBubbles() {
  return (
    <>
      {RULES.map((item) => (
        <RuleBubble key={item.text} text={item.text} left={item.left} top={item.top} />
      ))}
    </>
  )
}

function RuleBubble({ text, left, top }: { text: string; left: string; top: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        height: '68rpx',
        borderRadius: '34rpx',
        background: '#E3F1FE',
        padding: '0 22rpx 0 60rpx',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 3,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '18rpx',
          top: '17rpx',
          width: '34rpx',
          height: '34rpx',
          borderRadius: '17rpx',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: '18rpx',
            height: '12rpx',
            borderLeft: '4rpx solid #2876FF',
            borderBottom: '4rpx solid #2876FF',
            transform: 'rotate(-45deg)',
            marginTop: '-4rpx',
          }}
        />
      </View>
      <Text style={{ color: '#333333', fontSize: '24rpx', lineHeight: '34rpx', whiteSpace: 'nowrap' }}>{text}</Text>
    </View>
  )
}
