import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { isCoolingOff } from '@/domain/settingsFlow'
import { settingsApi } from '@/services/settings'
import type { AccountCancelStatus } from '@/types/settings'
import SettingsShell from './components/SettingsShell'

export default function PrivacySettingsPage() {
  const [status, setStatus] = useState<AccountCancelStatus>({ status: 'NONE' })
  const [loading, setLoading] = useState(true)
  const [copyConfig, setCopyConfig] = useState<Record<string, string>>({})

  useEffect(() => {
    void Promise.all([
      settingsApi.cancelStatus(),
      settingsApi.publicConfig([
        'privacy.intro_title',
        'privacy.intro_copy',
        'privacy.cooling_title',
        'privacy.cooling_end_label',
        'privacy.loading_text',
        'privacy.load_failed_text',
      ]),
    ]).then(([statusResult, copyResult]) => {
      setStatus(statusResult)
      setCopyConfig(copyResult || {})
    }).catch(error => Taro.showToast({
      title: error instanceof Error ? error.message : '',
      icon: 'none',
    })).finally(() => setLoading(false))
  }, [])

  const cooling = isCoolingOff(status)
  const copy = (key: string) => copyConfig[key] || ''

  function openCompliance(contentCode: string, title: string) {
    void Taro.navigateTo({
      url: `/pages/settings/content?contentCode=${encodeURIComponent(contentCode)}&title=${encodeURIComponent(title)}`,
    })
  }

  return (
    <SettingsShell title="隐私设置">
      <View className="privacy-intro">
        <Text className="privacy-intro__title">{copy('privacy.intro_title')}</Text>
        <Text className="privacy-intro__copy">{copy('privacy.intro_copy')}</Text>
      </View>

      {cooling ? (
        <View className="privacy-cooling">
          <Text className="privacy-cooling__title">{copy('privacy.cooling_title')}</Text>
          <Text className="privacy-cooling__copy">{copy('privacy.cooling_end_label')}{status.coolingEndTime || ''}</Text>
        </View>
      ) : null}

      <View className="settings-main-card privacy-card">
        <Button
          className="settings-row has-divider"
          onClick={() => void Taro.navigateTo({ url: '/pages/settings/account-cancel' })}
          hoverClass="settings-hover"
        >
          <Text className="settings-row__label">注销账号</Text>
          <Text className="settings-row__value">{loading ? copy('privacy.loading_text') : cooling ? copy('privacy.cooling_title') : ''}</Text>
          <View className="settings-row__arrow" />
        </Button>
        <Button
          className="settings-row has-divider"
          onClick={() => openCompliance('privacy_policy', '隐私政策')}
          hoverClass="settings-hover"
        >
          <Text className="settings-row__label">隐私政策</Text>
          <View className="settings-row__arrow" />
        </Button>
        <Button
          className="settings-row"
          onClick={() => openCompliance('personal_info_list', '个人信息收集清单')}
          hoverClass="settings-hover"
        >
          <Text className="settings-row__label">个人信息收集清单</Text>
          <View className="settings-row__arrow" />
        </Button>
      </View>
    </SettingsShell>
  )
}
