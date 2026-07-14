import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { prd01Api } from '@/services/prd01'
import { OssDirectUploadError } from '@/services/ossUpload'
import { usePrd01Store } from '@/stores/prd01Store'
import type { VoiceIntro } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'

export default function ProfileVoicePage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const config = usePrd01Store(state => state.config)
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [detail, setDetail] = useState<VoiceIntro>()
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const recorder = useRef(Taro.getRecorderManager())

  const reload = async () => setDetail(await prd01Api.getVoiceIntro())
  useEffect(() => {
    const manager = recorder.current
    let mounted = true
    const handleStop = (result: Taro.RecorderManager.OnStopCallbackResult) => { if (!mounted) return; setRecording(false); void submitRecording(result.tempFilePath, Math.round(result.duration / 1000)) }
    const handleError = (error: Taro.RecorderManager.OnErrorCallbackResult) => { if (!mounted) return; setRecording(false); void showError(error, copy) }
    manager.onStop(handleStop)
    manager.onError(handleError)
    void (async () => { try { await bootstrap(); await reload() } catch (error) { await showError(error, copy) } })()
    return () => { mounted = false; manager.stop() }
  }, [])

  const submitRecording = async (filePath: string, duration: number) => {
    const currentConfig = usePrd01Store.getState().config
    if (!currentConfig || busy) return
    if (duration < currentConfig.uploadLimits.voiceMinDuration) {
      await Taro.showToast({ title: copy('profile_voice_too_short'), icon: 'none' })
      return
    }
    setBusy(true)
    try {
      const uploaded = await prd01Api.uploadVoice(filePath)
      await prd01Api.submitVoiceIntro(uploaded.url, duration)
      await reload()
    } catch (error) { await showError(error, copy) } finally { setBusy(false) }
  }

  const toggle = async () => {
    if (busy || detail?.canSubmit === false) return
    if (recording) { recorder.current.stop(); return }
    const currentConfig = usePrd01Store.getState().config
    const format = currentConfig?.uploadLimits.voice.formats[0]
    if (!currentConfig || !format) return
    recorder.current.start({ duration: currentConfig.uploadLimits.voiceMaxDuration * 1000, format: format as keyof Taro.RecorderManager.Format })
    setRecording(true)
  }
  const remove = async () => { try { await prd01Api.deleteVoiceIntro(); setDetail(undefined) } catch (error) { await showError(error, copy) } }

  return <View style={{ minHeight: '100vh', background: '#F3F7FB' }}>
    <LanhuSubNav title={copy('profile_voice_entry')} onBack={navigateBackOrRedirect} />
    <View style={{ width: '700rpx', margin: '0 auto', paddingTop: '36rpx' }}>
      <Text style={{ display: 'block', color: '#697E9C', fontSize: '27rpx', lineHeight: '42rpx' }}>{copy('profile_voice_notice')}</Text>
      {config ? <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '38rpx', marginTop: '12rpx' }}>{copy('profile_voice_duration_notice')}：{config.uploadLimits.voiceMinDuration}-{config.uploadLimits.voiceMaxDuration}s；{copy('profile_upload_rule_notice')}：{config.uploadLimits.voice.maxMb}MB，{config.uploadLimits.voice.formats.join(' / ')}</Text> : null}
      {detail?.voiceIntroAuditStatus ? <View style={{ marginTop: '32rpx', padding: '30rpx', borderRadius: '22rpx', background: '#FFFFFF' }}><Text style={{ color: '#0C285A', fontSize: '30rpx' }}>{copy('profile_voice_entry')} · {detail.voiceIntroDuration || 0}s</Text><Text style={{ display: 'block', color: '#2876FF', fontSize: '24rpx', marginTop: '14rpx' }}>{optionLabel('auditStatus', detail.voiceIntroAuditStatus)}</Text>{detail.voiceIntroRejectReason ? <Text style={{ display: 'block', color: '#E36A6A', fontSize: '24rpx', marginTop: '10rpx' }}>{detail.voiceIntroRejectReason}</Text> : null}</View> : null}
      <View style={{ height: '104rpx', borderRadius: '52rpx', background: detail?.canSubmit === false ? '#B7CBE8' : recording ? '#E36A6A' : '#2876FF', marginTop: '42rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void toggle()}><Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 700 }}>{copy(busy ? 'common_uploading_action' : recording ? 'profile_voice_stop_action' : 'profile_voice_start_action')}</Text></View>
      {detail?.voiceIntroUrl ? <View style={{ height: '88rpx', borderRadius: '22rpx', border: '2rpx solid #E36A6A', marginTop: '24rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void remove()}><Text style={{ color: '#E36A6A', fontSize: '29rpx' }}>{copy('profile_voice_delete_action')}</Text></View> : null}
    </View>
  </View>
}

async function showError(error: unknown, copy: (key: string) => string) { const title = error instanceof OssDirectUploadError ? copy('error_upload_failed') : error instanceof Error ? error.message : String(error); if (title) await Taro.showToast({ title, icon: 'none' }) }
