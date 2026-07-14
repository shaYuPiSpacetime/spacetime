import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { usePrd01Store } from '@/stores/prd01Store'

interface AccessBlockedPageProps {
  loading: boolean
  error: string
  blockReasons: string[]
  refresh: () => Promise<unknown>
}

export default function AccessBlockedPage({ loading, error, blockReasons, refresh }: AccessBlockedPageProps) {
  const copy = usePrd01Store(state => state.copy)
  const reasons = error ? [error] : blockReasons
  return <View style={{ minHeight: '100vh', background: '#F3F7FB', padding: '360rpx 50rpx 180rpx', boxSizing: 'border-box' }}><Text style={{ display: 'block', color: '#0C285A', fontSize: '42rpx', fontWeight: 800, textAlign: 'center' }}>{copy(loading ? 'access_checking_title' : 'access_blocked_title')}</Text>{reasons.map((reason, index) => <Text key={`${reason}-${index}`} style={{ display: 'block', color: '#697E9C', fontSize: '27rpx', lineHeight: '42rpx', textAlign: 'center', marginTop: '20rpx' }}>{reason}</Text>)}<View style={{ height: '92rpx', borderRadius: '24rpx', background: '#2876FF', marginTop: '56rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { if (error) void refresh(); else void Taro.navigateTo({ url: '/pages/verification/my-certification' }) }}><Text style={{ color: '#FFFFFF', fontSize: '32rpx' }}>{copy(error ? 'common_retry_action' : 'access_complete_action')}</Text></View></View>
}
