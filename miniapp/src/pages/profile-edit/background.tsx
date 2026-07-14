import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { prd01Api } from '@/services/prd01'
import { OssDirectUploadError } from '@/services/ossUpload'
import { usePrd01Store } from '@/stores/prd01Store'
import type { ProfileMedia } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'

export default function ProfileBackgroundPage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const config = usePrd01Store(state => state.config)
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [detail, setDetail] = useState<ProfileMedia | null>(null)
  const [busy, setBusy] = useState(false)
  const reload = async () => setDetail(await prd01Api.getBackground())
  useEffect(() => { void (async () => { try { await bootstrap(); await reload() } catch (error) { await showError(error, copy) } })() }, [])

  const upload = async () => {
    if (busy) return
    const selected = await Taro.chooseImage({ count: 1, sizeType: ['original'], sourceType: ['album', 'camera'] })
    const filePath = selected.tempFilePaths[0]
    if (!filePath) return
    setBusy(true)
    try {
      const uploaded = await prd01Api.uploadBackground(filePath)
      await prd01Api.saveBackground({ mediaUrl: uploaded.url, fileSizeBytes: uploaded.fileSizeBytes, sortOrder: 0 })
      await reload()
    } catch (error) { await showError(error, copy) } finally { setBusy(false) }
  }
  const remove = async () => { try { await prd01Api.deleteBackground(); setDetail(null) } catch (error) { await showError(error, copy) } }

  return <View style={{ minHeight: '100vh', background: '#F3F7FB' }}>
    <LanhuSubNav title={copy('profile_background_entry')} onBack={navigateBackOrRedirect} />
    <View style={{ width: '700rpx', margin: '0 auto', paddingTop: '34rpx' }}>
      <Text style={{ display: 'block', color: '#697E9C', fontSize: '27rpx', lineHeight: '42rpx' }}>{copy('profile_background_notice')}</Text>
      {config?.uploadLimits.profileBg ? <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', marginTop: '12rpx' }}>{copy('profile_upload_rule_notice')}：{config.uploadLimits.profileBg.maxMb}MB，{config.uploadLimits.profileBg.formats.join(' / ')}</Text> : null}
      <View style={{ marginTop: '30rpx', borderRadius: '22rpx', overflow: 'hidden', background: '#E9EEF5', height: '360rpx' }} onClick={() => void upload()}>
        {detail?.mediaUrl ? <Image src={detail.thumbUrl || detail.mediaUrl} mode="aspectFill" style={{ width: '700rpx', height: '360rpx' }} /> : <View style={{ height: '360rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#2876FF', fontSize: '30rpx' }}>{copy(busy ? 'common_uploading_action' : 'profile_background_upload_action')}</Text></View>}
      </View>
      {detail?.auditStatus ? <Text style={{ display: 'block', color: '#2876FF', fontSize: '24rpx', marginTop: '14rpx' }}>{optionLabel('auditStatus', detail.auditStatus)}</Text> : null}
      {detail?.rejectReason ? <Text style={{ display: 'block', color: '#E36A6A', fontSize: '24rpx', marginTop: '10rpx' }}>{detail.rejectReason}</Text> : null}
      {detail ? <View style={{ height: '88rpx', borderRadius: '22rpx', border: '2rpx solid #E36A6A', marginTop: '28rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void remove()}><Text style={{ color: '#E36A6A', fontSize: '30rpx' }}>{copy('profile_background_delete_action')}</Text></View> : null}
    </View>
  </View>
}

async function showError(error: unknown, copy: (key: string) => string) { const title = error instanceof OssDirectUploadError ? copy('error_upload_failed') : error instanceof Error ? error.message : String(error); if (title) await Taro.showToast({ title, icon: 'none' }) }
