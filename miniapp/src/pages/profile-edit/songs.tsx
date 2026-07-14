import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { SongOption } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'

export default function ProfileEditSongsPage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const copy = usePrd01Store(state => state.copy)
  const [keyword, setKeyword] = useState('')
  const [songs, setSongs] = useState<SongOption[]>([])
  const [savingId, setSavingId] = useState('')
  useEffect(() => { void bootstrap().catch(showError) }, [])
  const search = async () => { try { setSongs(await prd01Api.searchSongs(keyword.trim(), 10)) } catch (error) { await showError(error) } }
  const save = async (song: SongOption) => { if (savingId) return; setSavingId(song.songId); try { await prd01Api.saveFavoriteSong(song); await Taro.showToast({ title: copy('profile_song_save_success'), icon: 'success' }); navigateBackOrRedirect() } catch (error) { await showError(error) } finally { setSavingId('') } }
  return <View style={{ minHeight: '100vh', background: '#F3F7FB' }}><LanhuSubNav title={copy('profile_song_entry')} onBack={navigateBackOrRedirect} /><View style={{ width: '700rpx', height: '92rpx', borderRadius: '18rpx', background: '#FFFFFF', margin: '30rpx auto', padding: '0 24rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}><Input value={keyword} placeholder={copy('profile_song_search_placeholder')} onInput={event => setKeyword(event.detail.value)} onConfirm={() => void search()} style={{ flex: 1, fontSize: '29rpx' }} /><Text style={{ color: '#2876FF', fontSize: '28rpx', padding: '20rpx' }} onClick={() => void search()}>{copy('profile_song_search_action')}</Text></View><ScrollView scrollY style={{ height: 'calc(100vh - 300rpx)' }}><View style={{ width: '700rpx', margin: '0 auto', borderRadius: '20rpx', background: '#FFFFFF', padding: '14rpx 26rpx', boxSizing: 'border-box' }}>{songs.map(song => <View key={song.songId} style={{ minHeight: '116rpx', borderBottom: '2rpx solid #F0F2F6', display: 'flex', alignItems: 'center' }} onClick={() => void save(song)}>{song.coverUrl ? <Image src={song.coverUrl} mode="aspectFill" style={{ width: '82rpx', height: '82rpx', borderRadius: '12rpx', marginRight: '20rpx' }} /> : null}<View style={{ flex: 1 }}><Text style={{ display: 'block', color: '#333333', fontSize: '29rpx', fontWeight: 700 }}>{song.songName}</Text><Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', marginTop: '8rpx' }}>{song.artistName || ''}</Text></View><Text style={{ color: '#2876FF', fontSize: '26rpx' }}>{savingId === song.songId ? copy('common_submitting_action') : copy('profile_song_select_action')}</Text></View>)}</View></ScrollView></View>
}

async function showError(error: unknown) { const title = error instanceof Error ? error.message : String(error); if (title) await Taro.showToast({ title, icon: 'none' }) }
