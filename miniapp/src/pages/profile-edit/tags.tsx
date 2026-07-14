import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import { navigateBackOrRedirect } from '@/utils/navigation'

export default function ProfileEditTagsPage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const profileTagGroups = usePrd01Store(state => state.profileOptions?.profileTagGroups || [])
  const [activeCode, setActiveCode] = useState('')
  const [selectedCodes, setSelectedCodes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { void (async () => { try { await bootstrap(); const groups = usePrd01Store.getState().profileOptions?.profileTagGroups || []; setActiveCode(groups[0]?.categoryCode || ''); const value = await prd01Api.getTags(); setSelectedCodes(parseTagCodes(value)) } catch (error) { await showError(error) } })() }, [])

  const activeGroup = profileTagGroups.find(group => group.categoryCode === activeCode) || profileTagGroups[0]
  const toggle = async (code: string) => {
    setSelectedCodes(current => {
      if (current.includes(code)) return current.filter(item => item !== code)
      if (current.length >= 16) { void Taro.showToast({ title: '最多选择 16 个标签', icon: 'none' }); return current }
      return [...current, code]
    })
  }

  const save = async () => { if (saving) return; setSaving(true); try { await prd01Api.saveTags(selectedCodes); await Taro.showToast({ title: '保存成功', icon: 'success' }); navigateBackOrRedirect() } catch (error) { await showError(error) } finally { setSaving(false) } }

  return <View style={{ minHeight: '100vh', background: '#F3F7FB' }}><LanhuSubNav title="我的标签" onBack={navigateBackOrRedirect} /><ScrollView scrollX style={{ width: '750rpx', height: '92rpx', whiteSpace: 'nowrap' }}><View style={{ display: 'flex', padding: '16rpx 25rpx' }}>{profileTagGroups.map(group => <View key={group.categoryCode} onClick={() => setActiveCode(group.categoryCode)} style={{ height: '58rpx', borderRadius: '16rpx', background: group.categoryCode === activeCode ? '#2876FF' : '#E3F1FE', padding: '0 26rpx', marginRight: '14rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: group.categoryCode === activeCode ? '#FFFFFF' : '#697E9C', fontSize: '28rpx' }}>{group.categoryLabel}</Text></View>)}</View></ScrollView><View style={{ width: '700rpx', margin: '20rpx auto', borderRadius: '20rpx', background: '#FFFFFF', padding: '28rpx', display: 'flex', flexWrap: 'wrap', boxSizing: 'border-box' }}>{(activeGroup?.options || []).map(option => { const active = selectedCodes.includes(option.code); return <View key={option.code} onClick={() => void toggle(option.code)} style={{ minWidth: '190rpx', height: '76rpx', borderRadius: '16rpx', background: active ? '#2876FF' : '#F6F8FC', margin: '0 16rpx 16rpx 0', padding: '0 22rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}><Text style={{ color: active ? '#FFFFFF' : '#333333', fontSize: '27rpx' }}>{option.label}</Text></View> })}</View><View style={{ position: 'fixed', left: '25rpx', right: '25rpx', bottom: '40rpx', height: '96rpx', borderRadius: '24rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void save()}><Text style={{ color: '#FFFFFF', fontSize: '34rpx' }}>{saving ? '保存中...' : '保存'}</Text></View></View>
}

function parseTagCodes(value: string) { try { const result = JSON.parse(value || '[]'); return Array.isArray(result) ? result.filter(item => typeof item === 'string') : [] } catch { return [] } }
async function showError(error: unknown) { const title = error instanceof Error ? error.message : String(error); if (title) await Taro.showToast({ title, icon: 'none' }) }
