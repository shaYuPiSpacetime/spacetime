import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import { settingsApi } from '@/services/settings'
import type { SettingsHome } from '@/types/settings'
import SettingsShell from './components/SettingsShell'

function AboutRow({ label, onClick, divider = true }: { label: string; onClick: () => void; divider?: boolean }) {
  return (
    <View className={`settings-row about-row ${divider ? 'has-divider' : ''}`} onClick={onClick} hoverClass="settings-hover">
      <Text className="settings-row__label">{label}</Text>
      <View className="settings-row__arrow" />
    </View>
  )
}

export default function SettingsAboutPage() {
  const [home, setHome] = useState<SettingsHome>()
  const [config, setConfig] = useState<Record<string, string>>({})

  useEffect(() => {
    void (async () => {
      try {
        const [homeResult, configResult] = await Promise.all([
          settingsApi.home(),
          settingsApi.publicConfig(['agreement.user_agreement', 'agreement.privacy_policy', 'about.icp_number']),
        ])
        setHome(homeResult)
        setConfig(configResult || {})
      } catch (error) {
        await showError(error)
      }
    })()
  }, [])

  const entryMap = useMemo(
    () => new Map((home?.entries || []).map(entry => [entry.entryKey, entry])),
    [home?.entries],
  )
  const privacyUrl = entryMap.get('privacy_policy')?.jumpTarget || config['agreement.privacy_policy']

  function openContent(title: string, url?: string) {
    if (!url) {
      void Taro.showToast({ title: '内容暂未配置', icon: 'none' })
      return
    }
    void Taro.navigateTo({
      url: `/pages/settings/content?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    })
  }

  return (
    <SettingsShell title="关于我们" className="about-content">
      <View className="about-brand">
        <Image className="about-brand__logo" src={miniappOssIcons.settingsAboutLogo} mode="aspectFit" />
        <Text className="about-brand__name">时空邂逅</Text>
        <Text className="about-brand__version">V{home?.currentVersion || '—'}</Text>
      </View>
      <View className="about-card">
        <AboutRow label="用户协议" onClick={() => openContent('用户协议', config['agreement.user_agreement'])} />
        <AboutRow label="隐私政策" onClick={() => openContent('隐私政策', privacyUrl)} />
        <AboutRow label="公告栏" divider={false} onClick={() => void Taro.navigateTo({ url: '/pages/settings/announcements' })} />
      </View>
      <Text className="about-icp">{config['about.icp_number'] || 'ICP备案号'}</Text>
    </SettingsShell>
  )
}

async function showError(error: unknown) {
  await Taro.showToast({ title: error instanceof Error ? error.message : '加载失败，请稍后重试', icon: 'none' })
}
