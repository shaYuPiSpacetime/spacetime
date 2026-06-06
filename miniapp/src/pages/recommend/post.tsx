import { Image, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import bg from '@/assets/lanhu/recommend/recommend-bg.png'

export default function RecommendPostPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handlePublish = () => {
    Taro.showToast({ title: title || content ? '发布成功' : '请填写内容', icon: title || content ? 'success' : 'none' })
    if (title || content) {
      setTimeout(() => Taro.navigateBack(), 600)
    }
  }

  return (
    <View style={{ minHeight: '100vh', background: '#F3F5FB', position: 'relative', overflow: 'hidden' }}>
      <Image src={bg} mode="widthFix" style={{ position: 'absolute', left: '0', top: '0', width: '750rpx' }} />
      <View style={{ position: 'relative', width: '750rpx', height: '1624rpx' }}>
        <BackButton />
        <Text
          style={{
            position: 'absolute',
            left: '0',
            top: '96rpx',
            width: '750rpx',
            textAlign: 'center',
            color: '#0C285A',
            fontSize: '34rpx',
            fontWeight: 700,
            lineHeight: '48rpx',
          }}
        >
          发布诚意贴
        </Text>
        <View
          style={{
            position: 'absolute',
            left: '25rpx',
            top: '206rpx',
            width: '700rpx',
            borderRadius: '32rpx',
            background: '#FFFFFF',
            padding: '32rpx 30rpx',
            boxSizing: 'border-box',
            boxShadow: '0 12rpx 34rpx rgba(210,224,246,0.55)',
          }}
        >
          <Textarea
            value={title}
            maxlength={24}
            placeholder="给这段诚意起个标题"
            placeholderStyle="color:#B8C0CE;font-size:30rpx"
            onInput={(event) => setTitle(event.detail.value)}
            style={{ width: '640rpx', height: '80rpx', color: '#0C285A', fontSize: '32rpx', fontWeight: 700 }}
          />
          <View style={{ height: '1rpx', background: '#EFF4FC', margin: '16rpx 0 28rpx' }} />
          <Textarea
            value={content}
            maxlength={200}
            placeholder="写下你想认真表达的话……"
            placeholderStyle="color:#B8C0CE;font-size:28rpx"
            onInput={(event) => setContent(event.detail.value)}
            style={{ width: '640rpx', height: '440rpx', color: '#333333', fontSize: '28rpx', lineHeight: '44rpx' }}
          />
          <Text style={{ display: 'block', color: '#AAB2C0', fontSize: '22rpx', lineHeight: '32rpx', textAlign: 'right' }}>
            {content.length}/200
          </Text>
        </View>
        <View
          style={{
            position: 'absolute',
            left: '57rpx',
            bottom: '120rpx',
            width: '636rpx',
            height: '98rpx',
            borderRadius: '49rpx',
            background: '#2876FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12rpx 28rpx rgba(40,118,255,0.28)',
          }}
          onClick={handlePublish}
          hoverClass="btn-hover"
        >
          <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 700 }}>发布</Text>
        </View>
      </View>
    </View>
  )
}

function BackButton() {
  return (
    <View
      style={{ position: 'absolute', left: '20rpx', top: '92rpx', width: '56rpx', height: '56rpx', zIndex: 2 }}
      onClick={() => Taro.navigateBack()}
      hoverClass="btn-hover"
    >
      <View
        style={{
          position: 'absolute',
          left: '14rpx',
          top: '7rpx',
          width: '30rpx',
          height: '30rpx',
          borderLeft: '5rpx solid #697E9C',
          borderBottom: '5rpx solid #697E9C',
          transform: 'rotate(45deg)',
        }}
      />
    </View>
  )
}
