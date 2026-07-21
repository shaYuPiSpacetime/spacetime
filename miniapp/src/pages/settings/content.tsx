import { Button, RichText, Text, View, WebView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveCompliancePresentation } from '@/domain/prd06Flow'
import { settingsApi } from '@/services/settings'
import type { ComplianceContentDetail, ContentArticleDetail } from '@/types/settings'
import './settings.scss'

export default function SettingsContentPage() {
  const { params } = useRouter()
  const fallbackTitle = decodeURIComponent(params.title || '内容')
  const contentCode = decodeURIComponent(params.contentCode || '')
  const articleId = Number(params.id || 0)
  const [article, setArticle] = useState<ContentArticleDetail | ComplianceContentDetail>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [copyConfig, setCopyConfig] = useState<Record<string, string>>({})

  const loadContent = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [detail, copy] = await Promise.all([
        contentCode
          ? settingsApi.complianceDetail(contentCode)
          : articleId
            ? settingsApi.articleDetail(articleId)
            : Promise.resolve(undefined),
        settingsApi.publicConfig([
          'content.missing_text',
          'content.loading_text',
          'content.retry_text',
          'content.load_failed_text',
          'content.effective_time_suffix',
        ]),
      ])
      setArticle(detail)
      setCopyConfig(copy || {})
    } catch (reason) {
      setArticle(undefined)
      setError(reason instanceof Error ? reason.message : '')
    } finally {
      setLoading(false)
    }
  }, [articleId, contentCode])

  useEffect(() => {
    void loadContent()
  }, [loadContent])

  const presentation = useMemo(
    () => resolveCompliancePresentation(article ? {
      ...article,
      title: article.title || fallbackTitle,
      linkType: 'linkType' in article ? article.linkType : article.contentType,
    } : undefined),
    [article, fallbackTitle],
  )

  useEffect(() => {
    void Taro.setNavigationBarTitle({ title: presentation.title || fallbackTitle })
  }, [fallbackTitle, presentation.title])

  const complianceArticle = article && 'contentCode' in article ? article : undefined
  const legacyArticle = article && !('contentCode' in article) ? article : undefined
  const meta = complianceArticle
    ? `${complianceArticle.version || ''}${complianceArticle.effectiveTime
      ? ` · ${complianceArticle.effectiveTime}${copyConfig['content.effective_time_suffix'] || ''}`
      : ''}`
    : legacyArticle?.createTime || ''

  if (presentation.mode === 'h5') return <WebView src={presentation.url} />
  return (
    <View className="settings-article-page">
      {presentation.mode === 'native' ? (
        <>
          <Text className="settings-article__title">{presentation.title}</Text>
          <Text className="settings-article__time">{meta}</Text>
          <RichText className="settings-article__body" nodes={presentation.body} />
        </>
      ) : (
        <View className="settings-content-empty">
          <Text className="settings-article__empty">
            {loading
              ? copyConfig['content.loading_text'] || ''
              : error || presentation.message || copyConfig['content.missing_text'] || ''}
          </Text>
          {!loading ? (
            <Button className="settings-content-retry" onClick={() => void loadContent()}>
              {copyConfig['content.retry_text'] || ''}
            </Button>
          ) : null}
        </View>
      )}
    </View>
  )
}
