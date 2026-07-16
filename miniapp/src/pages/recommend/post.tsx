import { Image, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { getCommunityConfig, publishCommunityPost, type CommunityConfig } from '@/services/community'
import { prd01Api } from '@/services/prd01'

const BLUE = '#2876FF'
const NAVY = '#0C285A'

export default function RecommendPostPage() {
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [config, setConfig] = useState<CommunityConfig>()
  const [topicId, setTopicId] = useState<number>()
  const [publishing, setPublishing] = useState(false)

  useDidShow(() => {
    void getCommunityConfig().then(runtime => {
      setConfig(runtime)
      if (!topicId && runtime.topics?.[0]) {
        const firstId = Number(runtime.topics[0].code)
        if (Number.isFinite(firstId)) setTopicId(firstId)
      }
    }).catch(showError)
  })

  const chooseImages = async () => {
    const maxCount = Math.max(1, Number(config?.postMaxImages || 9))
    try {
      const result = await Taro.chooseImage({ count: Math.max(1, maxCount - images.length), sizeType: ['original'], sourceType: ['album', 'camera'] })
      const nextUrls: string[] = []
      for (const filePath of result.tempFilePaths || []) {
        const uploaded = await prd01Api.uploadAlbum(filePath)
        nextUrls.push(uploaded.url)
      }
      setImages(current => [...current, ...nextUrls].slice(0, maxCount))
    } catch (error) {
      if (!/cancel/i.test(String((error as { errMsg?: string })?.errMsg || error))) await showError(error)
    }
  }

  const handlePublish = async () => {
    const text = content.trim()
    if (!text) {
      await Taro.showToast({ title: '请填写内容', icon: 'none' })
      return
    }
    if (!topicId) {
      await Taro.showToast({ title: '请选择话题', icon: 'none' })
      return
    }
    if (publishing) return
    setPublishing(true)
    try {
      await publishCommunityPost(text, images, topicId)
      await Taro.showToast({ title: '已提交审核', icon: 'success' })
      setTimeout(() => void Taro.navigateBack(), 500)
    } catch (error) {
      await showError(error)
    } finally {
      setPublishing(false)
    }
  }

  const canPublish = Boolean(content.trim() && topicId && !publishing)

  return <View style={{ height: '100vh', background: '#FFFFFF', overflow: 'hidden' }}>
    <Header />
    <ScrollView scrollY style={{ position: 'absolute', left: 0, right: 0, top: '168rpx', bottom: '190rpx' }} showScrollbar={false}>
      <Textarea
        value={content}
        maxlength={Number(config?.postMaxTextLength || 500)}
        placeholder="记录生活，展现真实的你"
        placeholderStyle="color:#999999;font-size:28rpx;line-height:40rpx"
        onInput={event => setContent(event.detail.value)}
        style={{ width: '700rpx', minHeight: '430rpx', margin: '22rpx 25rpx 0', color: '#333333', fontSize: '28rpx', lineHeight: '44rpx', boxSizing: 'border-box' }}
      />
      {images.length ? <View style={{ display: 'flex', flexWrap: 'wrap', gap: '10rpx', padding: '22rpx 25rpx' }}>{images.map((url, index) => <View key={`${url}-${index}`} style={{ position: 'relative', width: '220rpx', height: '220rpx' }}><Image src={url} mode="aspectFill" style={{ width: '220rpx', height: '220rpx', borderRadius: '12rpx' }} /><View onClick={() => setImages(items => items.filter((_, itemIndex) => itemIndex !== index))} style={{ position: 'absolute', right: '8rpx', top: '8rpx', width: '42rpx', height: '42rpx', borderRadius: '21rpx', background: 'rgba(0,0,0,.52)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '26rpx' }}>×</Text></View></View>)}</View> : null}
    </ScrollView>
    <View style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#FFFFFF', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 10 }}>
      <ScrollView scrollX style={{ width: '750rpx', height: '82rpx', whiteSpace: 'nowrap' }} showScrollbar={false}>
        <View style={{ display: 'inline-flex', height: '82rpx', padding: '16rpx 27rpx', boxSizing: 'border-box' }}>
          {(config?.topics || []).map(topic => {
            const id = Number(topic.code)
            const active = topicId === id
            return <View key={topic.code} onClick={() => Number.isFinite(id) && setTopicId(id)} style={{ height: '50rpx', borderRadius: '25rpx', background: active ? '#E3F1FE' : '#F4F4F6', padding: '0 23rpx', marginRight: '12rpx', display: 'flex', alignItems: 'center', flexShrink: 0 }}><Text style={{ color: active ? BLUE : '#999999', fontSize: '25rpx', whiteSpace: 'nowrap' }}>#{topic.label}</Text></View>
          })}
        </View>
      </ScrollView>
      <View style={{ height: '2rpx', background: '#EFF4FC' }} />
      <View style={{ height: '100rpx', padding: '16rpx 25rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
        <ComposerTool type="image" onClick={() => void chooseImages()} />
        <ComposerTool type="video" />
        <ComposerTool type="smile" />
        <Text style={{ color: '#999999', fontSize: '23rpx' }}>{images.length}/{config?.postMaxImages || 9}</Text>
        <View style={{ flex: 1 }} />
        <View onClick={() => void handlePublish()} style={{ width: '148rpx', height: '72rpx', borderRadius: '8rpx', background: canPublish ? BLUE : '#F4F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: canPublish ? '#FFFFFF' : '#999999', fontSize: '28rpx', fontWeight: 500 }}>{publishing ? '发布中' : '发布'}</Text></View>
      </View>
    </View>
  </View>
}

function ComposerTool({ type, onClick }: { type: 'image' | 'video' | 'smile'; onClick?: () => void }) {
  return <View onClick={onClick} style={{ position: 'relative', width: '58rpx', height: '58rpx', marginRight: '16rpx', flexShrink: 0 }}>
    {type === 'image' ? <><View style={{ position: 'absolute', left: '7rpx', top: '9rpx', width: '42rpx', height: '36rpx', border: '4rpx solid #9299A6', borderRadius: '6rpx', boxSizing: 'border-box' }} /><View style={{ position: 'absolute', left: '14rpx', top: '29rpx', width: '25rpx', height: '14rpx', borderLeft: '4rpx solid #9299A6', borderBottom: '4rpx solid #9299A6', transform: 'skewX(-24deg)' }} /></> : null}
    {type === 'video' ? <><View style={{ position: 'absolute', left: '5rpx', top: '10rpx', width: '38rpx', height: '34rpx', border: '4rpx solid #9299A6', borderRadius: '7rpx', boxSizing: 'border-box' }} /><View style={{ position: 'absolute', right: '4rpx', top: '18rpx', width: 0, height: 0, borderTop: '10rpx solid transparent', borderBottom: '10rpx solid transparent', borderLeft: '13rpx solid #9299A6' }} /></> : null}
    {type === 'smile' ? <><View style={{ position: 'absolute', left: '6rpx', top: '6rpx', width: '44rpx', height: '44rpx', border: '4rpx solid #9299A6', borderRadius: '24rpx', boxSizing: 'border-box' }} /><View style={{ position: 'absolute', left: '17rpx', top: '20rpx', width: '5rpx', height: '5rpx', borderRadius: '3rpx', background: '#9299A6' }} /><View style={{ position: 'absolute', right: '17rpx', top: '20rpx', width: '5rpx', height: '5rpx', borderRadius: '3rpx', background: '#9299A6' }} /><View style={{ position: 'absolute', left: '19rpx', top: '31rpx', width: '20rpx', height: '8rpx', borderBottom: '3rpx solid #9299A6', borderRadius: '50%' }} /></> : null}
  </View>
}

function Header() {
  return <View style={{ width: '750rpx', height: '168rpx', paddingTop: '94rpx', boxSizing: 'border-box', position: 'relative' }}>
    <View onClick={() => void Taro.navigateBack()} style={{ position: 'absolute', left: '20rpx', top: '92rpx', width: '90rpx', height: '68rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#667B9A', fontSize: '56rpx', lineHeight: '60rpx' }}>‹</Text></View>
    <Text style={{ display: 'block', color: NAVY, fontSize: '32rpx', fontWeight: 500, lineHeight: '45rpx', textAlign: 'center' }}>发布动态</Text>
  </View>
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
