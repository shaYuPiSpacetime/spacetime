import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { miniappOssIcons } from '@/constants/ossIcons'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { SongOption } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'
import { emitProfileUpdated } from '@/utils/profileEditEvents'

export default function ProfileEditSongsPage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [songs, setSongs] = useState<SongOption[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        void searchSongs('')
      } catch (error) {
        await showError(error)
      }
    })()
  }, [])

  const searchSongs = async (keyword = searchKeyword) => {
    if (loading) return
    setLoading(true)
    try {
      setSongs(await prd01Api.searchSongs(keyword.trim(), 20))
    } catch (error) {
      await showError(error)
    } finally {
      setLoading(false)
    }
  }

  const save = async (song: SongOption) => {
    if (savingId) return
    setSavingId(song.songId)
    try {
      await prd01Api.saveFavoriteSong(song)
      emitProfileUpdated({ type: 'song', display: song.artistName ? `${song.songName}｜${song.artistName}` : song.songName })
      await Taro.showToast({ title: '保存成功', icon: 'success' })
      await navigateBackOrRedirect()
    } catch (error) {
      await showError(error)
    } finally {
      setSavingId('')
    }
  }

  return (
    <View style={{ height: '100vh', overflow: 'hidden', background: 'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 50%, rgba(248,250,239,0.72) 100%)' }}>
      <LanhuSubNav title="添加爱听的歌曲" onBack={navigateBackOrRedirect} />
      <View style={{ width: '700rpx', height: '88rpx', borderRadius: '8rpx', background: '#FFFFFF', margin: '0 auto 16rpx', padding: '0 28rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
        <View style={{ position: 'relative', width: '30rpx', height: '30rpx', borderRadius: '18rpx', border: '4rpx solid #858EA0', boxSizing: 'border-box', marginRight: '18rpx' }}>
          <View style={{ position: 'absolute', right: '-9rpx', bottom: '-7rpx', width: '12rpx', height: '4rpx', borderRadius: '4rpx', background: '#858EA0', transform: 'rotate(45deg)' }} />
        </View>
        <Input value={searchKeyword} placeholder="搜索歌曲名称" placeholderStyle="color:#858EA0;font-size:30rpx" confirmType="search" onInput={event => { setSearchKeyword(event.detail.value); return event.detail.value }} onConfirm={() => void searchSongs()} style={{ flex: 1, height: '88rpx', color: '#333333', fontSize: '30rpx', lineHeight: '88rpx' }} />
      </View>
      <ScrollView scrollY style={{ height: 'calc(100vh - 268rpx)' }} showScrollbar={false}>
        <View style={{ width: '700rpx', minHeight: '980rpx', margin: '0 auto', borderRadius: '8rpx', background: '#FFFFFF', padding: '18rpx 30rpx 80rpx', boxSizing: 'border-box' }}>
          {songs.map(song => (
            <SongRecord key={song.songId} song={song} saving={savingId === song.songId} onSelect={() => void save(song)} />
          ))}
          {!loading && songs.length === 0 ? <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', textAlign: 'center', marginTop: '120rpx' }}>没有找到相关歌曲</Text> : null}
        </View>
      </ScrollView>
    </View>
  )
}

function SongRecord({ song, saving, onSelect }: { song: SongOption; saving: boolean; onSelect: () => void }) {
  const cover = song.coverUrl && !song.coverUrl.includes('example.test') ? song.coverUrl : miniappOssIcons.profilePreviewSong
  return (
    <View onClick={onSelect} style={{ minHeight: '118rpx', display: 'flex', alignItems: 'center' }}>
      <Image src={cover} mode="aspectFill" style={{ width: '88rpx', height: '88rpx', borderRadius: '44rpx', flexShrink: 0 }} />
      <View style={{ minWidth: 0, flex: 1, marginLeft: '22rpx' }}>
        <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 700 }}>{song.songName}</Text>
        <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '8rpx' }}>{song.artistName || ''}</Text>
      </View>
      {saving ? <Text style={{ color: '#2876FF', fontSize: '22rpx' }}>保存中...</Text> : null}
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
