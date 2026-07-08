import { ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { getDemoPageData } from '@/services/lanhuDemo'
import { navigateBackOrRedirect } from '@/utils/navigation'

type AboutTopic = {
  key: string
  title: string
  placeholder: string
  value: string
}

type ProfileDemo = {
  editProfile: {
    aboutTopics: AboutTopic[]
  }
}

const profileDemo = getDemoPageData('profile') as ProfileDemo
const mainBlue = '#2876FF'
const titleColor = '#0C285A'
const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 48%, rgba(248,250,239,0.72) 100%)'

export default function ProfileEditAboutPage() {
  const router = useRouter()
  const topics = profileDemo.editProfile.aboutTopics
  const initialTopic = String(router.params.topic || 'all')
  const aboutTabs = [
    { key: 'all', title: '全部' },
    { key: 'who', title: '我是谁' },
    { key: 'daily', title: '我的日常' },
    { key: 'story', title: '我的故事' },
    { key: 'love', title: '我热爱的' },
  ]
  const [activeTopicKey, setActiveTopicKey] = useState(
    topics.some((item) => item.key === initialTopic) ? initialTopic : 'all'
  )
  const [activeCategoryKey, setActiveCategoryKey] = useState('all')
  const activeTopic = topics.find((item) => item.key === activeTopicKey) || topics[0]
  const [draftValues, setDraftValues] = useState<Record<string, string>>(
    topics.reduce<Record<string, string>>((result, item) => {
      result[item.key] = item.value
      return result
    }, {})
  )
  const isAllTopic = activeTopicKey === 'all'
  const editTopicTitle = activeTopic.title === '见面便好' ? '见面偏好' : activeTopic.title

  const handleBack = () => {
    navigateBackOrRedirect()
  }

  const handleSave = () => {
    Taro.showToast({ title: '已保存', icon: 'success' })
    setTimeout(handleBack, 500)
  }

  const renderTopicCard = (item: AboutTopic, index: number) => (
    <View
      key={`${item.key}-${index}`}
      onClick={() => setActiveTopicKey(item.key)}
      style={{
        width: '700rpx',
        minHeight: '160rpx',
        borderRadius: '8rpx',
        background: '#FFFFFF',
        marginBottom: '24rpx',
        padding: '34rpx 54rpx 26rpx 28rpx',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <Text style={{ display: 'block', color: titleColor, fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 800 }}>
        {item.title}
      </Text>
      <Text numberOfLines={1} style={{ display: 'block', color: '#999999', fontSize: '28rpx', lineHeight: '40rpx', marginTop: '10rpx' }}>
        {item.placeholder}
      </Text>
      <Text style={{ position: 'absolute', right: '30rpx', top: '51rpx', color: '#999999', fontSize: '58rpx', lineHeight: '58rpx', fontWeight: 300 }}>›</Text>
    </View>
  )

  return (
    <View style={{ minHeight: '100vh', background: pageBackground }}>
      <LanhuSubNav title={isAllTopic ? '关于我' : ''} onBack={handleBack} />
      {isAllTopic ? (
        <ScrollView scrollX style={{ width: '750rpx', height: '96rpx', whiteSpace: 'nowrap' }} showScrollbar={false}>
          <View style={{ display: 'flex', flexDirection: 'row', paddingLeft: '28rpx', boxSizing: 'border-box', height: '96rpx' }}>
            {aboutTabs.map((tab) => {
              const active = tab.key === activeCategoryKey
              return (
                <View
                  key={tab.key}
                  onClick={() => {
                    setActiveCategoryKey(tab.key)
                    setActiveTopicKey('all')
                  }}
                  style={{
                    position: 'relative',
                    minWidth: tab.key === 'all' ? '108rpx' : '150rpx',
                    height: '58rpx',
                    borderRadius: '12rpx',
                    background: active ? mainBlue : '#E3F1FE',
                    marginRight: '12rpx',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 24rpx',
                    boxSizing: 'border-box',
                  }}
                >
                  <Text style={{ color: active ? '#FFFFFF' : '#7F8494', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: active ? 800 : 500 }}>
                    {tab.title}
                  </Text>
                  {active ? (
                    <View
                      style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: '-14rpx',
                        width: '0',
                        height: '0',
                        marginLeft: '-11rpx',
                        borderLeft: '11rpx solid transparent',
                        borderRight: '11rpx solid transparent',
                        borderTop: `14rpx solid ${mainBlue}`,
                      }}
                    />
                  ) : null}
                </View>
              )
            })}
          </View>
        </ScrollView>
      ) : null}

      {isAllTopic ? (
        <ScrollView scrollY style={{ height: 'calc(100vh - 260rpx)', width: '750rpx' }} showScrollbar={false}>
          <View style={{ width: '750rpx', padding: '0 25rpx 172rpx', boxSizing: 'border-box' }}>
            <>
              {topics.map(renderTopicCard)}
              {topics.map((item, index) => renderTopicCard(item, index + topics.length))}
            </>
          </View>
        </ScrollView>
      ) : (
        <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)', width: '750rpx' }} showScrollbar={false}>
          <View data-role="about-topic-edit" style={{ width: '750rpx', padding: '68rpx 25rpx 172rpx', boxSizing: 'border-box' }}>
            <Text style={{ display: 'block', color: titleColor, fontSize: '52rpx', lineHeight: '73rpx', fontWeight: 800, marginLeft: '6rpx' }}>
              {editTopicTitle}
            </Text>
            <View style={{ marginTop: '58rpx' }}>
              <View
                style={{
                  width: '700rpx',
                  minHeight: '496rpx',
                  borderRadius: '8rpx',
                  background: '#FFFFFF',
                  padding: '40rpx 44rpx 26rpx',
                  boxSizing: 'border-box',
                }}
              >
                <Textarea
                  value={draftValues[activeTopic.key] || ''}
                  placeholder={activeTopic.placeholder || '写下你的想法'}
                  placeholderStyle="color:#999999;font-size:30rpx;line-height:54rpx"
                  maxlength={400}
                  onInput={(event) =>
                    setDraftValues((current) => ({
                      ...current,
                      [activeTopic.key]: event.detail.value,
                    }))
                  }
                  style={{
                    width: '612rpx',
                    minHeight: '372rpx',
                    color: '#333333',
                    fontSize: '30rpx',
                    lineHeight: '54rpx',
                    background: '#FFFFFF',
                  }}
                />
                <Text style={{ display: 'block', color: '#999999', fontSize: '30rpx', lineHeight: '42rpx', textAlign: 'right', marginTop: '16rpx' }}>
                  {`${(draftValues[activeTopic.key] || '').length}/400`}
                </Text>
              </View>
              <View onClick={handleSave} style={{ width: '700rpx', height: '98rpx', borderRadius: '20rpx', background: mainBlue, marginTop: '172rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: '40rpx', lineHeight: '56rpx', fontWeight: 500 }}>保存</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  )
}
