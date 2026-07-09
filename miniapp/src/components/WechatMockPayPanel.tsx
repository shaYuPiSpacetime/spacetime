import { Text, View } from '@tarojs/components'

interface WechatMockPayPanelProps {
  amount: string
  onClose: () => void
  onSuccess: () => void
  onCancel: () => void
}

// 微信支付键盘为微信原生系统面板；生产链路通过 wx.requestPayment 唤起，此组件只用于蓝湖 demo 预览和无真实支付参数时的闭环模拟。
export default function WechatMockPayPanel({
  amount,
  onClose,
  onSuccess,
  onCancel,
}: WechatMockPayPanelProps) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: '620rpx',
        background: '#FFFFFF',
        borderRadius: '32rpx 32rpx 0 0',
        boxSizing: 'border-box',
        padding: '0 44rpx 56rpx',
      }}
    >
      <View style={{ height: '96rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Text style={{ color: '#1F1F1F', fontSize: '32rpx', fontWeight: 500 }}>时空邂逅</Text>
        <Text
          style={{ position: 'absolute', right: 0, top: '30rpx', color: '#999999', fontSize: '28rpx' }}
          onClick={onClose}
        >
          关闭
        </Text>
      </View>
      <Text style={{ display: 'block', color: '#111111', fontSize: '92rpx', fontWeight: 600, lineHeight: '116rpx', textAlign: 'center', marginTop: '8rpx' }}>
        ¥{amount}
      </Text>
      <View style={{ width: '662rpx', height: '1rpx', background: '#EEEEEE', margin: '28rpx auto 0' }} />
      <View
        style={{
          width: '662rpx',
          height: '96rpx',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: '#8C8C8C', fontSize: '30rpx' }}>付款方式</Text>
        <Text style={{ color: '#111111', fontSize: '30rpx' }}>微信支付</Text>
      </View>
      <View
        style={{
          width: '662rpx',
          height: '112rpx',
          margin: '0 auto',
          background: '#F7F7F7',
          borderRadius: '12rpx',
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
        <View style={{ flex: 1 }}>
          <Text style={{ display: 'block', color: '#111111', fontSize: '30rpx', fontWeight: 600 }}>微信支付</Text>
          <Text style={{ display: 'block', color: '#8C8C8C', fontSize: '24rpx', marginTop: '8rpx' }}>当前付款方式</Text>
        </View>
      </View>
      {/* 微信数字支付键盘是原生系统 UI，demo fallback 不渲染微信数字键盘，只保留支付结果动作。 */}
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '56rpx',
        }}
      >
        <View
          style={{
            width: '300rpx',
            height: '88rpx',
            borderRadius: '44rpx',
            border: '1rpx solid #D8D8D8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={onCancel}
        >
          <Text style={{ color: '#333333', fontSize: '30rpx', fontWeight: 600 }}>取消支付</Text>
        </View>
        <View
          style={{
            width: '300rpx',
            height: '88rpx',
            borderRadius: '44rpx',
            background: '#07C160',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={onSuccess}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 700 }}>支付成功</Text>
        </View>
      </View>
    </View>
  )
}
