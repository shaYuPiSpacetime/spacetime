import { Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'

const BLUE = '#2876FF'
const NAVY = '#0C285A'

const TOPICS = ['添加话题', '#今日电子日记', '#今日电子日记', '#今日电子日记']

export default function RecommendPostPage() {
  const [content, setContent] = useState('')

  const handlePublish = () => {
    if (!content.trim()) {
      Taro.showToast({ title: '请填写内容', icon: 'none' })
      return
    }

    Taro.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 600)
  }

  return (
    <View style={{ minHeight: '100vh', background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
      <View style={{ position: 'relative', width: '750rpx', minHeight: '1624rpx', paddingBottom: '204rpx', boxSizing: 'border-box' }}>
        <Header />
        <Textarea
          value={content}
          maxlength={500}
          placeholder="记录生活，展现真实的你"
          placeholderStyle="color:#999999;font-size:28rpx;line-height:40rpx"
          onInput={(event) => setContent(event.detail.value)}
          style={{
            width: '700rpx',
            height: '1168rpx',
            margin: '22rpx 25rpx 0',
            color: '#333333',
            fontSize: '28rpx',
            lineHeight: '44rpx',
          }}
        />
        <BottomComposer canPublish={content.trim().length > 0} onPublish={handlePublish} />
      </View>
    </View>
  )
}

function Header() {
  return (
    <View
      style={{
        width: '750rpx',
        height: '168rpx',
        padding: '100rpx 160rpx 0 24rpx',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <View
        style={{ position: 'absolute', left: '24rpx', top: '104rpx', width: '48rpx', height: '48rpx' }}
        onClick={() => Taro.navigateBack()}
        hoverClass="btn-hover"
      >
        <View
          style={{
            position: 'absolute',
            left: '9rpx',
            top: '4rpx',
            width: '28rpx',
            height: '28rpx',
            borderLeft: '5rpx solid #667B9A',
            borderBottom: '5rpx solid #667B9A',
            transform: 'rotate(45deg)',
          }}
        />
      </View>
      <Text
        style={{
          display: 'block',
          width: '566rpx',
          color: NAVY,
          fontSize: '32rpx',
          fontWeight: 500,
          lineHeight: '45rpx',
          textAlign: 'center',
        }}
      >
        发布动态
      </Text>
    </View>
  )
}

function BottomComposer({ canPublish, onPublish }: { canPublish: boolean; onPublish: () => void }) {
  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        background: '#FFFFFF',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ScrollTopics />
      <View style={{ height: '2rpx', background: '#EFF4FC' }} />
      <View
        style={{
          width: '750rpx',
          height: '100rpx',
          padding: '20rpx 25rpx 0',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}
      >
        <ToolIcon type="image" />
        <ToolIcon type="play" />
        <ToolIcon type="smile" />
        <View style={{ flex: 1 }} />
        <View
          style={{
            width: '148rpx',
            height: '72rpx',
            borderRadius: '8rpx',
            background: canPublish ? BLUE : '#F4F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={onPublish}
          hoverClass="btn-hover"
        >
          <Text style={{ color: canPublish ? '#FFFFFF' : '#999999', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>发布</Text>
        </View>
      </View>
    </View>
  )
}

function ScrollTopics() {
  return (
    <View
      style={{
        width: '750rpx',
        height: '82rpx',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        paddingLeft: '27rpx',
        boxSizing: 'border-box',
      }}
    >
      {TOPICS.map((topic, index) => {
        const isAdd = index === 0
        return (
          <View
            key={`${topic}-${index}`}
            style={{
              height: '48rpx',
              borderRadius: '24rpx',
              background: isAdd ? '#E3F1FE' : '#F4F4F6',
              padding: isAdd ? '0 22rpx 0 12rpx' : '0 23rpx',
              marginRight: '12rpx',
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'row',
              flexShrink: 0,
            }}
          >
            {isAdd && (
              <View
                style={{
                  width: '32rpx',
                  height: '32rpx',
                  borderRadius: '16rpx',
                  background: BLUE,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '10rpx',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: '30rpx', lineHeight: '32rpx' }}>#</Text>
              </View>
            )}
            <Text style={{ color: '#999999', fontSize: '26rpx', lineHeight: '37rpx' }}>{topic}</Text>
            {isAdd && <Text style={{ color: BLUE, fontSize: '30rpx', lineHeight: '32rpx', marginLeft: '6rpx' }}>›</Text>}
          </View>
        )
      })}
    </View>
  )
}

function ToolIcon({ type }: { type: 'image' | 'play' | 'smile' }) {
  return (
    <View style={{ width: '54rpx', height: '54rpx', marginRight: '18rpx', position: 'relative' }}>
      {type === 'image' && (
        <>
          <View
            style={{
              position: 'absolute',
              left: '1rpx',
              top: '5rpx',
              width: '46rpx',
              height: '38rpx',
              borderRadius: '7rpx',
              border: '4rpx solid #999999',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: '9rpx',
              top: '31rpx',
              width: '30rpx',
              height: '16rpx',
              borderLeft: '4rpx solid #999999',
              borderBottom: '4rpx solid #999999',
              transform: 'skewX(-28deg)',
            }}
          />
          <View style={{ position: 'absolute', left: '10rpx', top: '13rpx', width: '8rpx', height: '8rpx', borderRadius: '4rpx', background: '#999999' }} />
        </>
      )}
      {type === 'play' && (
        <>
          <View
            style={{
              position: 'absolute',
              left: '2rpx',
              top: '5rpx',
              width: '44rpx',
              height: '38rpx',
              borderRadius: '7rpx',
              border: '4rpx solid #999999',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: '21rpx',
              top: '17rpx',
              width: 0,
              height: 0,
              borderTop: '10rpx solid transparent',
              borderBottom: '10rpx solid transparent',
              borderLeft: '14rpx solid #999999',
            }}
          />
        </>
      )}
      {type === 'smile' && (
        <>
          <View
            style={{
              position: 'absolute',
              left: '4rpx',
              top: '4rpx',
              width: '42rpx',
              height: '42rpx',
              borderRadius: '21rpx',
              border: '4rpx solid #999999',
            }}
          />
          <View style={{ position: 'absolute', left: '17rpx', top: '18rpx', width: '5rpx', height: '5rpx', borderRadius: '3rpx', background: '#999999' }} />
          <View style={{ position: 'absolute', left: '31rpx', top: '18rpx', width: '5rpx', height: '5rpx', borderRadius: '3rpx', background: '#999999' }} />
          <View
            style={{
              position: 'absolute',
              left: '18rpx',
              top: '31rpx',
              width: '18rpx',
              height: '8rpx',
              borderBottom: '4rpx solid #999999',
              borderRadius: '0 0 18rpx 18rpx',
            }}
          />
        </>
      )}
    </View>
  )
}
