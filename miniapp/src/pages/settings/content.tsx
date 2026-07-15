import { Text, View, WebView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { settingsApi } from '@/services/settings'
import type { ContentArticleDetail } from '@/types/settings'
import './settings.scss'

export default function SettingsContentPage() {
  const { params } = useRouter()
  const title = decodeURIComponent(params.title || '内容')
  const url = params.url ? decodeURIComponent(params.url) : ''
  const articleId = Number(params.id || 0)
  const [article, setArticle] = useState<ContentArticleDetail>()
  const [error, setError] = useState('')

  useEffect(() => {
    void Taro.setNavigationBarTitle({ title })
    if (!articleId) return
    void settingsApi.articleDetail(articleId).then(setArticle).catch(reason => {
      setError(reason instanceof Error ? reason.message : '内容加载失败')
    })
  }, [articleId, title])

  if (url) return <WebView src={url} />
  return (
    <View className="settings-article-page">
      {article ? (
        <>
          <Text className="settings-article__title">{article.title}</Text>
          <Text className="settings-article__time">{article.createTime || ''}</Text>
          <Text className="settings-article__body">{article.contentBody || article.summary || ''}</Text>
        </>
      ) : <Text className="settings-article__empty">{error || '加载中'}</Text>}
    </View>
  )
}
