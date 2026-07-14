import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { prd01Api } from '@/services/prd01'
import { OssDirectUploadError } from '@/services/ossUpload'
import { usePrd01Store } from '@/stores/prd01Store'
import type { ProfileMedia, UploadRule } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'

export default function ProfileAlbumsPage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const config = usePrd01Store(state => state.config)
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [items, setItems] = useState<ProfileMedia[]>([])
  const [busy, setBusy] = useState(false)

  const reload = async () => setItems(await prd01Api.getAlbums())
  useEffect(() => { void (async () => { try { await bootstrap(); await reload() } catch (error) { await showError(error, copy) } })() }, [])

  const choose = async (target?: ProfileMedia) => {
    const rule = usePrd01Store.getState().config?.uploadLimits.album
    if (!rule || busy) return
    if (!target && items.length >= rule.maxCount) {
      await Taro.showToast({ title: copy('profile_album_limit_reached'), icon: 'none' })
      return
    }
    const selected = await Taro.chooseImage({ count: 1, sizeType: ['original'], sourceType: ['album', 'camera'] })
    const filePath = selected.tempFilePaths[0]
    if (!filePath) return
    setBusy(true)
    try {
      const uploaded = await prd01Api.uploadAlbum(filePath)
      const payload = { mediaUrl: uploaded.url, fileSizeBytes: uploaded.fileSizeBytes, sortOrder: target?.sortOrder ?? items.length }
      if (target) await prd01Api.replaceAlbum(target.mediaId, payload)
      else await prd01Api.addAlbum(payload)
      await reload()
    } catch (error) {
      await showError(error, copy)
    } finally {
      setBusy(false)
    }
  }

  const operate = async (item: ProfileMedia) => {
    const result = await Taro.showActionSheet({ itemList: [copy('profile_album_replace_action'), copy('profile_album_delete_action')] })
    if (result.tapIndex === 0) await choose(item)
    if (result.tapIndex === 1) {
      try { await prd01Api.deleteAlbum(item.mediaId); await reload() } catch (error) { await showError(error, copy) }
    }
  }

  return <View style={{ minHeight: '100vh', background: '#F3F7FB' }}>
    <LanhuSubNav title={copy('profile_album_entry')} onBack={navigateBackOrRedirect} />
    <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)' }}>
      <View style={{ width: '700rpx', margin: '0 auto', padding: '30rpx 0 160rpx' }}>
        <Text style={noticeStyle}>{copy('profile_album_notice')}</Text>
        {config?.uploadLimits.album ? <RuleText copy={copy} rule={config.uploadLimits.album} /> : null}
        <View style={{ display: 'flex', flexWrap: 'wrap', marginTop: '26rpx' }}>
          {items.map(item => <View key={item.mediaId} style={{ width: '216rpx', margin: '0 17rpx 24rpx 0' }} onClick={() => void operate(item)}>
            <Image src={item.thumbUrl || item.mediaUrl} mode="aspectFill" style={{ width: '216rpx', height: '280rpx', borderRadius: '18rpx', background: '#E9EEF5' }} />
            {item.auditStatus ? <Text style={statusStyle}>{optionLabel('auditStatus', item.auditStatus)}</Text> : null}
            {item.rejectReason ? <Text style={rejectStyle}>{item.rejectReason}</Text> : null}
          </View>)}
          {config?.uploadLimits.album && items.length < config.uploadLimits.album.maxCount ? <View style={{ width: '216rpx', height: '280rpx', borderRadius: '18rpx', border: '2rpx dashed #A8BCD5', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void choose()}><Text style={{ color: '#2876FF', fontSize: '28rpx' }}>{copy(busy ? 'common_uploading_action' : 'profile_album_add_action')}</Text></View> : null}
        </View>
      </View>
    </ScrollView>
  </View>
}

function RuleText({ copy, rule }: { copy: (key: string) => string; rule: UploadRule }) {
  return <Text style={ruleStyle}>{copy('profile_upload_rule_notice')}：{rule.maxCount} 张，{rule.maxMb}MB，{rule.formats.join(' / ')}</Text>
}
const noticeStyle = { display: 'block', color: '#697E9C', fontSize: '27rpx', lineHeight: '42rpx' } as const
const ruleStyle = { display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '38rpx', marginTop: '12rpx' } as const
const statusStyle = { display: 'block', color: '#2876FF', fontSize: '23rpx', marginTop: '8rpx' } as const
const rejectStyle = { display: 'block', color: '#E36A6A', fontSize: '22rpx', marginTop: '6rpx' } as const
async function showError(error: unknown, copy: (key: string) => string) { const title = error instanceof OssDirectUploadError ? copy('error_upload_failed') : error instanceof Error ? error.message : String(error); if (title) await Taro.showToast({ title, icon: 'none' }) }
