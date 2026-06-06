import { Image, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useMatch } from '@/hooks/useMatch'
import {
  LANHU_BLUE,
  LANHU_NAVY,
  LANHU_SOFT_BG,
} from '@/pages/lanhu/LanhuShell'

import matchHero from '@/assets/lanhu/pages/match-hero.png'
import matchPhoto from '@/assets/lanhu/pages/match-photo.png'

const PROFILE_TAGS = ['IT女神', '户外发烧友', '热爱旅行', '电子竞技']
const BASIC_INFO = ['女', '97年', '163cm', '双鱼座']
const QUESTIONS = [
  { title: '自我介绍', text: '白天是咨询顾问，晚上是手冲咖啡爱好者。喜欢把生活过得柔软，也愿意认真奔赴每一次相遇。' },
  { title: '我理想中的恋人', text: '会认真倾听，有稳定的情绪，也愿意一起把平凡日子过成小小的节日。' },
  { title: '我的理想家庭是什么样', text: '有趣、坦诚、热爱生活。彼此都能做自己，一起探索世界。' },
  { title: '相处中你最看重什么', text: '真诚沟通、彼此尊重、共同成长。' },
]

export default function IndexPage() {
  const {
    currentUser,
    sendYoText,
    yoText,
    setYoText,
    showCertPopup,
    openCertPopup,
    closeCertPopup,
    navigateToProfileEdit,
  } = useMatch()

  const [expanded, setExpanded] = useState(false)
  const user = currentUser

  const handleSend = async () => {
    if (!yoText.trim()) {
      Taro.showToast({ title: '请写点什么', icon: 'none' })
      return
    }
    await sendYoText()
    Taro.showToast({ title: '发送成功', icon: 'success' })
  }

  if (!user) {
    return (
      <View style={{ minHeight: '100vh', background: LANHU_SOFT_BG }}>
        <MatchHeader />
        <Text style={{ display: 'block', marginTop: '300rpx', textAlign: 'center', color: '#999999' }}>
          加载中...
        </Text>
      </View>
    )
  }

  return (
    <View style={{ minHeight: '100vh', background: LANHU_SOFT_BG }}>
      <ScrollView scrollY style={{ height: '100vh' }} showScrollbar={false}>
        <MatchHeader />

        <View style={{ width: '750rpx', padding: '0 8rpx 244rpx', boxSizing: 'border-box' }}>
          <HeroCard onCert={openCertPopup} />
          <ProfileInfo onEdit={navigateToProfileEdit} />
          <TagsBlock />
          <QuestionCard title="自我介绍" text={QUESTIONS[0].text} highlight />
          <PhotoQuestion title="我的小幸运" />
          {QUESTIONS.slice(1).map((item) => (
            <QuestionCard key={item.title} title={item.title} text={item.text} />
          ))}
          <PhotoQuestion title="闲暇时我会做些什么" />
          <PhotoWall />
          <IpBlock />
          <View style={{ height: '60rpx' }} />
        </View>
      </ScrollView>

      <BottomAction
        value={yoText}
        expanded={expanded}
        onExpand={() => setExpanded(true)}
        onInput={setYoText}
        onSend={handleSend}
        onClose={() => setExpanded(false)}
      />
      {showCertPopup && (
        <CertSheet onClose={closeCertPopup} />
      )}
    </View>
  )
}

function MatchHeader() {
  const tabs = ['觅缘', '心印测试', '精选', '理想型']

  const handleTabClick = (tab: string) => {
    if (tab === '精选') {
      Taro.navigateTo({ url: '/pages/featured/index' })
      return
    }
    if (tab !== '觅缘') {
      Taro.showToast({ title: '功能建设中', icon: 'none' })
    }
  }

  return (
    <View
      style={{
        width: '750rpx',
        height: '176rpx',
        padding: '86rpx 160rpx 0 25rpx',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab === '觅缘'
        return (
          <View
            key={tab}
            style={{
              position: 'relative',
              height: '58rpx',
              display: 'flex',
              alignItems: 'center',
              marginRight: tab === '觅缘' ? '28rpx' : '24rpx',
              flexShrink: 0,
            }}
            onClick={() => handleTabClick(tab)}
          >
            <Text
              style={{
                color: isActive ? LANHU_NAVY : '#7F8494',
                fontSize: isActive ? '34rpx' : '30rpx',
                fontWeight: isActive ? 800 : 600,
                lineHeight: '42rpx',
                textShadow: isActive ? '0 4rpx 0 rgba(40,118,255,0.16)' : 'none',
              }}
            >
              {tab}
            </Text>
            {tab === '觅缘' && (
              <View
                style={{
                  position: 'absolute',
                  right: '-14rpx',
                  top: '-2rpx',
                  minWidth: '28rpx',
                  height: '22rpx',
                  borderRadius: '11rpx',
                  background: '#FF3F5E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4rpx',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: '15rpx', lineHeight: '20rpx' }}>45</Text>
              </View>
            )}
            {isActive && (
              <View
                style={{
                  position: 'absolute',
                  left: '0',
                  bottom: '2rpx',
                  width: '52rpx',
                  height: '6rpx',
                  borderRadius: '3rpx',
                  background: LANHU_BLUE,
                }}
              />
            )}
          </View>
        )
      })}
    </View>
  )
}

