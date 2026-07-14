import { Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { OpenTextDetail } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'

export default function ProfileEditIntroPage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [detail, setDetail] = useState<OpenTextDetail>()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { void (async () => { try { await bootstrap(); const result = await prd01Api.getIntroduction(); setDetail(result); setValue(result.latestContent || '') } catch (error) { await showError(error) } })() }, [])
  const save = async () => { if (saving || detail?.canSubmit === false) return; setSaving(true); try { await prd01Api.submitIntroduction(value.trim()); const result = await prd01Api.getIntroduction(); setDetail(result); setValue(result.latestContent || ''); await Taro.showToast({ title: copy('profile_save_success'), icon: 'success' }) } catch (error) { await showError(error) } finally { setSaving(false) } }
  return <View style={{ minHeight: '100vh', background: '#F3F7FB' }}><LanhuSubNav title={copy('profile_intro_entry')} onBack={navigateBackOrRedirect} /><View style={{ width: '700rpx', margin: '50rpx auto' }}><Text style={{ display: 'block', color: '#999999', fontSize: '27rpx', lineHeight: '42rpx' }}>{copy('profile_intro_notice')}</Text><View style={{ minHeight: '480rpx', borderRadius: '20rpx', background: '#FFFFFF', marginTop: '28rpx', padding: '28rpx', boxSizing: 'border-box' }}><Textarea value={value} maxlength={300} placeholder={copy('profile_intro_placeholder')} onInput={event => setValue(event.detail.value)} style={{ width: '644rpx', minHeight: '390rpx', fontSize: '29rpx', lineHeight: '48rpx' }} /><Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', textAlign: 'right' }}>{value.length}/300</Text></View>{detail?.auditStatus ? <Text style={{ display: 'block', color: '#2876FF', fontSize: '24rpx', marginTop: '16rpx' }}>{optionLabel('auditStatus', detail.auditStatus)}</Text> : null}{detail?.rejectReason ? <Text style={{ display: 'block', color: '#E36A6A', fontSize: '24rpx', marginTop: '12rpx' }}>{detail.rejectReason}</Text> : null}<View style={{ height: '96rpx', borderRadius: '24rpx', background: detail?.canSubmit === false ? '#CEE0F8' : '#2876FF', marginTop: '32rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void save()}><Text style={{ color: '#FFFFFF', fontSize: '34rpx' }}>{copy(saving ? 'common_submitting_action' : 'profile_save_action')}</Text></View></View></View>
}

async function showError(error: unknown) { const title = error instanceof Error ? error.message : String(error); if (title) await Taro.showToast({ title, icon: 'none' }) }
