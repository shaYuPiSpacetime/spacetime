import { Image, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import NativeNavigation, { getNativeNavigationMetrics } from '@/components/NativeNavigation'
import { getCommunityConfig, publishCommunityPost, type CommunityConfig } from '@/services/community'
import { prd01Api } from '@/services/prd01'

const BLUE = '#2876FF'
const NAVY = '#0C285A'
const MY_POST_RECEIPTS_KEY = 'qianxun_my_post_receipts'

interface PublishReceipt {
  id: string
  postId?: number
  status: 'publishing' | 'failed' | 'published'
  content: string
  imageUrls: string[]
  topicName?: string
  createdAt: string
  commentCount: number
  likeCount: number
  failureMessage?: string
}

export default function QianxunComposePage() {
  const navigationMetrics = getNativeNavigationMetrics()
  const [postType, setPostType] = useState<'normal_post' | 'sincere_post'>('normal_post')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [config, setConfig] = useState<CommunityConfig>()
  const [topicId, setTopicId] = useState<number>()
  const [initialTopicName, setInitialTopicName] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [topicSheetVisible, setTopicSheetVisible] = useState(false)

  useLoad(params => {
    const initialTopicId = Number(params.topicId)
    if (Number.isFinite(initialTopicId) && initialTopicId > 0) setTopicId(initialTopicId)
    if (params.topicName) setInitialTopicName(decodeURIComponent(params.topicName))
    if (params.postType === 'sincere_post') setPostType('sincere_post')
  })

  useDidShow(() => {
    void getCommunityConfig().then(runtime => {
      setConfig(runtime)
      setTopicId(current => current || toTopicId(runtime.topics?.[0]?.code))
    }).catch(showError)
  })

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
      setUploading(true)
      setUploadProgress(0)
      const uploadedUrls: string[] = []
      for (let index = 0; index < paths.length; index += 1) {
        const uploaded = await prd01Api.uploadAlbum(paths[index])
        uploadedUrls.push(uploaded.url)
        setUploadProgress(Math.round(((index + 1) / paths.length) * 100))
      }
      setImages(current => [...current, ...uploadedUrls].slice(0, maxCount))
    } catch (error) {
      if (!/cancel/i.test(String((error as { errMsg?: string })?.errMsg || error))) await showError(error)
    } finally {
      setUploading(false)
    }
  }

  const goBack = async () => {
    if (!content.trim() && !images.length) {
      await Taro.navigateBack()
      return
    }
    const result = await Taro.showModal({
      title: '温馨提示',
      content: '是否保留当前内容？',
      cancelText: '取消',
      confirmText: '确定',
      confirmColor: BLUE,
    })
    if (result.confirm) await Taro.navigateBack()
  }

  const handlePublish = async () => {
    if (!content.trim()) {
      await Taro.showToast({ title: '请填写内容', icon: 'none' })
      return
    }
    if (!topicId) {
      setTopicSheetVisible(true)
      return
    }
    if (publishing || uploading) return
    setPublishing(true)
    const receipt: PublishReceipt = {
      id: `local-${Date.now()}`,
      status: 'publishing',
      content: content.trim(),
      imageUrls: images,
      topicName: selectedTopic?.label,
      createdAt: new Date().toISOString(),
      commentCount: 0,
      likeCount: 0,
    }
    savePublishReceipt(receipt)
    try {
      const postId = await publishCommunityPost(content.trim(), images, topicId, postType)
      savePublishReceipt({ ...receipt, postId, status: 'published' })
      await Taro.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => void Taro.navigateBack(), 450)
    } catch (error) {
      savePublishReceipt({ ...receipt, status: 'failed', failureMessage: error instanceof Error ? error.message : String(error) })
      await showError(error)
    } finally {
      setPublishing(false)
    }
  }

  const maxImages = Number(config?.postMaxImages || 9)
  const canPublish = Boolean(content.trim() && topicId && !publishing && !uploading)

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
          {images.map((url, index) => (
            <View key={`${url}-${index}`} style={{ position: 'relative', width: '226rpx', height: '226rpx' }}>
              <Image src={url} mode="aspectFill" style={{ width: '226rpx', height: '226rpx', borderRadius: '8rpx' }} />
              <View onClick={() => setImages(items => items.filter((_, itemIndex) => itemIndex !== index))} style={{ position: 'absolute', right: '6rpx', top: '6rpx', width: '34rpx', height: '34rpx', borderRadius: '17rpx', background: 'rgba(20,32,48,.68)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '22rpx' }}>×</Text></View>
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
          <ToolIcon kind="video" onClick={() => void Taro.showToast({ title: '视频功能即将开放', icon: 'none' })} />
          <ToolIcon kind="smile" onClick={() => void Taro.showToast({ title: '表情功能即将开放', icon: 'none' })} />
          <Text style={{ color: '#999999', fontSize: '23rpx' }}>{images.length}/{maxImages}</Text>
          <View style={{ flex: 1 }} />
          <View onClick={() => void handlePublish()} style={{ width: '148rpx', height: '66rpx', borderRadius: '8rpx', background: canPublish ? BLUE : '#F4F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: canPublish ? '#FFFFFF' : '#999999', fontSize: '28rpx', fontWeight: 500 }}>{publishing ? '发布中' : '发布'}</Text></View>
        </View>
      </View>

      {uploading ? <UploadOverlay progress={uploadProgress} /> : null}
      {topicSheetVisible ? <TopicSheet topics={config?.topics || []} onSelect={id => { setTopicId(id); setTopicSheetVisible(false) }} onClose={() => setTopicSheetVisible(false)} /> : null}
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

function UploadOverlay({ progress }: { progress: number }) {
  return <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.28)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><View style={{ width: '310rpx', height: '134rpx', borderRadius: '14rpx', background: '#FFFFFF', padding: '30rpx 26rpx', boxSizing: 'border-box' }}><Text style={{ display: 'block', color: '#333333', fontSize: '25rpx', textAlign: 'center' }}>正在上传照片</Text><View style={{ height: '5rpx', borderRadius: '3rpx', background: '#E7E9EE', marginTop: '24rpx', overflow: 'hidden' }}><View style={{ width: `${progress}%`, height: '5rpx', background: BLUE }} /></View><Text style={{ display: 'block', color: '#999999', fontSize: '20rpx', marginTop: '13rpx' }}>上传中，请耐心等待 {progress}%</Text></View></View>
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

function savePublishReceipt(receipt: PublishReceipt) {
  const current = Taro.getStorageSync(MY_POST_RECEIPTS_KEY)
  const receipts = Array.isArray(current) ? current.filter(item => item?.id !== receipt.id) : []
  Taro.setStorageSync(MY_POST_RECEIPTS_KEY, [receipt, ...receipts].slice(0, 30))
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
