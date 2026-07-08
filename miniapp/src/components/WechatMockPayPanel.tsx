import { Text, View } from '@tarojs/components'

interface WechatMockPayPanelProps {
  amount: string
  onClose: () => void
  onSuccess: () => void
  onCancel: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export default function WechatMockPayPanel({
  amount,
  onClose,
  onSuccess,
  onCancel,
}: WechatMockPayPanelProps) {
  const handleKey = (key: string) => {
    if (key === '⌫') {
      onCancel()
      return
    }
    if (key) {
      onSuccess()
    }
  }

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: '1046rpx',
        background: '#FFFFFF',
        boxSizing: 'border-box',
      }}
    >
      <View
        style={{ height: '88rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        onClick={onClose}
      >
        <Text style={{ color: '#1F1F1F', fontSize: '32rpx', fontWeight: 500 }}>时空邂逅</Text>
      </View>
      <Text style={{ display: 'block', color: '#111111', fontSize: '92rpx', fontWeight: 600, lineHeight: '116rpx', textAlign: 'center', marginTop: '24rpx' }}>
        ¥{amount}
      </Text>
      <View style={{ width: '672rpx', height: '1rpx', background: '#EEEEEE', margin: '0 auto 0' }} />
      <View
        style={{
          width: '672rpx',
          height: '80rpx',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: '#8C8C8C', fontSize: '30rpx' }}>付款方式</Text>
        <Text style={{ color: '#999999', fontSize: '30rpx' }}>更改⌄</Text>
      </View>
      <View
        style={{
          width: '672rpx',
          height: '106rpx',
          margin: '0 auto',
          background: '#FFFBEA',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '0 34rpx',
          boxSizing: 'border-box',
        }}
      >
        <View
          style={{
            width: '44rpx',
            height: '44rpx',
            borderRadius: '22rpx',
            background: '#FFE66F',
            marginRight: '26rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#E0A500', fontSize: '24rpx', fontWeight: 700 }}>¥</Text>
        </View>
        <Text style={{ color: '#858585', fontSize: '30rpx', flex: 1 }}>零钱</Text>
        <Text style={{ color: '#21C36A', fontSize: '48rpx', fontWeight: 500 }}>✓</Text>
      </View>
      <View style={{ width: '552rpx', height: '90rpx', margin: '50rpx auto 0', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View
            key={index}
            style={{
              width: '80rpx',
              height: '80rpx',
              borderRadius: '10rpx',
              background: '#F3F3F3',
            }}
          />
        ))}
      </View>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '456rpx',
          background: '#F7F7F7',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        {KEYS.map((key, index) => {
          const keyContent = key === '⌫' ? <DeleteKeyIcon /> : key

          return (
            <View
              key={`${key}-${index}`}
              style={{
                width: '250rpx',
                height: '114rpx',
                background: key ? '#FFFFFF' : '#F0F0F0',
                borderRight: index % 3 === 2 ? '0' : '1rpx solid #E5E5E5',
                borderBottom: index >= 9 ? '0' : '1rpx solid #E5E5E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
              onClick={() => handleKey(key)}
            >
              {typeof keyContent === 'string' ? (
                <Text style={{ color: '#111111', fontSize: '50rpx', fontWeight: 500 }}>
                  {keyContent}
                </Text>
              ) : keyContent}
            </View>
          )
        })}
      </View>
    </View>
  )
}

function DeleteKeyIcon() {
  return (
    <View style={{ position: 'relative', width: '58rpx', height: '38rpx' }}>
      <View
        style={{
          position: 'absolute',
          left: '11rpx',
          top: '1rpx',
          width: '45rpx',
          height: '36rpx',
          borderRadius: '7rpx',
          background: '#111111',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '1rpx',
          top: '8rpx',
          width: '22rpx',
          height: '22rpx',
          borderRadius: '4rpx',
          background: '#111111',
          transform: 'rotate(45deg)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '28rpx',
          top: '18rpx',
          width: '20rpx',
          height: '3rpx',
          borderRadius: '2rpx',
          background: '#FFFFFF',
          transform: 'rotate(45deg)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '28rpx',
          top: '18rpx',
          width: '20rpx',
          height: '3rpx',
          borderRadius: '2rpx',
          background: '#FFFFFF',
          transform: 'rotate(-45deg)',
        }}
      />
    </View>
  )
}
