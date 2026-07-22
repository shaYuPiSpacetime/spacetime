import { Button, Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import {
  normalizeSourceScene,
  pushSearchHistory,
  resolveSearchSubmission,
  searchHistoryStorageKey,
  searchTabsForScene,
} from '@/domain/prd06Flow'
import { settingsApi } from '@/services/settings'
import { useAuthStore } from '@/stores/authStore'
import type { SearchResultItem, SearchResultTab, SearchRuntimeConfig, SearchSourceScene } from '@/types/settings'
import { navigateBackOrRedirect } from '@/utils/navigation'
import './search.scss'

const TAB_LABELS: Record<SearchResultTab, string> = {
  users: '用户',
  posts: '动态',
  topics: '话题',
}

const API_TYPE: Record<SearchResultTab, string> = {
  users: 'user',
  posts: 'post',
  topics: 'topic',
}

export default function SearchResultPage() {
  const { params } = useRouter()
  const initialKeyword = decodeURIComponent(params.keyword || '').trim()
  const sourceScene = normalizeSourceScene(params.sourceScene) as SearchSourceScene
  const tabs = useMemo(() => searchTabsForScene(sourceScene) as SearchResultTab[], [sourceScene])
  const [keyword, setKeyword] = useState(initialKeyword)
  const [activeTab, setActiveTab] = useState<SearchResultTab>(tabs[0])
  const [records, setRecords] = useState<SearchResultItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [runtimeConfig, setRuntimeConfig] = useState<SearchRuntimeConfig>({})
  const [copyConfig, setCopyConfig] = useState<Record<string, string>>({})
  const storageKey = searchHistoryStorageKey(String(useAuthStore.getState().userId || 'guest'))

  useEffect(() => {
    void Promise.all([
      settingsApi.searchConfig(),
      settingsApi.publicConfig([
        'search.placeholder',
        'search.empty_keyword_text',
        'search.load_failed_text',
        'search.no_result_suggestion',
        'search.topic_unavailable_text',
        'search.loading_text',
        'search.no_more_text',
      ]),
    ]).then(([runtime, copy]) => {
      setRuntimeConfig(runtime || {})
      setCopyConfig(copy || {})
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    void loadResults(activeTab, 1, initialKeyword, false)
  }, [activeTab, initialKeyword])

  async function loadResults(tab: SearchResultTab, targetPage: number, value: string, append: boolean) {
    const submission = resolveSearchSubmission(value)
    if (!submission.allowed || loading) {
      if (submission.reason === 'empty') {
        await Taro.showToast({ title: copyConfig['search.empty_keyword_text'] || '', icon: 'none' })
      }
      return
    }
    setLoading(true)
    try {
      const result = await settingsApi.search(submission.keyword, API_TYPE[tab], targetPage, 20, sourceScene)
      if (result.violation) {
        await Taro.showToast({ title: result.message || runtimeConfig.violationText || '', icon: 'none' })
        navigateBackOrRedirect(`/pages/search/index?sourceScene=${sourceScene}`)
        return
      }
      setRecords(current => append ? [...current, ...(result.items || [])] : (result.items || []))
      setPage(targetPage)
      setHasMore(Boolean(result.hasMore))
      setMessage(result.message || '')
      const currentHistory = Taro.getStorageSync(storageKey)
      Taro.setStorageSync(storageKey, pushSearchHistory(Array.isArray(currentHistory) ? currentHistory : [], submission.keyword))
    } catch (error) {
      await Taro.showToast({
        title: error instanceof Error ? error.message : copyConfig['search.load_failed_text'] || '',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }

  function searchAgain() {
    const submission = resolveSearchSubmission(keyword)
    if (!submission.allowed) {
      void Taro.showToast({ title: copyConfig['search.empty_keyword_text'] || '', icon: 'none' })
      return
    }
    void loadResults(activeTab, 1, submission.keyword, false)
  }

  function openResult(item: SearchResultItem) {
    if (item.type === 'user' || activeTab === 'users') {
      void Taro.navigateTo({ url: `/pages/heart/user?userId=${item.id}` })
      return
    }
    if (item.type === 'post' || activeTab === 'posts') {
      void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${item.id}` })
      return
    }
    void Taro.showToast({ title: copyConfig['search.topic_unavailable_text'] || '', icon: 'none' })
  }

  return (
    <View className="prd06-search-page">
      <LanhuSubNav title="搜索" onBack={() => navigateBackOrRedirect(`/pages/search/index?sourceScene=${sourceScene}`)} />
      <View className="search-toolbar search-toolbar--result">
        <View className="search-input-wrap">
          <View className="search-magnifier" />
          <Input
            className="search-input"
            value={keyword}
            maxlength={30}
            confirmType="search"
            placeholder={copyConfig['search.placeholder'] || ''}
            onInput={event => {
              setKeyword(event.detail.value)
              return event.detail.value
            }}
            onConfirm={searchAgain}
          />
        </View>
        <Button className="search-submit" onClick={searchAgain}>搜索</Button>
      </View>

      <View className="search-tabs" role="tablist">
        {tabs.map(tab => (
          <Button
            key={tab}
            className={`search-tab ${activeTab === tab ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab(tab)
              setRecords([])
              setMessage('')
            }}
          >
            {TAB_LABELS[tab]}
          </Button>
        ))}
      </View>

      <ScrollView
        scrollY
        className="search-result-scroll"
        lowerThreshold={120}
        onScrollToLower={() => hasMore && !loading && void loadResults(activeTab, page + 1, keyword, true)}
      >
        <View className="search-result-list">
          {records.map(item => (
            <Button key={`${item.type}-${item.id}`} className="search-result-row" onClick={() => openResult(item)}>
              {item.avatar ? (
                <Image className="search-result-avatar" src={item.avatar} mode="aspectFill" />
              ) : (
                <View className="search-result-avatar search-result-avatar--fallback">
                  <Text>{item.title.slice(0, 1)}</Text>
                </View>
              )}
              <View className="search-result-copy">
                <Text className="search-result-title">{item.title}</Text>
                <Text className="search-result-subtitle">{item.subtitle || ''}</Text>
              </View>
              <View className="search-result-chevron" />
            </Button>
          ))}
          {!loading && records.length === 0 ? (
            <View className="search-result-empty">
              <Text className="search-result-empty__title">{runtimeConfig.emptyStateText || ''}</Text>
              <Text className="search-result-empty__copy">{message || copyConfig['search.no_result_suggestion'] || ''}</Text>
            </View>
          ) : null}
          {loading ? <Text className="search-result-loading">{copyConfig['search.loading_text'] || ''}</Text> : null}
          {!loading && records.length > 0 && !hasMore ? <Text className="search-result-loading">{copyConfig['search.no_more_text'] || ''}</Text> : null}
        </View>
      </ScrollView>
    </View>
  )
}
