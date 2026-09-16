import { Button, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import { settingsApi } from '@/services/settings'
import type { ComplianceContentDetail } from '@/types/settings'
import SettingsShell from './components/SettingsShell'

export default function HelpServicePage() {
  const [detail, setDetail] = useState<ComplianceContentDetail>()

  useEffect(() => {
    void settingsApi.complianceDetail('help_service')
      .then(setDetail)
      .catch(() => undefined)
  }, [])

  return (
    <SettingsShell title="帮助与客服">
      <View className="help-service-card">
        <View className="help-service-icon"><Text>{detail?.title?.slice(0, 1) || ''}</Text></View>
        <Text className="help-service-card__title">{detail?.title || ''}</Text>
        <Text className="help-service-card__copy">{detail?.summary || detail?.contentBody || ''}</Text>
        <Button
          className="help-service-button"
          openType="contact"
          hoverClass="settings-hover"
        >
          联系客服
        </Button>
      </View>
    </SettingsShell>
  )
}
