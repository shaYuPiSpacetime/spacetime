import { Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { getMeetingPreference, saveMeetingPreference, type MeetingPreferenceVO } from '@/services/recommend'

export default function MeetingPreferencePage() {
  const [model, setModel] = useState<MeetingPreferenceVO | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setMessage('')
    try {
      setModel(await getMeetingPreference())
    } catch (error) {
      setModel(null)
      setMessage(error instanceof Error ? error.message : '见面偏好加载失败')
    }
  }

  useEffect(() => { void load() }, [])
  usePullDownRefresh(() => void load().finally(() => Taro.stopPullDownRefresh()))

  if (!model) {
    return <View style={{ minHeight: '100vh', background: '#FFFFFF' }}><NativeNavigation title="见面偏好" /><PageMessage text={message || '见面偏好加载中…'} /></View>
  }

  const save = async () => {
    if (saving || !model.dictionaryAvailable) return
    setSaving(true)
    try {
      setModel(await saveMeetingPreference({
        meetingPreference: model.meetingPreference,
        preferredActivities: model.preferredActivities,
      }))
      await Taro.showToast({ title: '已保存', icon: 'success' })
      await Taro.navigateBack()
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : '保存失败，请稍后重试', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <NativeNavigation title="见面偏好" />
      <View style={{ padding: '28rpx 30rpx' }}>
        {!model.dictionaryAvailable ? <Text style={{ display: 'block', color: '#F05B63', fontSize: '23rpx', marginBottom: '24rpx' }}>见面偏好选项暂不可用，请稍后再试</Text> : null}
        <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>你偏好的见面方式</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '14rpx', marginTop: '24rpx' }}>
          {model.meetingPreferenceOptions.map(option => <Choice key={option.code} label={option.label} selected={model.meetingPreference === option.code} disabled={!option.enabled} onClick={() => setModel({ ...model, meetingPreference: option.code, meetingPreferenceLabel: option.label })} />)}
        </View>
        <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 600, marginTop: '48rpx' }}>喜欢的见面活动（最多{model.maxActivities}项）</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '14rpx', marginTop: '24rpx' }}>
          {model.preferredActivityOptions.map(option => {
            const selected = model.preferredActivities.includes(option.code)
            return <Choice key={option.code} label={option.label} selected={selected} disabled={!option.enabled} onClick={() => {
              if (!selected && model.preferredActivities.length >= model.maxActivities) {
                void Taro.showToast({ title: `最多选择${model.maxActivities}项`, icon: 'none' })
                return
              }
              const next = selected
                ? model.preferredActivities.filter(code => code !== option.code)
                : [...model.preferredActivities, option.code]
              setModel({ ...model, preferredActivities: next })
            }} />
          })}
        </View>
        <View onClick={() => void save()} style={{ height: '92rpx', marginTop: '90rpx', borderRadius: '14rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: saving || !model.dictionaryAvailable ? .5 : 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: '30rpx' }}>{saving ? '保存中…' : '保存'}</Text>
        </View>
      </View>
    </View>
  )
}

function Choice({ label, selected, disabled, onClick }: { label: string; selected: boolean; disabled: boolean; onClick: () => void }) {
  return <View onClick={() => !disabled && onClick()} style={{ minWidth: '208rpx', height: '70rpx', padding: '0 24rpx', borderRadius: '35rpx', background: selected ? '#2876FF' : '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: disabled ? .45 : 1, boxSizing: 'border-box' }}><Text style={{ color: selected ? '#FFFFFF' : '#0C285A', fontSize: '24rpx' }}>{label}</Text></View>
}

function PageMessage({ text }: { text: string }) {
  return <View style={{ padding: '260rpx 60rpx 0', textAlign: 'center' }}><Text style={{ color: '#999999', fontSize: '26rpx', lineHeight: '42rpx' }}>{text}</Text></View>
}
