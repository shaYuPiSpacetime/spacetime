import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
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
          settingsApi.publicConfig(['about.icp_number', 'about.load_failed_text']),
        ])
        setHome(homeResult)
        setConfig(configResult || {})
      } catch (error) {
        await showError(error, config['about.load_failed_text'])
      }
    })()
  }, [])

  function openContent(title: string, contentCode: string) {
    void Taro.navigateTo({
      url: `/pages/settings/content?title=${encodeURIComponent(title)}&contentCode=${encodeURIComponent(contentCode)}`,
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
        <AboutRow label="用户协议" onClick={() => openContent('用户协议', 'user_agreement')} />
        <AboutRow label="隐私政策" onClick={() => openContent('隐私政策', 'privacy_policy')} />
        <AboutRow label="平台信息管理规范" onClick={() => openContent('平台信息管理规范', 'platform_rule')} />
        <AboutRow label="公告栏" divider={false} onClick={() => void Taro.navigateTo({ url: '/pages/settings/announcements' })} />
      </View>
      {config['about.icp_number'] ? <Text className="about-icp">{config['about.icp_number']}</Text> : null}
    </SettingsShell>
  )
}

async function showError(error: unknown, fallback = '') {
  const title = error instanceof Error ? error.message : fallback
  if (title) await Taro.showToast({ title, icon: 'none' })
}
