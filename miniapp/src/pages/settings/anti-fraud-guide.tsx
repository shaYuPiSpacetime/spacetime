import { Button, Image, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import SettingsShell from './components/SettingsShell'
import './security.scss'

/** 完整显示反诈海报；原图保持在 OSS，不增加小程序包体。 */
export default function AntiFraudGuidePage() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const src = miniappOssIcons.settingsAntiFraudGuide

  function retry() {
    setStatus('loading')
    setAttempt(value => value + 1)
  }

  async function preview() {
    if (status !== 'ready') return
    try {
      await Taro.previewImage({ current: src, urls: [src] })
    } catch {
      await Taro.showToast({ title: '暂时无法打开图片，请稍后重试', icon: 'none' })
    }
  }

  return (
    <SettingsShell title="反诈指南" scroll className="anti-fraud-guide">
      <View className="anti-fraud-guide__hint">安全交友防骗指南，点击图片可放大查看</View>
      {status === 'error' ? (
        <View className="anti-fraud-guide__error">
          <View className="settings-empty">图片加载失败，请检查网络后重试</View>
          <Button className="settings-content-retry" onClick={retry}>重新加载</Button>
        </View>
      ) : (
        <View className="anti-fraud-guide__poster">
          {status === 'loading' ? <View className="anti-fraud-guide__loading">图片加载中…</View> : null}
          <Image
            key={attempt}
            className="anti-fraud-guide__image"
            src={src}
            mode="widthFix"
            onLoad={() => setStatus('ready')}
            onError={() => setStatus('error')}
            onClick={preview}
          />
        </View>
      )}
    </SettingsShell>
  )
}
