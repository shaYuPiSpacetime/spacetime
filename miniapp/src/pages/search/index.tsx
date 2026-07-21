import { Button, Input, Text, View } from '@tarojs/components'
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
import type { SearchResultTab, SearchRuntimeConfig, SearchSourceScene } from '@/types/settings'
import { navigateBackOrRedirect } from '@/utils/navigation'
import './search.scss'

const API_TYPE: Record<SearchResultTab, string> = {
  users: 'user',
  posts: 'post',
  topics: 'topic',
}

export default function SearchHomePage() {
  const { params } = useRouter()
  const sourceScene = normalizeSourceScene(params.sourceScene) as SearchSourceScene
  const accountKey = String(useAuthStore.getState().userId || 'guest')
  const storageKey = useMemo(() => searchHistoryStorageKey(accountKey), [accountKey])
  const [keyword, setKeyword] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [searching, setSearching] = useState(false)
  const [runtimeConfig, setRuntimeConfig] = useState<SearchRuntimeConfig>({})
  const [copyConfig, setCopyConfig] = useState<Record<string, string>>({})

  useEffect(() => {
    const stored = Taro.getStorageSync(storageKey)
    setHistory(Array.isArray(stored) ? pushSearchHistory(stored, '') : [])
  }, [storageKey])

  useEffect(() => {
    void Promise.all([
      settingsApi.searchConfig(),
      settingsApi.publicConfig([
        'search.placeholder',
        'search.empty_keyword_text',
        'search.history_empty_text',
        'search.load_failed_text',
        'search.clear_history_title',
        'search.clear_history_content',
        'search.clear_history_cancel',
        'search.clear_history_confirm',
      ]),
    ]).then(([runtime, copy]) => {
      setRuntimeConfig(runtime || {})
      setCopyConfig(copy || {})
    }).catch(() => undefined)
  }, [])

  async function submitSearch(value = keyword) {
    const initial = resolveSearchSubmission(value)
    if (!initial.allowed || searching) {
      if (initial.reason === 'empty') {
        await Taro.showToast({ title: copyConfig['search.empty_keyword_text'] || '', icon: 'none' })
      }
      return
    }
    setSearching(true)
    try {
      const firstTab = searchTabsForScene(sourceScene)[0] as SearchResultTab
      const preview = await settingsApi.search(initial.keyword, API_TYPE[firstTab], 1, 1, sourceScene)
      const submission = resolveSearchSubmission(initial.keyword, { blocked: Boolean(preview.violation) })
      if (!submission.allowed) {
        await Taro.showToast({
          title: preview.message || runtimeConfig.violationText || '',
          icon: 'none',
        })
        return
      }
      const nextHistory = pushSearchHistory(history, submission.keyword)
      Taro.setStorageSync(storageKey, nextHistory)
      setHistory(nextHistory)
      await Taro.navigateTo({
        url: `/pages/search/result?keyword=${encodeURIComponent(submission.keyword)}&sourceScene=${sourceScene}`,
      })
    } catch (error) {
      await Taro.showToast({
        title: error instanceof Error ? error.message : copyConfig['search.load_failed_text'] || '',
        icon: 'none',
      })
    } finally {
      setSearching(false)
    }
  }

  async function clearHistory() {
    const result = await Taro.showModal({
      title: copyConfig['search.clear_history_title'] || '',
      content: copyConfig['search.clear_history_content'] || '',
      cancelText: copyConfig['search.clear_history_cancel'] || '',
      confirmText: copyConfig['search.clear_history_confirm'] || '',
    })
    if (!result.confirm) return
    Taro.removeStorageSync(storageKey)
    setHistory([])
  }

  return (
    <View className="prd06-search-page">
      <LanhuSubNav title="搜索" onBack={() => navigateBackOrRedirect('/pages/index/index')} />
      <View className="search-toolbar">
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
            onConfirm={() => void submitSearch()}
          />
        </View>
        <Button className="search-submit" loading={searching} onClick={() => void submitSearch()}>
          搜索
        </Button>
      </View>

      {history.length > 0 ? (
        <View className="search-history">
          <View className="search-section-heading">
            <Text className="search-section-title">搜索历史</Text>
            <Button className="search-clear" onClick={() => void clearHistory()}>清空</Button>
          </View>
          <View className="search-chip-list">
            {history.map(item => (
              <Button key={item} className="search-chip" onClick={() => {
                setKeyword(item)
                void submitSearch(item)
              }}>
                {item}
              </Button>
            ))}
          </View>
        </View>
      ) : (
        <Text className="search-history-empty">{copyConfig['search.history_empty_text'] || ''}</Text>
      )}
    </View>
  )
}