function HeroCard({ onCert }: { onCert: () => void }) {
  return (
    <View
      style={{
        position: 'relative',
        width: '734rpx',
        height: '820rpx',
        borderRadius: '32rpx',
        overflow: 'hidden',
        margin: '0 auto',
        background: '#D6E6F5',
      }}
    >
      <Image src={matchHero} mode="aspectFill" style={{ width: '734rpx', height: '820rpx' }} />
      <View
        style={{
          position: 'absolute',
          right: '22rpx',
          top: '22rpx',
          width: '56rpx',
          height: '56rpx',
          borderRadius: '28rpx',
          background: 'rgba(255,255,255,0.82)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onCert}
      >
        <Text style={{ color: LANHU_BLUE, fontSize: '32rpx' }}>✓</Text>
      </View>
      <View
        style={{
          position: 'absolute',
          left: '52rpx',
          bottom: '30rpx',
          right: '40rpx',
          height: '150rpx',
        }}
      >
        <Image
          src={matchHero}
          mode="aspectFill"
          style={{
            position: 'absolute',
            left: '0',
            bottom: '-5rpx',
            width: '142rpx',
            height: '142rpx',
            borderRadius: '71rpx',
            border: '8rpx solid #FFFFFF',
          }}
        />
        <View style={{ position: 'absolute', left: '190rpx', top: '22rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '38rpx', fontWeight: 700, lineHeight: '54rpx', textShadow: '0 2rpx 8rpx rgba(0,0,0,0.25)' }}>
            筱脑虎
          </Text>
          <View
            style={{
              height: '48rpx',
              borderRadius: '24rpx',
              background: '#E3F1FE',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: '0 16rpx',
              marginLeft: '18rpx',
            }}
            onClick={onCert}
          >
            <Text style={{ color: LANHU_BLUE, fontSize: '26rpx', marginRight: '8rpx' }}>🛡</Text>
            <Text style={{ color: LANHU_BLUE, fontSize: '24rpx', fontWeight: 600 }}>三重认证</Text>
          </View>
        </View>
        <View
          style={{
            position: 'absolute',
            left: '214rpx',
            top: '82rpx',
            height: '50rpx',
            borderRadius: '25rpx',
            background: 'rgba(255,255,255,0.34)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '0 20rpx',
          }}
        >
          <Text style={{ color: '#FF637E', fontSize: '25rpx', marginRight: '10rpx' }}>♥</Text>
          <Text style={{ color: '#FFFFFF', fontSize: '24rpx', fontWeight: 600 }}>佛系交友</Text>
        </View>
      </View>
    </View>
  )
}

function ProfileInfo({ onEdit }: { onEdit: () => void }) {
  return (
    <View
      style={{
        width: '734rpx',
        margin: '-2rpx auto 0',
        borderRadius: '0 0 32rpx 32rpx',
        background: '#FFFFFF',
        padding: '24rpx 24rpx 28rpx',
        boxSizing: 'border-box',
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '20rpx' }}>
        <Text style={{ color: '#FF5B7C', fontSize: '32rpx', lineHeight: '40rpx', marginRight: '16rpx' }}>♀</Text>
        <Text style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>{BASIC_INFO.join(' | ')}</Text>
      </View>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', paddingBottom: '22rpx', borderBottom: '1rpx solid #EEF2F6' }}>
        <Text style={{ color: '#4FA1FF', fontSize: '31rpx', lineHeight: '40rpx', marginRight: '15rpx' }}>♙</Text>
        <Text style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>现居浙江杭州 | 河南人</Text>
      </View>
      <InfoLine label="职业：" value="工程师 | 浙江某某有限公司" ok />
      <InfoLine label="学历：" value="硕士 | 浙江工商管理大学" ok />
      <View
        style={{
          marginTop: '18rpx',
          height: '58rpx',
          borderRadius: '29rpx',
          background: '#F4F8FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onEdit}
      >
        <Text style={{ color: LANHU_BLUE, fontSize: '24rpx', fontWeight: 600 }}>完善资料，提升匹配度</Text>
      </View>
    </View>
  )
}

function InfoLine({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '20rpx' }}>
      <Text style={{ color: LANHU_BLUE, fontSize: '28rpx', width: '94rpx', lineHeight: '40rpx', fontWeight: 700 }}>{label}</Text>
      <Text style={{ color: '#333333', fontSize: '28rpx', flex: 1, lineHeight: '40rpx' }}>{value}</Text>
      {ok && <Text style={{ color: '#44B476', fontSize: '22rpx' }}>已认证</Text>}
    </View>
  )
}

function TagsBlock() {
  return (
    <View
      style={{
        width: '700rpx',
        margin: '18rpx auto 0',
        borderRadius: '24rpx',
        background: '#FFFFFF',
        padding: '26rpx 24rpx 22rpx',
        boxSizing: 'border-box',
      }}
    >
      <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>我的标签</Text>
      <View style={{ display: 'flex', flexDirection: 'row', marginTop: '20rpx', flexWrap: 'wrap' }}>
        {PROFILE_TAGS.map((tag) => (
          <View
            key={tag}
            style={{
              height: '40rpx',
              padding: '0 17rpx',
              marginRight: '10rpx',
              borderRadius: '20rpx',
              background: '#FFFFFF',
              border: '1rpx solid #E2E6EF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#333333', fontSize: '22rpx', lineHeight: '30rpx' }}>
              {tag}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function QuestionCard({ title, text, highlight = false }: { title: string; text: string; highlight?: boolean }) {
  return (
    <View
      style={{
        width: '700rpx',
        margin: '18rpx auto 0',
        borderRadius: '24rpx',
        background: '#FFFFFF',
        padding: '26rpx 24rpx',
        boxSizing: 'border-box',
      }}
    >
      <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>{title}</Text>
      <Text style={{ display: 'block', marginTop: '18rpx', color: '#575E6F', fontSize: '24rpx', lineHeight: '40rpx' }}>
        {text}
      </Text>
      {highlight && (
        <View style={{ marginTop: '20rpx', display: 'flex', justifyContent: 'flex-end' }}>
          <View
            style={{
              width: '44rpx',
              height: '44rpx',
              borderRadius: '22rpx',
              background: LANHU_BLUE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>↗</Text>
          </View>
        </View>
      )}
    </View>
  )
}

function PhotoQuestion({ title }: { title: string }) {
  return (
    <View
      style={{
        width: '700rpx',
        margin: '18rpx auto 0',
        borderRadius: '24rpx',
        background: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      <Image src={matchPhoto} mode="aspectFill" style={{ width: '700rpx', height: '520rpx' }} />
      <View style={{ padding: '24rpx', boxSizing: 'border-box' }}>
        <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>{title}</Text>
        <Text style={{ display: 'block', color: '#575E6F', fontSize: '24rpx', lineHeight: '40rpx', marginTop: '16rpx' }}>
          咖啡馆、博物馆、海边散步，都是我喜欢认真生活的证据。
        </Text>
      </View>
    </View>
  )
}

function PhotoWall() {
  const photos = [matchHero, matchPhoto, matchHero, matchPhoto, matchHero]
  return (
    <View
      style={{
        width: '700rpx',
        margin: '18rpx auto 0',
        borderRadius: '24rpx',
        background: '#FFFFFF',
        padding: '24rpx',
        boxSizing: 'border-box',
      }}
    >
      <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>个人动态（6）</Text>
      <View style={{ display: 'flex', flexDirection: 'row', marginTop: '18rpx' }}>
        {photos.map((photo, index) => (
          <Image
            key={index}
            src={photo}
            mode="aspectFill"
            style={{
              width: '116rpx',
              height: '116rpx',
              borderRadius: '8rpx',
              marginRight: index === photos.length - 1 ? 0 : '13rpx',
            }}
          />
        ))}
      </View>
    </View>
  )
}

function IpBlock() {
  return (
    <View
      style={{
        width: '700rpx',
        height: '210rpx',
        margin: '18rpx auto 0',
        borderRadius: '24rpx',
        background: '#FFFFFF',
        padding: '24rpx',
        boxSizing: 'border-box',
      }}
    >
      <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>IP所属地</Text>
      <View
        style={{
          marginTop: '20rpx',
          height: '116rpx',
          borderRadius: '16rpx',
          background: '#F3F8FF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: LANHU_BLUE, fontSize: '42rpx', lineHeight: '46rpx' }}>⌖</Text>
        <Text style={{ color: '#5E6D86', fontSize: '22rpx', marginTop: '4rpx' }}>上海</Text>
      </View>
    </View>
  )
}

function BottomAction({
  value,
  expanded,
  onExpand,
  onInput,
  onSend,
  onClose,
}: {
  value: string
  expanded: boolean
  onExpand: () => void
  onInput: (value: string) => void
  onSend: () => void
  onClose: () => void
}) {
  return (
    <View
      style={{
        position: 'fixed',
        left: '0',
        right: '0',
        bottom: 'calc(104rpx + env(safe-area-inset-bottom))',
        height: expanded ? '300rpx' : '112rpx',
        background: '#FFFFFF',
        borderRadius: expanded ? '32rpx 32rpx 0 0' : '0',
        zIndex: 30,
        padding: expanded ? '26rpx 28rpx' : '18rpx 25rpx',
        boxSizing: 'border-box',
        boxShadow: '0 -4rpx 18rpx rgba(41,75,120,0.08)',
      }}
    >
      {expanded ? (
        <>
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '16rpx' }}>
            <Text style={{ color: LANHU_NAVY, fontSize: '30rpx', fontWeight: 600 }}>悄悄话</Text>
            <Text style={{ color: '#999999', fontSize: '28rpx' }} onClick={onClose}>收起</Text>
          </View>
          <Textarea
            value={value}
            maxlength={60}
            placeholder="写点什么..."
            placeholderStyle="color:#B7BDC8;font-size:26rpx"
            onInput={(event) => onInput(event.detail.value)}
            style={{
              width: '694rpx',
              height: '112rpx',
              border: `2rpx solid ${LANHU_BLUE}`,
              borderRadius: '20rpx',
              padding: '18rpx',
              boxSizing: 'border-box',
              color: '#333333',
              fontSize: '26rpx',
            }}
          />
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: '18rpx' }}>
            <Text style={{ color: '#999999', fontSize: '22rpx' }}>{value.length}/60</Text>
            <View
              style={{
                width: '210rpx',
                height: '66rpx',
                borderRadius: '33rpx',
                background: LANHU_BLUE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={onSend}
            >
              <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 600 }}>发送</Text>
            </View>
          </View>
        </>
      ) : (
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: '76rpx',
              height: '76rpx',
              borderRadius: '38rpx',
              background: '#A6ADB9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '18rpx',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: '36rpx' }}>×</Text>
          </View>
          <View
            style={{
              flex: 1,
              height: '76rpx',
              borderRadius: '38rpx',
              background: LANHU_BLUE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={onExpand}
          >
            <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 600 }}>悄悄话</Text>
          </View>
          <View
            style={{
              width: '76rpx',
              height: '76rpx',
              borderRadius: '38rpx',
              background: '#FF6B86',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '18rpx',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: '34rpx' }}>♥</Text>
          </View>
        </View>
      )}
    </View>
  )
}

function CertSheet({ onClose }: { onClose: () => void }) {
  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <View
        style={{
          width: '750rpx',
          borderRadius: '32rpx 32rpx 0 0',
          background: '#FFFFFF',
          padding: '42rpx 32rpx 56rpx',
          boxSizing: 'border-box',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <Text style={{ display: 'block', textAlign: 'center', color: LANHU_NAVY, fontSize: '34rpx', fontWeight: 700 }}>
          三重认证说明
        </Text>
        <Text style={{ display: 'block', textAlign: 'center', color: '#7D8798', fontSize: '24rpx', marginTop: '12rpx' }}>
          真实身份、学历和工作认证，让每次相遇更安心。
        </Text>
        <View
          style={{
            height: '88rpx',
            borderRadius: '44rpx',
            background: LANHU_BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '34rpx',
          }}
          onClick={onClose}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 600 }}>我知道了</Text>
        </View>
      </View>
    </View>
  )
}
