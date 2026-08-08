import { Image, MovableArea, MovableView, ScrollView, Text, Textarea, View } from '@tarojs/components'
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
import { resolveCommunityImageUploadError } from '@/domain/communityImageUpload'

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
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const hydratedRef = useRef(false)
  const choosingImagesRef = useRef(false)
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
      setTopicId(current => current || draft?.topicId)
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
    if (choosingImagesRef.current) return
    const maxCount = Math.max(1, Number(config?.postMaxImages || 9))
    const remaining = maxCount - images.length
    if (remaining <= 0) return
    choosingImagesRef.current = true
    try {
      const result = await Taro.chooseImage({ count: remaining, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      const paths = result.tempFilePaths || []
      if (!paths.length) return
      const queued = paths.map((tempPath, index) => ({
        localId: `${Date.now()}-${index}-${tempPath}`,
        tempPath,
        uploadStatus: 'queued' as const,
      }))
      setImages(current => [...current, ...queued].slice(0, maxCount))
      void uploadImagesWithLimit(queued)
    } catch (error) {
      if (!/cancel/i.test(String((error as { errMsg?: string })?.errMsg || error))) await showError(config, error)
    } finally {
      choosingImagesRef.current = false
    }
  }

  const uploadImagesWithLimit = async (items: UploadImage[]) => {
    let cursor = 0
    const workerCount = Math.min(3, items.length)
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (cursor < items.length) {
        const current = items[cursor]
        cursor += 1
        await uploadImage(current)
      }
    }))
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
        failureMessage: resolveCommunityImageUploadError(error),
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
  const canPublish = Boolean(content.trim() && !publishing && !hasIncompleteImage)

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
              <Image
                id={`qianxun-compose-image-thumbnail-${index}`}
                data-role="compose-image-thumbnail"
                src={item.url || item.tempPath}
                mode="aspectFill"
                onClick={() => item.uploadStatus === 'success' && setPreviewImageUrl(item.url || item.tempPath)}
                style={{ width: '226rpx', height: '226rpx', borderRadius: '8rpx' }}
              />
              <View
                onClick={(event) => {
                  event.stopPropagation()
                  setImages(items => items.filter((_, itemIndex) => itemIndex !== index))
                }}
                style={{ position: 'absolute', right: '6rpx', top: '6rpx', width: '34rpx', height: '34rpx', borderRadius: '17rpx', background: 'rgba(20,32,48,.68)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ComposeRemoveImageIcon />
              </View>
              {item.uploadStatus !== 'success' ? (
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: '48rpx', background: 'rgba(20,32,48,.68)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: '20rpx', lineHeight: '28rpx', textAlign: 'center', padding: '8rpx 12rpx' }}>{item.uploadStatus === 'failed' ? item.failureMessage || '图片上传失败' : resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.uploading)}</Text>
                </View>
              ) : null}
            </View>
          ))}
          {images.length > 0 && images.length < maxImages ? <View onClick={() => void chooseImages()} style={{ width: '226rpx', height: '226rpx', borderRadius: '8rpx', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ComposeAddImageIcon /></View> : null}
        </View>
      </ScrollView>

      <View style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#FFFFFF', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 10 }}>
        <ScrollView scrollX style={{ width: '750rpx', height: '70rpx', whiteSpace: 'nowrap' }} showScrollbar={false}>
          <View style={{ display: 'inline-flex', height: '70rpx', padding: '10rpx 27rpx', boxSizing: 'border-box' }}>
            <TopicChip label={selectedTopic?.label || '添加话题'} active removable={Boolean(selectedTopic)} onClick={() => setTopicSheetVisible(true)} />
            {(config?.topics || []).filter(item => toTopicId(item.code) !== topicId).slice(0, 3).map(topic => <TopicChip key={topic.code} label={topic.label} onClick={() => setTopicId(toTopicId(topic.code))} />)}
          </View>
        </ScrollView>
        <View style={{ height: '2rpx', background: '#EFF4FC' }} />
        <View style={{ height: '98rpx', padding: '13rpx 25rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
          <ToolIcon kind="image" onClick={() => void chooseImages()} />
          <ToolIcon kind="video" onClick={() => void Taro.showToast({ title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.videoUnavailable), icon: 'none' })} />
          <ToolIcon kind="smile" onClick={() => void Taro.showToast({ title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emojiUnavailable), icon: 'none' })} />
          <View style={{ flex: 1 }} />
          <View onClick={() => void handlePublish()} style={{ width: '148rpx', height: '66rpx', borderRadius: '8rpx', background: canPublish ? BLUE : '#F4F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: canPublish ? '#FFFFFF' : '#999999', fontSize: '28rpx', fontWeight: 500 }}>{publishing ? resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.publishing) : '发布'}</Text></View>
        </View>
      </View>

      {topicSheetVisible ? <TopicSheet topics={config?.topics || []} onSelect={id => { setTopicId(id); setTopicSheetVisible(false) }} onClose={() => setTopicSheetVisible(false)} /> : null}
      {failureFeedback ? <PublishFailureFeedback title={resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.publishFailedTitle)} message={failureFeedback} /> : null}
      {previewImageUrl ? <ImagePreview src={previewImageUrl} closeTop={navigationMetrics.menuTop} onClose={() => setPreviewImageUrl('')} /> : null}
    </View>
  )
}

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <NativeNavigation title={title} onBack={onBack} titleFontWeight={500} />
}

