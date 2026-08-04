import { Image, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import NativeNavigation, { getNativeNavigationMetrics } from '@/components/NativeNavigation'
import {
  deleteCommunityDraft,
  COMMUNITY_COPY_KEYS,
  getCommunityDraft,
  getCommunityMeta,
  publishCommunityPost,
  resolveCommunityCopy,
  resolveCommunityFeedback,
  saveCommunityDraft,
  type CommunityConfig,
  type CommunityContentType,
  type CommunityUploadStatus,
} from '@/services/community'
import { prd01Api } from '@/services/prd01'

const BLUE = '#2876FF'
const NAVY = '#0C285A'
interface UploadImage {
  localId: string
  tempPath: string
  url?: string
  objectKey?: string
  uploadStatus: CommunityUploadStatus
  failureMessage?: string
}

export default function QianxunComposePage() {
  const navigationMetrics = getNativeNavigationMetrics()
  const [postType, setPostType] = useState<CommunityContentType>('community_post')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<UploadImage[]>([])
  const [config, setConfig] = useState<CommunityConfig>()
  const [topicId, setTopicId] = useState<number>()
  const [initialTopicName, setInitialTopicName] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [topicSheetVisible, setTopicSheetVisible] = useState(false)
  const [failureFeedback, setFailureFeedback] = useState('')
  const hydratedRef = useRef(false)
  const postTypeRef = useRef<CommunityContentType>('community_post')
  const draftVersionRef = useRef<number>()
  const saveSequenceRef = useRef(0)

  useLoad(params => {
    const initialTopicId = Number(params.topicId)
    if (Number.isFinite(initialTopicId) && initialTopicId > 0) setTopicId(initialTopicId)
    if (params.topicName) setInitialTopicName(decodeURIComponent(params.topicName))
    if (params.postType === 'sincere_post') {
      postTypeRef.current = 'sincere_post'
      setPostType('sincere_post')
    }
  })

  useDidShow(() => {
    if (hydratedRef.current) return
    void loadRuntimeAndDraft()
  })

  const loadRuntimeAndDraft = async () => {
    try {
      const contentType = postTypeRef.current
      const [runtime, draft] = await Promise.all([getCommunityMeta(), getCommunityDraft(contentType)])
      setConfig(runtime)
      if (draft) {
        setContent(draft.content || '')
        setImages((draft.images || []).filter(item => item.url).map((item, index) => ({
          localId: `draft-${index}-${item.objectKey || item.url}`,
          tempPath: item.url,
          url: item.url,
          objectKey: item.objectKey,
          uploadStatus: 'success',
        })))
        draftVersionRef.current = draft.version
      }
      setTopicId(current => current || draft?.topicId || toTopicId(runtime.topics?.[0]?.code))
    } catch (error) {
      await showError(config, error)
    } finally {
      hydratedRef.current = true
    }
  }

  useEffect(() => {
    if (!hydratedRef.current || publishing) return undefined
    const successfulImages = images.filter(item => item.uploadStatus === 'success' && item.url)
    if (!content.trim() && !topicId && !successfulImages.length) return undefined
    const sequence = saveSequenceRef.current + 1
    saveSequenceRef.current = sequence
    const timer = setTimeout(() => {
      void saveCommunityDraft(postType, {
        content,
        topicId,
        images: successfulImages.map(item => ({ url: item.url!, objectKey: item.objectKey })),
        version: draftVersionRef.current,
      }).then(draft => {
        if (draft.version !== undefined) draftVersionRef.current = Math.max(draftVersionRef.current || 0, draft.version)
      }).catch(() => undefined)
    }, 2000)
    return () => clearTimeout(timer)
  }, [content, images, postType, publishing, topicId])

  const selectedTopic = useMemo(
    () => config?.topics?.find(topic => toTopicId(topic.code) === topicId)
      || (topicId && initialTopicName ? { code: String(topicId), label: initialTopicName } : undefined),
    [config?.topics, initialTopicName, topicId],
  )

  const chooseImages = async () => {
    const maxCount = Math.max(1, Number(config?.postMaxImages || 9))
    const remaining = maxCount - images.length
    if (remaining <= 0) return
    try {
      const result = await Taro.chooseImage({ count: remaining, sizeType: ['original'], sourceType: ['album', 'camera'] })
      const paths = result.tempFilePaths || []
      if (!paths.length) return
      const queued = paths.map((tempPath, index) => ({
        localId: `${Date.now()}-${index}-${tempPath}`,
        tempPath,
        uploadStatus: 'queued' as const,
      }))
      setImages(current => [...current, ...queued].slice(0, maxCount))
      for (const item of queued) await uploadImage(item)
    } catch (error) {
      if (!/cancel/i.test(String((error as { errMsg?: string })?.errMsg || error))) await showError(config, error)
    }
  }

  const uploadImage = async (item: UploadImage) => {
    setImages(current => current.map(image => image.localId === item.localId ? { ...image, uploadStatus: 'uploading', failureMessage: undefined } : image))
    try {
      const uploaded = await prd01Api.uploadAlbum(item.tempPath)
      setImages(current => current.map(image => image.localId === item.localId ? {
        ...image,
        url: uploaded.url,
        objectKey: uploaded.key,
        uploadStatus: 'success',
        failureMessage: undefined,
      } : image))
    } catch (error) {
      setImages(current => current.map(image => image.localId === item.localId ? {
        ...image,
        uploadStatus: 'failed',
        failureMessage: error instanceof Error ? error.message : String(error),
      } : image))
    }
  }

  const goBack = async () => {
    try {
      await deleteCommunityDraft(postType)
    } catch (error) {
      await showError(config, error)
      return
    }
    await Taro.navigateBack()
  }

  const handlePublish = async () => {
    if (!content.trim()) {
      await Taro.showToast({ title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.composeContentRequired), icon: 'none' })
      return
    }
    if (!topicId) {
      setTopicSheetVisible(true)
      return
    }
    const incomplete = images.some(item => item.uploadStatus !== 'success')
    if (incomplete) {
      showFailureFeedback(COMMUNITY_COPY_KEYS.uploadIncomplete)
      return
    }
    if (publishing) return
    setPublishing(true)
    try {
      const publishResult = await publishCommunityPost(content.trim(), images.map(item => item.url!).filter(Boolean), topicId, postType)
      await deleteCommunityDraft(postType).catch(() => undefined)
      await Taro.redirectTo({ url: `/pages/qianxun/interactions?section=mine&postNo=${encodeURIComponent(publishResult.postNo)}&status=${encodeURIComponent(publishResult.status)}` })
    } catch (error) {
      showFailureFeedback(COMMUNITY_COPY_KEYS.publishFailed, error)
    } finally {
      setPublishing(false)
    }
  }

  const showFailureFeedback = (key: string, source?: unknown) => {
    setFailureFeedback(resolveCommunityFeedback(config, key, source))
    setTimeout(() => setFailureFeedback(''), 2200)
  }

  const maxImages = Number(config?.postMaxImages || 9)
  const hasIncompleteImage = images.some(item => item.uploadStatus !== 'success')
  const canPublish = Boolean(content.trim() && topicId && !publishing && !hasIncompleteImage)

  return (
    <View id="qianxun-compose-page" style={{ height: '100vh', background: '#FFFFFF', overflow: 'hidden' }}>
      <PageHeader title={postType === 'sincere_post' ? '发布诚意贴' : '发布动态'} onBack={() => void goBack()} />
      <ScrollView scrollY style={{ position: 'absolute', left: 0, right: 0, top: `${navigationMetrics.navigationHeight}rpx`, bottom: '184rpx', boxSizing: 'border-box' }} showScrollbar={false}>
        <Textarea
          value={content}
          maxlength={Number(config?.postMaxTextLength || 500)}
          placeholder="记录生活，展现真实的你"
          placeholderStyle="color:#999999;font-size:28rpx;line-height:40rpx"
          onInput={event => setContent(event.detail.value)}
          style={{ width: '700rpx', minHeight: '218rpx', margin: '22rpx 25rpx 0', color: '#333333', fontSize: '28rpx', lineHeight: '44rpx', boxSizing: 'border-box' }}
        />
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '10rpx', padding: '26rpx 25rpx' }}>
          {images.map((item, index) => (
            <View key={item.localId} style={{ position: 'relative', width: '226rpx', height: '226rpx' }}>
              <Image src={item.url || item.tempPath} mode="aspectFill" style={{ width: '226rpx', height: '226rpx', borderRadius: '8rpx' }} />
              <View onClick={() => setImages(items => items.filter((_, itemIndex) => itemIndex !== index))} style={{ position: 'absolute', right: '6rpx', top: '6rpx', width: '34rpx', height: '34rpx', borderRadius: '17rpx', background: 'rgba(20,32,48,.68)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '22rpx' }}>×</Text></View>
              {item.uploadStatus !== 'success' ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: '48rpx', background: 'rgba(20,32,48,.68)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text onClick={() => item.uploadStatus === 'failed' && void uploadImage(item)} style={{ color: '#FFFFFF', fontSize: '21rpx' }}>{resolveCommunityCopy(config, item.uploadStatus === 'failed' ? COMMUNITY_COPY_KEYS.uploadRetry : COMMUNITY_COPY_KEYS.uploading)}</Text></View> : null}
            </View>
          ))}
          {images.length < maxImages ? <View onClick={() => void chooseImages()} style={{ width: '226rpx', height: '226rpx', borderRadius: '8rpx', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#80899A', fontSize: '68rpx', fontWeight: 200 }}>＋</Text></View> : null}
        </View>
      </ScrollView>

      <View style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#FFFFFF', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 10 }}>
        <ScrollView scrollX style={{ width: '750rpx', height: '70rpx', whiteSpace: 'nowrap' }} showScrollbar={false}>
          <View style={{ display: 'inline-flex', height: '70rpx', padding: '10rpx 27rpx', boxSizing: 'border-box' }}>
            <TopicChip label={selectedTopic ? `# ${selectedTopic.label}` : '添加话题'} active onClick={() => setTopicSheetVisible(true)} />
            {(config?.topics || []).filter(item => toTopicId(item.code) !== topicId).slice(0, 3).map(topic => <TopicChip key={topic.code} label={`# ${topic.label}`} onClick={() => setTopicId(toTopicId(topic.code))} />)}
          </View>
        </ScrollView>
        <View style={{ height: '2rpx', background: '#EFF4FC' }} />
        <View style={{ height: '98rpx', padding: '13rpx 25rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
          <ToolIcon kind="image" onClick={() => void chooseImages()} />
          <ToolIcon kind="video" onClick={() => void Taro.showToast({ title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.videoUnavailable), icon: 'none' })} />
          <ToolIcon kind="smile" onClick={() => void Taro.showToast({ title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emojiUnavailable), icon: 'none' })} />
          <Text style={{ color: '#999999', fontSize: '23rpx' }}>{images.length}/{maxImages}</Text>
          <View style={{ flex: 1 }} />
          <View onClick={() => void handlePublish()} style={{ width: '148rpx', height: '66rpx', borderRadius: '8rpx', background: canPublish ? BLUE : '#F4F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: canPublish ? '#FFFFFF' : '#999999', fontSize: '28rpx', fontWeight: 500 }}>{publishing ? resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.publishing) : '发布'}</Text></View>
        </View>
      </View>

      {topicSheetVisible ? <TopicSheet topics={config?.topics || []} onSelect={id => { setTopicId(id); setTopicSheetVisible(false) }} onClose={() => setTopicSheetVisible(false)} /> : null}
      {failureFeedback ? <PublishFailureFeedback title={resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.publishFailedTitle)} message={failureFeedback} /> : null}
    </View>
  )
}

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <NativeNavigation title={title} onBack={onBack} titleFontWeight={500} />
}

function TopicChip({ label, active = false, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return <View onClick={onClick} style={{ height: '50rpx', borderRadius: '25rpx', background: active ? '#E3F1FE' : '#F4F4F6', padding: '0 20rpx', marginRight: '12rpx', display: 'flex', alignItems: 'center', flexShrink: 0 }}><Text style={{ color: active ? BLUE : '#999999', fontSize: '24rpx', whiteSpace: 'nowrap' }}>{label}</Text></View>
}

function ToolIcon({ kind, onClick }: { kind: 'image' | 'video' | 'smile'; onClick: () => void }) {
  const glyph = kind === 'image' ? '▧' : kind === 'video' ? '▻' : '☺'
  return <View onClick={onClick} style={{ width: '56rpx', height: '56rpx', marginRight: '14rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#7D8796', fontSize: kind === 'smile' ? '38rpx' : '42rpx', lineHeight: '48rpx' }}>{glyph}</Text></View>
}

function PublishFailureFeedback({ title, message }: { title: string; message: string }) {
  return <View style={{ position: 'fixed', inset: 0, zIndex: 110, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><View style={{ width: '390rpx', minHeight: '142rpx', borderRadius: '16rpx', background: 'rgba(38,45,56,.78)', padding: '26rpx 30rpx', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 600 }}>{title}</Text><Text style={{ color: '#FFFFFF', fontSize: '23rpx', lineHeight: '34rpx', marginTop: '12rpx', textAlign: 'center' }}>{message}</Text></View></View>
}

function TopicSheet({ topics, onSelect, onClose }: { topics: CommunityConfig['topics']; onSelect: (id: number) => void; onClose: () => void }) {
  const chooseTopic = (code: string) => {
    const id = toTopicId(code)
    if (id) onSelect(id)
  }
  return <View onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.32)', zIndex: 120 }}><View onClick={event => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '610rpx', borderRadius: '24rpx 24rpx 0 0', background: '#FFFFFF', paddingBottom: 'env(safe-area-inset-bottom)', overflow: 'hidden' }}><Text style={{ display: 'block', color: NAVY, fontSize: '30rpx', fontWeight: 600, lineHeight: '86rpx', textAlign: 'center' }}>添加话题</Text><ScrollView scrollY style={{ maxHeight: '500rpx' }}>{topics.map(topic => <View key={topic.code} onClick={() => chooseTopic(topic.code)} style={{ height: '74rpx', padding: '0 30rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#333333', fontSize: '26rpx' }}># {topic.label}</Text><View style={{ flex: 1 }} /><Text style={{ color: '#A7A7A7', fontSize: '21rpx' }}>参与讨论</Text></View>)}</ScrollView></View></View>
}

function toTopicId(code: string | undefined) {
  const id = Number(code)
  return Number.isFinite(id) && id > 0 ? id : undefined
}

async function showError(config: CommunityConfig | undefined, error: unknown) {
  const title = resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.genericError, error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
