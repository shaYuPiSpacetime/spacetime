import { Text, View } from '@tarojs/components'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { validateVerificationRuntime } from '@/domain/prd01Runtime'
import { usePrd01Store } from '@/stores/prd01Store'
import { getErrorMessage } from '@/utils/errorMessage'
import VerificationSubShell from './VerificationSubShell'

interface VerificationRuntimeBoundaryProps {
  children: ReactNode
  loadData?: () => Promise<void>
}

/** 认证目录统一运行态门禁：完整配置和页面数据均成功后才渲染业务内容。 */
export default function VerificationRuntimeBoundary({
  children,
  loadData,
}: VerificationRuntimeBoundaryProps) {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const retryRuntime = usePrd01Store(state => state.retry)
  const copy = usePrd01Store(state => state.copy)
  const loadDataRef = useRef(loadData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  loadDataRef.current = loadData

  const load = async (force = false) => {
    setLoading(true)
    setError(undefined)
    try {
      if (force) await retryRuntime()
      else await bootstrap()
      const runtime = usePrd01Store.getState()
      if (!runtime.config || !runtime.profileOptions) {
        throw new Error()
      }
      validateVerificationRuntime(runtime.config, runtime.profileOptions)
      await loadDataRef.current?.()
    } catch (loadError) {
      const fallback = usePrd01Store.getState().copy('common_load_failed_message')
      setError(getErrorMessage(loadError, fallback))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading || error) {
    return (
      <VerificationSubShell title={copy('verification_nav_title')}>
        {loading ? (
          <Text style={{ position: 'absolute', top: '520rpx', width: '750rpx', color: '#8A93A5', fontSize: '28rpx', textAlign: 'center' }}>
            {copy('common_loading_action')}
          </Text>
        ) : (
          <View style={{ position: 'absolute', left: '75rpx', top: '410rpx', width: '600rpx', minHeight: '280rpx', borderRadius: '32rpx', background: 'rgba(255,255,255,0.88)', padding: '46rpx', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#0C285A', fontSize: '32rpx', fontWeight: 700 }}>{copy('common_load_failed_title')}</Text>
            <Text style={{ color: '#8A93A5', fontSize: '24rpx', lineHeight: '38rpx', textAlign: 'center', marginTop: '20rpx' }}>{error}</Text>
            <View style={{ minWidth: '216rpx', height: '76rpx', borderRadius: '38rpx', background: '#2876FF', padding: '0 36rpx', marginTop: '32rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }} onClick={() => void load(true)} hoverClass="btn-hover">
              <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500 }}>{copy('common_retry_action')}</Text>
            </View>
          </View>
        )}
      </VerificationSubShell>
    )
  }

  return <>{children}</>
}
