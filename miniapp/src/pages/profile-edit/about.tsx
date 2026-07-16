import { ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { AboutMeQuestion } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'
import { emitProfileUpdated } from '@/utils/profileEditEvents'

const aboutTabs = [
  { key: 'all', title: '全部', questionKeys: [] },
  { key: 'self', title: '我是谁', questionKeys: ['moreStory'] },
  { key: 'daily', title: '我的日常', questionKeys: ['interests', 'dailyLife', 'lifeSituation'] },
  { key: 'story', title: '我的故事', questionKeys: ['idealWeekend'] },
  { key: 'love', title: '我热爱的', questionKeys: ['loveView'] },
]

export default function ProfileEditAboutPage() {
  const router = useRouter()
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const [questions, setQuestions] = useState<AboutMeQuestion[]>([])
  const [activeCategoryKey, setActiveCategoryKey] = useState('all')
  const [activeTopicKey, setActiveTopicKey] = useState(String(router.params.topic || 'all'))
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        const next = (await prd01Api.getAboutMe()).questions || []
        setQuestions(next)
        const initial = next.find(question => question.questionKey === String(router.params.topic || ''))
        if (initial) setContent(initial.latestContent || initial.effectiveContent || '')
        else setActiveTopicKey('all')
      } catch (error) {
        await showError(error)
      }
    })()
  }, [])

  const isAllTopic = activeTopicKey === 'all'
  const activeQuestion = questions.find(question => question.questionKey === activeTopicKey)
  const visibleQuestions = useMemo(() => {
    const tab = aboutTabs.find(item => item.key === activeCategoryKey)
    if (!tab || tab.key === 'all') return questions
    return questions.filter(question => tab.questionKeys.includes(question.questionKey))
  }, [activeCategoryKey, questions])

  const select = (question: AboutMeQuestion) => {
    setActiveTopicKey(question.questionKey)
    setContent(question.latestContent || question.effectiveContent || '')
  }

  const save = async () => {
    if (!activeQuestion || saving || activeQuestion.canSubmit === false) return
    setSaving(true)
    try {
      await prd01Api.submitAboutMe(activeQuestion.questionKey, content.trim())
      const next = (await prd01Api.getAboutMe()).questions || []
      setQuestions(next)
      emitProfileUpdated({ type: 'about', questions: next })
      setActiveTopicKey('all')
      await Taro.showToast({ title: '保存成功', icon: 'success' })
    } catch (error) {
      await showError(error)
    } finally {
      setSaving(false)
    }
  }

  const back = () => {
    if (!isAllTopic) {
      setActiveTopicKey('all')
      return
    }
    void navigateBackOrRedirect()
  }

  return (
    <View style={{ height: '100vh', overflow: 'hidden', background: 'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 50%, rgba(248,250,239,0.72) 100%)' }}>
      <LanhuSubNav title={isAllTopic ? '关于我' : ''} onBack={back} />
      {isAllTopic ? (
        <>
          <ScrollView scrollX style={{ width: '750rpx', height: '96rpx', whiteSpace: 'nowrap' }} showScrollbar={false}>
            <View style={{ display: 'inline-flex', height: '96rpx', padding: '0 28rpx', alignItems: 'center' }}>
              {aboutTabs.map(tab => (
                <View key={tab.key} onClick={() => setActiveCategoryKey(tab.key)} style={{ position: 'relative', height: '58rpx', minWidth: '104rpx', borderRadius: '12rpx', background: activeCategoryKey === tab.key ? '#2876FF' : '#E3F1FE', padding: '0 24rpx', marginRight: '10rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                  <Text style={{ color: activeCategoryKey === tab.key ? '#FFFFFF' : '#7D8799', fontSize: '27rpx', fontWeight: activeCategoryKey === tab.key ? 700 : 400 }}>{tab.title}</Text>
                  {activeCategoryKey === tab.key ? <View style={{ position: 'absolute', left: '50%', bottom: '-10rpx', width: 0, height: 0, borderLeft: '10rpx solid transparent', borderRight: '10rpx solid transparent', borderTop: '12rpx solid #2876FF', transform: 'translateX(-50%)' }} /> : null}
                </View>
              ))}
            </View>
          </ScrollView>
          <ScrollView scrollY style={{ height: 'calc(100vh - 260rpx)' }} showScrollbar={false}>
            <View style={{ padding: '0 25rpx 172rpx', boxSizing: 'border-box' }}>
              {visibleQuestions.map(question => (
                <View key={question.questionKey} onClick={() => select(question)} style={{ position: 'relative', width: '700rpx', minHeight: '160rpx', borderRadius: '16rpx', background: '#FFFFFF', marginBottom: '20rpx', padding: '42rpx 86rpx 28rpx 26rpx', boxSizing: 'border-box' }}>
                  <Text style={{ display: 'block', color: '#0C285A', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 700 }}>{question.title}</Text>
                  <Text style={{ display: 'block', color: '#999999', fontSize: '25rpx', lineHeight: '36rpx', marginTop: '12rpx' }}>{question.latestContent || question.effectiveContent || question.placeholder}</Text>
                  <View style={{ position: 'absolute', right: '42rpx', top: '72rpx', width: '22rpx', height: '22rpx', borderTop: '4rpx solid #999999', borderRight: '4rpx solid #999999', transform: 'rotate(45deg)' }} />
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      ) : (
        <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)' }} showScrollbar={false}>
          <View data-role="about-topic-edit" style={{ width: '700rpx', minHeight: '940rpx', margin: '0 auto', padding: '28rpx 0 180rpx', boxSizing: 'border-box' }}>
            <Text style={{ display: 'block', color: '#0C285A', fontSize: '46rpx', lineHeight: '64rpx', fontWeight: 800 }}>{activeQuestion?.title || ''}</Text>
            <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', lineHeight: '40rpx', marginTop: '14rpx' }}>{activeQuestion?.placeholder || ''}</Text>
            <View style={{ minHeight: '500rpx', borderRadius: '20rpx', background: '#FFFFFF', marginTop: '32rpx', padding: '28rpx', boxSizing: 'border-box' }}>
              <Textarea value={content} maxlength={500} placeholder={activeQuestion?.placeholder || ''} onInput={event => setContent(event.detail.value)} style={{ width: '644rpx', minHeight: '410rpx', color: '#333333', fontSize: '28rpx', lineHeight: '46rpx' }} />
              <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', textAlign: 'right' }}>{content.length}/500</Text>
            </View>
          </View>
        </ScrollView>
      )}
      {!isAllTopic ? (
        <View onClick={() => void save()} style={{ position: 'fixed', left: '25rpx', right: '25rpx', bottom: 'calc(24rpx + env(safe-area-inset-bottom))', height: '98rpx', borderRadius: '24rpx', background: activeQuestion?.canSubmit === false ? '#C9DDF7' : '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 700 }}>{saving ? '保存中...' : '保存'}</Text>
        </View>
      ) : null}
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
