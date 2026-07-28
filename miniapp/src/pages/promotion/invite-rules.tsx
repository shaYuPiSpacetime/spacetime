import { Button, RichText, Text, View, WebView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { getInviteRulesH5 } from '@/services/promotion'
import type { InviteRulesH5VO } from '@/types/promotion'
import './invite-rules.scss'

const CACHE_KEY = 'promotion_invite_rules_h5_cache_v1'

type ContentSource = 'current' | 'cache' | 'unavailable'

function readCache(): InviteRulesH5VO | undefined {
  const cached = Taro.getStorageSync(CACHE_KEY)
  if (!cached || typeof cached !== 'object') return undefined
  const value = cached as InviteRulesH5VO
  if (!value.version || (!value.htmlSnapshot && !value.snapshotUrl)) return undefined
  return value
}

function writeCache(content: InviteRulesH5VO) {
  if (!content.htmlSnapshot && !content.snapshotUrl) return
  Taro.setStorageSync(CACHE_KEY, content)
}

function safeWebUrl(content?: InviteRulesH5VO) {
  const value = content?.snapshotUrl || content?.url || ''
  return /^https:\/\/[^\s]+$/i.test(value) ? value : ''
}

function sanitizeRichTextSnapshot(html: string) {
  return html
    .replace(/<(script|iframe|object|embed|form|input|button)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|iframe|object|embed|form|input|button)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '')
}

function hasRenderableContent(content?: InviteRulesH5VO) {
  return Boolean(content?.htmlSnapshot?.trim() || safeWebUrl(content))
}

export default function InviteRulesPage() {
  const [content, setContent] = useState<InviteRulesH5VO>()
  const [source, setSource] = useState<ContentSource>('current')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const useCachedContent = useCallback((errorMessage: string) => {
    const cached = readCache()
    if (hasRenderableContent(cached)) {
      setContent(cached)
      setSource('cache')
      setMessage(errorMessage)
      return true
    }
    setContent(undefined)
    setSource('unavailable')
    setMessage(errorMessage)
    return false
  }, [])

  const loadCurrent = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const current = await getInviteRulesH5()
      if (current.enabled === false || !hasRenderableContent(current)) {
        useCachedContent('当前邀请规则暂未启用')
        return
      }
      setContent(current)
      setSource('current')
      if (current.htmlSnapshot) writeCache(current)
    } catch (reason) {
      useCachedContent(reason instanceof Error ? reason.message : '当前邀请规则加载失败')
    } finally {
      setLoading(false)
    }
  }, [useCachedContent])

  useEffect(() => {
    void loadCurrent()
  }, [loadCurrent])

  const handleContentLoad = () => {
    if (source === 'current' && content?.snapshotUrl) writeCache(content)
  }

  const handleContentError = () => {
    if (source === 'current') {
      useCachedContent('当前内容加载失败')
      return
    }
    setContent(undefined)
    setSource('unavailable')
    setMessage('最近成功版本也无法加载')
  }

  const backHome = () => {
    if (Taro.getCurrentPages().length > 1) {
      void Taro.navigateBack()
      return
    }
    void Taro.redirectTo({ url: '/pages/promotion/invite-home' })
  }

  const webUrl = safeWebUrl(content)
  const showWebView = source !== 'unavailable' && !loading && Boolean(webUrl) && !content?.htmlSnapshot

  if (showWebView && webUrl) {
    return (
      <View className="promotion-rules-page promotion-rules-page--web">
        <NativeNavigation
          title={content?.title || '邀请规则'}
          showBack
          onBack={backHome}
        />
        {source === 'cache' ? (
          <CacheNotice version={content?.version} onRetry={loadCurrent} />
        ) : null}
        <WebView src={webUrl} onLoad={handleContentLoad} onError={handleContentError} />
      </View>
    )
  }

  return (
    <View className="promotion-rules-page">
      <NativeNavigation
        title={content?.title || '邀请规则'}
        showBack
        onBack={backHome}
      />
      {source === 'cache' && !loading ? (
        <CacheNotice version={content?.version} onRetry={loadCurrent} />
      ) : null}

      {loading ? (
        <View className="promotion-rules-loading">
          <View /><View /><View /><View />
          <Text>邀请规则加载中</Text>
        </View>
      ) : null}

      {!loading && source !== 'unavailable' && content?.htmlSnapshot ? (
        <View className="promotion-rules-document">
          <View className="promotion-rules-meta">
            <Text>{content.title || '邀请规则'}</Text>
            <Text>{content.version}{content.updatedAt ? ` · ${content.updatedAt}` : ''}</Text>
          </View>
          <RichText
            className="promotion-rules-richtext"
            nodes={sanitizeRichTextSnapshot(content.htmlSnapshot)}
          />
          <Button className="promotion-contact-button" openType="contact">仍有疑问？联系客服</Button>
        </View>
      ) : null}

      {!loading && source === 'unavailable' ? (
        <View className="promotion-rules-unavailable">
          <View className="promotion-rules-unavailable__icon">!</View>
          <Text className="promotion-rules-unavailable__title">内容暂不可查看</Text>
          <Text className="promotion-rules-unavailable__message">
            {message || '当前邀请规则与最近成功缓存均未能加载，请稍后重试。'}
          </Text>
          <Button className="promotion-rules-primary" onClick={() => void loadCurrent()}>重新加载</Button>
          <Button className="promotion-rules-secondary" onClick={backHome}>返回邀请首页</Button>
          <Button className="promotion-rules-contact-link" openType="contact">联系客服</Button>
        </View>
      ) : null}
    </View>
  )
}

function CacheNotice({
  version,
  onRetry,
}: {
  version?: string
  onRetry: () => Promise<void>
}) {
  return (
    <View className="promotion-cache-notice">
      <View>!</View>
      <View>
        <Text>当前内容加载失败，正在展示最近成功版本</Text>
        <Text>{version ? `缓存版本 ${version}` : '最近成功缓存'}</Text>
      </View>
      <Button onClick={() => void onRetry()}>重试</Button>
    </View>
  )
}
