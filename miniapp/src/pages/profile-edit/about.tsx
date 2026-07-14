import { ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { AboutMeQuestion } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'

export default function ProfileEditAboutPage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [questions, setQuestions] = useState<AboutMeQuestion[]>([])
  const [active, setActive] = useState<AboutMeQuestion>()
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { void (async () => { try { await bootstrap(); setQuestions((await prd01Api.getAboutMe()).questions || []) } catch (error) { await showError(error) } })() }, [])
  const select = (question: AboutMeQuestion) => { setActive(question); setContent(question.latestContent || '') }
  const save = async () => { if (!active || saving) return; setSaving(true); try { await prd01Api.submitAboutMe(active.questionKey, content.trim()); const result = await prd01Api.getAboutMe(); setQuestions(result.questions || []); setActive(undefined); await Taro.showToast({ title: '保存成功', icon: 'success' }) } catch (error) { await showError(error) } finally { setSaving(false) } }
  return <View style={{ minHeight: '100vh', background: '#F3F7FB' }}><LanhuSubNav title="关于我" onBack={active ? () => setActive(undefined) : navigateBackOrRedirect} />{active ? <View style={{ width: '700rpx', margin: '50rpx auto' }}><Text style={{ display: 'block', color: '#0C285A', fontSize: '42rpx', fontWeight: 800 }}>{active.title}</Text><View style={{ minHeight: '480rpx', borderRadius: '20rpx', background: '#FFFFFF', marginTop: '30rpx', padding: '28rpx', boxSizing: 'border-box' }}><Textarea value={content} maxlength={500} placeholder={active.placeholder} onInput={event => setContent(event.detail.value)} style={{ width: '644rpx', minHeight: '390rpx', fontSize: '29rpx', lineHeight: '48rpx' }} /><Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', textAlign: 'right' }}>{content.length}/500</Text></View>{active.rejectReason ? <Text style={{ display: 'block', color: '#E36A6A', fontSize: '24rpx', marginTop: '16rpx' }}>{active.rejectReason}</Text> : null}<View style={{ height: '96rpx', borderRadius: '24rpx', background: active.canSubmit ? '#2876FF' : '#CEE0F8', marginTop: '32rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => active.canSubmit && void save()}><Text style={{ color: '#FFFFFF', fontSize: '34rpx' }}>{saving ? '保存中...' : '保存'}</Text></View></View> : <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)' }}><View style={{ width: '700rpx', margin: '30rpx auto' }}>{questions.map(question => <View key={question.questionKey} onClick={() => select(question)} style={{ minHeight: '150rpx', borderRadius: '18rpx', background: '#FFFFFF', marginBottom: '20rpx', padding: '28rpx', boxSizing: 'border-box' }}><Text style={{ display: 'block', color: '#0C285A', fontSize: '31rpx', fontWeight: 700 }}>{question.title}</Text><Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', marginTop: '12rpx' }}>{question.latestContent || question.placeholder}</Text>{question.auditStatus ? <Text style={{ display: 'block', color: '#2876FF', fontSize: '23rpx', marginTop: '10rpx' }}>{optionLabel('auditStatus', question.auditStatus)}</Text> : null}</View>)}</View></ScrollView>}</View>
}
async function showError(error: unknown) { const title = error instanceof Error ? error.message : String(error); if (title) await Taro.showToast({ title, icon: 'none' }) }
