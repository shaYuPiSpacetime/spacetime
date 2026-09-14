import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { isAccountRestricted } from '@/domain/accessStatus'
import type { AccessStatus } from '@/types/prd01'

interface AccessBlockedPageProps {
  status?: AccessStatus | null
  loading: boolean
  error: string
  blockReasons: string[]
  refresh: () => Promise<unknown>
}

export default function AccessBlockedPage({ status, loading, error, blockReasons, refresh }: AccessBlockedPageProps) {
  const accountRestricted = isAccountRestricted(status)
  const reasons = accountRestricted ? [...blockReasons, error].filter(Boolean) : error ? [error] : blockReasons
  const title = accountRestricted
    ? status?.accountStatus === 'FROZEN' ? '账号已冻结' : '账号已注销'
    : loading ? '正在校验准入状态' : '当前功能暂不可用'
  return (
    <View style={{ minHeight: '100vh', background: '#F3F7FB', padding: '360rpx 50rpx 180rpx', boxSizing: 'border-box' }}>
      <Text style={{ display: 'block', color: '#0C285A', fontSize: '42rpx', fontWeight: 800, textAlign: 'center' }}>
        {title}
      </Text>
      {reasons.map((reason, index) => (
        <Text key={`${reason}-${index}`} style={{ display: 'block', color: '#697E9C', fontSize: '27rpx', lineHeight: '42rpx', textAlign: 'center', marginTop: '20rpx' }}>
          {reason}
        </Text>
      ))}
      <View
        style={{ height: '92rpx', borderRadius: '24rpx', background: '#2876FF', marginTop: '56rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => {
          if (accountRestricted) void Taro.navigateTo({ url: '/pages/settings/help' })
          else if (error) void refresh()
          else void Taro.navigateTo({ url: '/pages/verification/my-certification' })
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '32rpx' }}>
          {accountRestricted ? '联系客服' : error ? '重新加载' : '去完善资料与认证'}
        </Text>
      </View>
      {accountRestricted ? (
        <View
          style={{ marginTop: '24rpx', padding: '24rpx', textAlign: 'center' }}
          onClick={() => { if (!loading) void refresh() }}
        >
          <Text style={{ color: '#2876FF', fontSize: '28rpx' }}>
            {loading ? '正在刷新状态' : error ? '重新加载' : '刷新状态'}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
