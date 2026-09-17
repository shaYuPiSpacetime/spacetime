import { ScrollView, Text, View } from '@tarojs/components'

interface CommunityReportReasonSheetProps {
  reasons: Array<{ code: string; label: string }>
  onClose: () => void
  onReport: (code: string) => void
}

export default function CommunityReportReasonSheet({ reasons, onClose, onReport }: CommunityReportReasonSheetProps) {
  return (
    <View onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,20,43,0.46)', zIndex: 10000 }}>
      <View
        onClick={event => event.stopPropagation()}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '1190rpx', borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF', padding: '28rpx 30rpx calc(26rpx + env(safe-area-inset-bottom))', boxSizing: 'border-box' }}
      >
        <ScrollView scrollY style={{ maxHeight: '920rpx' }}>
          {reasons.map(reason => (
            <View key={reason.code} onClick={() => onReport(reason.code)} style={{ height: '82rpx', borderBottom: '1rpx solid #F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#333333', fontSize: '27rpx', textAlign: 'center' }}>{reason.label}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={{ height: '14rpx', background: '#F4F5F7', margin: '0 -30rpx' }} />
        <View onClick={onClose} style={{ height: '78rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#777F8B', fontSize: '28rpx' }}>取消</Text>
        </View>
      </View>
    </View>
  )
}
