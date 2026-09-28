import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { prd01Api } from '@/services/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'
import { emitProfileUpdated } from '@/utils/profileEditEvents'

export default function ProfileEditSongsPage() {
  const [songName, setSongName] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const normalized = songName.trim()
    if (!normalized) {
      await Taro.showToast({ title: '请输入歌曲名称', icon: 'none' })
      return
    }
    if (saving) return
    setSaving(true)
    try {
      await prd01Api.saveFavoriteSong({ songName: normalized })
      emitProfileUpdated({ type: 'song', display: normalized })
      await Taro.showToast({ title: '保存成功', icon: 'success' })
      await navigateBackOrRedirect()
    } catch (error) {
      await showError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ minHeight: '100vh', background: 'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 50%, rgba(248,250,239,0.72) 100%)' }}>
      <LanhuSubNav title="爱听的歌曲" onBack={navigateBackOrRedirect} />
      <View style={{ width: '700rpx', margin: '0 auto', borderRadius: '16rpx', background: '#FFFFFF', padding: '34rpx 30rpx 40rpx', boxSizing: 'border-box' }}>
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 600 }}>歌曲名称</Text>
        <View style={{ height: '92rpx', borderRadius: '12rpx', background: '#F7F9FC', marginTop: '22rpx', padding: '0 26rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
          <Input
            value={songName}
            maxlength={100}
            placeholder="请输入你爱听的歌曲名称"
            placeholderStyle="color:#A0A7B3;font-size:28rpx"
            confirmType="done"
            onInput={event => {
              setSongName(event.detail.value)
              return event.detail.value
            }}
            onConfirm={() => void save()}
            style={{ flex: 1, color: '#333333', fontSize: '30rpx' }}
          />
        </View>
        <View
          onClick={() => void save()}
          style={{ height: '88rpx', borderRadius: '44rpx', background: songName.trim() && !saving ? '#2876FF' : '#B9CBEF', marginTop: '36rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 600 }}>{saving ? '保存中...' : '确认保存'}</Text>
        </View>
      </View>
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
