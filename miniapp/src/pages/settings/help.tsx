import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { settingsApi } from '@/services/settings'
import type { ComplianceContentDetail } from '@/types/settings'
import SettingsShell from './components/SettingsShell'

export default function HelpServicePage() {
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<ComplianceContentDetail>()
  const [copyConfig, setCopyConfig] = useState<Record<string, string>>({})

  useEffect(() => {
    void Promise.all([
      settingsApi.complianceDetail('help_service'),
      settingsApi.publicConfig([
        'help.service_cta',
        'help.service_loading',
        'help.service_unavailable',
      ]),
    ])
      .then(([content, copy]) => {
        setDetail(content)
        setCopyConfig(copy || {})
        setAvailable(Boolean(content?.contentUrl?.trim()))
      })
      .catch(() => setAvailable(false))
      .finally(() => setLoading(false))
  }, [])

  function contactService() {
    if (!available || !detail?.contentUrl?.trim()) {
      void Taro.showToast({ title: copyConfig['help.service_unavailable'] || '', icon: 'none' })
      return
    }
    void Taro.navigateTo({
      url: `/pages/settings/content?contentCode=help_service&title=${encodeURIComponent(detail?.title || '')}`,
    })
  }

  return (
    <SettingsShell title="帮助与客服">
      <View className="help-service-card">
        <View className="help-service-icon"><Text>{detail?.title?.slice(0, 1) || ''}</Text></View>
        <Text className="help-service-card__title">{detail?.title || ''}</Text>
        <Text className="help-service-card__copy">{detail?.summary || detail?.contentBody || ''}</Text>
        <Button
          className={`help-service-button ${!loading && available ? '' : 'is-disabled'}`}
          onClick={contactService}
          hoverClass={available ? 'settings-hover' : 'none'}
        >
          {loading
            ? copyConfig['help.service_loading'] || ''
            : available
              ? copyConfig['help.service_cta'] || ''
              : copyConfig['help.service_unavailable'] || ''}
        </Button>
      </View>
    </SettingsShell>
  )
}