function TopicChip({ label, active = false, removable = false, onClick }: { label: string; active?: boolean; removable?: boolean; onClick: () => void }) {
  return (
    <View onClick={onClick} style={{ height: '50rpx', borderRadius: '25rpx', background: active ? '#E3F1FE' : '#F4F4F6', padding: active ? '0 14rpx 0 10rpx' : '0 20rpx', marginRight: '12rpx', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {active ? <View id="qianxun-compose-topic-leading-icon" data-role="compose-topic-leading-icon" style={{ width: '34rpx', height: '34rpx', borderRadius: '17rpx', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '9rpx', flexShrink: 0 }}><Text style={{ color: '#FFFFFF', fontSize: '27rpx', lineHeight: '32rpx', fontWeight: 500 }}>#</Text></View> : <Text style={{ color: '#999999', fontSize: '24rpx', marginRight: '7rpx' }}>#</Text>}
      <Text style={{ color: active ? BLUE : '#999999', fontSize: '24rpx', whiteSpace: 'nowrap' }}>{label}</Text>
      {active ? <TopicTrailingIcon removable={removable} /> : null}
    </View>
  )
}

function ToolIcon({ kind, onClick }: { kind: 'image' | 'video' | 'smile'; onClick: () => void }) {
  return (
    <View id={`qianxun-compose-tool-${kind}`} data-role={`compose-tool-${kind}`} onClick={onClick} hoverClass="btn-hover" style={{ width: '56rpx', height: '56rpx', marginRight: '18rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {kind === 'image' ? <ComposePhotoIcon /> : kind === 'video' ? <ComposeVideoIcon /> : <ComposeSmileIcon />}
    </View>
  )
}

function ComposePhotoIcon() {
  return (
    <View data-role="compose-tool-image" aria-hidden style={{ position: 'relative', width: '46rpx', height: '40rpx', border: '4rpx solid #343434', borderRadius: '7rpx', boxSizing: 'border-box' }}>
      <View style={{ position: 'absolute', left: '7rpx', top: '7rpx', width: '9rpx', height: '9rpx', borderRadius: '50%', background: BLUE }} />
      <View style={{ position: 'absolute', left: '5rpx', bottom: '7rpx', width: '18rpx', height: '4rpx', borderRadius: '2rpx', background: '#343434', transform: 'rotate(-28deg)', transformOrigin: 'left center' }} />
      <View style={{ position: 'absolute', left: '19rpx', bottom: '8rpx', width: '18rpx', height: '4rpx', borderRadius: '2rpx', background: '#343434', transform: 'rotate(31deg)', transformOrigin: 'left center' }} />
    </View>
  )
}

function ComposeVideoIcon() {
  return (
    <View data-role="compose-tool-video" aria-hidden style={{ position: 'relative', width: '46rpx', height: '40rpx', border: '4rpx solid #343434', borderRadius: '7rpx', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 0, height: 0, borderTop: '10rpx solid transparent', borderBottom: '10rpx solid transparent', borderLeft: `14rpx solid ${BLUE}`, marginLeft: '4rpx' }} />
    </View>
  )
}

function ComposeSmileIcon() {
  return (
    <View data-role="compose-tool-smile" aria-hidden style={{ position: 'relative', width: '42rpx', height: '42rpx', border: '4rpx solid #343434', borderRadius: '50%', boxSizing: 'border-box' }}>
      <View style={{ position: 'absolute', left: '8rpx', top: '10rpx', width: '5rpx', height: '5rpx', borderRadius: '50%', background: '#343434' }} />
      <View style={{ position: 'absolute', right: '8rpx', top: '10rpx', width: '5rpx', height: '5rpx', borderRadius: '50%', background: '#343434' }} />
      <View style={{ position: 'absolute', left: '8rpx', bottom: '7rpx', width: '18rpx', height: '9rpx', borderBottom: '4rpx solid #343434', borderRadius: '0 0 18rpx 18rpx', boxSizing: 'border-box' }} />
    </View>
  )
}

function ComposeAddImageIcon() {
  return (
    <View id="qianxun-compose-add-image-icon" data-role="compose-add-image-icon" aria-hidden style={{ position: 'relative', width: '64rpx', height: '64rpx' }}>
      <View style={{ position: 'absolute', left: '29rpx', top: 0, width: '6rpx', height: '64rpx', borderRadius: '3rpx', background: '#8A91A2' }} />
      <View style={{ position: 'absolute', left: 0, top: '29rpx', width: '64rpx', height: '6rpx', borderRadius: '3rpx', background: '#8A91A2' }} />
    </View>
  )
}

function ComposeRemoveImageIcon() {
  return (
    <View data-role="compose-remove-image-icon" aria-hidden style={{ position: 'relative', width: '22rpx', height: '22rpx' }}>
      <View style={{ position: 'absolute', left: '1rpx', top: '9rpx', width: '20rpx', height: '3rpx', borderRadius: '2rpx', background: '#FFFFFF', transform: 'rotate(45deg)' }} />
      <View style={{ position: 'absolute', left: '1rpx', top: '9rpx', width: '20rpx', height: '3rpx', borderRadius: '2rpx', background: '#FFFFFF', transform: 'rotate(-45deg)' }} />
    </View>
  )
}

function TopicTrailingIcon({ removable }: { removable: boolean }) {
  return (
    <View id="qianxun-compose-topic-trailing-icon" data-role="compose-topic-trailing-icon" aria-hidden style={{ position: 'relative', width: '18rpx', height: '24rpx', marginLeft: '8rpx', flexShrink: 0 }}>
      {removable ? <><View style={{ position: 'absolute', left: '2rpx', top: '10rpx', width: '15rpx', height: '3rpx', borderRadius: '2rpx', background: BLUE, transform: 'rotate(45deg)' }} /><View style={{ position: 'absolute', left: '2rpx', top: '10rpx', width: '15rpx', height: '3rpx', borderRadius: '2rpx', background: BLUE, transform: 'rotate(-45deg)' }} /></> : <View style={{ position: 'absolute', left: '1rpx', top: '5rpx', width: '10rpx', height: '10rpx', borderTop: `3rpx solid ${BLUE}`, borderRight: `3rpx solid ${BLUE}`, transform: 'rotate(45deg)', boxSizing: 'border-box' }} />}
    </View>
  )
}

function PublishFailureFeedback({ title, message }: { title: string; message: string }) {
  return <View style={{ position: 'fixed', inset: 0, zIndex: 110, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><View style={{ width: '390rpx', minHeight: '142rpx', borderRadius: '16rpx', background: 'rgba(38,45,56,.78)', padding: '26rpx 30rpx', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 600 }}>{title}</Text><Text style={{ color: '#FFFFFF', fontSize: '23rpx', lineHeight: '34rpx', marginTop: '12rpx', textAlign: 'center' }}>{message}</Text></View></View>
}

function ImagePreview({ src, closeTop, onClose }: { src: string; closeTop: number; onClose: () => void }) {
  return (
    <View id="qianxun-compose-image-preview" data-role="compose-image-preview" style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000000', overflow: 'hidden' }}>
      <MovableArea scaleArea style={{ position: 'absolute', inset: 0, width: '750rpx', height: '100vh', overflow: 'hidden' }}>
        <MovableView
          direction="all"
          scale
          scaleMin={1}
          scaleMax={3}
          scaleValue={1}
          outOfBounds={false}
          style={{ width: '750rpx', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Image src={src} mode="aspectFit" style={{ width: '750rpx', height: '100vh' }} />
        </MovableView>
      </MovableArea>
      <View
        id="qianxun-compose-image-preview-close"
        data-role="compose-image-preview-close"
        onClick={onClose}
        hoverClass="btn-hover"
        style={{ position: 'absolute', left: '22rpx', top: `${Math.max(24, closeTop - 14)}rpx`, width: '72rpx', height: '72rpx', borderRadius: '36rpx', background: 'rgba(0,0,0,.46)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
      >
        <ComposeRemoveImageIcon />
      </View>
      <Text style={{ position: 'absolute', left: '175rpx', right: '175rpx', bottom: 'calc(42rpx + env(safe-area-inset-bottom))', color: 'rgba(255,255,255,.72)', fontSize: '22rpx', lineHeight: '32rpx', textAlign: 'center', pointerEvents: 'none', zIndex: 2 }}>
        双指缩放，最多放大 3 倍
      </Text>
    </View>
  )
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
