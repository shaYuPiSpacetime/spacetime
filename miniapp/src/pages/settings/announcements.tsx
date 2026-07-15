import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { settingsApi } from '@/services/settings'
import type { ContentArticleSummary } from '@/types/settings'
import SettingsShell from './components/SettingsShell'

export default function SettingsAnnouncementsPage() {
  const [records, setRecords] = useState<ContentArticleSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void settingsApi.announcements().then(result => setRecords(result.records || [])).catch(showError).finally(() => setLoading(false))
  }, [])

  return (
    <SettingsShell title="公告栏" scroll>
      <View className="announcement-list">
        {records.map(item => (
          <View
            key={item.id}
            className="announcement-item"
            onClick={() => void Taro.navigateTo({ url: `/pages/settings/content?id=${item.id}&title=${encodeURIComponent(item.title)}` })}
            hoverClass="settings-hover"
          >
            <Text className="announcement-item__title">{item.title}</Text>
            <Text className="announcement-item__summary">{item.summary || item.category || ''}</Text>
            <Text className="announcement-item__time">{item.createTime || ''}</Text>
          </View>
        ))}
        {!loading && records.length === 0 ? <Text className="settings-empty">暂无公告</Text> : null}
        {loading ? <Text className="settings-empty">加载中</Text> : null}
      </View>
    </SettingsShell>
  )
}

async function showError(error: unknown) {
  await Taro.showToast({ title: error instanceof Error ? error.message : '公告加载失败', icon: 'none' })
}
